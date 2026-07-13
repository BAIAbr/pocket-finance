import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Loader2, ArrowLeft, Download, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDocument } from '@/hooks/useDocument';
import { DocumentRenderer, extractHeadings, docToPlainText } from '@/lib/documents/renderer';
import { DOCUMENT_TYPE_META } from '@/lib/documents/types';
import { toast } from 'sonner';

export default function PublicDocument() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { doc, loading } = useDocument(slug);

  const headings = useMemo(() => (doc ? extractHeadings(doc.conteudo) : []), [doc]);

  const exportPdf = async () => {
    if (!doc) return;
    try {
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
      const margin = 48;
      const width = pdf.internal.pageSize.getWidth() - margin * 2;
      let y = margin;

      pdf.setFontSize(22); pdf.setFont(undefined, 'bold');
      pdf.text(doc.titulo, margin, y); y += 28;
      if (doc.subtitulo) {
        pdf.setFontSize(12); pdf.setFont(undefined, 'normal'); pdf.setTextColor(120);
        pdf.text(doc.subtitulo, margin, y); y += 20;
      }
      pdf.setTextColor(30); pdf.setFontSize(11);
      const text = docToPlainText(doc.conteudo);
      const lines = pdf.splitTextToSize(text, width);
      lines.forEach((ln: string) => {
        if (y > pdf.internal.pageSize.getHeight() - margin) { pdf.addPage(); y = margin; }
        pdf.text(ln, margin, y); y += 15;
      });
      pdf.save(`${doc.slug}.pdf`);
    } catch (err: any) {
      toast.error('Erro ao gerar PDF: ' + err.message);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;
  if (!doc) return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-bold mb-2">Documento não encontrado</h1>
        <p className="text-muted-foreground mb-4">O documento que você procura não existe ou ainda não foi publicado.</p>
        <Button onClick={() => navigate('/')}>Voltar ao início</Button>
      </div>
    </div>
  );

  const meta = DOCUMENT_TYPE_META[doc.tipo];
  const seoTitle = doc.seo_title ?? `${doc.titulo} · Finango`;
  const seoDesc = doc.seo_description ?? doc.subtitulo ?? `${meta.label} do Finango.`;

  return (
    <div className="min-h-screen bg-background pb-16">
      <Helmet>
        <title>{seoTitle}</title>
        <meta name="description" content={seoDesc} />
        <meta property="og:title" content={seoTitle} />
        <meta property="og:description" content={seoDesc} />
        {doc.seo_image && <meta property="og:image" content={doc.seo_image} />}
      </Helmet>

      <header className="border-b border-border bg-card/50 backdrop-blur sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft size={16} /> Voltar
          </Button>
          <Button variant="outline" size="sm" onClick={exportPdf} className="gap-2">
            <Download size={16} /> Baixar PDF
          </Button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 pt-10">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-primary/15 text-primary flex items-center justify-center text-3xl shrink-0">
            {doc.icon ?? meta.icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">{meta.label}</p>
            <h1 className="text-3xl md:text-4xl font-bold mt-1 tracking-tight">{doc.titulo}</h1>
            {doc.subtitulo && <p className="text-muted-foreground mt-2">{doc.subtitulo}</p>}
            <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
              <Calendar size={12} /> Atualizado em {new Date(doc.updated_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })} · v{doc.versao}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-8 mt-8">
          <article><DocumentRenderer doc={doc.conteudo} /></article>
          {headings.length > 1 && (
            <aside className="hidden lg:block">
              <div className="sticky top-24">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Sumário</p>
                <nav className="space-y-1.5 text-sm">
                  {headings.map(h => (
                    <a key={h.id} href={`#${h.id}`}
                      className="block text-muted-foreground hover:text-primary transition-colors"
                      style={{ paddingLeft: `${(h.level - 1) * 0.75}rem` }}>
                      {h.text}
                    </a>
                  ))}
                </nav>
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
