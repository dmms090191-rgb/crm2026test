import { Monitor, Smartphone, X } from 'lucide-react';
import type { DemoDeviceType } from './demoTypes';

interface Props {
  targetName: string;
  onSelect: (device: DemoDeviceType) => void;
  onClose: () => void;
}

export default function DemoDeviceSelectorModal({ targetName, onSelect, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div
        className="relative w-full max-w-md rounded-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, #1a1a2e 0%, #16213e 100%)',
          border: '1px solid rgba(245,158,11,0.2)',
          boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 0 40px rgba(245,158,11,0.08)',
        }}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h3 className="text-sm font-bold text-white">
            Le client regarde sur quel appareil ?
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg transition-colors hover:bg-white/10"
          >
            <X className="w-4 h-4 text-white/50" />
          </button>
        </div>

        <p className="px-5 text-xs text-white/50 mb-4">
          Selectionnez le type d'appareil que <span className="text-amber-400 font-medium">{targetName}</span> utilise actuellement.
        </p>

        <div className="px-5 pb-5 grid grid-cols-2 gap-3">
          <button
            onClick={() => onSelect('desktop')}
            className="group flex flex-col items-center gap-3 p-5 rounded-xl transition-all duration-200"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(245,158,11,0.12)';
              e.currentTarget.style.borderColor = 'rgba(245,158,11,0.3)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
            }}
          >
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(59,130,246,0.15)' }}
            >
              <Monitor className="w-7 h-7 text-blue-400" />
            </div>
            <div className="text-center">
              <p className="text-xs font-semibold text-white">Ordinateur</p>
              <p className="text-[10px] text-white/40 mt-0.5">PC / Mac</p>
            </div>
          </button>

          <button
            onClick={() => onSelect('smartphone')}
            className="group flex flex-col items-center gap-3 p-5 rounded-xl transition-all duration-200"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(245,158,11,0.12)';
              e.currentTarget.style.borderColor = 'rgba(245,158,11,0.3)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
            }}
          >
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(16,185,129,0.15)' }}
            >
              <Smartphone className="w-7 h-7 text-emerald-400" />
            </div>
            <div className="text-center">
              <p className="text-xs font-semibold text-white">Smartphone</p>
              <p className="text-[10px] text-white/40 mt-0.5">Mobile / Tablette</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
