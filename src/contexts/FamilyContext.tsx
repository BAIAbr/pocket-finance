import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Family {
  id: string;
  nome: string;
  created_by: string;
  plano: string;
  invite_code: string;
  ai_enabled: boolean;
  auto_share: boolean;
  created_at: string;
  updated_at: string;
}

export interface FamilyMember {
  id: string;
  family_id: string;
  user_id: string;
  role: string;
  permissions: Record<string, any>;
  privacy_settings: {
    auto_share: boolean;
    hidden_categories: string[];
    show_creator: boolean;
    allow_ai_analysis: boolean;
  };
  joined_at: string;
  profile?: { name: string; email: string; avatar_url: string | null };
}

export interface FamilyGoal {
  id: string;
  family_id: string;
  nome: string;
  descricao: string | null;
  valor_objetivo: number;
  valor_atual: number;
  prazo: string | null;
  status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface FamilyInsight {
  id: string;
  family_id: string;
  tipo: string;
  conteudo: string;
  impacto_estimado: string | null;
  created_at: string;
}

export interface SharedTransaction {
  id: string;
  family_id: string;
  transaction_id: string;
  shared_by: string;
  created_at: string;
}

type ViewContext = 'personal' | 'family';

interface FamilyContextType {
  family: Family | null;
  members: FamilyMember[];
  goals: FamilyGoal[];
  insights: FamilyInsight[];
  sharedTransactions: SharedTransaction[];
  myRole: string | null;
  isLoading: boolean;
  viewContext: ViewContext;
  setViewContext: (ctx: ViewContext) => void;
  createFamily: (nome: string, aiEnabled: boolean, autoShare: boolean) => Promise<Family | null>;
  joinFamily: (inviteCode: string) => Promise<boolean>;
  leaveFamily: () => Promise<void>;
  deleteFamily: () => Promise<void>;
  updateFamily: (updates: Partial<Family>) => Promise<void>;
  updateMemberRole: (memberId: string, role: string) => Promise<void>;
  removeMember: (memberId: string) => Promise<void>;
  shareTransaction: (transactionId: string) => Promise<void>;
  unshareTransaction: (transactionId: string) => Promise<void>;
  createGoal: (goal: { nome: string; descricao?: string; valor_objetivo: number; prazo?: string }) => Promise<void>;
  updateGoal: (id: string, updates: Partial<FamilyGoal>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  updateMyPrivacy: (settings: Partial<FamilyMember['privacy_settings']>) => Promise<void>;
  refreshData: () => Promise<void>;
}

const FamilyContext = createContext<FamilyContextType | null>(null);

export function FamilyProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [family, setFamily] = useState<Family | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [goals, setGoals] = useState<FamilyGoal[]>([]);
  const [insights, setInsights] = useState<FamilyInsight[]>([]);
  const [sharedTransactions, setSharedTransactions] = useState<SharedTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [viewContext, setViewContext] = useState<ViewContext>('personal');

  const myRole = members.find(m => m.user_id === userId)?.role ?? null;

