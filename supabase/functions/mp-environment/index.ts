import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const MP_ACCESS_TOKEN = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN') ?? '';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const getMode = (): 'test' | 'live' | 'unknown' => {
  if (MP_ACCESS_TOKEN.startsWith('TEST-')) return 'test';
  if (MP_ACCESS_TOKEN.startsWith('APP_USR-')) return 'live';
  return 'unknown';
};

let cache: { at: number; data: any } | null = null;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const mode = getMode();
  if (!MP_ACCESS_TOKEN) return json(200, { mode: 'unknown', collector_email: null, configured: false });

  // Cache collector info for 5 min to avoid rate-limiting
  if (cache && Date.now() - cache.at < 5 * 60 * 1000) {
    return json(200, cache.data);
  }

  try {
    const res = await fetch('https://api.mercadopago.com/users/me', {
      headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
    });
    const data = await res.json();
    if (!res.ok) {
      return json(200, { mode, collector_email: null, configured: true, error: data?.message ?? 'mp_error' });
    }
    const payload = {
      mode,
      configured: true,
      collector_email: data?.email ?? null,
      collector_nickname: data?.nickname ?? null,
      site_id: data?.site_id ?? null,
    };
    cache = { at: Date.now(), data: payload };
    return json(200, payload);
  } catch (e) {
    return json(200, { mode, collector_email: null, configured: true, error: String(e) });
  }
});
