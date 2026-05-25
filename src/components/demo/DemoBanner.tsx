import { Monitor, Smartphone, X } from 'lucide-react';
import type { DemoDeviceType } from './demoTypes';

interface Props {
  saName: string;
  deviceType?: DemoDeviceType;
  onStop: () => void;
}

export default function DemoBanner({ saName, deviceType, onStop }: Props) {
  const DeviceIcon = deviceType === 'smartphone' ? Smartphone : Monitor;

  return (
    <div
      className="flex items-center justify-between gap-2 px-3 py-2 sm:px-4 sm:py-2.5"
      style={{
        background: 'linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(217,119,6,0.06) 100%)',
        borderBottom: '1px solid rgba(245,158,11,0.2)',
      }}
    >
      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
        <div className="relative flex-shrink-0">
          <div
            className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.25)' }}
          >
            <DeviceIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" style={{ color: '#d97706' }} />
          </div>
          <span
            className="absolute -top-0.5 -right-0.5 w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full border-2"
            style={{ background: '#22c55e', borderColor: 'rgba(245,158,11,0.08)', animation: 'pulse 2s infinite' }}
          />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] sm:text-xs font-bold" style={{ color: '#d97706' }}>
            <span className="sm:hidden">Demo en direct</span>
            <span className="hidden sm:inline">Mode demo en direct</span>
          </p>
          <p className="text-[9px] sm:text-[10px] truncate" style={{ color: '#92400e' }}>
            {saName} vous guide
          </p>
        </div>
      </div>
      <button
        onClick={onStop}
        className="flex items-center gap-1 sm:gap-1.5 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[10px] sm:text-[11px] font-bold transition-all hover:scale-105 flex-shrink-0"
        style={{
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.2)',
          color: '#dc2626',
        }}
      >
        <X className="w-3 h-3" />
        <span className="hidden sm:inline">Arreter</span>
      </button>
    </div>
  );
}
