import CSAAdminsCreateModal from './CSAAdminsCreateModal';
import CSAAdminActionsModal from './CSAAdminActionsModal';
import CSAAdminDetailModal from './CSAAdminDetailModal';
import DeleteBranchModal from '../../components/deletion/DeleteBranchModal';
import SAStatutRowDropdown from '../superadmin/views/crm-societe/SAStatutRowDropdown';
import type { CSAAdminUser } from './useCsaCompanies';
import type { SAStatut } from '../superadmin/views/crm-societe/types';
import type { ThemeTokens } from '../../lib/themeTokensTypes';

interface Props {
  t: ThemeTokens;
  companyId: string;
  /** Id Auth du Groupe : proprietaire du reglage d ordre des actions. */
  csaAuthId?: string | null;
  /** Talvex en Visu Groupe : seul habilite a masquer des actions. */
  canHideTabs?: boolean;
  showCreate: boolean;
  setShowCreate: (v: boolean) => void;
  fetchAdmins: () => void;
  statutFor: string | null;
  statutRect: { top: number; left: number } | null;
  statutsMap: Record<string, string>;
  statuts: SAStatut[];
  assignStatut: (companyId: string, nom: string) => Promise<void>;
  closeStatut: () => void;
  deleteOpen: boolean;
  setDeleteOpen: (v: boolean) => void;
  selectedTargets: CSAAdminUser[];
  loadGuards: () => void;
  exitSelectMode: () => void;
  actionsAdmin: CSAAdminUser | null;
  setActionsAdmin: (v: CSAAdminUser | null) => void;
  setDetailAdmin: (v: CSAAdminUser | null) => void;
  onConnectAsAdmin?: (admin: CSAAdminUser) => void;
  onMessageAdmin?: (admin: CSAAdminUser) => void;
  detailAdmin: CSAAdminUser | null;
}

/** Toutes les fenetres de « Gestion des societes ». Aucune logique, uniquement du montage. */
export default function CSAAdminsModals(p: Props) {
  const { t, companyId, showCreate, setShowCreate, fetchAdmins, statutFor, statutRect,
    statutsMap, statuts, assignStatut, closeStatut, deleteOpen, setDeleteOpen,
    selectedTargets, loadGuards, exitSelectMode, actionsAdmin, setActionsAdmin,
    setDetailAdmin, onConnectAsAdmin, onMessageAdmin, detailAdmin } = p;
  return (
    <>
      {showCreate && (
        <CSAAdminsCreateModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); fetchAdmins(); }}
          targetCompanyId={companyId}
        />
      )}
      {statutFor && statutRect && (
        <SAStatutRowDropdown
          rect={statutRect}
          currentStatut={statutsMap[statutFor] ?? ''}
          saStatuts={statuts}
          onSelect={async nom => { await assignStatut(statutFor, nom); closeStatut(); }}
          onClose={closeStatut}
          t={t}
        />
      )}

      {deleteOpen && selectedTargets.length > 0 && (
        <DeleteBranchModal
          targets={selectedTargets.map(a => ({
            id: a.company_id,
            label: a.company || [a.first_name, a.last_name].filter(Boolean).join(' ') || a.email,
          }))}
          mode="delete_company"
          entityLabel="Société"
          entityLabelPlural="Sociétés"
          entityArticle="la"
          tokens={t}
          onClose={() => setDeleteOpen(false)}
          onDone={() => { fetchAdmins(); loadGuards(); exitSelectMode(); }}
        />
      )}

      {actionsAdmin && (
        <CSAAdminActionsModal
          admin={actionsAdmin}
          csaAuthId={p.csaAuthId}
          canManageVisibility={p.canHideTabs}
          onClose={() => setActionsAdmin(null)}
          onDetail={a => { setActionsAdmin(null); setDetailAdmin(a); }}
          onConnect={a => { setActionsAdmin(null); onConnectAsAdmin?.(a); }}
          onMessage={a => { setActionsAdmin(null); onMessageAdmin?.(a); }}
        />
      )}
      {detailAdmin && (
        <CSAAdminDetailModal
          admin={detailAdmin}
          onClose={() => setDetailAdmin(null)}
          onUpdate={fetchAdmins}
        />
      )}
    </>
  );
}
