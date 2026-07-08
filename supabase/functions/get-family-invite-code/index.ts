import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return json(401, { error: 'unauthorized' });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const token = authHeader.replace('Bearer ', '');
  const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
  if (claimsErr || !claims?.claims?.sub) return json(401, { error: 'unauthorized' });
  const userId = claims.claims.sub as string;

  let body: { family_id?: string };
  try { body = await req.json(); } catch { return json(400, { error: 'invalid_body' }); }
  const familyId = (body.family_id ?? '').trim();
  if (!/^[0-9a-f-]{36}$/i.test(familyId)) return json(400, { error: 'invalid_family_id' });

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  // Verify caller is admin or creator of the family
  const { data: fam } = await admin.from('families').select('created_by, invite_code').eq('id', familyId).maybeSingle();
  if (!fam) return json(404, { error: 'not_found' });

  const isCreator = fam.created_by === userId;
  let isAdmin = isCreator;
  if (!isAdmin) {
    const { data: mem } = await admin
      .from('family_members')
      .select('role')
      .eq('family_id', familyId)
      .eq('user_id', userId)
      .maybeSingle();
    isAdmin = mem?.role === 'admin';
  }
  if (!isAdmin) return json(403, { error: 'forbidden' });

  return json(200, { invite_code: fam.invite_code });
});
