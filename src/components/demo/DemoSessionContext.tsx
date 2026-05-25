import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import type { DemoSession, DemoDeviceType } from './demoTypes';
import { createDemoSession, updateDemoSessionStatus, getActiveDemoForSA } from './demoApi';
import { supabase } from '../../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface DemoContextValue {
  session: DemoSession | null;
  isEmitting: boolean;
  channel: RealtimeChannel | null;
  startDemo: (targetUserId: string, targetRole: 'admin' | 'vendor' | 'client', companyId: string | null, deviceType?: DemoDeviceType) => Promise<void>;
  stopDemo: () => Promise<void>;
  setSession: (s: DemoSession | null) => void;
  setChannel: (ch: RealtimeChannel | null) => void;
}

const DemoContext = createContext<DemoContextValue | null>(null);

export function useDemoSession() {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error('useDemoSession must be used inside DemoSessionProvider');
  return ctx;
}

export function useDemoSessionSafe() {
  return useContext(DemoContext);
}

interface Props {
  children: React.ReactNode;
  saUserId?: string;
  saDisplayName?: string;
}

export function DemoSessionProvider({ children, saUserId, saDisplayName }: Props) {
  const [session, setSession] = useState<DemoSession | null>(null);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => { channelRef.current = channel; }, [channel]);

  useEffect(() => {
    if (!saUserId) return;
    getActiveDemoForSA(saUserId).then(s => {
      if (s && (s.status === 'pending' || s.status === 'active')) setSession(s);
    });
  }, [saUserId]);

  const startDemo = useCallback(async (
    targetUserId: string,
    targetRole: 'admin' | 'vendor' | 'client',
    companyId: string | null,
    deviceType: DemoDeviceType = 'desktop',
  ) => {
    if (!saUserId) return;
    const s = await createDemoSession(saUserId, targetUserId, targetRole, companyId, saDisplayName || 'Support Talvex', deviceType);
    if (s) {
      setSession(s);
      const ch = supabase.channel(`demo-${s.id}`);
      ch.subscribe();
      setChannel(ch);
      channelRef.current = ch;
    }
  }, [saUserId, saDisplayName]);

  const stopDemo = useCallback(async () => {
    if (channelRef.current) {
      channelRef.current.send({ type: 'broadcast', event: 'demo_event', payload: { type: 'demo_end' } });
      await new Promise(r => setTimeout(r, 100));
      supabase.removeChannel(channelRef.current);
      setChannel(null);
      channelRef.current = null;
    }
    if (session) {
      await updateDemoSessionStatus(session.id, 'ended');
      setSession(null);
    }
  }, [session]);

  const isEmitting = !!session && (session.status === 'active' || session.status === 'pending');

  return (
    <DemoContext.Provider value={{ session, isEmitting, channel, startDemo, stopDemo, setSession, setChannel }}>
      {children}
    </DemoContext.Provider>
  );
}
