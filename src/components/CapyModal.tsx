import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { CapyAvatar, CapyMood } from './CapyMascot';
import { Button } from '@/components/ui/button';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Lightbulb, BookOpen, X } from 'lucide-react';

interface CapyMoodData {
  mood: CapyMood;
  message: string;
  tips: string[];
}

interface CapyModalProps {
  isOpen: boolean;
  onClose: () => void;
  moodData: CapyMoodData;
}

type ModalView = 'main' | 'tips' | 'learn';

const educationalContent = [
  {
    title: 'O que são Metas?',
    icon: '🎯',
    content: 'Metas são objetivos financeiros que você quer alcançar! Por exemplo, juntar R$ 5.000 para uma viagem. Você define o valor, o prazo, e vai acompanhando seu progresso.',
  },
  {
    title: 'O que são Cofrinhos?',
    icon: '🐷',
    content: 'Cofrinhos são como contas de poupança virtuais dentro do app. O legal é que eles rendem automaticamente baseado no CDI, então seu dinheiro cresce sozinho!',
  },
  {
    title: 'Gastos Fixos vs Variáveis',
    icon: '📊',
    content: 'Gastos fixos são aqueles que você paga todo mês com valor parecido (aluguel, internet). Gastos variáveis mudam de mês pra mês (lazer, compras). Conhecer a diferença ajuda a economizar!',
  },
  {
    title: 'O que é CDI?',
    icon: '📈',
    content: 'CDI é uma taxa de referência do mercado financeiro. Quando seu cofrinho rende "100% do CDI", significa que ele acompanha essa taxa. Quanto maior o CDI, mais seu dinheiro rende!',
  },
  {
    title: 'Categorias de Gastos',
    icon: '🏷️',
    content: 'Categorizar seus gastos (alimentação, transporte, lazer...) ajuda você a entender para onde vai seu dinheiro e identificar onde pode economizar.',
  },
];

export function CapyModal({ isOpen, onClose, moodData }: CapyModalProps) {
  const [view, setView] = useState<ModalView>('main');
  const [, setIsHidden] = useLocalStorage('capy-hidden', false);
  const [selectedTopic, setSelectedTopic] = useState<number | null>(null);

  const handleClose = () => {
    setView('main');
    setSelectedTopic(null);
    onClose();
  };

  const handleHideCapy = () => {
    setIsHidden(true);
    handleClose();
  };

  const getMoodEmoji = (mood: CapyMood) => {
    switch (mood) {
      case 'happy': return '😄';
      case 'neutral': return '🙂';
      case 'worried': return '😟';
      case 'alert': return '😰';
      case 'sleepy': return '💤';
      default: return '🐹';
    }
  };

  const getMoodColor = (mood: CapyMood) => {
    switch (mood) {
      case 'happy': return 'from-green-400 to-emerald-500';
      case 'neutral': return 'from-blue-400 to-blue-500';
      case 'worried': return 'from-yellow-400 to-amber-500';
      case 'alert': return 'from-red-400 to-red-500';
      case 'sleepy': return 'from-purple-400 to-purple-500';
      default: return 'from-amber-400 to-amber-500';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm mx-4 rounded-3xl overflow-hidden p-0 gap-0">
        {/* Header with gradient based on mood */}
        <div className={`bg-gradient-to-br ${getMoodColor(moodData.mood)} p-6 pb-4 text-white`}>
          <DialogHeader className="space-y-2">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                Oi, eu sou a Capy! {getMoodEmoji(moodData.mood)}
              </DialogTitle>
            </div>
            <DialogDescription className="text-white/90 text-sm">
              Sua guia financeira amigável
            </DialogDescription>
          </DialogHeader>
          
          {/* Capy Avatar centered */}
          <div className="flex justify-center mt-4">
            <div className="bg-white/20 rounded-full p-3 backdrop-blur-sm">
              <CapyAvatar mood={moodData.mood} size="lg" />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 bg-background">
          {view === 'main' && (
            <div className="space-y-4 animate-fade-in">
              {/* Message bubble */}
              <div className="bg-secondary/50 rounded-2xl p-4 relative">
                <div className="absolute -top-2 left-6 w-4 h-4 bg-secondary/50 rotate-45" />
                <p className="text-sm whitespace-pre-line font-medium">
                  {moodData.message}
                </p>
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="h-auto py-3 flex flex-col items-center gap-1 rounded-xl"
                  onClick={() => setView('tips')}
                >
                  <Lightbulb size={20} className="text-amber-500" />
                  <span className="text-xs">Ver dicas</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-3 flex flex-col items-center gap-1 rounded-xl"
                  onClick={() => setView('learn')}
                >
                  <BookOpen size={20} className="text-blue-500" />
                  <span className="text-xs">Aprender</span>
                </Button>
              </div>

              {/* Main action button */}
              <Button
                className="w-full rounded-xl"
                onClick={handleClose}
              >
                Entendi! 👍
              </Button>

              {/* Hide option */}
              <button
                onClick={handleHideCapy}
                className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Não mostrar a Capy novamente
              </button>
            </div>
          )}

          {view === 'tips' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-2 mb-2">
                <button onClick={() => setView('main')} className="text-muted-foreground hover:text-foreground">
                  ←
                </button>
                <h3 className="font-semibold flex items-center gap-2">
                  <Lightbulb size={18} className="text-amber-500" />
                  Dicas para você
                </h3>
              </div>

              <div className="space-y-2">
                {moodData.tips.map((tip, index) => (
                  <div
                    key={index}
                    className="bg-secondary/50 rounded-xl p-3 text-sm flex items-start gap-2"
                  >
                    <span className="text-amber-500 font-bold">•</span>
                    <span>{tip}</span>
                  </div>
                ))}
              </div>

              <Button
                className="w-full rounded-xl"
                onClick={() => setView('main')}
              >
                Voltar
              </Button>
            </div>
          )}

          {view === 'learn' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-2 mb-2">
                <button 
                  onClick={() => {
                    if (selectedTopic !== null) {
                      setSelectedTopic(null);
                    } else {
                      setView('main');
                    }
                  }} 
                  className="text-muted-foreground hover:text-foreground"
                >
                  ←
                </button>
                <h3 className="font-semibold flex items-center gap-2">
                  <BookOpen size={18} className="text-blue-500" />
                  {selectedTopic !== null ? educationalContent[selectedTopic].title : 'Aprenda sobre'}
                </h3>
              </div>

              {selectedTopic === null ? (
                <div className="space-y-2">
                  {educationalContent.map((topic, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedTopic(index)}
                      className="w-full bg-secondary/50 rounded-xl p-3 text-sm flex items-center gap-3 hover:bg-secondary transition-colors text-left"
                    >
                      <span className="text-xl">{topic.icon}</span>
                      <span className="font-medium">{topic.title}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="bg-secondary/50 rounded-xl p-4">
                  <div className="text-3xl mb-3 text-center">
                    {educationalContent[selectedTopic].icon}
                  </div>
                  <p className="text-sm leading-relaxed">
                    {educationalContent[selectedTopic].content}
                  </p>
                </div>
              )}

              <Button
                className="w-full rounded-xl"
                onClick={() => {
                  if (selectedTopic !== null) {
                    setSelectedTopic(null);
                  } else {
                    setView('main');
                  }
                }}
              >
                {selectedTopic !== null ? 'Ver outros tópicos' : 'Voltar'}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
