import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatMessage { role: 'user' | 'assistant' | 'system'; content: string; }

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    const noStream = url.searchParams.get('stream') === 'false';
    const { messages }: { messages: ChatMessage[] } = await req.json();

    // Fetch user financial data (compact payload for speed)
    const [txRes, catRes, piggyRes, goalsRes, recRes] = await Promise.all([
      supabaseClient.from('transactions').select('date,type,amount,category_id,description').eq('user_id', user.id).order('date', { ascending: false }).limit(120),
      supabaseClient.from('categories').select('id,name,type').eq('user_id', user.id),
      supabaseClient.from('piggy_bank').select('name,balance,target_amount,total_yield,currency').eq('user_id', user.id),
      supabaseClient.from('savings_goals').select('name,target_amount,current_amount,deadline,is_completed').eq('user_id', user.id),
      supabaseClient.from('recurring_transactions').select('description,amount,type,frequency').eq('user_id', user.id),
    ]);

    const catMap: Record<string, string> = {};
    (catRes.data || []).forEach((c: any) => { catMap[c.id] = c.name; });

    const financialContext = {
      transacoes_recentes: (txRes.data || []).map((t: any) => ({
        data: t.date, tipo: t.type, valor: Number(t.amount),
        categoria: catMap[t.category_id] || 'Sem categoria',
        descricao: t.description,
      })),
      cofrinhos: piggyRes.data || [],
      metas: goalsRes.data || [],
      recorrentes: recRes.data || [],
    };

    const systemPrompt = `Você é o Finango IA, assistente financeiro pessoal e amigável do usuário no app Finango.
Responda em português do Brasil, de forma clara, direta e acolhedora. Use os dados financeiros REAIS do usuário fornecidos abaixo.
Seja conciso: respostas curtas e diretas ao ponto (máximo 6 linhas quando possível).
Formate valores em R$ (ex: R$ 1.234,56). Use markdown quando ajudar a leitura.
Não invente dados. Não fale de outros usuários.

Dados financeiros do usuário:
${JSON.stringify(financialContext)}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        stream: !noStream,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('AI Gateway error:', response.status, errText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Muitas requisições. Tente novamente em alguns instantes.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Créditos de IA esgotados.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error('Erro ao consultar IA');
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: 'Erro interno' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
