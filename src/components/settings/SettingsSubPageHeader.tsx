import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Props {
  title: string;
  description?: string;
  icon?: React.ReactNode;
}

export function SettingsSubPageHeader({ title, description, icon }: Props) {
  const navigate = useNavigate();
  return (
    <header className="px-4 pt-6 pb-4 max-w-3xl mx-auto safe-top">
      <button
        onClick={() => navigate('/settings')}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground touch-scale mb-3"
      >
        <ArrowLeft size={16} /> Voltar
      </button>
      <div className="flex items-start gap-3">
        {icon && (
          <div className="w-12 h-12 rounded-2xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">{title}</h1>
          {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
        </div>
      </div>
    </header>
  );
}
