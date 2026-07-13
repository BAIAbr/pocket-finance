# 📥 Importador Inteligente + Exportação/Backup — Plano

Implementação 100% nativa (Lovable + Supabase + bibliotecas open source). Nada existente será removido; a construção é incremental.

## 1. Banco de dados (migração)

Novas tabelas em `public` (com GRANTs, RLS por `auth.uid()`, timestamps + trigger `update_updated_at_column`):

- `import_history` — id, user_id, family_id?, file_name, file_type (ofx|csv|xlsx), bank_detected, records_total, records_imported, income_total, expense_total, status (pending|processing|success|error|partial), error_message, raw_summary jsonb, created_at, updated_at.
- `import_rules` — id, user_id, pattern text (uppercase normalizado), category_id, match_type (contains|equals|regex), hits int default 0, created_at, updated_at, UNIQUE(user_id, pattern).
- `imported_transactions_map` — id, transaction_id FK transactions, import_id FK import_history, external_hash text (para dedup), UNIQUE(user_id, external_hash).

Adicionar coluna `import_id uuid` (nullable) em `transactions` para rastreabilidade. Coluna `source text default 'manual'` para diferenciar (`manual|ofx|csv|xlsx|recurring`).

Realtime já cobre `transactions`; adicionar `import_history` à publication.

## 2. Regras de categorização (semente)

Arquivo `src/lib/import/categoryRules.ts` — dicionário estático (~150 regras: UBER/99/IFOOD/BURGER/MCDONALDS/NETFLIX/SPOTIFY/DISNEY/PRIME/GOOGLE PLAY/APPLE/AMAZON/MERCADO LIVRE/SHOPEE/POSTO/SHELL/IPIRANGA/FARMACIA/DROGA/PAGUEMENOS/MERCADO/CARREFOUR/EXTRA/PIX/TED/DOC/BOLETO/etc). Cada regra referencia uma categoria default por `name` (resolvida em runtime contra `categories` do usuário; se não existir, usa "Outros" do tipo correto).

Aprendizado: quando o usuário altera categoria numa linha do preview, cria/atualiza `import_rules` para aquele padrão normalizado (>=3 chars, ignorando números e códigos de transação).

## 3. Parsers (client-side, open source)

- OFX: parser próprio simples (regex de `<STMTTRN>…</STMTTRN>` — suficiente para OFX 1.x/2.x brasileiros; extrai `DTPOSTED`, `TRNAMT`, `MEMO`, `NAME`, `FITID`, `BANKID`).
- CSV: `papaparse` (já elegível). Detecta cabeçalho, mapeia colunas (data/descrição/valor) via heurística + UI de mapeamento manual.
- XLSX: `xlsx` (SheetJS community). Mesma heurística/mapeamento.

Dedup hash: `sha256(user_id + date + amount + normalize(description))` calculado em JS (`crypto.subtle`). Comparado contra `imported_transactions_map.external_hash`.

## 4. Fluxo/UX

Rota nova `/settings/import` (assistente) + `/settings/import/history`.

Wizard em 5 passos com animações (framer-motion já usado):

1. **Escolha o tipo** — cards OFX / CSV / XLSX.
2. **Upload** — dropzone; valida extensão, tamanho (<10MB), integridade (parser tenta ler).
3. **Detecção** — mostra banco/conta/período/qtd. Se CSV/XLSX e mapeamento ambíguo, exibe UI para escolher colunas.
4. **Preview** — tabela editável (categoria via combobox, descrição, tipo, incluir/excluir linha). Marca duplicados com badge; ação em massa Ignorar/Substituir/Importar. Resumo lateral (receitas, despesas, saldo, dedup, categorias).
5. **Importação** — barra de progresso (chunks de 50 linhas via `for…of` + `await`), atualiza `import_history` em tempo real. Ao final, toast + link para o dashboard. Salva regras aprendidas.

