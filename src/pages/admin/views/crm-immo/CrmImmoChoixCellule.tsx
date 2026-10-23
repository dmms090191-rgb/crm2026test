import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Loader2, X } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';

/**
 * UNE CELLULE A CHOIX, MODIFIABLE SUR PLACE.
 *
 * ---------- DEUX FORMES, PARCE QUE DEUX GESTES ----------
 *
 * Sur ordinateur, un petit menu ancre sous la cellule : on vise a la souris, on clique.
 * Sur telephone, une feuille qui monte du bas, dont chaque option fait 44 px : on ne
 * vise pas un menu de 24 px avec un pouce. Un <select> natif serait le troisieme choix,
 * et le pire des trois — il rend un menu systeme minuscule dans une carte.
 *
 * ---------- POURQUOI UN PORTAIL, ET DU `fixed` ----------
 *
 * Le tableau vit dans un conteneur a defilement horizontal. Un menu en `absolute` y
 * serait ROGNE des qu'il depasse la cellule, et c'est tout le propos d'un menu. On le
 * porte donc vers document.body et on le place a partir du rectangle du bouton.
 *
 * ---------- CE QUE CE COMPOSANT NE DECIDE PAS ----------
 *
 * Il ne connait ni la table, ni la colonne, ni Supabase. Il recoit une liste de choix et
 * rend la valeur choisie. C'est l'appelant qui ecrit, et qui REVIENT EN ARRIERE si la
 * base refuse — ce composant se contente d'afficher l'erreur et de rester ouvert, pour
 * qu'elle soit lue avant de disparaitre.
 */

interface Props {
  /** La valeur technique courante, ou null si non renseignee. */
  valeur: string | null;
  choix: readonly { valeur: string; libelle: string }[];
  /** Le nom de la colonne — titre de la feuille mobile, et nom accessible du bouton. */
  libelleColonne: string;
  /** De qui parle cette ligne : le bouton seul ne le dirait pas a un lecteur d'ecran. */
  nomDossier: string;
  testid: string;
  onChoisir: (valeur: string) => Promise<{ error: string | null }>;
}

