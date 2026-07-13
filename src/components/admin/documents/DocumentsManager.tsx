import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Plus, Search, ArrowLeft, Loader2, Check, History, Trash2, Eye, ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { RichEditor } from './RichEditor';
import {
  DOCUMENT_TYPE_META,
  type DocumentRow, type DocumentType, type DocumentStatus,
} from '@/lib/documents/types';

const TYPE_OPTIONS: DocumentType[] = ['policy', 'terms', 'cookies', 'about', 'custom'];
const STATUS_OPTIONS: DocumentStatus[] = ['draft', 'published', 'archived'];

function slugify(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 80);
}

export default function DocumentsManager() {
  const { user } = useAuth();
  const [rows, setRows] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | DocumentType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | DocumentStatus>('all');
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('documents').select('*').order('updated_at', { ascending: false });
    setRows((data as any) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    return rows.filter(r => {
      if (typeFilter !== 'all' && r.tipo !== typeFilter) return false;
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!r.titulo.toLowerCase().includes(q) && !r.slug.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [rows, search, typeFilter, statusFilter]);

  const createNew = async () => {
    const titulo = window.prompt('Título do documento:');
    if (!titulo) return;
    const slug = slugify(titulo) || `doc-${Date.now()}`;
    const { data, error } = await supabase.from('documents').insert({
      slug, titulo, tipo: 'custom', status: 'draft', autor: user?.id ?? null,
      conteudo: { type: 'doc', content: [{ type: 'paragraph' }] },
    }).select('id').single();
    if (error) { toast.error(error.message); return; }
    await load();
    setEditingId((data as any).id);
  };

  const editing = editingId ? rows.find(r => r.id === editingId) ?? null : null;

  if (editing) {
    return (
      <DocumentEditorPanel
        doc={editing}
        onBack={() => { setEditingId(null); load(); }}
        onDeleted={() => { setEditingId(null); load(); }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por título ou slug..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={typeFilter} onValueChange={(v: any) => setTypeFilter(v)}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {TYPE_OPTIONS.map(t => (
              <SelectItem key={t} value={t}>{DOCUMENT_TYPE_META[t].icon} {DOCUMENT_TYPE_META[t].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="published">Publicado</SelectItem>
            <SelectItem value="draft">Rascunho</SelectItem>
            <SelectItem value="archived">Arquivado</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={createNew} className="gap-2"><Plus size={16} /> Novo documento</Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map(doc => (
            <Card key={doc.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setEditingId(doc.id)}>
              <CardContent className="p-4 flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-primary/15 text-primary flex items-center justify-center text-xl shrink-0">
                  {doc.icon ?? DOCUMENT_TYPE_META[doc.tipo].icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold truncate">{doc.titulo}</p>
                    <Badge variant={doc.status === 'published' ? 'default' : 'secondary'} className="text-[10px]">
                      {doc.status === 'published' ? 'Publicado' : doc.status === 'draft' ? 'Rascunho' : 'Arquivado'}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">v{doc.versao}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">/{doc.slug}</p>
                  {doc.subtitulo && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{doc.subtitulo}</p>}
                </div>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full text-center text-muted-foreground py-8">Nenhum documento encontrado.</div>
          )}
        </div>
      )}
    </div>
  );
}

/* ================= Editor Panel ================= */
interface EditorPanelProps { doc: DocumentRow; onBack: () => void; onDeleted: () => void; }

function DocumentEditorPanel({ doc, onBack, onDeleted }: EditorPanelProps) {
  const [state, setState] = useState<DocumentRow>(doc);
  const [savingStatus, setSavingStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [showVersions, setShowVersions] = useState(false);
  const [versions, setVersions] = useState<any[]>([]);
  const saveTimer = useRef<any>(null);
  const initialLoad = useRef(true);

  useEffect(() => { setState(doc); initialLoad.current = true; }, [doc.id]);

  useEffect(() => {
    if (initialLoad.current) { initialLoad.current = false; return; }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSavingStatus('saving');
    saveTimer.current = setTimeout(async () => {
      const { error } = await supabase.from('documents').update({
        titulo: state.titulo,
        subtitulo: state.subtitulo,
        conteudo: state.conteudo,
        icon: state.icon,
        cover_image: state.cover_image,
        status: state.status,
        seo_title: state.seo_title,
        seo_description: state.seo_description,
        seo_image: state.seo_image,
        published_at: state.status === 'published' && !state.published_at ? new Date().toISOString() : state.published_at,
      }).eq('id', state.id);
      if (error) { setSavingStatus('error'); toast.error(error.message); }
      else setSavingStatus('saved');
    }, 800);
    return () => saveTimer.current && clearTimeout(saveTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.titulo, state.subtitulo, state.conteudo, state.icon, state.cover_image, state.status, state.seo_title, state.seo_description, state.seo_image]);

  const loadVersions = useCallback(async () => {
    const { data } = await supabase.from('document_versions').select('*').eq('document_id', doc.id).order('versao', { ascending: false });
    setVersions(data ?? []);
  }, [doc.id]);

  useEffect(() => { if (showVersions) loadVersions(); }, [showVersions, loadVersions]);

  const restoreVersion = async (v: any) => {
    if (!window.confirm(`Restaurar versão ${v.versao}? A versão atual será mantida no histórico.`)) return;
    setState(s => ({ ...s, titulo: v.titulo, subtitulo: v.subtitulo, conteudo: v.conteudo }));
    toast.success(`Versão ${v.versao} restaurada.`);
  };

  const remove = async () => {
    if (!window.confirm('Excluir este documento permanentemente?')) return;
    const { error } = await supabase.from('documents').delete().eq('id', doc.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Documento excluído.');
    onDeleted();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-2"><ArrowLeft size={16} /> Voltar</Button>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {savingStatus === 'saving' && <><Loader2 size={14} className="animate-spin" /> Salvando...</>}
          {savingStatus === 'saved' && <><Check size={14} className="text-green-500" /> Alterações salvas</>}
          {savingStatus === 'error' && <span className="text-destructive">Erro ao salvar</span>}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowVersions(v => !v)} className="gap-2">
            <History size={14} /> Versões
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.open(`/#/d/${state.slug}`, '_blank')} className="gap-2">
            <ExternalLink size={14} /> Ver página
          </Button>
          <Button variant="destructive" size="sm" onClick={remove} className="gap-2"><Trash2 size={14} /></Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              className="w-16 text-center text-2xl"
              value={state.icon ?? ''}
              onChange={e => setState(s => ({ ...s, icon: e.target.value }))}
              placeholder="🎨"
              maxLength={4}
            />
            <Input
              className="flex-1 text-2xl font-bold h-14"
              value={state.titulo}
              onChange={e => setState(s => ({ ...s, titulo: e.target.value }))}
              placeholder="Título"
            />
          </div>
          <Input
            value={state.subtitulo ?? ''}
            onChange={e => setState(s => ({ ...s, subtitulo: e.target.value }))}
            placeholder="Subtítulo (opcional)"
            className="text-muted-foreground"
          />
          <RichEditor
            value={state.conteudo}
            onChange={(json) => setState(s => ({ ...s, conteudo: json }))}
            placeholder="Escreva o conteúdo do documento..."
          />
        </div>

        <aside className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Status</label>
                <Select value={state.status} onValueChange={(v: DocumentStatus) => setState(s => ({ ...s, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(s => (
                      <SelectItem key={s} value={s}>
                        {s === 'published' ? 'Publicado' : s === 'draft' ? 'Rascunho' : 'Arquivado'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Slug</label>
                <Input value={state.slug} disabled className="font-mono text-xs" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Versão</label>
                <p className="text-sm">v{state.versao}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">SEO</p>
              <Input
                value={state.seo_title ?? ''}
                onChange={e => setState(s => ({ ...s, seo_title: e.target.value }))}
                placeholder="Título SEO"
              />
              <Textarea
                value={state.seo_description ?? ''}
                onChange={e => setState(s => ({ ...s, seo_description: e.target.value }))}
                placeholder="Descrição para buscadores"
                rows={3}
              />
              <Input
                value={state.seo_image ?? ''}
                onChange={e => setState(s => ({ ...s, seo_image: e.target.value }))}
                placeholder="URL da imagem social"
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Aparência</p>
              <Input
                value={state.cover_image ?? ''}
                onChange={e => setState(s => ({ ...s, cover_image: e.target.value }))}
                placeholder="URL imagem de capa"
              />
            </CardContent>
          </Card>

          {showVersions && (
            <Card>
              <CardContent className="p-4 space-y-2 max-h-[400px] overflow-y-auto">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Histórico</p>
                {versions.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma versão anterior.</p>}
                {versions.map(v => (
                  <button
                    key={v.id}
                    onClick={() => restoreVersion(v)}
                    className="w-full text-left p-2 rounded-md border border-border hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">v{v.versao}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(v.created_at).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{v.titulo}</p>
                  </button>
                ))}
              </CardContent>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}
