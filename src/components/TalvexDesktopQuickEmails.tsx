import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Star, Settings, Trash2, Plus, Mail, Zap, X, Inbox } from 'lucide-react';
import { getQuickEmails, setQuickEmails, isValidEmail } from '../lib/quickEmails';
import { CYAN, CYAN_CLAIR, BLANC, MIST, DUSK, EDGE, TRAIT, DANGER } from '../lib/talvexDesktopPalette';

/**
 * LES TROIS BOUTONS « Rapides / Enregistrer / Gerer » POUR LE LAUNCHER DE BUREAU.
 *
 * POURQUOI UN JUMEAU, et pas le composant du web. Trois raisons mesurees le 25/10/2026,
 * chacune suffisante a elle seule :
 *
 *  1. LA GARDE AUTOMATIQUE ROUGIRAIT. scripts/runtime/runtime.test.ts (G2ter) suit la
 *     chaine d'imports REELLE du launcher et echoue si un `useTheme(` y apparait, parce
 *     que le launcher n'a pas de ThemeProvider. Or sa resolution d'imports est une regex
 *     sur la clause `from` du texte BRUT : elle ne distingue pas `import type` d'un import
 *     de valeur. QuickEmailSelector importe `useThemeTokens` en `import type` seulement —
 *     donc rien ne leverait a l'execution — mais la garde, elle, suivrait le lien et
 *     listerait le `useTheme` de ThemeContext. Un releve rouge sur un danger inexistant
 *     reste un releve rouge, et on ne desarme pas une garde pour faire passer un chantier.
 *
 *  2. LES PANNEAUX SERAIENT ENFERMES. QuickEmailSelector rend ses superpositions en
 *     `position: fixed` SANS portail. Dans le launcher, deux ancetres creent un bloc
 *     conteneur pour les descendants fixes : la <section> de droite porte
 *     `backdropFilter: blur(6px)`, et le <label> du champ email garde `translateY(0)` en
 *     permanence apres son animation d'entree (translateY(0) n'est pas `none`). Un
 *     `fixed inset-0` s'y ancrerait sur la boite du label, voile compris. D'ou le
 *     createPortal ci-dessous, vers document.body.
 *
 *  3. LE CONTRAT DE COULEURS NE CORRESPOND PAS. La prop `tokens` du composant web exige
 *     l'interface ThemeTokens entiere alors que seules 21 cles sont lues. La satisfaire
 *     demanderait soit d'inventer des dizaines de valeurs, soit un cast — et le cast
 *     casserait a l'execution, sans erreur de compilation, le jour ou le composant partage
 *     lirait une 22e cle.
 *
 * LE DEPOT A DEJA TRANCHE AINSI. La landing centrale n'utilise pas non plus le composant
 * web : elle a son propre jumeau (TalvexQuickEmailSelector + TalvexQuickEmailShell), qui a
 * resolu le meme probleme de portail de la meme facon. Au total quatre implementations
 * coexistent deja ; ce qu'elles PARTAGENT, et qui compte vraiment, c'est la cle et le
 * format de stockage — ici dans src/lib/quickEmails.ts.
 *
 * CE QUI EST REPRIS A L'IDENTIQUE DU WEB : la cle, le format, la validation, le refus des
 * doublons, la relecture du stockage A CHAQUE ouverture de panneau (et non l'etat React),
 * les libelles exacts de modaleTextes.ts, le compteur, les cibles de 44 px, et l'Echap en
 * phase de CAPTURE (sans quoi la touche traverserait jusqu'a la fenetre du dessous).
 *
 * CE QUI N'EST PAS REPRIS : rien d'authentification. Ce composant n'importe ni supabase,
 * ni usePinInput. Il ne sait pas se connecter, et ne doit pas l'apprendre.
 */

/* Les libelles, repris mot pour mot de modaleTextes.ts:98-114 — la landing centrale et le
   launcher doivent dire exactement la meme chose. Le depot ecrit ses libelles d'interface
   sans accents (« Gerer », « enregistre ») : on s'y conforme plutot que d'introduire une
   typographie differente dans la seule application de bureau. */
