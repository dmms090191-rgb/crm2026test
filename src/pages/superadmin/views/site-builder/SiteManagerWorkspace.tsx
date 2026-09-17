import { useSiteContext } from '../../../../contexts/SiteContext';
import { type SiteOwnerType } from './siteManagerShellHelpers';
import { useSiteWorkspaceData } from './useSiteWorkspaceData';
import SiteWorkspaceView from './SiteWorkspaceView';

/*
 * Conteneur de l'interface Site : la cible et l'acteur viennent EXCLUSIVEMENT de useSiteContext()
 * (verifie par le serveur), les donnees de useSiteWorkspaceData (RLS avec le JWT reel).
 * L'affichage est dans SiteWorkspaceView.
 */
interface Props {
  ownerType: SiteOwnerType;
  title: string;
  hideDomainTab?: boolean;
  onClose?: () => void;
  onBack?: () => void;
}

export default function SiteManagerWorkspace({ title, hideDomainTab, onClose, onBack }: Props) {
  const ctx = useSiteContext();
  const data = useSiteWorkspaceData(ctx);
  return <SiteWorkspaceView ctx={ctx} data={data} title={title} hideDomainTab={hideDomainTab} onClose={onClose} onBack={onBack} />;
}
