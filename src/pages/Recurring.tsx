import { useState } from 'react';
import { ArrowLeft, Plus, Pause, Play, Pencil, Trash2, CalendarClock, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useRecurring, RecurringTransaction, daysUntil } from '@/hooks/useRecurring';
import { RecurringFormModal } from '@/components/RecurringFormModal';
import { useFinanceContext } from '@/contexts/FinanceContext';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function RecurringPage() {
  const navigate = useNavigate();
  const { items, isLoading, create, update, remove, togglePause, payNow } = useRecurring();
  const { settings, getCategoryById } = useFinanceContext();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringTransaction | null>(null);

  const fmt = (v: number) => `${settings.currencySymbol} ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const handleCreate = () => { setEditing(null); setModalOpen(true); };
  const handleEdit = (r: RecurringTransaction) => { setEditing(r); setModalOpen(true); };
  const handleDelete = async (r: RecurringTransaction) => {
    if (confirm(`Excluir "${r.name}"?`)) await remove(r.id);
  };

  const active = items.filter(i => i.is_active);
  const paused = items.filter(i => !i.is_active);

  return (
    <div className="min-h-screen bg-background pb-28 lg:pb-8 safe-top">
      <header className="px-4 lg:px-8 pt-6 pb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-secondary hover:bg-secondary/70 touch-scale">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <p className="text-muted-foreground text-sm font-medium">Gestão</p>
          <h1 className="text-2xl lg:text-3xl font-bold">Assinaturas & Contas</h1>
        </div>
        <button onClick={handleCreate} className="p-3 rounded-xl bg-primary text-primary-foreground touch-scale shadow-md">
          <Plus size={18} />
        </button>
      </header>

      <main className="px-4 lg:px-8 space-y-6">
        {isLoading ? (
          <div className="card-finance text-center text-sm text-muted-foreground py-12">Carregando...</div>
        ) : items.length === 0 ? (
          <div className="card-finance text-center py-12">
            <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center mx-auto mb-3">
              <CalendarClock size={26} className="text-primary" />
            </div>
            <h3 className="font-semibold mb-1">Sem recorrências ainda</h3>
            <p className="text-sm text-muted-foreground mb-4">Cadastre assinaturas, aluguel, contas fixas ou recebimentos recorrentes.</p>
            <button onClick={handleCreate} className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium touch-scale">
              Criar primeira recorrência
            </button>
          </div>
        ) : (
          <>
            {active.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">Ativas ({active.length})</h2>
                <div className="space-y-2">
                  {active.map(item => (
                    <RecurringRow key={item.id} item={item} fmt={fmt} getCategoryById={getCategoryById}
                      onPay={() => payNow(item)}
                      onEdit={() => handleEdit(item)}
                      onDelete={() => handleDelete(item)}
                      onToggle={() => togglePause(item)}
                    />
                  ))}
                </div>
              </section>
            )}

            {paused.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">Pausadas ({paused.length})</h2>
                <div className="space-y-2 opacity-70">
                  {paused.map(item => (
                    <RecurringRow key={item.id} item={item} fmt={fmt} getCategoryById={getCategoryById}
                      onPay={() => payNow(item)}
                      onEdit={() => handleEdit(item)}
                      onDelete={() => handleDelete(item)}
                      onToggle={() => togglePause(item)}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      <RecurringFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        editing={editing}
        onSubmit={async (input) => {
          if (editing) await update(editing.id, input);
          else await create(input);
        }}
      />
    </div>
  );
}

function RecurringRow({ item, fmt, getCategoryById, onPay, onEdit, onDelete, onToggle }: {
  item: RecurringTransaction;
  fmt: (n: number) => string;
  getCategoryById: (id: string) => any;
  onPay: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  const days = daysUntil(item.next_due_date);
  const cat = item.category_id ? getCategoryById(item.category_id) : null;
  const freqLabel = item.frequency === 'weekly' ? 'Semanal' : item.frequency === 'yearly' ? 'Anual' : 'Mensal';
  const dueLabel = format(parseISO(item.next_due_date), "dd 'de' MMM", { locale: ptBR });

  return (
    <div className="card-finance !p-4">
      <div className="flex items-start gap-3">
        <div className={cn('w-1 self-stretch rounded-full', item.type === 'income' ? 'bg-income' : 'bg-expense')} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold truncate">{item.name}</p>
            <p className={cn('font-semibold text-sm whitespace-nowrap', item.type === 'income' ? 'text-income' : 'text-expense')}>
              {item.type === 'income' ? '+' : '-'}{fmt(item.amount)}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap mt-1">
            <span className="text-[11px] text-muted-foreground">{freqLabel}</span>
            <span className="text-[11px] text-muted-foreground">•</span>
            <span className="text-[11px] text-muted-foreground">Vence {dueLabel}</span>
            {item.is_active && (
              <span className={cn(
                'text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
                days < 0 ? 'bg-destructive/15 text-destructive' :
                days === 0 ? 'bg-primary/15 text-primary' :
                days <= 3 ? 'bg-orange-500/15 text-orange-500' :
                'bg-secondary text-muted-foreground'
              )}>
                {days < 0 ? `${Math.abs(days)}d atraso` : days === 0 ? 'Hoje' : `${days}d`}
              </span>
            )}
            {cat && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground">{cat.name}</span>}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-3">
        {item.is_active && (
          <button onClick={onPay} className="flex-1 py-2 rounded-lg bg-primary/15 text-primary text-xs font-medium flex items-center justify-center gap-1 touch-scale">
            <Check size={14} /> Marcar paga
          </button>
        )}
        <button onClick={onToggle} className="p-2 rounded-lg bg-secondary hover:bg-secondary/70 touch-scale" title={item.is_active ? 'Pausar' : 'Ativar'}>
          {item.is_active ? <Pause size={14} /> : <Play size={14} />}
        </button>
        <button onClick={onEdit} className="p-2 rounded-lg bg-secondary hover:bg-secondary/70 touch-scale" title="Editar">
          <Pencil size={14} />
        </button>
        <button onClick={onDelete} className="p-2 rounded-lg bg-secondary hover:bg-destructive/15 hover:text-destructive touch-scale" title="Excluir">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
