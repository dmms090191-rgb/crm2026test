import { Move, Trash2, Copy, Lock, Unlock, RotateCw } from 'lucide-react';
import type { MaskShape } from './calquer-logo-types';
import CalquerLogoStrokeColorPicker from './CalquerLogoStrokeColorPicker';
import { useState } from 'react';

interface Props {
  shape: MaskShape;
  moveMode: boolean;
  onMoveModeToggle: () => void;
  onUpdate: (id: string, patch: Partial<MaskShape>) => void;
  onColorChange: (id: string, color: string) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

export default function CalquerLogoShapeSettings({
  shape, moveMode, onMoveModeToggle, onUpdate, onColorChange, onDelete, onDuplicate,
}: Props) {
  const [showColor, setShowColor] = useState(false);
  const color = shape.color || (shape.mode === 'garder' ? '#22c55e' : '#ef4444');

  return (
    <div className="space-y-3">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(148,163,184,0.6)' }}>
        Forme selectionnee
      </h3>

      <div className="grid grid-cols-2 gap-1.5">
        <SmallBtn active={moveMode} onClick={onMoveModeToggle} icon={<Move className="w-3 h-3" />} label="Deplacer" disabled={shape.locked} />
        <SmallBtn onClick={onDuplicate} icon={<Copy className="w-3 h-3" />} label="Dupliquer" />
        <SmallBtn onClick={() => onUpdate(shape.id, { locked: !shape.locked })}
          icon={shape.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
          label={shape.locked ? 'Verrouille' : 'Verrouiller'} active={shape.locked} />
        <SmallBtn onClick={onDelete} icon={<Trash2 className="w-3 h-3" />} label="Supprimer" danger />
      </div>

      <Row label="Mode">
        <div className="flex gap-1">
          <MiniBtn active={shape.mode === 'garder'} onClick={() => onUpdate(shape.id, { mode: 'garder' })} label="Garder" color="#10b981" />
          <MiniBtn active={shape.mode === 'supprimer'} onClick={() => onUpdate(shape.id, { mode: 'supprimer' })} label="Supprimer" color="#ef4444" />
        </div>
      </Row>

      <Row label="Rendu">
        <div className="flex gap-1">
          <MiniBtn active={shape.fillMode === 'stroke'} onClick={() => onUpdate(shape.id, { fillMode: 'stroke' })} label="Contour" />
          <MiniBtn active={shape.fillMode === 'fill'} onClick={() => onUpdate(shape.id, { fillMode: 'fill' })} label="Rempli" />
        </div>
      </Row>

      <Row label="Couleur">
        {!showColor ? (
          <button onClick={() => setShowColor(true)}
            className="flex items-center gap-2 px-2 py-1 rounded-md text-[10px] transition-colors hover:bg-white/5"
            style={{ border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(226,232,240,0.8)' }}>
            <div className="w-3 h-3 rounded-sm" style={{ background: color, border: '1px solid rgba(255,255,255,0.15)' }} />
            {color}
          </button>
        ) : (
          <CalquerLogoStrokeColorPicker color={color}
            onChange={c => onColorChange(shape.id, c)} onClose={() => setShowColor(false)} />
        )}
      </Row>

      <Slider label="Epaisseur" value={shape.size} min={1} max={100} suffix="px"
        onChange={v => onUpdate(shape.id, { size: v })} />

      <Slider label="Opacite" value={shape.opacity} min={0} max={100} suffix="%"
        onChange={v => onUpdate(shape.id, { opacity: v })} />

      <Slider label="Rotation" value={shape.rotation} min={-180} max={180} suffix="deg"
        icon={<RotateCw className="w-3 h-3" />}
        onChange={v => onUpdate(shape.id, { rotation: v })} />

      <div className="grid grid-cols-2 gap-1.5">
        <NumField label="X" value={Math.round(shape.x)} onChange={v => onUpdate(shape.id, { x: v })} />
        <NumField label="Y" value={Math.round(shape.y)} onChange={v => onUpdate(shape.id, { y: v })} />
      </div>

      <ToolSpecificSettings shape={shape} onUpdate={onUpdate} />
    </div>
  );
}

function ToolSpecificSettings({ shape, onUpdate }: { shape: MaskShape; onUpdate: (id: string, p: Partial<MaskShape>) => void }) {
  if (shape.tool === 'rectangle') {
    return (
      <>
        <div className="grid grid-cols-2 gap-1.5">
          <NumField label="Largeur" value={Math.round(shape.w)} onChange={v => onUpdate(shape.id, { w: v })} />
          <NumField label="Hauteur" value={Math.round(shape.h)} onChange={v => onUpdate(shape.id, { h: v })} />
        </div>
        <Slider label="Coins arrondis" value={shape.cornerRadius ?? 0} min={0} max={100} suffix="px"
          onChange={v => onUpdate(shape.id, { cornerRadius: v })} />
      </>
    );
  }
  if (shape.tool === 'ellipse') {
    return (
      <div className="grid grid-cols-2 gap-1.5">
        <NumField label="Largeur" value={Math.round(shape.w)} onChange={v => onUpdate(shape.id, { w: v })} />
        <NumField label="Hauteur" value={Math.round(shape.h)} onChange={v => onUpdate(shape.id, { h: v })} />
      </div>
    );
  }
  if (shape.tool === 'arc') {
    return (
      <>
        <div className="grid grid-cols-2 gap-1.5">
          <NumField label="Largeur" value={Math.round(shape.w)} onChange={v => onUpdate(shape.id, { w: v })} />
          <NumField label="Hauteur" value={Math.round(shape.h)} onChange={v => onUpdate(shape.id, { h: v })} />
        </div>
        <Slider label="Debut arc" value={shape.arcStart ?? 0} min={0} max={360} suffix="deg"
          onChange={v => onUpdate(shape.id, { arcStart: v })} />
        <Slider label="Fin arc" value={shape.arcEnd ?? 180} min={0} max={360} suffix="deg"
          onChange={v => onUpdate(shape.id, { arcEnd: v })} />
      </>
    );
  }
  if (shape.tool === 'line') {
    return (
      <NumField label="Longueur" value={Math.round(Math.sqrt(shape.w * shape.w + shape.h * shape.h))}
        onChange={() => {}} />
    );
  }
  return null;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <span className="text-[10px] font-medium" style={{ color: 'rgba(148,163,184,0.5)' }}>{label}</span>
      {children}
    </div>
  );
}

function SmallBtn({ active, onClick, icon, label, danger, disabled }: {
  active?: boolean; onClick: () => void; icon: React.ReactNode; label: string; danger?: boolean; disabled?: boolean;
}) {
  const bg = danger ? 'rgba(239,68,68,0.1)' : active ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.04)';
  const border = danger ? 'rgba(239,68,68,0.25)' : active ? 'rgba(59,130,246,0.4)' : 'rgba(255,255,255,0.08)';
  const color = danger ? '#f87171' : active ? '#60a5fa' : 'rgba(226,232,240,0.7)';
  return (
    <button onClick={onClick} disabled={disabled}
      className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[10px] font-medium transition-all disabled:opacity-40"
      style={{ background: bg, border: `1px solid ${border}`, color }}>{icon}{label}</button>
  );
}

function MiniBtn({ active, onClick, label, color, danger }: {
  active: boolean; onClick: () => void; label: string; color?: string; danger?: boolean;
}) {
  const c = color || (danger ? '#ef4444' : '#60a5fa');
  return (
    <button onClick={onClick}
      className="flex-1 px-2 py-1 rounded text-[10px] font-semibold transition-all"
      style={{
        background: active ? `${c}20` : 'rgba(255,255,255,0.04)',
        border: `1px solid ${active ? `${c}50` : 'rgba(255,255,255,0.08)'}`,
        color: active ? c : 'rgba(226,232,240,0.5)',
      }}>{label}</button>
  );
}

function Slider({ label, value, min, max, suffix, onChange, icon }: {
  label: string; value: number; min: number; max: number; suffix: string;
  onChange: (v: number) => void; icon?: React.ReactNode;
}) {
  const pct = max === min ? 0 : ((value - min) / (max - min)) * 100;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {icon && <span style={{ color: 'rgba(148,163,184,0.5)' }}>{icon}</span>}
          <span className="text-[10px] font-medium" style={{ color: 'rgba(148,163,184,0.5)' }}>{label}</span>
        </div>
        <span className="text-[10px] font-mono tabular-nums px-1 py-0.5 rounded"
          style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(226,232,240,0.9)' }}>{value}{suffix}</span>
      </div>
      <input type="range" min={min} max={max} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1 rounded-full appearance-none cursor-pointer"
        style={{ background: `linear-gradient(to right, #3b82f6 ${pct}%, rgba(255,255,255,0.1) ${pct}%)` }} />
    </div>
  );
}

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-0.5">
      <span className="text-[9px] font-medium" style={{ color: 'rgba(148,163,184,0.4)' }}>{label}</span>
      <input type="number" value={value} onChange={e => onChange(Number(e.target.value))}
        className="w-full px-2 py-1 rounded-md text-[11px] font-mono bg-transparent outline-none"
        style={{ border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(226,232,240,0.9)' }} />
    </div>
  );
}
