import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    // Check if user already has active weekly missions
    const now = new Date();
    const { data: existingMissions } = await supabase
      .from("weekly_missions")
      .select("*")
      .eq("user_id", user.id)
      .gte("expires_at", now.toISOString());

    if (existingMissions && existingMissions.length >= 3) {
      return new Response(JSON.stringify({ missions: existingMissions, message: "Missões da semana já existem" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch user financial context
    const [transRes, goalsRes, piggyRes, analyticsRes] = await Promise.all([
      supabase.from("transactions").select("type, amount, date").eq("user_id", user.id).order("date", { ascending: false }).limit(50),
      supabase.from("savings_goals").select("*").eq("user_id", user.id),
      supabase.from("piggy_bank").select("*").eq("user_id", user.id),
      supabase.from("user_analytics").select("current_streak").eq("user_id", user.id).maybeSingle(),
    ]);

    const transactions = transRes.data || [];
    const incomeCount = transactions.filter(t => t.type === "income").length;
    const expenseCount = transactions.filter(t => t.type === "expense").length;
    const totalTransactions = transactions.length;
    const streak = analyticsRes.data?.current_streak || 0;
    const goalsCount = goalsRes.data?.length || 0;
    const piggyCount = piggyRes.data?.length || 0;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const prompt = `Você é um assistente de gamificação financeira. Gere exatamente 3 missões semanais personalizadas para o usuário.

Contexto do usuário:
- Total de transações recentes: ${totalTransactions} (${incomeCount} receitas, ${expenseCount} despesas)
- Streak atual: ${streak} dias
- Metas de economia: ${goalsCount}
- Cofrinhos: ${piggyCount}

Regras:
- Missões devem incentivar: consistência, controle financeiro, registro diário
- NUNCA incentivar gastar dinheiro
- Cada missão deve ter um target_type (transactions, income, expense, streak, savings, login) e target_value numérico
- Missões devem ser desafiadoras mas alcançáveis em 1 semana
- Variar a dificuldade: 1 fácil (common), 1 média (rare), 1 difícil (epic)
- Ícones válidos: Target, TrendingUp, Wallet, PiggyBank, Calendar, Flame, Star, Zap, Award, CheckCircle

Responda APENAS com o JSON, sem explicação.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: "Você gera missões de gamificação financeira em JSON." },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_weekly_missions",
              description: "Create 3 weekly missions for the user",
              parameters: {
                type: "object",
                properties: {
                  missions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        description: { type: "string" },
                        icon: { type: "string" },
                        xp_reward: { type: "integer" },
                        rarity: { type: "string", enum: ["common", "rare", "epic"] },
                        target_type: { type: "string", enum: ["transactions", "income", "expense", "streak", "savings", "login"] },
                        target_value: { type: "integer" },
                      },
                      required: ["title", "description", "icon", "xp_reward", "rarity", "target_type", "target_value"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["missions"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "create_weekly_missions" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, tente novamente em alguns minutos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI error:", response.status, text);
      throw new Error("AI gateway error");
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");

    const parsed = JSON.parse(toolCall.function.arguments);
    const generatedMissions = parsed.missions;

    // Calculate week expiry (next Sunday 23:59:59)
    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() + (7 - weekEnd.getDay()));
    weekEnd.setHours(23, 59, 59, 999);

    // Insert missions
    const toInsert = generatedMissions.map((m: any) => ({
      user_id: user.id,
      title: m.title,
      description: m.description,
      icon: m.icon,
      xp_reward: m.xp_reward,
      rarity: m.rarity,
      target_type: m.target_type,
      target_value: m.target_value,
      current_value: 0,
      is_completed: false,
      week_start: new Date().toISOString().split("T")[0],
      expires_at: weekEnd.toISOString(),
    }));

    const { data: inserted, error: insertError } = await supabase
      .from("weekly_missions")
      .insert(toInsert)
      .select();

    if (insertError) throw insertError;

    return new Response(JSON.stringify({ missions: inserted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-weekly-missions error:", e);
    return new Response(JSON.stringify({ error: "Erro ao gerar missões semanais. Tente novamente mais tarde." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
