import { useEffect, useState, useCallback } from 'react';

const KEY = 'finango:sim_plan_code';

/**
 * Simulação de plano (apenas dev/admin).
 * Persiste em localStorage e emite um evento global 'sim-plan-change'
 * para todos os hooks reagirem imediatamente sem reload.
 */
export function getSimulatedPlan(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(KEY);
}

export function setSimulatedPlan(code: string | null) {
  if (typeof window === 'undefined') return;
  if (code) window.localStorage.setItem(KEY, code);
  else window.localStorage.removeItem(KEY);
  window.dispatchEvent(new CustomEvent('sim-plan-change', { detail: code }));
}

export function useSimulatedPlan() {
  const [code, setCode] = useState<string | null>(() => getSimulatedPlan());

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string | null>).detail;
      setCode(detail ?? null);
    };
    window.addEventListener('sim-plan-change', handler);
    // Também escuta mudanças de outra aba
    const storageHandler = (e: StorageEvent) => {
      if (e.key === KEY) setCode(e.newValue);
    };
    window.addEventListener('storage', storageHandler);
    return () => {
      window.removeEventListener('sim-plan-change', handler);
      window.removeEventListener('storage', storageHandler);
    };
  }, []);

  const update = useCallback((c: string | null) => setSimulatedPlan(c), []);
  return { simulatedPlan: code, setSimulatedPlan: update };
}
