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
  return message.includes('both payer and collector must be real or test users');
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
  const email = (claimsData.claims.email as string) ?? undefined;

  let body: { plan_code?: string; back_url?: string; payer_email?: string };
  try { body = await req.json(); } catch { return json(400, { error: 'invalid_json' }); }
  const planCode = (body.plan_code ?? '').trim();
  if (!planCode || planCode === 'free') return json(400, { error: 'invalid_plan' });

  const payerEmail = isValidEmail(body.payer_email) ? body.payer_email!.trim().toLowerCase() : email;
  if (!isValidEmail(payerEmail)) return json(400, { error: 'invalid_payer_email', message: 'Informe um e-mail válido para continuar.' });

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

  // Mercado Pago "preapproval" = assinatura recorrente
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

  const mpRes = await fetch('https://api.mercadopago.com/preapproval', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
    },
    body: JSON.stringify(preapprovalPayload),
  });
  const mpData = await mpRes.json();
  if (!mpRes.ok) {
    console.error('MP preapproval error', mpData);
    if (isPayerCollectorModeError(mpData)) {
      const mode = getMercadoPagoMode();
      return json(200, {
        ok: false,
        error: 'payer_collector_mode_mismatch',
        mode,
        message: mode === 'test'
          ? 'O Mercado Pago exige que assinaturas de teste usem um comprador de teste. Informe o e-mail da conta compradora de teste criada no Mercado Pago.'
          : 'O Mercado Pago exige que o pagador seja uma conta real diferente da conta vendedora. Informe outro e-mail de pagador para continuar.',
      });
    }
    return json(502, { error: 'mp_error', detail: mpData });
  }

  // Registra assinatura como "pending" — webhook confirmará quando o pagamento for aprovado
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
  });
});
