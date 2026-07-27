import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';

const MP_ACCESS_TOKEN = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN')!;

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

// Accept any plan_code — the plan row itself must be active in the DB.
// This lets admins add new billing intervals without redeploying this function.
const BodySchema = z.object({
  plan_code: z.string().min(1).max(64),
});

// Lifetime plans (never expire). Everything else derives days from
// interval_count when available, otherwise from billing_interval.
const LIFETIME_PLAN_CODES = new Set(['funder']);

function deriveDays(planCode: string, plan: { billing_interval: string | null; interval_count: number | null }): number {
  if (LIFETIME_PLAN_CODES.has(planCode)) return 0;
  if (plan.interval_count && plan.interval_count > 0) return plan.interval_count * 30;
  switch (plan.billing_interval) {
    case 'quarter': return 90;
    case 'semester': return 180;
    case 'year': return 365;
    default: return 30;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });

  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) return json(401, { error: 'unauthenticated' });

  const { data: userRes, error: uErr } = await admin.auth.getUser(token);
  if (uErr || !userRes?.user) return json(401, { error: 'unauthenticated' });
  const user = userRes.user;

  const bodyRaw = await req.json().catch(() => ({}));
  const parsed = BodySchema.safeParse(bodyRaw);
  if (!parsed.success) return json(400, { error: 'invalid_body', detail: parsed.error.flatten() });
  const { plan_code } = parsed.data;

  // load plan
  const { data: plan } = await admin
    .from('subscription_plans')
    .select('code, name, price_monthly, is_active, billing_interval, interval_count')
    .eq('code', plan_code)
    .maybeSingle();
  if (!plan || !plan.is_active) return json(400, { error: 'plan_unavailable' });

  const amount = Number(plan.price_monthly ?? 0);
  if (amount <= 0) return json(400, { error: 'invalid_amount' });

  const days = deriveDays(plan_code, {
    billing_interval: (plan as any).billing_interval ?? null,
    interval_count: (plan as any).interval_count ?? null,
  });
  const externalRef = `pix:${user.id}:${plan_code}:${days}`;
  const payerEmail = user.email;
  if (!payerEmail) return json(400, { error: 'missing_email' });

  // idempotency: MP requires it
  const idempotencyKey = crypto.randomUUID();

  const mpBody = {
    transaction_amount: amount,
    description: `Finango ${plan.name} — pagamento único via PIX`,
    payment_method_id: 'pix',
    external_reference: externalRef,
    payer: { email: payerEmail },
    metadata: { user_id: user.id, plan_code, kind: 'pix_one_time', days },
  };

  console.info('[create-pix-payment] request', {
    user_id: user.id,
    payer_email: payerEmail,
    external_reference: externalRef,
    amount,
    plan_code,
  });

  const resp = await fetch('https://api.mercadopago.com/v1/payments', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify(mpBody),
  });
  const data = await resp.json().catch(() => ({}));
  console.info('[create-pix-payment] response', { status: resp.status, body: data });

  if (!resp.ok) {
    return json(resp.status, { error: 'mp_error', detail: data });
  }

  const tx = data?.point_of_interaction?.transaction_data ?? {};
  // record payment as pending so admin/user can see it
  await admin.from('payments').upsert(
    {
      user_id: user.id,
      plan_code,
      provider: 'mercado_pago',
      provider_payment_id: String(data.id),
      amount,
      currency: data.currency_id ?? 'BRL',
      status: data.status ?? 'pending',
      status_detail: data.status_detail ?? null,
      payment_method: 'pix',
      external_reference: externalRef,
      raw: data,
    },
    { onConflict: 'provider_payment_id' },
  );

  return json(200, {
    ok: true,
    payment_id: String(data.id),
    status: data.status,
    qr_code: tx.qr_code ?? null,
    qr_code_base64: tx.qr_code_base64 ?? null,
    ticket_url: tx.ticket_url ?? null,
    expires_at: data.date_of_expiration ?? null,
    amount,
    plan_code,
    days,
  });
});
