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
          'Metas são ótimos para guardar dinheiro de forma automática.',
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
          'Que tal criar um meta para emergências?',
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
          'Que tal aumentar um pouquinho seus depósitos nos metas?',
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
        'Metas rendem automaticamente com base no CDI.',
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
          <div className="bg-popover text-foreground text-xs px-3 py-2 rounded-xl shadow-lg whitespace-nowrap">
            Clique em mim! 💬
          </div>
          <div className="absolute -left-1 bottom-2 w-3 h-3 bg-popover rotate-45 transform" />
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

// Capy with full body - CAPYBARA design
export function CapyFullBody({ mood, size = 'md' }: { mood: CapyMood; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-16 h-20',
    md: 'w-20 h-24',
    lg: 'w-28 h-32',
  };

  return (
    <div className={`${sizeClasses[size]} relative transition-transform duration-300 hover:scale-105`}>
      <svg viewBox="0 0 100 120" className="w-full h-full drop-shadow-lg">
        {/* Back legs */}
        <ellipse cx="70" cy="105" rx="10" ry="12" fill="#8B6914" />
        <ellipse cx="70" cy="115" rx="8" ry="5" fill="#6B4F0A" />
        
        {/* Body - large barrel shape like real capybara */}
        <ellipse cx="50" cy="80" rx="38" ry="28" fill="#A67C00" />
        
        {/* Body highlight */}
        <ellipse cx="45" cy="85" rx="28" ry="18" fill="#BF9B30" opacity="0.5" />
        
        {/* Front legs */}
        <ellipse cx="25" cy="102" rx="9" ry="14" fill="#8B6914" />
        <ellipse cx="25" cy="115" rx="7" ry="5" fill="#6B4F0A" />
        
        {/* Head - rectangular/boxy like capybara */}
        <rect x="8" y="25" rx="18" ry="18" width="50" height="45" fill="#A67C00" />
        
        {/* Top of head - flatter */}
        <ellipse cx="33" cy="28" rx="22" ry="10" fill="#A67C00" />
        
        {/* Small rounded ears on TOP of head (capybara style) */}
        <ellipse cx="18" cy="20" rx="7" ry="8" fill="#8B6914" />
        <ellipse cx="48" cy="20" rx="7" ry="8" fill="#8B6914" />
        <ellipse cx="18" cy="20" rx="4" ry="5" fill="#D4A84B" />
        <ellipse cx="48" cy="20" rx="4" ry="5" fill="#D4A84B" />
        
        {/* Large square snout - distinctive capybara feature */}
        <rect x="12" y="45" rx="12" ry="10" width="42" height="28" fill="#BF9B30" />
        
        {/* Big nose/nostrils area */}
        <ellipse cx="33" cy="52" rx="12" ry="8" fill="#6B4F0A" />
        
        {/* Nostrils - large and prominent */}
        <ellipse cx="27" cy="52" rx="3" ry="4" fill="#4A3500" />
        <ellipse cx="39" cy="52" rx="3" ry="4" fill="#4A3500" />
        
        {/* Eyes - small and placed high (capybara have tiny eyes) */}
        {mood === 'sleepy' ? (
          <>
            <line x1="20" y1="38" x2="28" y2="38" stroke="#4A3500" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="38" y1="38" x2="46" y2="38" stroke="#4A3500" strokeWidth="2.5" strokeLinecap="round" />
          </>
        ) : mood === 'happy' ? (
          <>
            <path d="M20 40 Q24 36, 28 40" stroke="#4A3500" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <path d="M38 40 Q42 36, 46 40" stroke="#4A3500" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          </>
        ) : mood === 'alert' ? (
          <>
            <circle cx="24" cy="38" r="4" fill="#4A3500" />
            <circle cx="42" cy="38" r="4" fill="#4A3500" />
            <circle cx="25" cy="37" r="1.5" fill="white" />
            <circle cx="43" cy="37" r="1.5" fill="white" />
          </>
        ) : (
          <>
            <circle cx="24" cy="38" r="3" fill="#4A3500" />
            <circle cx="42" cy="38" r="3" fill="#4A3500" />
            <circle cx="25" cy="37" r="1" fill="white" />
            <circle cx="43" cy="37" r="1" fill="white" />
          </>
        )}
        
        {/* Eyebrows for worried/alert */}
        {(mood === 'worried' || mood === 'alert') && (
          <>
            <path d="M18 32 Q22 30, 28 34" stroke="#4A3500" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            <path d="M48 32 Q44 30, 38 34" stroke="#4A3500" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          </>
        )}
        
        {/* Mouth - under the big nose */}
        {mood === 'happy' ? (
          <path d="M26 64 Q33 70, 40 64" stroke="#6B4F0A" strokeWidth="2" fill="none" strokeLinecap="round" />
        ) : mood === 'worried' ? (
          <path d="M26 67 Q33 63, 40 67" stroke="#6B4F0A" strokeWidth="2" fill="none" strokeLinecap="round" />
        ) : mood === 'alert' ? (
          <ellipse cx="33" cy="66" rx="4" ry="3" fill="#6B4F0A" />
        ) : mood === 'sleepy' ? (
          <path d="M28 65 Q33 67, 38 65" stroke="#6B4F0A" strokeWidth="2" fill="none" strokeLinecap="round" />
        ) : (
          <line x1="28" y1="65" x2="38" y2="65" stroke="#6B4F0A" strokeWidth="2" strokeLinecap="round" />
        )}
        
        {/* Whisker spots */}
        <circle cx="10" cy="55" r="1.5" fill="#8B6914" />
        <circle cx="8" cy="60" r="1.5" fill="#8B6914" />
        <circle cx="56" cy="55" r="1.5" fill="#8B6914" />
        <circle cx="58" cy="60" r="1.5" fill="#8B6914" />
        
        {/* Blush for happy */}
        {mood === 'happy' && (
          <>
            <ellipse cx="14" cy="48" rx="5" ry="3" fill="#E8A4A4" opacity="0.4" />
            <ellipse cx="52" cy="48" rx="5" ry="3" fill="#E8A4A4" opacity="0.4" />
          </>
        )}
        
        {/* Z's for sleepy */}
        {mood === 'sleepy' && (
          <>
            <text x="55" y="25" fill="#6B4F0A" fontSize="12" fontWeight="bold" opacity="0.7">z</text>
            <text x="62" y="18" fill="#6B4F0A" fontSize="10" fontWeight="bold" opacity="0.5">z</text>
          </>
        )}
        
        {/* Exclamation for alert */}
        {mood === 'alert' && (
          <text x="58" y="22" fill="hsl(var(--destructive))" fontSize="16" fontWeight="bold">!</text>
        )}
        
        {/* Sparkles for happy */}
        {mood === 'happy' && (
          <>
            <text x="60" y="20" fill="#FFD700" fontSize="12">✦</text>
            <text x="5" y="12" fill="#FFD700" fontSize="9" opacity="0.7">✦</text>
          </>
        )}
      </svg>
    </div>
  );
}

