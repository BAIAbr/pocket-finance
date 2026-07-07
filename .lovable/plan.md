
# Fase A — Assinaturas Recorrentes & Contas a Vencer

Entrega isolada e 100% aditiva. Nada existente é renomeado, removido ou alterado. Só cria tabela nova, componentes novos e um card no dashboard.

## O que o usuário vai ver

1. **Nova página "Recorrentes"** acessível em `/recurring` (link no menu Ajustes → "Assinaturas & Contas")
   - Listar assinaturas/contas cadastradas
   - Criar / editar / pausar / excluir
   - Campos: nome, valor, categoria (usa `categories` existente), tipo (despesa/receita), frequência (mensal/anual/semanal), dia do vencimento, próximo vencimento, status ativo/pausado, ícone/cor opcional, notas
2. **Card "Próximas Contas" no Dashboard** (novo widget, aparece só se houver recorrências ativas)
   - Mostra os 5 próximos vencimentos dos próximos 30 dias
   - Badge de urgência (vencido / hoje / X dias)
   - Botão "Marcar como paga" → cria uma `transaction` real usando os dados da recorrência e avança o `next_due_date` para o próximo período
3. **Cálculo automático** de `next_due_date` no client ao marcar como paga (nenhum cron obrigatório nesta fase)

Funciona em modo pessoal e modo família (usa `user_id` ou `family_id` como as outras tabelas).

## Mudanças de banco (aditivas)

Nova tabela `public.recurring_transactions`:
- `id`, `user_id` (fk auth.users), `family_id` (nullable, fk families)
- `name text`, `amount numeric`, `type` ('income'|'expense')
- `category_id` (nullable, fk categories)
- `frequency` ('weekly'|'monthly'|'yearly')
- `day_of_month int` (nullable), `next_due_date date`
- `is_active bool default true`, `notes text`, `color text`, `icon text`
- `created_at`, `updated_at` + trigger `update_updated_at_column`

RLS: dono lê/escreve o seu; membros da família leem/escrevem quando `family_id` bate com sua família (mesmo padrão de `shared_transactions`).
GRANTs: `authenticated` (SELECT/INSERT/UPDATE/DELETE), `service_role` (ALL).

Nenhuma tabela existente é tocada. Nenhuma migração destrutiva.

## Arquivos front (novos, sem editar contratos existentes)

- `src/hooks/useRecurring.ts` — CRUD + helper `advanceNextDueDate()`
- `src/components/UpcomingBillsCard.tsx` — widget do dashboard
- `src/components/RecurringFormModal.tsx` — criar/editar
- `src/pages/Recurring.tsx` — página completa
- Editar `src/App.tsx`: adicionar `<Route path="/recurring">` (aditivo)
- Editar `src/pages/Dashboard.tsx`: inserir `<UpcomingBillsCard />` acima de "Últimas Transações" (aditivo, condicional)
- Editar `src/pages/Settings.tsx`: adicionar item de menu "Assinaturas & Contas" → navigate('/recurring')

Bottom nav mobile e Sidebar desktop **não** mudam nesta fase.

## Fora do escopo desta fase

Calendário, cartões, 2FA, planos, redesign mobile, drag&drop de widgets — cada um vira sua própria fase, na ordem escolhida por você.

## Validação pós-entrega

- Login, dashboard atual, transações, cofrinho, IA, admin: tudo continua funcionando idêntico.
- Nenhum dado existente é lido/modificado destrutivamente.
- Migration só faz `CREATE TABLE` + `GRANT` + `ENABLE RLS` + `CREATE POLICY` + `CREATE TRIGGER`.

Aprove para eu executar a migration e criar os componentes.
