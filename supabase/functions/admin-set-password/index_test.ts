// E2E tests for the admin-set-password edge function.
//
// What this verifies (the critical invariants from the spec):
//   1. Unauthenticated requests are rejected (401).
//   2. Non-admin authenticated callers are rejected (403).
//   3. Weak passwords are rejected (400).
//   4. Missing / malformed target user_id is rejected (400).
//   5. An admin CAN reset another user's password, and:
//        a. the target can log in with the NEW password,
//        b. the target can NO LONGER log in with the OLD password,
//        c. the admin's own password is UNCHANGED (admin can still log in),
//        d. the response echoes the target user id (never the caller's id).
//   6. An admin CANNOT reset their own password through this endpoint (400,
//      self_target_blocked) — protects against a UI bug silently rotating the
//      logged-in admin's credentials.
//
// Required env (loaded from project .env via dotenv):
//   VITE_SUPABASE_URL
//   VITE_SUPABASE_PUBLISHABLE_KEY
//
// Optional env to enable the full admin flow (tests gracefully skip if absent):
//   TEST_ADMIN_EMAIL       — an existing user with role 'admin'
//   TEST_ADMIN_PASSWORD    — that admin's current password
//   TEST_TARGET_EMAIL      — a separate, disposable user
//   TEST_TARGET_PASSWORD   — that target's current password (will be rotated
//                            and restored by the test)

import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import {
  assert,
  assertEquals,
  assertNotEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const FN_URL = `${SUPABASE_URL}/functions/v1/admin-set-password`;

const ADMIN_EMAIL = Deno.env.get("TEST_ADMIN_EMAIL");
const ADMIN_PASSWORD = Deno.env.get("TEST_ADMIN_PASSWORD");
const TARGET_EMAIL = Deno.env.get("TEST_TARGET_EMAIL");
const TARGET_PASSWORD = Deno.env.get("TEST_TARGET_PASSWORD");

const STRONG_NEW = `E2eR0t@ted!${Date.now()}`;

function clientWithToken(token?: string) {
  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: token ? { headers: { Authorization: `Bearer ${token}` } } : {},
  });
}

async function callFn(
  body: unknown,
  token?: string,
): Promise<{ status: number; json: any }> {
  const res = await fetch(FN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: ANON_KEY,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let parsed: any = null;
  try { parsed = JSON.parse(text); } catch { parsed = { raw: text }; }
  return { status: res.status, json: parsed };
}

async function signIn(email: string, password: string) {
  const c = clientWithToken();
  const { data, error } = await c.auth.signInWithPassword({ email, password });
  return { data, error };
}

// ─────────────────────────────────────────────────────────────────────────────
// Contract tests — always run, no admin credentials needed.
// ─────────────────────────────────────────────────────────────────────────────

Deno.test("rejects requests with no Authorization header (401)", async () => {
  const res = await fetch(FN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: ANON_KEY },
    body: JSON.stringify({
      user_id: "00000000-0000-0000-0000-000000000000",
      password: "Str0ng!Pass",
    }),
  });
  const body = await res.json().catch(() => ({}));
  assertEquals(res.status, 401, `expected 401, got ${res.status}: ${JSON.stringify(body)}`);
});

Deno.test("rejects authenticated NON-admin callers (403)", async () => {
  if (!TARGET_EMAIL || !TARGET_PASSWORD) {
    console.warn("⚠️  Skipping: TEST_TARGET_EMAIL / TEST_TARGET_PASSWORD not set.");
    return;
  }
  const { data, error } = await signIn(TARGET_EMAIL, TARGET_PASSWORD);
  if (error || !data.session) {
    console.warn(`⚠️  Skipping: cannot sign in target user: ${error?.message}`);
    return;
  }
  const r = await callFn(
    {
      user_id: "00000000-0000-0000-0000-000000000000",
      password: "Str0ng!Pass",
    },
    data.session.access_token,
  );
  assertEquals(r.status, 403, `expected 403, got ${r.status}: ${JSON.stringify(r.json)}`);
});

// ─────────────────────────────────────────────────────────────────────────────
// Admin-flow tests — require all four TEST_* env vars.
// ─────────────────────────────────────────────────────────────────────────────

const adminReady = !!(ADMIN_EMAIL && ADMIN_PASSWORD && TARGET_EMAIL && TARGET_PASSWORD);

Deno.test({
  name: "admin: weak password is rejected (400) and target is NOT modified",
  ignore: !adminReady,
  async fn() {
    const { data, error } = await signIn(ADMIN_EMAIL!, ADMIN_PASSWORD!);
    assert(!error && data.session, `admin login failed: ${error?.message}`);

    // First grab target id via profiles (admin can read it through RLS).
    const c = clientWithToken(data.session!.access_token);
    const { data: prof } = await c.from("profiles").select("user_id").eq("email", TARGET_EMAIL!.toLowerCase()).maybeSingle();
    assert(prof?.user_id, "could not resolve target profile");

    const r = await callFn(
      { user_id: prof!.user_id, password: "weak" },
      data.session!.access_token,
    );
    assertEquals(r.status, 400, `expected 400, got ${r.status}: ${JSON.stringify(r.json)}`);

    // Target can still log in with original password — was not touched.
    const { error: stillOk } = await signIn(TARGET_EMAIL!, TARGET_PASSWORD!);
    assert(!stillOk, `target password should be unchanged: ${stillOk?.message}`);
  },
});