  const loadFamily = useCallback(async () => {
    if (!userId) {
      setFamily(null);
      setMembers([]);
      setGoals([]);
      setInsights([]);
      setSharedTransactions([]);
      return;
    }

    setIsLoading(true);
    try {
      // Find user's family membership
      const { data: membership } = await supabase
        .from('family_members')
        .select('family_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (!membership) {
        // Also check if user created a family but hasn't been added as member yet
        const { data: createdFamily } = await supabase
          .from('families')
          .select('id, nome, created_by, plano, ai_enabled, auto_share, created_at, updated_at')
          .eq('created_by', userId)
          .maybeSingle();

        if (createdFamily) {
          const { data: code } = await supabase.rpc('get_family_invite_code', { _family_id: createdFamily.id });
          setFamily({ ...(createdFamily as any), invite_code: code ?? '' } as Family);
        } else {
          setFamily(null);
        }
        setMembers([]);
        setGoals([]);
        setInsights([]);
        setSharedTransactions([]);
        setIsLoading(false);
        return;
      }

      const familyId = membership.family_id;

      const [familyRes, membersRes, goalsRes, insightsRes, sharedRes, inviteCodeRes] = await Promise.all([
        supabase.from('families').select('id, nome, created_by, plano, ai_enabled, auto_share, created_at, updated_at').eq('id', familyId).single(),
        supabase.from('family_members').select('*').eq('family_id', familyId),
        supabase.from('family_goals').select('*').eq('family_id', familyId).order('created_at', { ascending: false }),
        supabase.from('family_insights').select('*').eq('family_id', familyId).order('created_at', { ascending: false }).limit(20),
        supabase.from('shared_transactions').select('*').eq('family_id', familyId).order('created_at', { ascending: false }),
        supabase.rpc('get_family_invite_code', { _family_id: familyId }),
      ]);

      if (familyRes.data) setFamily({ ...(familyRes.data as any), invite_code: inviteCodeRes.data ?? '' } as Family);

      if (membersRes.data) {
        // Fetch profiles for members
        const memberUserIds = membersRes.data.map((m: any) => m.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, name, email, avatar_url')
          .in('user_id', memberUserIds);

        const membersWithProfiles = membersRes.data.map((m: any) => ({
          ...m,
          profile: profiles?.find((p: any) => p.user_id === m.user_id) || null,
        }));
        setMembers(membersWithProfiles as FamilyMember[]);
      }
      if (goalsRes.data) setGoals(goalsRes.data as unknown as FamilyGoal[]);
      if (insightsRes.data) setInsights(insightsRes.data as unknown as FamilyInsight[]);
      if (sharedRes.data) setSharedTransactions(sharedRes.data as unknown as SharedTransaction[]);
    } catch (err) {
      console.error('Error loading family:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadFamily();
  }, [loadFamily]);

  const createFamily = useCallback(async (nome: string, aiEnabled: boolean, autoShare: boolean) => {
    if (!userId) return null;

    const { data, error } = await supabase
      .from('families')
      .insert({ nome, created_by: userId, ai_enabled: aiEnabled, auto_share: autoShare })
      .select('id, nome, created_by, plano, ai_enabled, auto_share, created_at, updated_at')
      .single();


    if (error) {
      toast.error('Erro ao criar família');
      console.error(error);
      return null;
    }

    // Add creator as admin member
    const { error: memberError } = await supabase
      .from('family_members')
      .insert({ family_id: data.id, user_id: userId, role: 'admin' });

    if (memberError) {
      console.error('Error adding creator as member:', memberError);
    }

    toast.success('Família criada com sucesso!');
    await loadFamily();
    return data as unknown as Family;
  }, [userId, loadFamily]);

  const joinFamily = useCallback(async (inviteCode: string) => {
    if (!userId) return false;

    // Use the SECURITY DEFINER RPC so non-members can resolve an invite code
    // without being able to read other families' data via direct SELECT.
    const { data: familyId, error: lookupError } = await supabase.rpc(
      'find_family_by_invite_code',
      { p_code: inviteCode.toUpperCase() }
    );

    if (lookupError || !familyId) {
      toast.error('Código de convite inválido');
      return false;
    }

    const { error } = await supabase
      .from('family_members')
      .insert({ family_id: familyId as string, user_id: userId, role: 'member' });

    if (error) {
      if (error.code === '23505') {
        toast.error('Você já faz parte desta família');
      } else {
        toast.error('Erro ao entrar na família');
      }
      return false;
    }

    toast.success('Você entrou na família!');
    await loadFamily();
    return true;
  }, [userId, loadFamily]);

  const leaveFamily = useCallback(async () => {
    if (!userId || !family) return;

    await supabase.from('family_members').delete().eq('family_id', family.id).eq('user_id', userId);
    toast.success('Você saiu da família');
    setFamily(null);
    setMembers([]);
    setGoals([]);
    setInsights([]);
    setSharedTransactions([]);
    setViewContext('personal');
  }, [userId, family]);

  const deleteFamily = useCallback(async () => {
    if (!family) return;
    await supabase.from('families').delete().eq('id', family.id);
    toast.success('Família excluída');
    setFamily(null);
    setMembers([]);
    setGoals([]);
    setInsights([]);
    setSharedTransactions([]);
    setViewContext('personal');
  }, [family]);

  const updateFamily = useCallback(async (updates: Partial<Family>) => {
    if (!family) return;
    const { error } = await supabase.from('families').update(updates).eq('id', family.id);
    if (error) { toast.error('Erro ao atualizar'); return; }
    setFamily(prev => prev ? { ...prev, ...updates } : null);
  }, [family]);

  const updateMemberRole = useCallback(async (memberId: string, role: string) => {
    const { error } = await supabase.from('family_members').update({ role }).eq('id', memberId);
    if (error) { toast.error('Erro ao atualizar função'); return; }
    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role } : m));
    toast.success('Função atualizada');
  }, []);

