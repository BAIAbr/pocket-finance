import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { logSubscriptionEvent } from '../_shared/logSubscription.ts';

const MP_ACCESS_TOKEN = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN')!;

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const isValidEmail = (v: unknown) =>
  typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

const normalizeEmail = (v: unknown) =>
  typeof v === 'string' ? v.trim().toLowerCase() : '';

const getMercadoPagoMode = () => {
  if (MP_ACCESS_TOKEN?.startsWith('TEST-')) return 'test';
  if (MP_ACCESS_TOKEN?.startsWith('APP_USR-')) return 'live';
  return 'unknown';
};

const isPayerCollectorModeError = (detail: any) => {
  const message = String(detail?.message ?? detail?.error ?? '').toLowerCase();
  return (
    message.includes('both payer and collector must be real or test users') ||
    (message.includes('collector') && message.includes('payer'))
  );
};

async function getMercadoPagoCollector() {
  if (!MP_ACCESS_TOKEN) return null;
  try {
    const res = await fetch('https://api.mercadopago.com/users/me', {
      headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
    });
    const raw = await res.text();
    let data: any = {};
    try { data = raw ? JSON.parse(raw) : {}; } catch { data = { raw }; }
    console.log('[upgrade-plan] MP collector lookup', {
      http_status: res.status,
      ok: res.ok,
      collector_email: data?.email ?? null,
      collector_nickname: data?.nickname ?? null,
      site_id: data?.site_id ?? null,
      response_body: data,
      __access_token: '[REDACTED]',
    });
    return res.ok ? data : null;
  } catch (e) {
    console.error('[upgrade-plan] MP collector lookup exception', e);
    return null;
  }
}

