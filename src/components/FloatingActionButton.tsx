import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

interface FloatingActionButtonProps {
  onClick: () => void;
  className?: string;
}

export function FloatingActionButton({ onClick, className }: FloatingActionButtonProps) {
  const [showPulse, setShowPulse] = useState(false);

  // Pulse reminder after 60s of inactivity on the page
  useEffect(() => {
    const timer = setTimeout(() => setShowPulse(true), 60000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <motion.button
      onClick={() => {
        setShowPulse(false);
        onClick();
      }}
      className={cn(
        'btn-float group lg:bottom-8',
        showPulse && 'animate-[fab-pulse_2s_ease-in-out_infinite]',
        className
      )}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.3 }}
      whileTap={{ scale: 0.92 }}
      aria-label="Adicionar transação"
    >
      <Plus 
        size={24} 
        strokeWidth={2.5} 
        className="text-primary-foreground transition-transform duration-300 group-hover:rotate-90" 
      />
    </motion.button>
  );
}
