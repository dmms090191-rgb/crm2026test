import { Upload, ZoomIn, ZoomOut, RotateCcw, Layers, Eye, Wand2, ArrowLeftRight, Download, Loader2, Monitor, Columns2 as Columns } from 'lucide-react';
import type { CleanMethod } from './calquer-logo-types';
import CalquerLogoMethodPicker from './CalquerLogoMethodPicker';

interface Props {
  onUpload: () => void;
  hasImage: boolean;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  hasOverlay: boolean;
  onAddPage: () => void;
  opacity: number;
  onOpacityChange: (v: number) => void;
  onTransform: () => void;
  hasTransformed: boolean;
  showTransformed: boolean;
  onToggleView: () => void;
  onResetTransform: () => void;
  onDownloadPng: () => void;
  transforming: boolean;
  splitView: boolean;
  onToggleSplitView: () => void;
  cleanMethod: CleanMethod;
  onMethodChange: (m: CleanMethod) => void;
}

export default function CalquerLogoToolbar({
  onUpload, hasImage, zoom, onZoomIn, onZoomOut, onZoomReset,
  hasOverlay, onAddPage, opacity, onOpacityChange,
  onTransform, hasTransformed, showTransformed, onToggleView, onResetTransform, onDownloadPng, transforming,
  splitView, onToggleSplitView, cleanMethod, onMethodChange,
}: Props) {
  const opacityPct = Math.round(opacity * 100);
  const methodChosen = cleanMethod !== 'none';

  return (
    <div className="w-64 flex-shrink-0 flex flex-col gap-5 p-4 overflow-y-auto border-r"
      style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(15,23,42,0.6)' }}>

      <Section title="Image de reference">
        <button onClick={onUpload}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-[1.02]"
          style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: '#fff', boxShadow: '0 2px 8px rgba(59,130,246,0.3)' }}>
          <Upload className="w-4 h-4" />
          {hasImage ? 'Changer le logo' : 'Uploader un logo'}
        </button>
      </Section>

      {hasImage && (
        <CalquerLogoMethodPicker active={cleanMethod} onChange={onMethodChange} />
      )}

      {hasImage && methodChosen && cleanMethod === 'rapide' && (
        <Section title="Nettoyage rapide">
          <button onClick={onTransform} disabled={transforming}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed hover:enabled:scale-[1.02]"
            style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: '#fff', boxShadow: '0 2px 8px rgba(245,158,11,0.3)' }}>
            {transforming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            {transforming ? 'Transformation...' : 'Nettoyage rapide'}
          </button>
        </Section>
      )}

      {hasImage && methodChosen && cleanMethod === 'manuel' && (
        <Section title="Mode manuel">
          <div className="px-3 py-2.5 rounded-lg text-xs leading-relaxed"
            style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', color: 'rgba(147,197,253,0.9)' }}>
            Mode manuel active : utilisez l'onglet <strong>Masque</strong> pour corriger les zones a garder ou supprimer.
          </div>
        </Section>
      )}

      {hasTransformed && methodChosen && (
        <TransformSection
          splitView={splitView} onToggleSplitView={onToggleSplitView}
          showTransformed={showTransformed} onToggleView={onToggleView}
          onDownloadPng={onDownloadPng} onResetTransform={onResetTransform}
        />
      )}

      {methodChosen && (
        <Section title="Zoom">
          <div className="flex items-center gap-2">
            <ZoomButton onClick={onZoomOut} icon={<ZoomOut className="w-3.5 h-3.5" />} disabled={zoom <= 0.1} />
            <div className="flex-1 text-center text-xs font-mono tabular-nums" style={{ color: 'rgba(226,232,240,0.9)' }}>
              {Math.round(zoom * 100)}%
            </div>
            <ZoomButton onClick={onZoomIn} icon={<ZoomIn className="w-3.5 h-3.5" />} disabled={zoom >= 5} />
          </div>
          <button onClick={onZoomReset}
            className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-colors duration-150"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(226,232,240,0.7)' }}>
            <RotateCcw className="w-3 h-3" /> Reset (100%)
          </button>
          <p className="text-[10px]" style={{ color: 'rgba(148,163,184,0.4)' }}>
            Molette souris pour zoomer. Clic droit + glisser pour deplacer.
          </p>
        </Section>
      )}

      {methodChosen && (
        <Section title="Calque">
          {!hasOverlay ? (
            <button onClick={onAddPage} disabled={!hasImage}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:enabled:scale-[1.02]"
              style={{ background: hasImage ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'rgba(255,255,255,0.06)', color: '#fff', boxShadow: hasImage ? '0 2px 8px rgba(16,185,129,0.3)' : 'none' }}>
              <Layers className="w-4 h-4" />
              Ajouter une page
            </button>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-2 py-1.5 rounded-md" style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.2)' }}>
                <Layers className="w-3.5 h-3.5" style={{ color: '#34d399' }} />
                <span className="text-xs font-medium" style={{ color: '#34d399' }}>Page active</span>
              </div>
              <TransparencySlider opacityPct={opacityPct} onOpacityChange={onOpacityChange} />
            </div>
          )}
        </Section>
      )}
    </div>
  );
}

