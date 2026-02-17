import { FireLevel } from '@/hooks/useFireSystem';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface FireBadgeProps {
  level: FireLevel;
  reasons: string[];
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const fireEmoji: Record<FireLevel, string> = {
  0: '',
  1: '🔥',
  2: '🔥🔥',
  3: '🔥🔥🔥',
};

const fireLabel: Record<FireLevel, string> = {
  0: '',
  1: 'Normal',
  2: 'Alto desempenho',
  3: 'Recorde pessoal!',
};

export function FireBadge({ level, reasons, size = 'sm', className }: FireBadgeProps) {
  if (level === 0) return null;

  const sizeClasses = {
    sm: 'text-sm px-1.5 py-0.5',
    md: 'text-base px-2 py-1',
    lg: 'text-xl px-3 py-1.5',
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full cursor-help animate-fade-in',
            'bg-warning/15 border border-warning/20',
            sizeClasses[size],
            className
          )}
          style={{ animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}
        >
          <span>{fireEmoji[level]}</span>
          {size !== 'sm' && (
            <span className="text-xs font-medium text-warning">{fireLabel[level]}</span>
          )}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[200px]">
        <p className="font-semibold text-sm mb-1">{fireLabel[level]}</p>
        <ul className="text-xs space-y-0.5">
          {reasons.map((r, i) => (
            <li key={i}>• {r}</li>
          ))}
        </ul>
      </TooltipContent>
    </Tooltip>
  );
}
