import SASuperAdminCreateModal from './SASuperAdminCreateModal';
import SASuperAdminActionsModal from './SASuperAdminActionsModal';
import SASuperAdminDetailModal from './SASuperAdminDetailModal';
import DeleteBranchModal from '../../../../components/deletion/DeleteBranchModal';
import SAStatutRowDropdown from '../crm-societe/SAStatutRowDropdown';
import DomainManagementModal from '../admins/DomainManagementModal';
import SiteManagerModal from '../site-builder/SiteManagerModal';
import type { CompanySuperAdmin } from './superAdminTypes';
import type { SAStatut } from '../crm-societe/types';
import type { ThemeTokens } from '../../../../lib/themeTokensTypes';

interface Props {
  tokens: ThemeTokens;

  showCreate: boolean;
  onCloseCreate: () => void;
  onCreated: () => void;

  statutFor: string | null;
  statutRect: { top: number; left: number } | null;
  statuts: Record<string, string>;
  saStatuts: SAStatut[];
  onSelectStatut: (nom: string) => void;
  onCloseStatut: () => void;

  deleteOpen: boolean;
  selectedGroups: CompanySuperAdmin[];
  onCloseDelete: () => void;
  onDeleteDone: () => void;

  actionsSa: CompanySuperAdmin | null;
  onCloseActions: () => void;
  onConnect: (sa: CompanySuperAdmin) => void;
  onChat: (sa: CompanySuperAdmin) => void;
  onDomain: (sa: CompanySuperAdmin) => void;
  onSite: (sa: CompanySuperAdmin) => void;
  onDetail: (sa: CompanySuperAdmin) => void;

  detailSa: CompanySuperAdmin | null;
  onCloseDetail: () => void;
  onDetailUpdate: () => void;

  domainSa: CompanySuperAdmin | null;
  onCloseDomain: () => void;
  onDomainUpdate: () => void;
  onDomainBack: () => void;

  siteSa: CompanySuperAdmin | null;
  onCloseSite: () => void;
  onSiteBack: () => void;
}

/** Toutes les fenetres de la liste des groupes. Aucune logique, uniquement du montage. */
export default function SASuperAdminsModals({
  tokens: t,
  showCreate, onCloseCreate, onCreated,
  statutFor, statutRect, statuts, saStatuts, onSelectStatut, onCloseStatut,
  deleteOpen, selectedGroups, onCloseDelete, onDeleteDone,
  actionsSa, onCloseActions, onConnect, onChat, onDomain, onSite, onDetail,
  detailSa, onCloseDetail, onDetailUpdate,
  domainSa, onCloseDomain, onDomainUpdate, onDomainBack,
  siteSa, onCloseSite, onSiteBack,
}: Props) {
  return (
    <>
      {showCreate && (
        <SASuperAdminCreateModal
          tokens={t}
          onClose={onCloseCreate}
          onCreated={onCreated}
        />
      )}

      {statutFor && statutRect && (
        <SAStatutRowDropdown
          rect={statutRect}
          currentStatut={statuts[statutFor] ?? ''}
          saStatuts={saStatuts}
          onSelect={onSelectStatut}
          onClose={onCloseStatut}
          t={t}
        />
      )}

      {deleteOpen && selectedGroups.length > 0 && (
        <DeleteBranchModal
          targets={selectedGroups.map(g => ({
            id: g.id,
            label: g.company || [g.first_name, g.last_name].filter(Boolean).join(' ') || g.email,
          }))}
          mode="delete"
          entityLabel="Groupe"
          entityLabelPlural="Groupes"
          entityArticle="le"
          tokens={t}
          onClose={onCloseDelete}
          onDone={onDeleteDone}
        />
      )}

      {actionsSa && (
        <SASuperAdminActionsModal
          sa={actionsSa}
          tokens={t}
          onClose={onCloseActions}
          onConnect={onConnect}
          onChat={onChat}
          onDomain={onDomain}
          onSite={onSite}
          onDetail={onDetail}
        />
      )}

      {detailSa && (
        <SASuperAdminDetailModal sa={detailSa} onClose={onCloseDetail} onUpdate={onDetailUpdate} />
      )}

      {domainSa && (
        <DomainManagementModal
          companyId={domainSa.company_id}
          companyName={domainSa.company}
          onClose={onCloseDomain}
          onUpdate={onDomainUpdate}
          onBack={onDomainBack}
        />
      )}

      {siteSa && (
        <SiteManagerModal
          ownerType="admin_company"
          title={`Site de ${siteSa.company || [siteSa.first_name, siteSa.last_name].filter(Boolean).join(' ')}`}
          subtitle={`Gestion du site pour la societe ${siteSa.company || siteSa.email}`}
          companyId={siteSa.company_id}
          onClose={onCloseSite}
          onBack={onSiteBack}
        />
      )}
    </>
  );
}
