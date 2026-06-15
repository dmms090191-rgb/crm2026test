import { createContext, useContext, useCallback, useRef, useMemo, useState, type ReactNode } from 'react';

export type VisuRole = 'super_admin' | 'company_super_admin' | 'admin' | 'vendor' | 'client';

export interface VisuStackEntry {
  role: VisuRole;
  userId: string;
  displayName: string;
  companyId?: string | null;
}

const ROLE_LABELS: Record<VisuRole, string> = {
  super_admin: 'Rois Admin',
  company_super_admin: 'Super Admin',
  admin: 'Admin',
  vendor: 'Vendeur',
  client: 'Client',
};

export function visuRoleLabel(role: VisuRole): string {
  return ROLE_LABELS[role] ?? role;
}

interface VisualizationContextValue {
  isActive: boolean;
  originalRole: VisuRole | null;
  originalBadgeLabel: string | null;
  previousLevelLabel: string | null;
  stack: VisuStackEntry[];
  pushLevel: (entry: VisuStackEntry) => void;
  popLevel: () => void;
  reset: () => void;
}

const noop = () => {};
const defaultCtx: VisualizationContextValue = {
  isActive: false, originalRole: null, originalBadgeLabel: null, previousLevelLabel: null,
  stack: [], pushLevel: noop, popLevel: noop, reset: noop,
};

const Ctx = createContext<VisualizationContextValue>(defaultCtx);

export function useVisualization(): VisualizationContextValue {
  return useContext(Ctx);
}

interface ProviderProps { children: ReactNode; }

export function VisualizationProvider({ children }: ProviderProps) {
  const stackRef = useRef<VisuStackEntry[]>([]);
  const [, setTick] = useState(0);

  const pushLevel = useCallback((entry: VisuStackEntry) => {
    stackRef.current = [...stackRef.current, entry];
    setTick(v => v + 1);
  }, []);

  const popLevel = useCallback(() => {
    if (stackRef.current.length > 0) {
      stackRef.current = stackRef.current.slice(0, -1);
      setTick(v => v + 1);
    }
  }, []);

  const reset = useCallback(() => {
    stackRef.current = [];
    setTick(v => v + 1);
  }, []);

  const stack = stackRef.current;
  const isActive = stack.length > 0;
  const originalRole = isActive ? stack[0].role : null;
  const originalBadgeLabel = originalRole ? `Visu ${visuRoleLabel(originalRole)}` : null;
  const prevEntry = stack.length >= 2 ? stack[stack.length - 1] : (stack.length === 1 ? stack[0] : null);
  const previousLevelLabel = prevEntry ? `Retour ${visuRoleLabel(prevEntry.role)}` : null;

  const value = useMemo<VisualizationContextValue>(() => ({
    isActive, originalRole, originalBadgeLabel, previousLevelLabel,
    stack, pushLevel, popLevel, reset,
  }), [isActive, originalRole, originalBadgeLabel, previousLevelLabel, stack, pushLevel, popLevel, reset]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
