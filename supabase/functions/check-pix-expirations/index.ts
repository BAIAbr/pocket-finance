import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { sendPushToUser } from '../_shared/webpush.ts';

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

// Runs daily via pg_cron. Actions:
// 1. Downgrade to FREE users whose PIX-based subscription has expired.
// 2. Send 3-day warning notification (in-app + push) once per subscription.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const now = new Date();
  const in3d = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();
  const nowIso = now.toISOString();

  // 1) Expired PIX subs → free
  const { data: expired } = await admin
    .from('user_subscriptions')
    .select('id, user_id, plan_code, expires_at, metadata')
    .eq('status', 'active')
    .not('expires_at', 'is', null)
    .lt('expires_at', nowIso)
    .filter('metadata->>pix', 'eq', 'true');

  let downgraded = 0;
  let pushedExpired = 0;
  for (const sub of expired ?? []) {
    await admin.from('user_subscriptions').update({
      plan_code: 'free',
      status: 'active',
      provider: null,
      provider_subscription_id: null,
      cancelled_at: nowIso,
      expires_at: null,
      next_billing_at: null,
      metadata: { ...(sub.metadata ?? {}), pix: false, expired_from: sub.plan_code },
    }).eq('id', sub.id);

    await admin.from('notifications_log').insert({
      user_id: sub.user_id,
      notification_level: 3,
      message: 'Seu acesso Premium via PIX expirou. Volte a assinar quando quiser para reativar os recursos.',
      status: 'sent',
    });

    await admin.from('subscription_logs').insert({
      user_id: sub.user_id,
      event: 'pix_expired',
      source: 'cron',
      payload: { plan_code: sub.plan_code, previous_expires_at: sub.expires_at },
    });

    try {
      const c = await sendPushToUser(admin, sub.user_id, {
        title: 'Seu Premium expirou 🔴',
        body: 'Seu acesso Premium via PIX chegou ao fim. Toque para renovar.',
        url: '/#/settings/subscription',
        tag: 'pix-expired',
      });
      pushedExpired += c;
    } catch (e) {
      console.error('push expired error', e);
    }

    downgraded++;
  }

  // 2) Subs expiring in <= 3 days that haven't been warned yet
  const { data: warnings } = await admin
    .from('user_subscriptions')
    .select('id, user_id, plan_code, expires_at, metadata')
    .eq('status', 'active')
    .not('expires_at', 'is', null)
    .gte('expires_at', nowIso)
    .lte('expires_at', in3d)
    .filter('metadata->>pix', 'eq', 'true');

  let warned = 0;
  let pushedWarn = 0;
  for (const sub of warnings ?? []) {
    const meta = (sub.metadata ?? {}) as Record<string, unknown>;
    if (meta.warned_3d) continue;
    const daysLeft = Math.max(
      0,
      Math.ceil((new Date(sub.expires_at as string).getTime() - now.getTime()) / (24 * 60 * 60 * 1000)),
    );
    await admin.from('notifications_log').insert({
      user_id: sub.user_id,
      notification_level: 2,
      message: `Seu Premium via PIX expira em ${daysLeft} dia(s). Renove para continuar aproveitando.`,
      status: 'sent',
    });
    await admin.from('user_subscriptions').update({
      metadata: { ...meta, warned_3d: true },
    }).eq('id', sub.id);

    try {
      const c = await sendPushToUser(admin, sub.user_id, {
        title: `Premium expira em ${daysLeft} dia(s) ⚠️`,
        body: 'Renove seu PIX para não perder o acesso aos recursos Premium.',
        url: '/#/plans',
        tag: 'pix-warn',
      });
      pushedWarn += c;
    } catch (e) {
      console.error('push warn error', e);
    }

    warned++;
  }

  return json(200, { ok: true, downgraded, warned, pushedExpired, pushedWarn });
});
