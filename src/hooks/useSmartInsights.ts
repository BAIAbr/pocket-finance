import { useMemo } from 'react';
import { parseISO, startOfMonth, endOfMonth, subMonths, isWithinInterval, differenceInCalendarDays } from 'date-fns';
import { useEffectiveFinance } from '@/hooks/useEffectiveFinance';
import { useRecurring, daysUntil } from '@/hooks/useRecurring';

export type InsightTone = 'positive' | 'negative' | 'neutral' | 'warning';

export interface Insight {
  id: string;
  icon: string; // lucide icon name
  title: string;
  description: string;
  tone: InsightTone;
  action?: { label: string; to: string };
}

export interface GreetingHighlight {
  timeGreeting: string;
  headline: string;
  subline: string;
  tone: InsightTone;
}

const currency = (n: number) =>
  `R$ ${Math.abs(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function timeOfDay(): string {
  const h = new Date().getHours();
  if (h < 5) return 'Boa madrugada';
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

export function useSmartInsights(userName?: string | null) {
  const { transactions, piggyBanks, getCategoryStats, currentMonthStats } = useEffectiveFinance() as any;
  const { items: recurringItems } = useRecurring();

  return useMemo(() => {
    const now = new Date();
    const thisMonthStart = startOfMonth(now);
    const thisMonthEnd = endOfMonth(now);
    const lastMonthDate = subMonths(now, 1);
    const lastMonthStart = startOfMonth(lastMonthDate);
    const lastMonthEnd = endOfMonth(lastMonthDate);

    const txThis = (transactions as any[]).filter(t => {
      try { return isWithinInterval(parseISO(t.date), { start: thisMonthStart, end: thisMonthEnd }); } catch { return false; }
    });
    const txLast = (transactions as any[]).filter(t => {
      try { return isWithinInterval(parseISO(t.date), { start: lastMonthStart, end: lastMonthEnd }); } catch { return false; }
    });

    const sum = (arr: any[], type: 'income' | 'expense') =>
      arr.filter(t => t.type === type).reduce((s, t) => s + Number(t.amount), 0);

    const expThis = sum(txThis, 'expense');
    const expLast = sum(txLast, 'expense');
    const incThis = sum(txThis, 'income');
    const incLast = sum(txLast, 'income');
    const savingsThis = incThis - expThis;
    const savingsLast = incLast - expLast;

    const patrimony = (piggyBanks as any[]).reduce((s, p) => s + Number(p.balance ?? 0), 0);

    // Category comparison
    const catThis = getCategoryStats(now, 'expense') as any[];
    const catLast = getCategoryStats(lastMonthDate, 'expense') as any[];
    const catLastMap = new Map(catLast.map(c => [c.categoryId, c.total]));
    let biggestGrowth: { name: string; delta: number } | null = null;
    let biggestSaving: { name: string; delta: number } | null = null;
    catThis.forEach(c => {
      const prev = Number(catLastMap.get(c.categoryId) ?? 0);
      const delta = c.total - prev;
      if (prev > 0) {
        if (!biggestGrowth || delta > biggestGrowth.delta) biggestGrowth = { name: c.categoryName, delta };
        if (!biggestSaving || delta < biggestSaving.delta) biggestSaving = { name: c.categoryName, delta };
      }
    });

    // Goals: closest piggy bank to target
    const goalCandidates = (piggyBanks as any[])
      .filter(p => !p.is_completed && Number(p.target_amount ?? 0) > 0)
      .map(p => ({
        name: p.name as string,
        pct: Math.min(100, (Number(p.balance ?? 0) / Number(p.target_amount)) * 100),
      }))
      .sort((a, b) => b.pct - a.pct);
    const topGoal = goalCandidates[0];

    // Upcoming bills (next 3 days)
    const nextBill = recurringItems
      .filter(i => i.is_active)
      .map(i => ({ ...i, in: daysUntil(i.next_due_date) }))
      .filter(i => i.in >= 0 && i.in <= 7)
      .sort((a, b) => a.in - b.in)[0];

    // ---------- Greeting headline ----------
    const timeGreeting = `${timeOfDay()}${userName ? `, ${userName.split(' ')[0]}` : ''} 👋`;

    const candidates: { headline: string; subline: string; tone: InsightTone; score: number }[] = [];

    if (nextBill && nextBill.in <= 2) {
      candidates.push({
        headline: nextBill.in === 0
          ? `${nextBill.name} vence hoje.`
          : `${nextBill.name} vence em ${nextBill.in}d.`,
        subline: `Valor: ${currency(Number(nextBill.amount))}.`,
        tone: 'warning',
        score: 100,
      });
    }
    if (savingsLast !== 0) {
      const diff = savingsThis - savingsLast;
      if (diff > 0) {
        candidates.push({
          headline: `Você economizou ${currency(diff)} a mais este mês.`,
          subline: 'Continue no ritmo para reforçar seu patrimônio.',
          tone: 'positive',
          score: 80,
        });
      } else if (diff < -50) {
        candidates.push({
          headline: `Sua economia caiu ${currency(diff)} vs. o mês passado.`,
          subline: 'Reveja os gastos para reequilibrar o mês.',
          tone: 'negative',
          score: 75,
        });
      }
    }
    if (topGoal && topGoal.pct >= 50) {
      candidates.push({
        headline: `Você está ${Math.round(topGoal.pct)}% próximo da meta "${topGoal.name}".`,
        subline: 'Um depósito agora acelera a conclusão.',
        tone: 'positive',
        score: 70,
      });
    }
    if (biggestSaving && (biggestSaving as any).delta < -20) {
      candidates.push({
        headline: `Você reduziu gastos com ${(biggestSaving as any).name}.`,
        subline: `Economia de ${currency((biggestSaving as any).delta)} vs. o mês passado.`,
        tone: 'positive',
        score: 60,
      });
    }
    if (patrimony > 0 && candidates.length === 0) {
      candidates.push({
        headline: `Seu patrimônio nos cofrinhos é de ${currency(patrimony)}.`,
        subline: 'Continue guardando para acelerar suas metas.',
        tone: 'neutral',
        score: 40,
      });
    }
    if (candidates.length === 0) {
      candidates.push({
        headline: 'Vamos organizar suas finanças hoje?',
        subline: 'Registre a primeira transação e veja seus insights aqui.',
        tone: 'neutral',
        score: 1,
      });
    }
    candidates.sort((a, b) => b.score - a.score);
    const greeting: GreetingHighlight = {
      timeGreeting,
      headline: candidates[0].headline,
      subline: candidates[0].subline,
      tone: candidates[0].tone,
    };

    // ---------- Insights list ----------
    const insights: Insight[] = [];

    if (expLast > 0) {
      const diff = expThis - expLast;
      const pct = (diff / expLast) * 100;
      if (diff < 0) {
        insights.push({
          id: 'exp-down',
          icon: 'TrendingDown',
          tone: 'positive',
          title: `Gastos ${Math.abs(pct).toFixed(0)}% menores`,
          description: `Você gastou ${currency(diff)} a menos que no mês passado.`,
          action: { label: 'Ver histórico', to: '/history' },
        });
      } else if (diff > 0) {
        insights.push({
          id: 'exp-up',
          icon: 'TrendingUp',
          tone: 'negative',
          title: `Gastos ${pct.toFixed(0)}% maiores`,
          description: `Você gastou ${currency(diff)} a mais que no mês passado.`,
          action: { label: 'Analisar', to: '/history' },
        });
      }
    }

    if (incLast > 0 && incThis > incLast) {
      insights.push({
        id: 'inc-up',
        icon: 'ArrowUpRight',
        tone: 'positive',
        title: 'Receita em alta',
        description: `Suas receitas subiram ${currency(incThis - incLast)} vs. o mês passado.`,
      });
    }

    if (biggestGrowth && (biggestGrowth as any).delta > 20) {
      insights.push({
        id: 'cat-growth',
        icon: 'AlertCircle',
        tone: 'warning',
        title: `Alta em ${(biggestGrowth as any).name}`,
        description: `Aumento de ${currency((biggestGrowth as any).delta)} neste mês.`,
        action: { label: 'Ver categoria', to: '/history' },
      });
    }

    if (biggestSaving && (biggestSaving as any).delta < -20) {
      insights.push({
        id: 'cat-save',
        icon: 'PiggyBank',
        tone: 'positive',
        title: `Economia em ${(biggestSaving as any).name}`,
        description: `Você reduziu ${currency((biggestSaving as any).delta)} nesta categoria.`,
      });
    }

    if (topGoal) {
      insights.push({
        id: 'goal-close',
        icon: 'Target',
        tone: 'positive',
        title: `Meta "${topGoal.name}" a ${Math.round(topGoal.pct)}%`,
        description: 'Um depósito hoje aproxima ainda mais o objetivo.',
        action: { label: 'Cofrinho', to: '/savings' },
      });
    }

    if (nextBill) {
      insights.push({
        id: 'next-bill',
        icon: 'CalendarClock',
        tone: nextBill.in <= 2 ? 'warning' : 'neutral',
        title: nextBill.in === 0 ? 'Conta vence hoje' : `Conta em ${nextBill.in}d`,
        description: `${nextBill.name} • ${currency(Number(nextBill.amount))}.`,
        action: { label: 'Ver contas', to: '/recurring' },
      });
    }

    if (savingsThis > 0) {
      insights.push({
        id: 'savings-now',
        icon: 'Wallet',
        tone: 'positive',
        title: 'Saldo positivo no mês',
        description: `Você já guardou ${currency(savingsThis)} este mês.`,
      });
    }

    // Motivational fallback
    if (insights.length === 0) {
      insights.push({
        id: 'empty',
        icon: 'Sparkles',
        tone: 'neutral',
        title: 'Comece a acompanhar sua evolução',
        description: 'Registre transações para desbloquear insights personalizados.',
        action: { label: 'Adicionar', to: '/' },
      });
    }

    return {
      greeting,
      insights: insights.slice(0, 5),
      metrics: {
        expThis, expLast, incThis, incLast, savingsThis, savingsLast, patrimony,
      },
    };
  }, [transactions, piggyBanks, recurringItems, getCategoryStats, currentMonthStats, userName]);
}
