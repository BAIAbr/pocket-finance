import { useState, useMemo } from 'react';
import { useFinanceContext } from '@/contexts/FinanceContext';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { differenceInDays } from 'date-fns';
import { CapyModal } from './CapyModal';

export type CapyMood = 'happy' | 'neutral' | 'worried' | 'alert' | 'sleepy';

interface CapyMoodData {
  mood: CapyMood;
  message: string;
  tips: string[];
}

export function useCapyMood() {
  const { transactions, currentMonthStats, piggyBanks, savingsGoals } = useFinanceContext();

  return useMemo((): CapyMoodData => {
    const { balance, income, expense } = currentMonthStats;
    
    // Check for inactivity (no transactions in last 5 days)
    const lastTransaction = transactions[0];
    const daysSinceLastTransaction = lastTransaction 
      ? differenceInDays(new Date(), new Date(lastTransaction.date))
      : 999;
    
    if (daysSinceLastTransaction > 5) {
      return {
        mood: 'sleepy',
        message: 'Ei… senti sua falta 😴\nQue tal atualizar seus gastos?',
        tips: [
          'Registrar gastos diariamente ajuda a ter controle total do seu dinheiro.',
          'Mesmo pequenas despesas fazem diferença no final do mês!',
          'Cofrinhos são ótimos para guardar dinheiro de forma automática.',
        ],
      };
    }

    // Check for negative balance
    if (balance < 0) {
      return {
        mood: 'alert',
        message: 'Alerta! 🚨\nVamos organizar isso antes que complique.',
        tips: [
          'Revise seus gastos e identifique onde pode cortar.',
          'Priorize pagar dívidas antes de novos gastos.',
          'Um orçamento mensal pode ajudar muito!',
        ],
      };
    }

    // Check for high expenses (>80% of income)
    if (income > 0 && expense > income * 0.8) {
      return {
        mood: 'worried',
        message: 'Hmm… percebi que os gastos subiram 🤔\nTalvez seja hora de revisar.',
        tips: [
          'Tente reduzir gastos não essenciais este mês.',
          'Que tal criar um cofrinho para emergências?',
          'Compare preços antes de fazer compras grandes.',
        ],
      };
    }

    // Check for positive balance and goals on track
    const activeGoals = savingsGoals.filter(g => !g.is_completed);
    const healthyPiggyBanks = piggyBanks.filter(p => p.balance > 0);
    
    if (balance > 0 && (healthyPiggyBanks.length > 0 || activeGoals.length > 0)) {
      return {
        mood: 'happy',
        message: 'Seu dinheiro tá bem cuidado 😌\nContinue assim que você chega longe!',
        tips: [
          'Você está no caminho certo! Continue economizando.',
          'Que tal aumentar um pouquinho seus depósitos nos cofrinhos?',
          'Revisar metas periodicamente ajuda a manter o foco.',
        ],
      };
    }

    // Default: neutral
    return {
      mood: 'neutral',
      message: 'Tudo sob controle por enquanto.\nOrganização é o segredo 🔑',
      tips: [
        'Metas são sonhos com prazo! Crie uma meta para algo que você quer.',
        'Cofrinhos rendem automaticamente com base no CDI.',
        'Categorizar gastos ajuda a entender para onde vai seu dinheiro.',
      ],
    };
  }, [currentMonthStats, transactions, piggyBanks, savingsGoals]);
}

export function CapyMascot() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHidden] = useLocalStorage('capy-hidden', false);
  const moodData = useCapyMood();

  if (isHidden) return null;

  return (
    <>
      {/* Capy integrated in the page */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="flex items-end gap-1 group cursor-pointer"
        aria-label="Abrir Capy"
      >
        <CapyFullBody mood={moodData.mood} />
        
        {/* Speech bubble */}
        <div className="relative mb-8 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="bg-white dark:bg-secondary text-foreground text-xs px-3 py-2 rounded-xl shadow-lg whitespace-nowrap">
            Clique em mim! 💬
          </div>
          <div className="absolute -left-1 bottom-2 w-3 h-3 bg-white dark:bg-secondary rotate-45 transform" />
        </div>
      </button>

      {/* Modal */}
      <CapyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        moodData={moodData}
      />
    </>
  );
}