const T = {
  rapides: 'Rapides',
  enregistrer: 'Enregistrer',
  gerer: 'Gerer',
  titreRapides: 'Emails rapides',
  titreGerer: 'Gerer les emails',
  ajouterUnEmail: 'Ajouter un email...',
  toutSupprimer: 'Tout supprimer',
  aucunEmail: 'Aucun email rapide',
  aucunEmailAide: "Cliquez Enregistrer pour ajouter l'email actuel.",
  aucunEmailAideGerer: 'Ajoutez un email ci-dessus.',
  emailInvalide: 'Adresse email invalide.',
  dejaEnregistre: 'Cet email est deja enregistre.',
  ajouteAuxRapides: 'Email ajoute aux acces rapides.',
  ajoute: 'Email ajoute.',
  supprime: 'Email supprime.',
  listeVidee: 'Emails rapides vides.',
  /* Celui-ci n'existe pas dans le web : les quatre implementations laissent l'exception de
     localStorage remonter. Ici l'ecriture rend un booleen, donc on peut le dire. */
  ecritureRefusee: "Cet appareil a refuse l'enregistrement.",
  compteur: (n: number) => `${n} email${n !== 1 ? 's' : ''} enregistre${n !== 1 ? 's' : ''}`,
};

interface PanneauProps {
  ouvert: boolean;
  onFermer: () => void;
  titre: string;
  icone: typeof Zap;
  compte: number;
  children: React.ReactNode;
}

/**
 * L'enveloppe des deux panneaux. Portalisee vers document.body : voir la raison 2 de
 * l'entete. Sans portail, le panneau s'afficherait a l'interieur du champ email.
 */
function Panneau({ ouvert, onFermer, titre, icone: Icone, compte, children }: PanneauProps) {
  const [entre, setEntre] = useState(false);

  useEffect(() => {
    if (!ouvert) { setEntre(false); return; }
    const t = requestAnimationFrame(() => setEntre(true));
    return () => cancelAnimationFrame(t);
  }, [ouvert]);

  /*
   * ECHAP REFERME CE PANNEAU, ET S'ARRETE LA. Le meme raisonnement que
   * TalvexQuickEmailShell.tsx:26-37 : on ecoute en phase de CAPTURE et on arrete la
   * propagation, pour que la touche ne traverse pas jusqu'a ce qui ecoute en dessous. Une
   * touche de retour en arriere qui detruit la saisie est pire que pas de touche du tout.
   */
  useEffect(() => {
    if (!ouvert) return;
    const auClavier = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      onFermer();
    };
    window.addEventListener('keydown', auClavier, true);
    return () => window.removeEventListener('keydown', auClavier, true);
  }, [ouvert, onFermer]);

  if (!ouvert) return null;

  return createPortal(
    <>
      <style>{`
        @keyframes tvxqeVoile { from { opacity: 0; } to { opacity: 1; } }
        @keyframes tvxqeEntre { from { opacity: 0; transform: translateY(14px) scale(0.975); }
                                  to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes tvxqeLigne { from { opacity: 0; transform: translateX(-8px); }
                                  to { opacity: 1; transform: translateX(0); } }
        .tvxqe-ajout::placeholder { color: ${EDGE}; opacity: 1; }
        .tvxqe-ajout:focus {
          border-color: ${CYAN} !important;
          background: rgba(0,188,212,0.06) !important;
          box-shadow: 0 0 0 1px ${CYAN}55, 0 0 20px -6px ${CYAN}99 !important;
        }
      `}</style>
      <div
        role="presentation"
        style={{
          position: 'fixed', inset: 0, zIndex: 70,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
          backgroundColor: 'rgba(5,9,14,0.78)',
          backdropFilter: 'blur(14px)',
          animation: 'tvxqeVoile 0.24s ease-out',
        }}
        onClick={(e) => { if (e.target === e.currentTarget) onFermer(); }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label={titre}
          style={{
            width: '92%', maxWidth: 400, borderRadius: 14, overflow: 'hidden', position: 'relative',
            background: 'linear-gradient(165deg, rgba(19,28,39,0.985), rgba(8,13,19,0.995))',
            border: `1px solid ${TRAIT}`,
            boxShadow: `0 0 60px ${CYAN}14, 0 22px 54px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.045)`,
            animation: entre ? 'tvxqeEntre 0.32s cubic-bezier(0.16,1,0.3,1) forwards' : 'none',
            opacity: entre ? 1 : 0,
            fontFamily: '"Segoe UI", system-ui, -apple-system, sans-serif',
          }}
        >
          {/* en-tete */}
          <div style={{ position: 'relative', padding: '18px 18px 14px' }}>
            <button
              type="button"
              onClick={onFermer}
              aria-label="Fermer"
              style={{
                position: 'absolute', top: 14, insetInlineEnd: 14, width: 36, height: 36,
                borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(255,255,255,0.04)', border: `1px solid ${TRAIT}`,
                color: EDGE, cursor: 'pointer', transition: 'color 180ms ease, background 180ms ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = BLANC; e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = EDGE; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: `linear-gradient(135deg, ${CYAN}26, ${CYAN}0D)`,
                  border: `1px solid ${CYAN}40`,
                }}
              >
                <Icone className="w-4 h-4" style={{ color: CYAN }} />
              </div>
              <div>
                <h3 style={{ color: BLANC, fontSize: 14.5, fontWeight: 650, margin: 0 }}>{titre}</h3>
                <p style={{ color: EDGE, fontSize: 11, fontWeight: 500, margin: '3px 0 0' }}>
                  {T.compteur(compte)}
                </p>
              </div>
            </div>
          </div>
          <div style={{ height: 1, margin: '0 18px', background: `linear-gradient(90deg, transparent, ${TRAIT}, transparent)` }} />
          {children}
        </div>
      </div>
    </>,
    document.body,
  );
}

