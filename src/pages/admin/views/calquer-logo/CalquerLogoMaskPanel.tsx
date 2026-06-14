import { Square, Circle, Minus, Plus, Trash2, Paintbrush, Loader2, Lasso, CircleDot, Spline, Hexagon, Eraser } from 'lucide-react';
import type { MaskState, MaskShape, MaskTool, MaskMode } from './calquer-logo-types';
import CalquerLogoShapeSettings from './CalquerLogoShapeSettings';

interface Props {
  mask: MaskState;
  moveMode: boolean;
  onMoveModeToggle: () => void;
  onToolChange: (t: MaskTool) => void;
  onModeChange: (m: MaskMode) => void;
  onSizeChange: (v: number) => void;
  onColorChange: (id: string, color: string) => void;
  onUpdateShape: (id: string, patch: Partial<MaskShape>) => void;
  onDuplicateShape: () => void;
  onApply: () => void;
  onReset: () => void;
  onDeleteSelected: () => void;
  applying: boolean;
}

const TOOL_ICONS: Record<MaskTool, React.ReactNode> = {
  rectangle: <Square className="w-4 h-4" />,
  ellipse: <Circle className="w-4 h-4" />,
  line: <Minus className="w-4 h-4" />,
  lasso: <Lasso className="w-4 h-4" />,
  arc: <CircleDot className="w-4 h-4" />,
  bezier: <Spline className="w-4 h-4" />,
  polygon: <Hexagon className="w-4 h-4" />,
  eraser: <Eraser className="w-4 h-4" />,
};

const TOOL_LABEL: Record<MaskTool, string> = {
  rectangle: 'Rectangle', ellipse: 'Ellipse', line: 'Ligne',
  lasso: 'Lasso', arc: 'Arc', bezier: 'Courbe', polygon: 'Polygone', eraser: 'Gomme',
};

export default function CalquerLogoMaskPanel({
  mask, moveMode, onMoveModeToggle, onToolChange, onModeChange, onSizeChange,
  onColorChange, onUpdateShape, onDuplicateShape, onApply, onReset, onDeleteSelected, applying,
}: Props) {
  const selectedShape = mask.selectedId ? mask.shapes.find(s => s.id === mask.selectedId) : null;

  return (
    <div className="w-64 flex-shrink-0 flex flex-col gap-4 p-4 overflow-y-auto border-r"
      style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(15,23,42,0.6)' }}>

      <Section title="Outil de masque">
        <div className="grid grid-cols-4 gap-1">
          {(['rectangle', 'ellipse', 'line', 'lasso', 'arc', 'bezier', 'polygon', 'eraser'] as MaskTool[]).map(t => (
            <ToolButton key={t} active={mask.tool === t} onClick={() => onToolChange(t)}
              icon={TOOL_ICONS[t]} label={TOOL_LABEL[t]} />
          ))}
        </div>
        {(mask.tool === 'polygon' || mask.tool === 'bezier') && (
          <p className="text-[9px] leading-relaxed mt-1" style={{ color: 'rgba(245,158,11,0.6)' }}>
            Cliquez pour poser des points. Double-clic ou Entree pour terminer.
          </p>
        )}
        {mask.tool === 'lasso' && (
          <p className="text-[9px] leading-relaxed mt-1" style={{ color: 'rgba(245,158,11,0.6)' }}>
            Cliquez et dessinez librement. Relachez pour creer la forme.
          </p>
        )}
      </Section>

      {mask.tool !== 'eraser' && (
        <Section title="Mode">
          <div className="flex gap-1.5">
            <ModeButton active={mask.mode === 'garder'} onClick={() => onModeChange('garder')}
              color="#10b981" bg="rgba(16,185,129,0.12)" border="rgba(16,185,129,0.35)"
              icon={<Plus className="w-3.5 h-3.5" />} label="Garder" />
            <ModeButton active={mask.mode === 'supprimer'} onClick={() => onModeChange('supprimer')}
              color="#ef4444" bg="rgba(239,68,68,0.12)" border="rgba(239,68,68,0.35)"
              icon={<Trash2 className="w-3.5 h-3.5" />} label="Supprimer" />
          </div>
        </Section>
      )}

      {!selectedShape && (
        <Section title="Epaisseur">
          <SliderRow value={mask.size} max={100} onChange={onSizeChange} suffix="px" />
        </Section>
      )}

      {selectedShape && (
        <CalquerLogoShapeSettings
          shape={selectedShape}
          moveMode={moveMode}
          onMoveModeToggle={onMoveModeToggle}
          onUpdate={onUpdateShape}
          onColorChange={onColorChange}
          onDelete={onDeleteSelected}
          onDuplicate={onDuplicateShape}
        />
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

      <div className="mt-auto pt-3 border-t space-y-1.5" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="space-y-1">
          {[
            { key: 'Entree', desc: 'Terminer la forme' },
            { key: 'Echap', desc: 'Annuler la forme en cours' },
            { key: 'Retour arr.', desc: 'Supprimer le dernier point' },
            { key: 'Suppr', desc: 'Supprimer la forme selectionnee' },
          ].map(r => (
            <div key={r.key} className="flex items-center gap-2 text-[10px]" style={{ color: 'rgba(148,163,184,0.5)' }}>
              <kbd className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-mono"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(226,232,240,0.6)' }}>
                {r.key}
              </kbd>
              <span>{r.desc}</span>
            </div>
          ))}
        </div>
        <p className="text-[9px] italic" style={{ color: 'rgba(148,163,184,0.35)' }}>
          Lasso / Gomme : clic appuye, dessiner, relacher.
        </p>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(148,163,184,0.6)' }}>{title}</h3>
      {children}
    </div>
  );
}

function ToolButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick}
      className="flex flex-col items-center gap-0.5 px-1 py-2 rounded-lg text-[9px] font-medium transition-all duration-200"
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
      className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs font-semibold transition-all duration-200"
      style={{
        background: active ? bg : 'rgba(255,255,255,0.04)',
        border: `1.5px solid ${active ? border : 'rgba(255,255,255,0.08)'}`,
        color: active ? color : 'rgba(226,232,240,0.5)',
      }}>
      {icon}{label}
    </button>
  );
}

function SliderRow({ value, max, onChange, suffix }: {
  value: number; max: number; onChange: (v: number) => void; suffix: string;
}) {
  const pct = (value / max) * 100;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Paintbrush className="w-3.5 h-3.5" style={{ color: 'rgba(148,163,184,0.8)' }} />
        <span className="text-xs font-mono tabular-nums px-1.5 py-0.5 rounded"
          style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(226,232,240,0.9)' }}>
          {value}{suffix}
        </span>
      </div>
      <input type="range" min={1} max={max} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{ background: `linear-gradient(to right, #3b82f6 ${pct}%, rgba(255,255,255,0.1) ${pct}%)` }} />
    </div>
  );
}
