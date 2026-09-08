import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import EntityInfoTab from './EntityInfoTab';
import type { DetailEntity, InfoDraft } from './EntityInfoTab';
import EntityPasswordTab from './EntityPasswordTab';
import EntityCommentsTab from './EntityCommentsTab';

type ModalTab = 'informations' | 'mot-de-passe' | 'commentaires';

interface Props {
  entity: DetailEntity;
  /** Libelle du champ « entreprise » : « Societe » ou « Groupe ». */
  companyLabel: string;
  /** Champs que l'appelant sait reellement enregistrer. `email` : bascule Auth. */
  editableFields?: { company?: boolean; phone?: boolean; email?: boolean };
  /** Sauvegarde des informations — propre a l'entite (endpoint different). */
  onSaveInfo: (draft: InfoDraft) => Promise<void>;
  currentPin?: string;
  onClose: () => void;
  onUpdate: () => void;
}

/**
 * Modal de detail a trois onglets, partage entre le detail d'une Societe
 * (panel Groupe) et celui d'un Groupe (panel Talvex).
 *
 * Comportements stabilises, conserves ici :
 *   · l'overlay ne ferme PAS — seule la croix ferme ;
 *   · la taille est figee sur celle de l'onglet « Informations », mesuree au
 *     premier rendu : aucun saut en changeant d'onglet.
 */
export default function EntityDetailModal({
  entity, companyLabel, editableFields, onSaveInfo, currentPin, onClose, onUpdate,
}: Props) {
  const tokens = useThemeTokens();
  const [tab, setTab] = useState<ModalTab>('informations');

  const panelRef = useRef<HTMLDivElement>(null);
  const [lockedHeight, setLockedHeight] = useState<number | null>(null);

  useLayoutEffect(() => {
    if (lockedHeight !== null || tab !== 'informations') return;
    const h = panelRef.current?.getBoundingClientRect().height;
    if (h) setLockedHeight(h);
  }, [tab, lockedHeight]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const tabs: { id: ModalTab; label: string }[] = [
    { id: 'informations', label: 'Informations' },
    { id: 'mot-de-passe', label: 'Mot de passe' },
    { id: 'commentaires', label: 'Commentaires' },
  ];

  // L'overlay reste strictement visuel : plus aucun onClick dessus.
  return createPortal(
    <div
      className="flex items-center justify-center p-4"
      style={{
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100dvh', zIndex: 99999,
        background: tokens.modal.overlayBg,
        backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
      }}
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{ background: tokens.modal.bg, border: `1px solid ${tokens.modal.border}`, boxShadow: tokens.modal.shadow }}
      >
        <div className="flex items-center justify-between px-6 py-4 gap-3" style={{ borderBottom: `1px solid ${tokens.surface.border}` }}>
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate" style={{ color: tokens.modal.title }}>
              {entity.first_name || entity.last_name ? `${entity.first_name} ${entity.last_name}`.trim() : 'Admin'}
            </p>
            <p className="text-xs truncate" style={{ color: tokens.modal.subtitle }}>{entity.email}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors flex-shrink-0"
            style={{ background: tokens.modal.closeBtnBg, color: tokens.modal.closeBtnText }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex px-6 pt-4 gap-1" style={{ borderBottom: `1px solid ${tokens.surface.border}` }}>
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="px-3 py-2 text-xs font-semibold rounded-t-lg transition-all"
              style={
                tab === t.id
                  ? { color: tokens.accent.text, borderBottom: `2px solid ${tokens.accent.text}`, marginBottom: '-1px' }
                  : { color: tokens.text.quaternary }
              }
            >
              {t.label}
            </button>
          ))}
        </div>

        <div
          ref={panelRef}
          className="px-6 py-5 max-h-[26rem] overflow-y-auto"
          style={lockedHeight !== null ? { minHeight: lockedHeight } : undefined}
        >
          {tab === 'informations' && (
            <EntityInfoTab
              entity={entity}
              companyLabel={companyLabel}
              editableFields={editableFields}
              onSave={onSaveInfo}
              onUpdate={onUpdate}
            />
          )}
          {tab === 'mot-de-passe' && <EntityPasswordTab adminId={entity.id} currentPin={currentPin} onUpdate={onUpdate} />}
          {tab === 'commentaires' && <EntityCommentsTab adminId={entity.id} />}
        </div>
      </div>
    </div>,
    document.body
  );
}
