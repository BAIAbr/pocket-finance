import { useState } from 'react';
import { Package, Plus, Snowflake, ChefHat, Pencil, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useStock, Product } from '@/hooks/useStock';

export default function Products() {
  const { products, loading, addProduct, updateProduct, deleteProduct } = useStock();
  const [open, setOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [name, setName] = useState('');
  const [productType, setProductType] = useState<'estoque' | 'producao_na_hora'>('estoque');
  const [stockQuantity, setStockQuantity] = useState(0);
  const [unit, setUnit] = useState('unidade');

  const resetForm = () => {
    setName('');
    setProductType('estoque');
    setStockQuantity(0);
    setUnit('unidade');
    setEditProduct(null);
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    if (editProduct) {
      await updateProduct(editProduct.id, {
        name,
        product_type: productType,
        stock_quantity: productType === 'estoque' ? stockQuantity : 0,
        unit,
      });
    } else {
      await addProduct({
        name,
        product_type: productType,
        stock_quantity: productType === 'estoque' ? stockQuantity : 0,
        unit,
        icon: 'Package',
        color: productType === 'estoque' ? '#3B82F6' : '#F59E0B',
      });
    }
    setOpen(false);
    resetForm();
  };

  const handleEdit = (product: Product) => {
    setEditProduct(product);
    setName(product.name);
    setProductType(product.product_type);
    setStockQuantity(product.stock_quantity);
    setUnit(product.unit);
    setOpen(true);
  };

  const stockProducts = products.filter(p => p.product_type === 'estoque');
  const productionProducts = products.filter(p => p.product_type === 'producao_na_hora');

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
          <h1 className="text-2xl font-bold text-foreground">Produtos</h1>
          <p className="text-sm text-muted-foreground">Gerencie seus salgados e produtos</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus size={16} /> Novo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editProduct ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nome do produto</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Coxinha" />
              </div>
              <div>
                <Label>Tipo de produto</Label>
                <Select value={productType} onValueChange={(v: 'estoque' | 'producao_na_hora') => setProductType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="estoque">
                      <div className="flex items-center gap-2">
                        <Snowflake size={14} className="text-blue-500" /> Estoque (freezer)
                      </div>
                    </SelectItem>
                    <SelectItem value="producao_na_hora">
                      <div className="flex items-center gap-2">
                        <ChefHat size={14} className="text-amber-500" /> Produção na hora
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {productType === 'estoque' && (
                <div>
                  <Label>Quantidade em estoque</Label>
                  <Input type="number" min={0} value={stockQuantity} onChange={e => setStockQuantity(Number(e.target.value))} />
                </div>
              )}
              <div>
                <Label>Unidade</Label>
                <Input value={unit} onChange={e => setUnit(e.target.value)} placeholder="unidade, kg, pacote..." />
              </div>
              <Button onClick={handleSubmit} className="w-full">{editProduct ? 'Salvar' : 'Adicionar'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Estoque */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
          <Snowflake size={14} className="text-blue-500" /> Estoque ({stockProducts.length})
        </h2>
        {stockProducts.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">Nenhum produto de estoque cadastrado</CardContent></Card>
        ) : (
          <div className="space-y-2">
            {stockProducts.map(p => (
              <Card key={p.id} className="overflow-hidden">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center">
                      <Snowflake size={18} className="text-blue-500" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.stock_quantity} {p.unit}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 text-xs">Freezer</Badge>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(p)}>
                      <Pencil size={14} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteProduct(p.id)}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Produção na hora */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
          <ChefHat size={14} className="text-amber-500" /> Produção na Hora ({productionProducts.length})
        </h2>
        {productionProducts.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">Nenhum produto de produção cadastrado</CardContent></Card>
        ) : (
          <div className="space-y-2">
            {productionProducts.map(p => (
              <Card key={p.id} className="overflow-hidden border-amber-500/20">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
                      <ChefHat size={18} className="text-amber-500" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{p.name}</p>
                      <p className="text-xs text-muted-foreground">Feito sob demanda</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 text-xs">Produzir</Badge>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(p)}>
                      <Pencil size={14} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteProduct(p.id)}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
