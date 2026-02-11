import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Set 'inativo' for users with last login > 30 days ago
    await supabaseClient
      .from('user_analytics')
      .update({ status_usuario: 'inativo' })
      .lt('last_login_at', thirtyDaysAgo);

    // Set 'em_risco' for users with last login between 8-30 days
    await supabaseClient
      .from('user_analytics')
      .update({ status_usuario: 'em_risco' })
      .gte('last_login_at', thirtyDaysAgo)
      .lt('last_login_at', sevenDaysAgo);

    // Set 'ativo' for users with last login in last 7 days
    await supabaseClient
      .from('user_analytics')
      .update({ status_usuario: 'ativo' })
      .gte('last_login_at', sevenDaysAgo);

    // Handle users who never logged in
    await supabaseClient
      .from('user_analytics')
      .update({ status_usuario: 'inativo' })
      .is('last_login_at', null);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: 'Erro interno' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
