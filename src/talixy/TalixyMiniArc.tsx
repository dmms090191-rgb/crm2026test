import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { ecartCirculaire, type MobileNavItem } from './useTalixyMobileNav';

/*
 * TALIXY MOBILE — le mini double arc, fixe en bas de l'ecran.
 *
 * Il remplace le grand arc vertical sous 768 px, et NE DECIDE DE RIEN : il recoit la vraie liste
 * d'onglets (tiree de layout.visible) et le compartiment deja resolu. Renommer, masquer ou
 * reorganiser sur le bureau se voit ici sans toucher a ce fichier.
 *
 *   arc EXTERIEUR : les onglets, poses sur la courbe, plus une fleche de chaque cote ;
 *   arc INTERIEUR : le compartiment ACTIF, et lui seul. Il se fond en sortant, apparait en entrant.
 *
 * ---------- UNE VRAIE ROUE, SANS COTE VIDE ----------
 *
 * Tous les onglets sont rendus, et chacun est place par son ecart CIRCULAIRE a l'actif :
 *
 *     delta = ((i - actif + n/2 + n) mod n) - n/2        ->  dans [-n/2, n/2[
 *
 * L'actif est donc toujours au sommet, avec autant de voisins a gauche qu'a droite, y compris sur
 * le premier et le dernier onglet : apres Systeme vient Dashboard, avant Dashboard vient Systeme.
 * L'arc n'a plus jamais de cote vide.
 *
 * Le rebouclage ne se voit pas : un onglet passe de +n/2 a -n/2 (ou l'inverse) alors qu'il est
 * DEJA invisible — l'opacite tombe a zero bien avant, a 2,2 crans du sommet. Il glisse d'un bout
 * a l'autre sans etre vu, et la rotation reste continue. Meme principe que l'arc du bureau.
 *
 * Aucun doublon metier : ces positions pointent toutes vers le meme onglet reel, par son id.
 */

interface Props {
  items: MobileNavItem[];
  activeIndex: number;
  compartiment: string;
  icons: Record<string, React.ReactNode>;
  onSelect: (id: string) => void;
  onStep: (pas: -1 | 1) => void;
}

/** Au-dela de cet ecart, un onglet est invisible et non cliquable : c'est la zone de rebouclage. */
const PORTEE = 2.2;

export default function TalixyMiniArc({ items, activeIndex, compartiment, icons, onSelect, onStep }: Props) {
  const [largeur, setLargeur] = useState(() => (typeof window === 'undefined' ? 390 : window.innerWidth));
  useEffect(() => {
    const surResize = () => setLargeur(window.innerWidth);
    window.addEventListener('resize', surResize);
    return () => window.removeEventListener('resize', surResize);
  }, []);

  /*
   * Le nom du compartiment ne doit pas sauter d'un mot a l'autre : on garde l'ancien le temps de
   * le faire disparaitre, puis on affiche le nouveau. Une seule valeur visible a la fois.
   */
  const [affiche, setAffiche] = useState(compartiment);
  const [visible, setVisible] = useState(true);
  const precedent = useRef(compartiment);
  useEffect(() => {
    if (compartiment === precedent.current) return;
    precedent.current = compartiment;
    setVisible(false);
    const t = window.setTimeout(() => { setAffiche(compartiment); setVisible(true); }, 180);
    return () => window.clearTimeout(t);
  }, [compartiment]);

  /*
   * La place a reserver sous le contenu n est pas devinee : on MESURE la hauteur reelle de l arc
   * et on la publie. La page s en sert pour son padding bas — plus aucune carte ne passe derriere.
   * Meme lecon que la reserve verticale de l arc du bureau, ou une constante choisie au juge avait
   * fait tomber la navigation a trois onglets.
   */
  const racine = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = racine.current;
    if (!el) return;
    const publier = () => document.documentElement.style.setProperty('--tx-miniarc-h', `${el.offsetHeight}px`);
    publier();
    const ro = new ResizeObserver(publier);
    ro.observe(el);
    return () => {
      ro.disconnect();
      document.documentElement.style.removeProperty('--tx-miniarc-h');
    };
  }, []);

  if (items.length === 0 || activeIndex < 0) return null;

  const n = items.length;
  const W = Math.max(280, largeur);
  // Rayon : assez grand pour une courbe franche, assez petit pour ne pas manger l'ecran.
  const R = Math.max(240, W * 0.92);
  const pasDeg = Math.min(15, (W * 0.13) / ((R * Math.PI) / 180));
  const hauteurArc = 96;
  const apexY = 30;

  const ecart = (i: number) => ecartCirculaire(i, activeIndex, n);

  return (
    <nav ref={racine} data-tx-miniarc aria-label="Navigation Talixy" style={{ height: hauteurArc + 78 }}>
      <svg data-tx-miniarc-courbe width={W} height={hauteurArc + 40} viewBox={`0 0 ${W} ${hauteurArc + 40}`} aria-hidden>
        <path d={courbe(W, R, apexY, 1)} fill="none" strokeWidth="1.4" />
        <path d={courbe(W, R * 1.34, apexY + 52, 0.62)} fill="none" strokeWidth="1" opacity="0.55" />
      </svg>

      <div data-tx-miniarc-slots style={{ height: hauteurArc }}>
        {items.map((item, i) => {
          const d = ecart(i);
          const th = (d * pasDeg * Math.PI) / 180;
          const x = W / 2 + R * Math.sin(th);
          const y = apexY + R * (1 - Math.cos(th));
          const dans = Math.abs(d) <= PORTEE;
          const actif = i === activeIndex;
          return (
            <button
              key={item.id}
              type="button"
              data-tx-miniarc-tab
              data-tx-active={actif ? '' : undefined}
              aria-current={actif ? 'page' : undefined}
              aria-label={item.label}
              aria-hidden={dans ? undefined : true}
              tabIndex={dans ? 0 : -1}
              title={item.label}
              onClick={() => onSelect(item.id)}
              style={{
                transform: `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%)`,
                opacity: dans ? Math.max(0.3, 1 - Math.abs(d) * 0.26) : 0,
                pointerEvents: dans ? 'auto' : 'none',
              }}
            >
              <span data-tx-miniarc-icon>{icons[item.id] ?? null}</span>
            </button>
          );
        })}
      </div>

      <button type="button" data-tx-miniarc-prev aria-label="Onglet precedent" onClick={() => onStep(-1)}>
        <ArrowLeft />
      </button>
      <button type="button" data-tx-miniarc-next aria-label="Onglet suivant" onClick={() => onStep(1)}>
        <ArrowRight />
      </button>

      <div data-tx-miniarc-compartiment aria-live="polite" style={{ opacity: visible ? 1 : 0 }}>
        {affiche}
      </div>
    </nav>
  );
}

/** Trace l'arc : un morceau de cercle centre sous l'ecran, sommet au milieu. */
function courbe(W: number, R: number, apexY: number, etendue: number): string {
  const cx = W / 2;
  const cy = apexY + R;
  const demiAngle = Math.min(Math.PI / 2.4, Math.asin(Math.min(1, W / 2 / R)) * etendue);
  const pts: string[] = [];
  const n = 40;
  for (let i = 0; i <= n; i++) {
    const th = -demiAngle + (2 * demiAngle * i) / n;
    pts.push(`${(cx + R * Math.sin(th)).toFixed(1)} ${(cy - R * Math.cos(th)).toFixed(1)}`);
  }
  return `M${pts.join('L')}`;
}
