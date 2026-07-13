import { useNavigate } from 'react-router-dom';
import { Sparkles, X, ArrowRight } from 'lucide-react';
import { useChangelogHighlight } from '@/hooks/useChangelog';
import { CATEGORY_META } from '@/lib/documents/types';
import { motion, AnimatePresence } from 'framer-motion';

export function ChangelogHighlight() {
  const navigate = useNavigate();
  const { entry, dismiss } = useChangelogHighlight();

  return (
    <AnimatePresence>
      {entry && (
        <motion.div
          initial={{ opacity: 0, y: -8, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -8, height: 0 }}
          className="overflow-hidden"
        >
          <div className="relative rounded-2xl p-4 border border-primary/25 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent flex items-start gap-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 ${CATEGORY_META[entry.categoria].color}`}>
              {entry.icon ?? CATEGORY_META[entry.categoria].icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 text-[10px] text-primary font-semibold uppercase tracking-wide mb-1">
                <Sparkles size={12} /> Novidade · v{entry.versao}
              </div>
              <p className="font-semibold leading-tight">{entry.titulo}</p>
              <button
                onClick={() => { dismiss(); navigate('/novidades'); }}
                className="mt-2 text-sm text-primary font-medium inline-flex items-center gap-1 hover:gap-1.5 transition-all"
              >
                Ver detalhes <ArrowRight size={14} />
              </button>
            </div>
            <button onClick={dismiss} className="p-1.5 rounded-lg hover:bg-muted transition-colors shrink-0" aria-label="Dispensar">
              <X size={16} className="text-muted-foreground" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
