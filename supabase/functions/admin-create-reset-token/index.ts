// Admin-only: generates a single-use password-reset token, stores only its
// SHA-256 hash in `password_reset_tokens`, and returns the plaintext token
// to the calling admin so they can hand-deliver the link (WhatsApp, etc.).
// No e-mail is ever sent.

import { createClient } from 'npm:@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const TTL_MINUTES = 30;
// Throttle: max 5 active (unused, unexpired) tokens per target user.
const MAX_ACTIVE_TOKENS = 5;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
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

function toBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
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
    const baseUrl: string =
      typeof body?.baseUrl === 'string' && body.baseUrl.startsWith('http')
        ? body.baseUrl.replace(/\/+$/, '')
        : 'https://finango.online';

    let target_user_id: string | undefined = body?.user_id;
    const email: string | undefined = body?.email;

    if (!target_user_id && email) {
      const { data: prof } = await admin
        .from('profiles')
        .select('user_id, email')
        .eq('email', email.trim().toLowerCase())
        .maybeSingle();
      if (!prof) return json({ error: 'Usuário não encontrado' }, 404);
      target_user_id = prof.user_id as string;
    }
    if (!target_user_id) return json({ error: 'user_id ou email obrigatório' }, 400);

    // Housekeeping: delete tokens that already expired (any user).
    await admin.from('password_reset_tokens').delete().lt('expires_at', new Date().toISOString());

    // Rate-limit: how many active tokens does this user have?
    const { count: activeCount } = await admin
      .from('password_reset_tokens')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', target_user_id)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString());
    if ((activeCount ?? 0) >= MAX_ACTIVE_TOKENS) {
      return json({ error: 'Muitos links ativos para este usuário. Aguarde expirarem.' }, 429);
    }

    // Generate 64 random bytes via WebCrypto -> base64url ~ 86 chars.
    const raw = new Uint8Array(64);
    crypto.getRandomValues(raw);
    const token = toBase64Url(raw);
    const token_hash = await sha256Hex(token);

    const now = new Date();
    const expires_at = new Date(now.getTime() + TTL_MINUTES * 60 * 1000);

    const { error: insErr } = await admin.from('password_reset_tokens').insert({
      user_id: target_user_id,
      token_hash,
      expires_at: expires_at.toISOString(),
      created_by: userData.user.id,
      ip: getClientIp(req),
      user_agent: req.headers.get('user-agent'),
    });
    if (insErr) return json({ error: insErr.message }, 500);

    // HashRouter: link must be /#/redefinir-senha?token=...
    const action_link = `${baseUrl}/#/redefinir-senha?token=${token}`;

    console.log(JSON.stringify({
      event: 'admin_create_reset_token',
      admin_user_id: userData.user.id,
      target_user_id,
      ip: getClientIp(req),
      user_agent: req.headers.get('user-agent'),
      at: now.toISOString(),
      expires_at: expires_at.toISOString(),
    }));

    return json({
      action_link,
      expires_at: expires_at.toISOString(),
      ttl_seconds: TTL_MINUTES * 60,
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
