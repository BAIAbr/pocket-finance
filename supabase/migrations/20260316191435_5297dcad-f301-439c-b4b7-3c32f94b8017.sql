
-- Products table
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  family_id TEXT,
  name TEXT NOT NULL,
  product_type TEXT NOT NULL DEFAULT 'estoque' CHECK (product_type IN ('estoque', 'producao_na_hora')),
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'unidade',
  icon TEXT NOT NULL DEFAULT 'Package',
  color TEXT NOT NULL DEFAULT '#F59E0B',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own products" ON public.products FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own products" ON public.products FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own products" ON public.products FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own products" ON public.products FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Family members can view products" ON public.products FOR SELECT USING (
  family_id IS NOT NULL AND family_id::uuid IN (SELECT get_my_family_ids())
);
CREATE POLICY "Family members can manage products" ON public.products FOR ALL USING (
  family_id IS NOT NULL AND family_id::uuid IN (SELECT get_my_family_ids())
) WITH CHECK (
  family_id IS NOT NULL AND family_id::uuid IN (SELECT get_my_family_ids()) AND auth.uid() = user_id
);

-- Stock outputs table
CREATE TABLE public.stock_outputs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  family_id TEXT,
  output_type TEXT NOT NULL CHECK (output_type IN ('evento', 'entrega_venda')),
  description TEXT,
  output_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'concluida', 'cancelada')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.stock_outputs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own outputs" ON public.stock_outputs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own outputs" ON public.stock_outputs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own outputs" ON public.stock_outputs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own outputs" ON public.stock_outputs FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Family members can view outputs" ON public.stock_outputs FOR SELECT USING (
  family_id IS NOT NULL AND family_id::uuid IN (SELECT get_my_family_ids())
);
CREATE POLICY "Family members can manage outputs" ON public.stock_outputs FOR ALL USING (
  family_id IS NOT NULL AND family_id::uuid IN (SELECT get_my_family_ids())
) WITH CHECK (
  family_id IS NOT NULL AND family_id::uuid IN (SELECT get_my_family_ids()) AND auth.uid() = user_id
);

-- Stock output items table
CREATE TABLE public.stock_output_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  output_id UUID NOT NULL REFERENCES public.stock_outputs(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  product_type TEXT NOT NULL DEFAULT 'estoque',
  production_status TEXT NOT NULL DEFAULT 'nao_aplicavel' CHECK (production_status IN ('nao_aplicavel', 'pendente', 'produzido')),
  produced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.stock_output_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view output items via output" ON public.stock_output_items FOR SELECT USING (
  output_id IN (SELECT id FROM public.stock_outputs WHERE user_id = auth.uid())
);
CREATE POLICY "Users can insert output items" ON public.stock_output_items FOR INSERT WITH CHECK (
  output_id IN (SELECT id FROM public.stock_outputs WHERE user_id = auth.uid())
);
CREATE POLICY "Users can update output items" ON public.stock_output_items FOR UPDATE USING (
  output_id IN (SELECT id FROM public.stock_outputs WHERE user_id = auth.uid())
);
CREATE POLICY "Users can delete output items" ON public.stock_output_items FOR DELETE USING (
  output_id IN (SELECT id FROM public.stock_outputs WHERE user_id = auth.uid())
);
CREATE POLICY "Family members can view output items" ON public.stock_output_items FOR SELECT USING (
  output_id IN (SELECT id FROM public.stock_outputs WHERE family_id IS NOT NULL AND family_id::uuid IN (SELECT get_my_family_ids()))
);
CREATE POLICY "Family members can manage output items" ON public.stock_output_items FOR ALL USING (
  output_id IN (SELECT id FROM public.stock_outputs WHERE family_id IS NOT NULL AND family_id::uuid IN (SELECT get_my_family_ids()))
) WITH CHECK (
  output_id IN (SELECT id FROM public.stock_outputs WHERE family_id IS NOT NULL AND family_id::uuid IN (SELECT get_my_family_ids()))
);
