// Public endpoint that consumes a password-reset token created by an admin.
// Two modes (POST body):
//   { token }                  -> validate only (does not consume)
//   { token, password }        -> validate + update password + mark used
// The token plaintext is hashed (SHA-256) and matched against the stored hash.
// Never returns the user's email/identity; only ok/invalid.

import { createClient } from 'npm:@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
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

async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const token: string | undefined = body?.token;
    const password: string | undefined = body?.password;

    if (!token || typeof token !== 'string' || token.length < 32 || token.length > 256) {
      return json({ ok: false, error: 'Token inválido' }, 400);
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token_hash = await sha256Hex(token);

    // Cleanup: remove tokens that expired more than 7 days ago.
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    await admin.from('password_reset_tokens').delete().lt('expires_at', cutoff);

    const { data: row } = await admin
      .from('password_reset_tokens')
      .select('id, user_id, expires_at, used_at')
      .eq('token_hash', token_hash)
      .maybeSingle();

    if (!row) return json({ ok: false, error: 'Link inválido ou expirado' }, 400);
    if (row.used_at) return json({ ok: false, error: 'Link já utilizado' }, 400);
    if (new Date(row.expires_at).getTime() <= Date.now()) {
      return json({ ok: false, error: 'Link expirado' }, 400);
    }

    // Validate-only mode
    if (!password) return json({ ok: true, valid: true });

    if (!isStrongPassword(password)) {
      return json({ ok: false, error: 'Senha não atende aos requisitos mínimos' }, 400);
    }

    // Mark the token as used FIRST to make it single-use even if password update races.
    const { data: updated, error: markErr } = await admin
      .from('password_reset_tokens')
      .update({
        used_at: new Date().toISOString(),
        consumed_ip: getClientIp(req),
        consumed_user_agent: req.headers.get('user-agent'),
      })
      .eq('id', row.id)
      .is('used_at', null)
      .select('id')
      .maybeSingle();

    if (markErr || !updated) {
      return json({ ok: false, error: 'Link já utilizado' }, 400);
    }

    const { error: updErr } = await admin.auth.admin.updateUserById(row.user_id, { password });
    if (updErr) {
      // Rollback used_at so the user can retry with a different password.
      await admin
        .from('password_reset_tokens')
        .update({ used_at: null, consumed_ip: null, consumed_user_agent: null })
        .eq('id', row.id);
      return json({ ok: false, error: updErr.message }, 400);
    }

    // Revoke all existing sessions for the user.
    try {
      await admin.auth.admin.signOut(row.user_id, 'global');
    } catch (_) { /* noop */ }

    console.log(JSON.stringify({
      event: 'consume_reset_token',
      target_user_id: row.user_id,
      token_id: row.id,
      ip: getClientIp(req),
      user_agent: req.headers.get('user-agent'),
      at: new Date().toISOString(),
    }));

    return json({ ok: true });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
