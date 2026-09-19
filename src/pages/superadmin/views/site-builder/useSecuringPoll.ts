import { useCallback, useEffect, useRef, useState } from 'react';
import { checkDomainConnection } from '../../../../lib/siteDomainConnect';
import { createSecuringPoller, securingView, type SecuringSnapshot } from '../../../../lib/siteSecuringModel';

export { autoCheckOnOpen, needsSecuring } from '../../../../lib/siteSecuringModel';

/*
 * Etape « Securisation » : verification legere automatique (connect_check) toutes les 20 s, 5 minutes au
 * plus. Toute la cadence vit dans siteSecuringModel (teste sans navigateur) ; ce hook ne fait que la
 * brancher sur de vrais minuteurs, sur la visibilite de l'onglet (pause / reprise) et sur le demontage
 * de l'ecran (arret immediat).
 */
export function useSecuringPoll(companyId: string, domain: string | null, onSecured: () => void) {
  const [snapshot, setSnapshot] = useState<SecuringSnapshot>({ phase: 'idle', last: null });
  const target = useRef({ companyId, domain, onSecured });
  useEffect(() => { target.current = { companyId, domain, onSecured }; });

  const poller = useRef<ReturnType<typeof createSecuringPoller> | null>(null);
  if (poller.current === null) {
    poller.current = createSecuringPoller({
      check: signal => checkDomainConnection(target.current.companyId, target.current.domain ?? '', signal),
      now: () => Date.now(),
      setTimer: (run, ms) => window.setTimeout(run, ms),
      clearTimer: handle => window.clearTimeout(handle as number),
      isHidden: () => document.visibilityState === 'hidden',
      onChange: next => {
        setSnapshot(next);
        if (next.phase === 'done') target.current.onSecured();
      },
    });
  }

  useEffect(() => {
    const current = poller.current!;
    const onVisibility = () => current.setHidden(document.visibilityState === 'hidden');
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      current.dispose();
    };
  }, []);

  // Fonctions stables : utilisables dans les dependances d'un effet sans relancer la verification.
  const start = useCallback((firstCheckMs?: number) => poller.current!.start(firstCheckMs), []);
  const stop = useCallback(() => poller.current!.stop(), []);
  return { snapshot, view: securingView(snapshot), start, stop };
}