export default function CrmImmoChoixCellule({
  valeur, choix, libelleColonne, nomDossier, testid, onChoisir,
}: Props) {
  const t = useThemeTokens();
  const [ouvert, setOuvert] = useState(false);
  const [enCours, setEnCours] = useState<string | null>(null);
  const [erreur, setErreur] = useState('');
  const [ancre, setAncre] = useState<{ x: number; y: number; largeur: number } | null>(null);
  const bouton = useRef<HTMLButtonElement | null>(null);

  const libelle = valeur === null ? '' : (choix.find(c => c.valeur === valeur)?.libelle ?? '');

  const fermer = useCallback(() => { setOuvert(false); setErreur(''); }, []);

  /*
   * Echap ferme le menu, et LUI SEUL. On ecoute en capture et on arrete la propagation :
   * ce menu peut s'ouvrir dans une page qui ecoute aussi Echap, et un seul appui ne doit
   * pas tout refermer. Meme raison que l'apercu des documents.
   */
  useEffect(() => {
    if (!ouvert) return;
    const auClavier = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      fermer();
    };
    document.addEventListener('keydown', auClavier, true);
    return () => document.removeEventListener('keydown', auClavier, true);
  }, [ouvert, fermer]);

  /* Le menu de bureau suit son bouton : un defilement du tableau le laisserait sinon
     flotter tout seul au milieu de l'ecran. On le ferme plutot que de le poursuivre. */
  useEffect(() => {
    if (!ouvert) return;
    const auDefilement = () => fermer();
    window.addEventListener('scroll', auDefilement, true);
    window.addEventListener('resize', auDefilement);
    return () => {
      window.removeEventListener('scroll', auDefilement, true);
      window.removeEventListener('resize', auDefilement);
    };
  }, [ouvert, fermer]);

  const ouvrir = useCallback(() => {
    const r = bouton.current?.getBoundingClientRect();
    if (r) setAncre({ x: r.left, y: r.bottom, largeur: r.width });
    setErreur('');
    setOuvert(true);
  }, []);

  const choisir = useCallback(async (v: string) => {
    setEnCours(v);
    const { error } = await onChoisir(v);
    setEnCours(null);
    if (error !== null) { setErreur(error); return; }
    setOuvert(false);
  }, [onChoisir]);

  /* Les options, partagees par les deux formes : une seule liste, donc aucune chance
     qu'un jour l'une propose un choix que l'autre ignore. */
  const options = (grand: boolean) => choix.map(c => {
    const actif = c.valeur === valeur;
    return (
      <button key={c.valeur} type="button" role="menuitemradio" aria-checked={actif}
        disabled={enCours !== null}
        onClick={() => void choisir(c.valeur)}
        data-testid={`${testid}-option-${c.valeur}`}
        className={'w-full inline-flex items-center justify-between gap-2 text-left rounded-lg disabled:opacity-60 '
          + (grand ? 'px-4 py-3 min-h-[44px] text-base' : 'px-3 py-2 text-sm')}
        style={{
          background: actif ? t.tab.activeBg : 'transparent',
          color: actif ? t.accent.text : t.text.primary,
          border: `1px solid ${actif ? t.tab.activeBorder : 'transparent'}`,
        }}>
        {c.libelle}
        {enCours === c.valeur
          ? <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
          : actif ? <Check className="w-4 h-4 shrink-0" /> : null}
      </button>
    );
  });

  const messageErreur = erreur !== '' && (
    <p className="text-xs px-3 py-2 rounded-lg break-words" data-testid={`${testid}-erreur`}
      style={{ background: t.danger.bg, border: `1px solid ${t.danger.border}`, color: t.danger.text }}>
      {erreur}
    </p>
  );

  return (
    <>
      {/* Le bouton de la cellule. `—` et non une case vide : une cellule vide se lit
          comme une colonne cassee, un tiret se lit comme « pas encore renseigne ». */}
      <button ref={bouton} type="button" onClick={ouvrir}
        data-testid={testid}
        aria-haspopup="menu" aria-expanded={ouvert}
        aria-label={`${libelleColonne} de ${nomDossier} : ${libelle === '' ? 'non renseigné' : libelle}. Modifier.`}
        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-sm max-md:min-h-[44px] max-md:w-full max-md:justify-between"
        style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.text.primary }}>
        <span className={libelle === '' ? 'opacity-60' : undefined}>{libelle === '' ? '—' : libelle}</span>
        <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-70" />
      </button>

      {ouvert && createPortal(
        <>
          {/*
            LE VOILE. Sous md il assombrit l'ecran derriere la feuille ; au-dessus il est
            transparent et ne sert qu'a recevoir le clic a cote. Dans les deux cas il
            ferme, et il est le MEME element : deux voiles differents finiraient par
            diverger sur ce qui ferme et ce qui ne ferme pas.
          */}
          <div className="fixed inset-0 z-[65] max-md:backdrop-blur-[1px]"
            style={{ background: 'transparent' }}
            data-testid={`${testid}-voile`}
            onClick={fermer} />

          {/* ---- LA FEUILLE, SOUS md ---- */}
          <div className="fixed inset-x-0 bottom-0 z-[66] md:hidden rounded-t-2xl flex flex-col gap-2 p-3"
            data-testid={`${testid}-feuille`}
            style={{
              background: t.modal.bg,
              borderTop: `1px solid ${t.modal.border}`,
              boxShadow: t.modal.shadow,
              paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))',
            }}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-bold" style={{ color: t.modal.title }}>{libelleColonne}</p>
              <button type="button" onClick={fermer}
                aria-label="Fermer sans changer" title="Fermer sans changer"
                data-testid={`${testid}-fermer`}
                className="inline-flex items-center justify-center rounded-lg p-2 min-h-[44px] min-w-[44px]"
                style={{ background: t.modal.closeBtnBg, color: t.modal.closeBtnText }}>
                <X className="w-5 h-5" />
              </button>
            </div>
            {messageErreur}
            {options(true)}
          </div>

          {/* ---- LE MENU, A PARTIR DE md ---- */}
          <div className="fixed z-[66] hidden md:flex flex-col gap-1 p-1.5 rounded-xl min-w-[11rem]"
            data-testid={`${testid}-menu`}
            role="menu" aria-label={libelleColonne}
            style={{
              /* Place a partir du rectangle du bouton, et ramene dans l'ecran : pres du
                 bord droit, un menu pose a `left` deborderait. */
              left: Math.max(8, Math.min((ancre?.x ?? 0), window.innerWidth - 184)),
              top: (ancre?.y ?? 0) + 4,
              background: t.dropdown.bg,
              border: `1px solid ${t.dropdown.border}`,
              boxShadow: t.dropdown.shadow,
            }}>
            {messageErreur}
            {options(false)}
          </div>
        </>,
        document.body,
      )}
    </>
  );
}
