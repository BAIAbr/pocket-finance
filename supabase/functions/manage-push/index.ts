import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function generateVapidKeys() {
  const keyPair = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify']
  );

  const publicKeyRaw = new Uint8Array(await crypto.subtle.exportKey('raw', keyPair.publicKey));
  const privateKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey);

  let binary = '';
  for (const byte of publicKeyRaw) binary += String.fromCharCode(byte);
  const publicKeyBase64 = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  return { publicKey: publicKeyBase64, privateKeyJwk: JSON.stringify(privateKeyJwk) };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    // Public endpoint: get VAPID public key
    if (action === 'get-vapid-key') {
      let { data: config } = await supabaseAdmin
        .from('app_config')
        .select('value')
        .eq('key', 'vapid_public_key')
        .single();

      if (!config) {
        const keys = await generateVapidKeys();
        await supabaseAdmin.from('app_config').insert([
          { key: 'vapid_public_key', value: keys.publicKey },
          { key: 'vapid_private_key_jwk', value: keys.privateKeyJwk },
        ]);
        config = { value: keys.publicKey };
      }

      return new Response(JSON.stringify({ publicKey: config.value }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Auth required for remaining actions
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'subscribe' && req.method === 'POST') {
      const { subscription } = await req.json();

      // SSRF guard: only accept HTTPS endpoints on known browser push services.
      // Prevents attackers from registering internal/metadata URLs that the
      // send-push-notifications function would otherwise dispatch to.
      const ALLOWED_HOSTS = [
        'fcm.googleapis.com',
        'updates.push.services.mozilla.com',
        'push.services.mozilla.com',
        'notify.windows.com',
        'wns2-by3p.notify.windows.com',
        'web.push.apple.com',
        'api.push.apple.com',
      ];

      let endpointUrl: URL;
      try {
        endpointUrl = new URL(subscription?.endpoint ?? '');
      } catch {
        return new Response(JSON.stringify({ error: 'Invalid endpoint URL' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const hostnameOk =
        endpointUrl.protocol === 'https:' &&
        ALLOWED_HOSTS.some(h => endpointUrl.hostname === h || endpointUrl.hostname.endsWith(`.${h}`));

      if (!hostnameOk) {
        return new Response(JSON.stringify({ error: 'Endpoint host not allowed' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (typeof subscription?.keys?.p256dh !== 'string' || typeof subscription?.keys?.auth !== 'string') {
        return new Response(JSON.stringify({ error: 'Missing subscription keys' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      await supabaseAdmin.from('push_subscriptions').upsert({
        user_id: user.id,
        endpoint: endpointUrl.toString(),
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      }, { onConflict: 'endpoint' });

      await supabaseAdmin.from('profiles')
        .update({ push_notifications_enabled: true })
        .eq('user_id', user.id);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'unsubscribe' && req.method === 'POST') {
      const { endpoint } = await req.json();

      await supabaseAdmin.from('push_subscriptions')
        .delete()
        .eq('user_id', user.id)
        .eq('endpoint', endpoint);

      await supabaseAdmin.from('profiles')
        .update({ push_notifications_enabled: false })
        .eq('user_id', user.id);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
