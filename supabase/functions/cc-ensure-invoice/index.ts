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

  let body: { card_id?: string; reference_month?: string };
  try { body = await req.json(); } catch { return json(400, { error: 'invalid_json' }); }
  const cardId = (body.card_id || '').trim();
  const refMonth = (body.reference_month || '').trim();
  if (!/^[0-9a-f-]{36}$/i.test(cardId)) return json(400, { error: 'invalid_card_id' });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(refMonth)) return json(400, { error: 'invalid_reference_month' });

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  // Verify card ownership before invoking the SECURITY DEFINER function
  const { data: card, error: cardErr } = await admin
    .from('credit_cards')
    .select('id, user_id')
    .eq('id', cardId)
    .maybeSingle();
  if (cardErr) return json(500, { error: 'db_error' });
  if (!card || card.user_id !== userId) return json(403, { error: 'forbidden' });

  const { data, error } = await admin.rpc('cc_ensure_invoice', {
    _card_id: cardId,
    _reference_month: refMonth,
  } as any);
  if (error) return json(500, { error: 'ensure_invoice_failed', detail: error.message });

  return json(200, { invoice_id: data });
});
