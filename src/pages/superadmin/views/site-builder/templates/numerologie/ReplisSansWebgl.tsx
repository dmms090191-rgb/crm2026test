import NumerologieHero from './NumerologieHero';

/**
 * CE QUE VOIT UN VISITEUR SANS WEBGL.
 *
 * Pas un message d'erreur : la meme page, sans la scene. Le ciel, l'horizon dore et la lueur
 * du soleil sont rendus en degrades CSS, et le hero est exactement celui de la version 3D —
 * meme composant, donc aucun risque de divergence entre les deux chemins.
 *
 * Le cas est rare mais reel : WebGL desactive par politique d'entreprise, pilote graphique sur
 * liste noire, navigateur en mode econome. Un ecran noir y serait percu comme un site casse.
 */
export default function ReplisSansWebgl({ onDecouvrir }: { onDecouvrir?: () => void }) {
  return (
    <div
      data-testid="numerologie-repli"
      style={{
        position: 'relative',
        width: '100%',
        height: '100svh',
        minHeight: 540,
        overflow: 'hidden',
        // Ciel : nuit profonde au zenith, bleu dense a l'horizon.
        background: 'linear-gradient(to bottom, #040a1b 0%, #071225 42%, #13203b 68%, #1b2a46 100%)',
      }}
    >
      {/* Lueur solaire basse, a droite — la meme direction que le soleil de la scene 3D. */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          left: '62%',
          top: '58%',
          width: 'min(130vw, 1100px)',
          aspectRatio: '1',
          transform: 'translate(-50%, -50%)',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,196,112,0.42) 0%, rgba(255,170,80,0.16) 26%, transparent 62%)',
          filter: 'blur(2px)',
        }}
      />

      {/* Mer de nuages suggeree : deux bandes douces, pas une texture a telecharger. */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 'auto 0 0 0',
          height: '46%',
          background:
            'radial-gradient(120% 100% at 60% 100%, rgba(255,214,160,0.30) 0%, transparent 58%),'
            + 'linear-gradient(to top, rgba(206,216,236,0.34) 0%, rgba(150,168,200,0.14) 38%, transparent 100%)',
        }}
      />

      <NumerologieHero onDecouvrir={() => onDecouvrir?.()} mouvementReduit />
    </div>
  );
}
