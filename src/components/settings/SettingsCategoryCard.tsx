import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  accentClass?: string;
  badge?: string;
}

export function SettingsCategoryCard({ icon, title, description, onClick, accentClass, badge }: Props) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'group card-finance w-full flex items-center gap-4 text-left',
        'transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.99]',
      )}
    >
      <div
        className={cn(
          'w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105',
          accentClass ?? 'bg-primary/15 text-primary',
        )}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold truncate">{title}</p>
          {badge && (
            <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-md bg-primary/20 text-primary shrink-0">
              {badge}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{description}</p>
      </div>
      <ChevronRight size={20} className="text-muted-foreground shrink-0 transition-transform group-hover:translate-x-0.5" />
    </button>
  );
}
