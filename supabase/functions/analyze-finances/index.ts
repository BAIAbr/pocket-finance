import "https://deno.land/x/xhr@0.1.0/mod.ts";
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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch transactions with categories
    const { data: transactions, error: txError } = await supabaseClient
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false });

    if (txError) throw txError;

    const { data: categories } = await supabaseClient
      .from('categories')
      .select('*')
      .eq('user_id', user.id);

    const categoryMap: Record<string, string> = {};
    (categories || []).forEach((c: any) => {
      categoryMap[c.id] = c.name;
    });

    // Prepare transaction data for AI
    const txSummary = (transactions || []).map((t: any) => ({
      description: t.description || 'Sem descrição',
      amount: t.amount,
      type: t.type,
      date: t.date,
      category: categoryMap[t.category_id] || 'Sem categoria',
    }));

    const systemPrompt = `Você é o assistente financeiro do aplicativo Finango. Analise as transações e gere um relatório em JSON com a seguinte estrutura EXATA (sem markdown, apenas JSON puro):

{
  "gastos_fixos": {
    "items": [{"nome": "string", "valor_medio": number, "frequencia": "string"}],
    "total_mensal": number,
    "percentual_renda": number
  },
  "gastos_variaveis": {
    "items": [{"categoria": "string", "total": number, "variacao_percentual": number}],
    "total_periodo": number
  },
  "recorrentes": {
    "items": [{"servico": "string", "valor_medio": number, "frequencia": "string"}],
    "alertas": ["string"]
  },
  "resumo": {
    "total_fixos": number,
    "total_variaveis": number,
    "total_geral": number,
    "renda_total": number
  },
  "insights": ["string"]
}

Use linguagem simples e amigável. Os insights devem ser curtos e práticos. Se não houver dados suficientes, preencha com valores zerados e adicione um insight explicando.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Aqui estão as transações do usuário:\n${JSON.stringify(txSummary, null, 2)}` },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('AI Gateway error:', errText);
      throw new Error('Erro ao consultar IA');
    }

    const aiData = await response.json();
    let content = aiData.choices?.[0]?.message?.content || '';
    
    // Clean markdown code blocks if present
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    let report;
    try {
      report = JSON.parse(content);
    } catch {
      report = { error: 'Não foi possível processar o relatório', raw: content };
    }

    return new Response(JSON.stringify(report), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
