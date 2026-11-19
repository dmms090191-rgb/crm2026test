import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, FolderInput } from 'lucide-react';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import type { OngletsLeads } from '../../hooks/useOngletsLeads';

interface Props {
  og: OngletsLeads;
  leadIds: string[];
  /** L'onglet ouvert : inutile de le proposer. */
  sauf?: string;
  onClose: (message?: string) => void;
}

/*
 * RANGER DES LEADS DANS UN ONGLET, SANS LES DUPLIQUER.
 *
 * Le lead reste UNE ligne de `leads` : on ajoute seulement son rattachement a l'onglet. Un
 * lead deja present n'est pas compte deux fois ; un lead qui en avait ete retire y revient.
 */
export default function AjouterAOngletModal({ og, leadIds, sauf, onClose }: Props) {
  const t = useThemeTokens();
  const fond = useRef<HTMLDivElement>(null);
  const [erreur, setErreur] = useState('');
  const [occupe, setOccupe] = useState(false);
  const choix = og.onglets.filter(o => o.id !== sauf);

  useEffect(() => {
    const echap = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', echap);
    return () => window.removeEventListener('keydown', echap);
  }, [onClose]);

  const ajouter = async (ongletId: string, nom: string) => {
    setOccupe(true); setErreur('');
    const { error } = await og.rattacher(ongletId, leadIds);
    setOccupe(false);
    if (error) { setErreur(error); return; }
    onClose(`${leadIds.length} lead${leadIds.length > 1 ? 's' : ''} ajouté${leadIds.length > 1 ? 's' : ''} à « ${nom} ».`);
  };

  return createPortal(
    <div ref={fond} className="flex items-center justify-center p-4"
      style={{ position: 'fixed', inset: 0, zIndex: 99999, background: t.modal.overlayBg, backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === fond.current) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="titre-ajouter-onglet" className="w-full max-w-sm rounded-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: 'calc(100dvh - 32px)', background: t.modal.bg, border: `1px solid ${t.modal.border}`, boxShadow: t.modal.shadow }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${t.surface.border}` }}>
          <h2 id="titre-ajouter-onglet" className="text-sm font-bold" style={{ color: t.modal.title }}>Ajouter {leadIds.length} lead{leadIds.length > 1 ? 's' : ''} à un onglet</h2>
          <button type="button" onClick={() => onClose()} aria-label="Fermer" className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: t.modal.closeBtnBg, color: t.modal.closeBtnText }}><X className="w-4 h-4" /></button>
        </div>
        <ul className="p-3 space-y-1.5 overflow-y-auto min-h-0">
          {choix.map(o => (
            <li key={o.id}>
              <button type="button" disabled={occupe} onClick={() => ajouter(o.id, o.nom)}
                className="w-full flex items-center gap-2 px-3 min-h-[44px] rounded-xl text-sm text-left disabled:opacity-40"
                style={{ background: t.surface.tertiary, color: t.text.primary }}>
                <FolderInput className="w-4 h-4 flex-shrink-0" style={{ color: t.accent.text }} />
                <span className="truncate">{o.nom}</span>
              </button>
            </li>
          ))}
          {choix.length === 0 && <li className="text-xs px-2 py-3" style={{ color: t.text.quaternary }}>Aucun autre onglet. Créez-en un depuis « Onglet : … ».</li>}
        </ul>
        {erreur && <p className="mx-5 mb-3 text-xs" role="alert" style={{ color: t.danger.text }}>{erreur}</p>}
      </div>
    </div>,
    document.body,
  );
}
