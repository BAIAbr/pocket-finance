import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'GET' && req.method !== 'POST') return json(405, { error: 'method_not_allowed' });

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

  const url = new URL(req.url);
  let scope = url.searchParams.get('scope') ?? 'self';
  let limit = Math.min(Number(url.searchParams.get('limit') ?? 50), 200);
  if (req.method === 'POST') {
    try {
      const body = await req.json();
      if (body?.scope) scope = String(body.scope);
      if (body?.limit) limit = Math.min(Number(body.limit), 200);
    } catch { /* ignore */ }
  }

  // Admins can request all logs
  if (scope === 'all') {
    const { data: roles } = await admin.from('user_roles').select('role').eq('user_id', userId).eq('role', 'admin').maybeSingle();
    if (!roles) return json(403, { error: 'forbidden' });
    const { data, error } = await admin
      .from('subscription_logs').select('*').order('created_at', { ascending: false }).limit(limit);
    if (error) return json(500, { error: 'query_failed', detail: error.message });
    return json(200, { logs: data ?? [] });
  }

  const { data, error } = await admin
    .from('subscription_logs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return json(500, { error: 'query_failed', detail: error.message });

  return json(200, { logs: data ?? [] });
});
