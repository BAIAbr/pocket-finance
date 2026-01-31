import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FloatingActionButtonProps {
  onClick: () => void;
  className?: string;
}

export function FloatingActionButton({ onClick, className }: FloatingActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'btn-float group',
        className
      )}
      aria-label="Adicionar transação"
    >
      <Plus 
        size={28} 
        strokeWidth={2.5} 
        className="text-white transition-transform duration-300 group-hover:rotate-90" 
      />
    </button>
  );
}
