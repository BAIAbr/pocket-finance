## Objetivo
Permitir escolher a periodicidade da assinatura Premium antes de pagar, com preço, economia e benefícios atualizando dinamicamente. Tudo configurável no admin, sem alterar código para novos intervalos.

## Estrutura de dados
Adicionar em `subscription_plans` (colunas novas, mantendo os planos existentes):
- `plan_group` (text) — agrupa variações do mesmo plano (ex.: `premium`)
- `billing_interval` (text) — `month | quarter | semester | year`
- `interval_count` (int) — nº de meses cobertos (1, 3, 6, 12)
- `badge_label` (text) — ex.: "Mais Popular", "Melhor Oferta"
- `badge_color` (text) — cor de destaque (hex/token)
- `discount_percent` (numeric) — economia vs mensal (auto-calculada ou manual)

Seed:
- Manter `premium` (mensal) e `premium_yearly` (anual) já existentes → preencher `plan_group=premium`.
- Criar `premium_quarterly` e `premium_semester` (inativos por padrão para o admin ativar quando quiser).

## Frontend — `src/pages/Plans.tsx`
Agrupar planos por `plan_group`. Para cada grupo com >1 variação ativa:
- Renderizar um card único com **seletor segmentado** (Mensal / Trimestral / Semestral / Anual) exibindo apenas as variações `is_active`.
- Ao trocar, animar valores: preço total, `equivale a R$ X/mês`, economia %, badge, descrição e lista de benefícios.
- Destacar automaticamente a variação com `is_highlighted` ou `badge_label`.
- Manter o card `free` como está.
- Fluxo de pagamento existente (PaymentMethodModal / create-subscription) recebe o `plan_code` correto da variação selecionada.

## Backend edge functions
- `create-subscription`: ler `billing_interval` + `interval_count` do plano e enviar ao Mercado Pago em `auto_recurring.frequency` / `frequency_type` (ex.: 3 months, 6 months, 12 months). Preservar validação payer/collector.
- `create-pix-payment`: derivar `days` a partir de `interval_count * 30` quando disponível, mantendo `funder` como vitalício.
- `payment-webhook`: ao renovar/ativar, gravar `plan_code` da variação selecionada e `next_billing_at` de acordo com o intervalo.

## Admin — `src/components/admin/PlansManager.tsx`
Adicionar campos editáveis:
- `plan_group`, `billing_interval` (select), `interval_count`, `badge_label`, `badge_color`, `discount_percent`.
- Manter switch `is_active` e `sort_order` para controlar visibilidade sem alterar código.

## Validações
- Frontend só lista variações `is_active`.
- `create-subscription` / `create-pix-payment` recusam plano `is_active=false` (já implementado) e usam o valor `price_monthly` do banco (nunca do cliente).
- `user_subscriptions.plan_code` guarda o código exato da variação escolhida; `metadata` inclui `billing_interval`.

## Responsividade
Seletor segmentado full-width no mobile (scroll horizontal se >3 opções), pill group centralizado em desktop. Sem mudanças na identidade visual.

## Entregáveis
1. Migração SQL (colunas + seed das 2 novas variações inativas).
2. `useSubscription` tipado com os novos campos.
3. `Plans.tsx` reescrito com agrupamento + seletor.
4. Ajustes em `create-subscription` e `create-pix-payment`.
5. `PlansManager.tsx` com os novos campos.
