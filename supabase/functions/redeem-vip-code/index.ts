import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { checkThrottle, registerFailure, clearThrottle } from '../_shared/redeemThrottle.ts';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

// Lightweight in-memory burst guard (per isolate): 8 attempts / 60s per key.
const attempts = new Map<string, number[]>();
function rateLimited(key: string, max = 8, windowMs = 60_000) {
  const now = Date.now();
  const list = (attempts.get(key) ?? []).filter((t) => now - t < windowMs);
  list.push(now);
  attempts.set(key, list);
  return list.length > max;
}

function detectDevice(ua: string): string {
  const s = ua.toLowerCase();
  if (/ipad|tablet/.test(s)) return 'Tablet';
  if (/iphone|android|mobile/.test(s)) return 'Mobile';
  if (/windows|macintosh|linux/.test(s)) return 'Desktop';
  return 'Desconhecido';
}


Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return json(401, { error: 'unauthorized' });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace('Bearer ', '');
  const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
  if (claimsErr || !claims?.claims?.sub) return json(401, { error: 'unauthorized' });
  const userId = claims.claims.sub as string;

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
  const userAgent = req.headers.get('user-agent') ?? '';
  const device = detectDevice(userAgent);

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const identity = `${userId}:${ip ?? 'noip'}`;

  const throttleBody = (state: { retryAfterSeconds: number; blockedUntil: string | null; level: number }) => ({
    error: 'rate_limited',
    retry_after_seconds: state.retryAfterSeconds,
    blocked_until: state.blockedUntil,
    block_level: state.level,
  });

  if (rateLimited(identity)) {
    return json(429, { error: 'rate_limited', retry_after_seconds: 60, blocked_until: null, block_level: 0 });
  }

  // Persistent progressive throttle
  const state = await checkThrottle(admin, identity, { user_id: userId, ip });
  if (state.blocked) return json(429, throttleBody(state));

  // Any invalid/failed attempt escalates the progressive block.
  const fail = async (status: number, error: string) => {
    const after = await registerFailure(admin, identity);
    if (after.blocked) return json(429, throttleBody(after));
    return json(status, { error, remaining_attempts: after.remainingAttempts });
  };

  let body: { code?: string };
  try { body = await req.json(); } catch { return json(400, { error: 'invalid_body' }); }
  const rawCode = (body.code || '').trim();
  if (!rawCode || rawCode.length > 64 || !/^[A-Za-z0-9_-]+$/.test(rawCode)) {
    return await fail(400, 'invalid_code_format');
  }

  const { data: codes, error: codeErr } = await admin
    .from('vip_codes')
    .select('*')
    .ilike('code', rawCode)
    .limit(1);
  if (codeErr) return json(500, { error: 'db_error' });
  const vip = codes?.[0];
  if (!vip) return await fail(404, 'not_found');

  const now = new Date();
  if (vip.status === 'archived') return await fail(400, 'archived');
  if (vip.status === 'paused' || !vip.is_active) return await fail(400, 'inactive');
  if (vip.starts_at && new Date(vip.starts_at) > now) return await fail(400, 'not_started');
  if (vip.expires_at && new Date(vip.expires_at) < now) return await fail(400, 'expired');
  if (!vip.unlimited && vip.max_uses != null && vip.uses_count >= vip.max_uses) {
    return await fail(400, 'max_uses');
  }

  if (vip.single_use_per_user !== false) {
    const { data: existing } = await admin
      .from('vip_redemptions')
      .select('id')
      .eq('vip_code_id', vip.id)
      .eq('user_id', userId)
      .maybeSingle();
    if (existing) return await fail(409, 'already_redeemed');
  }

  // Plan compatibility
  const { data: plan } = await admin
    .from('subscription_plans')
    .select('name, is_active')
    .eq('code', vip.plan_code)
    .maybeSingle();
  if (!plan || plan.is_active === false) return await fail(400, 'plan_unavailable');


  const isLifetime = vip.is_lifetime === true || vip.benefit_type === 'lifetime';
  const days = isLifetime ? null : (vip.duration_days ?? 30);
  const expires = isLifetime ? null : new Date(now.getTime() + (days as number) * 86400_000);

  const { error: subErr } = await admin
    .from('user_subscriptions')
    .upsert(
      {
        user_id: userId,
        plan_code: vip.plan_code,
        status: 'vip',
        started_at: now.toISOString(),
        expires_at: expires ? expires.toISOString() : null,
        provider: 'vip_code',
        metadata: { vip_code: vip.code, campaign_source: vip.campaign_source },
      },
      { onConflict: 'user_id' }
    );
  if (subErr) return json(500, { error: 'subscription_failed', detail: subErr.message });

  const { error: redErr } = await admin.from('vip_redemptions').insert({
    vip_code_id: vip.id,
    code: vip.code,
    user_id: userId,
    plan_code: vip.plan_code,
    expires_at: expires ? expires.toISOString() : null,
    days_granted: days,
    source_campaign: vip.campaign_source,
    user_agent: userAgent.slice(0, 500),
    ip,
    device,
  });
  if (redErr) {
    if ((redErr as { code?: string }).code === '23505') return json(409, { error: 'already_redeemed' });
    return json(500, { error: 'redemption_failed' });
  }

  await admin
    .from('vip_codes')
    .update({ uses_count: (vip.uses_count ?? 0) + 1 })
    .eq('id', vip.id);

  await admin.from('vip_code_events').insert({
    vip_code_id: vip.id,
    code: vip.code,
    actor_id: userId,
    action: 'redeemed',
    metadata: { plan_code: vip.plan_code, days_granted: days, device, ip, campaign_source: vip.campaign_source },
  });

  return json(200, {
    ok: true,
    code: vip.code,
    plan_code: vip.plan_code,
    plan_name: plan?.name ?? vip.plan_code,
    duration_days: days,
    is_lifetime: isLifetime,
    expires_at: expires ? expires.toISOString() : null,
  });
});
