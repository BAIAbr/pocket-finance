import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft, Crown, Camera, LogOut, Shield, KeyRound, Pencil, Trophy,
  Calendar, Mail, ChevronRight, Sparkles, User as UserIcon, Loader2,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePlanAccess } from '@/hooks/usePlanAccess';
import { useMissionContext } from '@/contexts/MissionContext';
import { cn } from '@/lib/utils';
import foxMask from '@/assets/finango-fox-mask.png.asset.json';

function initialsOf(name: string) {
  return name.trim().split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase();
}

function daysSince(iso?: string | null) {
  if (!iso) return 0;
  const diff = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

export default function Profile() {
  const navigate = useNavigate();
  const { user, profile, signOut, refreshProfile } = useAuth();
  const { planCode } = usePlanAccess();
  const { userXP } = useMissions();
  const isPaid = planCode !== 'free';

  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile?.name ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => { setName(profile?.name ?? ''); }, [profile?.name]);

  const memberSince = useMemo(() => {
    const d = user?.created_at ? new Date(user.created_at) : null;
    return d ? d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) : '—';
  }, [user?.created_at]);
  const daysUsing = useMemo(() => daysSince(user?.created_at), [user?.created_at]);

  const handleAvatarUpload = async (file: File) => {
    if (!user) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/avatar.${ext}`;
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      const url = `${data.publicUrl}?t=${Date.now()}`;
      const { error: updErr } = await supabase.from('profiles').update({ avatar_url: url }).eq('user_id', user.id);
      if (updErr) throw updErr;
      await refreshProfile();
      toast.success('Foto atualizada');
    } catch (e: any) {
      toast.error(e.message ?? 'Erro ao enviar foto');
    } finally {
      setUploading(false);
    }
  };

  const saveName = async () => {
    if (!user || !name.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('profiles').update({ name: name.trim() }).eq('user_id', user.id);
      if (error) throw error;
      await refreshProfile();
      toast.success('Perfil atualizado');
      setEditing(false);
    } catch (e: any) {
      toast.error(e.message ?? 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (!user?.email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(error.message);
    else toast.success('Enviamos um e-mail para redefinir sua senha');
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  const displayName = profile?.name || user?.email?.split('@')[0] || 'Usuário';
  const initials = initialsOf(displayName) || 'U';
  const xpProgress = Math.min(100, ((userXP.total_xp % 200) / 200) * 100);

  return (
    <div className="min-h-screen bg-background pb-24 lg:pb-8">
      <div className="max-w-3xl mx-auto px-4 lg:px-8 pt-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft size={16} /> Voltar
        </button>

        {/* Header card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className={cn(
            'relative overflow-hidden rounded-3xl p-6 mb-4 border',
            isPaid
              ? 'border-primary/30 bg-gradient-to-br from-primary/15 via-primary/5 to-amber-500/10'
              : 'border-border bg-gradient-to-br from-secondary/60 via-secondary/20 to-secondary/60'
          )}
        >
          <div
            aria-hidden
            className="absolute -right-6 -bottom-6 w-40 h-40 opacity-[0.08]"
            style={{
              backgroundColor: 'hsl(var(--primary))',
              WebkitMaskImage: `url(${foxMask.url})`,
              maskImage: `url(${foxMask.url})`,
              WebkitMaskRepeat: 'no-repeat',
              maskRepeat: 'no-repeat',
              WebkitMaskSize: 'contain',
              maskSize: 'contain',
            }}
          />

          <div className="relative flex items-start gap-4">
            <div className="relative shrink-0">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt=""
                  className="w-20 h-20 rounded-full object-cover ring-4 ring-primary/30"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/60 text-primary-foreground flex items-center justify-center font-semibold text-2xl ring-4 ring-primary/30">
                  {initials}
                </div>
              )}
              <label
                className={cn(
                  'absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary text-primary-foreground',
                  'flex items-center justify-center cursor-pointer ring-2 ring-card touch-scale',
                  uploading && 'opacity-70 pointer-events-none'
                )}
                aria-label="Trocar foto"
              >
                {uploading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleAvatarUpload(e.target.files[0])}
                />
              </label>
              {isPaid && (
                <div className="absolute -top-1 -left-1 w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-primary flex items-center justify-center ring-2 ring-card">
                  <Crown size={12} className="text-white" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              {editing ? (
                <div className="flex flex-col gap-2">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-background/70 border border-border text-sm"
                    autoFocus
                    maxLength={60}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={saveName}
                      disabled={saving || !name.trim()}
                      className="px-3 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground font-semibold disabled:opacity-60"
                    >
                      {saving ? <Loader2 size={12} className="animate-spin" /> : 'Salvar'}
                    </button>
                    <button
                      onClick={() => { setEditing(false); setName(profile?.name ?? ''); }}
                      className="px-3 py-1.5 text-xs rounded-lg bg-secondary"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-xl font-bold truncate">{displayName}</h1>
                    <button
                      onClick={() => setEditing(true)}
                      className="p-1.5 rounded-full hover:bg-background/60 text-muted-foreground"
                      aria-label="Editar nome"
                    >
                      <Pencil size={12} />
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                    <Mail size={11} /> {user?.email}
                  </p>
                  <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                    <span className={cn(
                      'inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full',
                      isPaid
                        ? 'bg-gradient-to-r from-amber-400/25 to-primary/25 text-primary border border-primary/40'
                        : 'bg-muted text-muted-foreground border border-border'
                    )}>
                      {isPaid ? <><Crown size={10} /> Plano Premium</> : <><Sparkles size={10} /> Plano Free</>}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Calendar size={10} /> Membro desde {memberSince}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <StatCard label="Dias usando" value={String(daysUsing)} />
          <StatCard label="Nível" value={String(userXP.level ?? 1)} />
          <StatCard label="XP total" value={String(userXP.total_xp ?? 0)} />
        </div>

        {/* XP bar */}
        <div className="rounded-2xl border border-border bg-card p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Trophy size={16} className="text-primary" />
              <span className="text-sm font-semibold">Progresso do nível</span>
            </div>
            <span className="text-xs text-muted-foreground">{userXP.total_xp % 200}/200 XP</span>
          </div>
          <div className="h-2 rounded-full bg-secondary overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary to-amber-400 transition-all" style={{ width: `${xpProgress}%` }} />
          </div>
          <button
            onClick={() => navigate('/settings')}
            className="w-full mt-3 flex items-center justify-between text-xs text-muted-foreground hover:text-foreground"
          >
            Ver conquistas <ChevronRight size={14} />
          </button>
        </div>

        {/* Premium CTA */}
        {!isPaid && (
          <button
            onClick={() => navigate('/plans')}
            className="w-full mb-4 rounded-2xl p-4 border border-primary/30 bg-gradient-to-br from-primary/10 to-amber-500/10 text-left flex items-center gap-3 touch-scale"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center shrink-0">
              <Crown size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">Conheça o Finango Premium</p>
              <p className="text-xs text-muted-foreground">Recursos exclusivos para sua vida financeira.</p>
            </div>
            <ChevronRight size={16} className="text-primary shrink-0" />
          </button>
        )}

        {/* Actions */}
        <Section title="Conta">
          <Row icon={UserIcon} label="Editar perfil" onClick={() => setEditing(true)} />
          <Row icon={KeyRound} label="Alterar senha" description="Enviaremos um link ao seu e-mail" onClick={changePassword} />
          <Row icon={Shield} label="Segurança" description="Sessões e eventos recentes" onClick={() => navigate('/security')} />
        </Section>

        <Section title="Preferências">
          <Row icon={UserIcon} label="Configurações do app" onClick={() => navigate('/settings')} />
        </Section>

        <button
          onClick={handleLogout}
          className="w-full mt-4 rounded-2xl p-4 border border-destructive/30 bg-destructive/5 hover:bg-destructive/10 text-destructive font-semibold text-sm flex items-center justify-center gap-2 touch-scale"
        >
          <LogOut size={16} /> Sair da conta
        </button>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3 text-center">
      <p className="text-lg font-bold">{value}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-1 mb-2">{title}</h3>
      <div className="rounded-2xl border border-border bg-card overflow-hidden divide-y divide-border">
        {children}
      </div>
    </div>
  );
}

function Row({ icon: Icon, label, description, onClick }: { icon: any; label: string; description?: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 min-h-[56px] px-4 py-3 hover:bg-secondary/50 transition-colors text-left">
      <div className="w-9 h-9 rounded-lg bg-secondary text-foreground flex items-center justify-center shrink-0">
        <Icon size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {description && <p className="text-xs text-muted-foreground truncate">{description}</p>}
      </div>
      <ChevronRight size={16} className="text-muted-foreground/60 shrink-0" />
    </button>
  );
}
