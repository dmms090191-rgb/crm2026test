import { useEffect } from 'react';

/**
 * LE HERO — ce qui se lit par-dessus la scene.
 *
 * Il est en HTML et non en texte 3D, pour trois raisons qui comptent : le texte reste net a
 * tous les rapports de pixels, il est selectionnable et lisible par un lecteur d'ecran, et il
 * ne coute pas une police 3D a telecharger. Le texte 3D est reserve aux chiffres, ou la
 * profondeur fait partie du propos.
 *
 * Les polices sont chargees A LA DEMANDE, quand ce template est monte : le reste de Talvex n'a
 * aucune raison de payer deux familles de caracteres. Si le reseau les refuse, les replis
 * declares prennent le relais et la mise en page tient.
 *
 * L'apparition part d'un etat VISIBLE et se termine : aucun element ne reste a opacite nulle en
 * attendant un evenement. Une animation qui ne se declenche pas ne doit jamais pouvoir effacer
 * le contenu.
 */

const POLICES = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500&family=Urbanist:wght@200;300;400&display=swap';

function useGooglePolices() {
  useEffect(() => {
    if (document.querySelector('link[data-numerologie-polices]')) return;
    const lien = document.createElement('link');
    lien.rel = 'stylesheet';
    lien.href = POLICES;
    lien.setAttribute('data-numerologie-polices', '');
    document.head.appendChild(lien);
  }, []);
}

interface Props {
  /** Lance la suite du parcours. */
  onDecouvrir: () => void;
  /** Mouvement reduit : on n'anime pas l'entree. */
  mouvementReduit: boolean;
}

const TITRE = 'Les Mystères de Votre Destin';
const SOUS_TITRE = 'Découvrez votre chemin de vie à travers la numérologie et la symbolique spirituelle juive.';

export default function NumerologieHero({ onDecouvrir, mouvementReduit }: Props) {
  useGooglePolices();
  const anime = !mouvementReduit;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        // Le texte occupe le CIEL, le sanctuaire occupe le sol : les deux ne se disputent
        // jamais la meme bande d'image. Place en bas, le titre passait derriere les colonnes.
        justifyContent: 'flex-start',
        paddingInline: 'clamp(16px, 5vw, 64px)',
        paddingTop: 'clamp(44px, 11vh, 132px)',
        textAlign: 'center',
        pointerEvents: 'none',
        // Voile tres doux en haut : il rend le texte lisible sans assombrir la scene.
        background: 'linear-gradient(to bottom, rgba(4,8,20,0.62) 0%, rgba(4,8,20,0.22) 30%, transparent 58%)',
      }}
    >
      <style>{`
        @keyframes numerologieMontee {
          from { opacity: 0.001; transform: translateY(18px); }
          to   { opacity: 1;     transform: translateY(0); }
        }
        .numerologie-apparait { animation: numerologieMontee 1.5s cubic-bezier(0.16, 0.84, 0.24, 1) both; }
        @media (prefers-reduced-motion: reduce) { .numerologie-apparait { animation: none; } }
      `}</style>

      <p
        className={anime ? 'numerologie-apparait' : undefined}
        style={{
          margin: 0,
          fontFamily: '"Urbanist", system-ui, sans-serif',
          fontWeight: 300,
          fontSize: 'clamp(9px, 1.1vw, 12px)',
          letterSpacing: '0.42em',
          textTransform: 'uppercase',
          color: 'rgba(255, 221, 158, 0.82)',
          animationDelay: '0.1s',
        }}
      >
        Numérologie
      </p>

      <h1
        className={anime ? 'numerologie-apparait' : undefined}
        style={{
          margin: '0.5em 0 0',
          fontFamily: '"Cormorant Garamond", Georgia, serif',
          fontWeight: 300,
          fontSize: 'clamp(2.1rem, 6.4vw, 5.1rem)',
          lineHeight: 1.08,
          letterSpacing: '-0.012em',
          color: '#f7f2e8',
          textWrap: 'balance',
          textShadow: '0 2px 40px rgba(4, 8, 20, 0.6)',
          animationDelay: '0.28s',
        }}
      >
        {TITRE}
      </h1>

      <p
        className={anime ? 'numerologie-apparait' : undefined}
        style={{
          margin: '1.1em 0 0',
          maxWidth: '34ch',
          fontFamily: '"Urbanist", system-ui, sans-serif',
          fontWeight: 300,
          fontSize: 'clamp(0.92rem, 1.5vw, 1.08rem)',
          lineHeight: 1.65,
          color: 'rgba(233, 236, 245, 0.78)',
          animationDelay: '0.46s',
        }}
      >
        {SOUS_TITRE}
      </p>

      <button
        type="button"
        onClick={onDecouvrir}
        className={anime ? 'numerologie-apparait' : undefined}
        data-testid="numerologie-decouvrir"
        style={{
          marginTop: 'clamp(22px, 4vh, 40px)',
          pointerEvents: 'auto',
          cursor: 'pointer',
          padding: '0.95em 2.4em',
          borderRadius: 999,
          border: '1px solid rgba(255, 213, 138, 0.45)',
          background: 'linear-gradient(180deg, rgba(255,221,158,0.16), rgba(255,183,71,0.08))',
          backdropFilter: 'blur(10px)',
          fontFamily: '"Urbanist", system-ui, sans-serif',
          fontWeight: 400,
          fontSize: 'clamp(0.84rem, 1.2vw, 0.95rem)',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: '#ffeccb',
          transition: 'background 220ms ease, border-color 220ms ease, transform 220ms ease',
          animationDelay: '0.64s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'linear-gradient(180deg, rgba(255,221,158,0.26), rgba(255,183,71,0.14))';
          e.currentTarget.style.borderColor = 'rgba(255, 213, 138, 0.72)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'linear-gradient(180deg, rgba(255,221,158,0.16), rgba(255,183,71,0.08))';
          e.currentTarget.style.borderColor = 'rgba(255, 213, 138, 0.45)';
        }}
      >
        Découvrir mes nombres
      </button>
    </div>
  );
}
