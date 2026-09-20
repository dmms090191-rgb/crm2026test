/*
 * TALIXY — la planete de la sidebar (image de reference de David).
 *
 * Grand disque de lumiere centre sur le moyeu de la roue : les onglets suivent sa jante. Le disque est
 * fixe (peint une seule fois) ; seules les lunes tournent avec la roue, plus lentement qu'elle (parallaxe),
 * par une rotation CSS (compositeur). Position et rayon : variables --tx-hub-* publiees par la roue
 * (TalixySidebarWheel). Purement decoratif : aucun clic, invisible pour les lecteurs d'ecran.
 */

/** Angles des lunes sur la jante (degres, 0 = a droite du moyeu, sens horaire) et taille (px). */
const MOONS: { angle: number; size: number; tone: 'violet' | 'cyan' | 'rose' }[] = [
  { angle: -52, size: 22, tone: 'violet' },
  { angle: -17, size: 12, tone: 'cyan' },
  { angle: 24, size: 26, tone: 'violet' },
  { angle: 58, size: 14, tone: 'rose' },
];

export default function TalixyPlanet() {
  return (
    <div aria-hidden className="tx-planet-layer">
      <div className="tx-planet" />
      {/* Les lunes s'effacent en bas de la colonne : jamais sous les boutons Reorganiser / Reduire / Deconnexion. */}
      <div className="tx-planet-moons">
        <div className="tx-planet-orbit">
          {MOONS.map(m => (
            <span
              key={m.angle}
              className="tx-planet-moon"
              data-tone={m.tone}
              style={{ '--tx-moon-a': `${m.angle}deg`, '--tx-moon-size': `${m.size}px` } as React.CSSProperties}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
