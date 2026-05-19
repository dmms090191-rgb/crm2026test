import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';

interface CompanyIdContextValue {
  companyId: string | null;
}

const CompanyIdContext = createContext<CompanyIdContextValue>({ companyId: null });

interface CompanyIdProviderProps {
  overrideCompanyId?: string | null;
  children: ReactNode;
}

export function CompanyIdProvider({ overrideCompanyId, children }: CompanyIdProviderProps) {
  const [authCompanyId, setAuthCompanyId] = useState<string | null>(null);

  useEffect(() => {
    if (overrideCompanyId) return;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.app_metadata?.company_id) {
        setAuthCompanyId(user.app_metadata.company_id);
      }
    });
  }, [overrideCompanyId]);

  const companyId = overrideCompanyId ?? authCompanyId;

  return (
    <CompanyIdContext.Provider value={{ companyId }}>
      {children}
    </CompanyIdContext.Provider>
  );
}

export function useCompanyId(): string | null {
  const { companyId } = useContext(CompanyIdContext);
  return companyId;
}
