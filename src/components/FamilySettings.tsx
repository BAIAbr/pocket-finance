import { useState } from 'react';
import { useFamilyContext, type FamilyMember } from '@/contexts/FamilyContext';
import { useAuth } from '@/contexts/AuthContext';
import { Users, Plus, Link, Target, BarChart3, Shield, LogOut, Copy, UserMinus, ChevronRight, Trash2, Brain, Eye, EyeOff, Crown, UserCheck, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type Section = 'main' | 'members' | 'goals' | 'insights' | 'privacy';

export function FamilySettings() {
  const { user } = useAuth();
  const {
    family, members, goals, insights, myRole, isLoading,
    createFamily, joinFamily, leaveFamily, deleteFamily, updateFamily,
    updateMemberRole, removeMember,
    createGoal, updateGoal, deleteGoal,
    updateMyPrivacy,
  } = useFamilyContext();

  const [section, setSection] = useState<Section>('main');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  // Create family form
  const [newFamilyName, setNewFamilyName] = useState('');
  const [aiEnabled, setAiEnabled] = useState(false);
  const [autoShare, setAutoShare] = useState(false);

  // Join family form
  const [inviteCode, setInviteCode] = useState('');

  // Goal form
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [goalName, setGoalName] = useState('');
  const [goalDesc, setGoalDesc] = useState('');
  const [goalAmount, setGoalAmount] = useState('');
  const [goalDeadline, setGoalDeadline] = useState('');

  const myMember = members.find(m => m.user_id === user?.id);
  const isAdmin = myRole === 'admin';

  const handleCreateFamily = async () => {
    if (!newFamilyName.trim()) return;
    await createFamily(newFamilyName.trim(), aiEnabled, autoShare);
    setShowCreateForm(false);
    setNewFamilyName('');
  };

  const handleJoinFamily = async () => {
    if (!inviteCode.trim()) return;
    const success = await joinFamily(inviteCode.trim());
    if (success) {
      setShowJoinForm(false);
      setInviteCode('');
    }
  };

  const handleCopyInviteCode = () => {
    if (family?.invite_code) {
      navigator.clipboard.writeText(family.invite_code);
      toast.success('Código copiado!');
    }
  };

  const handleCreateGoal = async () => {
    if (!goalName.trim() || !goalAmount) return;
    await createGoal({
      nome: goalName.trim(),
      descricao: goalDesc.trim() || undefined,
      valor_objetivo: parseFloat(goalAmount),
      prazo: goalDeadline || undefined,
    });
    setShowGoalForm(false);
    setGoalName('');
    setGoalDesc('');
    setGoalAmount('');
    setGoalDeadline('');
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'member': return 'Membro';
      case 'viewer': return 'Visualizador';
      default: return role;
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return Crown;
      case 'member': return UserCheck;
      default: return Eye;
    }
  };

  if (isLoading) {
    return (
      <section className="card-finance">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <Users size={18} />
          Modo Família
        </h2>
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </section>
    );
  }

  // No family yet - show initial state
  if (!family) {
    return (
      <section className="card-finance">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <Users size={18} />
          Modo Família
        </h2>

        {!showCreateForm && !showJoinForm && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Conecte contas e gerencie gastos em conjunto mantendo sua conta individual separada.
            </p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-primary/10 hover:bg-primary/20 transition-all touch-scale text-primary font-medium"
            >
              <Plus size={18} />
              Criar Família
            </button>
            <button
              onClick={() => setShowJoinForm(true)}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-all touch-scale"
            >
              <Link size={18} />
              Entrar com Código
            </button>
          </div>
        )}

        {showCreateForm && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-muted-foreground mb-1">Nome da Família</label>
              <input
                type="text"
                value={newFamilyName}
                onChange={e => setNewFamilyName(e.target.value)}
                placeholder="Ex: Família Silva"
                className="input-finance"
              />
            </div>

            <button
              onClick={() => setAiEnabled(!aiEnabled)}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-secondary/50"
            >
              <div className="flex items-center gap-2">
                <Brain size={16} className="text-primary" />
                <span className="text-sm">Ativar IA Familiar</span>
              </div>
              <div className={cn(
                'w-11 h-6 rounded-full flex items-center px-0.5 transition-all',
                aiEnabled ? 'bg-primary justify-end' : 'bg-muted justify-start'
              )}>
                <div className="w-5 h-5 rounded-full bg-white shadow" />
              </div>
            </button>

            <button
              onClick={() => setAutoShare(!autoShare)}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-secondary/50"
            >
              <div className="flex items-center gap-2">
                <Users size={16} className="text-primary" />
                <span className="text-sm">Compartilhamento automático</span>
              </div>
              <div className={cn(
                'w-11 h-6 rounded-full flex items-center px-0.5 transition-all',
                autoShare ? 'bg-primary justify-end' : 'bg-muted justify-start'
              )}>
                <div className="w-5 h-5 rounded-full bg-white shadow" />
              </div>
            </button>

            <div className="flex gap-2">
              <button
                onClick={() => setShowCreateForm(false)}
                className="flex-1 py-3 rounded-xl bg-secondary font-medium touch-scale"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateFamily}
                disabled={!newFamilyName.trim()}
                className="flex-1 py-3 rounded-xl gradient-balance text-white font-medium touch-scale disabled:opacity-50"
              >
                Criar
              </button>
            </div>
          </div>
        )}

        {showJoinForm && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-muted-foreground mb-1">Código de Convite</label>
              <input
                type="text"
                value={inviteCode}
                onChange={e => setInviteCode(e.target.value.toUpperCase())}
                placeholder="Ex: A1B2C3D4"
                className="input-finance font-mono text-center tracking-widest"
                maxLength={8}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowJoinForm(false)}
                className="flex-1 py-3 rounded-xl bg-secondary font-medium touch-scale"
              >
                Cancelar
              </button>
              <button
                onClick={handleJoinFamily}
                disabled={inviteCode.length < 4}
                className="flex-1 py-3 rounded-xl gradient-balance text-white font-medium touch-scale disabled:opacity-50"
              >
                Entrar
              </button>
            </div>
          </div>
        )}
      </section>
    );
  }

  // Has family - show management
  if (section === 'main') {
    return (
      <section className="card-finance space-y-4">
        <h2 className="font-semibold flex items-center gap-2">
          <Users size={18} />
          Modo Família
        </h2>

        {/* Family Info */}
        <div className="p-3 rounded-xl bg-secondary/50 space-y-1">
          <p className="font-semibold">{family.nome}</p>
          <p className="text-xs text-muted-foreground">
            Plano {family.plano === 'premium' ? 'Premium' : 'Gratuito'} • {members.length} {members.length === 1 ? 'membro' : 'membros'}
          </p>
        </div>

        {/* Invite Code */}
        <button
          onClick={handleCopyInviteCode}
          className="w-full flex items-center justify-between p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-all touch-scale"
        >
          <div className="flex items-center gap-2">
            <Copy size={16} className="text-primary" />
            <span className="text-sm">Código de convite</span>
          </div>
          <span className="font-mono text-sm text-primary font-bold tracking-widest">{family.invite_code}</span>
        </button>

        {/* Menu Items */}
        {[
          { id: 'members' as Section, icon: Users, label: 'Membros', count: members.length },
          { id: 'goals' as Section, icon: Target, label: 'Metas Familiares', count: goals.filter(g => g.status === 'ativa').length },
          { id: 'insights' as Section, icon: BarChart3, label: 'Relatórios IA', count: insights.length },
          { id: 'privacy' as Section, icon: Shield, label: 'Privacidade', count: null },
        ].map(item => (
          <button
            key={item.id}
            onClick={() => setSection(item.id)}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-all touch-scale"
          >
            <div className="flex items-center gap-2">
              <item.icon size={16} className="text-muted-foreground" />
              <span className="text-sm font-medium">{item.label}</span>
            </div>
            <div className="flex items-center gap-2">
              {item.count !== null && (
                <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">{item.count}</span>
              )}
              <ChevronRight size={16} className="text-muted-foreground" />
            </div>
          </button>
        ))}

        {/* Leave / Delete */}
        {!showLeaveConfirm && !showDeleteConfirm && (
          <button
            onClick={() => isAdmin ? setShowDeleteConfirm(true) : setShowLeaveConfirm(true)}
            className="w-full flex items-center gap-2 p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-all touch-scale text-destructive"
          >
            <LogOut size={16} />
            <span className="text-sm">{isAdmin ? 'Excluir Família' : 'Sair da Família'}</span>
          </button>
        )}

        {showLeaveConfirm && (
          <div className="space-y-2">
            <p className="text-sm text-destructive">Tem certeza que deseja sair?</p>
            <div className="flex gap-2">
              <button onClick={() => setShowLeaveConfirm(false)} className="flex-1 py-2 rounded-xl bg-secondary text-sm touch-scale">Cancelar</button>
              <button onClick={leaveFamily} className="flex-1 py-2 rounded-xl bg-destructive text-destructive-foreground text-sm touch-scale">Sair</button>
            </div>
          </div>
        )}

        {showDeleteConfirm && (
          <div className="space-y-2">
            <p className="text-sm text-destructive">⚠️ Isso excluirá a família para todos os membros!</p>
            <div className="flex gap-2">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-2 rounded-xl bg-secondary text-sm touch-scale">Cancelar</button>
              <button onClick={deleteFamily} className="flex-1 py-2 rounded-xl bg-destructive text-destructive-foreground text-sm touch-scale">Excluir</button>
            </div>
          </div>
        )}
      </section>
    );
  }

  // Members section
  if (section === 'members') {
    return (
      <section className="card-finance space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2">
            <Users size={18} />
            Membros
          </h2>
          <button onClick={() => setSection('main')} className="text-xs text-primary">← Voltar</button>
        </div>

        {members.map(member => {
          const RoleIcon = getRoleIcon(member.role);
          return (
            <div key={member.id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50">
              <Avatar className="w-10 h-10">
                {member.profile?.avatar_url && <AvatarImage src={member.profile.avatar_url} />}
                <AvatarFallback className="gradient-balance text-white text-sm font-bold">
                  {(member.profile?.name || 'U').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{member.profile?.name || 'Usuário'}</p>
                <p className="text-xs text-muted-foreground truncate">{member.profile?.email || ''}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <RoleIcon size={12} className="text-primary" />
                  <span className="text-[10px] text-primary font-medium">{getRoleLabel(member.role)}</span>
                </div>
              </div>

              {isAdmin && member.user_id !== user?.id && (
                <div className="flex items-center gap-1">
                  <select
                    value={member.role}
                    onChange={e => updateMemberRole(member.id, e.target.value)}
                    className="text-xs bg-secondary rounded-lg px-2 py-1 border-none"
                  >
                    <option value="admin">Admin</option>
                    <option value="member">Membro</option>
                    <option value="viewer">Visualizador</option>
                  </select>
                  <button
                    onClick={() => removeMember(member.id)}
                    className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive"
                  >
                    <UserMinus size={14} />
                  </button>
                </div>
              )}
            </div>
          );
        })}

        <p className="text-[10px] text-muted-foreground text-center">
          Entrou em {members.length > 0 ? format(new Date(members[0].joined_at), "dd 'de' MMM yyyy", { locale: ptBR }) : '-'}
        </p>
      </section>
    );
  }

  // Goals section
  if (section === 'goals') {
    return (
      <section className="card-finance space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2">
            <Target size={18} />
            Metas Familiares
          </h2>
          <button onClick={() => setSection('main')} className="text-xs text-primary">← Voltar</button>
        </div>

        {(isAdmin || myRole === 'member') && !showGoalForm && (
          <button
            onClick={() => setShowGoalForm(true)}
            className="w-full flex items-center gap-2 p-3 rounded-xl bg-primary/10 hover:bg-primary/20 transition-all touch-scale text-primary text-sm font-medium"
          >
            <Plus size={16} />
            Nova Meta
          </button>
        )}

        {showGoalForm && (
          <div className="space-y-3 p-3 rounded-xl bg-secondary/50">
            <input type="text" value={goalName} onChange={e => setGoalName(e.target.value)} placeholder="Nome da meta" className="input-finance" />
            <input type="text" value={goalDesc} onChange={e => setGoalDesc(e.target.value)} placeholder="Descrição (opcional)" className="input-finance" />
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
              <input type="number" value={goalAmount} onChange={e => setGoalAmount(e.target.value)} placeholder="0,00" className="input-finance pl-10" />
            </div>
            <input type="date" value={goalDeadline} onChange={e => setGoalDeadline(e.target.value)} className="input-finance" />
            <div className="flex gap-2">
              <button onClick={() => setShowGoalForm(false)} className="flex-1 py-2 rounded-xl bg-secondary text-sm touch-scale">Cancelar</button>
              <button onClick={handleCreateGoal} disabled={!goalName || !goalAmount} className="flex-1 py-2 rounded-xl gradient-balance text-white text-sm touch-scale disabled:opacity-50">Criar</button>
            </div>
          </div>
        )}

        {goals.length === 0 && !showGoalForm && (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhuma meta familiar criada ainda.</p>
        )}

        {goals.map(goal => {
          const progress = goal.valor_objetivo > 0 ? (goal.valor_atual / goal.valor_objetivo) * 100 : 0;
          return (
            <div key={goal.id} className="p-3 rounded-xl bg-secondary/50 space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-medium text-sm">{goal.nome}</p>
                <span className={cn(
                  'text-[10px] px-2 py-0.5 rounded-full font-medium',
                  goal.status === 'ativa' ? 'bg-primary/15 text-primary' :
                  goal.status === 'concluida' ? 'bg-green-500/15 text-green-500' :
                  'bg-muted text-muted-foreground'
                )}>
                  {goal.status === 'ativa' ? 'Ativa' : goal.status === 'concluida' ? 'Concluída' : 'Pausada'}
                </span>
              </div>
              {goal.descricao && <p className="text-xs text-muted-foreground">{goal.descricao}</p>}
              <Progress value={Math.min(progress, 100)} className="h-2" />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>R$ {goal.valor_atual.toFixed(2)}</span>
                <span>R$ {goal.valor_objetivo.toFixed(2)}</span>
              </div>
              {goal.prazo && (
                <p className="text-[10px] text-muted-foreground">Prazo: {format(new Date(goal.prazo), "dd/MM/yyyy")}</p>
              )}
              {isAdmin && (
                <div className="flex gap-2 pt-1">
                  {goal.status === 'ativa' && (
                    <button onClick={() => updateGoal(goal.id, { status: 'pausada' })} className="text-[10px] text-muted-foreground hover:text-foreground">Pausar</button>
                  )}
                  {goal.status === 'pausada' && (
                    <button onClick={() => updateGoal(goal.id, { status: 'ativa' })} className="text-[10px] text-primary">Reativar</button>
                  )}
                  <button onClick={() => deleteGoal(goal.id)} className="text-[10px] text-destructive ml-auto">Excluir</button>
                </div>
              )}
            </div>
          );
        })}
      </section>
    );
  }

  // Insights section
  if (section === 'insights') {
    return (
      <section className="card-finance space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2">
            <BarChart3 size={18} />
            Relatórios IA
          </h2>
          <button onClick={() => setSection('main')} className="text-xs text-primary">← Voltar</button>
        </div>

        {!family.ai_enabled && (
          <div className="p-3 rounded-xl bg-secondary/50 text-center space-y-2">
            <Sparkles size={24} className="text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">IA Familiar está desativada</p>
            {isAdmin && (
              <button
                onClick={() => updateFamily({ ai_enabled: true })}
                className="text-xs text-primary font-medium"
              >
                Ativar IA
              </button>
            )}
          </div>
        )}

        {family.ai_enabled && insights.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum relatório gerado ainda. Os insights serão gerados automaticamente.
          </p>
        )}

        {insights.map(insight => (
          <div key={insight.id} className="p-3 rounded-xl bg-secondary/50 space-y-2">
            <div className="flex items-center gap-2">
              <span className={cn(
                'text-[10px] px-2 py-0.5 rounded-full font-medium',
                insight.tipo === 'mensal' ? 'bg-primary/15 text-primary' :
                insight.tipo === 'alerta' ? 'bg-destructive/15 text-destructive' :
                'bg-green-500/15 text-green-500'
              )}>
                {insight.tipo === 'mensal' ? 'Mensal' : insight.tipo === 'alerta' ? 'Alerta' : 'Sugestão'}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {format(new Date(insight.created_at), "dd/MM/yyyy")}
              </span>
            </div>
            <p className="text-sm">{insight.conteudo}</p>
            {insight.impacto_estimado && (
              <p className="text-xs text-primary font-medium">💡 {insight.impacto_estimado}</p>
            )}
          </div>
        ))}
      </section>
    );
  }

  // Privacy section
  if (section === 'privacy') {
    const privacy = myMember?.privacy_settings || {
      auto_share: false,
      hidden_categories: [],
      show_creator: true,
      allow_ai_analysis: true,
    };

    const togglePrivacy = (key: keyof typeof privacy) => {
      updateMyPrivacy({ [key]: !privacy[key] });
    };

    return (
      <section className="card-finance space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2">
            <Shield size={18} />
            Privacidade
          </h2>
          <button onClick={() => setSection('main')} className="text-xs text-primary">← Voltar</button>
        </div>

        {[
          { key: 'auto_share' as const, icon: Users, label: 'Compartilhar automaticamente novas transações', value: privacy.auto_share },
          { key: 'show_creator' as const, icon: Eye, label: 'Permitir ver quem criou cada gasto', value: privacy.show_creator },
          { key: 'allow_ai_analysis' as const, icon: Brain, label: 'Permitir IA analisar dados para relatório coletivo', value: privacy.allow_ai_analysis },
        ].map(item => (
          <button
            key={item.key}
            onClick={() => togglePrivacy(item.key)}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-secondary/50"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <item.icon size={16} className="text-muted-foreground shrink-0" />
              <span className="text-sm text-left">{item.label}</span>
            </div>
            <div className={cn(
              'w-11 h-6 rounded-full flex items-center px-0.5 transition-all shrink-0 ml-2',
              item.value ? 'bg-primary justify-end' : 'bg-muted justify-start'
            )}>
              <div className="w-5 h-5 rounded-full bg-white shadow" />
            </div>
          </button>
        ))}

        <p className="text-[10px] text-muted-foreground text-center">
          Suas configurações de privacidade são individuais e não afetam outros membros.
        </p>
      </section>
    );
  }

  return null;
}
