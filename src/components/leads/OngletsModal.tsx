import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, FolderPlus, Pencil, Archive, Columns3, Layers, Upload } from 'lucide-react';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import { ONGLET_PRINCIPAL } from '../../lib/ongletsLeads';
import type { OngletsLeads } from '../../hooks/useOngletsLeads';

interface Props {
  og: OngletsLeads;
  totalLeads: number;
  /** Societe et Super Admin : creer, renommer, archiver, organiser les colonnes. */
  peutGerer: boolean;
  onClose: () => void;
  onGererColonnes?: (ongletId: string) => void;
  /** Les comptes a afficher par onglet. Par defaut, ceux de la societe ; le commercial passe les siens. */
  comptes?: Map<string, number>;
}

/*
 * « CHOISIR UN ONGLET DE COLONNES ».
 *
 * Principal en tete (tous les leads, colonnes standard), puis les onglets de la societe dans
 * leur ordre. Choisir un onglet change a la fois les LEADS montres et les COLONNES du
 * tableau. Archiver n'efface rien : l'onglet disparait de la liste, ses leads restent dans
 * Principal, et la base garde tout (on masque, on ne supprime jamais).
 */
export default function OngletsModal({ og, totalLeads, peutGerer, onClose, onGererColonnes, comptes }: Props) {
  const compte = (id: string) => (comptes ?? og.comptes).get(id) ?? 0;
  const t = useThemeTokens();
  const fond = useRef<HTMLDivElement>(null);
  const [creation, setCreation] = useState(false);
  const [nomNouveau, setNomNouveau] = useState('');
  const [enRenommage, setEnRenommage] = useState<string | null>(null);
  const [nomRenomme, setNomRenomme] = useState('');
  const [aArchiver, setAArchiver] = useState<string | null>(null);
  const [erreur, setErreur] = useState('');
  const [occupe, setOccupe] = useState(false);

  useEffect(() => {
    const avant = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const echap = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', echap);
    return () => { document.body.style.overflow = avant; window.removeEventListener('keydown', echap); };
  }, [onClose]);

  const agir = async (f: () => Promise<{ error: string | null }>, apres?: () => void) => {
    setOccupe(true); setErreur('');
    const { error } = await f();
    setOccupe(false);
    if (error) { setErreur(error); return; }
    apres?.();
  };

  const choisir = (id: string) => { og.choisir(id); onClose(); };

  const ligne = (id: string, nom: string, detail: string, origine?: 'manuel' | 'import') => {
    const actif = og.ongletActif === id;
    return (
      <li key={id} className="rounded-xl" style={{ background: actif ? t.accent.bg : t.surface.tertiary, border: `1px solid ${actif ? t.accent.border : t.surface.borderLight}` }}>
        {enRenommage === id ? (
          <form className="flex items-center gap-2 p-2" onSubmit={e => { e.preventDefault(); agir(() => og.renommer(id, nomRenomme), () => setEnRenommage(null)); }}>
            <input autoFocus value={nomRenomme} maxLength={80} onChange={e => setNomRenomme(e.target.value)} aria-label="Nouveau nom"
              className="flex-1 h-10 px-3 rounded-lg text-sm focus:outline-none" style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.input.text }} />
            <button type="submit" disabled={occupe || !nomRenomme.trim()} className="h-10 px-3 rounded-lg text-xs font-semibold disabled:opacity-40" style={{ background: t.accent.bg, color: t.accent.text, border: `1px solid ${t.accent.border}` }}>Renommer</button>
            <button type="button" onClick={() => setEnRenommage(null)} className="h-10 px-2 rounded-lg text-xs" style={{ color: t.text.tertiary }}>Annuler</button>
          </form>
        ) : (
          <div className="flex items-center gap-2 p-1.5">
            <button type="button" onClick={() => choisir(id)} aria-pressed={actif}
              className="flex-1 min-w-0 flex items-center gap-3 px-2 py-2 rounded-lg text-left min-h-[44px]">
              <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: actif ? t.accent.solid : t.surface.secondary, color: actif ? '#fff' : t.text.tertiary }}>
                {actif ? <Check className="w-4 h-4" /> : id === ONGLET_PRINCIPAL ? <Layers className="w-4 h-4" /> : origine === 'import' ? <Upload className="w-4 h-4" /> : <Columns3 className="w-4 h-4" />}
              </span>
              <span className="min-w-0">
                <span className="block text-sm truncate" style={{ color: actif ? t.accent.text : t.text.primary, fontWeight: actif ? 700 : 600 }}>{nom}</span>
                <span className="block text-[11px]" style={{ color: t.text.quaternary }}>{detail}</span>
              </span>
            </button>
            {peutGerer && id !== ONGLET_PRINCIPAL && (
              <div className="flex items-center gap-1 flex-shrink-0">
                <button type="button" title="Colonnes de l'onglet" aria-label={`Colonnes de ${nom}`} onClick={() => onGererColonnes?.(id)}
                  className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ color: t.text.tertiary }}><Columns3 className="w-4 h-4" /></button>
                <button type="button" title="Renommer" aria-label={`Renommer ${nom}`} onClick={() => { setEnRenommage(id); setNomRenomme(nom); setErreur(''); }}
                  className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ color: t.text.tertiary }}><Pencil className="w-4 h-4" /></button>
                <button type="button" title="Archiver" aria-label={`Archiver ${nom}`} onClick={() => { setAArchiver(id); setErreur(''); }}
                  className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ color: t.text.tertiary }}><Archive className="w-4 h-4" /></button>
              </div>
            )}
          </div>
        )}
        {aArchiver === id && (
          <div className="px-3 pb-3 text-xs space-y-2" role="alertdialog" aria-label={`Archiver ${nom}`}>
            <p style={{ color: t.text.secondary }}>Archiver « {nom} » ? L'onglet disparaît de la liste. Aucun lead n'est supprimé : ils restent tous dans Principal.</p>
            <div className="flex gap-2">
              <button type="button" disabled={occupe} onClick={() => agir(() => og.archiver(id), () => setAArchiver(null))}
                className="h-9 px-3 rounded-lg font-semibold disabled:opacity-40" style={{ background: t.danger.bg, color: t.danger.text, border: `1px solid ${t.danger.border}` }}>Archiver</button>
              <button type="button" onClick={() => setAArchiver(null)} className="h-9 px-3 rounded-lg" style={{ color: t.text.tertiary }}>Annuler</button>
            </div>
          </div>
        )}
      </li>
    );
  };

  return createPortal(
    <div ref={fond} className="flex items-center justify-center p-4"
      style={{ position: 'fixed', inset: 0, zIndex: 99999, background: t.modal.overlayBg, backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === fond.current) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="titre-onglets" className="w-full max-w-lg rounded-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: 'calc(100dvh - 32px)', background: t.modal.bg, border: `1px solid ${t.modal.border}`, boxShadow: t.modal.shadow }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${t.surface.border}` }}>
          <h2 id="titre-onglets" className="text-sm font-bold" style={{ color: t.modal.title }}>Choisir un onglet de colonnes</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: t.modal.closeBtnBg, color: t.modal.closeBtnText }}><X className="w-4 h-4" /></button>
        </div>
        <ul className="px-4 py-3 space-y-2 overflow-y-auto min-h-0">
          {ligne(ONGLET_PRINCIPAL, 'Principal', `Tous les leads (${totalLeads}) · colonnes standard`)}
          {og.onglets.map(o => ligne(o.id, o.nom,
            `${compte(o.id)} lead${compte(o.id) > 1 ? 's' : ''} · ${(og.colonnesParOnglet.get(o.id) ?? []).filter(c => !c.systeme).length} colonnes du fichier`, o.origine))}
          {og.onglets.length === 0 && (
            <li className="text-xs px-2 py-3" style={{ color: t.text.quaternary }}>Aucun onglet pour l'instant : un import CSV en crée un, ou créez-le ici.</li>
          )}
        </ul>
        {erreur && <p className="mx-5 mb-2 text-xs" role="alert" style={{ color: t.danger.text }}>{erreur}</p>}
        {peutGerer && (
          <div className="px-4 py-3" style={{ borderTop: `1px solid ${t.surface.border}` }}>
            {creation ? (
              <form className="flex items-center gap-2" onSubmit={e => { e.preventDefault(); agir(() => og.creer(nomNouveau), () => { setCreation(false); setNomNouveau(''); onClose(); }); }}>
                <input autoFocus value={nomNouveau} maxLength={80} onChange={e => setNomNouveau(e.target.value)} placeholder="Nom du nouvel onglet" aria-label="Nom du nouvel onglet"
                  className="flex-1 h-10 px-3 rounded-lg text-sm focus:outline-none" style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.input.text }} />
                <button type="submit" disabled={occupe || !nomNouveau.trim()} className="h-10 px-3 rounded-lg text-xs font-semibold disabled:opacity-40" style={{ background: t.accent.bg, color: t.accent.text, border: `1px solid ${t.accent.border}` }}>Créer</button>
                <button type="button" onClick={() => setCreation(false)} className="h-10 px-2 text-xs" style={{ color: t.text.tertiary }}>Annuler</button>
              </form>
            ) : (
              <button type="button" onClick={() => { setCreation(true); setErreur(''); }} className="flex items-center gap-2 h-10 px-3 rounded-lg text-xs font-semibold"
                style={{ background: t.surface.tertiary, color: t.text.secondary, border: `1px solid ${t.surface.borderLight}` }}>
                <FolderPlus className="w-4 h-4" />Créer un onglet (colonnes standard)
              </button>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
