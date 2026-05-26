import { useState, useRef } from 'react';
import {
  Check, Layers, Upload, ChevronDown, ChevronUp, Trash2, Pencil, Loader2,
  Sun, Moon, Palette, SlidersHorizontal, Eye, Droplets, ImagePlus,
} from 'lucide-react';
import { DEFAULT_GLASS_CONFIG, type GlassConfig } from '../../contexts/ThemeContext';
import { useGlassPresets, type GlassPreset } from '../../hooks/useGlassPresets';

const ACCENT_PRESETS = ['#f97316', '#22d3ee', '#3b82f6', '#34d399', '#f43f5e', '#eab308', '#ec4899', '#06b6d4'];
const BLUR_OPTIONS: { value: GlassConfig['blur']; label: string }[] = [
  { value: 'low', label: 'Faible' }, { value: 'medium', label: 'Moyen' }, { value: 'high', label: 'Fort' },
];
const TRANSPARENCY_OPTIONS: { value: GlassConfig['cardTransparency']; label: string }[] = [
  { value: 'low', label: 'Faible' }, { value: 'medium', label: 'Moyenne' }, { value: 'high', label: 'Forte' },
];

interface Props {
  currentGlassConfig: GlassConfig;
  isGlassActive: boolean;
  onApply: (config: GlassConfig) => void;
}