// Capy with full body
export function CapyFullBody({ mood, size = 'md' }: { mood: CapyMood; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-16 h-20',
    md: 'w-20 h-24',
    lg: 'w-28 h-32',
  };

  return (
    <div className={`${sizeClasses[size]} relative transition-transform duration-300 hover:scale-105`}>
      <svg viewBox="0 0 80 100" className="w-full h-full drop-shadow-lg">
        {/* Back leg */}
        <ellipse cx="55" cy="88" rx="8" ry="10" fill="#A68B5B" />
        <ellipse cx="55" cy="95" rx="6" ry="4" fill="#8B7355" />
        
        {/* Body */}
        <ellipse cx="45" cy="70" rx="28" ry="22" fill="#C4A574" />
        
        {/* Front leg */}
        <ellipse cx="25" cy="88" rx="7" ry="10" fill="#B8956A" />
        <ellipse cx="25" cy="95" rx="5" ry="4" fill="#8B7355" />
        
        {/* Belly highlight */}
        <ellipse cx="42" cy="75" rx="18" ry="14" fill="#DEC9A6" opacity="0.6" />
        
        {/* Tail (small bump) */}
        <ellipse cx="70" cy="65" rx="5" ry="4" fill="#B8956A" />
        
        {/* Head */}
        <ellipse cx="30" cy="40" rx="22" ry="20" fill="#C4A574" />
        
        {/* Ears */}
        <ellipse cx="15" cy="25" rx="6" ry="8" fill="#B8956A" />
        <ellipse cx="45" cy="23" rx="6" ry="8" fill="#B8956A" />
        <ellipse cx="15" cy="25" rx="4" ry="5" fill="#E8D4B8" />
        <ellipse cx="45" cy="23" rx="4" ry="5" fill="#E8D4B8" />
        
        {/* Snout */}
        <ellipse cx="30" cy="48" rx="14" ry="10" fill="#DEC9A6" />
        
        {/* Nose */}
        <ellipse cx="30" cy="44" rx="5" ry="3.5" fill="#8B7355" />
        
        {/* Nostrils */}
        <circle cx="27" cy="45" r="1.2" fill="#6B5344" />
        <circle cx="33" cy="45" r="1.2" fill="#6B5344" />
        
        {/* Eyes based on mood */}
        {mood === 'sleepy' ? (
          <>
            <line x1="20" y1="36" x2="28" y2="36" stroke="#4A3728" strokeWidth="2" strokeLinecap="round" />
            <line x1="32" y1="36" x2="40" y2="36" stroke="#4A3728" strokeWidth="2" strokeLinecap="round" />
          </>
        ) : mood === 'happy' ? (
          <>
            <path d="M20 38 Q24 33, 28 38" stroke="#4A3728" strokeWidth="2" fill="none" strokeLinecap="round" />
            <path d="M32 38 Q36 33, 40 38" stroke="#4A3728" strokeWidth="2" fill="none" strokeLinecap="round" />
          </>
        ) : mood === 'alert' ? (
          <>
            <circle cx="24" cy="36" r="4" fill="#4A3728" />
            <circle cx="36" cy="36" r="4" fill="#4A3728" />
            <circle cx="25" cy="35" r="1.5" fill="white" />
            <circle cx="37" cy="35" r="1.5" fill="white" />
          </>
        ) : (
          <>
            <circle cx="24" cy="36" r="3.5" fill="#4A3728" />
            <circle cx="36" cy="36" r="3.5" fill="#4A3728" />
            <circle cx="25" cy="35" r="1.2" fill="white" />
            <circle cx="37" cy="35" r="1.2" fill="white" />
          </>
        )}
        
        {/* Eyebrows for worried/alert */}
        {(mood === 'worried' || mood === 'alert') && (
          <>
            <path d="M18 30 Q22 28, 28 32" stroke="#4A3728" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            <path d="M42 30 Q38 28, 32 32" stroke="#4A3728" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          </>
        )}
        
        {/* Mouth based on mood */}
        {mood === 'happy' ? (
          <path d="M24 52 Q30 58, 36 52" stroke="#8B7355" strokeWidth="2" fill="none" strokeLinecap="round" />
        ) : mood === 'worried' ? (
          <path d="M24 54 Q30 50, 36 54" stroke="#8B7355" strokeWidth="2" fill="none" strokeLinecap="round" />
        ) : mood === 'alert' ? (
          <ellipse cx="30" cy="54" rx="3" ry="2.5" fill="#8B7355" />
        ) : mood === 'sleepy' ? (
          <path d="M26 53 Q30 55, 34 53" stroke="#8B7355" strokeWidth="2" fill="none" strokeLinecap="round" />
        ) : (
          <line x1="26" y1="53" x2="34" y2="53" stroke="#8B7355" strokeWidth="2" strokeLinecap="round" />
        )}
        
        {/* Whisker dots */}
        <circle cx="16" cy="46" r="1" fill="#B8956A" />
        <circle cx="14" cy="50" r="1" fill="#B8956A" />
        <circle cx="44" cy="46" r="1" fill="#B8956A" />
        <circle cx="46" cy="50" r="1" fill="#B8956A" />
        
        {/* Blush for happy */}
        {mood === 'happy' && (
          <>
            <ellipse cx="16" cy="42" rx="4" ry="2.5" fill="#E8A4A4" opacity="0.5" />
            <ellipse cx="44" cy="42" rx="4" ry="2.5" fill="#E8A4A4" opacity="0.5" />
          </>
        )}
        
        {/* Z's for sleepy */}
        {mood === 'sleepy' && (
          <>
            <text x="48" y="22" fill="#6B5344" fontSize="10" fontWeight="bold" opacity="0.7">z</text>
            <text x="54" y="16" fill="#6B5344" fontSize="8" fontWeight="bold" opacity="0.5">z</text>
          </>
        )}
        
        {/* Exclamation for alert */}
        {mood === 'alert' && (
          <text x="50" y="20" fill="hsl(var(--destructive))" fontSize="14" fontWeight="bold">!</text>
        )}
        
        {/* Sparkles for happy */}
        {mood === 'happy' && (
          <>
            <text x="52" y="18" fill="#FFD700" fontSize="10">✦</text>
            <text x="8" y="14" fill="#FFD700" fontSize="8" opacity="0.7">✦</text>
          </>
        )}
      </svg>
    </div>
  );
}

