// Shared Web Push helpers (VAPID + aes128gcm). Reused across edge functions.

function base64UrlToBuffer(b64: string): Uint8Array {
  const base64 = b64.replace(/-/g, '+').replace(/_/g, '/');
  const pad = '='.repeat((4 - (base64.length % 4)) % 4);
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

  const localKP = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const localPubRaw = new Uint8Array(await crypto.subtle.exportKey('raw', localKP.publicKey));
  const subscriberKey = await crypto.subtle.importKey('raw', subscriberPubRaw, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const sharedSecret = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: subscriberKey }, localKP.privateKey, 256));

  const keyInfo = concat(new TextEncoder().encode('WebPush: info\0'), subscriberPubRaw, localPubRaw);
  const prk = await hkdfExtract(subscriberAuth, sharedSecret);
  const ikm = await hkdfExpand(prk, keyInfo, 32);

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const contentPrk = await hkdfExtract(salt, ikm);
  const cek = await hkdfExpand(contentPrk, new TextEncoder().encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdfExpand(contentPrk, new TextEncoder().encode('Content-Encoding: nonce\0'), 12);

  const paddedPayload = concat(payloadBytes, new Uint8Array([2]));
  const encKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, encKey, paddedPayload));

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

export interface PushSubscriptionRow {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

async function sendOne(sub: PushSubscriptionRow, payloadJson: string, privJwk: JsonWebKey, pubB64: string) {
  try {
    const body = await encryptPayload(sub.p256dh, sub.auth, payloadJson);
    const authorization = await createVapidAuth(sub.endpoint, privJwk, pubB64);
    const res = await fetch(sub.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        Authorization: authorization,
        TTL: '86400',
        Urgency: 'normal',
      },
      body,
    });
    return res.status >= 200 && res.status < 300;
  } catch (e) {
    console.error('push send error', e);
    return false;
  }
}

/** Sends a push notification to every registered device of a user. Returns count sent. */
export async function sendPushToUser(
  supabase: any,
  userId: string,
  payload: PushPayload,
): Promise<number> {
  const [{ data: pub }, { data: priv }] = await Promise.all([
    supabase.from('app_config').select('value').eq('key', 'vapid_public_key').single(),
    supabase.from('app_config').select('value').eq('key', 'vapid_private_key_jwk').single(),
  ]);
  if (!pub || !priv) return 0;

  const pubB64 = pub.value as string;
  const privJwk = JSON.parse(priv.value as string) as JsonWebKey;

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', userId);

  if (!subs || subs.length === 0) return 0;

  const json = JSON.stringify(payload);
  let sent = 0;
  for (const s of subs as PushSubscriptionRow[]) {
    if (await sendOne(s, json, privJwk, pubB64)) sent++;
  }
  return sent;
}
