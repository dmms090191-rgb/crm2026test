import { Suspense, type ReactNode } from 'react';
import { TimezoneProvider } from '../contexts/TimezoneContext';
import { ThemeProvider } from '../contexts/ThemeContext';
import { CompanyIdProvider } from '../contexts/CompanyIdContext';
import { IdentiteConnueContext } from '../contexts/IdentiteConnueContext';
import { AppLoadingScreen } from './AppStatusScreens';

type PanelRole = 'super_admin' | 'admin' | 'vendor' | 'client';

interface Props {
  panelRole: PanelRole;
  companyId?: string;
  useCompanyProvider?: boolean;
  effectiveUserId?: string;
  /** Identifiant du compte connecte deja connu de l'appelant : voir ThemeProvider.knownUserId. */
  knownUserId?: string | null;
  children: ReactNode;
}

export default function AppShell({ panelRole, companyId, useCompanyProvider = false, effectiveUserId, knownUserId, children }: Props) {
  const content = (
    <IdentiteConnueContext.Provider value={knownUserId ?? null}>
      <ThemeProvider panelRole={panelRole} effectiveUserId={effectiveUserId} companyId={companyId} knownUserId={knownUserId} dashboardHost>
        {/* effectiveUserId descend AUSSI ici : le fuseau est une preference, et une
            preference suit l entite VISUALISEE, pas l observateur. */}
        <TimezoneProvider panelRole={panelRole} effectiveUserId={effectiveUserId}>
          <Suspense fallback={<AppLoadingScreen />}>
            {children}
          </Suspense>
        </TimezoneProvider>
      </ThemeProvider>
    </IdentiteConnueContext.Provider>
  );

  if (useCompanyProvider) {
    return <CompanyIdProvider overrideCompanyId={companyId}>{content}</CompanyIdProvider>;
  }

  return content;
}
