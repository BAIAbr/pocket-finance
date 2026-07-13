import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

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
  const { data: claimsData } = await supabase.auth.getClaims(token);
  if (!claimsData?.claims) return json(401, { error: 'unauthorized' });
  const userId = claimsData.claims.sub as string;

  let body: { code?: string; apply?: boolean };
  try { body = await req.json(); } catch { return json(400, { error: 'invalid_json' }); }
  const code = (body.code ?? '').trim().toUpperCase();
  if (!code) return json(400, { error: 'missing_code' });

  const { data: vip } = await admin
    .from('vip_codes')
    .select('id, code, plan_code, duration_days, max_uses, uses_count, active, expires_at')
    .ilike('code', code)
    .maybeSingle();

  if (!vip) return json(404, { valid: false, error: 'not_found' });
  if (!vip.active) return json(400, { valid: false, error: 'inactive' });
  if (vip.expires_at && new Date(vip.expires_at) < new Date()) return json(400, { valid: false, error: 'expired' });
  if (vip.max_uses && vip.uses_count >= vip.max_uses) return json(400, { valid: false, error: 'exhausted' });

  if (!body.apply) {
    return json(200, { valid: true, plan_code: vip.plan_code, duration_days: vip.duration_days });
  }

  // Apply
  const expiresAt = vip.duration_days
    ? new Date(Date.now() + vip.duration_days * 86400_000).toISOString()
    : null;

  await admin.from('user_subscriptions').upsert(
    {
      user_id: userId,
      plan_code: vip.plan_code,
      status: 'vip',
      started_at: new Date().toISOString(),
      expires_at: expiresAt,
      provider: 'vip_code',
      metadata: { vip_code: vip.code },
    },
    { onConflict: 'user_id' },
  );

  await admin.from('vip_codes').update({ uses_count: (vip.uses_count ?? 0) + 1 }).eq('id', vip.id);
  await admin.from('vip_redemptions').insert({ vip_code_id: vip.id, user_id: userId }).select();

  return json(200, { valid: true, applied: true, plan_code: vip.plan_code, expires_at: expiresAt });
});
