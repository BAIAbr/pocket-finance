import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    let payload: { code?: string };
    try { payload = await req.json(); } catch { return json(400, { error: 'invalid_body' }); }

    const normalized = (payload.code ?? '').trim();
    const base = {
      code: normalized,
      internal_name: null as string | null,
      description: null as string | null,
      plan_code: null as string | null,
      plan_name: null as string | null,
      duration_days: null as number | null,
      benefit_type: null as string | null,
      discount_percent: null as number | null,
      discount_amount: null as number | null,
      is_lifetime: false,
      code_type: null as string | null,
      campaign_source: null as string | null,
    };

    if (!normalized || !/^[A-Za-z0-9_-]{1,64}$/.test(normalized)) {
      return json(200, { result: { valid: false, reason: 'invalid_code_format', ...base } });
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } },
    );

    const { data: rows, error } = await admin
      .from('vip_codes')
      .select('id, code, internal_name, description, plan_code, duration_days, is_active, status, starts_at, expires_at, max_uses, uses_count, views_count, benefit_type, discount_percent, discount_amount, is_lifetime, code_type, campaign_source, unlimited')
      .ilike('code', normalized)
      .limit(1);

    if (error) {
      console.error('vip-code-info lookup error', error);
      return json(500, { error: 'lookup_failed', detail: error.message });
    }

    const vip = rows?.[0];
    if (!vip) return json(200, { result: { valid: false, reason: 'not_found', ...base } });

    // Fire-and-forget view increment
    admin.from('vip_codes').update({ views_count: (vip.views_count ?? 0) + 1 }).eq('id', vip.id).then(() => {}, () => {});

    const shared = {
      code: vip.code,
      internal_name: vip.internal_name,
      description: vip.description,
      plan_code: vip.plan_code,
      duration_days: vip.duration_days,
      benefit_type: vip.benefit_type,
      discount_percent: vip.discount_percent,
      discount_amount: vip.discount_amount,
      is_lifetime: vip.is_lifetime,
      code_type: vip.code_type,
      campaign_source: vip.campaign_source,
      plan_name: null as string | null,
    };

    const now = new Date();
    if (vip.status === 'archived') return json(200, { result: { valid: false, reason: 'archived', ...shared } });
    if (vip.status === 'paused' || !vip.is_active) return json(200, { result: { valid: false, reason: 'inactive', ...shared } });
    if (vip.starts_at && new Date(vip.starts_at) > now) return json(200, { result: { valid: false, reason: 'not_started', ...shared } });
    if (vip.expires_at && new Date(vip.expires_at) < now) return json(200, { result: { valid: false, reason: 'expired', ...shared } });
    if (!vip.unlimited && vip.max_uses != null && vip.uses_count >= vip.max_uses) {
      return json(200, { result: { valid: false, reason: 'max_uses', ...shared } });
    }

    const { data: plan } = await admin
      .from('subscription_plans')
      .select('name')
      .eq('code', vip.plan_code)
      .maybeSingle();

    return json(200, { result: { valid: true, reason: 'ok', ...shared, plan_name: plan?.name ?? vip.plan_code } });
  } catch (e) {
    console.error('vip-code-info fatal', e);
    return json(500, { error: 'lookup_failed', detail: String(e) });
  }
});
