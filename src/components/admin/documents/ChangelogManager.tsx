import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, ArrowLeft, Loader2, Check, Star, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { RichEditor } from './RichEditor';
import { CATEGORY_META, type ChangelogEntryRow, type ChangelogCategory, type DocumentStatus } from '@/lib/documents/types';

const CATEGORIES = Object.keys(CATEGORY_META) as ChangelogCategory[];

export default function ChangelogManager() {
  const { user } = useAuth();
  const [rows, setRows] = useState<ChangelogEntryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('changelog_entries').select('*').order('created_at', { ascending: false });
    setRows((data as any) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const createNew = async () => {
    const titulo = window.prompt('Título da novidade:');
    if (!titulo) return;
    const versao = window.prompt('Versão (ex: 2.1.0):', '1.0.0') ?? '1.0.0';
    const { data, error } = await supabase.from('changelog_entries').insert({
      titulo, versao, categoria: 'novidade', status: 'draft', autor: user?.id ?? null,
      descricao: { type: 'doc', content: [{ type: 'paragraph' }] },
    }).select('id').single();
    if (error) { toast.error(error.message); return; }
    await load();
    setEditingId((data as any).id);
  };

  const editing = editingId ? rows.find(r => r.id === editingId) ?? null : null;
  if (editing) return <ChangelogEntryEditor entry={editing} onBack={() => { setEditingId(null); load(); }} onDeleted={() => { setEditingId(null); load(); }} />;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">Publique novidades, melhorias e correções. Marcadas como destaque aparecem no dashboard dos usuários.</p>
        <Button onClick={createNew} className="gap-2"><Plus size={16} /> Nova entrada</Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="space-y-3">
          {rows.map(e => (
            <Card key={e.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setEditingId(e.id)}>
              <CardContent className="p-4 flex items-start gap-3">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 ${CATEGORY_META[e.categoria].color}`}>
                  {e.icon ?? CATEGORY_META[e.categoria].icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold truncate">{e.titulo}</p>
                    <Badge variant="outline" className="text-[10px]">v{e.versao}</Badge>
                    <Badge className={`text-[10px] ${CATEGORY_META[e.categoria].color}`}>{CATEGORY_META[e.categoria].label}</Badge>
                    <Badge variant={e.status === 'published' ? 'default' : 'secondary'} className="text-[10px]">
                      {e.status === 'published' ? 'Publicado' : e.status === 'draft' ? 'Rascunho' : 'Arquivado'}
                    </Badge>
                    {e.is_highlight && <Badge className="text-[10px] bg-primary/20 text-primary gap-1"><Star size={10} /> Destaque</Badge>}
                  </div>
                  {e.published_at && <p className="text-xs text-muted-foreground mt-1">Publicado em {new Date(e.published_at).toLocaleDateString('pt-BR')}</p>}
                </div>
              </CardContent>
            </Card>
          ))}
          {rows.length === 0 && <div className="text-center text-muted-foreground py-8">Nenhuma entrada de changelog ainda.</div>}
        </div>
      )}
    </div>
  );
}

function ChangelogEntryEditor({ entry, onBack, onDeleted }: { entry: ChangelogEntryRow; onBack: () => void; onDeleted: () => void }) {
  const [state, setState] = useState<ChangelogEntryRow>(entry);
  const [savingStatus, setSavingStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const saveTimer = useRef<any>(null);
  const initialLoad = useRef(true);

  useEffect(() => { setState(entry); initialLoad.current = true; }, [entry.id]);

  useEffect(() => {
    if (initialLoad.current) { initialLoad.current = false; return; }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSavingStatus('saving');
    saveTimer.current = setTimeout(async () => {
      const { error } = await supabase.from('changelog_entries').update({
        titulo: state.titulo,
        versao: state.versao,
        descricao: state.descricao,
        categoria: state.categoria,
        icon: state.icon,
        image: state.image,
        tags: state.tags,
        status: state.status,
        is_highlight: state.is_highlight,
        published_at: state.status === 'published' && !state.published_at ? new Date().toISOString() : state.published_at,
      }).eq('id', state.id);
      if (error) { setSavingStatus('error'); toast.error(error.message); }
      else setSavingStatus('saved');
    }, 800);
    return () => saveTimer.current && clearTimeout(saveTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.titulo, state.versao, state.descricao, state.categoria, state.icon, state.image, state.tags, state.status, state.is_highlight]);

  const remove = async () => {
    if (!window.confirm('Excluir esta entrada?')) return;
    const { error } = await supabase.from('changelog_entries').delete().eq('id', state.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Entrada excluída.');
    onDeleted();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-2"><ArrowLeft size={16} /> Voltar</Button>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {savingStatus === 'saving' && <><Loader2 size={14} className="animate-spin" /> Salvando...</>}
          {savingStatus === 'saved' && <><Check size={14} className="text-green-500" /> Salvo</>}
        </div>
        <Button variant="destructive" size="sm" onClick={remove} className="gap-2"><Trash2 size={14} /></Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input className="w-16 text-center text-2xl" value={state.icon ?? ''} onChange={e => setState(s => ({ ...s, icon: e.target.value }))} placeholder={CATEGORY_META[state.categoria].icon} maxLength={4} />
            <Input className="flex-1 text-2xl font-bold h-14" value={state.titulo} onChange={e => setState(s => ({ ...s, titulo: e.target.value }))} placeholder="Título" />
          </div>
          <RichEditor value={state.descricao} onChange={(json) => setState(s => ({ ...s, descricao: json }))} placeholder="Descreva a novidade..." />
        </div>

        <aside className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Versão</label>
                <Input value={state.versao} onChange={e => setState(s => ({ ...s, versao: e.target.value }))} placeholder="2.1.0" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Categoria</label>
                <Select value={state.categoria} onValueChange={(v: ChangelogCategory) => setState(s => ({ ...s, categoria: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => (
                      <SelectItem key={c} value={c}>{CATEGORY_META[c].icon} {CATEGORY_META[c].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Status</label>
                <Select value={state.status} onValueChange={(v: DocumentStatus) => setState(s => ({ ...s, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="published">Publicado</SelectItem>
                    <SelectItem value="draft">Rascunho</SelectItem>
                    <SelectItem value="archived">Arquivado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between pt-2">
                <div>
                  <p className="text-sm font-medium">Destaque</p>
                  <p className="text-xs text-muted-foreground">Aparecer no dashboard</p>
                </div>
                <Switch checked={state.is_highlight} onCheckedChange={v => setState(s => ({ ...s, is_highlight: v }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Tags (separadas por vírgula)</label>
                <Input
                  value={state.tags.join(', ')}
                  onChange={e => setState(s => ({ ...s, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) }))}
                  placeholder="premium, ia, novo"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Mídia</p>
              <Textarea value={state.image ?? ''} onChange={e => setState(s => ({ ...s, image: e.target.value }))} rows={2} placeholder="URL da imagem/screenshot" />
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
