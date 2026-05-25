import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import type { DemoSession, DemoBroadcastEvent } from './demoTypes';
import { updateDemoSessionStatus } from './demoApi';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface ReceiverState {
  pendingInvite: DemoSession | null;
  activeSession: DemoSession | null;
  cursor: { xPercent: number; yPercent: number } | null;
  clickRipple: { xPercent: number; yPercent: number; id: number } | null;
  remoteView: string | null;
  remoteViewLabel: string | null;
  acceptInvite: () => Promise<void>;
  rejectInvite: () => Promise<void>;
  endSession: () => Promise<void>;
}

export function useDemoReceiver(userId: string | null, onViewChange?: (view: string) => void): ReceiverState {
  const [pendingInvite, setPendingInvite] = useState<DemoSession | null>(null);
  const [activeSession, setActiveSession] = useState<DemoSession | null>(null);
  const [cursor, setCursor] = useState<{ xPercent: number; yPercent: number } | null>(null);
  const [clickRipple, setClickRipple] = useState<{ xPercent: number; yPercent: number; id: number } | null>(null);
  const [remoteView, setRemoteView] = useState<string | null>(null);
  const [remoteViewLabel, setRemoteViewLabel] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const rippleCounter = useRef(0);

  // Listen for new invitations via postgres_changes
  useEffect(() => {
    if (!userId) return;

    const ch = supabase
      .channel('demo-invitations')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'demo_sessions',
        filter: `target_user_id=eq.${userId}`,
      }, (payload) => {
        const session = payload.new as DemoSession;
        if (session.status === 'pending') setPendingInvite(session);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'demo_sessions',
        filter: `target_user_id=eq.${userId}`,
      }, (payload) => {
        const session = payload.new as DemoSession;
        if (session.status === 'ended') {
          cleanup();
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [userId]);

  function cleanup() {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    setActiveSession(null);
    setPendingInvite(null);
    setCursor(null);
    setClickRipple(null);
    setRemoteView(null);
    setRemoteViewLabel(null);
  }

  function joinBroadcast(session: DemoSession) {
    const ch = supabase.channel(`demo-${session.id}`);
    ch.on('broadcast', { event: 'demo_event' }, ({ payload }) => {
      const evt = payload as DemoBroadcastEvent;
      switch (evt.type) {
        case 'cursor_move':
          setCursor({ xPercent: evt.xPercent, yPercent: evt.yPercent });
          break;
        case 'cursor_click':
          setCursor({ xPercent: evt.xPercent, yPercent: evt.yPercent });
          setClickRipple({ xPercent: evt.xPercent, yPercent: evt.yPercent, id: ++rippleCounter.current });
          break;
        case 'view_change':
          setRemoteView(evt.view);
          setRemoteViewLabel(evt.label || evt.view);
          onViewChange?.(evt.view);
          break;
        case 'demo_end':
          cleanup();
          break;
      }
    });
    ch.subscribe();
    channelRef.current = ch;
  }

  const acceptInvite = useCallback(async () => {
    if (!pendingInvite) return;
    await updateDemoSessionStatus(pendingInvite.id, 'active');
    const updated = { ...pendingInvite, status: 'active' as const, started_at: new Date().toISOString() };
    setActiveSession(updated);
    setPendingInvite(null);
    joinBroadcast(updated);
  }, [pendingInvite]);

  const rejectInvite = useCallback(async () => {
    if (!pendingInvite) return;
    await updateDemoSessionStatus(pendingInvite.id, 'rejected');
    setPendingInvite(null);
  }, [pendingInvite]);

  const endSession = useCallback(async () => {
    if (!activeSession) return;
    await updateDemoSessionStatus(activeSession.id, 'ended');
    cleanup();
  }, [activeSession]);

  return { pendingInvite, activeSession, cursor, clickRipple, remoteView, remoteViewLabel, acceptInvite, rejectInvite, endSession };
}