function Vide({ message, aide }: { message: string; aide: string }) {
  return (
    <div style={{ padding: '26px 18px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
      <div
        style={{
          width: 50, height: 50, borderRadius: 14, marginBottom: 12,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(255,255,255,0.03)', border: `1.5px dashed ${TRAIT}`,
        }}
      >
        <Inbox className="w-5 h-5" style={{ color: EDGE }} />
      </div>
      <p style={{ color: DUSK, fontSize: 12.5, fontWeight: 500, margin: 0 }}>{message}</p>
      <p style={{ color: EDGE, fontSize: 11, margin: '5px 0 0' }}>{aide}</p>
    </div>
  );
}

interface Props {
  /** L'adresse actuellement saisie : c'est elle qu'« Enregistrer » ajoute. */
  email: string;
  /** Appele quand l'utilisateur choisit une adresse dans « Rapides ». */
  onSelect: (email: string) => void;
}

export default function TalvexDesktopQuickEmails({ email, onSelect }: Props) {
  const [liste, setListe] = useState<string[]>(getQuickEmails);
  const [picker, setPicker] = useState(false);
  const [gestion, setGestion] = useState(false);
  const [saisieAjout, setSaisieAjout] = useState('');
  const [message, setMessage] = useState('');
  const [enSuppression, setEnSuppression] = useState<string | null>(null);

  /* Relit le STOCKAGE, pas l'etat React : une autre fenetre du launcher, ou l'autre
     panneau, a pu modifier la liste entre-temps. Le web fait de meme avant chaque
     ouverture (QuickEmailSelector.tsx:102 et :127). */
  const relire = useCallback(() => {
    const l = getQuickEmails();
    setListe(l);
    return l;
  }, []);

  const dire = useCallback((m: string) => {
    setMessage(m);
    setTimeout(() => setMessage(''), 2500);
  }, []);

  /** Ecrit, et ne pretend au succes que si le stockage a vraiment accepte. */
  const ecrire = useCallback((maj: string[], succes: string) => {
    if (!setQuickEmails(maj)) { dire(T.ecritureRefusee); return; }
    setListe(maj);
    dire(succes);
  }, [dire]);

  const enregistrerCourant = useCallback(() => {
    const adresse = email.trim().toLowerCase();
    if (!adresse) return;
    if (!isValidEmail(adresse)) { dire(T.emailInvalide); return; }
    const l = relire();
    if (l.includes(adresse)) { dire(T.dejaEnregistre); return; }
    ecrire([...l, adresse], T.ajouteAuxRapides);
  }, [email, relire, dire, ecrire]);

  const ajouterManuel = useCallback(() => {
    const adresse = saisieAjout.trim().toLowerCase();
    if (!adresse) return;
    if (!isValidEmail(adresse)) { dire(T.emailInvalide); return; }
    const l = relire();
    if (l.includes(adresse)) { dire(T.dejaEnregistre); return; }
    if (!setQuickEmails([...l, adresse])) { dire(T.ecritureRefusee); return; }
    setListe([...l, adresse]);
    setSaisieAjout('');
    dire(T.ajoute);
  }, [saisieAjout, relire, dire]);

  /* La suppression s'anime 220 ms avant d'ecrire, comme la variante de la landing
     (TalvexQuickEmailSelector.tsx:42-50) : la ligne s'efface, puis disparait. */
  const supprimer = useCallback((cible: string) => {
    setEnSuppression(cible);
    setTimeout(() => {
      const maj = getQuickEmails().filter((e) => e !== cible);
      setEnSuppression(null);
      ecrire(maj, T.supprime);
    }, 220);
  }, [ecrire]);

  const toutVider = useCallback(() => {
    ecrire([], T.listeVidee);
  }, [ecrire]);

  const boutons = [
    { cle: T.rapides, Icone: ChevronDown, faire: () => { relire(); setPicker(true); }, inactif: false },
    { cle: T.enregistrer, Icone: Star, faire: enregistrerCourant, inactif: !email.trim() },
    { cle: T.gerer, Icone: Settings, faire: () => { relire(); setGestion(true); }, inactif: false },
  ];

  return (
    <>
      {/* La rangee, posee directement sous le champ email. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 11, flexWrap: 'wrap' }}>
        {boutons.map(({ cle, Icone, faire, inactif }) => (
          <button
            key={cle}
            type="button"
            onClick={faire}
            disabled={inactif}
            aria-label={cle}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              // 44 px de haut : la meme cible tactile que la variante de la landing.
              padding: '0 12px', minHeight: 44,
              borderRadius: 9,
              background: 'rgba(255,255,255,0.03)',
              border: `1px solid ${TRAIT}`,
              color: inactif ? EDGE : DUSK,
              fontSize: 11.5, fontWeight: 600, letterSpacing: '0.01em',
              cursor: inactif ? 'not-allowed' : 'pointer',
              opacity: inactif ? 0.42 : 1,
              transition: 'color 180ms ease, border-color 180ms ease, background 180ms ease',
            }}
            onMouseEnter={(e) => {
              if (inactif) return;
              e.currentTarget.style.color = BLANC;
              e.currentTarget.style.borderColor = `${CYAN}66`;
              e.currentTarget.style.background = 'rgba(0,188,212,0.07)';
            }}
            onMouseLeave={(e) => {
              if (inactif) return;
              e.currentTarget.style.color = DUSK;
              e.currentTarget.style.borderColor = TRAIT;
              e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
            }}
          >
            <Icone className="w-3.5 h-3.5" />
            <span>{cle}</span>
          </button>
        ))}

        {message && (
          <span
            role="status"
            style={{ flexBasis: '100%', marginTop: 7, color: CYAN_CLAIR, fontSize: 11.5, fontWeight: 600 }}
          >
            {message}
          </span>
        )}
      </div>

      {/* ---------- PANNEAU « Rapides » : choisir un compte enregistre ---------- */}
      <Panneau ouvert={picker} onFermer={() => setPicker(false)} titre={T.titreRapides} icone={Zap} compte={liste.length}>
        <div style={{ maxHeight: 264, overflowY: 'auto', padding: '8px 8px 12px' }}>
          {liste.length === 0 ? (
            <Vide message={T.aucunEmail} aide={T.aucunEmailAide} />
          ) : (
            liste.map((adresse, i) => (
              <button
                key={adresse}
                type="button"
                onClick={() => { onSelect(adresse); setPicker(false); }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 11,
                  padding: '11px 12px', borderRadius: 10, textAlign: 'left',
                  background: 'transparent', border: '1px solid transparent',
                  color: MIST, fontSize: 13, cursor: 'pointer',
                  animation: `tvxqeLigne 0.28s cubic-bezier(0.16,1,0.3,1) ${i * 0.045}s both`,
                  transition: 'background 180ms ease, border-color 180ms ease, color 180ms ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = `linear-gradient(135deg, ${CYAN}14, ${CYAN}08)`;
                  e.currentTarget.style.borderColor = `${CYAN}2E`;
                  e.currentTarget.style.color = BLANC;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.borderColor = 'transparent';
                  e.currentTarget.style.color = MIST;
                }}
              >
                <span
                  style={{
                    width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: `${CYAN}12`, border: `1px solid ${CYAN}26`,
                  }}
                >
                  <Mail className="w-3.5 h-3.5" style={{ color: CYAN, opacity: 0.75 }} />
                </span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{adresse}</span>
              </button>
            ))
          )}
        </div>
      </Panneau>

      {/* ---------- PANNEAU « Gerer » : ajouter, supprimer, vider ---------- */}
      <Panneau ouvert={gestion} onFermer={() => setGestion(false)} titre={T.titreGerer} icone={Settings} compte={liste.length}>
        <div style={{ display: 'flex', gap: 8, padding: '14px 18px 0' }}>
          <input
            className="tvxqe-ajout"
            type="email"
            value={saisieAjout}
            onChange={(e) => setSaisieAjout(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); ajouterManuel(); } }}
            placeholder={T.ajouterUnEmail}
            aria-label={T.ajouterUnEmail}
            spellCheck={false}
            style={{
              flex: 1, minWidth: 0, padding: '10px 12px', borderRadius: 10,
              background: 'rgba(255,255,255,0.03)', border: `1px solid ${TRAIT}`,
              color: BLANC, fontSize: 13.5, outline: 'none',
              transition: 'border-color 180ms ease, background 180ms ease, box-shadow 180ms ease',
            }}
          />
          <button
            type="button"
            onClick={ajouterManuel}
            aria-label="Ajouter cet email"
            style={{
              flexShrink: 0, width: 40, height: 40, borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: `linear-gradient(135deg, ${CYAN}, #0098B3)`,
              border: 'none', color: '#04171C', cursor: 'pointer',
              boxShadow: `0 0 16px -4px ${CYAN}AA`,
            }}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div style={{ padding: '12px 14px', maxHeight: 208, overflowY: 'auto', display: 'grid', gap: 5 }}>
          {liste.length === 0 ? (
            <Vide message={T.aucunEmail} aide={T.aucunEmailAideGerer} />
          ) : (
            liste.map((adresse, i) => (
              <div
                key={adresse}
                style={{
                  display: 'flex', alignItems: 'center', gap: 9,
                  padding: '9px 11px', borderRadius: 10,
                  background: 'rgba(255,255,255,0.025)', border: `1px solid ${TRAIT}`,
                  animation: `tvxqeLigne 0.28s cubic-bezier(0.16,1,0.3,1) ${i * 0.045}s both`,
                  opacity: enSuppression === adresse ? 0 : 1,
                  transform: enSuppression === adresse ? 'translateX(18px) scale(0.96)' : 'none',
                  transition: 'opacity 220ms ease, transform 220ms ease',
                }}
              >
                <span
                  style={{
                    width: 26, height: 26, borderRadius: 7, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: `${CYAN}12`, border: `1px solid ${CYAN}1F`,
                  }}
                >
                  <Mail className="w-3 h-3" style={{ color: CYAN, opacity: 0.65 }} />
                </span>
                <span style={{ flex: 1, color: MIST, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {adresse}
                </span>
                <button
                  type="button"
                  onClick={() => supprimer(adresse)}
                  aria-label={`Supprimer ${adresse}`}
                  title={`Supprimer ${adresse}`}
                  style={{
                    flexShrink: 0, width: 30, height: 30, borderRadius: 8,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(224,106,128,0.08)', border: '1px solid rgba(224,106,128,0.16)',
                    color: DANGER, cursor: 'pointer', transition: 'background 180ms ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(224,106,128,0.18)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(224,106,128,0.08)'; }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        <div style={{ padding: '6px 18px 18px' }}>
          <div style={{ height: 1, marginBottom: 12, background: `linear-gradient(90deg, transparent, ${TRAIT}, transparent)` }} />
          <button
            type="button"
            onClick={toutVider}
            disabled={liste.length === 0}
            style={{
              width: '100%', padding: '11px 0', borderRadius: 10,
              background: 'rgba(224,106,128,0.08)', border: '1px solid rgba(224,106,128,0.16)',
              color: DANGER, fontSize: 12, fontWeight: 650,
              cursor: liste.length === 0 ? 'not-allowed' : 'pointer',
              opacity: liste.length === 0 ? 0.35 : 1,
              transition: 'background 180ms ease',
            }}
          >
            {T.toutSupprimer}
          </button>
        </div>

        {message && (
          <p role="status" style={{ textAlign: 'center', color: CYAN_CLAIR, fontSize: 11.5, fontWeight: 600, padding: '0 0 14px', margin: 0 }}>
            {message}
          </p>
        )}
      </Panneau>
    </>
  );
}
