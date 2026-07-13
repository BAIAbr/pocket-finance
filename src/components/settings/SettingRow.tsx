import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  icon: React.ReactNode;
  label: string;
  description?: string;
  onClick?: () => void;
  danger?: boolean;
  highlight?: boolean;
  trailing?: React.ReactNode;
  badge?: string;
  disabled?: boolean;
}

export function SettingRow({ icon, label, description, onClick, danger, highlight, trailing, badge, disabled }: Props) {
  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left',
        onClick && !disabled && 'touch-scale hover:bg-secondary/60',
        highlight && 'bg-primary/10 hover:bg-primary/15',
        danger && 'text-destructive hover:bg-destructive/10',
        disabled && 'opacity-60 cursor-not-allowed',
      )}
    >
      <div
        className={cn(
          'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
          danger
            ? 'bg-destructive/10 text-destructive'
            : highlight
              ? 'bg-primary/15 text-primary'
              : 'bg-secondary text-foreground',
        )}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium truncate">{label}</p>
          {badge && (
            <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-md bg-primary/20 text-primary shrink-0">
              {badge}
            </span>
          )}
        </div>
        {description && <p className="text-xs text-muted-foreground truncate">{description}</p>}
      </div>
      {trailing ?? (onClick ? <ChevronRight size={18} className="text-muted-foreground shrink-0" /> : null)}
    </Comp>
  );
}
