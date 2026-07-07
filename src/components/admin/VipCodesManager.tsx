import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Trash2, Copy, Crown, Link as LinkIcon } from 'lucide-react';
import { toast } from 'sonner';

interface VipCode {
  id: string;
  code: string;
  description: string | null;
  plan_code: string;
  duration_days: number;
  max_uses: number | null;
  uses_count: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

interface Plan { code: string; name: string }

export default function VipCodesManager() {
  const [codes, setCodes] = useState<VipCode[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    code: '',
    description: '',
    plan_code: '',
    duration_days: 30,
    max_uses: '' as string | number,
    expires_at: '',
  });

  const load = async () => {
    setLoading(true);
    const [{ data: c }, { data: p }] = await Promise.all([
      supabase.from('vip_codes').select('*').order('created_at', { ascending: false }),
      supabase.from('subscription_plans').select('code,name').eq('is_active', true).order('sort_order'),
    ]);
    setCodes((c as VipCode[]) || []);
    setPlans((p as Plan[]) || []);
    if (p && p.length && !form.plan_code) {
      setForm((f) => ({ ...f, plan_code: p[0].code }));
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const buildLink = (code: string) => `${window.location.origin}/#/vip/${code}`;

  const handleCopy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(buildLink(code));
      toast.success('Link copiado!');
    } catch {
      toast.error('Falha ao copiar');
    }
  };

  const handleCreate = async () => {
    const code = form.code.trim();
    if (!/^[A-Za-z0-9_-]{3,32}$/.test(code)) {
      toast.error('Código deve ter 3-32 caracteres (letras, números, _ ou -)');
      return;
    }
    if (!form.plan_code) return toast.error('Selecione um plano');
    setCreating(true);
    const { error } = await supabase.from('vip_codes').insert({
      code: code.toUpperCase(),
      description: form.description.trim() || null,
      plan_code: form.plan_code,
      duration_days: Number(form.duration_days) || 30,
      max_uses: form.max_uses === '' ? null : Number(form.max_uses),
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
    });
    setCreating(false);
    if (error) {
      toast.error(error.message.includes('duplicate') ? 'Este código já existe' : 'Erro ao criar código');
      return;
    }
    toast.success('Código criado');
    setForm({ ...form, code: '', description: '', max_uses: '', expires_at: '' });
    load();
  };

  const toggleActive = async (id: string, value: boolean) => {
    const { error } = await supabase.from('vip_codes').update({ is_active: value }).eq('id', id);
    if (error) toast.error('Erro ao atualizar');
    else { setCodes((cs) => cs.map((c) => c.id === id ? { ...c, is_active: value } : c)); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este código? As ativações já realizadas serão mantidas.')) return;
    const { error } = await supabase.from('vip_codes').delete().eq('id', id);
    if (error) toast.error('Erro ao excluir');
    else { setCodes((cs) => cs.filter((c) => c.id !== id)); toast.success('Removido'); }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Crown size={16} /> Novo código VIP</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <Label>Código</Label>
            <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="EX: BLACKFRIDAY" />
          </div>
          <div className="space-y-1">
            <Label>Plano</Label>
            <Select value={form.plan_code} onValueChange={(v) => setForm({ ...form, plan_code: v })}>
              <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
              <SelectContent>
                {plans.map((p) => <SelectItem key={p.code} value={p.code}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Duração (dias)</Label>
            <Input type="number" min={1} value={form.duration_days} onChange={(e) => setForm({ ...form, duration_days: Number(e.target.value) })} />
          </div>
          <div className="space-y-1">
            <Label>Limite de usos (opcional)</Label>
            <Input type="number" min={1} value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: e.target.value })} placeholder="Ilimitado" />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label>Descrição (opcional)</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
          </div>
          <div className="space-y-1">
            <Label>Expira em (opcional)</Label>
            <Input type="datetime-local" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
          </div>
          <div className="flex items-end">
            <Button className="w-full" onClick={handleCreate} disabled={creating}>
              {creating ? <Loader2 className="animate-spin mr-2" size={14} /> : <Plus className="mr-2" size={14} />}
              Criar código
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Códigos existentes</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="animate-spin" size={14} /> Carregando…</div>
          ) : codes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum código criado ainda.</p>
          ) : (
            <div className="space-y-2">
              {codes.map((c) => (
                <div key={c.id} className="border rounded-lg p-3 flex flex-col md:flex-row md:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-semibold">{c.code}</span>
                      <Badge variant={c.is_active ? 'default' : 'secondary'}>{c.is_active ? 'Ativo' : 'Inativo'}</Badge>
                      <Badge variant="outline">{c.plan_code}</Badge>
                      <Badge variant="outline">{c.duration_days}d</Badge>
                      <span className="text-xs text-muted-foreground">
                        {c.uses_count}{c.max_uses ? `/${c.max_uses}` : ''} usos
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground font-mono truncate mt-1 flex items-center gap-1">
                      <LinkIcon size={12} /> {buildLink(c.code)}
                    </div>
                    {c.description && <p className="text-xs text-muted-foreground mt-1">{c.description}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch checked={c.is_active} onCheckedChange={(v) => toggleActive(c.id, v)} />
                    <Button size="sm" variant="outline" onClick={() => handleCopy(c.code)}>
                      <Copy size={14} className="mr-1" /> Copiar link
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(c.id)}>
                      <Trash2 size={14} className="text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
