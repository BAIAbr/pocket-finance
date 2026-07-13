import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useChangelog } from '@/hooks/useChangelog';
import { DocumentRenderer } from '@/lib/documents/renderer';
import { CATEGORY_META } from '@/lib/documents/types';

export default function Changelog() {
  const navigate = useNavigate();
  const { entries, loading } = useChangelog();

  return (
    <div className="min-h-screen bg-background pb-16">
      <Helmet>
        <title>Novidades · Finango</title>
        <meta name="description" content="Todas as novidades, melhorias e correções mais recentes do Finango." />
      </Helmet>

      <header className="border-b border-border bg-card/50 backdrop-blur sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft size={16} /> Voltar
          </Button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 pt-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-2xl bg-primary/15 text-primary flex items-center justify-center">
            <Sparkles size={22} />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Novidades</h1>
            <p className="text-sm text-muted-foreground">Tudo que evoluiu no Finango recentemente.</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin text-primary" /></div>
        ) : entries.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">Nenhuma novidade publicada ainda.</div>
        ) : (
          <div className="relative mt-10 pl-6 space-y-8 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-border">
            {entries.map(e => (
              <article key={e.id} className="relative">
                <div className={`absolute -left-6 top-1 w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${CATEGORY_META[e.categoria].color}`}>
                  {e.icon ?? CATEGORY_META[e.categoria].icon}
                </div>
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <Badge variant="outline" className="text-[10px]">v{e.versao}</Badge>
                  <Badge className={`text-[10px] ${CATEGORY_META[e.categoria].color}`}>{CATEGORY_META[e.categoria].label}</Badge>
                  {e.published_at && (
                    <span className="text-xs text-muted-foreground">
                      {new Date(e.published_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-bold mb-2">{e.titulo}</h2>
                {e.image && <img src={e.image} alt={e.titulo} className="rounded-lg border border-border mb-3 max-w-full" />}
                <DocumentRenderer doc={e.descricao} />
                {e.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {e.tags.map(t => <Badge key={t} variant="secondary" className="text-[10px]">#{t}</Badge>)}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
