import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

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

  const { data: sub } = await admin
    .from('user_subscriptions')
    .select('id, provider_subscription_id, plan_code')
    .eq('user_id', userId)
    .maybeSingle();

  // Cancel on Mercado Pago (best-effort)
  if (sub?.provider_subscription_id) {
    try {
      const r = await fetch(`https://api.mercadopago.com/preapproval/${sub.provider_subscription_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({ status: 'cancelled' }),
      });
      if (!r.ok) console.warn('MP cancel non-ok', await r.text());
    } catch (e) {
      console.warn('MP cancel failed', e);
    }
  }

  // Downgrade locally — keeps all user data, only blocks premium features via plan_code = 'free'
  await admin.from('user_subscriptions').upsert(
    {
      user_id: userId,
      plan_code: 'free',
      status: 'active',
      provider: null,
      provider_subscription_id: null,
      started_at: new Date().toISOString(),
      expires_at: null,
      next_billing_at: null,
      cancelled_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );

  return json(200, { ok: true, plan_code: 'free' });
});
