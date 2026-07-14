import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const MP_ACCESS_TOKEN = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN')!;
const MP_PREAPPROVAL_ENDPOINT = 'https://api.mercadopago.com/preapproval';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const isValidEmail = (value: unknown) =>
  typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

const normalizeEmail = (value: unknown) =>
  typeof value === 'string' ? value.trim().toLowerCase() : '';

const pickMercadoPagoFields = (body: any) => ({
  message: body?.message ?? null,
  error: body?.error ?? null,
  cause: body?.cause ?? null,
  status: body?.status ?? null,
});

const mercadoPagoDebugPayload = (args: {
  httpStatus: number;
  requestBody: Record<string, unknown>;
  responseBody: unknown;
}) => ({
  endpoint: MP_PREAPPROVAL_ENDPOINT,
  http_status: args.httpStatus,
  request_body: { ...args.requestBody, __access_token: '[REDACTED]' },
  response_body: args.responseBody,
  ...pickMercadoPagoFields(args.responseBody),
});

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

const getMercadoPagoCollector = async () => {
  if (!MP_ACCESS_TOKEN) return null;

  try {
    const res = await fetch('https://api.mercadopago.com/users/me', {
      headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
    });
    const raw = await res.text();
    let data: any = {};
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      data = { raw };
    }

    console.log('[create-subscription] MP collector lookup', {
      http_status: res.status,
      ok: res.ok,
      collector_email: data?.email ?? null,
      collector_nickname: data?.nickname ?? null,
      site_id: data?.site_id ?? null,
      response_body: data,
      __access_token: '[REDACTED]',
    });

    if (!res.ok) return null;
    return data;
  } catch (error) {
    console.error('[create-subscription] MP collector lookup exception', error);
    return null;
  }
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

  let body: { plan_code?: string; back_url?: string; payer_email?: string };
  try { body = await req.json(); } catch { return json(400, { error: 'invalid_json' }); }
  const planCode = (body.plan_code ?? '').trim();
  if (!planCode || planCode === 'free') return json(400, { error: 'invalid_plan' });

  // ⚠️ payer_email SEMPRE vem de auth.users.email (fallback: claim JWT). Nunca aceita input do cliente,
  // variável de ambiente ou e-mail do admin/vendedor.
  const payerEmail = normalizeEmail(authUserEmail ?? claimsEmail);
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

  const mpMode = getMercadoPagoMode();
  const collector = await getMercadoPagoCollector();
  const collectorEmail = normalizeEmail(collector?.email);

  // 🔎 Logs completos (Access Token nunca é logado)
  console.log('[create-subscription] preparing MP preapproval', {
    endpoint: MP_PREAPPROVAL_ENDPOINT,
    mp_mode: mpMode,
    user_id: userId,
    auth_users_email: authUserEmail ?? null,
    claims_email: claimsEmail ?? null,
    payer_email_sent_to_api: payerEmail,
    collector_email_detected: collectorEmail || null,
    external_reference: externalRef,
    plan_code: planCode,
    amount,
    client_payer_email_ignored: body.payer_email ? normalizeEmail(body.payer_email) : null,
    request_body_sent_to_api: { ...preapprovalPayload, __access_token: '[REDACTED]' },
  });

  const mpRes = await fetch(MP_PREAPPROVAL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
    },
    body: JSON.stringify(preapprovalPayload),
  });
  const mpRawResponse = await mpRes.text();
  let mpData: any = {};
  try {
    mpData = mpRawResponse ? JSON.parse(mpRawResponse) : {};
  } catch {
    mpData = { raw: mpRawResponse };
  }

  const mpDebug = mercadoPagoDebugPayload({
    httpStatus: mpRes.status,
    requestBody: preapprovalPayload,
    responseBody: mpData,
  });

  console.log('[create-subscription] MP response', {
    endpoint: MP_PREAPPROVAL_ENDPOINT,
    http_status: mpRes.status,
    ok: mpRes.ok,
    mp_mode: mpMode,
    auth_users_email: authUserEmail ?? null,
    payer_email_sent_to_api: payerEmail,
    collector_email_detected: collectorEmail || null,
    external_reference: externalRef,
    request_body_sent_to_api: { ...preapprovalPayload, __access_token: '[REDACTED]' },
    response_body: mpData,
    message: mpDebug.message,
    error: mpDebug.error,
    cause: mpDebug.cause,
    status: mpDebug.status,
  });

  if (!mpRes.ok) {
    return json(200, {
      ok: false,
      error: 'mp_error',
      mode: mpMode,
      payer_email: payerEmail,
      external_reference: externalRef,
      mercado_pago: mpDebug,
      detail: mpData,
      message: mpDebug.message,
      mp_error: mpDebug.error,
      cause: mpDebug.cause,
      status: mpDebug.status,
      payer_collector_mode_mismatch: isPayerCollectorModeError(mpData),
    });
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
