import { useState, useRef } from 'react';
import { Rocket, Circle, Save, Loader2, Blend, Paintbrush, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import type { ThemeTokens } from '../../../../../lib/themeTokensTypes';
import type { GradientConfig, BgMode } from './studioSectionTypes';
import { DEFAULT_GRADIENT, DEFAULT_MOBILE_HEIGHT } from './studioSectionTypes';
import { formatRelativeTime } from '../../../../../lib/formatRelativeTime';
import { getCanvasBackground } from './gradientHelpers';
import StudioBackgroundPanel from './StudioBackgroundPanel';
import StudioGradientPanel from './StudioGradientPanel';
import StudioPageHeightPanel from './StudioPageHeightPanel';
import MobilePreviewPane from './MobilePreviewPane';
import MobileModeCards from './MobileModeCards';

interface Props {
  t: ThemeTokens;
  lastSavedAt?: string | null;
  hasUnsavedChanges?: boolean;
  isSaving?: boolean;
  isPublished?: boolean;
  isPublishing?: boolean;
  onSaveDraft?: () => void;
  onPublish?: () => void;
  canvasBg?: string;
  onCanvasBgChange?: (color: string) => void;
  onCanvasBgReset?: () => void;
  gradient?: GradientConfig | null;
  onGradientChange?: (gradient: GradientConfig | null) => void;
  onGradientReset?: () => void;
  pageHeight?: number;
  onPageHeightChange?: (h: number) => void;
  bgMode?: BgMode;
  onBgModeChange?: (mode: BgMode) => void;
}

function isLight(hex: string): boolean {
  const c = hex.replace('#', '');
  if (c.length !== 6) return false;
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 128;
}

type MobilePanel = 'main' | 'solid' | 'gradient';

export default function StudioMobileFlow({
  t, lastSavedAt,
  hasUnsavedChanges, isSaving, isPublished, isPublishing, onSaveDraft, onPublish,
  canvasBg, onCanvasBgChange, onCanvasBgReset,
  gradient, onGradientChange, onGradientReset,
  pageHeight, onPageHeightChange,
  bgMode: bgModeProp, onBgModeChange,
}: Props) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>('main');
  const lastGradient = useRef<GradientConfig>(DEFAULT_GRADIENT);
  const statusColor = isPublished ? '#10b981' : '#f59e0b';
  const statusLabel = isPublished ? 'Publie' : 'Brouillon';
  const bg = canvasBg || '#ffffff';
  const activeBgMode: BgMode = bgModeProp ?? 'default';

  const effectivePreviewBg = activeBgMode === 'default' ? '#ffffff'
    : activeBgMode === 'solid' ? bg
    : bg;
  const effectivePreviewGradient = activeBgMode === 'gradient' ? (gradient ?? null) : null;
  const effectiveBg = getCanvasBackground(effectivePreviewBg, effectivePreviewGradient);

  const light = isLight(effectivePreviewBg);
  const textColor = light ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.4)';
  const subtextColor = light ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)';

  if (gradient) lastGradient.current = gradient;

  const handleNavigate = (panel: 'solid' | 'gradient') => {
    if (panel === 'gradient' && !gradient && onGradientChange) {
      onGradientChange(lastGradient.current);
    }
    setMobilePanel(panel);
  };

  const handleActivateSolid = () => {
    onBgModeChange?.('solid');
  };

  const handleActivateGradient = () => {
    if (!gradient && onGradientChange) {
      onGradientChange(lastGradient.current);
    }
    onBgModeChange?.('gradient');
  };

  const handleDeactivate = () => {
    onBgModeChange?.('default');
  };

  const badgeLabel = activeBgMode === 'gradient' ? 'Degrade' : activeBgMode === 'solid' ? 'Couleur unie' : 'Blanc par defaut';
  const badgeColor = activeBgMode === 'gradient' ? '#f59e0b' : activeBgMode === 'solid' ? '#0ea5e9' : '#94a3b8';
  const BadgeIcon = activeBgMode === 'gradient' ? Blend : Paintbrush;

  return (
    <div className="flex flex-col h-full min-h-[400px]">
      {/* Status bar */}
      <div className="flex items-center gap-2 px-3 py-2.5" style={{ borderBottom: `1px solid ${t.surface.border}` }}>
        <span className="text-[11px] font-semibold flex-1" style={{ color: t.text.secondary }}>
          Zone d'edition mobile
        </span>
        <div className="flex items-center gap-1">
          {lastSavedAt && (
            <span className="text-[8px] mr-1" style={{ color: t.text.quaternary }}>
              {formatRelativeTime(lastSavedAt)}
            </span>
          )}
          <Circle className="w-2 h-2 fill-current" style={{ color: statusColor }} />
          <span className="text-[9px] font-bold" style={{ color: statusColor }}>{statusLabel}</span>
        </div>
      </div>

      {/* Arriere-plan toggle */}
      <button
        onClick={() => { setSettingsOpen(prev => !prev); setMobilePanel('main'); }}
        className="flex items-center gap-2 px-3 py-2.5 transition-all"
        style={{ borderBottom: `1px solid ${t.surface.border}` }}
      >
        <BadgeIcon className="w-3.5 h-3.5" style={{ color: badgeColor }} />
        <span className="text-[11px] font-semibold flex-1 text-left" style={{ color: t.text.secondary }}>
          Arriere-plan
        </span>
        <span
          className="text-[8px] font-bold px-1.5 py-0.5 rounded"
          style={{
            background: activeBgMode === 'gradient' ? 'rgba(245,158,11,0.08)' : activeBgMode === 'solid' ? 'rgba(14,165,233,0.08)' : 'rgba(148,163,184,0.08)',
            color: badgeColor,
            border: `1px solid ${activeBgMode === 'gradient' ? 'rgba(245,158,11,0.2)' : activeBgMode === 'solid' ? 'rgba(14,165,233,0.2)' : 'rgba(148,163,184,0.2)'}`,
          }}
        >
          {badgeLabel}
        </span>
        {settingsOpen
          ? <ChevronUp className="w-3 h-3" style={{ color: t.text.quaternary }} />
          : <ChevronDown className="w-3 h-3" style={{ color: t.text.quaternary }} />
        }
      </button>

      {settingsOpen && (
        <div style={{ borderBottom: `1px solid ${t.surface.border}`, maxHeight: '480px', overflow: 'auto' }}>
          {mobilePanel === 'main' && (
            <>
              {onPageHeightChange && (
                <div className="p-2.5 pb-0">
                  <StudioPageHeightPanel
                    height={pageHeight ?? DEFAULT_MOBILE_HEIGHT}
                    onChange={onPageHeightChange}
                    isMobile
                    t={t}
                  />
                </div>
              )}
              <MobileModeCards
                bgMode={activeBgMode}
                bg={bg}
                gradient={gradient ?? null}
                onNavigate={handleNavigate}
                t={t}
              />
            </>
          )}

          {mobilePanel === 'solid' && onCanvasBgChange && onCanvasBgReset && (
            <div>
              <button
                onClick={() => setMobilePanel('main')}
                className="flex items-center gap-2 px-3 py-2 text-[10px] font-semibold"
                style={{ color: t.text.secondary, borderBottom: `1px solid ${t.surface.border}` }}
              >
                <ChevronRight className="w-3 h-3 rotate-180" />
                Retour
              </button>
              <StudioBackgroundPanel
                currentColor={bg}
                onChange={onCanvasBgChange}
                onReset={onCanvasBgReset}
                isActive={activeBgMode === 'solid'}
                onActivate={handleActivateSolid}
                onDeactivate={handleDeactivate}
                t={t}
              />
            </div>
          )}

          {mobilePanel === 'gradient' && onGradientChange && onGradientReset && (
            <div>
              <button
                onClick={() => setMobilePanel('main')}
                className="flex items-center gap-2 px-3 py-2 text-[10px] font-semibold"
                style={{ color: t.text.secondary, borderBottom: `1px solid ${t.surface.border}` }}
              >
                <ChevronRight className="w-3 h-3 rotate-180" />
                Retour
              </button>
              <StudioGradientPanel
                gradient={gradient ?? null}
                onChange={onGradientChange}
                onReset={onGradientReset}
                isActive={activeBgMode === 'gradient'}
                onActivate={handleActivateGradient}
                onDeactivate={handleDeactivate}
                t={t}
              />
            </div>
          )}
        </div>
      )}

      {/* Preview */}
      <MobilePreviewPane
        effectiveBg={effectiveBg}
        gradient={effectivePreviewGradient}
        onGradientChange={onGradientChange ?? null}
        light={light}
        textColor={textColor}
        subtextColor={subtextColor}
        pageHeight={pageHeight}
      />

      {/* Bottom navigation */}
      <div className="flex items-center gap-2 px-3 py-3" style={{ borderTop: `1px solid ${t.surface.border}` }}>
        <div className="flex-1" />

        {onSaveDraft && hasUnsavedChanges && (
          <button
            onClick={onSaveDraft}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all"
            style={{ background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.3)', color: '#0ea5e9' }}
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {isSaving ? 'Sauvegarde...' : 'Enregistrer'}
          </button>
        )}

        <button
          onClick={onPublish}
          disabled={!onPublish || hasUnsavedChanges || isPublishing}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all"
          style={{
            background: 'linear-gradient(135deg, #10b981, #059669)',
            color: '#ffffff',
            opacity: onPublish && !hasUnsavedChanges && !isPublishing ? 1 : 0.4,
            cursor: onPublish && !hasUnsavedChanges && !isPublishing ? 'pointer' : 'not-allowed',
          }}
        >
          {isPublishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Rocket className="w-3.5 h-3.5" />}
          {isPublishing ? 'Publication...' : 'Publier'}
        </button>
      </div>
    </div>
  );
}
