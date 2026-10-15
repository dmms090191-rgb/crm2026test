import type { Bande } from './chapitres';
import { opaciteBande } from './chapitres';
import { dit, directionDe, etiquetteLangue, type Langue } from './langue';

/**
 * LES LEGENDES HEBRAIQUES, posees sur le film.
 *
 * ---------- LA LISIBILITE EN QUATRE COUCHES ----------
 *
 * Du texte clair sur une image qui bouge est illisible une image sur dix, et c'est toujours
 * celle-la que le visiteur regarde. Quatre couches s'empilent donc, et aucune ne suffit seule :
 *   1. un voile global, toujours present, qui assombrit les bords ;
 *   2. un voile LOCAL derriere la bande, qui ne s'approfondit que pendant qu'elle est lue ;
 *   3. une vraie ombre portee sur le texte ;
 *   4. un poids et une taille qui tiennent sans aide.
 *
 * ---------- L'HEBREU ----------
 *
 * La direction est portee par l'element lui-meme. On n'inverse jamais une mise en page a la
 * main : on decrit en proprietes logiques et on laisse le navigateur faire. C'est la seule
 * facon d'avoir une page qui marche aussi quand on ajoutera une autre langue.
 *
 * Et les legendes ne sont pas decoupees en lettres. En hebreu, un decoupage caractere par
 * caractere casse les ligatures et peut inverser l'ordre percu : l'animation se fait donc sur
 * la ligne entiere, jamais sur ses lettres.
 *
 * ---------- LE MOUVEMENT REDUIT NE DOIT RIEN RETIRER ----------
 *
 * Premiere version : en mouvement reduit, seule la PREMIERE legende de chaque chapitre etait
 * rendue, les autres etant retirees du DOM quelle que soit la progression. Mesure : 5 des 10
 * textes du recit n'apparaissaient alors JAMAIS, dont l'invitation a saisir sa date et l'appel
 * a prendre rendez-vous. Quelqu'un qui demande moins d'animation demande moins de mouvement,
 * pas moins de contenu — c'est exactement le piege que cette preference tend aux developpeurs.
 *
 * Les legendes sont donc toutes posees, en colonne et non superposees, a taille reduite puisque
 * plusieurs doivent tenir ensemble.
 */

interface Props {
  bandes: readonly Bande[];
  /** Progression du chapitre, de 0 a 1. */
  progression: number;
  /** Le texte est pose d’emblee, sans attendre le defilement. */
  mouvementReduit: boolean;
  /**
   * De 0 a 1 : la legende passe du CENTRE de la scene a son bord HAUT.
   *
   * Quand le panneau de saisie apparait, il occupe le bas de la scene et grandit vers le haut
   * a mesure qu'il affiche son resultat : 304 px pour le formulaire, 374 avec le nombre, 496
   * avec le detail du calcul deplie. Une montee de hauteur FIXE, calee sur le seul formulaire,
   * se faisait donc rattraper des que le panneau grandissait. On ne decale plus d'une distance :
   * on change d'ancrage, et la legende va se poser en haut, ou rien ne peut la rejoindre.
   *
   * Cela reste une fonction pure de la progression, comme tout le reste du voyage.
   */
  montee?: number;
  langue: Langue;
}

export default function BandesTexte({ bandes, progression, mouvementReduit, montee = 0, langue }: Props) {
  return (
    <div
      dir={directionDe(langue)}
      lang={etiquetteLangue(langue)}
      style={{
        position: 'absolute',
        inset: 0,
        display: 'grid',
        placeItems: 'center',
        alignContent: 'center',
        gap: mouvementReduit ? 'clamp(16px, 3.5vh, 36px)' : undefined,
        // Le rail des chapitres occupe le bord de DEBUT : la legende lui laisse la place, sinon
        // elle le traverse (mesure : chapitre 4 en francais, de 320 a 375 px).
        paddingInlineStart: 'clamp(44px, 9vw, 120px)',
        paddingInlineEnd: 'clamp(20px, 7vw, 120px)',
        paddingBlock: mouvementReduit ? 'clamp(24px, 6vh, 64px)' : undefined,
        pointerEvents: 'none',
        textAlign: 'center',
      }}
    >
      {bandes.map((bande, i) => {
        const k = mouvementReduit ? 1 : opaciteBande(progression, bande);
        if (k <= 0.001) return null;
        /*
         * La montee : on translate de quoi amener le HAUT de la legende juste SOUS la barre.
         * Le pourcentage d'un translateY se rapporte a la hauteur de l'element lui-meme, donc
         * la formule s'adapte seule a une legende d'une ou de trois lignes.
         *
         * La reserve etait auparavant un 4vh fixe, soit 32 px : la legende du chapitre 3 se
         * posait alors sur les six boutons de la barre, qui en mesure 134 sur telephone. Elle
         * se cale desormais sur la hauteur REELLE de la barre, repliee ou non.
         */
        const vers = montee > 0 && !mouvementReduit
          ? ` translateY(calc(${-montee} * (50svh - 50% - var(--ih-barre, 4vh) - 12px)))`
          : '';
        return (
          <div
            key={`${bande.titre.he}-${i}`}
            style={{
              gridArea: mouvementReduit ? undefined : '1 / 1',
              opacity: k,
              // Une respiration verticale minuscule : elle donne de la vie sans distraire.
              transform: mouvementReduit ? undefined : `translateY(${(1 - k) * 14}px)${vers}`,
              position: 'relative',
            }}
          >
            {/* Couche 2 : le voile local, qui ne s'approfondit qu'avec la lecture. */}
            <span
              aria-hidden
              style={{
                position: 'absolute',
                inset: '-40% -22%',
                background: 'radial-gradient(ellipse at center, rgba(7,10,22,0.72) 0%, rgba(7,10,22,0.34) 52%, rgba(7,10,22,0) 78%)',
                opacity: 0.3 + 0.7 * k,
                pointerEvents: 'none',
              }}
            />
            <h2
              style={{
                position: 'relative',
                margin: 0,
                fontFamily: '"Frank Ruhl Libre", "David Libre", Georgia, serif',
                fontWeight: 300,
                fontSize: mouvementReduit ? 'clamp(1.5rem, 3.6vw, 2.6rem)' : 'clamp(2rem, 6vw, 4.6rem)',
                lineHeight: 1.18,
                color: '#f4ece0',
                textShadow: '0 2px 30px rgba(7,10,22,0.85), 0 0 90px rgba(7,10,22,0.6)',
                textWrap: 'balance',
              }}
            >
              {dit(bande.titre, langue)}
            </h2>
            {bande.sous && (
              <p
                style={{
                  position: 'relative',
                  margin: '0.7em auto 0',
                  maxWidth: '30ch',
                  fontFamily: '"Heebo", system-ui, sans-serif',
                  fontWeight: 300,
                  fontSize: 'clamp(0.95rem, 1.7vw, 1.2rem)',
                  lineHeight: 1.7,
                  color: 'rgba(238, 231, 219, 0.82)',
                  textShadow: '0 1px 18px rgba(7,10,22,0.9)',
                }}
              >
                {dit(bande.sous, langue)}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
