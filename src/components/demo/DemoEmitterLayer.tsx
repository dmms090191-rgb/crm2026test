import { useState, useEffect } from 'react';
import { Monitor, Smartphone, X, Loader2, Radio, Send } from 'lucide-react';
import { useDemoSession } from './DemoSessionContext';
import { useDemoEmitter } from './useDemoEmitter';
import DemoControlWidget from './DemoControlWidget';
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
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deviceType, setDeviceType] = useState<DemoDeviceType>('desktop');
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
        const updated = payload.new as { status: string; device_type?: string };
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

  async function handleSendInvitation() {
    if (starting || isEmitting) return;
    setStarting(true);
    await startDemo(targetUserId, targetRole, companyId, deviceType);
    setStarting(false);
    setConfirmOpen(false);
  }

  async function handleCancelInvitation() {
    await stopDemo();
  }

  // --- Rejected toast ---
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

  // --- Idle state: button ---
  if (!isEmitting) {
    return (
      <>
        <button
          onClick={() => setConfirmOpen(true)}
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

        {/* Confirmation modal */}
        {confirmOpen && (
          <div
            className="fixed inset-0 z-[99998] flex items-end sm:items-center justify-center p-0 sm:p-4"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          >
            <div
              className="rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md overflow-hidden"
              style={{
                background: '#1a1a1a',
                border: '1px solid rgba(245,158,11,0.25)',
                animation: 'demoConfirmIn 250ms ease-out',
              }}
            >
              <div className="px-5 py-4 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', boxShadow: '0 0 20px rgba(245,158,11,0.3)' }}
                >
                  <Radio className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Demarrer une demo en direct</p>
                  <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.5)' }}>avec {targetName}</p>
                </div>
              </div>

              <div className="px-5 py-5">
                <p className="text-sm text-white/80 leading-relaxed mb-5">
                  Le client verra votre curseur, vos clics et les pages que vous lui montrez dans Talvex.
                </p>

                <p className="text-[11px] font-bold text-white/60 mb-3 uppercase tracking-wider">Le client regarde sur :</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDeviceType('desktop')}
                    className="flex-1 flex flex-col items-center gap-2 py-4 rounded-xl transition-all"
                    style={{
                      background: deviceType === 'desktop' ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.04)',
                      border: `1.5px solid ${deviceType === 'desktop' ? 'rgba(245,158,11,0.5)' : 'rgba(255,255,255,0.08)'}`,
                    }}
                  >
                    <Monitor className="w-6 h-6" style={{ color: deviceType === 'desktop' ? '#f59e0b' : 'rgba(255,255,255,0.4)' }} />
                    <span className="text-xs font-semibold" style={{ color: deviceType === 'desktop' ? '#f59e0b' : 'rgba(255,255,255,0.5)' }}>
                      Ordinateur
                    </span>
                  </button>
                  <button
                    onClick={() => setDeviceType('smartphone')}
                    className="flex-1 flex flex-col items-center gap-2 py-4 rounded-xl transition-all"
                    style={{
                      background: deviceType === 'smartphone' ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.04)',
                      border: `1.5px solid ${deviceType === 'smartphone' ? 'rgba(245,158,11,0.5)' : 'rgba(255,255,255,0.08)'}`,
                    }}
                  >
                    <Smartphone className="w-6 h-6" style={{ color: deviceType === 'smartphone' ? '#f59e0b' : 'rgba(255,255,255,0.4)' }} />
                    <span className="text-xs font-semibold" style={{ color: deviceType === 'smartphone' ? '#f59e0b' : 'rgba(255,255,255,0.5)' }}>
                      Smartphone
                    </span>
                  </button>
                </div>
              </div>

              <div className="px-5 py-4 flex items-center gap-2" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <button
                  onClick={() => setConfirmOpen(false)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all hover:scale-[1.02] active:scale-95"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}
                >
                  Annuler
                </button>
                <button
                  onClick={handleSendInvitation}
                  disabled={starting}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                  style={{
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    color: '#fff',
                    boxShadow: '0 4px 12px rgba(245,158,11,0.3)',
                  }}
                >
                  {starting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Envoyer l'invitation
                </button>
              </div>
            </div>

            <style>{`
              @keyframes demoConfirmIn {
                0% { opacity: 0; transform: translateY(16px); }
                100% { opacity: 1; transform: translateY(0); }
              }
            `}</style>
          </div>
        )}
      </>
    );
  }

  // --- Pending state: invitation sent ---
  if (session?.status === 'pending') {
    return (
      <>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
            <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: '#f59e0b' }} />
            <span className="text-[11px] font-semibold" style={{ color: '#d97706' }}>Invitation envoyee</span>
          </div>
          <button
            onClick={handleCancelInvitation}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all hover:scale-105"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', color: '#ef4444' }}
          >
            <X className="w-3 h-3" />
            Annuler
          </button>
        </div>
      </>
    );
  }

  // --- Active state: demo is live ---
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
