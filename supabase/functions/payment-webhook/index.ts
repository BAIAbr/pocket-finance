import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createHmac } from 'node:crypto';

const MP_ACCESS_TOKEN = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN')!;
const MP_WEBHOOK_SECRET = Deno.env.get('MERCADO_PAGO_WEBHOOK_SECRET')!;

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

// MP signature: `ts=...,v1=...` (HMAC-SHA256 of `id:...;request-id:...;ts:...;`)
function verifySignature(req: Request, dataId: string): boolean {
  if (!MP_WEBHOOK_SECRET) return true; // if no secret configured, skip
  const sig = req.headers.get('x-signature');
  const reqId = req.headers.get('x-request-id') ?? '';
  if (!sig) return false;
  const parts = Object.fromEntries(sig.split(',').map((p) => p.trim().split('=')));
  const ts = parts['ts'];
  const v1 = parts['v1'];
  if (!ts || !v1) return false;
  const manifest = `id:${dataId};request-id:${reqId};ts:${ts};`;
  const hmac = createHmac('sha256', MP_WEBHOOK_SECRET).update(manifest).digest('hex');
  return hmac === v1;
}

async function fetchMp(path: string) {
  const r = await fetch(`https://api.mercadopago.com${path}`, {
    headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
  });
  return r.ok ? await r.json() : null;
}

async function activateSubscription(userId: string, planCode: string, preapprovalId: string | null, extra: Record<string, unknown> = {}) {
  const now = new Date();
  const nextBilling = new Date(now); nextBilling.setMonth(nextBilling.getMonth() + 1);
  await admin.from('user_subscriptions').upsert(
    {
      user_id: userId,
      plan_code: planCode,
      status: 'active',
      provider: 'mercado_pago',
      provider_subscription_id: preapprovalId,
      started_at: now.toISOString(),
      expires_at: nextBilling.toISOString(),
      next_billing_at: nextBilling.toISOString(),
      cancelled_at: null,
      metadata: extra,
    },
    { onConflict: 'user_id' },
  );
}

async function downgradeToFree(userId: string) {
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
}

function parseExternalRef(ref?: string | null) {
  if (!ref) return null;
  const [userId, planCode] = ref.split(':');
  if (!userId || !planCode) return null;
  return { userId, planCode };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  let payload: any = {};
  try { payload = await req.json(); } catch { /* MP sometimes sends empty body via query */ }

  const url = new URL(req.url);
  const type = payload.type ?? url.searchParams.get('type') ?? payload.topic ?? url.searchParams.get('topic');
  const dataId = String(payload?.data?.id ?? url.searchParams.get('data.id') ?? url.searchParams.get('id') ?? '');

  if (!dataId) return json(200, { ok: true, skipped: 'no_id' });

  if (!verifySignature(req, dataId)) {
    console.warn('Invalid MP signature');
    return json(401, { error: 'invalid_signature' });
  }

  try {
    if (type === 'payment' || type === 'payment.updated' || type === 'payment.created') {
      const p = await fetchMp(`/v1/payments/${dataId}`);
      if (!p) return json(200, { ok: true, skipped: 'payment_not_found' });

      const ref = parseExternalRef(p.external_reference);
      const preapprovalId = p.metadata?.preapproval_id ?? p.point_of_interaction?.transaction_data?.preapproval_id ?? null;

      let userId = ref?.userId ?? null;
      let planCode = ref?.planCode ?? null;

      if (!userId && preapprovalId) {
        const { data: sub } = await admin
          .from('user_subscriptions')
          .select('user_id, plan_code')
          .eq('provider_subscription_id', preapprovalId)
          .maybeSingle();
        if (sub) { userId = sub.user_id; planCode = sub.plan_code; }
      }

      if (userId) {
        await admin.from('payments').upsert(
          {
            user_id: userId,
            plan_code: planCode,
            provider: 'mercado_pago',
            provider_payment_id: String(p.id),
            provider_subscription_id: preapprovalId,
            amount: Number(p.transaction_amount ?? 0),
            currency: p.currency_id ?? 'BRL',
            status: p.status,
            status_detail: p.status_detail,
            payment_method: p.payment_method_id,
            paid_at: p.date_approved,
            raw: p,
          },
          { onConflict: 'provider_payment_id' },
        );

        if (p.status === 'approved' && planCode) {
          await activateSubscription(userId, planCode, preapprovalId, { last_payment_id: p.id });
        }
      }
    } else if (type === 'subscription_preapproval' || type === 'preapproval' || type === 'subscription_authorized_payment') {
      const s = await fetchMp(`/preapproval/${dataId}`);
      if (!s) return json(200, { ok: true, skipped: 'preapproval_not_found' });

      const ref = parseExternalRef(s.external_reference);
      if (!ref) return json(200, { ok: true, skipped: 'no_ref' });

      if (s.status === 'authorized') {
        await activateSubscription(ref.userId, ref.planCode, String(s.id), { preapproval: s });
      } else if (s.status === 'cancelled' || s.status === 'paused') {
        await downgradeToFree(ref.userId);
      }
    }

    return json(200, { ok: true });
  } catch (e) {
    console.error('webhook error', e);
    return json(500, { error: 'internal_error' });
  }
});
