import { useState } from 'react';
import { PackageOpen, Plus, Calendar, PartyPopper, Truck, ChefHat, Snowflake, Minus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useStock } from '@/hooks/useStock';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface OutputItem {
  product_id: string;
  product_name: string;
  quantity: number;
  product_type: string;
}

export default function StockOutputs() {
  const { products, outputs, outputItems, loading, createOutput } = useStock();
  const [open, setOpen] = useState(false);
  const [outputType, setOutputType] = useState<'evento' | 'entrega_venda'>('evento');
  const [description, setDescription] = useState('');
  const [outputDate, setOutputDate] = useState(new Date().toISOString().split('T')[0]);
  const [items, setItems] = useState<OutputItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedQty, setSelectedQty] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const addItem = () => {
    const product = products.find(p => p.id === selectedProduct);
    if (!product) return;
    const existing = items.find(i => i.product_id === selectedProduct);
    if (existing) {
      setItems(items.map(i => i.product_id === selectedProduct ? { ...i, quantity: i.quantity + selectedQty } : i));
    } else {
      setItems([...items, {
        product_id: product.id,
        product_name: product.name,
        quantity: selectedQty,
        product_type: product.product_type,
      }]);
    }
    setSelectedProduct('');
    setSelectedQty(1);
  };

  const removeItem = (productId: string) => {
    setItems(items.filter(i => i.product_id !== productId));
  };

  const handleSubmit = async () => {
    if (items.length === 0) return;
    setSubmitting(true);
    const success = await createOutput(outputType, description, new Date(outputDate + 'T12:00:00').toISOString(), items);
    if (success) {
      setOpen(false);
      setItems([]);
      setDescription('');
      setOutputDate(new Date().toISOString().split('T')[0]);
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Saídas</h1>
          <p className="text-sm text-muted-foreground">Controle de saídas do estoque</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2"><Plus size={16} /> Nova Saída</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nova Saída</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Tipo de saída</Label>
                <Select value={outputType} onValueChange={(v: 'evento' | 'entrega_venda') => setOutputType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="evento">
                      <div className="flex items-center gap-2"><PartyPopper size={14} /> Evento</div>
                    </SelectItem>
                    <SelectItem value="entrega_venda">
                      <div className="flex items-center gap-2"><Truck size={14} /> Entrega / Venda</div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Descrição</Label>
                <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Ex: Festa do João, Encomenda Maria..." />
              </div>
              <div>
                <Label>Data / Horário</Label>
                <Input type="date" value={outputDate} onChange={e => setOutputDate(e.target.value)} />
              </div>

              {/* Add items */}
              <div className="border rounded-lg p-3 space-y-3">
                <Label className="text-xs font-semibold text-muted-foreground">Adicionar Salgados</Label>
                <div className="flex gap-2">
                  <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Selecionar produto" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          <div className="flex items-center gap-2">
                            {p.product_type === 'estoque' ? <Snowflake size={12} className="text-blue-500" /> : <ChefHat size={12} className="text-amber-500" />}
                            {p.name}
                            {p.product_type === 'estoque' && <span className="text-muted-foreground text-xs">({p.stock_quantity})</span>}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input type="number" min={1} value={selectedQty} onChange={e => setSelectedQty(Number(e.target.value))} className="w-20" />
                  <Button variant="outline" size="icon" onClick={addItem} disabled={!selectedProduct}>
                    <Plus size={16} />
                  </Button>
                </div>

                {items.length > 0 && (
                  <div className="space-y-2 mt-2">
                    {items.map(item => (
                      <div key={item.product_id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/50">
                        <div className="flex items-center gap-2">
                          {item.product_type === 'estoque' ?
                            <Snowflake size={14} className="text-blue-500" /> :
                            <ChefHat size={14} className="text-amber-500" />
                          }
                          <span className="text-sm font-medium">{item.product_name}</span>
                          <Badge variant="outline" className="text-xs">{item.quantity}x</Badge>
                          {item.product_type === 'producao_na_hora' && (
                            <Badge className="bg-amber-500/10 text-amber-600 text-[10px] border-0">Produzir</Badge>
                          )}
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeItem(item.product_id)}>
                          <Minus size={12} />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button onClick={handleSubmit} className="w-full" disabled={items.length === 0 || submitting}>
                {submitting ? 'Registrando...' : 'Registrar Saída'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Outputs list */}
      {outputs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <PackageOpen size={40} className="mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground text-sm">Nenhuma saída registrada</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {outputs.map(output => {
            const items = outputItems.filter(i => i.output_id === output.id);
            const hasProduction = items.some(i => i.production_status === 'pendente');
            return (
              <Card key={output.id} className={hasProduction ? 'border-amber-500/30' : ''}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {output.output_type === 'evento' ?
                        <PartyPopper size={16} className="text-purple-500" /> :
                        <Truck size={16} className="text-emerald-500" />
                      }
                      <span className="font-semibold text-sm text-foreground">
                        {output.output_type === 'evento' ? 'Evento' : 'Entrega/Venda'}
                      </span>
                      {hasProduction && <Badge className="bg-amber-500/10 text-amber-600 text-[10px] border-0">Produção pendente</Badge>}
                    </div>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar size={12} />
                      {format(new Date(output.output_date), "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                  </div>
                  {output.description && <p className="text-xs text-muted-foreground">{output.description}</p>}
                  <div className="space-y-1">
                    {items.map(item => (
                      <div key={item.id} className="flex items-center gap-2 text-xs">
                        {item.product_type === 'estoque' ?
                          <Snowflake size={12} className="text-blue-500" /> :
                          <ChefHat size={12} className="text-amber-500" />
                        }
                        <span className="text-foreground">{item.product_name}</span>
                        <span className="text-muted-foreground">x{item.quantity}</span>
                        {item.production_status === 'pendente' && (
                          <Badge variant="outline" className="text-amber-600 text-[10px] border-amber-400">Produzir</Badge>
                        )}
                        {item.production_status === 'produzido' && (
                          <Badge variant="outline" className="text-emerald-600 text-[10px] border-emerald-400">Pronto ✓</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
