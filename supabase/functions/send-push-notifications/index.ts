import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ─── Web Push Crypto Helpers ───

function base64UrlToBuffer(b64: string): Uint8Array {
  const base64 = b64.replace(/-/g, '+').replace(/_/g, '/');
  const pad = '='.repeat((4 - base64.length % 4) % 4);
  const raw = atob(base64 + pad);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

function bufferToBase64Url(buf: ArrayBuffer | Uint8Array): string {
  const arr = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let str = '';
  for (const b of arr) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function concat(...arrays: Uint8Array[]): Uint8Array {
  const len = arrays.reduce((a, b) => a + b.length, 0);
  const result = new Uint8Array(len);
  let offset = 0;
  for (const a of arrays) { result.set(a, offset); offset += a.length; }
  return result;
}

async function hmacSha256(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, data));
}

async function hkdfExtract(salt: Uint8Array, ikm: Uint8Array): Promise<Uint8Array> {
  return hmacSha256(salt.length ? salt : new Uint8Array(32), ikm);
}

async function hkdfExpand(prk: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  let prev = new Uint8Array(0);
  let okm = new Uint8Array(0);
  for (let i = 1; okm.length < length; i++) {
    prev = await hmacSha256(prk, concat(prev, info, new Uint8Array([i])));
    okm = concat(okm, prev);
  }
  return okm.slice(0, length);
}

async function encryptPayload(p256dhB64: string, authB64: string, payload: string) {
  const subscriberPubRaw = base64UrlToBuffer(p256dhB64);
  const subscriberAuth = base64UrlToBuffer(authB64);
  const payloadBytes = new TextEncoder().encode(payload);

  // Generate local ECDH key pair
  const localKP = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const localPubRaw = new Uint8Array(await crypto.subtle.exportKey('raw', localKP.publicKey));

  // Import subscriber public key for ECDH
  const subscriberKey = await crypto.subtle.importKey('raw', subscriberPubRaw, { name: 'ECDH', namedCurve: 'P-256' }, false, []);

  // Shared secret
  const sharedSecret = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: subscriberKey }, localKP.privateKey, 256));

  // RFC 8291 key derivation
  const keyInfo = concat(new TextEncoder().encode('WebPush: info\0'), subscriberPubRaw, localPubRaw);
  const prk = await hkdfExtract(subscriberAuth, sharedSecret);
  const ikm = await hkdfExpand(prk, keyInfo, 32);

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const contentPrk = await hkdfExtract(salt, ikm);
  const cek = await hkdfExpand(contentPrk, new TextEncoder().encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdfExpand(contentPrk, new TextEncoder().encode('Content-Encoding: nonce\0'), 12);

  // Encrypt with AES-128-GCM (add delimiter byte 0x02)
  const paddedPayload = concat(payloadBytes, new Uint8Array([2]));
  const encKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, encKey, paddedPayload));

  // aes128gcm content coding: salt(16) + rs(4) + idlen(1) + keyid(65) + ciphertext
  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096);

  return concat(salt, rs, new Uint8Array([65]), localPubRaw, encrypted);
}

async function createVapidAuth(endpoint: string, privateKeyJwk: JsonWebKey, publicKeyB64: string) {
  const aud = new URL(endpoint);
  const audience = `${aud.protocol}//${aud.host}`;
  const now = Math.floor(Date.now() / 1000);

  const header = bufferToBase64Url(new TextEncoder().encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const payload = bufferToBase64Url(new TextEncoder().encode(JSON.stringify({ aud: audience, exp: now + 43200, sub: 'mailto:finangobr@gmail.com' })));

  const unsignedToken = `${header}.${payload}`;
  const privKey = await crypto.subtle.importKey('jwk', privateKeyJwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, privKey, new TextEncoder().encode(unsignedToken));

  return `vapid t=${unsignedToken}.${bufferToBase64Url(sig)},k=${publicKeyB64}`;
}

async function sendPush(endpoint: string, p256dh: string, auth: string, payload: string, vapidPrivKeyJwk: JsonWebKey, vapidPubB64: string): Promise<boolean> {
  try {
    const body = await encryptPayload(p256dh, auth, payload);
    const authorization = await createVapidAuth(endpoint, vapidPrivKeyJwk, vapidPubB64);

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'Authorization': authorization,
        'TTL': '86400',
        'Urgency': 'normal',
      },
      body,
    });

    console.log(`Push to ${endpoint.slice(0, 60)}... status: ${res.status}`);
    return res.status >= 200 && res.status < 300;
  } catch (e) {
    console.error('Push send error:', e);
    return false;
  }
}

// ─── Notification Messages ───

interface NotificationLevel {
  level: number;
  days: number;
  title: string;
  body: string;
}

