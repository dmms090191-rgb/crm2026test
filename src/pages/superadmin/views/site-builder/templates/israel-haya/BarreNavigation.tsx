import { useEffect, useRef } from 'react';
import { LANGUES, type Langue } from './langue';
import { textesDe } from './textes';

/**
 * LA BARRE DE NAVIGATION — quatre mots, un choix de langue, et rien d'autre.
 *
 * ---------- TROIS CONTRAINTES QUI ONT DICTE LA FORME ----------
 *
 * 1. ELLE FLOTTE, elle ne pousse pas. Le voyage mesure sa progression sur une piste de 3200vh
 *    (useProgressionVoyage) : un element qui occuperait de la hauteur au-dessus de la zone
 *    changerait la mesure a chaque image. La barre est donc posee en absolu par-dessus, et son
 *    conteneur ne recoit aucun evenement de pointeur — seuls ses boutons en recoivent. La
 *    molette, le glissement sur les anneaux et le defilement tactile passent au travers.
 *
 * 2. DES BOUTONS, JAMAIS DES LIENS. L'apercu du module Sites annule tout <a> dont le href ne
 *    commence pas par #. Une navigation faite en liens serait morte dans le seul environnement
 *    ou le site est visible aujourd'hui. Et le clavier du voyage, qui ecoute la fenetre entiere,
 *    ignore les boutons mais pas les liens : un lien ayant le focus ferait defiler le voyage a
 *    chaque appui sur Espace.
 *
 * 3. AUCUNE PROPRIETE PHYSIQUE. Tout est en proprietes logiques, donc la barre se retourne
 *    d'elle-meme en hebreu. C'est pour cela qu'il n'y a pas une ligne de code de plus pour le
 *    RTL : le navigateur le fait, a condition qu'on ne lui mette pas de left/right dans les pattes.
 *
 * ---------- CE QUI CHANGE SUR TELEPHONE ----------
 *
 * Mesure, sur un ecran de 320 px : la rangee demandait 394 px pour tenir, soit 23 % de trop.
 * Elle se repliait donc en deux et mangeait 134 px — un cinquieme de l'ecran, sur un site dont
 * tout l'interet est une image plein cadre.
 *
 * Deux reponses, et aucune n'enleve quoi que ce soit au visiteur :
 *   - le choix de langue devient UN bouton au lieu de deux, portant le nom de l'AUTRE langue.
 *     C'est une bascule : on lit ou l'on va, pas ou l'on est. 107 px economises ;
 *   - les rembourrages se resserrent sous 480 px.
 * Les quatre entrees restent toutes visibles, en toutes lettres. Aucun menu a ouvrir, aucune
 * icone a deviner.
 *
 * ---------- ET ELLE PUBLIE SA HAUTEUR ----------
 *
 * Le reste du site doit savoir ou elle s'arrete : trois reserves verticales etaient calculees
 * chacune dans son coin, en vh, et ne se parlaient pas. Resultat mesure : le titre de « A
 * propos » entierement cache derriere la barre sur un iPhone SE, et la legende du chapitre 3
 * posee sur les six boutons. La barre ecrit donc sa hauteur REELLE dans `--ih-barre`, et tout
 * ce qui doit passer dessous s'y refere. Une seule verite, mesuree, qui suit les replis.
 */

export type Page = 'accueil' | 'apropos' | 'contact';

interface Props {
  page: Page;
  onPage: (p: Page) => void;
  langue: Langue;
  onLangue: (l: Langue) => void;
  onConnexion: () => void;
  /**
   * Barre PLEINE plutot que voile.
   *
   * Au-dessus du voyage, un simple degrade de nuit suffit : l'image est sombre et la barre doit
   * se faire oublier. Au-dessus des pages de texte, le contenu defile DESSOUS et transparait au
   * travers — mesure a l'ecran : les libelles du formulaire se lisaient a moitie derriere les
   * onglets. Sur ces pages la barre devient donc un vrai bandeau.
   */
  opaque?: boolean;
}

const OR = '#e8cd93';
const CREME = '#f4ece0';

/** Le nom de chaque langue dans SA propre langue : on ne traduit pas un nom de langue. */
const NOM_LANGUE: Record<Langue, string> = { he: 'עברית', fr: 'FR' };

