import type { Bande } from './chapitres';
import { opaciteBande } from './chapitres';

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
 */

interface Props {
  bandes: readonly Bande[];
  /** Progression du chapitre, de 0 a 1. */
  progression: number;
  /** Le texte est pose d'emblee, sans attendre le defilement. */
  mouvementReduit: boolean;
}

export default function BandesTexte({ bandes, progression, mouvementReduit }: Props) {
  return (
    <div
      dir="rtl"
      lang="he"
      style={{
        position: 'absolute',
        inset: 0,
        display: 'grid',
        placeItems: 'center',
        paddingInline: 'clamp(20px, 7vw, 120px)',
        pointerEvents: 'none',
        textAlign: 'center',
      }}
    >
      {bandes.map((bande, i) => {
        const k = mouvementReduit ? (i === 0 ? 1 : 0) : opaciteBande(progression, bande);
        if (k <= 0.001) return null;
        return (
          <div
            key={`${bande.titre}-${i}`}
            style={{
              gridArea: '1 / 1',
              opacity: k,
              // Une respiration verticale minuscule : elle donne de la vie sans distraire.
              transform: `translateY(${(1 - k) * 14}px)`,
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
                fontSize: 'clamp(2rem, 6vw, 4.6rem)',
                lineHeight: 1.18,
                color: '#f4ece0',
                textShadow: '0 2px 30px rgba(7,10,22,0.85), 0 0 90px rgba(7,10,22,0.6)',
                textWrap: 'balance',
              }}
            >
              {bande.titre}
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
                {bande.sous}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
