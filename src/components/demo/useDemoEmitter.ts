import { useEffect, useRef, useCallback } from 'react';
import { useDemoSessionSafe } from './DemoSessionContext';

export function useDemoEmitter(activeView: string, viewLabel?: string) {
  const ctx = useDemoSessionSafe();
  const lastEmit = useRef(0);
  const rafId = useRef(0);
  const pendingPos = useRef<{ xPercent: number; yPercent: number } | null>(null);

  const emit = useCallback((_event: string, payload: Record<string, unknown>) => {
    if (!ctx?.channel || !ctx.session || ctx.session.status !== 'active') return;
    ctx.channel.send({ type: 'broadcast', event: 'demo_event', payload });
  }, [ctx]);

  // Cursor move with RAF throttle (~30fps)
  useEffect(() => {
    if (!ctx?.session || ctx.session.status !== 'active') return;

    function onMouseMove(e: MouseEvent) {
      pendingPos.current = {
        xPercent: e.clientX / window.innerWidth,
        yPercent: e.clientY / window.innerHeight,
      };
      if (!rafId.current) {
        rafId.current = requestAnimationFrame(() => {
          const now = Date.now();
          if (now - lastEmit.current >= 33 && pendingPos.current) {
            emit('demo_event', { type: 'cursor_move', ...pendingPos.current });
            lastEmit.current = now;
          }
          rafId.current = 0;
        });
      }
    }

    function onClick(e: MouseEvent) {
      emit('demo_event', {
        type: 'cursor_click',
        xPercent: e.clientX / window.innerWidth,
        yPercent: e.clientY / window.innerHeight,
      });
    }

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('click', onClick, true);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('click', onClick, true);
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [ctx?.session?.status, emit]);

  // View change broadcast
  const prevView = useRef(activeView);
  useEffect(() => {
    if (activeView !== prevView.current) {
      prevView.current = activeView;
      emit('demo_event', { type: 'view_change', view: activeView, label: viewLabel || activeView });
    }
  }, [activeView, viewLabel, emit]);
}
