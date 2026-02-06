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

export function CapyMascot() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHidden] = useLocalStorage('capy-hidden', false);
  const { transactions, currentMonthStats, piggyBanks, savingsGoals } = useFinanceContext();

  // Calculate Capy's mood based on financial data
  const moodData = useMemo((): CapyMoodData => {
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

  if (isHidden) return null;

  return (
    <>
      {/* Floating Capy Button */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-24 left-4 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 dark:from-amber-500 dark:to-amber-700 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 active:scale-95 flex items-center justify-center group animate-fade-in"
        aria-label="Abrir Capy"
      >
        <CapyAvatar mood={moodData.mood} size="sm" />
        
        {/* Pulse animation for attention */}
        <span className="absolute inset-0 rounded-full bg-amber-400/30 animate-ping opacity-75" />
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

// Capy Avatar Component with different expressions
export function CapyAvatar({ mood, size = 'md' }: { mood: CapyMood; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
  };

  // Get expression based on mood
  const getExpression = () => {
    switch (mood) {
      case 'happy':
        return { eyes: '◠', mouth: '◡', eyebrows: '' };
      case 'neutral':
        return { eyes: '•', mouth: '—', eyebrows: '' };
      case 'worried':
        return { eyes: '•', mouth: '~', eyebrows: '︵' };
      case 'alert':
        return { eyes: '◉', mouth: '○', eyebrows: '︵' };
      case 'sleepy':
        return { eyes: '–', mouth: 'з', eyebrows: '' };
      default:
        return { eyes: '•', mouth: '◡', eyebrows: '' };
    }
  };

  const expression = getExpression();

  return (
    <div className={`${sizeClasses[size]} relative flex items-center justify-center`}>
      {/* Capy SVG */}
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
        
        {/* Eyes - Change based on mood */}
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
        
        {/* Mouth - Change based on mood */}
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
          <text x="72" y="38" fill="#6B5344" fontSize="12" fontWeight="bold" opacity="0.7">
            z
          </text>
        )}
        
        {/* Exclamation for alert */}
        {mood === 'alert' && (
          <text x="78" y="35" fill="#EF4444" fontSize="14" fontWeight="bold">
            !
          </text>
        )}
      </svg>
    </div>
  );
}