// Compact avatar for modal
export function CapyAvatar({ mood, size = 'md' }: { mood: CapyMood; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
  };

  return (
    <div className={`${sizeClasses[size]} relative flex items-center justify-center`}>
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
        {/* Body/Head */}
        <ellipse cx="50" cy="55" rx="35" ry="30" fill="#C4A574" />
        
        {/* Ears */}
        <ellipse cx="25" cy="35" rx="8" ry="10" fill="#B8956A" />
        <ellipse cx="75" cy="35" rx="8" ry="10" fill="#B8956A" />
        <ellipse cx="25" cy="35" rx="5" ry="6" fill="#E8D4B8" />
        <ellipse cx="75" cy="35" rx="5" ry="6" fill="#E8D4B8" />
        
        {/* Snout */}
        <ellipse cx="50" cy="65" rx="20" ry="15" fill="#DEC9A6" />
        
        {/* Nose */}
        <ellipse cx="50" cy="58" rx="6" ry="4" fill="#8B7355" />
        
        {/* Nostrils */}
        <circle cx="47" cy="59" r="1.5" fill="#6B5344" />
        <circle cx="53" cy="59" r="1.5" fill="#6B5344" />
        
        {/* Eyes based on mood */}
        {mood === 'sleepy' ? (
          <>
            <line x1="35" y1="48" x2="45" y2="48" stroke="#4A3728" strokeWidth="2" strokeLinecap="round" />
            <line x1="55" y1="48" x2="65" y2="48" stroke="#4A3728" strokeWidth="2" strokeLinecap="round" />
          </>
        ) : mood === 'happy' ? (
          <>
            <path d="M35 50 Q40 45, 45 50" stroke="#4A3728" strokeWidth="2" fill="none" strokeLinecap="round" />
            <path d="M55 50 Q60 45, 65 50" stroke="#4A3728" strokeWidth="2" fill="none" strokeLinecap="round" />
          </>
        ) : mood === 'alert' ? (
          <>
            <circle cx="40" cy="48" r="5" fill="#4A3728" />
            <circle cx="60" cy="48" r="5" fill="#4A3728" />
            <circle cx="41" cy="47" r="2" fill="white" />
            <circle cx="61" cy="47" r="2" fill="white" />
          </>
        ) : (
          <>
            <circle cx="40" cy="48" r="4" fill="#4A3728" />
            <circle cx="60" cy="48" r="4" fill="#4A3728" />
            <circle cx="41" cy="47" r="1.5" fill="white" />
            <circle cx="61" cy="47" r="1.5" fill="white" />
          </>
        )}
        
        {/* Eyebrows for worried/alert */}
        {(mood === 'worried' || mood === 'alert') && (
          <>
            <path d="M33 40 Q38 38, 45 42" stroke="#4A3728" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            <path d="M67 40 Q62 38, 55 42" stroke="#4A3728" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          </>
        )}
        
        {/* Mouth based on mood */}
        {mood === 'happy' ? (
          <path d="M42 70 Q50 76, 58 70" stroke="#8B7355" strokeWidth="2" fill="none" strokeLinecap="round" />
        ) : mood === 'worried' ? (
          <path d="M42 72 Q50 68, 58 72" stroke="#8B7355" strokeWidth="2" fill="none" strokeLinecap="round" />
        ) : mood === 'alert' ? (
          <ellipse cx="50" cy="72" rx="4" ry="3" fill="#8B7355" />
        ) : mood === 'sleepy' ? (
          <path d="M45 71 Q50 73, 55 71" stroke="#8B7355" strokeWidth="2" fill="none" strokeLinecap="round" />
        ) : (
          <line x1="45" y1="71" x2="55" y2="71" stroke="#8B7355" strokeWidth="2" strokeLinecap="round" />
        )}
        
        {/* Whisker dots */}
        <circle cx="30" cy="62" r="1" fill="#B8956A" />
        <circle cx="28" cy="66" r="1" fill="#B8956A" />
        <circle cx="70" cy="62" r="1" fill="#B8956A" />
        <circle cx="72" cy="66" r="1" fill="#B8956A" />
        
        {/* Blush for happy */}
        {mood === 'happy' && (
          <>
            <ellipse cx="30" cy="55" rx="5" ry="3" fill="#E8A4A4" opacity="0.5" />
            <ellipse cx="70" cy="55" rx="5" ry="3" fill="#E8A4A4" opacity="0.5" />
          </>
        )}
        
        {/* Z's for sleepy */}
        {mood === 'sleepy' && (
          <text x="72" y="38" fill="#6B5344" fontSize="12" fontWeight="bold" opacity="0.7">z</text>
        )}
        
        {/* Exclamation for alert */}
        {mood === 'alert' && (
          <text x="78" y="35" fill="hsl(var(--destructive))" fontSize="14" fontWeight="bold">!</text>
        )}
      </svg>
    </div>
  );
}