// Compact avatar for modal - CAPYBARA design
export function CapyAvatar({ mood, size = 'md' }: { mood: CapyMood; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
  };

  return (
    <div className={`${sizeClasses[size]} relative flex items-center justify-center`}>
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
        {/* Head - boxy/rectangular like capybara */}
        <rect x="15" y="20" rx="20" ry="20" width="70" height="60" fill="#A67C00" />
        
        {/* Top of head */}
        <ellipse cx="50" cy="25" rx="30" ry="12" fill="#A67C00" />
        
        {/* Small ears on TOP (capybara style) */}
        <ellipse cx="28" cy="15" rx="8" ry="10" fill="#8B6914" />
        <ellipse cx="72" cy="15" rx="8" ry="10" fill="#8B6914" />
        <ellipse cx="28" cy="15" rx="5" ry="6" fill="#D4A84B" />
        <ellipse cx="72" cy="15" rx="5" ry="6" fill="#D4A84B" />
        
        {/* Large square snout */}
        <rect x="25" y="50" rx="15" ry="12" width="50" height="32" fill="#BF9B30" />
        
        {/* Big nose area */}
        <ellipse cx="50" cy="58" rx="15" ry="10" fill="#6B4F0A" />
        
        {/* Large nostrils */}
        <ellipse cx="42" cy="58" rx="4" ry="5" fill="#4A3500" />
        <ellipse cx="58" cy="58" rx="4" ry="5" fill="#4A3500" />
        
        {/* Small eyes placed high */}
        {mood === 'sleepy' ? (
          <>
            <line x1="32" y1="40" x2="42" y2="40" stroke="#4A3500" strokeWidth="3" strokeLinecap="round" />
            <line x1="58" y1="40" x2="68" y2="40" stroke="#4A3500" strokeWidth="3" strokeLinecap="round" />
          </>
        ) : mood === 'happy' ? (
          <>
            <path d="M32 42 Q37 36, 42 42" stroke="#4A3500" strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M58 42 Q63 36, 68 42" stroke="#4A3500" strokeWidth="3" fill="none" strokeLinecap="round" />
          </>
        ) : mood === 'alert' ? (
          <>
            <circle cx="37" cy="40" r="5" fill="#4A3500" />
            <circle cx="63" cy="40" r="5" fill="#4A3500" />
            <circle cx="38" cy="39" r="2" fill="white" />
            <circle cx="64" cy="39" r="2" fill="white" />
          </>
        ) : (
          <>
            <circle cx="37" cy="40" r="4" fill="#4A3500" />
            <circle cx="63" cy="40" r="4" fill="#4A3500" />
            <circle cx="38" cy="39" r="1.5" fill="white" />
            <circle cx="64" cy="39" r="1.5" fill="white" />
          </>
        )}
        
        {/* Eyebrows for worried/alert */}
        {(mood === 'worried' || mood === 'alert') && (
          <>
            <path d="M30 33 Q35 30, 44 35" stroke="#4A3500" strokeWidth="2" fill="none" strokeLinecap="round" />
            <path d="M70 33 Q65 30, 56 35" stroke="#4A3500" strokeWidth="2" fill="none" strokeLinecap="round" />
          </>
        )}
        
        {/* Mouth */}
        {mood === 'happy' ? (
          <path d="M40 74 Q50 82, 60 74" stroke="#6B4F0A" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        ) : mood === 'worried' ? (
          <path d="M40 78 Q50 72, 60 78" stroke="#6B4F0A" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        ) : mood === 'alert' ? (
          <ellipse cx="50" cy="76" rx="5" ry="4" fill="#6B4F0A" />
        ) : mood === 'sleepy' ? (
          <path d="M44 75 Q50 78, 56 75" stroke="#6B4F0A" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        ) : (
          <line x1="44" y1="75" x2="56" y2="75" stroke="#6B4F0A" strokeWidth="2.5" strokeLinecap="round" />
        )}
        
        {/* Whisker spots */}
        <circle cx="20" cy="60" r="2" fill="#8B6914" />
        <circle cx="18" cy="68" r="2" fill="#8B6914" />
        <circle cx="80" cy="60" r="2" fill="#8B6914" />
        <circle cx="82" cy="68" r="2" fill="#8B6914" />
        
        {/* Blush for happy */}
        {mood === 'happy' && (
          <>
            <ellipse cx="25" cy="50" rx="6" ry="4" fill="#E8A4A4" opacity="0.4" />
            <ellipse cx="75" cy="50" rx="6" ry="4" fill="#E8A4A4" opacity="0.4" />
          </>
        )}
        
        {/* Z's for sleepy */}
        {mood === 'sleepy' && (
          <text x="78" y="28" fill="#6B4F0A" fontSize="14" fontWeight="bold" opacity="0.7">z</text>
        )}
        
        {/* Exclamation for alert */}
        {mood === 'alert' && (
          <text x="82" y="25" fill="hsl(var(--destructive))" fontSize="16" fontWeight="bold">!</text>
        )}
      </svg>
    </div>
  );
}
