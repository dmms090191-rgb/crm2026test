import { useState } from 'react';
import { Square, Circle, Minus, Plus, Trash2, Paintbrush, Loader2, Move } from 'lucide-react';
import type { MaskState, MaskTool, MaskMode } from './calquer-logo-types';
import CalquerLogoStrokeColorPicker from './CalquerLogoStrokeColorPicker';

interface Props {
  mask: MaskState;
  moveMode: boolean;
  onMoveModeToggle: () => void;
  onToolChange: (t: MaskTool) => void;
  onModeChange: (m: MaskMode) => void;
  onSizeChange: (v: number) => void;
  onColorChange: (id: string, color: string) => void;
  onApply: () => void;
  onReset: () => void;
  onDeleteSelected: () => void;
  applying: boolean;
}

export default function CalquerLogoMaskPanel({
  mask, moveMode, onMoveModeToggle, onToolChange, onModeChange, onSizeChange,
  onColorChange, onApply, onReset, onDeleteSelected, applying,
}: Props) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const selectedShape = mask.selectedId ? mask.shapes.find(s => s.id === mask.selectedId) : null;
  const currentColor = selectedShape?.color || (selectedShape?.mode === 'garder' ? '#22c55e' : '#ef4444');
  return (
    <div className="w-64 flex-shrink-0 flex flex-col gap-5 p-4 overflow-y-auto border-r"
      style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(15,23,42,0.6)' }}>

      <Section title="Outil de masque">
        <div className="grid grid-cols-3 gap-1.5">
          <ToolButton active={mask.tool === 'rectangle'} onClick={() => onToolChange('rectangle')}
            icon={<Square className="w-4 h-4" />} label="Rectangle" />
          <ToolButton active={mask.tool === 'ellipse'} onClick={() => onToolChange('ellipse')}
            icon={<Circle className="w-4 h-4" />} label="Ellipse" />
          <ToolButton active={mask.tool === 'line'} onClick={() => onToolChange('line')}
            icon={<Minus className="w-4 h-4" />} label="Ligne" />
        </div>
      </Section>

      <Section title="Mode">
        <div className="flex gap-1.5">
          <ModeButton active={mask.mode === 'garder'} onClick={() => onModeChange('garder')}
            color="#10b981" bg="rgba(16,185,129,0.12)" border="rgba(16,185,129,0.35)"
            icon={<Plus className="w-3.5 h-3.5" />} label="Garder" />
          <ModeButton active={mask.mode === 'supprimer'} onClick={() => onModeChange('supprimer')}
            color="#ef4444" bg="rgba(239,68,68,0.12)" border="rgba(239,68,68,0.35)"
            icon={<Trash2 className="w-3.5 h-3.5" />} label="Supprimer" />
        </div>
        <p className="text-[10px] leading-relaxed" style={{ color: 'rgba(148,163,184,0.5)' }}>
          {mask.mode === 'garder'
            ? 'Dessinez sur les zones a conserver dans le logo final.'
            : 'Dessinez sur les zones a supprimer du fond.'}
        </p>
      </Section>

      <Section title="Epaisseur">
        <SliderRow icon={<Paintbrush className="w-3.5 h-3.5" />}
          value={mask.selectedId ? (mask.shapes.find(s => s.id === mask.selectedId)?.size ?? mask.size) : mask.size}
          max={100} onChange={onSizeChange} suffix="px" />
      </Section>

      {mask.selectedId && (
        <Section title="Selection">
          <button onClick={onMoveModeToggle}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150"
            style={{
              background: moveMode ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${moveMode ? 'rgba(59,130,246,0.4)' : 'rgba(255,255,255,0.08)'}`,
              color: moveMode ? '#60a5fa' : 'rgba(226,232,240,0.7)',
            }}>
            <Move className="w-3.5 h-3.5" />
            Deplacer
          </button>
          <div>
            {!showColorPicker ? (
              <button onClick={() => setShowColorPicker(true)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors hover:bg-white/5"
                style={{ border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(226,232,240,0.8)' }}>
                <div className="w-4 h-4 rounded-sm border" style={{ background: currentColor, borderColor: 'rgba(255,255,255,0.15)' }} />
                Couleur du trait
              </button>
            ) : (
              <CalquerLogoStrokeColorPicker color={currentColor}
                onChange={color => onColorChange(selectedShape!.id, color)}
                onClose={() => setShowColorPicker(false)} />
            )}
          </div>
          <button onClick={onDeleteSelected}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors duration-150"
            style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}>
            <Trash2 className="w-3.5 h-3.5" />
            Supprimer la forme
          </button>
        </Section>
      )}

      <Section title="Actions">
        <button onClick={onApply} disabled={mask.shapes.length === 0 || applying}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:enabled:scale-[1.02]"
          style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: '#fff', boxShadow: '0 2px 8px rgba(245,158,11,0.3)' }}>
          {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paintbrush className="w-4 h-4" />}
          {applying ? 'Application...' : 'Appliquer le masque'}
        </button>
        <button onClick={onReset} disabled={mask.shapes.length === 0}
          className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors duration-150 disabled:opacity-40"
          style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(226,232,240,0.5)' }}>
          <Trash2 className="w-3 h-3" />
          Reinitialiser masque
        </button>
        {mask.shapes.length > 0 && (
          <p className="text-[10px] text-center" style={{ color: 'rgba(148,163,184,0.5)' }}>
            {mask.shapes.length} forme{mask.shapes.length > 1 ? 's' : ''} dessinee{mask.shapes.length > 1 ? 's' : ''}
          </p>
        )}
      </Section>

      <div className="mt-auto pt-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <p className="text-[10px] leading-relaxed" style={{ color: 'rgba(148,163,184,0.5)' }}>
          Cliquez et glissez sur le logo pour dessiner. Suppr pour effacer la forme selectionnee.
        </p>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2.5">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(148,163,184,0.6)' }}>{title}</h3>
      {children}
    </div>
  );
}

function ToolButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick}
      className="flex flex-col items-center gap-1 px-2 py-2.5 rounded-lg text-[10px] font-medium transition-all duration-200"
      style={{
        background: active ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${active ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.06)'}`,
        color: active ? '#60a5fa' : 'rgba(226,232,240,0.6)',
      }}>
      {icon}{label}
    </button>
  );
}

function ModeButton({ active, onClick, icon, label, color, bg, border }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; label: string;
  color: string; bg: string; border: string;
}) {
  return (
    <button onClick={onClick}
      className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-lg text-xs font-semibold transition-all duration-200"
      style={{
        background: active ? bg : 'rgba(255,255,255,0.04)',
        border: `1.5px solid ${active ? border : 'rgba(255,255,255,0.08)'}`,
        color: active ? color : 'rgba(226,232,240,0.5)',
      }}>
      {icon}{label}
    </button>
  );
}

function SliderRow({ icon, value, max, onChange, suffix }: {
  icon: React.ReactNode; value: number; max: number; onChange: (v: number) => void; suffix: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span style={{ color: 'rgba(148,163,184,0.8)' }}>{icon}</span>
        <span className="text-xs font-mono tabular-nums px-1.5 py-0.5 rounded"
          style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(226,232,240,0.9)' }}>
          {value}{suffix}
        </span>
      </div>
      <input type="range" min={1} max={max} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{ background: `linear-gradient(to right, #3b82f6 ${(value / max) * 100}%, rgba(255,255,255,0.1) ${(value / max) * 100}%)` }} />
    </div>
  );
}
