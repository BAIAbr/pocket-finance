import { useState, useMemo, useCallback } from 'react';
import { useFinanceContext } from '@/contexts/FinanceContext';
import { Transaction } from '@/hooks/useSupabaseFinance';
import { useFireSystem, getTransactionFireInfo } from '@/hooks/useFireSystem';
import { FireBadge } from '@/components/FireBadge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  parseISO, format, startOfDay, endOfDay, subDays, startOfMonth, endOfMonth,
  isWithinInterval, differenceInDays, subMonths
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  CalendarIcon, TrendingUp, TrendingDown, Wallet, Activity,
  Download, ArrowUpRight, ArrowDownRight, ChevronDown, ChevronRight
} from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, PieChart, Pie, Cell
} from 'recharts';
import { getIconByName } from '@/lib/icons';

type QuickFilter = 'today' | '7days' | 'thisMonth' | 'lastMonth' | 'custom';
type TransactionTab = 'expenses' | 'income' | 'byCategory';

const quickFilters: { key: QuickFilter; label: string }[] = [
  { key: 'today', label: 'Hoje' },
  { key: '7days', label: '7 dias' },
  { key: 'thisMonth', label: 'Este mês' },
  { key: 'lastMonth', label: 'Mês anterior' },
  { key: 'custom', label: 'Personalizado' },
];

const transactionTabs: { key: TransactionTab; label: string }[] = [
  { key: 'expenses', label: 'Gastos' },
  { key: 'income', label: 'Entradas' },
  { key: 'byCategory', label: 'Por Categoria' },
];

function getDateRange(filter: QuickFilter, customStart?: Date, customEnd?: Date): { start: Date; end: Date } {
  const now = new Date();
  switch (filter) {
    case 'today':
      return { start: startOfDay(now), end: endOfDay(now) };
    case '7days':
      return { start: startOfDay(subDays(now, 6)), end: endOfDay(now) };
    case 'thisMonth':
      return { start: startOfMonth(now), end: endOfDay(now) };
    case 'lastMonth': {
      const last = subMonths(now, 1);
      return { start: startOfMonth(last), end: endOfMonth(last) };
    }
    case 'custom':
      return {
        start: customStart ? startOfDay(customStart) : startOfMonth(now),
        end: customEnd ? endOfDay(customEnd) : endOfDay(now),
      };
  }
}

const CHART_COLORS = [
  'hsl(250, 89%, 60%)', 'hsl(160, 84%, 39%)', 'hsl(346, 77%, 50%)',
  'hsl(38, 92%, 50%)', 'hsl(200, 80%, 50%)', 'hsl(280, 70%, 55%)',
  'hsl(20, 90%, 50%)', 'hsl(120, 60%, 45%)',
];

interface CategoryGroupProps {
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  transactions: Transaction[];
  totalAmount: number;
  formatCurrency: (v: number) => string;
  categoryAverages: Map<string, number>;
  allTransactions: Transaction[];
  getCategoryById: (id: string | null) => any;
}

