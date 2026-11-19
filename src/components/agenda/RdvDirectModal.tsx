import { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, CalendarClock, Pencil, Ban } from 'lucide-react';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import { getTzLabel, getRdvLocalDate, getRdvLocalTime } from '../../lib/timezoneUtils';
import {
  creerRdvDirect, modifierRdvDirect, annulerRdvDirect, verifierCreneau, creneauParDefaut,
  dateHeureRdv, type RdvDirect, type NouveauRdvDirect,
} from '../../lib/rdvDirect';

interface Props {
  /** Le nom ou l'entreprise du lead, en titre. */
  titre: string;
  timezone: string;
  /** Les RDV directs A VENIR de ce lead : modifiables ou annulables ici. */
  rdvs: RdvDirect[];
  /** Ce qu'il faut pour en AJOUTER un (depuis la ligne du lead). Absent : pas de formulaire d'ajout. */
  creation?: Omit<NouveauRdvDirect, 'date' | 'heure' | 'note' | 'tz'> | null;
  /** Ouvrir directement la modification de ce RDV (depuis l'agenda). */
  enEdition?: string | null;
  onClose: () => void;
  /** Apres une ecriture reussie : le message a annoncer. */
  onFait: (message: string) => void;
}

/*
 * « RDV DIRECT » — date, heure, note facultative, Ajouter. Aucun lien avec le panel client.
 *
 * Rendu dans document.body (portail), comme MobileStatutModal : monte depuis une ligne du
 * tableau, un `fixed` se rapporterait sinon a la carte qui porte un backdrop-filter.
 */
