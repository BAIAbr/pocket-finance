
# Central de Configurações Premium

Transforma `Ajustes` numa Central com categorias em cards, cada uma abrindo uma sub-tela dedicada. Nenhum dado, tabela ou funcionalidade existente é removido — só reorganizado e expandido. Perfil continua separado. Sem botão "Salvar": tudo persiste automaticamente (backend quando existe, localStorage quando é preferência local).

## Estrutura da nova `Settings.tsx`

Página hub com header curto ("Configurações") + grid de cards clicáveis:

```text
┌─────────────────────────────────────────┐
│  🎨 Personalização                       │  → /settings/appearance
│  🔔 Notificações                         │  → /settings/notifications
│  🔒 Segurança                            │  → /security (já existe)
│  💳 Assinatura e Contas                  │  → /settings/subscription
│  📤 Importar e Exportar                  │  → /settings/data
│  🌎 Preferências                         │  → /settings/preferences
│  🧪 Laboratório Finango                  │  → /settings/labs
│  ❓ Ajuda e Suporte                       │  → /settings/help
│  ℹ️  Sobre                                │  → /settings/about
└─────────────────────────────────────────┘
```

Desktop: 2 colunas. Mobile: 1 coluna. Cards com ícone colorido, título, descrição, chevron, `touch-scale`, hover elevado.

Elementos já hoje na tela (VIP redeem, Family settings, Admin panel) migram para dentro das sub-telas apropriadas — nada é apagado.

## Sub-telas (novas rotas)

Cada sub-tela usa header com botão voltar + título + descrição, corpo em cards, mesmo estilo visual.

### 1. `/settings/appearance` — Personalização
Seções (accordions ou cards empilhados):
- **Dashboard**: reaproveita `AppearanceContext` (novo, ver abaixo). Toggle mostrar/ocultar cards do Dashboard (balance, weekly summary, upcoming bills, missions, mini chart, quick deposit), reordenar (drag simples com setas ↑↓), tamanho (compact/comfortable), botão "Restaurar layout", presets: Essencial / Investidor / Planejamento / Empresarial / Personalizado. Salva em localStorage.
- **Tema**: Claro / Escuro / Automático (segue `prefers-color-scheme`). Reusa `ThemeContext`, adiciona modo `auto`.
- **Cor Principal**: reusa `COLOR_SCHEMES` existente (já suportado). Renderiza as opções aqui em vez de na home.
- **Layout**: Compacto / Confortável (aplica classe global via `AppearanceContext` que ajusta padding/gap).
- **Animações**: Ativar / Desativar / Reduzir. Aplica classe `no-anim` / `reduced-anim` no `<html>`.
- **Menu**: reordenar itens da BottomNav e Sidebar, ocultar itens opcionais (IA, Cofrinho, etc. — sem quebrar rotas). Persistência local.

### 2. `/settings/notifications` — Notificações
Card de push (mantém `usePushNotifications` atual). Abaixo, lista de toggles por categoria salvos em `notification_preferences` (localStorage + coluna `preferences jsonb` opcional em `profiles` — mas para este escopo fica localStorage para evitar migração):
Receitas, Despesas, Metas, Planejamento, Investimentos, Cartões, Assinaturas, Contas a vencer, Resumo Semanal, Resumo Mensal, Novidades, Atualizações. Cada toggle aplica imediatamente.

### 3. `/settings/subscription` — Assinatura e Contas
Duas abas (Tabs shadcn):
- **Plano Finango**: mostra plano atual (`useSubscription`), benefícios, CTA Upgrade (`/plans`), placeholders visuais para renovação, método de pagamento, histórico e cancelar (com toast "em breve").
- **Contas Conectadas**: cards para Google, Apple, Open Finance, Bancos, Importar OFX, Importar CSV, "Adicionar conta", "Gerenciar conexões" — todos como placeholders com badge "Em breve", preparando estrutura.

### 4. `/settings/data` — Importar e Exportar
Cards: Exportar PDF, Excel, CSV, Backup (JSON), Restaurar Backup, Importar dados. Reaproveita a lógica de export JSON já existente no Profile para Backup; demais itens abrem toast "em breve" mas ficam prontos com handlers isolados.

### 5. `/settings/preferences` — Preferências
Selects: Idioma (pt-BR default), Moeda (BRL/USD/EUR — só rótulo, sem alterar cálculos), Formato de data, Primeiro dia da semana, Fuso horário, Formato numérico. Persistência localStorage via `AppearanceContext`.

