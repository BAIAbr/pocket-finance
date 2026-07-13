// Shared helper for writing to public.subscription_logs
import { SupabaseClient } from 'npm:@supabase/supabase-js@2';

export async function logSubscriptionEvent(
  admin: SupabaseClient,
  args: {
    user_id: string | null;
    subscription_id?: string | null;
    plan_code?: string | null;
    event_type: string;
    source: string;
    payload?: Record<string, unknown>;
  },
) {
  try {
    await admin.from('subscription_logs').insert({
      user_id: args.user_id,
      subscription_id: args.subscription_id ?? null,
      plan_code: args.plan_code ?? null,
      event_type: args.event_type,
      source: args.source,
      payload: args.payload ?? {},
    });
  } catch (e) {
    console.warn('logSubscriptionEvent failed', e);
  }
}