export default function RdvDirectModal({ titre, timezone, rdvs, creation, enEdition, onClose, onFait }: Props) {
  const t = useThemeTokens();
  const idTitre = useId();
  const enCours = enEdition ? rdvs.find(r => r.id === enEdition) ?? null : null;
  const [edite, setEdite] = useState<RdvDirect | null>(enCours);
  const depart = (r: RdvDirect | null) => r
    ? { date: getRdvLocalDate(r, timezone), heure: getRdvLocalTime(r, timezone), note: r.description ?? '' }
    : { ...creneauParDefaut(timezone, Date.now()), note: '' };
  const [champs, setChamps] = useState(() => depart(enCours));
  const [erreur, setErreur] = useState('');
  const [occupe, setOccupe] = useState(false);
  const [aAnnuler, setAAnnuler] = useState<string | null>(null);

  useEffect(() => {
    const echap = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', echap);
    const avant = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', echap); document.body.style.overflow = avant; };
  }, [onClose]);

  const editer = (r: RdvDirect | null) => { setEdite(r); setChamps(depart(r)); setErreur(''); setAAnnuler(null); };

  const enregistrer = async () => {
    const refus = verifierCreneau(champs.date, champs.heure, timezone, Date.now());
    if (refus) { setErreur(refus); return; }
    setOccupe(true); setErreur('');
    const res = edite
      ? await modifierRdvDirect(edite.id, { ...champs, tz: timezone })
      : creation ? await creerRdvDirect({ ...creation, ...champs, tz: timezone }) : { error: 'Ajout impossible ici.' };
    setOccupe(false);
    if (res.error) { setErreur(res.error); return; }
    const { date, heure } = dateHeureRdv({ proposed_date: champs.date, proposed_time: champs.heure, appointment_utc: null }, timezone);
    onFait(`${edite ? 'RDV direct modifié' : 'RDV direct ajouté'} : ${titre}, le ${date} à ${heure}.`);
    onClose();
  };

  const annuler = async (r: RdvDirect) => {
    setOccupe(true); setErreur('');
    const res = await annulerRdvDirect(r.id);
    setOccupe(false);
    if (res.error) { setErreur(res.error); return; }
    const { date, heure } = dateHeureRdv(r, timezone);
    onFait(`RDV direct annulé : ${titre}, le ${date} à ${heure}.`);
    onClose();
  };

  const champStyle = { background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.input.text, caretColor: t.input.text } as const;
  const formulaire = edite || creation;

  return createPortal(
    <div className="flex items-center justify-center p-4"
      style={{ position: 'fixed', inset: 0, zIndex: 99999, background: t.modal.overlayBg, backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby={idTitre}
        className="w-[92vw] max-w-[420px] max-h-[85vh] rounded-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: 'min(85vh, calc(100dvh - 32px))', background: t.modal.bg, border: `1px solid ${t.modal.border}`, boxShadow: t.modal.shadow }}>
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 flex-shrink-0" style={{ borderBottom: `1px solid ${t.surface.border}` }}>
          <div className="min-w-0">
            <p id={idTitre} className="text-sm font-semibold flex items-center gap-2" style={{ color: t.modal.title }}>
              <CalendarClock className="w-4 h-4 flex-shrink-0" style={{ color: t.accent.text }} />RDV direct
            </p>
            <p className="text-[11px] truncate" style={{ color: t.text.tertiary }}>{titre}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: t.modal.closeBtnBg, color: t.modal.closeBtnText }}><X className="w-4 h-4" /></button>
        </div>

        <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1 min-h-0" style={{ overscrollBehavior: 'contain' }}>
          <p className="text-[11px] leading-relaxed" style={{ color: t.text.tertiary }}>
            Fixé par vous, sans proposition ni validation du client. Il apparaît dans votre agenda, dans l'agenda d'équipe et dans l'historique du lead.
          </p>

          {!enEdition && rdvs.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: t.text.quaternary }}>Déjà prévus</p>
              {rdvs.map(r => {
                const { date, heure } = dateHeureRdv(r, timezone);
                return (
                  <div key={r.id} className="rounded-xl px-3 py-2" style={{ background: edite?.id === r.id ? t.accent.bg : t.surface.tertiary, border: `1px solid ${edite?.id === r.id ? t.accent.border : t.surface.borderLight}` }}>
                    <p className="text-xs font-semibold" style={{ color: t.text.primary }}>{date} à {heure}</p>
                    {r.description && <p className="text-[11px] break-words" style={{ color: t.text.secondary }}>{r.description}</p>}
                    {aAnnuler === r.id ? (
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className="text-[11px]" style={{ color: t.text.secondary }}>Annuler ce RDV direct ?</span>
                        <button type="button" disabled={occupe} onClick={() => annuler(r)} className="min-h-[36px] px-3 rounded-lg text-[11px] font-semibold disabled:opacity-40"
                          style={{ background: t.danger.bg, color: t.danger.text, border: `1px solid ${t.danger.border}` }}>Oui, annuler</button>
                        <button type="button" onClick={() => setAAnnuler(null)} className="min-h-[36px] px-2 text-[11px]" style={{ color: t.text.tertiary }}>Non</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 mt-1.5">
                        <button type="button" onClick={() => editer(r)} className="inline-flex items-center gap-1 min-h-[36px] px-2.5 rounded-lg text-[11px] font-semibold"
                          style={{ background: t.surface.secondary, color: t.text.secondary, border: `1px solid ${t.surface.border}` }}><Pencil className="w-3 h-3" />Modifier</button>
                        <button type="button" onClick={() => setAAnnuler(r.id)} className="inline-flex items-center gap-1 min-h-[36px] px-2.5 rounded-lg text-[11px] font-semibold"
                          style={{ color: t.danger.text }}><Ban className="w-3 h-3" />Annuler le RDV</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {formulaire && (
            <form className="space-y-3" onSubmit={e => { e.preventDefault(); enregistrer(); }}>
              <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: t.text.quaternary }}>
                {edite ? 'Modifier le RDV direct' : 'Nouveau RDV direct'}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="text-[11px] font-semibold" style={{ color: t.text.secondary }}>Date</span>
                  <input type="date" required value={champs.date} onChange={e => setChamps(c => ({ ...c, date: e.target.value }))}
                    className="mt-1 w-full h-11 px-3 rounded-xl text-[13px] focus:outline-none" style={champStyle} />
                </label>
                <label className="block">
                  <span className="text-[11px] font-semibold" style={{ color: t.text.secondary }}>Heure</span>
                  <input type="time" required step={300} value={champs.heure} onChange={e => setChamps(c => ({ ...c, heure: e.target.value }))}
                    className="mt-1 w-full h-11 px-3 rounded-xl text-[13px] focus:outline-none" style={champStyle} />
                </label>
              </div>
              <label className="block">
                <span className="text-[11px] font-semibold" style={{ color: t.text.secondary }}>Note <span style={{ color: t.text.quaternary }}>(facultative)</span></span>
                <textarea value={champs.note} maxLength={500} rows={2} placeholder="Ex. : rappeler pour présentation du site"
                  onChange={e => setChamps(c => ({ ...c, note: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 rounded-xl text-[13px] focus:outline-none resize-none" style={champStyle} />
              </label>
              <p className="text-[10px]" style={{ color: t.text.quaternary }}>Fuseau : {getTzLabel(timezone)}</p>
              {erreur && <p className="text-xs" role="alert" style={{ color: t.danger.text }}>{erreur}</p>}
              <div className="flex items-center gap-2">
                <button type="submit" disabled={occupe} className="flex-1 min-h-[44px] rounded-xl text-sm font-semibold disabled:opacity-40"
                  style={{ background: t.accent.solid, color: '#fff' }}>{edite ? 'Enregistrer' : 'Ajouter'}</button>
                {edite && !enEdition && creation && (
                  <button type="button" onClick={() => editer(null)} className="min-h-[44px] px-3 rounded-xl text-xs" style={{ color: t.text.tertiary }}>Nouveau</button>
                )}
              </div>
              {edite && enEdition && (
                aAnnuler === edite.id ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px]" style={{ color: t.text.secondary }}>Annuler ce RDV direct ?</span>
                    <button type="button" disabled={occupe} onClick={() => annuler(edite)} className="min-h-[40px] px-3 rounded-lg text-xs font-semibold disabled:opacity-40"
                      style={{ background: t.danger.bg, color: t.danger.text, border: `1px solid ${t.danger.border}` }}>Oui, annuler</button>
                    <button type="button" onClick={() => setAAnnuler(null)} className="min-h-[40px] px-2 text-xs" style={{ color: t.text.tertiary }}>Non</button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setAAnnuler(edite.id)} className="inline-flex items-center gap-1.5 min-h-[40px] text-xs font-semibold" style={{ color: t.danger.text }}>
                    <Ban className="w-3.5 h-3.5" />Annuler le RDV direct
                  </button>
                )
              )}
            </form>
          )}
          {!formulaire && erreur && <p className="text-xs" role="alert" style={{ color: t.danger.text }}>{erreur}</p>}
        </div>
      </div>
    </div>,
    document.body,
  );
}
