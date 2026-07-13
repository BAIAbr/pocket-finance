
DO $$ BEGIN
  CREATE TYPE public.document_type AS ENUM ('policy','terms','cookies','about','changelog','custom');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.document_status AS ENUM ('published','draft','archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.changelog_category AS ENUM (
    'novidade','melhoria','correcao','seguranca','performance',
    'premium','planejamento','investimentos','cartoes','ia'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  tipo public.document_type NOT NULL DEFAULT 'custom',
  titulo TEXT NOT NULL,
  subtitulo TEXT,
  conteudo JSONB NOT NULL DEFAULT '{"type":"doc","content":[]}'::jsonb,
  icon TEXT,
  cover_image TEXT,
  status public.document_status NOT NULL DEFAULT 'draft',
  versao INTEGER NOT NULL DEFAULT 1,
  seo_title TEXT,
  seo_description TEXT,
  seo_image TEXT,
  autor UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.documents TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT ALL ON public.documents TO service_role;

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone reads published docs" ON public.documents FOR SELECT
  USING (status = 'published' OR private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins insert docs" ON public.documents FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update docs" ON public.documents FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins delete docs" ON public.documents FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_documents_updated BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_documents_slug ON public.documents(slug);
CREATE INDEX IF NOT EXISTS idx_documents_tipo ON public.documents(tipo);
CREATE INDEX IF NOT EXISTS idx_documents_status ON public.documents(status);

CREATE TABLE IF NOT EXISTS public.document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  versao INTEGER NOT NULL,
  titulo TEXT NOT NULL,
  subtitulo TEXT,
  conteudo JSONB NOT NULL,
  resumo_alteracao TEXT,
  autor UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.document_versions TO authenticated;
GRANT ALL ON public.document_versions TO service_role;

ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view versions" ON public.document_versions FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins insert versions" ON public.document_versions FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins delete versions" ON public.document_versions FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_document_versions_doc ON public.document_versions(document_id, versao DESC);

CREATE OR REPLACE FUNCTION public.snapshot_document_version()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (OLD.conteudo IS DISTINCT FROM NEW.conteudo)
     OR (OLD.titulo IS DISTINCT FROM NEW.titulo)
     OR (OLD.subtitulo IS DISTINCT FROM NEW.subtitulo) THEN
    INSERT INTO public.document_versions (document_id, versao, titulo, subtitulo, conteudo, autor)
    VALUES (OLD.id, OLD.versao, OLD.titulo, OLD.subtitulo, OLD.conteudo, OLD.autor);
    NEW.versao := OLD.versao + 1;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_documents_version BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.snapshot_document_version();

CREATE TABLE IF NOT EXISTS public.changelog_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  versao TEXT NOT NULL,
  titulo TEXT NOT NULL,
  descricao JSONB NOT NULL DEFAULT '{"type":"doc","content":[]}'::jsonb,
  categoria public.changelog_category NOT NULL DEFAULT 'novidade',
  icon TEXT,
  image TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  status public.document_status NOT NULL DEFAULT 'draft',
  is_highlight BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  autor UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.changelog_entries TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.changelog_entries TO authenticated;
GRANT ALL ON public.changelog_entries TO service_role;

ALTER TABLE public.changelog_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone reads published cl" ON public.changelog_entries FOR SELECT
  USING (status = 'published' OR private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins insert cl" ON public.changelog_entries FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update cl" ON public.changelog_entries FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins delete cl" ON public.changelog_entries FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_changelog_updated BEFORE UPDATE ON public.changelog_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_changelog_published ON public.changelog_entries(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_changelog_category ON public.changelog_entries(categoria);

CREATE TABLE IF NOT EXISTS public.changelog_views (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_id UUID NOT NULL REFERENCES public.changelog_entries(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, entry_id)
);

GRANT SELECT, INSERT, DELETE ON public.changelog_views TO authenticated;
GRANT ALL ON public.changelog_views TO service_role;

ALTER TABLE public.changelog_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own cl views" ON public.changelog_views FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.documents;
ALTER PUBLICATION supabase_realtime ADD TABLE public.changelog_entries;

CREATE POLICY "Auth read docassets" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'document-assets');
CREATE POLICY "Anon read docassets" ON storage.objects FOR SELECT TO anon
  USING (bucket_id = 'document-assets');
CREATE POLICY "Admins insert docassets" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'document-assets' AND private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update docassets" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'document-assets' AND private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins delete docassets" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'document-assets' AND private.has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.documents (slug, tipo, titulo, subtitulo, icon, status, published_at, seo_title, seo_description, conteudo)
VALUES
  ('politica-de-privacidade','policy','Política de Privacidade','Como tratamos seus dados no Finango','🔒','published', now(),
   'Política de Privacidade — Finango','Saiba como o Finango coleta, utiliza e protege seus dados pessoais.',
   '{"type":"doc","content":[{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Introdução"}]},{"type":"paragraph","content":[{"type":"text","text":"O Finango respeita sua privacidade. Este documento descreve como tratamos seus dados."}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Dados coletados"}]},{"type":"paragraph","content":[{"type":"text","text":"Coletamos apenas os dados necessários para o funcionamento do serviço."}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Como utilizamos"}]},{"type":"paragraph","content":[{"type":"text","text":"Utilizamos seus dados para prover funcionalidades financeiras solicitadas por você."}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Armazenamento e segurança"}]},{"type":"paragraph","content":[{"type":"text","text":"Seus dados são armazenados de forma segura, com criptografia em trânsito e em repouso."}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Direitos do usuário (LGPD)"}]},{"type":"paragraph","content":[{"type":"text","text":"Você pode solicitar acesso, correção ou exclusão dos seus dados a qualquer momento."}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Contato"}]},{"type":"paragraph","content":[{"type":"text","text":"Dúvidas? Entre em contato pelo e-mail de suporte."}]}]}'::jsonb),
  ('termos-de-uso','terms','Termos de Uso','Regras e condições do serviço','📄','published', now(),
   'Termos de Uso — Finango','Leia os termos e condições para uso da plataforma Finango.',
   '{"type":"doc","content":[{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Aceitação"}]},{"type":"paragraph","content":[{"type":"text","text":"Ao criar uma conta, você concorda com estes termos."}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Cadastro e responsabilidade"}]},{"type":"paragraph","content":[{"type":"text","text":"Você é responsável por manter a confidencialidade de suas credenciais."}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Planos"}]},{"type":"paragraph","content":[{"type":"text","text":"O Finango oferece um plano gratuito e planos Premium com recursos adicionais."}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Cancelamento e suspensão"}]},{"type":"paragraph","content":[{"type":"text","text":"Você pode cancelar seu plano a qualquer momento pelas configurações."}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Propriedade intelectual"}]},{"type":"paragraph","content":[{"type":"text","text":"Todo o conteúdo e marca Finango pertencem aos seus titulares."}]}]}'::jsonb),
  ('politica-de-cookies','cookies','Política de Cookies','Uso de cookies no Finango','🍪','published', now(),
   'Política de Cookies — Finango','Entenda como o Finango utiliza cookies e tecnologias similares.',
   '{"type":"doc","content":[{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"O que são cookies"}]},{"type":"paragraph","content":[{"type":"text","text":"Cookies são pequenos arquivos armazenados no seu dispositivo para melhorar a experiência de uso."}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Cookies essenciais"}]},{"type":"paragraph","content":[{"type":"text","text":"Necessários para autenticação e funcionamento básico."}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Como desativar"}]},{"type":"paragraph","content":[{"type":"text","text":"Você pode gerenciar cookies nas configurações do seu navegador."}]}]}'::jsonb),
  ('sobre','about','Sobre o Finango','Nossa história, missão e valores','ℹ️','published', now(),
   'Sobre o Finango','Conheça a plataforma Finango, nossa missão e valores.',
   '{"type":"doc","content":[{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Nossa história"}]},{"type":"paragraph","content":[{"type":"text","text":"O Finango nasceu para simplificar a gestão financeira pessoal e familiar."}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Missão"}]},{"type":"paragraph","content":[{"type":"text","text":"Democratizar o acesso a ferramentas financeiras inteligentes."}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Visão"}]},{"type":"paragraph","content":[{"type":"text","text":"Ser a plataforma de referência em finanças pessoais no Brasil."}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Valores"}]},{"type":"paragraph","content":[{"type":"text","text":"Transparência, segurança e foco no usuário."}]}]}'::jsonb)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.changelog_entries (versao, titulo, descricao, categoria, icon, status, is_highlight, published_at)
VALUES
  ('2.1.0','Central de Documentos',
   '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Agora administradores podem gerenciar toda a documentação institucional diretamente pelo painel, sem tocar em código."}]},{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Editor visual estilo Notion"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Versionamento automático"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Changelog público das atualizações"}]}]}]}]}'::jsonb,
   'novidade','✨','published', true, now());