### 6. `/settings/labs` — Laboratório Finango
Lista de flags experimentais (toggles): Novo Dashboard, Novo Planejamento, Radar Financeiro, Saúde Financeira, Assistente da Raposa. Salvas em localStorage (`finango.labs.*`). Sem efeito colateral por enquanto — só a estrutura de flags.

### 7. `/settings/help` — Ajuda e Suporte
Cards linkados: Central de Ajuda, FAQ, Falar com suporte (mailto), Reportar problema (mailto com assunto), Enviar sugestão (mailto), Avaliar app, Contato (Instagram + email já existentes).

### 8. `/settings/about` — Sobre
Versão, changelog (lista estática curta), Política de Privacidade, Termos de Uso, Licenças, Instagram, Site oficial.

## Contexto novo: `AppearanceContext`

Arquivo `src/contexts/AppearanceContext.tsx` (já existe segundo a listagem — será estendido, não recriado). Estende para armazenar:
- `density`: 'compact' | 'comfortable'
- `animations`: 'on' | 'reduced' | 'off'
- `dashboardLayout`: { order: string[], hidden: string[], preset: string }
- `menuOrder`: { bottom: string[], sidebar: string[], hidden: string[] }
- `themeMode`: 'light' | 'dark' | 'auto' (auto adiciona listener `matchMedia`)
- `notificationPrefs`: Record<string, boolean>
- `labs`: Record<string, boolean>
- `preferences`: { language, currency, dateFormat, weekStart, timezone, numberFormat }

Tudo persistido em localStorage, aplicado via classes no `<html>` (`density-compact`, `anim-off`, etc.) e consumido por componentes do Dashboard/Nav quando fizer sentido — sem quebrar quem não consome.

## Alterações mínimas em componentes existentes

- `Dashboard.tsx`: envolve cada seção em wrapper que respeita `dashboardLayout.hidden`/`order` do contexto. Se contexto ausente ou vazio → comportamento atual. **Sem remover cards existentes.**
- `BottomNav.tsx` / `DesktopSidebar.tsx`: leem `menuOrder` para reordenar/ocultar; fallback = comportamento atual.
- `App.tsx`: adiciona 8 rotas de sub-tela.
- `Settings.tsx`: reescrito como hub (VIP redeem move para `/settings/subscription`, Family para `/settings/preferences` ou fica em `/settings/appearance`? → melhor: nova sub-tela **não** listada acima, mantém Family no hub como card extra "👨‍👩‍👧 Família" que abre modal atual — evita quebrar UX).

Family fica como card próprio no hub (`FamilySettings` inline expansível) para não perder acesso.

## Compatibilidade

- Zero migrations de banco.
- Zero remoção de arquivos.
- Fallbacks defensivos em todo consumidor do `AppearanceContext` (se prefs undefined → default atual).
- Perfil, Dashboard, Metas, Cofrinho, Investimentos, IA, Cartões: intocados no comportamento; apenas leitura opcional de preferências visuais.

## Arquivos a criar

- `src/pages/settings/AppearanceSettings.tsx`
- `src/pages/settings/NotificationSettings.tsx`
- `src/pages/settings/SubscriptionSettings.tsx`
- `src/pages/settings/DataSettings.tsx`
- `src/pages/settings/PreferenceSettings.tsx`
- `src/pages/settings/LabsSettings.tsx`
- `src/pages/settings/HelpSettings.tsx`
- `src/pages/settings/AboutSettings.tsx`
- `src/components/settings/SettingsCategoryCard.tsx`
- `src/components/settings/SettingsSubPageHeader.tsx`
- `src/components/settings/SettingRow.tsx` (linha com ícone/título/descrição/trailing)

## Arquivos a modificar

- `src/pages/Settings.tsx` → hub
- `src/contexts/AppearanceContext.tsx` → estender
- `src/App.tsx` → rotas
- `src/index.css` → classes `density-*`, `anim-off`, `anim-reduced`

## Fora do escopo (declarado explicitamente)

- Nenhuma alteração em edge functions.
- Nenhuma alteração de RLS/tabelas.
- Nenhuma mudança em lógica financeira, IA, planejamento, investimentos.
- Integrações reais Google/Apple/Open Finance/OFX ficam como placeholders "Em breve" com estrutura pronta.

## Detalhes técnicos

- Todos os toggles usam `Switch` do shadcn.
- Grid do hub: `grid grid-cols-1 md:grid-cols-2 gap-3`.
- Cards: `card-finance` + `hover:scale-[1.01] active:scale-[0.99] transition-transform`.
- Sub-telas usam `useNavigate(-1)` para voltar.
- Animações via `framer-motion` (`motion.div` com `layout` e `initial/animate`), respeitando flag `animations` do contexto.
- Persistência via `useLocalStorage` já existente.