const NOTIFICATION_LEVELS: NotificationLevel[] = [
  { level: 1, days: 3, title: 'Finango 👀', body: 'Você ficou 3 dias sem registrar seus gastos. Quer continuar no controle?' },
  { level: 2, days: 7, title: 'Finango ⚠️', body: 'Seu orçamento pode estar fugindo do controle. Dá uma olhada rápida hoje.' },
  { level: 3, days: 15, title: 'Finango 🔴', body: 'Faz 15 dias desde seu último acesso. Ainda quer melhorar sua vida financeira este mês?' },
  { level: 4, days: 30, title: 'Finango 💙', body: 'Sentimos sua falta no Finango. Seu progresso ainda está salvo. Volte quando quiser.' },
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get VAPID keys
    const { data: vapidPub } = await supabase.from('app_config').select('value').eq('key', 'vapid_public_key').single();
    const { data: vapidPriv } = await supabase.from('app_config').select('value').eq('key', 'vapid_private_key_jwk').single();

    if (!vapidPub || !vapidPriv) {
      return new Response(JSON.stringify({ error: 'VAPID keys not configured. Call manage-push?action=get-vapid-key first.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const vapidPublicKey = vapidPub.value;
    const vapidPrivateKeyJwk = JSON.parse(vapidPriv.value) as JsonWebKey;

    // Get all users with push notifications enabled and their analytics
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, name, email, push_notifications_enabled')
      .eq('push_notifications_enabled', true);

    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ message: 'No users with push enabled', sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userIds = profiles.map(p => p.user_id);

    // Get analytics for these users
    const { data: analytics } = await supabase
      .from('user_analytics')
      .select('user_id, last_login_at')
      .in('user_id', userIds);

    // Get push subscriptions
    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('*')
      .in('user_id', userIds);

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ message: 'No push subscriptions', sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get recent notifications to avoid spam (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentNotifs } = await supabase
      .from('notifications_log')
      .select('user_id, notification_level, sent_at')
      .gte('sent_at', sevenDaysAgo);

    const recentNotifMap = new Map<string, Set<number>>();
    (recentNotifs || []).forEach(n => {
      if (!recentNotifMap.has(n.user_id)) recentNotifMap.set(n.user_id, new Set());
      recentNotifMap.get(n.user_id)!.add(n.notification_level);
    });

    // Check if user had any notification in the last 7 days
    const recentAnySent = new Map<string, boolean>();
    (recentNotifs || []).forEach(n => {
      recentAnySent.set(n.user_id, true);
    });

    const analyticsMap = new Map<string, string | null>();
    (analytics || []).forEach(a => analyticsMap.set(a.user_id, a.last_login_at));

    const subsByUser = new Map<string, typeof subscriptions>();
    subscriptions.forEach(s => {
      if (!subsByUser.has(s.user_id)) subsByUser.set(s.user_id, []);
      subsByUser.get(s.user_id)!.push(s);
    });

    let totalSent = 0;
    const now = Date.now();

    // Try to get personalized data for each user
    for (const profile of profiles) {
      const userId = profile.user_id;
      const lastLogin = analyticsMap.get(userId);
      const userSubs = subsByUser.get(userId);

      if (!userSubs || !lastLogin) continue;

      // Max 1 notification per week per user
      if (recentAnySent.get(userId)) continue;

      const daysSinceLogin = Math.floor((now - new Date(lastLogin).getTime()) / (1000 * 60 * 60 * 24));

      // Find the appropriate notification level
      let matchedLevel: NotificationLevel | null = null;
      for (let i = NOTIFICATION_LEVELS.length - 1; i >= 0; i--) {
        const level = NOTIFICATION_LEVELS[i];
        if (daysSinceLogin >= level.days) {
          // Check if this level was already sent
          const sentLevels = recentNotifMap.get(userId);
          if (!sentLevels?.has(level.level)) {
            matchedLevel = level;
          }
          break;
        }
      }

      if (!matchedLevel) continue;

      // Try to personalize the message
      let personalizedBody = matchedLevel.body;

      try {
        // Check for active savings goals
        const { data: goals } = await supabase
          .from('savings_goals')
          .select('name')
          .eq('user_id', userId)
          .eq('is_completed', false)
          .limit(1);

        if (goals && goals.length > 0) {
          personalizedBody = `Sua meta "${goals[0].name}" ainda está ativa. Falta pouco para avançar! 🎯`;
        }
      } catch (e) {
        // Use default message
      }

      const pushPayload = JSON.stringify({
        title: matchedLevel.title,
        body: personalizedBody,
        url: '/',
        tag: `finango-level-${matchedLevel.level}`,
      });

      // Send to all user subscriptions
      for (const sub of userSubs) {
        const success = await sendPush(
          sub.endpoint, sub.p256dh, sub.auth,
          pushPayload, vapidPrivateKeyJwk, vapidPublicKey
        );

        // Log the notification
        await supabase.from('notifications_log').insert({
          user_id: userId,
          notification_level: matchedLevel.level,
          message: personalizedBody,
          status: success ? 'sent' : 'failed',
        });

        if (success) totalSent++;

        // Remove invalid subscriptions (410 Gone)
        if (!success) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id);
        }
      }
    }

    console.log(`Push notifications sent: ${totalSent}`);
    return new Response(JSON.stringify({ success: true, sent: totalSent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
