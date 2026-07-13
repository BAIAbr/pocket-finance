import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { logSubscriptionEvent } from '../_shared/logSubscription.ts';

const MP_ACCESS_TOKEN = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN')!;

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

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

  let body: { plan_code?: string; immediate?: boolean };
  try { body = await req.json(); } catch { return json(400, { error: 'invalid_json' }); }
  const targetPlan = (body.plan_code ?? 'free').trim() || 'free';
  const immediate = body.immediate === true;

  const { data: currentSub } = await admin
    .from('user_subscriptions').select('*').eq('user_id', userId).maybeSingle();

  const currentPlanCode = currentSub?.plan_code ?? 'free';
  if (currentPlanCode === targetPlan) {
    return json(400, { error: 'same_plan', message: 'Você já está neste plano.' });
  }

  // Compare prices — enforce it's actually a downgrade
  const codes = [currentPlanCode, targetPlan].filter((c) => c !== 'free');
  const { data: plans } = await admin
    .from('subscription_plans').select('code, name, price_monthly').in('code', codes.length ? codes : ['free']);
  const priceOf = (code: string) =>
    code === 'free' ? 0 : Number(plans?.find((p) => p.code === code)?.price_monthly ?? 0);
  const currentPrice = priceOf(currentPlanCode);
  const newPrice = priceOf(targetPlan);
  if (newPrice >= currentPrice) {
    return json(400, {
      error: 'not_a_downgrade',
      message: 'O plano selecionado não é um downgrade. Use upgrade-plan para subir de plano.',
    });
  }

  // Immediate downgrade to free — cancel MP preapproval and set free plan
  if (targetPlan === 'free' && (immediate || !currentSub?.next_billing_at)) {
    if (currentSub?.provider_subscription_id) {
      try {
        await fetch(`https://api.mercadopago.com/preapproval/${currentSub.provider_subscription_id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
          body: JSON.stringify({ status: 'cancelled' }),
        });
      } catch (e) { console.warn('mp cancel failed', e); }
    }

    await admin.from('user_subscriptions').upsert({
      user_id: userId,
      plan_code: 'free',
      status: 'active',
      provider: null,
      provider_subscription_id: null,
      started_at: new Date().toISOString(),
      expires_at: null,
      next_billing_at: null,
      cancelled_at: new Date().toISOString(),
      metadata: { downgraded_from: currentPlanCode, immediate: true },
    }, { onConflict: 'user_id' });

    await logSubscriptionEvent(admin, {
      user_id: userId,
      subscription_id: currentSub?.id ?? null,
      plan_code: 'free',
      event_type: 'plan_downgrade_immediate',
      source: 'downgrade-plan',
      payload: { from: currentPlanCode, to: 'free' },
    });

    return json(200, { ok: true, plan_code: 'free', immediate: true });
  }

  // Otherwise: schedule downgrade at end of the current billing cycle
  const scheduledFor = currentSub?.next_billing_at ?? currentSub?.expires_at ?? new Date().toISOString();
  const metadata = { ...(currentSub?.metadata ?? {}), scheduled_downgrade: { to: targetPlan, at: scheduledFor } };

  await admin.from('user_subscriptions').update({ metadata }).eq('id', currentSub!.id);

  await logSubscriptionEvent(admin, {
    user_id: userId,
    subscription_id: currentSub?.id ?? null,
    plan_code: currentPlanCode,
    event_type: 'plan_downgrade_scheduled',
    source: 'downgrade-plan',
    payload: { from: currentPlanCode, to: targetPlan, scheduled_for: scheduledFor },
  });

  return json(200, { ok: true, scheduled_for: scheduledFor, target_plan: targetPlan });
});
