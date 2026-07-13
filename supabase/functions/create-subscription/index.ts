import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const MP_ACCESS_TOKEN = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN')!;

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const isValidEmail = (value: unknown) =>
  typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

const getMercadoPagoMode = () => {
  if (MP_ACCESS_TOKEN?.startsWith('TEST-')) return 'test';
  if (MP_ACCESS_TOKEN?.startsWith('APP_USR-')) return 'live';
  return 'unknown';
};

const isPayerCollectorModeError = (detail: any) => {
  const message = String(detail?.message ?? detail?.error ?? '').toLowerCase();
  return (
    message.includes('both payer and collector must be real or test users') ||
    message.includes('collector') && message.includes('payer')
  );
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return json(401, { error: 'unauthorized' });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  const token = authHeader.replace('Bearer ', '');
  const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
  if (claimsErr || !claimsData?.claims) return json(401, { error: 'unauthorized' });
  const userId = claimsData.claims.sub as string;
  const claimsEmail = (claimsData.claims.email as string) ?? undefined;

  // ✅ Fonte da verdade: auth.users.email (via service role, ignora RLS)
  let authUserEmail: string | undefined;
  try {
    const { data: userRow, error: userErr } = await admin.auth.admin.getUserById(userId);
    if (userErr) console.error('[create-subscription] getUserById error', userErr);
    authUserEmail = userRow?.user?.email ?? undefined;
  } catch (e) {
    console.error('[create-subscription] getUserById exception', e);
  }

  let body: { plan_code?: string; back_url?: string };
  try { body = await req.json(); } catch { return json(400, { error: 'invalid_json' }); }
  const planCode = (body.plan_code ?? '').trim();
  if (!planCode || planCode === 'free') return json(400, { error: 'invalid_plan' });

  // ⚠️ payer_email SEMPRE vem de auth.users.email (fallback: claim JWT). Nunca aceita input do cliente,
  // variável de ambiente ou e-mail do admin/vendedor.
  const payerEmail = (authUserEmail ?? claimsEmail ?? '').trim().toLowerCase();
  if (!isValidEmail(payerEmail)) {
    console.error('[create-subscription] invalid payer email', { userId, authUserEmail, claimsEmail });
    return json(400, {
      error: 'invalid_payer_email',
      message: 'Sua conta não possui um e-mail válido cadastrado. Atualize seu perfil e tente novamente.',
    });
  }

  const { data: plan } = await admin
    .from('subscription_plans')
    .select('code, name, price_monthly, is_active')
    .eq('code', planCode)
    .maybeSingle();

  if (!plan || !plan.is_active) return json(404, { error: 'plan_not_found' });
  const amount = Number(plan.price_monthly);
  if (!(amount > 0)) return json(400, { error: 'invalid_amount' });

  const origin = req.headers.get('origin') ?? body.back_url ?? 'https://finango.online';
  const backUrl = `${origin}/#/settings/subscription`;
  const externalRef = `${userId}:${planCode}:${Date.now()}`;

  const preapprovalPayload = {
    reason: `Finango ${plan.name}`,
    external_reference: externalRef,
    payer_email: payerEmail,
    back_url: backUrl,
    auto_recurring: {
      frequency: 1,
      frequency_type: 'months',
      transaction_amount: amount,
      currency_id: 'BRL',
    },
    status: 'pending',
  };

  // 🔎 Logs completos (Access Token nunca é logado)
  const mpMode = getMercadoPagoMode();
  console.log('[create-subscription] preparing MP preapproval', {
    mp_mode: mpMode,
    user_id: userId,
    auth_user_email: authUserEmail,
    claims_email: claimsEmail,
    payer_email: payerEmail,
    external_reference: externalRef,
    plan_code: planCode,
    amount,
    request_body: { ...preapprovalPayload, __access_token: '[REDACTED]' },
  });

  const mpRes = await fetch('https://api.mercadopago.com/preapproval', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
    },
    body: JSON.stringify(preapprovalPayload),
  });
  const mpData = await mpRes.json().catch(() => ({}));

  console.log('[create-subscription] MP response', {
    http_status: mpRes.status,
    ok: mpRes.ok,
    mp_mode: mpMode,
    payer_email_sent: payerEmail,
    external_reference: externalRef,
    response_body: mpData,
  });

  if (!mpRes.ok) {
    if (isPayerCollectorModeError(mpData)) {
      return json(200, {
        ok: false,
        error: 'payer_collector_mode_mismatch',
        mode: mpMode,
        payer_email: payerEmail,
        message: mpMode === 'test'
          ? 'Este Access Token é de TESTE. O e-mail da sua conta precisa ser de um usuário de teste do Mercado Pago (criado em https://www.mercadopago.com.br/developers/panel/test-users) e diferente da conta vendedora de teste.'
          : 'O Mercado Pago rejeitou o pagador: verifique se sua conta Finango não usa o mesmo e-mail da conta vendedora do Mercado Pago.',
      });
    }
    return json(502, { error: 'mp_error', http_status: mpRes.status, detail: mpData });
  }

  await admin.from('user_subscriptions').upsert(
    {
      user_id: userId,
      plan_code: planCode,
      status: 'pending',
      provider: 'mercado_pago',
      provider_subscription_id: mpData.id,
      started_at: new Date().toISOString(),
      expires_at: null,
      metadata: { external_reference: externalRef, init_point: mpData.init_point, payer_email: payerEmail },
    },
    { onConflict: 'user_id' },
  );

  return json(200, {
    ok: true,
    checkout_url: mpData.init_point ?? mpData.sandbox_init_point,
    preapproval_id: mpData.id,
    payer_email: payerEmail,
    mp_mode: mpMode,
  });
});