export default function GlassPresetsGrid({ currentGlassConfig, isGlassActive, onApply }: Props) {
  const { presets, loading, upload, updatePreset, deletePreset, rename } = useGlassPresets();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Omit<GlassConfig, 'imageUrl'>>>({});
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = '';
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) { setUploadError('Format : JPG, PNG ou WebP'); return; }
    if (file.size > 5 * 1024 * 1024) { setUploadError('Max 5 Mo'); return; }
    setUploadError('');
    setUploading(true);
    const preset = await upload(file);
    setUploading(false);
    if (!preset) { setUploadError('Erreur lors de l\'upload'); return; }
    setExpandedId(preset.id);
  }

  function getDraft(preset: GlassPreset): Omit<GlassConfig, 'imageUrl'> {
    return drafts[preset.id] ?? preset.config;
  }

  function updateDraft(presetId: string, partial: Partial<Omit<GlassConfig, 'imageUrl'>>) {
    setDrafts(prev => {
      const current = prev[presetId] ?? presets.find(p => p.id === presetId)?.config ?? DEFAULT_GLASS_CONFIG;
      return { ...prev, [presetId]: { ...current, ...partial } };
    });
  }

  function handleApply(preset: GlassPreset) {
    const draft = getDraft(preset);
    updatePreset(preset.id, { config: draft });
    onApply({ ...draft, imageUrl: preset.image_public_url });
  }

  async function handleDelete(preset: GlassPreset) {
    setDeletingId(preset.id);
    await deletePreset(preset);
    if (expandedId === preset.id) setExpandedId(null);
    setDeletingId(null);
  }

  function handleRenameSubmit(preset: GlassPreset) {
    if (renameVal.trim() && renameVal.trim() !== preset.name) rename(preset.id, renameVal.trim());
    setRenamingId(null);
  }

  function isPresetActive(preset: GlassPreset) {
    return isGlassActive && currentGlassConfig.imageUrl === preset.image_public_url;
  }

  return (
    <div>
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleUpload} />

      <button
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="w-full flex items-center justify-center gap-3 px-5 py-4 rounded-2xl text-sm font-bold transition-all hover:-translate-y-0.5 active:scale-[0.99] mb-5"
        style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.10), rgba(59,130,246,0.04))', border: '2px dashed rgba(59,130,246,0.30)', color: '#60a5fa', boxShadow: '0 4px 20px rgba(59,130,246,0.06)' }}
      >
        {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
        {uploading ? 'Envoi en cours...' : 'Uploader une photo'}
      </button>

      {uploadError && <p className="text-[11px] font-bold text-red-400 mb-3 -mt-2">{uploadError}</p>}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-white/20" /></div>
      ) : presets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <ImagePlus className="w-10 h-10 text-white/10" />
          <p className="text-sm font-medium text-white/25">Uploadez votre premiere photo pour creer un preset Glass</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {presets.map(preset => {
            const active = isPresetActive(preset);
            const expanded = expandedId === preset.id;
            const draft = getDraft(preset);
            const accent = draft.accentColor;
            return (
              <div key={preset.id} className="ts-card rounded-2xl overflow-hidden transition-all duration-300" style={{ background: active ? `linear-gradient(165deg, ${accent}12, ${accent}06)` : 'rgba(255,255,255,0.025)', border: active ? `1.5px solid ${accent}60` : '1px solid rgba(255,255,255,0.06)', boxShadow: active ? `0 0 0 1px ${accent}15, 0 12px 40px ${accent}12` : '0 2px 8px rgba(0,0,0,0.15)' }}>
                <PresetImagePreview preset={preset} draft={draft} active={active} accent={accent} />
                <PresetFooter
                  preset={preset} active={active} accent={accent} expanded={expanded}
                  renamingId={renamingId} renameVal={renameVal} deletingId={deletingId}
                  onToggleExpand={() => setExpandedId(expanded ? null : preset.id)}
                  onStartRename={() => { setRenamingId(preset.id); setRenameVal(preset.name); }}
                  onRenameChange={setRenameVal}
                  onRenameSubmit={() => handleRenameSubmit(preset)}
                  onCancelRename={() => setRenamingId(null)}
                  onDelete={() => handleDelete(preset)}
                />
                {expanded && (
                  <PresetSettings
                    draft={draft} accent={accent}
                    onUpdate={partial => updateDraft(preset.id, partial)}
                    onApply={() => handleApply(preset)}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PresetImagePreview({ preset, draft, active, accent }: { preset: GlassPreset; draft: Omit<GlassConfig, 'imageUrl'>; active: boolean; accent: string }) {
  return (
    <div className="relative aspect-[16/10] overflow-hidden group">
      <img src={preset.image_public_url} alt={preset.name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" style={{ filter: `blur(${draft.backgroundBlur ?? 3}px) brightness(${draft.brightness ?? 0.55}) saturate(${draft.saturation ?? 0.6})`, transform: 'scale(1.05)' }} loading="lazy" />
      {(draft.overlayOpacity ?? 0.65) > 0.01 && (
        <div className="absolute inset-0" style={{ background: draft.overlayMode === 'dark' ? `rgba(5,5,18,${draft.overlayOpacity ?? 0.65})` : `rgba(230,232,240,${draft.overlayOpacity ?? 0.65})` }} />
      )}
      <div className="absolute inset-0 flex pointer-events-none">
        <div className="w-[22%] h-full p-1.5" style={{ background: 'rgba(15,15,30,0.50)', backdropFilter: 'blur(8px)', borderRight: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="mt-2 space-y-1.5">
            {[0.6, 0.5, 0.7, 0.4].map((w, i) => (
              <div key={i} className="h-1 rounded-full" style={{ width: `${w * 100}%`, background: i === 0 ? accent : 'rgba(255,255,255,0.18)' }} />
            ))}
          </div>
        </div>
        <div className="flex-1 p-2">
          <div className="h-2 rounded-md mb-1.5" style={{ background: 'rgba(15,15,30,0.40)' }} />
          <div className="grid grid-cols-2 gap-1">
            {[accent, '#34d399'].map((c, i) => (
              <div key={i} className="rounded p-1" style={{ background: 'rgba(15,15,30,0.40)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="h-0.5 w-[40%] rounded-full mb-0.5" style={{ background: 'rgba(255,255,255,0.15)' }} />
                <div className="h-2 rounded" style={{ background: `${c}25` }} />
              </div>
            ))}
          </div>
        </div>
      </div>
      {active && (
        <div className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full flex items-center justify-center z-10" style={{ background: accent, boxShadow: `0 2px 12px ${accent}50` }}>
          <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
        </div>
      )}
      <div className="absolute top-2.5 left-2.5 flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider z-10" style={{ background: 'rgba(0,0,0,0.50)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.70)' }}>
        <Layers className="w-2.5 h-2.5" />Glass
      </div>
    </div>
  );
}

function PresetFooter({ preset, active, accent, expanded, renamingId, renameVal, deletingId, onToggleExpand, onStartRename, onRenameChange, onRenameSubmit, onCancelRename, onDelete }: {
  preset: GlassPreset; active: boolean; accent: string; expanded: boolean;
  renamingId: string | null; renameVal: string; deletingId: string | null;
  onToggleExpand: () => void; onStartRename: () => void; onRenameChange: (v: string) => void;
  onRenameSubmit: () => void; onCancelRename: () => void; onDelete: () => void;
}) {
  return (
    <div className="p-3 flex items-center gap-2">
      <div className="flex-1 min-w-0">
        {renamingId === preset.id ? (
          <input autoFocus value={renameVal} onChange={e => onRenameChange(e.target.value)} onBlur={onRenameSubmit} onKeyDown={e => { if (e.key === 'Enter') onRenameSubmit(); if (e.key === 'Escape') onCancelRename(); }} className="text-xs font-bold bg-transparent outline-none w-full text-white/90 border-b border-blue-400/40 pb-0.5" />
        ) : (
          <p className="text-xs font-bold truncate" style={{ color: active ? accent : 'rgba(255,255,255,0.85)' }}>{preset.name}</p>
        )}
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button onClick={onStartRename} className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-white/[0.06]" title="Renommer"><Pencil className="w-3 h-3 text-white/30 hover:text-white/60" /></button>
        <button onClick={onDelete} disabled={deletingId === preset.id} className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-red-500/10" title="Supprimer">
          {deletingId === preset.id ? <Loader2 className="w-3 h-3 animate-spin text-white/30" /> : <Trash2 className="w-3 h-3 text-red-400/60 hover:text-red-400" />}
        </button>
        <button onClick={onToggleExpand} className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-white/[0.06]" title="Reglages">
          {expanded ? <ChevronUp className="w-3.5 h-3.5 text-white/40" /> : <ChevronDown className="w-3.5 h-3.5 text-white/40" />}
        </button>
      </div>
    </div>
  );
}

function PresetSettings({ draft, accent, onUpdate, onApply }: {
  draft: Omit<GlassConfig, 'imageUrl'>; accent: string;
  onUpdate: (partial: Partial<Omit<GlassConfig, 'imageUrl'>>) => void; onApply: () => void;
}) {
  return (
    <div className="px-3 pb-4 space-y-4 border-t border-white/[0.06] pt-3">
      <Section icon={<SlidersHorizontal className="w-3.5 h-3.5" />} title="Reglages image">
        <Slider label="Flou du fond" value={draft.backgroundBlur ?? 3} min={0} max={16} step={1} accent={accent} onChange={v => onUpdate({ backgroundBlur: v })} />
        <Slider label="Luminosite" value={draft.brightness ?? 0.55} min={0.2} max={1} step={0.05} accent={accent} onChange={v => onUpdate({ brightness: v })} />
        <Slider label="Saturation" value={draft.saturation ?? 0.6} min={0} max={1.2} step={0.05} accent={accent} onChange={v => onUpdate({ saturation: v })} />
      </Section>
      <Section icon={<Eye className="w-3.5 h-3.5" />} title="Overlay">
        <Slider label="Opacite overlay" value={draft.overlayOpacity ?? 0.65} min={0} max={1} step={0.05} accent={accent} onChange={v => onUpdate({ overlayOpacity: v })} />
        <div className="flex gap-1.5 mt-1.5">
          <Pill label="Sombre" icon={<Moon className="w-2.5 h-2.5" />} active={draft.overlayMode === 'dark'} accent={accent} onClick={() => onUpdate({ overlayMode: 'dark' })} />
          <Pill label="Clair" icon={<Sun className="w-2.5 h-2.5" />} active={draft.overlayMode === 'light'} accent={accent} onClick={() => onUpdate({ overlayMode: 'light' })} />
        </div>
      </Section>
      <Section icon={<Eye className="w-3.5 h-3.5" />} title="Transparence cartes">
        <div className="flex gap-1.5">
          {TRANSPARENCY_OPTIONS.map(opt => <Pill key={opt.value} label={opt.label} active={draft.cardTransparency === opt.value} accent={accent} onClick={() => onUpdate({ cardTransparency: opt.value })} />)}
        </div>
      </Section>
      <Section icon={<Droplets className="w-3.5 h-3.5" />} title="Blur surfaces">
        <div className="flex gap-1.5">
          {BLUR_OPTIONS.map(opt => <Pill key={opt.value} label={opt.label} active={draft.blur === opt.value} accent={accent} onClick={() => onUpdate({ blur: opt.value })} />)}
        </div>
      </Section>
      <Section icon={<Palette className="w-3.5 h-3.5" />} title="Couleur accent">
        <div className="flex flex-wrap gap-2">
          {ACCENT_PRESETS.map(color => (
            <button key={color} onClick={() => onUpdate({ accentColor: color })} className="w-6 h-6 rounded-full transition-all hover:scale-110 flex items-center justify-center" style={{ background: color, boxShadow: draft.accentColor === color ? `0 0 0 2px #111, 0 0 0 3.5px ${color}` : `0 1px 4px ${color}30` }}>
              {draft.accentColor === color && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
            </button>
          ))}
        </div>
      </Section>
      <button onClick={onApply} className="w-full py-2.5 rounded-xl text-xs font-bold text-white transition-all hover:scale-[1.01] active:scale-[0.99]" style={{ background: accent, boxShadow: `0 4px 16px ${accent}35` }}>
        Appliquer ce preset
      </button>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-white/30">{icon}</span>
        <span className="text-[10px] font-bold text-white/50">{title}</span>
      </div>
      {children}
    </div>
  );
}

function Slider({ label, value, min, max, step, accent, onChange }: {
  label: string; value: number; min: number; max: number; step: number; accent: string; onChange: (v: number) => void;
}) {
  const pct = Math.round(((value - min) / (max - min)) * 100);
  return (
    <div className="mb-1.5">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[9px] font-semibold text-white/35">{label}</span>
        <span className="text-[9px] font-bold tabular-nums" style={{ color: accent }}>{pct}%</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(parseFloat(e.target.value))} className="w-full h-1 rounded-full appearance-none cursor-pointer" style={{ background: `linear-gradient(90deg, ${accent} ${pct}%, rgba(255,255,255,0.08) ${pct}%)` }} />
    </div>
  );
}

function Pill({ label, active, accent, onClick, icon }: {
  label: string; active: boolean; accent: string; onClick: () => void; icon?: React.ReactNode;
}) {
  return (
    <button onClick={onClick} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all" style={{ background: active ? `${accent}18` : 'rgba(255,255,255,0.04)', border: active ? `1px solid ${accent}40` : '1px solid rgba(255,255,255,0.06)', color: active ? accent : 'rgba(255,255,255,0.35)' }}>
      {icon}{label}
    </button>
  );
}
