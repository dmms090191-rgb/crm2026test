import { useCallback } from 'react';
import { useSimulation } from '../contexts/SimulationContext';

export function useSimulationGuard() {
  const { isSimulating } = useSimulation();

  const guardAction = useCallback(
    (action: () => void) => {
      if (isSimulating) return;
      action();
    },
    [isSimulating]
  );

  return { isBlocked: isSimulating, guardAction };
}
