import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const MP_ACCESS_TOKEN = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN')!;
const MP_PREAPPROVAL_ENDPOINT = 'https://api.mercadopago.com/preapproval';
const MP_USERS_ME_ENDPOINT = 'https://api.mercadopago.com/users/me';

type MercadoPagoMode = 'test' | 'live' | 'unknown';
type MercadoPagoAccountType = 'test' | 'real' | 'unknown';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const isValidEmail = (value: unknown) =>
  typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

const normalizeEmail = (value: unknown) =>
  typeof value === 'string' ? value.trim().toLowerCase() : '';

const isMercadoPagoTestEmail = (email: unknown) => {
  const normalized = normalizeEmail(email);
  return normalized.endsWith('@testuser.com') || normalized.startsWith('test_user_');
};

const getPayerAccountType = (email: string): MercadoPagoAccountType =>
  isMercadoPagoTestEmail(email) ? 'test' : 'real';

const pickMercadoPagoFields = (body: any) => ({
  message: body?.message ?? null,
  error: body?.error ?? null,
  cause: body?.cause ?? null,
  status: body?.status ?? null,
});

const mercadoPagoDebugPayload = (args: {
  httpStatus: number | null;
  requestBody: Record<string, unknown>;
  responseBody: unknown;
}) => ({
  endpoint: MP_PREAPPROVAL_ENDPOINT,
  http_status: args.httpStatus,
  request_body: { ...args.requestBody, __access_token: '[REDACTED]' },
  response_body: args.responseBody,
  ...pickMercadoPagoFields(args.responseBody),
});

const getMercadoPagoCredentialMode = (): MercadoPagoMode => {
  if (MP_ACCESS_TOKEN?.startsWith('TEST-')) return 'test';
  if (MP_ACCESS_TOKEN?.startsWith('APP_USR-')) return 'live';
  return 'unknown';
};

const getMercadoPagoAccountType = (user: any): MercadoPagoAccountType => {
  const tags = Array.isArray(user?.tags) ? user.tags.map((tag: unknown) => String(tag).toLowerCase()) : [];
  const isTest =
    Boolean(user?.test_data?.test_user) ||
    tags.includes('test_user') ||
    isMercadoPagoTestEmail(user?.email);

  if (isTest) return 'test';
  if (user?.id || user?.email) return 'real';
  return 'unknown';
};

const isPayerCollectorModeError = (detail: any) => {
  const message = String(detail?.message ?? detail?.error ?? '').toLowerCase();
  return (
    message.includes('both payer and collector must be real or test users') ||
    (message.includes('collector') && message.includes('payer'))
  );
};

const getMercadoPagoCollector = async () => {
  if (!MP_ACCESS_TOKEN) return null;

  try {
    const res = await fetch(MP_USERS_ME_ENDPOINT, {
      headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
    });
    const raw = await res.text();
    let data: any = {};
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      data = { raw };
    }

    const accountType = getMercadoPagoAccountType(data);

    console.log('[create-subscription] MP collector lookup', {
      endpoint: MP_USERS_ME_ENDPOINT,
      http_status: res.status,
      ok: res.ok,
      collector_id: data?.id ?? null,
      collector_email: data?.email ?? null,
      collector_nickname: data?.nickname ?? null,
      collector_account_type: accountType,
      site_id: data?.site_id ?? null,
      response_body: data,
      __access_token: '[REDACTED]',
    });

    if (!res.ok) return null;
    return {
      raw: data,
      id: data?.id ?? null,
      email: normalizeEmail(data?.email),
      nickname: data?.nickname ?? null,
      siteId: data?.site_id ?? null,
      accountType,
    };
  } catch (error) {
    console.error('[create-subscription] MP collector lookup exception', error);
    return null;
  }
};

