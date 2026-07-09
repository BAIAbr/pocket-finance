# Central de Investimentos

Módulo novo, 100% incremental. Nenhum dado ou funcionalidade existente será alterada.

## 1. Banco de dados (migração aditiva)

Novas tabelas em `public` (com GRANTs + RLS por `auth.uid()`):

- `investment_assets` — cadastro de ativos na carteira do usuário
  - `id`, `user_id`, `ticker`, `type` (`fii`|`stock`|`etf`|`fixed_income`), `name`, `segment`, `created_at`
- `investment_transactions` — aportes (compras) e vendas
  - `id`, `user_id`, `asset_id`, `kind` (`buy`|`sell`), `quantity`, `unit_price`, `total`, `date`, `notes`, `created_at`
- `investment_dividends` — proventos recebidos
  - `id`, `user_id`, `asset_id`, `amount`, `pay_date`, `com_date`, `type` (`dividend`|`jcp`|`rendimento`), `created_at`
- `market_quotes_cache` — cache de cotações/DY/último provento por ticker (compartilhado)
  - `ticker` PK, `price`, `last_dividend`, `dividend_yield`, `segment`, `name`, `liquidity`, `com_date`, `pay_date`, `patrimonial_value`, `updated_at`

RLS: `user_id = auth.uid()` para as três primeiras; `market_quotes_cache` leitura para `authenticated`, escrita apenas via edge function (service_role).

## 2. Edge function `market-quote`

- Entrada: `{ ticker }` ou `{ tickers: [] }`
- Retorna dados do cache se `updated_at` < 15min, senão tenta buscar em provedor (BRAPI público como default, arquitetura preparada para trocar por provedor pago via `MARKET_DATA_PROVIDER` + `MARKET_DATA_API_KEY`).
- Nunca usa valores fixos hardcoded; se o provedor falhar, retorna `{ available: false }` e a UI mostra campos vazios com aviso "dados indisponíveis".

## 3. Frontend

Rota nova `/investments` (com `PlanGate feature="investments"`). Adicionada:
- No `MoreSheet` (item Investimentos → agora navega, sem "em breve")
- No `DesktopSidebar` abaixo de Planejamento
- Novo card `InvestmentsSummaryCard` no Dashboard (patrimônio, dividendos do mês, rentabilidade, botão "Abrir Carteira")

Estrutura de páginas dentro de `src/pages/Investments/`:
- `index.tsx` — layout com header + tabs internas (Carteira, FIIs, Ações, ETFs, Renda Fixa, Simulador, Histórico)
- `Overview.tsx` — cards: Patrimônio, Valorização, Dividendos Mensais/Anuais, Rentabilidade, Melhor/Pior ativo
- `Wallet.tsx` — lista de ativos com preço médio, patrimônio, lucro/prejuízo, rentabilidade, dividendos recebidos; botão "Novo Aporte" e "Adicionar Ativo"
- `AssetsByType.tsx` (reutilizada para FIIs/Ações/ETFs/Renda Fixa filtrando `type`)
- `Simulator.tsx` — busca ticker → puxa preço via `market-quote` → calcula cotas, valor utilizado, saldo restante; e simulador de projeção (aporte mensal × anos, com toggle "reinvestir dividendos")
- `History.tsx` — todas as compras/aportes/dividendos com filtros ano/mês/ativo

Componentes:
- `AssetSearchInput` — busca ticker (debounced, chama `market-quote`)
- `AddAssetModal` / `NewContributionModal` / `RegisterDividendModal`
- `AssetCard`, `PortfolioChart` (pizza/alocação), `DividendsChart` (barras mês/ano), `PatrimonyChart` (linha)

## 4. Cálculos (locais, `src/lib/investments/calculations.ts`)

- Preço médio ponderado após cada aporte
- Patrimônio = Σ quantidade × preço atual (do cache)
- Rentabilidade = (patrimônio − investido) / investido
- DY carteira = dividendos 12m / patrimônio
- Projeção com juros compostos + opção reinvestir dividendos (usa DY médio dos ativos ou DY informado)

## 5. Design

Segue o design system do Finango (tokens semânticos, `bg-card`, `text-primary`, glass, tabular-nums, gráficos Recharts com cores do tema). Mobile-first, cards arredondados, animações Framer Motion sutis.

## 6. Compatibilidade

- Nenhuma tabela existente é alterada.
- Rotas/menus existentes preservados; apenas adicionamos entradas novas.
- Feature-flag `investments` no `planCapabilities` (liberada para todos os planos por padrão; podemos restringir ao Premium depois se quiser).

## Detalhes técnicos

- Provedor default: BRAPI (`https://brapi.dev/api/quote/{TICKER}`) — sem API key para uso básico. Estrutura permite trocar por Alpha Vantage/HG Brasil só mudando o adaptador.
- Cache 15 min em `market_quotes_cache` para reduzir chamadas e latência.
- React Query para todas as leituras (`staleTime: 60_000`).
- Realtime opcional (não incluído nesta fase) para atualizações automáticas.

Confirma para eu implementar? Se quiser posso restringir Investimentos ao plano Premium desde o início — só avisar.