async function cancelMpPreapproval(id: string) {
  try {
    await fetch(`https://api.mercadopago.com/preapproval/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
      body: JSON.stringify({ status: 'cancelled' }),
    });
  } catch (e) { console.warn('mp cancel failed', e); }
}

async function createMpPreapproval(args: {
  userId: string; planCode: string; planName: string; amount: number;
  payerEmail: string; backUrl: string; authUserEmail?: string | null; collectorEmail?: string | null;
}) {
  const externalRef = `${args.userId}:${args.planCode}:${Date.now()}`;
  const requestBody = {
    reason: `Finango ${args.planName}`,
    external_reference: externalRef,
    payer_email: args.payerEmail,
    back_url: args.backUrl,
    auto_recurring: { frequency: 1, frequency_type: 'months', transaction_amount: args.amount, currency_id: 'BRL' },
    status: 'pending',
  };
  console.log('[upgrade-plan] preparing MP preapproval', {
    mp_mode: getMercadoPagoMode(),
    user_id: args.userId,
    auth_users_email: args.authUserEmail ?? null,
    payer_email_sent_to_api: args.payerEmail,
    collector_email_detected: args.collectorEmail ?? null,
    external_reference: externalRef,
    plan_code: args.planCode,
    amount: args.amount,
    request_body_sent_to_api: { ...requestBody, __access_token: '[REDACTED]' },
  });
  const r = await fetch('https://api.mercadopago.com/preapproval', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
    body: JSON.stringify(requestBody),
  });
  const raw = await r.text();
  let data: any = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch { data = { raw }; }
  console.log('[upgrade-plan] MP response', {
    http_status: r.status,
    ok: r.ok,
    mp_mode: getMercadoPagoMode(),
    auth_users_email: args.authUserEmail ?? null,
    payer_email_sent_to_api: args.payerEmail,
    collector_email_detected: args.collectorEmail ?? null,
    external_reference: externalRef,
    response_body: data,
  });
  return { ok: r.ok, data, externalRef };
}

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

  let authUserEmail: string | undefined;
  try {
    const { data: userRow, error: userErr } = await admin.auth.admin.getUserById(userId);
    if (userErr) console.error('[upgrade-plan] getUserById error', userErr);
    authUserEmail = userRow?.user?.email ?? undefined;
  } catch (e) {
    console.error('[upgrade-plan] getUserById exception', e);
  }

  let body: { plan_code?: string; payer_email?: string; back_url?: string };
  try { body = await req.json(); } catch { return json(400, { error: 'invalid_json' }); }
  const targetPlan = (body.plan_code ?? '').trim();
  if (!targetPlan || targetPlan === 'free') return json(400, { error: 'invalid_plan' });

  const payerEmail = normalizeEmail(authUserEmail ?? claimsEmail);
  if (!isValidEmail(payerEmail)) {
    console.error('[upgrade-plan] invalid payer email', { userId, authUserEmail, claimsEmail });
    return json(400, {
      error: 'invalid_payer_email',
      message: 'Sua conta não possui um e-mail válido cadastrado. Atualize seu perfil e tente novamente.',
    });
  }

  const [{ data: currentSub }, { data: newPlan }] = await Promise.all([
    admin.from('user_subscriptions').select('*').eq('user_id', userId).maybeSingle(),
    admin.from('subscription_plans').select('*').eq('code', targetPlan).maybeSingle(),
  ]);
  if (!newPlan || !newPlan.is_active) return json(404, { error: 'plan_not_found' });

  const newPrice = Number(newPlan.price_monthly);
  if (!(newPrice > 0)) return json(400, { error: 'invalid_amount' });

  // Compare against current price
  let currentPrice = 0;
  if (currentSub && currentSub.plan_code !== 'free') {
    const { data: cp } = await admin
      .from('subscription_plans').select('price_monthly').eq('code', currentSub.plan_code).maybeSingle();
    currentPrice = Number(cp?.price_monthly ?? 0);
  }
  if (newPrice <= currentPrice) {
    return json(400, {
      error: 'not_an_upgrade',
      message: 'O plano selecionado não é um upgrade. Use downgrade-plan para descer de plano.',
    });
  }

  // Cancel current MP preapproval (best-effort) before creating a new one
  if (currentSub?.provider_subscription_id) {
    await cancelMpPreapproval(currentSub.provider_subscription_id);
  }

  const origin = req.headers.get('origin') ?? body.back_url ?? 'https://finango.online';
  const backUrl = `${origin}/#/settings/subscription`;

  const collector = await getMercadoPagoCollector();
  const collectorEmail = normalizeEmail(collector?.email);
  if (collectorEmail && collectorEmail === payerEmail) {
    const externalRef = `${userId}:${targetPlan}:${Date.now()}`;
    console.error('[upgrade-plan] blocked because payer equals collector', {
      mp_mode: getMercadoPagoMode(),
      user_id: userId,
      auth_users_email: authUserEmail ?? null,
      claims_email: claimsEmail ?? null,
      payer_email_sent_to_api: payerEmail,
      collector_email: collectorEmail,
      external_reference: externalRef,
      client_payer_email_ignored: body.payer_email ? normalizeEmail(body.payer_email) : null,
    });
    return json(200, {
      ok: false,
      error: 'payer_equals_collector',
      mode: getMercadoPagoMode(),
      payer_email: payerEmail,
      message: 'O e-mail da sua conta Finango é igual ao e-mail da conta recebedora do Mercado Pago. Entre no Finango com uma conta de comprador diferente para assinar.',
    });
  }

  const { ok, data: mpData, externalRef } = await createMpPreapproval({
    userId,
    planCode: targetPlan,
    planName: newPlan.name,
    amount: newPrice,
    payerEmail,
    backUrl,
    authUserEmail,
    collectorEmail: collectorEmail || null,
  });
  if (!ok) {
    console.error('MP preapproval error', mpData);
    if (isPayerCollectorModeError(mpData)) {
      return json(200, {
        ok: false,
        error: 'payer_collector_mode_mismatch',
        mode: getMercadoPagoMode(),
        payer_email: payerEmail,
        message: getMercadoPagoMode() === 'test'
          ? 'Este Access Token é de TESTE. O e-mail da sua conta precisa ser de um usuário de teste do Mercado Pago e diferente da conta vendedora de teste.'
          : 'O Mercado Pago rejeitou o pagador: verifique se sua conta Finango não usa o mesmo e-mail da conta vendedora do Mercado Pago.',
      });
    }
    return json(502, { error: 'mp_error', detail: mpData });
  }

  await admin.from('user_subscriptions').upsert({
    user_id: userId,
    plan_code: targetPlan,
    status: 'pending',
    provider: 'mercado_pago',
    provider_subscription_id: mpData.id,
    started_at: new Date().toISOString(),
    expires_at: null,
    metadata: {
      external_reference: externalRef,
      init_point: mpData.init_point,
      payer_email: payerEmail,
      previous_plan: currentSub?.plan_code ?? 'free',
      action: 'upgrade',
    },
  }, { onConflict: 'user_id' });

  await logSubscriptionEvent(admin, {
    user_id: userId,
    subscription_id: currentSub?.id ?? null,
    plan_code: targetPlan,
    event_type: 'plan_upgrade_started',
    source: 'upgrade-plan',
    payload: { from: currentSub?.plan_code ?? 'free', to: targetPlan, amount: newPrice },
  });

  return json(200, { ok: true, checkout_url: mpData.init_point ?? mpData.sandbox_init_point, preapproval_id: mpData.id });
});
