import { Monitor, Smartphone, X } from 'lucide-react';
import type { DemoDeviceType } from './demoTypes';

interface Props {
  status: 'pending' | 'active';
  targetName: string;
  deviceType: DemoDeviceType;
  onStop: () => void;
}

export default function DemoControlWidget({ status, targetName, deviceType, onStop }: Props) {
  if (status !== 'active') return null;

  const DeviceIcon = deviceType === 'smartphone' ? Smartphone : Monitor;
  const deviceLabel = deviceType === 'smartphone' ? 'Smartphone' : 'Ordinateur';

  return (
    <div
      className="fixed bottom-4 right-4 z-[9999] rounded-2xl shadow-2xl overflow-hidden"
      style={{
        background: 'rgba(10,10,10,0.94)',
        border: '1px solid rgba(245,158,11,0.35)',
        backdropFilter: 'blur(16px)',
        minWidth: 260,
        boxShadow: '0 0 30px rgba(245,158,11,0.08), 0 8px 32px rgba(0,0,0,0.4)',
      }}
    >
      <div
        className="flex items-center gap-2 px-4 py-2"
        style={{ background: 'rgba(245,158,11,0.08)', borderBottom: '1px solid rgba(245,158,11,0.15)' }}
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping" style={{ background: '#ef4444' }} />
          <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: '#ef4444' }} />
        </span>
        <span className="text-[10px] font-extrabold tracking-wider uppercase" style={{ color: '#ef4444' }}>Demo en direct</span>
      </div>

      <div className="px-4 py-3">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(245,158,11,0.15)' }}>
            <Monitor className="w-4 h-4" style={{ color: '#f59e0b' }} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-white truncate">{targetName}</p>
            <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.5)' }}>Session active</p>
          </div>
        </div>

        <div className="flex items-center gap-4 mb-3">
          <div className="flex items-center gap-1.5">
            <DeviceIcon className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.5)' }} />
            <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.5)' }}>{deviceLabel}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#22c55e', boxShadow: '0 0 6px rgba(34,197,94,0.5)' }} />
            <span className="text-[10px]" style={{ color: '#22c55e' }}>Connecte</span>
          </div>
        </div>

        <button
          onClick={onStop}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold transition-all hover:scale-[1.02] active:scale-95"
          style={{
            background: 'rgba(239,68,68,0.12)',
            border: '1px solid rgba(239,68,68,0.25)',
            color: '#f87171',
          }}
        >
          <X className="w-3 h-3" />
          Arreter la demo
        </button>
      </div>
    </div>
  );
}