Processamento é assíncrono no cliente com `requestIdleCallback` fallback `setTimeout(0)` entre chunks para não travar UI. Grande volume (>500 linhas) mostra "processando em segundo plano" e permite navegar (mantido em contexto `ImportContext`).

## 5. Histórico de importações

Página lista `import_history` com filtros. Ações:
- Ver detalhes (linhas importadas via `imported_transactions_map`).
- Excluir importação → rollback opcional (apaga transações vinculadas a esse `import_id`, com confirmação dupla).
- Re-download: arquivo original NÃO é armazenado (privacidade + custo). Em vez disso, exporta as transações daquele import como CSV/JSON.

## 6. Exportação (funcional)

Em `DataSettings.tsx` substituir "Em breve" por implementações reais:
- **CSV**: `papaparse.unparse`.
- **Excel**: `xlsx` (SheetJS).
- **PDF**: `jspdf` + `jspdf-autotable` (tabela simples com resumo).
- **JSON**: já funciona (mantém).

Todos exportam transações + metas + categorias + planejamento + investimentos + preferências (dependendo do escopo escolhido).

## 7. Backup / Restauração

- Backup: JSON completo (transactions, goals, categories, planning, investments, installments, recurring, savings, preferences). Já parcialmente implementado — expandir.
- Restauração: novo modal com upload → validação de schema (versão + shape) → resumo → escolha "Substituir" (apaga e insere) ou "Mesclar" (dedup por id). Nunca apaga sem confirmação explícita.

## 8. Login Google / Apple

- Google: página `SubscriptionSettings` ou nova subseção "Contas conectadas" mostra e-mail vinculado (via `supabase.auth.getUser().identities`), botões Vincular/Desvincular/Trocar (`supabase.auth.linkIdentity` / `unlinkIdentity`).
- Apple: detecta se provider Apple está habilitado no projeto (chamando `supabase.auth.signInWithOAuth({provider:'apple'})` em modo "check"). Se admin → alerta "Provider Apple não configurado no backend". Nunca "Em breve".

## 9. Assinatura

Aprimorar `SubscriptionSettings.tsx` já existente: mostra plano atual, código VIP ativo (se houver via `vip_redemptions`), benefícios, expiração, histórico de redenções. Arquitetura para gateway fica como TODO documentado no código.

## 10. Segurança e validação

- Whitelist de MIME + extensão + tamanho.
- Sanitização de strings (`DOMPurify` ou normalização simples via regex).
- Log em `security_events` para cada import (user_id, action='import', file_type, records).
- RLS garantindo isolamento por usuário/família.

## 11. Testes

- Vitest: parser OFX, parser CSV mapping, dedup hash, aplicação de regras.
- Playwright manual: fluxo OFX pequeno de exemplo → verifica dashboard atualiza.

## 12. Rotas e navegação

- Adicionar em `App.tsx`: `/settings/import`, `/settings/import/history`, `/settings/connected-accounts`.
- Em `DataSettings.tsx`: linkar "Importar dados" → `/settings/import`; "Restaurar backup" abre modal; exportações passam a funcionar.

## 13. Dependências

Adicionar via `bun add`: `papaparse`, `@types/papaparse`, `xlsx`, `jspdf`, `jspdf-autotable`. Todas open source, sem custo.

## 14. Escopo NÃO alterado

Perfil, Dashboard, Planejamento, Metas, Investimentos, IA, Categorias, Cartões, Famílias, Missões — não são modificados; apenas passam a receber dados via as novas importações.

## Ordem de entrega

1. Migração (tabelas + RLS + GRANTs + coluna em transactions).
2. Deps + parsers + regras estáticas + hash dedup (utils).
3. Contexto `ImportContext` + wizard UI + rotas.
4. Histórico de importações.
5. Exportações reais (CSV/XLSX/PDF).
6. Restauração de backup.
7. Contas conectadas (Google/Apple).
8. Testes Vitest dos parsers.

Confirma que devo prosseguir com essa implementação completa?
