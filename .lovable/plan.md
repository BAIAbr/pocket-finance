
# Fase 1 — Planejamento Financeiro Inteligente

Sem IA, sem APIs pagas, sem consumo de créditos. Todos os cálculos rodam no cliente com os dados já existentes no Supabase (transações, cofrinhos, metas). Nada do que existe hoje é removido.

## O que será construído

### 1. Banco de dados (1 migração)
Nova tabela `public.financial_goals` (independente das `savings_goals` para não misturar semântica):
- `user_id`, `family_id` (nullable), `title`, `goal_type` (casa/carro/viagem/faculdade/notebook/casamento/reserva/empresa/custom)
- `icon`, `color`
- `target_amount`, `initial_amount`, `monthly_contribution`
- `target_date` (nullable), `cdi_percentage` (default 100), `custom_annual_rate` (nullable)
- `category_id` (nullable), `piggy_bank_id` (nullable) — conta usada
- `is_primary` (bool, apenas 1 por usuário/família)
- `is_completed`, `created_at`, `updated_at`
- RLS: dono OU membro da família dona; GRANTs corretos para `authenticated` e `service_role`; trigger `updated_at`.

### 2. Rota e navegação
- Nova rota `/planning` protegida por `PlanGate feature="planning"`.
- `planCapabilities.ts`: adicionar capacidade `planning` (Premium).
- **BottomNav (mobile)**: substituir "IA" por "Planejamento" (ícone `TrendingUp`). IA continua acessível pelo card do Dashboard e Sidebar.
- **DesktopSidebar**: adicionar "Planejamento" abaixo de "Metas".

### 3. Página `/planning`
Layout centralizado, mobile-first, seguindo tokens do design system (nada de cores hardcoded).

**Painel superior (cards):**
- Patrimônio Atual (soma cofrinhos + saldo do período)
- Economia Mensal Média (últimos 3–6 meses de transações)
- Receita/Despesa média
- Reserva Financeira (saldo cofrinhos vs. despesa média × 6)
- Capacidade de Investimento (economia média − aportes já em curso)
- Previsão Financeira (projeção 12m com aporte médio)

**Lista de Objetivos** com CRUD (criar, editar, arquivar, marcar como principal).

**Simulador (drawer/modal ao criar/editar objetivo):**
- Seleção de tipo (grid com ícones)
- Campos: valor desejado, inicial, aporte mensal, prazo OU data alvo, rentabilidade (100/105/110/120/130% CDI ou taxa customizada), conta (piggy bank), categoria
- Painel de resultados em tempo real (recalcula em cada onChange):
  - Tempo necessário para atingir o alvo com aporte atual
  - Valor acumulado no prazo escolhido
  - Total investido vs. total rendido
  - Rentabilidade efetiva no período
  - Data prevista de conclusão
  - Diferença até a meta
- Sugestões automáticas (regras, sem IA): "Aportando R$X você conclui em Y meses"; "Aumentando o aporte em 40% conclui Z meses antes".

**Evolução Patrimonial:**
- Gráfico (Recharts) com projeções 1a / 3a / 5a / 10a usando patrimônio atual + aporte médio + rendimento CDI escolhido no objetivo principal.

**Alertas Inteligentes** (regras puras):
- Meta atrasada (progresso < esperado pela data)
- Reserva baixa (< 3× despesa média)
- Economia acima da média (> 20% da média histórica no mês corrente)
- Gastos elevados (> 120% da média)
- Capacidade de investimento aumentou (> 15% vs. média)

### 4. Card no Dashboard
Novo componente `PlanningSummaryCard` mostrando: objetivo principal, % concluído, próximo aporte (`monthly_contribution`), tempo restante. Botão "Abrir Planejamento" → `/planning`. Aparece após o `WeeklySummaryCard`.

### 5. Cálculos (helpers)
- `src/lib/planning/calculations.ts`
  - `simulateGoal({ initial, monthly, annualRate, targetAmount, months })` → série mensal com principal/aporte/rendimento/saldo
  - `monthsToReach(target, initial, monthly, annualRate)`
  - `projectPatrimony(currentBalance, monthlyContribution, annualRate, years)`
  - Reutiliza `cdiPercentageToAnnualRate` do `useCdiYield.ts`.
- `src/hooks/usePlanningStats.ts` — agrega estatísticas históricas a partir de `useEffectiveFinance`.
- `src/hooks/useFinancialGoals.ts` — CRUD Supabase.

### 6. Verificação
- `tsgo` para typecheck.
- Playwright headless: abrir `/planning`, criar objetivo, verificar simulação em tempo real e card no Dashboard.
- Nada é removido; IA, Cofrinhos, Metas, Transações, Family Mode continuam iguais.

## Fora de escopo (nesta fase)
- Módulo Scanner OCR (Fase 2 — Tesseract.js client-side).
- Edição das regras de classificação (vem com o Scanner).

## Design
- Cores/tipografia via tokens semânticos existentes (`--primary`, `--card`, etc.). Nada hardcoded.
- Cards arredondados (`rounded-2xl`), sombras suaves, microanimações `animate-fade-in` já usadas no app. Consistente com Dashboard atual.
