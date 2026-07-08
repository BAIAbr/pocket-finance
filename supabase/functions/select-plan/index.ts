import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

// Users may only self-select the free plan through this endpoint.
// Paid plans must be granted via verified payment flow or VIP redemption.
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

  let body: { plan_code?: string };
  try { body = await req.json(); } catch { return json(400, { error: 'invalid_body' }); }
  const planCode = (body.plan_code ?? '').trim();

  if (planCode !== 'free') {
    return json(403, { error: 'payment_required', message: 'Paid plans require payment verification or a VIP code.' });
  }

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { error } = await admin
    .from('user_subscriptions')
    .upsert(
      { user_id: userId, plan_code: 'free', status: 'active', started_at: new Date().toISOString(), expires_at: null },
      { onConflict: 'user_id' }
    );
  if (error) return json(500, { error: 'update_failed' });

  return json(200, { ok: true, plan_code: 'free' });
});
