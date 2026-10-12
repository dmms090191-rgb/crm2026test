/**
 * LE REPERE DE CHAPITRE : six traits, celui du chapitre courant allume.
 *
 * Il est DECORATIF, et c'est pourquoi il est masque aux lecteurs d'ecran. Dans sa premiere
 * version il etait un <nav aria-label="פרקים"> contenant six <span> sans texte : l'arbre ARIA
 * affichait donc un repere de navigation nomme, promettant une liste de chapitres, et vide a
 * l'ouverture. Un repere qui ne mene nulle part fait perdre plus de temps qu'il n'en fait
 * gagner. Le chapitre courant est annonce autrement, par la region vocale de IsraelHayaSite.
 */

interface Props {
  /** Index du chapitre courant. */
  index: number;
  /** Nombre de chapitres. */
  total: number;
}

export default function RailChapitres({ index, total }: Props) {
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        insetInlineStart: 'clamp(12px, 2.5vw, 28px)',
        top: '50%',
        transform: 'translateY(-50%)',
        display: 'grid',
        gap: 10,
        pointerEvents: 'none',
      }}
    >
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          style={{
            width: i === index ? 18 : 10,
            height: 2,
            borderRadius: 2,
            background: i === index ? 'rgba(232,205,147,0.95)' : 'rgba(232,205,147,0.28)',
            transition: 'width 320ms ease, background 320ms ease',
          }}
        />
      ))}
    </div>
  );
}
