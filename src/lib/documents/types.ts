export type DocumentType = 'policy' | 'terms' | 'cookies' | 'about' | 'changelog' | 'custom';
export type DocumentStatus = 'published' | 'draft' | 'archived';
export type ChangelogCategory =
  | 'novidade' | 'melhoria' | 'correcao' | 'seguranca' | 'performance'
  | 'premium' | 'planejamento' | 'investimentos' | 'cartoes' | 'ia';

export interface DocumentRow {
  id: string;
  slug: string;
  tipo: DocumentType;
  titulo: string;
  subtitulo: string | null;
  conteudo: any;
  icon: string | null;
  cover_image: string | null;
  status: DocumentStatus;
  versao: number;
  seo_title: string | null;
  seo_description: string | null;
  seo_image: string | null;
  autor: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChangelogEntryRow {
  id: string;
  versao: string;
  titulo: string;
  descricao: any;
  categoria: ChangelogCategory;
  icon: string | null;
  image: string | null;
  tags: string[];
  status: DocumentStatus;
  is_highlight: boolean;
  published_at: string | null;
  autor: string | null;
  created_at: string;
  updated_at: string;
}

export const CATEGORY_META: Record<ChangelogCategory, { label: string; icon: string; color: string }> = {
  novidade:      { label: 'Novidade',     icon: '✨', color: 'bg-primary/15 text-primary' },
  melhoria:      { label: 'Melhoria',     icon: '🚀', color: 'bg-blue-500/15 text-blue-600 dark:text-blue-400' },
  correcao:      { label: 'Correção',    icon: '🐞', color: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' },
  seguranca:     { label: 'Segurança',   icon: '🔒', color: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' },
  performance:   { label: 'Performance',  icon: '⚡', color: 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400' },
  premium:       { label: 'Premium',      icon: '💎', color: 'bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-400' },
  planejamento:  { label: 'Planejamento', icon: '🎯', color: 'bg-teal-500/15 text-teal-600 dark:text-teal-400' },
  investimentos: { label: 'Investimentos',icon: '📈', color: 'bg-green-500/15 text-green-600 dark:text-green-400' },
  cartoes:       { label: 'Cartões',      icon: '💳', color: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400' },
  ia:            { label: 'IA',           icon: '🤖', color: 'bg-purple-500/15 text-purple-600 dark:text-purple-400' },
};

export const DOCUMENT_TYPE_META: Record<DocumentType, { label: string; icon: string }> = {
  policy:    { label: 'Política de Privacidade', icon: '🔒' },
  terms:     { label: 'Termos de Uso',            icon: '📄' },
  cookies:   { label: 'Política de Cookies',      icon: '🍪' },
  about:     { label: 'Sobre',                    icon: 'ℹ️' },
  changelog: { label: 'Changelog',                icon: '🚀' },
  custom:    { label: 'Personalizado',            icon: '📑' },
};
