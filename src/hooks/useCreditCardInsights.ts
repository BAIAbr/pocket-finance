import { useMemo } from 'react';
import { parseISO, differenceInDays, format, addMonths } from 'date-fns';
import { useCreditCards, CreditCard, CreditCardInstallment, CreditCardPurchase, CreditCardInvoice } from './useCreditCards';
import { useFinanceContext } from '@/contexts/FinanceContext';

export type InsightSeverity = 'info' | 'good' | 'warning' | 'danger';
export type InsightIcon = 'trend-up' | 'trend-down' | 'alert' | 'forecast' | 'target' | 'star' | 'repeat' | 'sparkle';

export interface CardInsight {
  id: string;
  cardId?: string;
  severity: InsightSeverity;
  icon: InsightIcon;
  title: string;
  description: string;
  value?: string;
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function sumByCategory(
  installments: CreditCardInstallment[],
  purchases: CreditCardPurchase[],
  invoiceId: string,
): Map<string | null, number> {
  const map = new Map<string | null, number>();
  for (const inst of installments.filter(i => i.invoice_id === invoiceId)) {
    const p = purchases.find(x => x.id === inst.purchase_id);
    const cid = p?.category_id ?? null;
    map.set(cid, (map.get(cid) ?? 0) + Number(inst.amount));
  }
  return map;
}

function buildCardInsights(
  card: CreditCard,
  invoices: CreditCardInvoice[],
  installments: CreditCardInstallment[],
  purchases: CreditCardPurchase[],
  recurringTotal: number,
  categoryName: (id: string | null) => string,
): CardInsight[] {
  const out: CardInsight[] = [];
  const cardInvoices = invoices
    .filter(i => i.card_id === card.id)
    .sort((a, b) => a.reference_month.localeCompare(b.reference_month));
  const current = [...cardInvoices].reverse().find(i => i.status !== 'paid') ?? cardInvoices[cardInvoices.length - 1];
  if (!current) return out;

  const prev = cardInvoices.filter(i => i.reference_month < current.reference_month).slice(-1)[0];
  const prev3 = cardInvoices.filter(i => i.reference_month < current.reference_month).slice(-3);

  const currentTotal = Number(current.total_amount);
  const limit = Number(card.credit_limit);
  const percent = limit > 0 ? (currentTotal / limit) * 100 : 0;

  // 1. Utilization
  if (percent >= 90) {
    out.push({
      id: `${card.id}-util-danger`, cardId: card.id, severity: 'danger', icon: 'alert',
      title: 'Utilização crítica',
      description: `Você já comprometeu ${percent.toFixed(0)}% do limite deste cartão. Evite novas compras até o pagamento.`,
      value: `${percent.toFixed(0)}%`,
    });
  } else if (percent >= 75) {
    out.push({
      id: `${card.id}-util-warn`, cardId: card.id, severity: 'warning', icon: 'alert',
      title: 'Uso alto do limite',
      description: `Fatura em ${percent.toFixed(0)}% do limite. Segure gastos não essenciais até fechar.`,
      value: `${percent.toFixed(0)}%`,
    });
  }

  // 2. Category tendency (biggest riser vs prev invoice)
  if (prev) {
    const curCat = sumByCategory(installments, purchases, current.id);
    const prevCat = sumByCategory(installments, purchases, prev.id);
    let bestId: string | null = null;
    let bestDelta = 0;
    for (const [cid, val] of curCat) {
      const before = prevCat.get(cid) ?? 0;
      const delta = val - before;
      if (delta > bestDelta) { bestDelta = delta; bestId = cid; }
    }
    if (bestId && bestDelta > 0 && (prevCat.get(bestId) ?? 0) > 0) {
      const before = prevCat.get(bestId) ?? 0;
      const growth = before > 0 ? (bestDelta / before) * 100 : 0;
      if (growth >= 25) {
        out.push({
          id: `${card.id}-cat-rise`, cardId: card.id, severity: 'warning', icon: 'trend-up',
          title: `${categoryName(bestId)} cresceu`,
          description: `Você gastou ${fmt(bestDelta)} a mais em ${categoryName(bestId)} nesta fatura comparado à anterior.`,
          value: `+${growth.toFixed(0)}%`,
        });
      }
    }
  }

  // 3. Atypical purchase in current invoice
  const currentInst = installments.filter(i => i.invoice_id === current.id && i.installment_number === 1);
  const historyInst = installments.filter(i => prev3.some(p => p.id === i.invoice_id));
  if (historyInst.length >= 3 && currentInst.length > 0) {
    const avg = historyInst.reduce((s, i) => s + Number(i.amount), 0) / historyInst.length;
    const outlier = currentInst
      .map(i => ({ inst: i, purchase: purchases.find(p => p.id === i.purchase_id) }))
      .filter(x => Number(x.inst.amount) >= avg * 2.5 && Number(x.inst.amount) >= 100)
      .sort((a, b) => Number(b.inst.amount) - Number(a.inst.amount))[0];
    if (outlier && outlier.purchase) {
      out.push({
        id: `${card.id}-outlier`, cardId: card.id, severity: 'info', icon: 'sparkle',
        title: 'Compra fora do padrão',
        description: `“${outlier.purchase.description}” de ${fmt(Number(outlier.inst.amount))} está bem acima da média (${fmt(avg)}).`,
      });
    }
  }

  // 4. Invoice forecast (only if invoice still open)
  if (current.status === 'open') {
    const today = new Date();
    const closing = parseISO(current.closing_date);
    const daysLeft = differenceInDays(closing, today);
    if (daysLeft > 0) {
      const monthStart = parseISO(format(addMonths(closing, -1), 'yyyy-MM-') + '01');
      const daysElapsed = Math.max(differenceInDays(today, monthStart), 1);
      const dailyRate = currentTotal / daysElapsed;
      const forecast = currentTotal + dailyRate * daysLeft;
      if (forecast > currentTotal * 1.05) {
        out.push({
          id: `${card.id}-forecast`, cardId: card.id, severity: 'info', icon: 'forecast',
          title: 'Projeção da fatura',
          description: `Mantendo o ritmo atual, a fatura pode fechar em torno de ${fmt(forecast)} (${daysLeft}d p/ fechar).`,
          value: fmt(forecast),
        });
      }
    }
  }

  // 5. Top category concentration
  const curCatAll = sumByCategory(installments, purchases, current.id);
  if (currentTotal > 0) {
    let topId: string | null = null;
    let topVal = 0;
    for (const [cid, val] of curCatAll) {
      if (val > topVal) { topVal = val; topId = cid; }
    }
    const share = topVal / currentTotal;
    if (share >= 0.4 && topVal >= 100) {
      out.push({
        id: `${card.id}-concentration`, cardId: card.id, severity: 'info', icon: 'target',
        title: 'Categoria dominante',
        description: `${categoryName(topId)} concentra ${(share * 100).toFixed(0)}% da fatura (${fmt(topVal)}). Vale revisar essa área.`,
      });
    }
  }

  // 6. Recurring load
  if (recurringTotal > 0 && currentTotal > 0) {
    const share = recurringTotal / currentTotal;
    if (share >= 0.35) {
      out.push({
        id: `${card.id}-recurring`, cardId: card.id, severity: 'info', icon: 'repeat',
        title: 'Peso das recorrências',
        description: `Assinaturas e cobranças fixas somam ${fmt(recurringTotal)} — ${(share * 100).toFixed(0)}% da fatura atual.`,
      });
    }
  }

  return out;
}

export function useCardInsights(cardId: string): CardInsight[] {
  const { cards, invoices, installments, purchases, recurring } = useCreditCards();
  const { categories } = useFinanceContext();
  const cats = categories as any[];
  return useMemo(() => {
    const card = cards.find(c => c.id === cardId);
    if (!card) return [];
    const categoryName = (id: string | null) => id ? (cats.find(c => c.id === id)?.name ?? 'Sem categoria') : 'Sem categoria';
    const recTotal = recurring.filter(r => r.card_id === cardId && r.is_active).reduce((s, r) => s + Number(r.amount), 0);
    return buildCardInsights(card, invoices, installments, purchases, recTotal, categoryName);
  }, [cardId, cards, invoices, installments, purchases, recurring, cats]);
}

export function useAllCardsInsights(): CardInsight[] {
  const { cards, invoices, installments, purchases, recurring, usage } = useCreditCards();
  const { categories } = useFinanceContext();
  const cats = categories as any[];
  return useMemo(() => {
    const categoryName = (id: string | null) => id ? (cats.find(c => c.id === id)?.name ?? 'Sem categoria') : 'Sem categoria';
    const all: CardInsight[] = [];
    for (const c of cards) {
      const recTotal = recurring.filter(r => r.card_id === c.id && r.is_active).reduce((s, r) => s + Number(r.amount), 0);
      all.push(...buildCardInsights(c, invoices, installments, purchases, recTotal, categoryName));
    }
    // Most used card (only if 2+ cards)
    if (cards.length >= 2 && usage.length > 0) {
      const top = [...usage].sort((a, b) => Number(b.used_amount) - Number(a.used_amount))[0];
      const topCard = cards.find(c => c.id === top.card_id);
      if (topCard && Number(top.used_amount) > 0) {
        all.unshift({
          id: 'global-top-card', cardId: topCard.id, severity: 'info', icon: 'star',
          title: 'Cartão mais usado',
          description: `${topCard.name} lidera com ${fmt(Number(top.used_amount))} em uso este ciclo.`,
        });
      }
    }
    // Dedup by id, cap 6
    const seen = new Set<string>();
    return all.filter(i => (seen.has(i.id) ? false : (seen.add(i.id), true))).slice(0, 6);
  }, [cards, invoices, installments, purchases, recurring, usage, cats]);
}
