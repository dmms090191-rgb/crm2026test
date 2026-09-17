import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { SiteContextProvider, useSiteContext } from '../../../../contexts/SiteContext';
import { type SiteOwnerType } from './siteManagerShellHelpers';
import SiteManagerWorkspace from './SiteManagerWorkspace';
import SiteContextStatusView from './SiteContextStatusView';

export type { SiteOwnerType };

interface Props {
  ownerType: SiteOwnerType;
  title: string;
  subtitle: string;
  /** Entreprise CIBLE du site, nommee explicitement par l'appelant (jamais deduite de l'acteur). */
  companyId?: string | null;
  companyName?: string;
  societeId?: string | null;
  hideDomainTab?: boolean;
  onClose?: () => void;
  onBack?: () => void;
}

/*
 * Point d'entree du module Site.
 * - ownerType 'super_admin' : site officiel Talvex (scope platform).
 * - sinon : site de l'entreprise companyId. Sans companyId, aucun repli sur l'entreprise
 *   du compte connecte : l'ecran l'indique clairement.
 */
export default function SiteManagerShell({ ownerType, title, companyId, hideDomainTab, onClose, onBack }: Props) {
  const scope = ownerType === 'super_admin' ? 'platform' : 'company';
  return (
    <SiteContextProvider scope={scope} targetCompanyId={scope === 'company' ? companyId ?? null : null}>
      <SiteManagerGate ownerType={ownerType} title={title} hideDomainTab={hideDomainTab} onClose={onClose} onBack={onBack} />
    </SiteContextProvider>
  );
}

interface GateProps {
  ownerType: SiteOwnerType;
  title: string;
  hideDomainTab?: boolean;
  onClose?: () => void;
  onBack?: () => void;
}

function SiteManagerGate({ ownerType, title, hideDomainTab, onClose, onBack }: GateProps) {
  const t = useThemeTokens();
  const ctx = useSiteContext();
  if (ctx.status !== 'ready') {
    return <SiteContextStatusView t={t} title={title} status={ctx.status} onClose={onClose} onBack={onBack} />;
  }
  return <SiteManagerWorkspace ownerType={ownerType} title={title} hideDomainTab={hideDomainTab} onClose={onClose} onBack={onBack} />;
}
