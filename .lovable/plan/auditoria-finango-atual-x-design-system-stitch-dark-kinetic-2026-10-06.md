# Auditoria: Finango atual x Design System Stitch ("Dark Kinetic Financial")

Somente auditoria. Nenhum código, banco de dados ou função foi alterado.

## A. Como o Finango funciona hoje
- **Tecnologia:** React 18 + Vite + Tailwind + componentes shadcn. As rotas usam HashRouter, com links curtos `/c/:code` e `/vip/:code`.
- **Layout:** `AppLayout` (verifica o login, troca entre Minha Conta e Família, abre a busca com Ctrl+K), `DesktopSidebar` com 9 itens fixos, `BottomNav` com o menu "Mais" (`MoreSheet`) e o botão flutuante `QuickActionsFab`.
- **Estado global:** Theme, Appearance, Auth, UserPreferences, FeatureFlags, Finance, Family e `useEffectiveFinance`. Este último alterna entre os dados pessoais e os da família.
- **Backend (Lovable Cloud):** RLS por usuário e por família, funções privadas, papéis admin/user e cerca de 40 Edge Functions. Elas cobrem Mercado Pago (assinatura e PIX), VIP, cartões, push, IA e cotações (BRAPI).
- **Módulos existentes:** Dashboard, Histórico, Calendário, IA (chat desativado), Metas/Cofrinho, Planejamento, Investimentos, Cartões (faturas, parcelas, regras, importação), Recorrências, Parcelamentos, Relatórios, Categorias, Ajustes (8 subpáginas), Perfil, Planos, Segurança, Admin (auditoria, VIP, temas, documentos) e Novidades.
- **Temas:** 7 esquemas de cores (`SCHEME_VARS`), com modo claro e escuro. A cor principal atual é roxa.

