/*
 * TALIXY — la fine ligne d'arc de la maquette (decor, aucun clic).
 *
 * Mesures (image 3, 1672x941) : cercle concentrique aux disques, 51 px a leur gauche, trait de 2 px
 * blanc a lueur douce (±6 px), estompe au-dela de ±40 deg de l'apex. Centre et rayon : variables
 * --tx-hub-x/y et --tx-line-r publiees par TalixySidebarWheel sur l'hote [data-tx-scene].
 * Purement decoratif (aria-hidden), peint une fois : aucune animation ici.
 *
 * AUCUN POINT LUMINEUX ICI. Regle de David : 1 compartiment reel = 1 separateur = 1 point sur
 * l'arc. Les seuls points de la courbe sont ceux des separateurs, engendres par la structure
 * reelle des sections dans TalixyArc — jamais des angles ecrits en dur.
 */
export default function TalixyArcLine() {
  return (
    <div aria-hidden className="tx-arcline-layer">
      <div className="tx-arcline" />
    </div>
  );
}