function TransformSection({ splitView, onToggleSplitView, showTransformed, onToggleView, onDownloadPng, onResetTransform }: {
  splitView: boolean; onToggleSplitView: () => void;
  showTransformed: boolean; onToggleView: () => void;
  onDownloadPng: () => void; onResetTransform: () => void;
}) {
  return (
    <Section title="Transformation">
      <div className="flex gap-1.5">
        <ModeButton active={!splitView} onClick={splitView ? onToggleSplitView : undefined}
          icon={<Monitor className="w-3.5 h-3.5" />} label="Ecran 1" />
        <ModeButton active={splitView} onClick={!splitView ? onToggleSplitView : undefined}
          icon={<Columns className="w-3.5 h-3.5" />} label="Ecran divise" />
      </div>
      {!splitView && (
        <button onClick={onToggleView}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-[1.02]"
          style={{
            background: showTransformed ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.06)',
            border: `1px solid ${showTransformed ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.1)'}`,
            color: showTransformed ? '#fbbf24' : 'rgba(226,232,240,0.8)',
          }}>
          <ArrowLeftRight className="w-4 h-4" />
          {showTransformed ? 'Transforme' : 'Original'}
        </button>
      )}
      <button onClick={onDownloadPng}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors duration-150"
        style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(226,232,240,0.8)' }}>
        <Download className="w-3.5 h-3.5" />
        Telecharger PNG transparent
      </button>
      <button onClick={onResetTransform}
        className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors duration-150"
        style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(226,232,240,0.5)' }}>
        <RotateCcw className="w-3 h-3" />
        Reinitialiser
      </button>
    </Section>
  );
}

function TransparencySlider({ opacityPct, onOpacityChange }: { opacityPct: number; onOpacityChange: (v: number) => void }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Eye className="w-3.5 h-3.5" style={{ color: 'rgba(148,163,184,0.8)' }} />
          <span className="text-xs" style={{ color: 'rgba(226,232,240,0.8)' }}>Transparence</span>
        </div>
        <span className="text-xs font-mono tabular-nums px-1.5 py-0.5 rounded"
          style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(226,232,240,0.9)' }}>
          {opacityPct}%
        </span>
      </div>
      <input type="range" min={0} max={100} value={opacityPct}
        onChange={e => onOpacityChange(Number(e.target.value) / 100)}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{ background: `linear-gradient(to right, #3b82f6 ${opacityPct}%, rgba(255,255,255,0.1) ${opacityPct}%)` }} />
      <div className="flex justify-between text-[10px]" style={{ color: 'rgba(148,163,184,0.5)' }}>
        <span>Opaque</span><span>Transparent</span>
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

function ZoomButton({ onClick, icon, disabled }: { onClick: () => void; icon: React.ReactNode; disabled: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="p-2 rounded-lg transition-colors duration-150 disabled:opacity-30"
      style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(226,232,240,0.8)' }}>
      {icon}
    </button>
  );
}

function ModeButton({ active, onClick, icon, label }: { active: boolean; onClick?: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick} disabled={!onClick}
      className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs font-medium transition-all duration-200"
      style={{
        background: active ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${active ? 'rgba(245,158,11,0.35)' : 'rgba(255,255,255,0.08)'}`,
        color: active ? '#fbbf24' : 'rgba(226,232,240,0.5)',
      }}>
      {icon}{label}
    </button>
  );
}
