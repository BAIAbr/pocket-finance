# 📑 Central de Documentos Finango — Plano de Implementação

Vou construir um CMS interno para documentos institucionais e um Changelog público, tudo administrável pelo painel admin, sem tocar em nada existente.

## Escopo

**Documentos institucionais** (Política de Privacidade, Termos de Uso, Política de Cookies, Sobre) + **Changelog** (Novidades) — todos criados/editados via admin, publicados em rotas públicas.

## Banco de dados (incremental, novas tabelas)

- `documents` — id, slug único, tipo (`policy` | `terms` | `cookies` | `about` | `changelog` | `custom`), titulo, subtitulo, conteudo (JSONB do editor), icon, cover_image, status (`published` | `draft` | `archived`), versao, seo_title, seo_description, seo_image, autor (uuid), published_at, timestamps.
- `document_versions` — histórico completo (document_id, versao, conteudo snapshot, autor, resumo_alteracao, created_at).
- `changelog_entries` — versao, titulo, descricao (JSONB), categoria (enum: novidade/melhoria/correcao/seguranca/performance/premium/planejamento/investimentos/cartoes/ia), icon, image, tags[], published_at, is_highlight, status.
- `changelog_views` — user_id + entry_id (para remover destaque após visualização).

RLS: `SELECT` público em linhas `published`; `INSERT/UPDATE/DELETE` apenas admin (via `has_role`). GRANTs completos + trigger de auto-versionamento em `documents` (INSERT em `document_versions` a cada UPDATE).

## Editor rico (admin)

Uso `@tiptap/react` + extensões: StarterKit, Underline, Link, Image, Table, TaskList, CodeBlockLowlight, Placeholder, TextAlign, Highlight, Blockquote, HorizontalRule, Headings H1-H6. Toolbar flutuante estilo Notion. Callouts/alertas via nó customizado.

Salvamento automático com debounce 800ms → indicador "Salvando... / ✓ Salvo". Cada save cria uma versão nova via trigger. Painel lateral com histórico de versões e botão "Restaurar".

## Painel Administrativo

Nova aba em `AdminDashboard.tsx`: **📑 Documentos**
- Lista de documentos (busca, filtro por tipo/status)
- Botão "Novo documento"
- Editor em tela cheia com: título, subtítulo, ícone (emoji picker), imagem de capa (upload no bucket `document-assets`), corpo (Tiptap), painel lateral com SEO, status, versões
- Aba secundária **🚀 Changelog** — CRUD de entradas com categoria, tags, versão, destaque.

## Rotas públicas (novas, não conflitam)

- `/politica-de-privacidade`
- `/termos-de-uso`
- `/politica-de-cookies`
- `/sobre`
- `/novidades` (lista de changelog com filtros por versão/categoria/ano/busca)
- `/documentos/:slug` (fallback genérico para documentos customizados)

Cada página renderiza o JSON do Tiptap com o mesmo schema (componente `DocumentRenderer`). Meta tags via `react-helmet-async` (instalar), canonical + OG. Sumário (TOC) gerado automaticamente a partir dos headings, com scroll suave. Botões: Baixar PDF (jsPDF já instalado), Imprimir, Copiar link, Compartilhar (Web Share API).

## Home — destaque de novidade

Card discreto no Dashboard quando existir `changelog_entries.is_highlight = true` que o usuário ainda não visualizou. Ao clicar em "Ver Novidades" → registra em `changelog_views` e some.

## Toast de atualização

Ao logar, se houver changelog com versão > última vista → toast "🔔 O Finango foi atualizado!".

## Acessibilidade / UX

Controles de fonte (A- / A+) e alto contraste na página pública (persistido em localStorage). Navegação teclado nativa via Tiptap. Tema claro/escuro herda do ThemeContext.

## Seed inicial

Migração cria as 5 primeiras entradas em `documents` (Política, Termos, Cookies, Sobre) + 1 entrada de Changelog exemplo (v2.1.0 Dashboard Personalizável), todas com conteúdo padrão editável — nada hardcoded no front.

## Segurança

- RLS admin-only para escrita
- Log em `security_events` a cada publicação/restauração
- Bucket `document-assets` privado com policy: read público apenas para arquivos referenciados em documentos publicados; write só admin

## Pacotes a instalar

`@tiptap/react @tiptap/starter-kit @tiptap/extension-*` (underline, link, image, table, task-list, code-block-lowlight, placeholder, text-align, highlight), `lowlight`, `react-helmet-async`.

## Fora de escopo (preservado, sem alteração)

Dashboard, Perfil, Planejamento, Metas, IA, Investimentos, Parcelamentos, Auth, Family, categorias existentes, importador. Nenhum arquivo dessas áreas será tocado.

## Detalhes técnicos

- Conteúdo armazenado como JSON do Tiptap (não HTML) para segurança e portabilidade; PDF/renderização usa serializer próprio.
- Auto-save: `useEffect` + debounce + `upsert` no Supabase; trigger PL/pgSQL cuida do versionamento (evita corrida).
- Realtime: `documents` publica em `supabase_realtime` para que edições apareçam ao vivo em outras abas admin.
- Busca full-text: coluna `tsvector` gerada + índice GIN sobre título/subtítulo/plaintext do conteúdo.

Confirma que devo prosseguir com essa implementação?