export default function BarreNavigation(
  { page, onPage, langue, onLangue, onConnexion, opaque = false }: Props,
) {
  const T = textesDe(langue).nav;
  const barre = useRef<HTMLDivElement>(null);

  /*
   * La hauteur reelle est publiee sur le PARENT, pas sur <html> : la barre appartient a ce site,
   * et le document est partage avec tout Talvex. Un observateur plutot qu'une mesure au montage,
   * parce que la barre se replie quand la fenetre retrecit et que sa hauteur change alors sans
   * qu'aucun rendu React ne le signale.
   */
  useEffect(() => {
    const el = barre.current;
    const hote = el?.parentElement;
    if (!el || !hote) return;
    const poser = () => hote.style.setProperty('--ih-barre', `${Math.round(el.getBoundingClientRect().height)}px`);
    poser();
    const observateur = new ResizeObserver(poser);
    observateur.observe(el);
    return () => { observateur.disconnect(); hote.style.removeProperty('--ih-barre'); };
  }, []);

  const onglets: { cle: Page; libelle: string }[] = [
    { cle: 'accueil', libelle: T.accueil },
    { cle: 'apropos', libelle: T.apropos },
    { cle: 'contact', libelle: T.contact },
  ];

  /* Sur petit ecran, une seule bascule : elle porte le nom de la langue vers laquelle elle mene. */
  const autre = LANGUES.find(l => l !== langue) ?? langue;

  return (
    <div
      ref={barre}
      data-testid="ih-barre"
      style={{
        position: 'absolute',
        insetInline: 0,
        top: 0,
        zIndex: 20,
        // Le conteneur laisse tout passer ; seuls les boutons attrapent le pointeur.
        pointerEvents: 'none',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 'clamp(4px, 1.6vw, 20px)',
        paddingInline: 'clamp(10px, 3.5vw, 44px)',
        paddingBlock: 'clamp(6px, 1.6vh, 20px)',
        background: opaque
          ? 'rgba(7,10,22,0.94)'
          // Un voile tres leger : la barre reste lisible sur une image claire sans devenir un bloc.
          : 'linear-gradient(to bottom, rgba(7,10,22,0.62), rgba(7,10,22,0))',
        borderBlockEnd: opaque ? '1px solid rgba(232,205,147,0.14)' : 'none',
        backdropFilter: opaque ? 'blur(12px)' : 'none',
        WebkitBackdropFilter: opaque ? 'blur(12px)' : 'none',
        fontFamily: '"Heebo", system-ui, sans-serif',
      }}
    >
      <nav
        aria-label={T.aria}
        style={{
          pointerEvents: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: 'clamp(2px, 1.2vw, 18px)',
        }}
      >
        {onglets.map(o => {
          const actif = o.cle === page;
          return (
            <button
              key={o.cle}
              type="button"
              data-testid={`ih-nav-${o.cle}`}
              aria-current={actif ? 'page' : undefined}
              onClick={() => onPage(o.cle)}
              style={{
                ...lien,
                color: actif ? OR : 'rgba(238,231,219,0.76)',
                // Un trait fin plutot qu'un fond : on reste dans l'univers du site.
                boxShadow: actif ? `inset 0 -1px 0 0 ${OR}` : 'none',
              }}
            >
              {o.libelle}
            </button>
          );
        })}
      </nav>

      <div
        style={{
          pointerEvents: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: 'clamp(4px, 1.2vw, 14px)',
        }}
      >
        {/* Petit ecran : une bascule. A partir de 481 px : les deux langues cote a cote. */}
        <button
          type="button"
          lang={autre}
          data-ih-bascule-langue
          data-testid="ih-langue-bascule"
          data-ih-cible={autre}
          aria-label={T.ariaLangue}
          onClick={() => onLangue(autre)}
          style={{ ...pastille, ...basculeSeule }}
        >
          {NOM_LANGUE[autre]}
        </button>

        <div role="group" aria-label={T.ariaLangue} data-testid="ih-langues" style={groupeLangues}>
          {LANGUES.map(l => {
            const actif = l === langue;
            return (
              <button
                key={l}
                type="button"
                lang={l}
                data-testid={`ih-langue-${l}`}
                aria-pressed={actif}
                onClick={() => onLangue(l)}
                style={{
                  ...pastille,
                  color: actif ? '#1a1304' : 'rgba(238,231,219,0.74)',
                  background: actif ? OR : 'transparent',
                }}
              >
                {NOM_LANGUE[l]}
              </button>
            );
          })}
        </div>

        <button type="button" data-testid="ih-connexion" onClick={onConnexion} style={bouton}>
          {T.connexion}
        </button>
      </div>

      {/* L'anneau de focus est une regle d'etat : un style en ligne ne peut pas en porter.
          Les tailles tactiles vivent ici pour la meme raison — un style en ligne l'emporterait
          sur une regle @media, et la cible ne grandirait jamais. */}
      <style>{`
        [data-testid="ih-barre"] button:focus-visible {
          outline: 2px solid ${OR};
          outline-offset: 2px;
        }
        [data-testid="ih-barre"] button { min-height: 44px; }
        /*
          La propriete display doit vivre ICI et nulle part ailleurs : posee en style en ligne,
          elle l'emporterait sur la regle @media et les DEUX selecteurs s'afficheraient en meme
          temps. C'est le meme piege que pour la taille des pastilles.
        */
        [data-testid="ih-langues"] { display: flex; }
        [data-ih-bascule-langue] { display: none; }
        [data-testid="ih-langues"] button,
        [data-ih-bascule-langue] {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 44px;
        }
        /* Sous 480 px, la bascule seule economise les 107 px qui faisaient replier la barre. */
        @media (max-width: 480px) {
          [data-ih-bascule-langue] { display: inline-flex; }
          [data-testid="ih-langues"] { display: none; }
          [data-testid^="ih-nav-"] { min-width: 44px; }
        }
        @media (min-width: 481px) {
          [data-ih-bascule-langue] { display: none; }
        }
      `}</style>
    </div>
  );
}

