# Módulo de Códigos VIP — Sistema Profissional de Campanhas

Evolução do módulo atual para plataforma completa de cupons, convites, influenciadores e campanhas Premium — mantendo identidade visual e layout base do Finango.

## Escopo

Refatoração ampla (banco + edge functions + admin UI + fluxo público de resgate). Trabalho grande — vou executar em fases dentro deste único plano após aprovação.

## Fase 1 — Banco de dados

Estender `vip_codes` (sem quebrar dados existentes):

Novas colunas:
- `internal_name text` — nome interno da campanha
- `code_type text` — premium | discount | invite | influencer | partner | employee | beta
- `benefit_type text` — days | percent_discount | fixed_discount | lifetime
- `discount_percent numeric`, `discount_amount numeric` (usados quando benefit_type ≠ days)
- `is_lifetime boolean default false`
- `campaign_source text` — tiktok | instagram | youtube | facebook | google | influencer | affiliate | partner | organic | custom
- `campaign_label text` — livre (ex: nome do influenciador)
- `starts_at timestamptz`
- `status text default 'active'` — active | paused | expired | archived (derivado + manual)
- `single_use_per_user boolean default true`
- `unlimited boolean default false`
- `created_by uuid`, `updated_by uuid`, `archived_at timestamptz`

Estender `vip_redemptions`:
- `days_granted integer`
- `source_campaign text`
- `user_agent text`, `ip text`, `device text`

Nova tabela `vip_code_events` (audit log):
- `id`, `vip_code_id`, `actor_id`, `action` (created | updated | archived | deleted | activated | paused | redeemed), `metadata jsonb`, `created_at`

Índices: `vip_codes(status)`, `vip_codes(campaign_source)`, `vip_redemptions(vip_code_id, redeemed_at desc)`.

RLS: admin gerencia tudo; usuário lê apenas o próprio redemption; eventos apenas admin.

## Fase 2 — Edge functions

- `vip-code-info`: já refatorada; adicionar mensagens de erro específicas (expirado, pausado, limite atingido, já utilizado, ainda não iniciado) e retornar tipo/benefício.
- `redeem-vip-code`: aplicar todas as validações + registrar user_agent/ip/device + gravar `days_granted` + emitir evento `redeemed`.
- Rate limit leve por IP+user (em memória com Deno KV ou tabela `security_events`): máx 5 tentativas/min.

## Fase 3 — Admin UI (`VipCodesManager.tsx`)

Mantém o card superior de criação, mas dividido em abas/passos:
1. **Dashboard** (novo): cards com total criados / ativos / expirados / usos / dias Premium concedidos / novos usuários / taxa conversão + gráfico de ativações por dia (recharts Area) e top campanhas (Bar).
2. **Códigos**: barra de pesquisa (código, nome, campanha), filtros (todos, ativos, expirados, mais usados, nunca usados, TikTok, Instagram, influenciadores), paginação (25/página).
3. **Cadastro completo** (modal): nome interno, código, tipo, benefício (dias 30/90/180/365/vitalício OU % OU R$), origem da campanha, label, datas início/fim (ou sem expiração), limite de usos, single_use, status inicial.
4. **Ações por card**: duplicar, pausar/reativar, arquivar, excluir, gerar novo aleatório, copiar código, copiar link `finango.online/c/CODIGO`, compartilhar (Web Share API).
5. **Detalhe do código** (drawer): lista paginada de quem usou (nome, email, data/hora, plano, dias, origem, dispositivo) + mini gráficos.

## Fase 4 — Fluxo público

- Rota curta `/c/:code` (além de `/vip/:code` existente): aplica o código automaticamente após cadastro/login.
- `VipRedeem.tsx`: mensagens específicas para cada falha; animação de sucesso com dias concedidos e data de validade formatada em pt-BR.

## Fase 5 — Segurança & performance

- Validação backend em todas as ações (nunca confiar em client).
- Rate limit em `redeem-vip-code`.
- Paginação server-side.
- Índices adicionados.
- Constraint UNIQUE `(vip_code_id, user_id)` em `vip_redemptions` para blindar dupla ativação.

## Detalhes técnicos

- Migrations: 1 grande, com GRANTs e políticas. Nenhuma alteração destrutiva; colunas novas com defaults.
- Tipos: regenerados após migration; usar `.returns<T>()` em queries com joins.
- Cliente Supabase: sem mudanças em `client.ts`.
- Identidade visual: mesmos tokens (`bg-card`, `border`, `Badge`, `Card`), mesma tipografia mono para código, chips coloridos por tipo/origem seguindo palette existente (primary, secondary, muted).

## Fora de escopo

- E-mail de confirmação após resgate (fica para depois).
- Integração com provedor de SMS/push específico para códigos.
- A/B testing de campanhas.