## B. Design System do Stitch
- **Cores:** fundo escuro quente (#0B0A09 / #141312), superfícies em camadas (#1D1B1A até #363433) e laranja Fox (#F97316 / #FFB690) como cor de destaque. O laranja ocupa cerca de 20% da tela, só em ações e insights.
- **Tipografia:** Geist para a interface. JetBrains Mono para números, tags e rótulos em caixa alta.
- **Padrões:** cards com borda fina e cantos de 12–16px, KPIs em grade de 4, tabelas densas com filtros, sub-abas por módulo e um card "Copiloto Fox" com sugestões e botões de ação.
- **Navegação:** barra lateral agrupada (Início / DINHEIRO / PLANEJAMENTO / Investimentos / Finango IA / Relatórios / Calendário / Configurações), barra superior com busca, selo do plano, notificações e avatar, e um cartão do usuário no rodapé.
- **12 telas:** Dashboard, Dinheiro, Planejamento (desktop e mobile), Invest (desktop e mobile), IA Copiloto (desktop e mobile), Relatórios, Calendário (desktop e mobile) e Configurações.

## C/D. Mapa de telas
| Tela do Stitch | Tela atual no Finango | O que se reaproveita | O que muda | Risco |
|---|---|---|---|---|
| Dashboard executivo | `/` Dashboard | BalanceCard, MiniChart, UpcomingEvents, TransactionList, SmartInsights, Planning e Investments Summary | Novo bloco de patrimônio + 4 KPIs, card do Copiloto Fox, gráfico de fluxo com projeção e card "Atenção imediata" | Médio |
| Dinheiro (operação) | `/history` + `/cards` + `/recurring` | FinancialHistory, filtros, CreditCardVisual, useCreditCards, useRecurring | Nova página que reúne tudo em abas (Visão geral, Transações, Cartões, Faturas, Recorrências) | Médio |
| Contas bancárias | Não existe | — | O Finango não tem cadastro de contas. Mostrar só no visual exige confirmação | Alto |
| Planejamento | `/planning` + `/savings` | usePlanningStats, GoalFormModal, cofrinhos | Novo visual. "Orçamentos", "Dívidas" e "Projeções" não existem como módulos | Alto, se criados |
| Invest | `/investments` | useInvestments, gráficos, carteira, dividendos | Só o visual | Baixo |
| IA Copiloto | `/ai-insights` | análise via função de IA | O chat continua desativado (pedido anterior). Só o visual dos insights | Baixo |
| Relatórios | `/reports`, `/cards/reports` | gráficos atuais | Visual | Baixo |
| Calendário | `/calendar` | FinancialCalendar | Visual | Baixo |
| Configurações | `/settings/*`, `/profile`, `/settings/subscription` | toda a lógica atual | Visual em formato de lista executiva | Baixo |

## E. Componentes reaproveitados
Todos os hooks de dados e de negócio, os modais de transação, cartão, meta e pagamento (PIX), `MoneyInput`, `PlanGate`, `GlobalSearch`, `NotificationCenter`, os componentes shadcn e Recharts.

## F. Componentes a adaptar
`DesktopSidebar` (grupos recolhíveis e cartão do usuário), `BottomNav`/`MoreSheet`, `AppLayout` (nova barra superior), `BalanceCard`, `MiniChart`, `TransactionList`, `CreditCardVisual`, os cards do dashboard, `SettingRow` e `SettingsCategoryCard`.

## G. Componentes novos (compartilhados, só de apresentação)
`TopBar`, `KpiCard`, `MetricValue` (fonte mono, R$), `SectionCard`, `LabelTag`, `ModuleTabs`, `FoxCopilotCard`, `DataTable` com filtros, `ProgressBarFox` e `StatusPill`.

## H. Riscos
1. **Conflito com a memória do projeto:** a cor principal registrada é roxa, e o Stitch é laranja em fundo escuro. Também há 7 temas e o modo claro. Proposta: o "Fox Dark" vira o tema padrão e os temas atuais continuam disponíveis.
2. **Módulos inexistentes:** Contas bancárias e Open Finance, Orçamentos, Dívidas e Projeções. Não serão criados sem sua autorização (escopo restrito a finanças pessoais e familiares).
3. Os textos do Stitch têm tom corporativo ("SaaS", "Operação", "PJ"). Serão adaptados para finanças pessoais.
4. **Mascote:** a Capy continua fora. A identidade Fox fica só nos nomes (Copiloto Fox, Fox Score).
5. Uma barra lateral com submenus muda os caminhos de navegação. As rotas atuais serão mantidas, só reagrupadas.
6. A troca Minha Conta/Família precisa caber na nova barra superior.

## I. Dependências
Fontes Geist e JetBrains Mono (Google Fonts). Nenhuma biblioteca nova obrigatória. Os ícones continuam no lucide (no lugar dos Material Symbols).

## J. Plano por fases
1. **Design System global:** tokens HSL em `index.css` e `tailwind.config.ts`, novo esquema "Fox Dark" em `ThemeContext`, fontes e componentes base (G). Os dados ficam intactos.
2. **Layout e navegação:** `AppLayout` + `TopBar`, `DesktopSidebar` agrupada, `BottomNav`. As rotas não mudam.
3. **Dashboard:** nova composição com os hooks existentes e as preferências de exibição respeitadas.
4. **Dinheiro:** página com abas reunindo Histórico, Cartões, Faturas e Recorrências, que reaproveita as páginas atuais.
5. **Planejamento:** Planning + Metas/Cofrinho no novo visual.
6. **Investimentos:** reestilização.
7. **Copiloto Fox / IA:** cards de insights. O chat segue desligado.
8. **Relatórios e Calendário.**
9. **Configurações, Perfil e Assinatura:** o fluxo de PIX e Mercado Pago não muda.
10. **Mobile:** telas do Stitch mobile, BottomNav e o botão flutuante.
11. **QA:** testes no navegador em desktop e mobile em cada página, conferência de dados reais, do modo família e dos temas.

**Contra regressões:** só o visual é alterado (classes e estrutura das telas), os hooks e as funções ficam como estão, e cada fase é testada antes da próxima. Toda versão pode ser restaurada pelo histórico.

## K. Ordem recomendada
1 → 2 → 3 → 10 parcial (mobile do dashboard) → 4 → 5 → 6 → 7 → 8 → 9 → 11.

## Decisões pendentes
- Fox Dark como tema padrão (substituindo o roxo) ou só como mais uma opção?
- Criar os módulos novos (Contas, Orçamentos, Dívidas, Projeções) ou deixá-los fora por enquanto?
