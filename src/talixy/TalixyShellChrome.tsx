import { useContext, useEffect, useState } from 'react';
import { TimezoneContext } from '../contexts/TimezoneContext';
import { useEditorModeSafe } from '../contexts/EditorModeContext';
import { getCurrentTime } from '../lib/timezone';
import { useTalixy } from './useTalixy';

/*
 * TALIXY — habillage flottant de la coquille (maquette) : slogan « VOS IDEES PRENNENT VIE ICI »
 * en haut a droite avec sa fine ligne lumineuse, heure | date en bas a gauche, et l'accroche
 * « Construisons demain, ensemble. » en bas a droite. Purement decoratif (aucun clic), toujours
 * au-dessus du fond et sous les fenetres. L'heure suit le fuseau deja choisi par la personne
 * (TimezoneContext) ; l'horloge de la barre du haut, qui ouvre le reglage, reste en place.
 */

/** « Vendredi 19 septembre 2026 » : jour de la semaine + date longue, premiere lettre en majuscule. */
function talixyLongDate(tz: string, now = new Date()): string {
  const s = now.toLocaleDateString('fr-FR', { timeZone: tz, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function TalixyShellChrome() {
  const talixy = useTalixy();
  const editorCtx = useEditorModeSafe();
  const tzCtx = useContext(TimezoneContext);
  const tz = tzCtx?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(tick);
  }, []);

  if (!talixy.active || editorCtx?.editorOpen) return null;
  return (
    <div aria-hidden className="tx-chrome" data-testid="talixy-chrome">
      <div className="tx-slogan">
        Vos idées<br />prennent vie<br />ici
        <div className="tx-slogan-line" />
      </div>
      <div className="tx-clock">
        <span>{getCurrentTime(tz)}</span>
        <span className="tx-clock-sep" />
        <span className="tx-clock-date">{talixyLongDate(tz, now)}</span>
      </div>
      <div className="tx-baseline">Construisons demain, ensemble.</div>
    </div>
  );
}
