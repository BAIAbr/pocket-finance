import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = userData.user.id;

    const body = await req.json();
    const action = body?.action as string;
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    if (action === 'award_mission') {
      const missionKey = body?.mission_key;
      if (typeof missionKey !== 'string' || !missionKey) {
        return new Response(JSON.stringify({ error: 'invalid_mission_key' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const { data, error } = await admin.schema('private' as any).rpc('award_mission', {
        p_user_id: userId, p_mission_key: missionKey,
      });
      if (error) throw error;
      return new Response(JSON.stringify({ result: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'update_weekly_progress') {
      const missionId = body?.mission_id;
      const newValue = body?.new_value;
      if (typeof missionId !== 'string' || typeof newValue !== 'number') {
        return new Response(JSON.stringify({ error: 'invalid_input' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const { data, error } = await admin.schema('private' as any).rpc('update_weekly_mission_progress', {
        p_user_id: userId, p_mission_id: missionId, p_new_value: newValue,
      });
      if (error) throw error;
      return new Response(JSON.stringify({ result: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'unknown_action' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'action_failed' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
