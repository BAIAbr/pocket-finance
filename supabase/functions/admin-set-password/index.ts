// Admin-only: directly sets a user's password using the auth Admin API and
// revokes all of that user's existing sessions. The caller MUST be an admin
// (verified server-side via user_roles). The service role key never leaves
// the server.

import { createClient } from 'npm:@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Missing Authorization header' }, 401);

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: 'Invalid session' }, 401);

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: roleRow } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', userData.user.id)
      .eq('role', 'admin')
      .maybeSingle();
    if (!roleRow) return json({ error: 'Forbidden' }, 403);

    const body = await req.json().catch(() => ({}));
    const target_user_id: string | undefined = body?.user_id;
    const email: string | undefined = body?.email;
    const password: string | undefined = body?.password;

    if (!password || !isStrongPassword(password)) {
      return json({ error: 'Senha não atende aos requisitos mínimos' }, 400);
    }

    // Resolve target user id from email if needed
    let targetId = target_user_id;
    if (!targetId && email) {
      const { data: prof } = await admin
        .from('profiles')
        .select('user_id')
        .eq('email', email.trim().toLowerCase())
        .maybeSingle();
      if (!prof) return json({ error: 'Usuário não encontrado' }, 404);
      targetId = prof.user_id as string;
    }
    if (!targetId) return json({ error: 'user_id ou email obrigatório' }, 400);

    // Update password via Admin API (never touches auth tables directly).
    const { error: updErr } = await admin.auth.admin.updateUserById(targetId, { password });
    if (updErr) return json({ error: updErr.message }, 400);

    // Revoke all existing sessions for the user.
    try {
      await admin.auth.admin.signOut(targetId, 'global');
    } catch (_) {
      // signOut may not exist on older clients; fall back to noop
    }

    // Audit log
    console.log(JSON.stringify({
      event: 'admin_set_password',
      admin_user_id: userData.user.id,
      target_user_id: targetId,
      ip: getClientIp(req),
      user_agent: req.headers.get('user-agent'),
      at: new Date().toISOString(),
    }));

    return json({ ok: true });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
