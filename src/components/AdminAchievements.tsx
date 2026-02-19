import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { getIconByName } from '@/lib/icons';
import { RARITY_CONFIG } from '@/hooks/useMissions';
import { Plus, Pencil, Trash2, Upload, ImageIcon, Loader2, Trophy, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MissionRow {
  id: string;
  key: string;
  name: string;
  description: string;
  icon: string;
  xp_reward: number;
  category: string;
  medal_type: string;
  rarity: string;
  image_url: string | null;
  created_at: string;
}

const ICON_OPTIONS = [
  'Trophy', 'Target', 'Star', 'Flame', 'Crown', 'Sparkles', 'Zap', 'Award',
  'Medal', 'Heart', 'TrendingUp', 'PiggyBank', 'Wallet', 'Receipt',
  'ShoppingBag', 'Briefcase', 'GraduationCap', 'Shield', 'Gem', 'Rocket',
];

const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB

export default function AdminAchievements() {
  const [missions, setMissions] = useState<MissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingMission, setEditingMission] = useState<MissionRow | null>(null);
  const [deletingMission, setDeletingMission] = useState<MissionRow | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: '',
    description: '',
    key: '',
    icon: 'Trophy',
    xp_reward: 10,
    category: 'general',
    medal_type: 'bronze',
    rarity: 'common',
  });

  const fetchMissions = async () => {
    const { data, error } = await supabase.from('missions').select('*').order('created_at', { ascending: false });
    if (error) { toast.error('Erro ao carregar conquistas'); return; }
    setMissions((data as unknown as MissionRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchMissions(); }, []);

  const openCreate = () => {
    setEditingMission(null);
    setForm({ name: '', description: '', key: '', icon: 'Trophy', xp_reward: 10, category: 'general', medal_type: 'bronze', rarity: 'common' });
    setImagePreview(null);
    setImageFile(null);
    setDialogOpen(true);
  };

  const openEdit = (m: MissionRow) => {
    setEditingMission(m);
    setForm({ name: m.name, description: m.description, key: m.key, icon: m.icon, xp_reward: m.xp_reward, category: m.category, medal_type: m.medal_type, rarity: m.rarity });
    setImagePreview(m.image_url);
    setImageFile(null);
    setDialogOpen(true);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      toast.error('Formato não suportado. Use PNG, JPG ou WEBP.');
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      toast.error('Imagem muito grande. Máximo 2MB.');
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const uploadImage = async (missionId: string): Promise<string | null> => {
    if (!imageFile) return editingMission?.image_url ?? null;

    setUploading(true);
    try {
      const ext = imageFile.name.split('.').pop()?.toLowerCase() || 'png';
      const path = `${missionId}.${ext}`;

      // Delete old image if exists
      if (editingMission?.image_url) {
        const oldPath = editingMission.image_url.split('/achievements/')[1];
        if (oldPath) await supabase.storage.from('achievements').remove([oldPath]);
      }

      const { error } = await supabase.storage.from('achievements').upload(path, imageFile, {
        cacheControl: '3600',
        upsert: true,
        contentType: imageFile.type,
      });

      if (error) throw error;

      const { data: urlData } = supabase.storage.from('achievements').getPublicUrl(path);
      return urlData.publicUrl;
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Erro ao enviar imagem.');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.key.trim()) {
      toast.error('Nome e chave são obrigatórios.');
      return;
    }
    setSaving(true);

    try {
      if (editingMission) {
        const imageUrl = await uploadImage(editingMission.id);
        const { error } = await supabase.from('missions').update({
          name: form.name.trim(),
          description: form.description.trim(),
          key: form.key.trim(),
          icon: form.icon,
          xp_reward: form.xp_reward,
          category: form.category,
          medal_type: form.medal_type,
          rarity: form.rarity,
          image_url: imageUrl,
        } as any).eq('id', editingMission.id);

        if (error) throw error;
        toast.success('Conquista atualizada!');
      } else {
        const tempId = crypto.randomUUID();
        const imageUrl = imageFile ? await uploadImage(tempId) : null;

        const { error } = await supabase.from('missions').insert({
          name: form.name.trim(),
          description: form.description.trim(),
          key: form.key.trim(),
          icon: form.icon,
          xp_reward: form.xp_reward,
          category: form.category,
          medal_type: form.medal_type,
          rarity: form.rarity,
          image_url: imageUrl,
        } as any);

        if (error) throw error;
        toast.success('Conquista criada!');
      }

      setDialogOpen(false);
      fetchMissions();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingMission) return;
    try {
      if (deletingMission.image_url) {
        const path = deletingMission.image_url.split('/achievements/')[1];
        if (path) await supabase.storage.from('achievements').remove([path]);
      }
      const { error } = await supabase.from('missions').delete().eq('id', deletingMission.id);
      if (error) throw error;
      toast.success('Conquista excluída.');
      setDeleteDialogOpen(false);
      setDeletingMission(null);
      fetchMissions();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao excluir.');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy size={18} className="text-primary" />
              Gerenciar Conquistas ({missions.length})
            </CardTitle>
            <Button size="sm" onClick={openCreate} className="gap-1.5">
              <Plus size={14} />
              Nova
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {missions.map((m) => {
            const rarity = RARITY_CONFIG[m.rarity] ?? RARITY_CONFIG.common;
            const IconComp = getIconByName(m.icon);
            return (
              <div key={m.id} className={cn(
                'flex items-center gap-3 rounded-lg border p-3',
                rarity.border, rarity.bg
              )}>
                {m.image_url ? (
                  <img
                    src={m.image_url}
                    alt={m.name}
                    className="w-10 h-10 rounded-lg object-contain bg-transparent"
                    loading="lazy"
                  />
                ) : (
                  <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br', rarity.color)}>
                    <IconComp size={18} className="text-white" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{m.name}</p>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {rarity.emoji} {rarity.label}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">+{m.xp_reward} XP</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(m)}>
                    <Pencil size={14} />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { setDeletingMission(m); setDeleteDialogOpen(true); }}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            );
          })}
          {missions.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">Nenhuma conquista cadastrada.</p>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingMission ? 'Editar Conquista' : 'Nova Conquista'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Image Upload */}
            <div className="space-y-2">
              <Label>Imagem</Label>
              <div className="flex items-center gap-3">
                <div
                  className="w-20 h-20 rounded-xl border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary transition-colors overflow-hidden bg-muted/30"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-contain" />
                  ) : (
                    <ImageIcon size={24} className="text-muted-foreground" />
                  )}
                </div>
                <div className="space-y-1.5">
                  <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-1.5">
                    <Upload size={14} />
                    {imagePreview ? 'Alterar' : 'Enviar'}
                  </Button>
                  {imagePreview && (
                    <Button variant="ghost" size="sm" className="gap-1 text-destructive" onClick={() => { setImagePreview(null); setImageFile(null); }}>
                      <X size={14} />
                      Remover
                    </Button>
                  )}
                  <p className="text-[10px] text-muted-foreground">PNG, JPG, WEBP • Máx 2MB</p>
                </div>
              </div>
              <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleImageSelect} />
            </div>

            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value.slice(0, 60) }))} placeholder="Ex: Primeira Transação" maxLength={60} />
              <p className="text-[10px] text-muted-foreground text-right">{form.name.length}/60</p>
            </div>

            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value.slice(0, 200) }))} placeholder="Descrição da conquista..." maxLength={200} rows={3} />
              <p className="text-[10px] text-muted-foreground text-right">{form.description.length}/200</p>
            </div>

            <div className="space-y-1.5">
              <Label>Chave (identificador único) *</Label>
              <Input value={form.key} onChange={(e) => setForm(f => ({ ...f, key: e.target.value.replace(/[^a-z0-9_]/g, '').slice(0, 40) }))} placeholder="ex: first_transaction" disabled={!!editingMission} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Ícone (fallback)</Label>
                <Select value={form.icon} onValueChange={(v) => setForm(f => ({ ...f, icon: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ICON_OPTIONS.map(icon => {
                      const IC = getIconByName(icon);
                      return (
                        <SelectItem key={icon} value={icon}>
                          <span className="flex items-center gap-2"><IC size={14} /> {icon}</span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>XP</Label>
                <Input type="number" value={form.xp_reward} onChange={(e) => setForm(f => ({ ...f, xp_reward: Math.max(1, parseInt(e.target.value) || 1) }))} min={1} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Raridade</Label>
                <Select value={form.rarity} onValueChange={(v) => setForm(f => ({ ...f, rarity: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="common">⚪ Comum</SelectItem>
                    <SelectItem value="rare">🔵 Raro</SelectItem>
                    <SelectItem value="epic">🟣 Épico</SelectItem>
                    <SelectItem value="legendary">💎 Lendário</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Categoria</Label>
                <Select value={form.category} onValueChange={(v) => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">Geral</SelectItem>
                    <SelectItem value="financial">Financeiro</SelectItem>
                    <SelectItem value="streak">Streak</SelectItem>
                    <SelectItem value="savings">Poupança</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || uploading} className="gap-1.5">
              {(saving || uploading) && <Loader2 size={14} className="animate-spin" />}
              {editingMission ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir Conquista</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir <strong>{deletingMission?.name}</strong>? Esta ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