function CategoryGroup({
  categoryName, categoryIcon, categoryColor, transactions, totalAmount,
  formatCurrency, categoryAverages, allTransactions, getCategoryById
}: CategoryGroupProps) {
  const [isOpen, setIsOpen] = useState(false);
  const IconComponent = getIconByName(categoryIcon);

  return (
    <div className="rounded-xl border border-border/50 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 p-3 bg-secondary/30 hover:bg-secondary/50 transition-colors"
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${categoryColor}15` }}
        >
          <IconComponent size={18} style={{ color: categoryColor }} />
        </div>
        <div className="flex-1 text-left min-w-0">
          <p className="font-medium text-sm truncate">{categoryName}</p>
          <p className="text-xs text-muted-foreground">{transactions.length} transaç{transactions.length === 1 ? 'ão' : 'ões'}</p>
        </div>
        <span className="font-mono font-semibold text-sm text-expense shrink-0">
          {formatCurrency(totalAmount)}
        </span>
        {isOpen ? <ChevronDown size={16} className="text-muted-foreground shrink-0" /> : <ChevronRight size={16} className="text-muted-foreground shrink-0" />}
      </button>

      {isOpen && (
        <div className="divide-y divide-border/30">
          {transactions.map(transaction => {
            const fireInfo = getTransactionFireInfo(transaction, allTransactions, categoryAverages);
            const cat = getCategoryById(transaction.category_id);
            const isIncome = transaction.type === 'income';

            return (
              <div key={transaction.id} className="flex items-center gap-3 p-3 pl-6">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-medium text-sm text-foreground truncate">
                      {transaction.description || cat?.name || 'Transação'}
                    </p>
                    <FireBadge level={fireInfo.level} reasons={fireInfo.reasons} size="sm" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {format(parseISO(transaction.date), "d 'de' MMM", { locale: ptBR })}
                  </p>
                </div>
                <span className={cn('font-mono font-semibold text-sm', isIncome ? 'text-income' : 'text-expense')}>
                  {isIncome ? '+' : '-'}{formatCurrency(Number(transaction.amount))}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function FinancialHistory() {
  const { transactions, categories, formatCurrency, getCategoryById } = useFinanceContext();
  const { categoryAverages } = useFireSystem(transactions as Transaction[]);

  const [activeFilter, setActiveFilter] = useState<QuickFilter>(() => {
    const saved = localStorage.getItem('finHistory_filter');
    return (saved as QuickFilter) || 'thisMonth';
  });
  const [customStart, setCustomStart] = useState<Date | undefined>();
  const [customEnd, setCustomEnd] = useState<Date | undefined>();
  const [activeTab, setActiveTab] = useState<TransactionTab>('expenses');

  const handleFilterChange = useCallback((filter: QuickFilter) => {
    setActiveFilter(filter);
    localStorage.setItem('finHistory_filter', filter);
  }, []);

  const { start, end } = useMemo(
    () => getDateRange(activeFilter, customStart, customEnd),
    [activeFilter, customStart, customEnd]
  );

  const filteredTransactions = useMemo(() => {
    return (transactions as Transaction[])
      .filter(t => {
        const d = parseISO(t.date);
        return isWithinInterval(d, { start, end });
      })
      .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
  }, [transactions, start, end]);

  // Filtered by tab type
  const tabTransactions = useMemo(() => {
    if (activeTab === 'expenses') return filteredTransactions.filter(t => t.type === 'expense');
    if (activeTab === 'income') return filteredTransactions.filter(t => t.type === 'income');
    return filteredTransactions;
  }, [filteredTransactions, activeTab]);

  // Grouped by category
  const categoryGroups = useMemo(() => {
    const groups = new Map<string, { transactions: Transaction[]; total: number }>();
    const expenseTransactions = filteredTransactions.filter(t => t.type === 'expense');
    
    expenseTransactions.forEach(t => {
      const catId = t.category_id || 'other';
      const existing = groups.get(catId) || { transactions: [], total: 0 };
      existing.transactions.push(t);
      existing.total += Number(t.amount);
      groups.set(catId, existing);
    });

    return Array.from(groups.entries())
      .map(([catId, data]) => {
        const cat = getCategoryById(catId);
        return {
          catId,
          name: cat?.name || 'Outros',
          icon: cat?.icon || 'Circle',
          color: cat?.color || '#888',
          transactions: data.transactions.sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime()),
          total: data.total,
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [filteredTransactions, getCategoryById]);

  // Summary
  const summary = useMemo(() => {
    const income = filteredTransactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
    const expense = filteredTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
    const days = Math.max(1, differenceInDays(end, start) + 1);
    return { income, expense, balance: income - expense, avgDaily: expense / days };
  }, [filteredTransactions, start, end]);

  // Line chart data - reactive to active tab
  const chartType = activeTab === 'income' ? 'income' : 'expense';
  const lineData = useMemo(() => {
    const dayMap = new Map<string, number>();
    filteredTransactions
      .filter(t => t.type === chartType)
      .forEach(t => {
        const key = t.date;
        dayMap.set(key, (dayMap.get(key) || 0) + Number(t.amount));
      });
    return Array.from(dayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, total]) => ({
        date: format(parseISO(date), 'dd/MM', { locale: ptBR }),
        total,
      }));
  }, [filteredTransactions, chartType]);

  // Pie chart data - reactive to tab
  const pieData = useMemo(() => {
    const typeFilter = activeTab === 'income' ? 'income' : 'expense';
    const catMap = new Map<string, number>();
    filteredTransactions
      .filter(t => t.type === typeFilter)
      .forEach(t => {
        const catId = t.category_id || 'other';
        catMap.set(catId, (catMap.get(catId) || 0) + Number(t.amount));
      });
    return Array.from(catMap.entries())
      .map(([catId, total]) => {
        const cat = getCategoryById(catId);
        return { name: cat?.name || 'Outros', value: total, color: cat?.color || '#888' };
      })
      .sort((a, b) => b.value - a.value);
  }, [filteredTransactions, getCategoryById, activeTab]);

  // Export CSV
  const exportCSV = useCallback(() => {
    const header = 'Data,Tipo,Categoria,Descrição,Valor\n';
    const rows = filteredTransactions.map(t => {
      const cat = getCategoryById(t.category_id);
      return `${t.date},${t.type === 'income' ? 'Entrada' : 'Saída'},${cat?.name || ''},${t.description || ''},${Number(t.amount).toFixed(2)}`;
    }).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `historico_${format(start, 'yyyy-MM-dd')}_${format(end, 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredTransactions, getCategoryById, start, end]);

  // Insight
  const insight = useMemo(() => {
    if (filteredTransactions.length === 0) return null;
    const topExpense = filteredTransactions
      .filter(t => t.type === 'expense')
      .sort((a, b) => Number(b.amount) - Number(a.amount))[0];
    if (!topExpense) return null;
    const cat = getCategoryById(topExpense.category_id);
    return `Maior gasto: ${formatCurrency(Number(topExpense.amount))} em ${cat?.name || 'Outros'}`;
  }, [filteredTransactions, getCategoryById, formatCurrency]);

  return (
    <div className="min-h-screen bg-background pb-28 lg:pb-8 safe-top">
      <header className="px-4 lg:px-8 pt-6 pb-4 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
        <div className="relative flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-sm font-medium">Análise detalhada</p>
            <h1 className="text-2xl lg:text-3xl font-bold">Histórico Financeiro</h1>
          </div>
          <Button variant="outline" size="icon" onClick={exportCSV} title="Exportar CSV">
            <Download size={18} />
          </Button>
        </div>
      </header>

      <main className="px-4 lg:px-8 space-y-5">
        {/* Quick Filters */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 animate-fade-in">
          {quickFilters.map(f => (
            <button
              key={f.key}
              onClick={() => handleFilterChange(f.key)}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all touch-scale',
                activeFilter === f.key
                  ? 'bg-primary text-primary-foreground shadow-glow-accent'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Custom date pickers */}
        {activeFilter === 'custom' && (
          <div className="flex gap-2 animate-fade-in">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="flex-1 justify-start text-left text-sm">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {customStart ? format(customStart, 'dd/MM/yy') : 'Início'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={customStart} onSelect={setCustomStart} className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="flex-1 justify-start text-left text-sm">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {customEnd ? format(customEnd, 'dd/MM/yy') : 'Fim'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={customEnd} onSelect={setCustomEnd} className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 animate-fade-in stagger-1">
          <Card className="p-3 card-finance">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-success/15">
                <ArrowUpRight size={16} className="text-income" />
              </div>
              <span className="text-xs text-muted-foreground">Entradas</span>
            </div>
            <p className="font-mono-amount font-bold text-income text-sm">{formatCurrency(summary.income)}</p>
          </Card>
          <Card className="p-3 card-finance">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-destructive/15">
                <ArrowDownRight size={16} className="text-expense" />
              </div>
              <span className="text-xs text-muted-foreground">Saídas</span>
            </div>
            <p className="font-mono-amount font-bold text-expense text-sm">{formatCurrency(summary.expense)}</p>
          </Card>
          <Card className="p-3 card-finance">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary/15">
                <Wallet size={16} className="text-primary" />
              </div>
              <span className="text-xs text-muted-foreground">Saldo</span>
            </div>
            <p className={cn('font-mono-amount font-bold text-sm', summary.balance >= 0 ? 'text-income' : 'text-expense')}>
              {formatCurrency(summary.balance)}
            </p>
          </Card>
          <Card className="p-3 card-finance">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-warning/15">
                <Activity size={16} className="text-warning" />
              </div>
              <span className="text-xs text-muted-foreground">Média/dia</span>
            </div>
            <p className="font-mono-amount font-bold text-sm text-foreground">{formatCurrency(summary.avgDaily)}</p>
          </Card>
        </div>

        {/* Insight */}
        {insight && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/10 border border-primary/20 text-sm animate-fade-in stagger-2">
            <TrendingUp size={16} className="text-primary shrink-0" />
            <span className="text-foreground">{insight}</span>
          </div>
        )}

        {/* Charts - side by side on desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {lineData.length > 1 && (
            <Card className="p-4 card-finance animate-fade-in stagger-2">
              <h3 className="text-sm font-semibold mb-3">{activeTab === 'income' ? 'Entradas por dia' : 'Gastos por dia'}</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={lineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <RechartsTooltip
                    formatter={(value: number) => [formatCurrency(value), activeTab === 'income' ? 'Entrada' : 'Gasto']}
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '0.75rem',
                      fontSize: '0.8rem',
                    }}
                  />
                  <Line type="monotone" dataKey="total" stroke={activeTab === 'income' ? 'hsl(var(--income))' : 'hsl(var(--expense))'} strokeWidth={2} dot={{ r: 3, fill: activeTab === 'income' ? 'hsl(var(--income))' : 'hsl(var(--expense))' }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          )}

          {pieData.length > 0 && (
            <Card className="p-4 card-finance animate-fade-in stagger-3">
              <h3 className="text-sm font-semibold mb-3">{activeTab === 'income' ? 'Entradas por categoria' : 'Gastos por categoria'}</h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={40} paddingAngle={3} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {pieData.map((entry, index) => (
                      <Cell key={index} fill={entry.color || CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    formatter={(value: number) => [formatCurrency(value), 'Total']}
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '0.75rem',
                      fontSize: '0.8rem',
                      color: 'hsl(var(--foreground))',
                    }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                    labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          )}
        </div>

        {/* Transaction Tabs */}
        <div className="animate-fade-in stagger-3">
          <div className="flex items-center gap-2 mb-4 overflow-x-auto scrollbar-hide">
            {transactionTabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all',
                  activeTab === tab.key
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground'
                )}
              >
                {tab.label}
              </button>
            ))}
            <span className="ml-auto text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-full whitespace-nowrap shrink-0">
              {activeTab === 'byCategory' ? `${categoryGroups.length} categorias` : `${tabTransactions.length} registros`}
            </span>
          </div>

          {/* By Category View */}
          {activeTab === 'byCategory' ? (
            categoryGroups.length === 0 ? (
              <Card className="card-finance text-center py-8">
                <p className="text-muted-foreground">Nenhum gasto neste período</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {categoryGroups.map(group => (
                  <CategoryGroup
                    key={group.catId}
                    categoryName={group.name}
                    categoryIcon={group.icon}
                    categoryColor={group.color}
                    transactions={group.transactions}
                    totalAmount={group.total}
                    formatCurrency={formatCurrency}
                    categoryAverages={categoryAverages}
                    allTransactions={transactions as Transaction[]}
                    getCategoryById={getCategoryById}
                  />
                ))}
              </div>
            )
          ) : (
            /* Flat list view (Gastos / Entradas) */
            tabTransactions.length === 0 ? (
              <Card className="card-finance text-center py-8">
                <p className="text-muted-foreground">
                  {activeTab === 'expenses' ? 'Nenhum gasto neste período' : 'Nenhuma entrada neste período'}
                </p>
              </Card>
            ) : (
              <div className="space-y-2">
                {tabTransactions.map(transaction => {
                  const fireInfo = getTransactionFireInfo(transaction, transactions as Transaction[], categoryAverages);
                  const cat = getCategoryById(transaction.category_id);
                  const IconComponent = getIconByName(cat?.icon || 'Circle');
                  const isIncome = transaction.type === 'income';

                  return (
                    <div key={transaction.id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50 touch-scale transaction-item group">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 group-hover:scale-110"
                        style={{ backgroundColor: `${cat?.color}15`, boxShadow: `0 4px 12px -4px ${cat?.color}40` }}
                      >
                        <IconComponent size={20} style={{ color: cat?.color }} className="transition-transform group-hover:scale-110" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-medium text-foreground truncate">
                            {transaction.description || cat?.name || 'Transação'}
                          </p>
                          <FireBadge level={fireInfo.level} reasons={fireInfo.reasons} size="sm" />
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          <span className={cn('inline-block px-1.5 py-0.5 rounded text-xs mr-1.5', isIncome ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive')}>
                            {cat?.name}
                          </span>
                          {format(parseISO(transaction.date), "d 'de' MMM", { locale: ptBR })}
                        </p>
                      </div>
                      <span className={cn('font-mono font-semibold text-sm', isIncome ? 'text-income' : 'text-expense')}>
                        {isIncome ? '+' : '-'}{formatCurrency(Number(transaction.amount))}
                      </span>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>
      </main>
    </div>
  );
}
