import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function monthKey(d: string) {
  return d.slice(0, 7); // YYYY-MM
}

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

    // Pull data
    const [txRes, catRes, goalsRes, piggyRes, recRes, instRes] = await Promise.all([
      supabaseClient.from('transactions').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(1000),
      supabaseClient.from('categories').select('*').eq('user_id', user.id),
      supabaseClient.from('savings_goals').select('*').eq('user_id', user.id),
      supabaseClient.from('piggy_bank').select('*').eq('user_id', user.id),
      supabaseClient.from('recurring_transactions').select('*').eq('user_id', user.id),
      supabaseClient.from('installment_purchases').select('*').eq('user_id', user.id),
    ]);

    const transactions = txRes.data || [];
    const categories = catRes.data || [];
    const catMap: Record<string, any> = {};
    categories.forEach((c: any) => { catMap[c.id] = c; });

    // Aggregate last 12 months
    const now = new Date();
    const byMonth: Record<string, { income: number; expense: number; byCat: Record<string, number> }> = {};
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      byMonth[`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`] = { income: 0, expense: 0, byCat: {} };
    }
    transactions.forEach((t: any) => {
      const k = monthKey(t.date);
      if (!byMonth[k]) return;
      const amt = Number(t.amount);
      if (t.type === 'income') byMonth[k].income += amt;
      else {
        byMonth[k].expense += amt;
        const cname = catMap[t.category_id]?.name || 'Sem categoria';
        byMonth[k].byCat[cname] = (byMonth[k].byCat[cname] || 0) + amt;
      }
    });

    const compact = {
      monthly: byMonth,
      goals: (goalsRes.data || []).map((g: any) => ({
        name: g.name, target: g.target_amount, current: g.current_amount, deadline: g.deadline, done: g.is_completed,
      })),
      piggy: (piggyRes.data || []).map((p: any) => ({
        name: p.name, balance: p.balance, target: p.target_amount, yield: p.total_yield, cdi: p.cdi_rate_annual, currency: p.currency,
      })),
      recurring: (recRes.data || []).map((r: any) => ({
        description: r.description, amount: r.amount, type: r.type, frequency: r.frequency,
      })),
      installments: (instRes.data || []).map((i: any) => ({
        description: i.description, total: i.total_amount, installments: i.total_installments, paid: i.paid_installments,
      })),
    };

    const systemPrompt = `Você é o Finango IA, copiloto financeiro do usuário. Responda em português do Brasil, em tom acolhedor e prático.
Analise os dados e retorne APENAS JSON válido (sem markdown) com esta estrutura EXATA:

{
  "saudacao": "string (ex: 'Bom dia!' baseada na hora atual do Brasil)",
  "resumo_intro": "string curta (1-2 frases) contextualizando o momento financeiro",
  "diagnostico": {
    "positivos": [{"titulo": "string", "descricao": "string", "valor": "string opcional"}],
    "atencao": [{"titulo": "string", "descricao": "string", "valor": "string opcional"}]
  },
  "alertas": [{"tipo": "gasto_alto|assinatura|duplicado|parcela|saldo_negativo|categoria_cresceu", "titulo": "string", "descricao": "string", "severidade": "info|warning|critical"}],
  "recomendacoes": [{"acao": "string", "motivo": "string", "impacto": "string"}],
  "comparativos": {
    "3_meses": {"receita": number, "despesa": number, "economia": number},
    "6_meses": {"receita": number, "despesa": number, "economia": number},
    "12_meses": {"receita": number, "despesa": number, "economia": number}
  },
  "finango_score": {
    "pontuacao": number (0-100),
    "classificacao": "Excelente|Boa|Regular|Precisa Melhorar",
    "fatores": ["string", "string", "string"]
  },
  "metas_analise": [{"nome": "string", "progresso_percentual": number, "tempo_estimado": "string", "sugestao": "string"}],
  "previsao_mes": {
    "saldo_previsto": number,
    "economia_prevista": number,
    "proximos_vencimentos": [{"descricao": "string", "valor": number, "quando": "string"}],
    "maior_gasto_esperado": {"categoria": "string", "valor_estimado": number}
  },
  "assinaturas_detectadas": [{"descricao": "string", "valor": number, "frequencia": "string"}]
}

Regras:
- Use valores reais dos dados. Se algo estiver vazio, retorne arrays vazios.
- Score considera: organização (regularidade dos lançamentos), economia (receita - despesa), reserva (piggy), controle (variação de gastos), metas.
- Máximo 5 itens em cada array.
- Valores numéricos em reais (BRL).`;

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
          { role: 'user', content: `Dados financeiros:\n${JSON.stringify(compact)}` },
        ],
        response_format: { type: 'json_object' },
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
        return new Response(JSON.stringify({ error: 'Créditos de IA esgotados. Entre em contato com o suporte.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error('Erro ao consultar IA');
    }

    const aiData = await response.json();
    let content = aiData.choices?.[0]?.message?.content || '';
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    let report;
    try { report = JSON.parse(content); }
    catch { report = { error: 'Não foi possível processar o relatório', raw: content }; }

    return new Response(JSON.stringify(report), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: 'Erro interno ao processar sua solicitação' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
