// Admin-only: directly sets a TARGET user's password using the auth Admin API
// and revokes all of that target user's existing sessions.
//
// CRITICAL INVARIANTS:
//   1. The password is updated for the user_id provided in the request body.
//      We NEVER use the caller's session user id as the target.
//   2. updateUser() on the caller session is NEVER invoked here — only
//      admin.updateUserById(targetId, ...) with the service role client.
//   3. The caller must be authenticated AND have role 'admin'.
//   4. The caller cannot reset their own password through this endpoint
//      (forces them to use the standard "change my password" flow).

import { createClient } from 'npm:@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function isStrongPassword(p: string) {
  return (
    typeof p === 'string' &&
    p.length >= 8 &&
    /[A-Z]/.test(p) &&
    /[a-z]/.test(p) &&
    /\d/.test(p) &&
    /[!@#$%^&*(),.?":{}|<>]/.test(p)
  );
}

function getClientIp(req: Request): string | null {
  const h = req.headers;
  return (
    h.get('cf-connecting-ip') ||
    h.get('x-real-ip') ||
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    null
  );
}

function audit(payload: Record<string, unknown>) {
  console.log(JSON.stringify({ scope: 'admin_set_password', ...payload }));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const ip = getClientIp(req);
  const ua = req.headers.get('user-agent');
  const at = new Date().toISOString();

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      audit({ result: 'denied', reason: 'missing_auth', ip, at });
      return json({ error: 'Missing Authorization header' }, 401);
    }

    // Identify caller from their JWT — used ONLY for authorization checks.
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      audit({ result: 'denied', reason: 'invalid_session', ip, at });
      return json({ error: 'Invalid session' }, 401);
    }
    const callerId = userData.user.id;

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: roleRow } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', callerId)
      .eq('role', 'admin')
      .maybeSingle();
    if (!roleRow) {
      audit({ result: 'denied', reason: 'not_admin', caller: callerId, ip, at });
      return json({ error: 'Forbidden' }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const target_user_id: string | undefined = body?.user_id;
    const email: string | undefined = body?.email;
    const password: string | undefined = body?.password;

    if (!password || !isStrongPassword(password)) {
      audit({ result: 'denied', reason: 'weak_password', caller: callerId, ip, at });
      return json({ error: 'Senha não atende aos requisitos mínimos' }, 400);
    }

    // Resolve target user id from email if needed. We NEVER fall back to the
    // caller's id — if no target is given, the request fails.
    let targetId: string | undefined = target_user_id;
    if (targetId && !UUID_RE.test(targetId)) {
      audit({ result: 'denied', reason: 'invalid_uuid', caller: callerId, raw: targetId, ip, at });
      return json({ error: 'user_id inválido' }, 400);
    }
    if (!targetId && email) {
      const { data: prof } = await admin
        .from('profiles')
        .select('user_id')
        .eq('email', email.trim().toLowerCase())
        .maybeSingle();
      if (!prof) {
        audit({ result: 'denied', reason: 'email_not_found', caller: callerId, email, ip, at });
        return json({ error: 'Usuário não encontrado' }, 404);
      }
      targetId = prof.user_id as string;
    }
    if (!targetId) {
      audit({ result: 'denied', reason: 'missing_target', caller: callerId, ip, at });
      return json({ error: 'user_id ou email obrigatório' }, 400);
    }

    // Hard guard: refuse to reset the caller's own password through this admin
    // endpoint. This makes it impossible for a bug in the UI to silently change
    // the logged-in administrator's password.
    if (targetId === callerId) {
      audit({ result: 'denied', reason: 'self_target_blocked', caller: callerId, ip, at });
      return json({
        error: 'Não é permitido redefinir a própria senha por aqui. Use a opção "Trocar minha senha" no seu perfil.',
      }, 400);
    }

    // Verify the target actually exists before mutating anything.
    const { data: targetUser, error: getErr } = await admin.auth.admin.getUserById(targetId);
    if (getErr || !targetUser?.user) {
      audit({ result: 'denied', reason: 'target_not_found', caller: callerId, target: targetId, ip, at });
      return json({ error: 'Usuário alvo não encontrado' }, 404);
    }

    // Update password via Admin API — explicit target id, never the caller.
    const { error: updErr } = await admin.auth.admin.updateUserById(targetId, { password });
    if (updErr) {
      audit({ result: 'error', reason: 'update_failed', caller: callerId, target: targetId, message: updErr.message, ip, at });
      return json({ error: updErr.message }, 400);
    }

    // Revoke all existing sessions for the TARGET user only. The Admin signOut
    // API in supabase-js v2 expects a JWT, so we list and revoke sessions via
    // the REST endpoint directly to ensure only the target's sessions are killed.
    try {
      await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${targetId}/logout`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ scope: 'global' }),
      });
    } catch (_) {
      // Non-fatal — the password is already updated. Sessions will expire normally.
    }

    audit({
      result: 'success',
      caller: callerId,
      target: targetId,
      target_email: targetUser.user.email,
      ip, ua, at,
    });

    return json({
      ok: true,
      target_user_id: targetId,
      target_email: targetUser.user.email,
    });
  } catch (e) {
    audit({ result: 'error', reason: 'exception', message: (e as Error).message, ip, at });
    return json({ error: (e as Error).message }, 500);
  }
});
