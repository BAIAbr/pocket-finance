import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
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

  let body: { code?: string };
  try { body = await req.json(); } catch { return json(400, { error: 'invalid_body' }); }
  const rawCode = (body.code || '').trim();
  if (!rawCode || rawCode.length > 64 || !/^[A-Za-z0-9_-]+$/.test(rawCode)) {
    return json(400, { error: 'invalid_code_format' });
  }

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  // Load code (case-insensitive)
  const { data: codes, error: codeErr } = await admin
    .from('vip_codes')
    .select('*')
    .ilike('code', rawCode)
    .limit(1);
  if (codeErr) return json(500, { error: 'db_error' });
  const vip = codes?.[0];
  if (!vip) return json(404, { error: 'not_found' });
  if (!vip.is_active) return json(400, { error: 'inactive' });
  if (vip.expires_at && new Date(vip.expires_at) < new Date()) return json(400, { error: 'expired' });
  if (vip.max_uses != null && vip.uses_count >= vip.max_uses) return json(400, { error: 'max_uses' });

  // Already redeemed by this user?
  const { data: existing } = await admin
    .from('vip_redemptions')
    .select('id')
    .eq('vip_code_id', vip.id)
    .eq('user_id', userId)
    .maybeSingle();
  if (existing) return json(409, { error: 'already_redeemed' });

  const now = new Date();
  const expires = new Date(now.getTime() + vip.duration_days * 24 * 60 * 60 * 1000);

  // Upsert subscription
  const { error: subErr } = await admin
    .from('user_subscriptions')
    .upsert(
      {
        user_id: userId,
        plan_code: vip.plan_code,
        status: 'active',
        started_at: now.toISOString(),
        expires_at: expires.toISOString(),
      },
      { onConflict: 'user_id' }
    );
  if (subErr) return json(500, { error: 'subscription_failed', detail: subErr.message });

  // Record redemption
  const { error: redErr } = await admin.from('vip_redemptions').insert({
    vip_code_id: vip.id,
    code: vip.code,
    user_id: userId,
    plan_code: vip.plan_code,
    expires_at: expires.toISOString(),
  });
  if (redErr) return json(500, { error: 'redemption_failed' });

  // Increment uses_count
  await admin
    .from('vip_codes')
    .update({ uses_count: vip.uses_count + 1 })
    .eq('id', vip.id);

  // Plan name for UI
  const { data: plan } = await admin
    .from('subscription_plans')
    .select('name')
    .eq('code', vip.plan_code)
    .maybeSingle();

  return json(200, {
    ok: true,
    code: vip.code,
    plan_code: vip.plan_code,
    plan_name: plan?.name ?? vip.plan_code,
    duration_days: vip.duration_days,
    expires_at: expires.toISOString(),
  });
});
