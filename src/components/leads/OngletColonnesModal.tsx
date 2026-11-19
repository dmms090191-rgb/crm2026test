import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ArrowUp, ArrowDown, Eye, EyeOff, Lock, Plus } from 'lucide-react';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import {
  CLES_SYSTEME, CLES_TOUJOURS_VISIBLES, LIBELLES_SYSTEME, type ColonneAffichee, type CleSystemeOnglet,
} from '../../lib/ongletsLeads';
import type { OngletsLeads } from '../../hooks/useOngletsLeads';

interface Props {
  og: OngletsLeads;
  ongletId: string;
  onClose: () => void;
}

interface Ligne extends ColonneAffichee { libelleSaisi: string }

/*
 * LES COLONNES D'UN ONGLET : ordre, visibilite, libelle. RIEN N'EST SUPPRIME.
 *
 * Masquer une colonne la retire de l'affichage de CET onglet ; ses valeurs restent dans
 * chaque lead et dans la fiche. Statut et Actions — les colonnes de travail — ne se masquent
 * pas (la base le refuse aussi). Le libelle est propre a l'onglet : renommer « Note » en
 * « Note Google » ici ne change pas la colonne des autres onglets.
 */
export default function OngletColonnesModal({ og, ongletId, onClose }: Props) {
  const t = useThemeTokens();
  const fond = useRef<HTMLDivElement>(null);
  const nom = og.onglets.find(o => o.id === ongletId)?.nom ?? '';
  const [lignes, setLignes] = useState<Ligne[]>(() =>
    (og.colonnesParOnglet.get(ongletId) ?? []).map(c => ({ ...c, libelleSaisi: c.libelle })));
  const [ajouts, setAjouts] = useState<({ colonne_id: string } | { cle_systeme: string })[]>([]);
  const [aAjouter, setAAjouter] = useState('');
  const [erreur, setErreur] = useState('');
  const [occupe, setOccupe] = useState(false);

  useEffect(() => {
    const echap = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', echap);
    return () => window.removeEventListener('keydown', echap);
  }, [onClose]);

  /* Ce qu'on peut encore ajouter : les colonnes du registre et les colonnes standard absentes. */
  const disponibles = useMemo(() => {
    const presentes = new Set(lignes.map(l => l.cle));
    const dejaAjoutes = new Set(ajouts.map(a => ('colonne_id' in a ? 'dyn:' + a.colonne_id : a.cle_systeme)));
    const res: { valeur: string; libelle: string }[] = [];
    for (const k of CLES_SYSTEME) {
      if (!presentes.has(k) && !dejaAjoutes.has(k)) res.push({ valeur: k, libelle: `${LIBELLES_SYSTEME[k]} (standard)` });
    }
    for (const r of [...og.registre.values()].sort((a, b) => a.libelle.localeCompare(b.libelle, 'fr'))) {
      if (!presentes.has('dyn:' + r.id) && !dejaAjoutes.has('dyn:' + r.id)) res.push({ valeur: 'dyn:' + r.id, libelle: r.libelle });
    }
    return res;
  }, [lignes, ajouts, og.registre]);

  const deplacer = (i: number, d: -1 | 1) => setLignes(prev => {
    const j = i + d;
    if (j < 0 || j >= prev.length) return prev;
    const n = [...prev];
    [n[i], n[j]] = [n[j], n[i]];
    return n;
  });

  const enregistrer = async () => {
    setOccupe(true); setErreur('');
    const { error } = await og.enregistrerColonnes(
      ongletId,
      lignes.filter(l => l.idLigne).map((l, i) => ({
        id: l.idLigne as string,
        position: i,
        visible: l.systeme && CLES_TOUJOURS_VISIBLES.includes(l.systeme) ? true : l.visible,
        libelle: l.libelleSaisi.trim() && l.libelleSaisi.trim() !== (l.systeme ? LIBELLES_SYSTEME[l.systeme] : og.registre.get(l.cle.slice(4))?.libelle) ? l.libelleSaisi.trim() : null,
      })),
      ajouts,
    );
    setOccupe(false);
    if (error) { setErreur(error); return; }
    onClose();
  };

  return createPortal(
    <div ref={fond} className="flex items-center justify-center p-4"
      style={{ position: 'fixed', inset: 0, zIndex: 100000, background: t.modal.overlayBg, backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === fond.current) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="titre-colonnes-onglet" className="w-full max-w-lg rounded-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: 'calc(100dvh - 32px)', background: t.modal.bg, border: `1px solid ${t.modal.border}`, boxShadow: t.modal.shadow }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${t.surface.border}` }}>
          <h2 id="titre-colonnes-onglet" className="text-sm font-bold truncate" style={{ color: t.modal.title }}>Colonnes de « {nom} »</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: t.modal.closeBtnBg, color: t.modal.closeBtnText }}><X className="w-4 h-4" /></button>
        </div>
        <ol className="px-4 py-3 space-y-1.5 overflow-y-auto min-h-0">
          {lignes.map((l, i) => {
            const verrou = !!l.systeme && CLES_TOUJOURS_VISIBLES.includes(l.systeme as CleSystemeOnglet);
            return (
              <li key={l.cle} className="flex items-center gap-2 rounded-xl px-2 py-1.5" style={{ background: t.surface.tertiary, opacity: l.visible || verrou ? 1 : 0.55 }}>
                <div className="flex flex-col">
                  <button type="button" aria-label={`Monter ${l.libelle}`} disabled={i === 0} onClick={() => deplacer(i, -1)} className="w-7 h-5 flex items-center justify-center disabled:opacity-20" style={{ color: t.text.tertiary }}><ArrowUp className="w-3.5 h-3.5" /></button>
                  <button type="button" aria-label={`Descendre ${l.libelle}`} disabled={i === lignes.length - 1} onClick={() => deplacer(i, 1)} className="w-7 h-5 flex items-center justify-center disabled:opacity-20" style={{ color: t.text.tertiary }}><ArrowDown className="w-3.5 h-3.5" /></button>
                </div>
                <input value={l.libelleSaisi} maxLength={200} aria-label={`Libellé de ${l.libelle}`}
                  onChange={e => setLignes(prev => prev.map(x => x.cle === l.cle ? { ...x, libelleSaisi: e.target.value } : x))}
                  className="flex-1 min-w-0 h-9 px-2.5 rounded-lg text-xs focus:outline-none" style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.input.text }} />
                <span className="text-[9px] uppercase tracking-wide w-14 text-right flex-shrink-0" style={{ color: t.text.quaternary }}>{l.systeme ? 'standard' : l.type}</span>
                {verrou ? (
                  <span className="w-9 h-9 flex items-center justify-center" title="Colonne de travail, toujours visible" style={{ color: t.text.quaternary }}><Lock className="w-3.5 h-3.5" /></span>
                ) : (
                  <button type="button" aria-pressed={l.visible} aria-label={l.visible ? `Masquer ${l.libelle}` : `Afficher ${l.libelle}`}
                    onClick={() => setLignes(prev => prev.map(x => x.cle === l.cle ? { ...x, visible: !x.visible } : x))}
                    className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ color: l.visible ? t.accent.text : t.text.quaternary }}>
                    {l.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                )}
              </li>
            );
          })}
          {ajouts.map(a => {
            const cle = 'colonne_id' in a ? 'dyn:' + a.colonne_id : a.cle_systeme;
            const libelle = 'colonne_id' in a ? og.registre.get(a.colonne_id)?.libelle : LIBELLES_SYSTEME[a.cle_systeme as CleSystemeOnglet];
            return (
              <li key={cle} className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs" style={{ background: t.accent.bg, color: t.accent.text }}>
                <Plus className="w-3.5 h-3.5" />{libelle} — sera ajoutée à droite
                <button type="button" className="ml-auto text-[11px] underline" onClick={() => setAjouts(prev => prev.filter(x => x !== a))}>annuler</button>
              </li>
            );
          })}
        </ol>
        {disponibles.length > 0 && (
          <div className="flex items-center gap-2 px-4 py-2" style={{ borderTop: `1px solid ${t.surface.border}` }}>
            <select value={aAjouter} onChange={e => setAAjouter(e.target.value)} aria-label="Colonne à ajouter"
              className="flex-1 min-w-0 h-10 px-2.5 rounded-lg text-xs focus:outline-none" style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.input.text }}>
              <option value="">Ajouter une colonne…</option>
              {disponibles.map(d => <option key={d.valeur} value={d.valeur}>{d.libelle}</option>)}
            </select>
            <button type="button" disabled={!aAjouter} onClick={() => {
              setAjouts(prev => [...prev, aAjouter.startsWith('dyn:') ? { colonne_id: aAjouter.slice(4) } : { cle_systeme: aAjouter }]);
              setAAjouter('');
            }} className="h-10 px-3 rounded-lg text-xs font-semibold disabled:opacity-40" style={{ background: t.accent.bg, color: t.accent.text, border: `1px solid ${t.accent.border}` }}>Ajouter</button>
          </div>
        )}
        {erreur && <p className="mx-5 mb-2 text-xs" role="alert" style={{ color: t.danger.text }}>{erreur}</p>}
        <div className="flex items-center justify-end gap-2 px-4 py-3" style={{ borderTop: `1px solid ${t.surface.border}` }}>
          <button type="button" onClick={onClose} className="h-10 px-3 rounded-lg text-xs" style={{ color: t.text.tertiary }}>Annuler</button>
          <button type="button" onClick={enregistrer} disabled={occupe} className="h-10 px-4 rounded-lg text-xs font-bold disabled:opacity-40" style={{ background: t.accent.solid, color: '#fff' }}>Enregistrer</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
