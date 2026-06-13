import { Suspense, type ReactNode } from 'react';
import { TimezoneProvider } from '../contexts/TimezoneContext';
import { ThemeProvider } from '../contexts/ThemeContext';
import { CompanyIdProvider } from '../contexts/CompanyIdContext';
import { AppLoadingScreen } from './AppStatusScreens';

type PanelRole = 'super_admin' | 'admin' | 'vendor' | 'client';

interface Props {
  panelRole: PanelRole;
  companyId?: string;
  useCompanyProvider?: boolean;
  effectiveUserId?: string;
  children: ReactNode;
}

export default function AppShell({ panelRole, companyId, useCompanyProvider = false, effectiveUserId, children }: Props) {
  const content = (
    <ThemeProvider panelRole={panelRole} effectiveUserId={effectiveUserId} companyId={companyId}>
      <TimezoneProvider panelRole={panelRole}>
        <Suspense fallback={<AppLoadingScreen />}>
          {children}
        </Suspense>
      </TimezoneProvider>
    </ThemeProvider>
  );

  if (useCompanyProvider) {
    return <CompanyIdProvider overrideCompanyId={companyId}>{content}</CompanyIdProvider>;
  }

  return content;
}
