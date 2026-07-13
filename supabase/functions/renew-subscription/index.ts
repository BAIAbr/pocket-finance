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

  let body: { payer_email?: string; back_url?: string; plan_code?: string };
  try { body = await req.json(); } catch { body = {}; }

  const { data: sub } = await admin
    .from('user_subscriptions').select('*').eq('user_id', userId).maybeSingle();

  // Renew = re-activate a cancelled/expired paid plan (or the plan_code passed in)
  const planCode = (body.plan_code ?? sub?.plan_code ?? '').trim();
  if (!planCode || planCode === 'free') return json(400, { error: 'no_plan_to_renew' });

  if (sub && sub.status === 'active' && sub.plan_code === planCode &&
      (!sub.expires_at || new Date(sub.expires_at) > new Date())) {
    return json(400, { error: 'already_active', message: 'Sua assinatura já está ativa.' });
  }

  const payerEmail = isValidEmail(body.payer_email) ? body.payer_email!.trim().toLowerCase() : email;
  if (!isValidEmail(payerEmail)) return json(400, { error: 'invalid_payer_email', message: 'Informe um e-mail válido.' });

  const { data: plan } = await admin
    .from('subscription_plans').select('*').eq('code', planCode).maybeSingle();
  if (!plan || !plan.is_active) return json(404, { error: 'plan_not_found' });
  const amount = Number(plan.price_monthly);
  if (!(amount > 0)) return json(400, { error: 'invalid_amount' });

  const origin = req.headers.get('origin') ?? body.back_url ?? 'https://finango.online';
  const backUrl = `${origin}/#/settings/subscription`;
  const externalRef = `${userId}:${planCode}:${Date.now()}`;

  const mpRes = await fetch('https://api.mercadopago.com/preapproval', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
    body: JSON.stringify({
      reason: `Finango ${plan.name} (renovação)`,
      external_reference: externalRef,
      payer_email: payerEmail,
      back_url: backUrl,
      auto_recurring: { frequency: 1, frequency_type: 'months', transaction_amount: amount, currency_id: 'BRL' },
      status: 'pending',
    }),
  });
  const mpData = await mpRes.json();
  if (!mpRes.ok) {
    console.error('MP renew error', mpData);
    return json(502, { error: 'mp_error', detail: mpData });
  }

  await admin.from('user_subscriptions').upsert({
    user_id: userId,
    plan_code: planCode,
    status: 'pending',
    provider: 'mercado_pago',
    provider_subscription_id: mpData.id,
    started_at: new Date().toISOString(),
    expires_at: null,
    cancelled_at: null,
    metadata: { external_reference: externalRef, init_point: mpData.init_point, payer_email: payerEmail, action: 'renew' },
  }, { onConflict: 'user_id' });

  await logSubscriptionEvent(admin, {
    user_id: userId,
    subscription_id: sub?.id ?? null,
    plan_code: planCode,
    event_type: 'subscription_renew_started',
    source: 'renew-subscription',
    payload: { plan_code: planCode, amount },
  });

  return json(200, { ok: true, checkout_url: mpData.init_point ?? mpData.sandbox_init_point, preapproval_id: mpData.id });
});
