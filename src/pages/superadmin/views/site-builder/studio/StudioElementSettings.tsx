import { useState } from 'react';
import { Trash2, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import type { ThemeTokens } from '../../../../../lib/themeTokensTypes';
import type { OverlayElement, OverlayButtonConfig, OverlayTextConfig, ElementAlign } from './overlayElementTypes';
import PositionControls from './PositionControls';
import StudioTypographyPicker from './StudioTypographyPicker';

interface Props {
  element: OverlayElement;
  onUpdate: (id: string, partial: Partial<OverlayElement>) => void;
  onRemove: (id: string) => void;
  t: ThemeTokens;
  freeDragId: string | null;
  onToggleFreeDrag: (id: string | null) => void;
}

function AlignButtons({ value, onChange, t }: { value: ElementAlign; onChange: (v: ElementAlign) => void; t: ThemeTokens }) {
  const opts: { id: ElementAlign; icon: typeof AlignLeft }[] = [
    { id: 'left', icon: AlignLeft },
    { id: 'center', icon: AlignCenter },
    { id: 'right', icon: AlignRight },
  ];
  return (
    <div className="flex gap-1">
      {opts.map(o => {
        const active = value === o.id;
        const Icon = o.icon;
        return (
          <button
            key={o.id}
            onClick={() => onChange(o.id)}
            className="flex-1 flex items-center justify-center py-1.5 rounded-lg transition-all"
            style={{
              background: active ? 'rgba(14,165,233,0.1)' : t.surface.secondary,
              border: `1.5px solid ${active ? 'rgba(14,165,233,0.3)' : t.surface.border}`,
              color: active ? '#0ea5e9' : t.text.tertiary,
            }}
          >
            <Icon className="w-3 h-3" />
          </button>
        );
      })}
    </div>
  );
}

function ColorField({ label, value, onChange, t }: { label: string; value: string; onChange: (v: string) => void; t: ThemeTokens }) {
  return (
    <div>
      <label className="text-[9px] font-semibold mb-1 block" style={{ color: t.text.tertiary }}>{label}</label>
      <div className="flex items-center gap-2">
        <div className="relative w-7 h-7 rounded-lg overflow-hidden flex-shrink-0" style={{ border: `1.5px solid ${t.surface.border}` }}>
          <input type="color" value={value} onChange={e => onChange(e.target.value)} className="absolute inset-0 w-full h-full cursor-pointer opacity-0" />
          <div className="w-full h-full" style={{ background: value }} />
        </div>
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="flex-1 px-2 py-1.5 rounded-lg text-[10px] font-mono outline-none"
          style={{ background: t.surface.secondary, border: `1.5px solid ${t.surface.border}`, color: t.text.primary }}
        />
      </div>
    </div>
  );
}

function ButtonSettings({ el, onUpdate, t, freeDragActive, onToggleFreeDrag }: {
  el: OverlayButtonConfig;
  onUpdate: (partial: Partial<OverlayButtonConfig>) => void;
  t: ThemeTokens;
  freeDragActive: boolean;
  onToggleFreeDrag: () => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <label className="text-[9px] font-semibold mb-1 block" style={{ color: t.text.tertiary }}>Texte du bouton</label>
        <input
          type="text"
          value={el.text}
          onChange={e => onUpdate({ text: e.target.value })}
          className="w-full px-2.5 py-2 rounded-lg text-[11px] font-semibold outline-none"
          style={{ background: t.surface.secondary, border: `1.5px solid ${t.surface.border}`, color: t.text.primary }}
        />
      </div>
      <ColorField label="Couleur de fond" value={el.bgColor} onChange={v => onUpdate({ bgColor: v })} t={t} />
      <ColorField label="Couleur du texte" value={el.textColor} onChange={v => onUpdate({ textColor: v })} t={t} />
      <div>
        <label className="text-[9px] font-semibold mb-1 block" style={{ color: t.text.tertiary }}>
          Coins arrondis ({el.borderRadius}px)
        </label>
        <input
          type="range" min={0} max={32} step={1} value={el.borderRadius}
          onChange={e => onUpdate({ borderRadius: Number(e.target.value) })}
          className="w-full h-1.5 accent-sky-500 cursor-pointer"
        />
      </div>
      <div className="pt-2" style={{ borderTop: `1px solid ${t.surface.border}` }}>
        <PositionControls el={el} onUpdate={onUpdate} t={t} freeDragActive={freeDragActive} onToggleFreeDrag={onToggleFreeDrag} />
      </div>
    </div>
  );
}

function TextSettings({ el, onUpdate, t, freeDragActive, onToggleFreeDrag }: {
  el: OverlayTextConfig;
  onUpdate: (partial: Partial<OverlayTextConfig>) => void;
  t: ThemeTokens;
  freeDragActive: boolean;
  onToggleFreeDrag: () => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <label className="text-[9px] font-semibold mb-1 block" style={{ color: t.text.tertiary }}>Titre</label>
        <input
          type="text"
          value={el.text}
          onChange={e => onUpdate({ text: e.target.value })}
          className="w-full px-2.5 py-2 rounded-lg text-[11px] font-semibold outline-none"
          style={{ background: t.surface.secondary, border: `1.5px solid ${t.surface.border}`, color: t.text.primary }}
        />
      </div>
      <ColorField label="Couleur du texte" value={el.textColor} onChange={v => onUpdate({ textColor: v })} t={t} />
      <div>
        <label className="text-[9px] font-semibold mb-1 block" style={{ color: t.text.tertiary }}>
          Taille ({el.fontSize}px)
        </label>
        <input
          type="range" min={12} max={72} step={1} value={el.fontSize}
          onChange={e => onUpdate({ fontSize: Number(e.target.value) })}
          className="w-full h-1.5 accent-sky-500 cursor-pointer"
        />
      </div>
      <div>
        <label className="text-[9px] font-semibold mb-1 block" style={{ color: t.text.tertiary }}>Epaisseur</label>
        <div className="grid grid-cols-3 gap-1">
          {(['400', '600', '700'] as const).map(w => (
            <button
              key={w}
              onClick={() => onUpdate({ fontWeight: w })}
              className="py-1.5 rounded-lg text-[9px] font-semibold transition-all"
              style={{
                background: el.fontWeight === w ? 'rgba(14,165,233,0.1)' : t.surface.secondary,
                border: `1.5px solid ${el.fontWeight === w ? 'rgba(14,165,233,0.3)' : t.surface.border}`,
                color: el.fontWeight === w ? '#0ea5e9' : t.text.tertiary,
                fontWeight: w,
              }}
            >
              {w === '400' ? 'Normal' : w === '600' ? 'Semi' : 'Gras'}
            </button>
          ))}
        </div>
      </div>
      <StudioTypographyPicker value={el.fontFamily || ''} onChange={v => onUpdate({ fontFamily: v })} t={t} />
      <div>
        <label className="text-[9px] font-semibold mb-1 block" style={{ color: t.text.tertiary }}>Alignement texte</label>
        <AlignButtons value={el.align} onChange={v => onUpdate({ align: v })} t={t} />
      </div>

      <div className="pt-2" style={{ borderTop: `1px solid ${t.surface.border}` }}>
        <PositionControls el={el} onUpdate={onUpdate} t={t} freeDragActive={freeDragActive} onToggleFreeDrag={onToggleFreeDrag} />
      </div>
    </div>
  );
}

export default function StudioElementSettings({ element, onUpdate, onRemove, t, freeDragId, onToggleFreeDrag }: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleUpdate = (partial: Partial<OverlayElement>) => onUpdate(element.id, partial);
  const freeDragActive = freeDragId === element.id;

  return (
    <div className="space-y-3">
      {element.type === 'button' && (
        <ButtonSettings
          el={element as OverlayButtonConfig}
          onUpdate={handleUpdate}
          t={t}
          freeDragActive={freeDragActive}
          onToggleFreeDrag={() => onToggleFreeDrag(freeDragActive ? null : element.id)}
        />
      )}
      {element.type === 'text' && (
        <TextSettings
          el={element as OverlayTextConfig}
          onUpdate={handleUpdate}
          t={t}
          freeDragActive={freeDragActive}
          onToggleFreeDrag={() => onToggleFreeDrag(freeDragActive ? null : element.id)}
        />
      )}

      <div className="pt-2" style={{ borderTop: `1px solid ${t.surface.border}` }}>
        {confirmDelete ? (
          <div className="flex gap-2">
            <button
              onClick={() => onRemove(element.id)}
              className="flex-1 py-2 rounded-lg text-[10px] font-bold transition-all"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}
            >
              Confirmer
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="flex-1 py-2 rounded-lg text-[10px] font-semibold transition-all"
              style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.text.secondary }}
            >
              Annuler
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.12)', color: '#ef4444' }}
          >
            <Trash2 className="w-3 h-3" />
            Supprimer
          </button>
        )}
      </div>
    </div>
  );
}