const buildValidationError = (args: {
  credentialMode: MercadoPagoMode;
  payerEmail: string;
  payerAccountType: MercadoPagoAccountType;
  collector: Awaited<ReturnType<typeof getMercadoPagoCollector>>;
}) => {
  const collectorAccountType = args.collector?.accountType ?? 'unknown';

  if (args.collector?.email && args.collector.email === args.payerEmail) {
    return {
      message: 'payer_email matches collector email',
      error: 'payer_equals_collector',
      cause: [{ code: 'payer_equals_collector', description: 'payer_email cannot be the same Mercado Pago collector account.' }],
      status: 409,
      validation: {
        credential_mode: args.credentialMode,
        payer_account_type: args.payerAccountType,
        collector_account_type: collectorAccountType,
      },
    };
  }

  if (args.credentialMode === 'test' && args.payerAccountType !== 'test') {
    return {
      message: 'TEST credentials require a Mercado Pago test payer email',
      error: 'payer_must_be_test_user',
      cause: [{ code: 'payer_must_be_test_user', description: 'TEST credentials cannot be used with a real payer email.' }],
      status: 409,
      validation: {
        credential_mode: args.credentialMode,
        payer_account_type: args.payerAccountType,
        collector_account_type: collectorAccountType,
      },
    };
  }

  if (args.credentialMode === 'live' && args.payerAccountType === 'test') {
    return {
      message: 'APP_USR credentials require a real Mercado Pago payer email',
      error: 'payer_must_be_real_user',
      cause: [{ code: 'payer_must_be_real_user', description: 'Production credentials cannot be used with a Mercado Pago test payer email.' }],
      status: 409,
      validation: {
        credential_mode: args.credentialMode,
        payer_account_type: args.payerAccountType,
        collector_account_type: collectorAccountType,
      },
    };
  }

  if (collectorAccountType === 'test' && args.payerAccountType !== 'test') {
    return {
      message: 'Both payer and collector must be real or test users',
      error: 'payer_collector_mode_mismatch',
      cause: [{ code: 'collector_test_payer_real', description: 'The Mercado Pago collector is TEST, but payer_email is a real account email.' }],
      status: 409,
      validation: {
        credential_mode: args.credentialMode,
        payer_account_type: args.payerAccountType,
        collector_account_type: collectorAccountType,
      },
    };
  }

  if (collectorAccountType === 'real' && args.payerAccountType === 'test') {
    return {
      message: 'Both payer and collector must be real or test users',
      error: 'payer_collector_mode_mismatch',
      cause: [{ code: 'collector_real_payer_test', description: 'The Mercado Pago collector is REAL, but payer_email is a test user email.' }],
      status: 409,
      validation: {
        credential_mode: args.credentialMode,
        payer_account_type: args.payerAccountType,
        collector_account_type: collectorAccountType,
      },
    };
  }

  return null;
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

  // Fonte única da verdade: auth.users.email. O cliente nunca define payer_email.
  const payerEmail = normalizeEmail(authUserEmail);
  if (!isValidEmail(payerEmail)) {
    console.error('[create-subscription] invalid auth.users.email', { user_id: userId, auth_users_email: authUserEmail ?? null });
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

  const credentialMode = getMercadoPagoCredentialMode();
  const payerAccountType = getPayerAccountType(payerEmail);
  const collector = await getMercadoPagoCollector();
  const collectorEmail = collector?.email || null;
  const collectorAccountType = collector?.accountType ?? 'unknown';

  console.log('[create-subscription] preparing MP preapproval', {
    endpoint: MP_PREAPPROVAL_ENDPOINT,
    credential_mode: credentialMode,
    user_id: userId,
    auth_users_email: authUserEmail ?? null,
    payer_email_sent_to_api: payerEmail,
    payer_account_type: payerAccountType,
    collector_id: collector?.id ?? null,
    collector_email_detected: collectorEmail,
    collector_account_type: collectorAccountType,
    external_reference: externalRef,
    plan_code: planCode,
    amount,
    request_body_sent_to_api: { ...preapprovalPayload, __access_token: '[REDACTED]' },
  });

  const validationError = buildValidationError({
    credentialMode,
    payerEmail,
    payerAccountType,
    collector,
  });

  if (validationError) {
    const validationDebug = mercadoPagoDebugPayload({
      httpStatus: null,
      requestBody: preapprovalPayload,
      responseBody: validationError,
    });

    console.error('[create-subscription] MP preflight blocked', {
      endpoint: MP_PREAPPROVAL_ENDPOINT,
      http_status: null,
      credential_mode: credentialMode,
      user_id: userId,
      auth_users_email: authUserEmail ?? null,
      payer_email_sent_to_api: payerEmail,
      payer_account_type: payerAccountType,
      collector_id: collector?.id ?? null,
      collector_email_detected: collectorEmail,
      collector_account_type: collectorAccountType,
      external_reference: externalRef,
      request_body_sent_to_api: { ...preapprovalPayload, __access_token: '[REDACTED]' },
      response_body: validationError,
      message: validationError.message,
      error: validationError.error,
      cause: validationError.cause,
      status: validationError.status,
    });

    return json(200, {
      ok: false,
      error: validationError.error,
      mode: credentialMode,
      payer_email: payerEmail,
      payer_account_type: payerAccountType,
      collector_id: collector?.id ?? null,
      collector_account_type: collectorAccountType,
      external_reference: externalRef,
      mercado_pago: validationDebug,
      detail: validationError,
      message: validationError.message,
      mp_error: validationError.error,
      cause: validationError.cause,
      status: validationError.status,
      payer_collector_mode_mismatch: validationError.error === 'payer_collector_mode_mismatch',
    });
  }

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
    credential_mode: credentialMode,
    user_id: userId,
    auth_users_email: authUserEmail ?? null,
    payer_email_sent_to_api: payerEmail,
    payer_account_type: payerAccountType,
    collector_id: collector?.id ?? null,
    collector_email_detected: collectorEmail,
    collector_account_type: collectorAccountType,
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
      mode: credentialMode,
      payer_email: payerEmail,
      payer_account_type: payerAccountType,
      collector_id: collector?.id ?? null,
      collector_account_type: collectorAccountType,
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
    mp_mode: credentialMode,
  });
});
