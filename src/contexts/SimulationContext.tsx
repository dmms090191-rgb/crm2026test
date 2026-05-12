import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export interface SimulationData {
  filename: string;
  exportDate: string;
  tables: Record<string, unknown[]>;
  counts: Record<string, number>;
}

interface SimulationContextValue {
  isSimulating: boolean;
  simulationData: SimulationData | null;
  startSimulation: (data: SimulationData) => void;
  stopSimulation: () => void;
}

const SimulationContext = createContext<SimulationContextValue | undefined>(undefined);

interface SimulationProviderProps {
  children: ReactNode;
}

export function SimulationProvider({ children }: SimulationProviderProps) {
  const [simulationData, setSimulationData] = useState<SimulationData | null>(null);

  const startSimulation = useCallback((data: SimulationData) => {
    setSimulationData(data);
  }, []);

  const stopSimulation = useCallback(() => {
    setSimulationData(null);
  }, []);

  return (
    <SimulationContext.Provider
      value={{
        isSimulating: simulationData !== null,
        simulationData,
        startSimulation,
        stopSimulation,
      }}
    >
      {children}
    </SimulationContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSimulation() {
  const ctx = useContext(SimulationContext);
  if (!ctx) throw new Error('useSimulation must be used within SimulationProvider');
  return ctx;
}
