import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { logSubscriptionEvent } from '../_shared/logSubscription.ts';

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

  let body: { code?: string; plan_code?: string };
  try { body = await req.json(); } catch { return json(400, { error: 'invalid_json' }); }
  const code = (body.code ?? '').trim().toUpperCase();
  const targetPlanCode = (body.plan_code ?? '').trim() || null;
  if (!code) return json(400, { error: 'missing_code' });

  const { data: coupon, error: cErr } = await admin
    .from('coupons').select('*').eq('code', code).maybeSingle();
  if (cErr || !coupon) return json(404, { error: 'coupon_not_found', message: 'Cupom inválido.' });
  if (!coupon.active) return json(400, { error: 'inactive', message: 'Cupom desativado.' });

  const now = new Date();
  if (coupon.starts_at && new Date(coupon.starts_at) > now)
    return json(400, { error: 'not_started', message: 'Cupom ainda não está disponível.' });
  if (coupon.expires_at && new Date(coupon.expires_at) < now)
    return json(400, { error: 'expired', message: 'Cupom expirado.' });
  if (coupon.max_uses != null && coupon.uses_count >= coupon.max_uses)
    return json(400, { error: 'exhausted', message: 'Cupom esgotado.' });

  const appliesTo: string[] = coupon.applies_to_plan_codes ?? [];
  if (targetPlanCode && appliesTo.length > 0 && !appliesTo.includes(targetPlanCode))
    return json(400, { error: 'plan_not_allowed', message: 'Cupom não válido para este plano.' });

  // Prevent double-redemption per user
  const { data: existing } = await admin
    .from('coupon_redemptions')
    .select('id')
    .eq('coupon_id', coupon.id)
    .eq('user_id', userId)
    .maybeSingle();
  if (existing) return json(400, { error: 'already_redeemed', message: 'Você já resgatou este cupom.' });

  // Calculate discount (informational; MP checkout adjustment happens via create-subscription/preview)
  let discountApplied = 0;
  if (targetPlanCode) {
    const { data: plan } = await admin
      .from('subscription_plans').select('price_monthly').eq('code', targetPlanCode).maybeSingle();
    const price = Number(plan?.price_monthly ?? 0);
    if (coupon.discount_type === 'percent') {
      discountApplied = +(price * (Number(coupon.discount_value) / 100)).toFixed(2);
    } else if (coupon.discount_type === 'fixed') {
      discountApplied = Math.min(price, Number(coupon.discount_value));
    }
  }

  // Look up current subscription for logging
  const { data: sub } = await admin
    .from('user_subscriptions').select('id, plan_code').eq('user_id', userId).maybeSingle();

  // Register redemption + increment usage
  await admin.from('coupon_redemptions').insert({
    coupon_id: coupon.id,
    user_id: userId,
    subscription_id: sub?.id ?? null,
    plan_code: targetPlanCode ?? sub?.plan_code ?? null,
    discount_applied: discountApplied,
  });

  await admin.from('coupons').update({ uses_count: (coupon.uses_count ?? 0) + 1 }).eq('id', coupon.id);

  // If coupon grants free days and user has active sub, extend expires_at
  if (coupon.free_days && coupon.free_days > 0 && sub) {
    const { data: current } = await admin
      .from('user_subscriptions').select('expires_at, next_billing_at').eq('id', sub.id).maybeSingle();
    const base = current?.expires_at ? new Date(current.expires_at) : new Date();
    base.setDate(base.getDate() + coupon.free_days);
    await admin.from('user_subscriptions').update({
      expires_at: base.toISOString(),
      next_billing_at: base.toISOString(),
    }).eq('id', sub.id);
  }

  await logSubscriptionEvent(admin, {
    user_id: userId,
    subscription_id: sub?.id ?? null,
    plan_code: targetPlanCode ?? sub?.plan_code ?? null,
    event_type: 'coupon_applied',
    source: 'apply-coupon',
    payload: { coupon_code: code, discount_applied: discountApplied, free_days: coupon.free_days },
  });

  return json(200, {
    ok: true,
    coupon: {
      code: coupon.code,
      description: coupon.description,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      free_days: coupon.free_days,
    },
    discount_applied: discountApplied,
  });
});