/* Hauteur minimale de 44 px partout : c'est la taille d'un doigt, pas une marge de confort. */
const lien: React.CSSProperties = {
  paddingInline: 'clamp(4px, 1.2vw, 12px)',
  paddingBlock: 6,
  border: 'none',
  background: 'transparent',
  fontFamily: 'inherit',
  fontSize: 'clamp(0.8rem, 1.5vw, 0.95rem)',
  fontWeight: 300,
  letterSpacing: '0.01em',
  cursor: 'pointer',
  transition: 'color 240ms ease, box-shadow 240ms ease',
  whiteSpace: 'nowrap',
};

/*
 * La TAILLE des pastilles vit dans la feuille de style ci-dessus, pas ici : un style en ligne
 * l'emporte sur une regle @media, et la cible tactile ne grandissait donc jamais sur telephone.
 */
const pastille: React.CSSProperties = {
  paddingInline: 10,
  borderRadius: 999,
  border: 'none',
  fontFamily: 'inherit',
  fontSize: '0.78rem',
  fontWeight: 400,
  cursor: 'pointer',
  transition: 'background 220ms ease, color 220ms ease',
  whiteSpace: 'nowrap',
};

const basculeSeule: React.CSSProperties = {
  color: 'rgba(238,231,219,0.82)',
  background: 'rgba(10,14,30,0.42)',
  border: '1px solid rgba(232,205,147,0.24)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
};

const groupeLangues: React.CSSProperties = {
  alignItems: 'center',
  gap: 2,
  padding: 2,
  borderRadius: 999,
  border: '1px solid rgba(232,205,147,0.24)',
  background: 'rgba(10,14,30,0.42)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
};

const bouton: React.CSSProperties = {
  paddingInline: 'clamp(10px, 2vw, 20px)',
  paddingBlock: 9,
  borderRadius: 999,
  border: '1px solid rgba(232,205,147,0.46)',
  background: 'linear-gradient(180deg, rgba(232,205,147,0.2), rgba(184,137,60,0.1))',
  color: CREME,
  fontFamily: 'inherit',
  fontSize: 'clamp(0.8rem, 1.5vw, 0.92rem)',
  fontWeight: 400,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};
