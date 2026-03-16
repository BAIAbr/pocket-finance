import { useMemo } from 'react';
import { BarChart3, Snowflake, ChefHat, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useStock } from '@/hooks/useStock';

export default function StockReports() {
  const { products, outputs, outputItems, loading } = useStock();

  const stockOutputItems = useMemo(() =>
    outputItems.filter(i => i.product_type === 'estoque'), [outputItems]);

  const productionOutputItems = useMemo(() =>
    outputItems.filter(i => i.product_type === 'producao_na_hora'), [outputItems]);

  const totalStockOut = useMemo(() =>
    stockOutputItems.reduce((sum, i) => sum + i.quantity, 0), [stockOutputItems]);

  const totalProduced = useMemo(() =>
    productionOutputItems.filter(i => i.production_status === 'produzido').reduce((sum, i) => sum + i.quantity, 0),
    [productionOutputItems]);

  const totalPending = useMemo(() =>
    productionOutputItems.filter(i => i.production_status === 'pendente').reduce((sum, i) => sum + i.quantity, 0),
    [productionOutputItems]);

  // Most used products
  const productUsage = useMemo(() => {
    const usage: Record<string, { name: string; count: number; type: string }> = {};
    outputItems.forEach(item => {
      if (!usage[item.product_id]) {
        usage[item.product_id] = { name: item.product_name, count: 0, type: item.product_type };
      }
      usage[item.product_id].count += item.quantity;
    });
    return Object.values(usage).sort((a, b) => b.count - a.count);
  }, [outputItems]);

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
        <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
        <p className="text-sm text-muted-foreground">Resumo de saídas e produção</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <Snowflake size={18} className="mx-auto text-blue-500 mb-1" />
            <p className="text-lg font-bold text-foreground">{totalStockOut}</p>
            <p className="text-[10px] text-muted-foreground">Saídas do freezer</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <ChefHat size={18} className="mx-auto text-amber-500 mb-1" />
            <p className="text-lg font-bold text-foreground">{totalProduced}</p>
            <p className="text-[10px] text-muted-foreground">Produzidos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <TrendingUp size={18} className="mx-auto text-emerald-500 mb-1" />
            <p className="text-lg font-bold text-foreground">{totalStockOut + totalProduced}</p>
            <p className="text-[10px] text-muted-foreground">Total geral</p>
          </CardContent>
        </Card>
      </div>

      {totalPending > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-3 text-center">
            <p className="text-sm text-foreground font-medium">
              ⚠️ <strong>{totalPending}</strong> {totalPending === 1 ? 'item pendente' : 'itens pendentes'} de produção
            </p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="geral">
        <TabsList className="w-full">
          <TabsTrigger value="geral" className="flex-1">Geral</TabsTrigger>
          <TabsTrigger value="estoque" className="flex-1">Estoque</TabsTrigger>
          <TabsTrigger value="producao" className="flex-1">Produção</TabsTrigger>
        </TabsList>

        <TabsContent value="geral" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Produtos mais usados</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {productUsage.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Sem dados ainda</p>
              ) : (
                productUsage.slice(0, 10).map((p, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-secondary/30">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}º</span>
                      {p.type === 'estoque' ?
                        <Snowflake size={14} className="text-blue-500" /> :
                        <ChefHat size={14} className="text-amber-500" />
                      }
                      <span className="text-sm font-medium text-foreground">{p.name}</span>
                    </div>
                    <Badge variant="secondary">{p.count} un.</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="estoque" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Snowflake size={14} className="text-blue-500" /> Saídas do Freezer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {stockOutputItems.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhuma saída de estoque</p>
              ) : (
                stockOutputItems.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/30">
                    <span className="text-sm text-foreground">{item.product_name}</span>
                    <Badge variant="secondary">{item.quantity} un.</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Current stock */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Estoque Atual</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {products.filter(p => p.product_type === 'estoque').map(p => (
                <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/30">
                  <span className="text-sm text-foreground">{p.name}</span>
                  <Badge variant={p.stock_quantity <= 5 ? "destructive" : "secondary"}>
                    {p.stock_quantity} {p.unit}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="producao" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <ChefHat size={14} className="text-amber-500" /> Itens Produzidos na Hora
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {productionOutputItems.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhuma produção registrada</p>
              ) : (
                productionOutputItems.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/30">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-foreground">{item.product_name}</span>
                      {item.production_status === 'pendente' ? (
                        <Badge className="bg-amber-500/10 text-amber-600 text-[10px] border-0">Pendente</Badge>
                      ) : (
                        <Badge className="bg-emerald-500/10 text-emerald-600 text-[10px] border-0">Pronto</Badge>
                      )}
                    </div>
                    <Badge variant="secondary">{item.quantity} un.</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