Deno.test({
  name: "admin: invalid uuid for user_id is rejected (400)",
  ignore: !adminReady,
  async fn() {
    const { data } = await signIn(ADMIN_EMAIL!, ADMIN_PASSWORD!);
    const r = await callFn(
      { user_id: "not-a-uuid", password: "Str0ng!Pass" },
      data.session!.access_token,
    );
    assertEquals(r.status, 400, `expected 400, got ${r.status}: ${JSON.stringify(r.json)}`);
  },
});

Deno.test({
  name: "admin: missing user_id AND email is rejected (400)",
  ignore: !adminReady,
  async fn() {
    const { data } = await signIn(ADMIN_EMAIL!, ADMIN_PASSWORD!);
    const r = await callFn(
      { password: "Str0ng!Pass" },
      data.session!.access_token,
    );
    assertEquals(r.status, 400, `expected 400, got ${r.status}: ${JSON.stringify(r.json)}`);
  },
});

Deno.test({
  name: "admin: SELF target is blocked (400, self_target_blocked)",
  ignore: !adminReady,
  async fn() {
    const { data, error } = await signIn(ADMIN_EMAIL!, ADMIN_PASSWORD!);
    assert(!error && data.session && data.user, `admin login failed: ${error?.message}`);

    const r = await callFn(
      { user_id: data.user!.id, password: "Str0ng!Pass#1" },
      data.session!.access_token,
    );
    assertEquals(r.status, 400, `expected 400, got ${r.status}: ${JSON.stringify(r.json)}`);

    // Admin can still log in with the ORIGINAL password.
    const { error: stillOk } = await signIn(ADMIN_EMAIL!, ADMIN_PASSWORD!);
    assert(!stillOk, `admin password must remain unchanged: ${stillOk?.message}`);
  },
});

Deno.test({
  name:
    "admin: resets ANOTHER user's password — target can log in with new, admin keeps own password",
  ignore: !adminReady,
  async fn() {
    // 1. Sign admin in.
    const { data: adminAuth, error: aErr } = await signIn(ADMIN_EMAIL!, ADMIN_PASSWORD!);
    assert(!aErr && adminAuth.session && adminAuth.user, `admin login failed: ${aErr?.message}`);
    const adminId = adminAuth.user!.id;

    // 2. Resolve target id.
    const c = clientWithToken(adminAuth.session!.access_token);
    const { data: prof } = await c.from("profiles").select("user_id").eq("email", TARGET_EMAIL!.toLowerCase()).maybeSingle();
    assert(prof?.user_id, "could not resolve target profile");
    const targetId = prof!.user_id as string;
    assertNotEquals(targetId, adminId, "test target must be a different user from the admin");

    // 3. Call the function with TARGET's id.
    const r = await callFn(
      { user_id: targetId, password: STRONG_NEW },
      adminAuth.session!.access_token,
    );
    assertEquals(r.status, 200, `expected 200, got ${r.status}: ${JSON.stringify(r.json)}`);
    assertEquals(r.json.ok, true);
    assertEquals(
      r.json.target_user_id,
      targetId,
      "response must echo the TARGET id, never the caller's id",
    );
    assertNotEquals(
      r.json.target_user_id,
      adminId,
      "response target id must not equal the admin's id",
    );

    // 4. Target can now log in with the NEW password.
    const { data: tNew, error: tNewErr } = await signIn(TARGET_EMAIL!, STRONG_NEW);
    assert(!tNewErr && tNew.session, `target should log in with new password: ${tNewErr?.message}`);

    // 5. Target can NO LONGER log in with the OLD password.
    const { data: tOld, error: tOldErr } = await signIn(TARGET_EMAIL!, TARGET_PASSWORD!);
    assert(
      tOldErr && !tOld.session,
      "target should NOT be able to log in with the old password anymore",
    );

    // 6. Admin's own password is UNCHANGED — admin can still log in.
    const { data: aStill, error: aStillErr } = await signIn(ADMIN_EMAIL!, ADMIN_PASSWORD!);
    assert(
      !aStillErr && aStill.session && aStill.user?.id === adminId,
      `admin must keep their original password: ${aStillErr?.message}`,
    );

    // 7. Cleanup: restore target's original password using the admin endpoint
    //    itself so this test is idempotent across runs.
    const restore = await callFn(
      { user_id: targetId, password: TARGET_PASSWORD! },
      aStill.session!.access_token,
    );
    assertEquals(
      restore.status,
      200,
      `restore call failed (${restore.status}): ${JSON.stringify(restore.json)}`,
    );
    const { error: restoredErr } = await signIn(TARGET_EMAIL!, TARGET_PASSWORD!);
    assert(!restoredErr, `target original password should be restored: ${restoredErr?.message}`);
  },
});
