// Ad-hoc progressive throttle for VIP code redemption attempts.
// Backed by public.vip_redeem_throttle (service_role only).

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

// Failures allowed inside the rolling window before a block kicks in.
export const MAX_FAILURES = 5;
export const WINDOW_MS = 10 * 60_000; // 10 minutes

// Progressive block durations (seconds) per escalation level.
export const BLOCK_STEPS = [60, 5 * 60, 30 * 60, 2 * 60 * 60, 24 * 60 * 60];

export type ThrottleState = {
  blocked: boolean;
  retryAfterSeconds: number;
  blockedUntil: string | null;
  level: number;
  remainingAttempts: number;
};

type Row = {
  id: string;
  attempts: number;
  failures: number;
  window_started_at: string;
  block_level: number;
  blocked_until: string | null;
};

async function getRow(admin: SupabaseClient, identity: string): Promise<Row | null> {
  const { data } = await admin
    .from('vip_redeem_throttle')
    .select('id, attempts, failures, window_started_at, block_level, blocked_until')
    .eq('identity', identity)
    .maybeSingle();
  return (data as Row | null) ?? null;
}

/** Checks (and registers) an attempt. Returns the current throttle state. */
export async function checkThrottle(
  admin: SupabaseClient,
  identity: string,
  meta: { user_id?: string | null; ip?: string | null } = {},
): Promise<ThrottleState> {
  const now = new Date();
  const row = await getRow(admin, identity);

  if (!row) {
    await admin.from('vip_redeem_throttle').insert({
      identity,
      user_id: meta.user_id ?? null,
      ip: meta.ip ?? null,
      attempts: 1,
      failures: 0,
      window_started_at: now.toISOString(),
      last_attempt_at: now.toISOString(),
    });
    return { blocked: false, retryAfterSeconds: 0, blockedUntil: null, level: 0, remainingAttempts: MAX_FAILURES };
  }

  if (row.blocked_until && new Date(row.blocked_until) > now) {
    const retry = Math.ceil((new Date(row.blocked_until).getTime() - now.getTime()) / 1000);
    await admin
      .from('vip_redeem_throttle')
      .update({ attempts: row.attempts + 1, last_attempt_at: now.toISOString() })
      .eq('id', row.id);
    return {
      blocked: true,
      retryAfterSeconds: retry,
      blockedUntil: row.blocked_until,
      level: row.block_level,
      remainingAttempts: 0,
    };
  }

  // Window expired -> reset failure counter (block level decays one step).
  const windowExpired = now.getTime() - new Date(row.window_started_at).getTime() > WINDOW_MS;
  const failures = windowExpired ? 0 : row.failures;
  const level = windowExpired ? Math.max(0, row.block_level - 1) : row.block_level;

  await admin
    .from('vip_redeem_throttle')
    .update({
      attempts: row.attempts + 1,
      failures,
      block_level: level,
      blocked_until: null,
      window_started_at: windowExpired ? now.toISOString() : row.window_started_at,
      last_attempt_at: now.toISOString(),
      user_id: meta.user_id ?? null,
      ip: meta.ip ?? null,
    })
    .eq('id', row.id);

  return {
    blocked: false,
    retryAfterSeconds: 0,
    blockedUntil: null,
    level,
    remainingAttempts: Math.max(0, MAX_FAILURES - failures),
  };
}

/** Registers a failed redemption; escalates to a progressive block when needed. */
export async function registerFailure(admin: SupabaseClient, identity: string): Promise<ThrottleState> {
  const now = new Date();
  const row = await getRow(admin, identity);
  if (!row) {
    return { blocked: false, retryAfterSeconds: 0, blockedUntil: null, level: 0, remainingAttempts: MAX_FAILURES - 1 };
  }

  const failures = row.failures + 1;
  if (failures < MAX_FAILURES) {
    await admin.from('vip_redeem_throttle').update({ failures }).eq('id', row.id);
    return {
      blocked: false,
      retryAfterSeconds: 0,
      blockedUntil: null,
      level: row.block_level,
      remainingAttempts: MAX_FAILURES - failures,
    };
  }

  const level = Math.min(row.block_level + 1, BLOCK_STEPS.length);
  const seconds = BLOCK_STEPS[level - 1];
  const until = new Date(now.getTime() + seconds * 1000);
  await admin
    .from('vip_redeem_throttle')
    .update({
      failures: 0,
      block_level: level,
      blocked_until: until.toISOString(),
      window_started_at: now.toISOString(),
    })
    .eq('id', row.id);

  return {
    blocked: true,
    retryAfterSeconds: seconds,
    blockedUntil: until.toISOString(),
    level,
    remainingAttempts: 0,
  };
}

/** Clears counters after a successful redemption. */
export async function clearThrottle(admin: SupabaseClient, identity: string): Promise<void> {
  await admin
    .from('vip_redeem_throttle')
    .update({ failures: 0, block_level: 0, blocked_until: null, window_started_at: new Date().toISOString() })
    .eq('identity', identity);
}
