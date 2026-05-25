import { useState, useEffect } from 'react';
import { X, Loader2, Radio } from 'lucide-react';
import { useDemoSession } from './DemoSessionContext';
import { useDemoEmitter } from './useDemoEmitter';
import DemoControlWidget from './DemoControlWidget';
import DemoDeviceSelectorModal from './DemoDeviceSelectorModal';
import { supabase } from '../../lib/supabase';
import type { DemoDeviceType } from './demoTypes';

interface Props {
  activeView: string;
  viewLabel?: string;
  targetUserId: string;
  targetRole: 'admin' | 'vendor' | 'client';
  targetName: string;
  companyId: string | null;
  tokens: {
    accent: { bg: string; border: string; text: string };
  };
}

export default function DemoEmitterLayer({ activeView, viewLabel, targetUserId, targetRole, targetName, companyId }: Props) {
  const { session, isEmitting, startDemo, stopDemo, setSession, setChannel } = useDemoSession();
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  const [rejected, setRejected] = useState(false);

  useDemoEmitter(activeView, viewLabel);

  useEffect(() => {
    if (!session) return;
    const ch = supabase
      .channel(`demo-status-${session.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'demo_sessions',
        filter: `id=eq.${session.id}`,
      }, (payload) => {
        const updated = payload.new as { status: string };
        if (updated.status === 'active' && session.status === 'pending') {
          setSession({ ...session, status: 'active', started_at: new Date().toISOString() });
          const broadcastCh = supabase.channel(`demo-${session.id}`);
          broadcastCh.subscribe();
          setChannel(broadcastCh);
        } else if (updated.status === 'rejected') {
          setSession(null);
          setChannel(null);
          setRejected(true);
          setTimeout(() => setRejected(false), 3000);
        } else if (updated.status === 'ended') {
          setSession(null);
          setChannel(null);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [session?.id, session?.status]);

  async function handleDeviceSelected(device: DemoDeviceType) {
    if (starting || isEmitting) return;
    setStarting(true);
    await startDemo(targetUserId, targetRole, companyId, device);
    setStarting(false);
    setSelectorOpen(false);
  }

  if (rejected) {
    return (
      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-semibold"
        style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}
      >
        <X className="w-3 h-3" />
        Invitation refusee
      </div>
    );
  }

  if (!isEmitting) {
    return (
      <>
        <button
          onClick={() => setSelectorOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all hover:scale-105"
          style={{
            background: 'rgba(245,158,11,0.12)',
            border: '1px solid rgba(245,158,11,0.25)',
            color: '#d97706',
          }}
        >
          <Radio className="w-3.5 h-3.5" />
          Demarrer demo en direct
        </button>

        {selectorOpen && (
          <DemoDeviceSelectorModal
            targetName={targetName}
            onSelect={handleDeviceSelected}
            onClose={() => setSelectorOpen(false)}
          />
        )}
      </>
    );
  }

  if (session?.status === 'pending') {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
          {starting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: '#f59e0b' }} />
          ) : (
            <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: '#f59e0b' }} />
          )}
          <span className="text-[11px] font-semibold" style={{ color: '#d97706' }}>Invitation envoyee</span>
        </div>
        <button
          onClick={stopDemo}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all hover:scale-105"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', color: '#ef4444' }}
        >
          <X className="w-3 h-3" />
          Annuler
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <div
          className="flex items-center gap-1.5 px-2 py-1 rounded-md"
          style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.25)' }}
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping" style={{ background: '#ef4444' }} />
            <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: '#ef4444' }} />
          </span>
          <span className="text-[10px] font-extrabold tracking-wider uppercase" style={{ color: '#ef4444' }}>Live</span>
        </div>
        <span className="text-[11px] font-semibold hidden sm:inline" style={{ color: '#f59e0b' }}>
          Demo active avec {targetName}
        </span>
        <button
          onClick={stopDemo}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all hover:scale-105"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#dc2626' }}
        >
          <X className="w-3 h-3" />
          <span className="hidden sm:inline">Arreter la demo</span>
          <span className="sm:hidden">Stop</span>
        </button>
      </div>
      <DemoControlWidget
        status="active"
        targetName={targetName}
        deviceType={session?.device_type || 'desktop'}
        onStop={stopDemo}
      />
    </>
  );
}
