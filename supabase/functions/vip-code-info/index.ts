import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { code } = await req.json();
    if (!code || typeof code !== 'string') {
      return new Response(JSON.stringify({ error: 'invalid_code' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const normalized = code.trim();
    if (!normalized || !/^[A-Za-z0-9_-]{1,64}$/.test(normalized)) {
      return new Response(JSON.stringify({ result: { valid: false, reason: 'invalid_code_format', code: normalized } }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } },
    );

    // Case-insensitive lookup on public.vip_codes (service role bypasses RLS).
    const { data: rows, error } = await admin
      .from('vip_codes')
      .select('code, description, plan_code, duration_days, is_active, expires_at, max_uses, uses_count, views_count')
      .ilike('code', normalized)
      .limit(1);

    if (error) {
      console.error('vip-code-info lookup error', error);
      return new Response(JSON.stringify({ error: 'lookup_failed', detail: error.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const vip = rows?.[0];
    const base = { code: normalized, description: null as string | null, plan_code: null as string | null, plan_name: null as string | null, duration_days: null as number | null };

    if (!vip) {
      return new Response(JSON.stringify({ result: { valid: false, reason: 'not_found', ...base } }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fire-and-forget view increment
    admin.from('vip_codes').update({ views_count: (vip.views_count ?? 0) + 1 }).ilike('code', normalized).then(() => {}, () => {});

    const shared = {
      code: vip.code,
      description: vip.description,
      plan_code: vip.plan_code,
      duration_days: vip.duration_days,
    };

    if (!vip.is_active) {
      return new Response(JSON.stringify({ result: { valid: false, reason: 'inactive', plan_name: null, ...shared } }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (vip.expires_at && new Date(vip.expires_at) < new Date()) {
      return new Response(JSON.stringify({ result: { valid: false, reason: 'expired', plan_name: null, ...shared } }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (vip.max_uses != null && vip.uses_count >= vip.max_uses) {
      return new Response(JSON.stringify({ result: { valid: false, reason: 'max_uses', plan_name: null, ...shared } }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: plan } = await admin
      .from('subscription_plans')
      .select('name')
      .eq('code', vip.plan_code)
      .maybeSingle();

    return new Response(JSON.stringify({
      result: { valid: true, reason: 'ok', plan_name: plan?.name ?? vip.plan_code, ...shared },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('vip-code-info fatal', e);
    return new Response(JSON.stringify({ error: 'lookup_failed', detail: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