  const removeMember = useCallback(async (memberId: string) => {
    const { error } = await supabase.from('family_members').delete().eq('id', memberId);
    if (error) { toast.error('Erro ao remover membro'); return; }
    setMembers(prev => prev.filter(m => m.id !== memberId));
    toast.success('Membro removido');
  }, []);

  const shareTransaction = useCallback(async (transactionId: string) => {
    if (!userId || !family) return;
    const { data, error } = await supabase
      .from('shared_transactions')
      .insert({ family_id: family.id, transaction_id: transactionId, shared_by: userId })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') return; // Already shared
      toast.error('Erro ao compartilhar');
      return;
    }
    setSharedTransactions(prev => [data as unknown as SharedTransaction, ...prev]);
  }, [userId, family]);

  const unshareTransaction = useCallback(async (transactionId: string) => {
    if (!family) return;
    await supabase.from('shared_transactions').delete().eq('family_id', family.id).eq('transaction_id', transactionId);
    setSharedTransactions(prev => prev.filter(st => st.transaction_id !== transactionId));
  }, [family]);

  const createGoal = useCallback(async (goal: { nome: string; descricao?: string; valor_objetivo: number; prazo?: string }) => {
    if (!userId || !family) return;
    const { data, error } = await supabase
      .from('family_goals')
      .insert({
        family_id: family.id,
        nome: goal.nome,
        descricao: goal.descricao || null,
        valor_objetivo: goal.valor_objetivo,
        prazo: goal.prazo || null,
        created_by: userId,
      })
      .select()
      .single();

    if (error) { toast.error('Erro ao criar meta familiar'); return; }
    setGoals(prev => [data as unknown as FamilyGoal, ...prev]);
    toast.success('Meta familiar criada!');
  }, [userId, family]);

  const updateGoal = useCallback(async (id: string, updates: Partial<FamilyGoal>) => {
    const { error } = await supabase.from('family_goals').update(updates).eq('id', id);
    if (error) { toast.error('Erro ao atualizar meta'); return; }
    setGoals(prev => prev.map(g => g.id === id ? { ...g, ...updates } : g));
  }, []);

  const deleteGoal = useCallback(async (id: string) => {
    const { error } = await supabase.from('family_goals').delete().eq('id', id);
    if (error) { toast.error('Erro ao excluir meta'); return; }
    setGoals(prev => prev.filter(g => g.id !== id));
    toast.success('Meta excluída');
  }, []);

  const updateMyPrivacy = useCallback(async (settings: Partial<FamilyMember['privacy_settings']>) => {
    if (!userId || !family) return;
    const myMember = members.find(m => m.user_id === userId);
    if (!myMember) return;

    const newSettings = { ...myMember.privacy_settings, ...settings };
    const { error } = await supabase
      .from('family_members')
      .update({ privacy_settings: newSettings })
      .eq('id', myMember.id);

    if (error) { toast.error('Erro ao atualizar privacidade'); return; }
    setMembers(prev => prev.map(m => m.id === myMember.id ? { ...m, privacy_settings: newSettings } : m));
    toast.success('Privacidade atualizada');
  }, [userId, family, members]);

  return (
    <FamilyContext.Provider value={{
      family, members, goals, insights, sharedTransactions,
      myRole, isLoading, viewContext, setViewContext,
      createFamily, joinFamily, leaveFamily, deleteFamily, updateFamily,
      updateMemberRole, removeMember,
      shareTransaction, unshareTransaction,
      createGoal, updateGoal, deleteGoal,
      updateMyPrivacy, refreshData: loadFamily,
    }}>
      {children}
    </FamilyContext.Provider>
  );
}

export function useFamilyContext() {
  const context = useContext(FamilyContext);
  if (!context) {
    return {
      family: null, members: [], goals: [], insights: [], sharedTransactions: [],
      myRole: null, isLoading: false, viewContext: 'personal' as ViewContext,
      setViewContext: () => {}, createFamily: async () => null,
      joinFamily: async () => false, leaveFamily: async () => {},
      deleteFamily: async () => {}, updateFamily: async () => {},
      updateMemberRole: async () => {}, removeMember: async () => {},
      shareTransaction: async () => {}, unshareTransaction: async () => {},
      createGoal: async () => {}, updateGoal: async () => {},
      deleteGoal: async () => {}, updateMyPrivacy: async () => {},
      refreshData: async () => {},
    };
  }
  return context;
}
