# Central de Ajustes Premium — Plano de Implementação

Implementação incremental, sem quebrar nada existente. Todas as preferências passam a viver no banco (por usuário) com fallback em localStorage, salvamento automático (debounce) e sincronização entre dispositivos via Realtime.

## 1. Banco de dados

Nova tabela `public.user_preferences` (1 linha por usuário):

- `user_id uuid PK references auth.users(id) on delete cascade`
- `theme_mode text` (light/dark/auto)
- `primary_color text` (hex ou token do esquema)
- `density text` (compact/comfortable/spacious)
- `animations text` (on/reduced/off)
- `dashboard_layout jsonb` (order, hidden, preset, sizes)
- `menu_layout jsonb` (bottomHidden, sidebarHidden, order)
- `notifications jsonb` (todos os toggles)
- `regional jsonb` (language, currency, dateFormat, weekStart, timezone, numberFormat)
- `labs jsonb` (feature flags beta)
- `created_at`, `updated_at` (trigger `update_updated_at_column`)

GRANTs para `authenticated` + `service_role`, RLS: usuário só lê/escreve a própria linha.

Trigger em `handle_new_user` para criar linha padrão no signup + upsert idempotente no primeiro load para usuários existentes.

Adicionar `spacious` como valor válido em `density` (hoje só há compact/comfortable).

## 2. Contexto e hook

Refatorar `UserPreferencesContext`:

- Carregar do Supabase no mount (com fallback localStorage enquanto carrega).
- Debounce 400ms para gravar `upsert` em `user_preferences`.
- Assinar Realtime em `user_preferences` filtrando por `user_id` para refletir mudanças de outros dispositivos.
- Manter API atual (`density`, `animations`, `notifications`, `labs`, `dashboardLayout`, `menu`, `regional`, `themeMode`) + novos: `primaryColor`, adicionar `spacious`.
- Fallback defensivo preservado (HMR).

## 3. Aplicação global das preferências

- **Tema**: já aplicado via `ThemeContext` — plugar `themeMode` do banco no boot.
- **Cor principal**: injetar CSS var `--primary` (HSL) dinamicamente no `:root` a partir de `primary_color`.
- **Density**: já usa classes `density-*` — adicionar `density-spacious` em `index.css` (paddings/gaps).
- **Animações**: classes `anim-*` já existem — reforçar CSS para `anim-off` e `anim-reduced`.
- **Menu**: `BottomNav` e `DesktopSidebar` passam a filtrar/reordenar itens conforme `menu`.
- **Dashboard**: `Dashboard.tsx` já lê `dashboardLayout` — validar presets Essencial/Investidor/Planejamento/Empresarial/Personalizado.
- **Regional**: helper `formatCurrency`/`formatDate` respeitam `regional` (hoje pt-BR fixo — adicionar leitura do contexto onde aplicável, sem trocar cálculos financeiros).

## 4. Sub-telas de Ajustes

Todas em `/settings/*`, header padronizado, cards, auto-save, animações 200–300ms.

- **AppearanceSettings** — tema, cor principal (paleta + picker), densidade (3 opções), animações, reset layout.
- **DashboardCustomize** (nova) — drag-and-drop (dnd-kit já no bundle? senão usar setas), toggles show/hide, presets, tamanhos (sm/md/lg por card).
- **MenuSettings** (nova) — ocultar/reordenar itens de BottomNav e Sidebar.
- **NotificationSettings** — mantém push + toggles, cada switch faz upsert.
- **SecuritySettings** (nova) — alterar senha (Supabase `updateUser`), 2FA (Supabase MFA `enroll`/`challenge`/`verify`), sessões ativas (usar `user_sessions` já existente), logout global (`signOut({ scope: 'global' })`), PIN local (armazenado hash em localStorage — nativo web não tem biometria universal, expor `PublicKeyCredential` quando `available`).
- **SubscriptionSettings** — já existe, plugar dados reais de `useSubscription`.
- **ConnectedAccounts** (nova aba) — placeholders "Em breve" para Google/Apple/Open Finance/OFX/CSV, mantendo estrutura.
- **DataSettings** — export PDF (jspdf), Excel (xlsx via SheetJS ou papaparse+xlsx), CSV, backup JSON completo (já existe), restaurar backup (upload + validate + upserts respeitando RLS).
- **PreferenceSettings** — já existe, ligar ao banco.
- **LabsSettings** — feature flags no banco.
- **HelpSettings** — FAQ (accordion), formulário sugestão/bug → `notifications_log` ou nova `feedback` (usar tabela `security_events` não — criar `user_feedback` simples? Fora do escopo mínimo: mailto + link Instagram/site).
- **AboutSettings** — versão do package.json, build hash (Vite `import.meta.env`), última atualização (git via env), links.

## 5. Auto-save UX

- Toast discreto "Salvo" após cada upsert bem-sucedido (throttle).
- Indicador de "salvando…" no header da sub-tela quando debounce está pendente.
- Erros mostram toast + rollback local.

## 6. Rotas

Adicionar em `App.tsx`:
- `/settings/dashboard`
- `/settings/menu`
- `/settings/security`
- `/settings/connected-accounts`

## 7. Testes/validação

- Verificar build sem erros.
- Playwright: alterar tema/cor/densidade, recarregar, confirmar persistência via mock do Supabase local.
- Confirmar mobile 375px sem overflow horizontal.

## Detalhes técnicos

**Não** alterar `src/integrations/supabase/{client,types}.ts` manualmente — types serão regenerados após migração.

**Realtime**: `ALTER PUBLICATION supabase_realtime ADD TABLE public.user_preferences;`

**Cor principal → CSS var**: converter hex→HSL em JS e setar `document.documentElement.style.setProperty('--primary', 'H S% L%')`. Persistir em `theme_settings` NÃO — usar `user_preferences.primary_color` (individual, não afeta o tema global do admin).

**Densidade `spacious`**: adicionar utilitário Tailwind via `index.css` — `.density-spacious .card-finance { @apply p-6 gap-6; }` etc.

**Nada será removido.** Perfil, Família, Missões, Investimentos, IA e Planejamento permanecem intactos.
