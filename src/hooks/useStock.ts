import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useFamilyContext } from '@/contexts/FamilyContext';
import { useToast } from '@/hooks/use-toast';

export interface Product {
  id: string;
  user_id: string;
  family_id: string | null;
  name: string;
  product_type: 'estoque' | 'producao_na_hora';
  stock_quantity: number;
  unit: string;
  icon: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface StockOutput {
  id: string;
  user_id: string;
  family_id: string | null;
  output_type: 'evento' | 'entrega_venda';
  description: string | null;
  output_date: string;
  status: 'pendente' | 'concluida' | 'cancelada';
  created_at: string;
}

export interface StockOutputItem {
  id: string;
  output_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  product_type: string;
  production_status: 'nao_aplicavel' | 'pendente' | 'produzido';
  produced_at: string | null;
  created_at: string;
}

export function useStock() {
  const { user } = useAuth();
  const { currentFamily, isFamily } = useFamilyContext();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [outputs, setOutputs] = useState<StockOutput[]>([]);
  const [outputItems, setOutputItems] = useState<StockOutputItem[]>([]);
  const [loading, setLoading] = useState(true);

  const familyId = isFamily && currentFamily ? currentFamily.id : null;

  const fetchProducts = useCallback(async () => {
    if (!user) return;
    let query = supabase.from('products').select('*');
    if (familyId) {
      query = query.eq('family_id', familyId);
    } else {
      query = query.is('family_id', null).eq('user_id', user.id);
    }
    const { data, error } = await query.order('name');
    if (!error && data) setProducts(data as unknown as Product[]);
  }, [user, familyId]);

  const fetchOutputs = useCallback(async () => {
    if (!user) return;
    let query = supabase.from('stock_outputs').select('*');
    if (familyId) {
      query = query.eq('family_id', familyId);
    } else {
      query = query.is('family_id', null).eq('user_id', user.id);
    }
    const { data, error } = await query.order('output_date', { ascending: false });
    if (!error && data) setOutputs(data as unknown as StockOutput[]);
  }, [user, familyId]);

  const fetchOutputItems = useCallback(async () => {
    if (!user) return;
    const outputIds = outputs.map(o => o.id);
    if (outputIds.length === 0) { setOutputItems([]); return; }
    const { data, error } = await supabase
      .from('stock_output_items')
      .select('*')
      .in('output_id', outputIds);
    if (!error && data) setOutputItems(data as unknown as StockOutputItem[]);
  }, [user, outputs]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([fetchProducts(), fetchOutputs()]).finally(() => setLoading(false));
  }, [fetchProducts, fetchOutputs, user]);

  useEffect(() => {
    fetchOutputItems();
  }, [fetchOutputItems]);

  const addProduct = async (product: Omit<Product, 'id' | 'user_id' | 'family_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return;
    const { error } = await supabase.from('products').insert({
      ...product,
      user_id: user.id,
      family_id: familyId,
    } as any);
    if (error) {
      toast({ title: 'Erro ao adicionar produto', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Produto adicionado!' });
      fetchProducts();
    }
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    const { error } = await supabase.from('products').update(updates as any).eq('id', id);
    if (error) {
      toast({ title: 'Erro ao atualizar produto', description: error.message, variant: 'destructive' });
    } else {
      fetchProducts();
    }
  };

  const deleteProduct = async (id: string) => {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      toast({ title: 'Erro ao excluir produto', description: error.message, variant: 'destructive' });
    } else {
      fetchProducts();
    }
  };

  const createOutput = async (
    outputType: 'evento' | 'entrega_venda',
    description: string,
    outputDate: string,
    items: { product_id: string; product_name: string; quantity: number; product_type: string }[]
  ) => {
    if (!user) return;

    // Validate stock items
    for (const item of items) {
      if (item.product_type === 'estoque') {
        const product = products.find(p => p.id === item.product_id);
        if (product && item.quantity > product.stock_quantity) {
          toast({
            title: 'Estoque insuficiente',
            description: `${item.product_name}: disponível ${product.stock_quantity}, solicitado ${item.quantity}`,
            variant: 'destructive',
          });
          return false;
        }
      }
    }

    const { data: outputData, error: outputError } = await supabase
      .from('stock_outputs')
      .insert({
        user_id: user.id,
        family_id: familyId,
        output_type: outputType,
        description,
        output_date: outputDate,
      } as any)
      .select()
      .single();

    if (outputError || !outputData) {
      toast({ title: 'Erro ao criar saída', description: outputError?.message, variant: 'destructive' });
      return false;
    }

    const outputId = (outputData as any).id;

    const itemsToInsert = items.map(item => ({
      output_id: outputId,
      product_id: item.product_id,
      product_name: item.product_name,
      quantity: item.quantity,
      product_type: item.product_type,
      production_status: item.product_type === 'producao_na_hora' ? 'pendente' : 'nao_aplicavel',
    }));

    const { error: itemsError } = await supabase.from('stock_output_items').insert(itemsToInsert as any);
    if (itemsError) {
      toast({ title: 'Erro ao adicionar itens', description: itemsError.message, variant: 'destructive' });
      return false;
    }

    // Deduct stock for "estoque" items
    for (const item of items) {
      if (item.product_type === 'estoque') {
        const product = products.find(p => p.id === item.product_id);
        if (product) {
          await supabase.from('products').update({
            stock_quantity: product.stock_quantity - item.quantity,
          } as any).eq('id', item.product_id);
        }
      }
    }

    toast({ title: 'Saída registrada com sucesso!' });
    await Promise.all([fetchProducts(), fetchOutputs()]);
    return true;
  };

  const markAsProduced = async (itemId: string) => {
    const { error } = await supabase
      .from('stock_output_items')
      .update({ production_status: 'produzido', produced_at: new Date().toISOString() } as any)
      .eq('id', itemId);
    if (error) {
      toast({ title: 'Erro ao marcar como produzido', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Item marcado como produzido!' });
      fetchOutputItems();
    }
  };

  const pendingProduction = outputItems.filter(item => item.production_status === 'pendente');

  const todayPendingCount = pendingProduction.filter(item => {
    const output = outputs.find(o => o.id === item.output_id);
    if (!output) return false;
    const today = new Date().toISOString().split('T')[0];
    return output.output_date.split('T')[0] === today;
  }).length;

  return {
    products,
    outputs,
    outputItems,
    loading,
    addProduct,
    updateProduct,
    deleteProduct,
    createOutput,
    markAsProduced,
    pendingProduction,
    todayPendingCount,
    refetch: () => Promise.all([fetchProducts(), fetchOutputs()]),
  };
}
