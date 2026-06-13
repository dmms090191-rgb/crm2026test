import { Eye, EyeOff, RefreshCw, Copy } from 'lucide-react';
import { resolveZoneBg, type EditorZone, type ZoneBackground } from '../../contexts/EditorModeContext';
import { useThemeTokens } from '../../hooks/useThemeTokens';

const ZONE_LABELS: Record<EditorZone, string> = {
  zone1: 'Zone 1',
  zone2: 'Zone 2',
  zone3: 'Zone 3',
  zone4: 'Zone 4',
};

interface Props {
  zoneOverrides: Partial<Record<EditorZone, ZoneBackground | null>>;
  isEditing: boolean;
  mode: 'new' | 'update' | 'copy';
  setMode: (m: 'new' | 'update' | 'copy') => void;
  name: string;
  setName: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  status: 'visible' | 'hidden';
  setStatus: (v: 'visible' | 'hidden') => void;
  error: string;
  setError: (v: string) => void;
  success: boolean;
  t: ReturnType<typeof useThemeTokens>;
}

export default function SaveThemeFormFields({
  zoneOverrides,
  isEditing,
  mode,
  setMode,
  name,
  setName,
  description,
  setDescription,
  status,
  setStatus,
  error,
  setError,
  success,
  t,
}: Props) {
  return (
    <div className="px-6 py-5 flex flex-col gap-4">
      <div className="flex gap-2">
        {(['zone1', 'zone2', 'zone3', 'zone4'] as EditorZone[]).map(z => {
          const override = zoneOverrides[z];
          return (
            <div key={z} className="flex flex-col items-center gap-1 flex-1">
              <div
                className="w-full h-8 rounded-lg border"
                style={{
                  background: override ? resolveZoneBg(override) : t.surface.secondary,
                  borderColor: override ? 'rgba(255,255,255,0.15)' : t.surface.border,
                }}
              />
              <span className="text-[9px]" style={{ color: t.label.muted }}>{ZONE_LABELS[z]}</span>
            </div>
          );
        })}
      </div>

      {isEditing && (
        <div className="flex gap-2">
          <button
            onClick={() => setMode('update')}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-semibold transition-all"
            style={{
              background: mode === 'update' ? 'rgba(59,130,246,0.12)' : 'transparent',
              color: mode === 'update' ? '#60a5fa' : t.label.muted,
              border: mode === 'update' ? '1px solid rgba(59,130,246,0.25)' : `1px solid ${t.surface.border}`,
            }}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Mettre a jour ce theme
          </button>
          <button
            onClick={() => setMode('copy')}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-semibold transition-all"
            style={{
              background: mode === 'copy' ? 'rgba(52,211,153,0.12)' : 'transparent',
              color: mode === 'copy' ? '#34d399' : t.label.muted,
              border: mode === 'copy' ? '1px solid rgba(52,211,153,0.25)' : `1px solid ${t.surface.border}`,
            }}
          >
            <Copy className="w-3.5 h-3.5" />
            Enregistrer comme nouveau
          </button>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold" style={{ color: t.modal.fieldLabel }}>Nom du theme</label>
        <input
          value={name}
          onChange={e => { setName(e.target.value); setError(''); }}
          placeholder="Ex: Bleu Premium Talvex"
          className="px-3 py-2 rounded-xl text-sm outline-none"
          style={{
            background: t.input.bg,
            border: `1px solid ${t.input.border}`,
            color: t.input.text,
          }}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold" style={{ color: t.modal.fieldLabel }}>
          Description <span className="font-normal" style={{ color: t.label.hint }}>(optionnel)</span>
        </label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Une courte description..."
          rows={2}
          className="px-3 py-2 rounded-xl text-sm resize-none outline-none"
          style={{
            background: t.input.bg,
            border: `1px solid ${t.input.border}`,
            color: t.input.text,
          }}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold" style={{ color: t.modal.fieldLabel }}>Statut</label>
        <div className="flex gap-2">
          <button
            onClick={() => setStatus('visible')}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all"
            style={{
              background: status === 'visible' ? t.success.bg : 'transparent',
              color: status === 'visible' ? t.success.text : t.label.muted,
              border: `1px solid ${status === 'visible' ? t.success.border : t.surface.border}`,
            }}
          >
            <Eye className="w-3.5 h-3.5" />
            Visible
          </button>
          <button
            onClick={() => setStatus('hidden')}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all"
            style={{
              background: status === 'hidden' ? t.warning.bg : 'transparent',
              color: status === 'hidden' ? t.warning.text : t.label.muted,
              border: `1px solid ${status === 'hidden' ? t.warning.border : t.surface.border}`,
            }}
          >
            <EyeOff className="w-3.5 h-3.5" />
            Brouillon
          </button>
        </div>
      </div>

      {error && (
        <p className="text-xs px-3 py-2 rounded-xl" style={{ background: t.danger.bg, color: t.danger.text, border: `1px solid ${t.danger.border}` }}>
          {error}
        </p>
      )}

      {success && (
        <p className="text-xs px-3 py-2 rounded-xl" style={{ background: t.success.bg, color: t.success.text, border: `1px solid ${t.success.border}` }}>
          {mode === 'update' ? 'Theme mis a jour !' : 'Theme enregistre dans Themes personnalises !'}
        </p>
      )}
    </div>
  );
}
