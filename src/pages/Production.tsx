import { useState, useMemo } from 'react';
import { ChefHat, CheckCircle2, PartyPopper, Truck, Calendar, AlertTriangle, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useStock } from '@/hooks/useStock';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Production() {
  const { outputs, outputItems, loading, markAsProduced, todayPendingCount } = useStock();
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [showAll, setShowAll] = useState(false);

  const pendingItems = useMemo(() => {
    return outputItems
      .filter(item => item.production_status === 'pendente')
      .map(item => {
        const output = outputs.find(o => o.id === item.output_id);
        return { ...item, output };
      })
      .filter(item => {
        if (showAll) return true;
        if (!item.output) return false;
        return item.output.output_date.split('T')[0] === dateFilter;
      })
      .sort((a, b) => {
        const dateA = a.output?.output_date || '';
        const dateB = b.output?.output_date || '';
        return dateA.localeCompare(dateB);
      });
  }, [outputItems, outputs, dateFilter, showAll]);

  const producedItems = useMemo(() => {
    return outputItems
      .filter(item => item.production_status === 'produzido')
      .map(item => {
        const output = outputs.find(o => o.id === item.output_id);
        return { ...item, output };
      })
      .sort((a, b) => {
        const dateA = b.produced_at || '';
        const dateB = a.produced_at || '';
        return dateA.localeCompare(dateB);
      })
      .slice(0, 20);
  }, [outputItems, outputs]);

  // Group pending by output type
  const eventItems = pendingItems.filter(i => i.output?.output_type === 'evento');
  const deliveryItems = pendingItems.filter(i => i.output?.output_type === 'entrega_venda');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Produção</h1>
        <p className="text-sm text-muted-foreground">O que precisa ser feito na hora</p>
      </div>

      {/* Alert */}
      {todayPendingCount > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle size={20} className="text-amber-500 shrink-0" />
            <p className="text-sm font-medium text-foreground">
              Você tem <strong className="text-amber-600">{todayPendingCount} {todayPendingCount === 1 ? 'item' : 'itens'}</strong> para produzir hoje!
            </p>
          </CardContent>
        </Card>
      )}

      {/* Date filter */}
      <div className="flex items-center gap-2">
        <Filter size={14} className="text-muted-foreground" />
        <Input
          type="date"
          value={dateFilter}
          onChange={e => { setDateFilter(e.target.value); setShowAll(false); }}
          className="w-auto"
        />
        <Button variant={showAll ? "default" : "outline"} size="sm" onClick={() => setShowAll(!showAll)}>
          {showAll ? 'Filtrar' : 'Ver tudo'}
        </Button>
      </div>

      {/* Events */}
      {eventItems.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
            <PartyPopper size={14} className="text-purple-500" /> Eventos ({eventItems.length})
          </h2>
          <div className="space-y-2">
            {eventItems.map(item => (
              <Card key={item.id} className="border-amber-500/20">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
                      <ChefHat size={18} className="text-amber-500" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground text-sm">{item.product_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.quantity}x • {item.output?.description || 'Sem descrição'}
                      </p>
                      {item.output && (
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Calendar size={10} />
                          {format(new Date(item.output.output_date), "dd/MM HH:mm", { locale: ptBR })}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1 text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                    onClick={() => markAsProduced(item.id)}
                  >
                    <CheckCircle2 size={14} /> Pronto
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Deliveries */}
      {deliveryItems.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
            <Truck size={14} className="text-emerald-500" /> Entregas / Vendas ({deliveryItems.length})
          </h2>
          <div className="space-y-2">
            {deliveryItems.map(item => (
              <Card key={item.id} className="border-amber-500/20">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
                      <ChefHat size={18} className="text-amber-500" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground text-sm">{item.product_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.quantity}x • {item.output?.description || 'Sem descrição'}
                      </p>
                      {item.output && (
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Calendar size={10} />
                          {format(new Date(item.output.output_date), "dd/MM HH:mm", { locale: ptBR })}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1 text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                    onClick={() => markAsProduced(item.id)}
                  >
                    <CheckCircle2 size={14} /> Pronto
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {pendingItems.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle2 size={40} className="mx-auto text-emerald-500/50 mb-3" />
            <p className="text-muted-foreground text-sm">
              {showAll ? 'Nenhuma produção pendente' : 'Nenhuma produção pendente para esta data'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Recently produced */}
      {producedItems.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">Produzidos recentemente</h2>
          <div className="space-y-1">
            {producedItems.map(item => (
              <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-500" />
                  <span className="text-sm text-foreground">{item.product_name}</span>
                  <span className="text-xs text-muted-foreground">x{item.quantity}</span>
                </div>
                {item.produced_at && (
                  <span className="text-[10px] text-muted-foreground">
                    {format(new Date(item.produced_at), "dd/MM HH:mm", { locale: ptBR })}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
