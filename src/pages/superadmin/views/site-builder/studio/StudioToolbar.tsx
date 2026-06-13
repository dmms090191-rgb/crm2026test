import { useState, useEffect } from 'react';
import { Monitor, Smartphone, Maximize2, Rocket, Circle, Save, Loader2, Check, ChevronDown, BookmarkPlus } from 'lucide-react';
import type { ThemeTokens } from '../../../../../lib/themeTokensTypes';
import StudioSiteStatus from './StudioSiteStatus';

export type PreviewMode = 'desktop' | 'mobile';

interface Props {
  previewMode: PreviewMode;
  onPreviewModeChange: (mode: PreviewMode) => void;
  onFullscreen: () => void;
  publicUrl: string | null;
  t: ThemeTokens;
  hasUnsavedChanges?: boolean;
  isSaving?: boolean;
  isPublished?: boolean;
  isPublishing?: boolean;
  onSaveDraft?: () => void;
  onPublish?: () => void;
  onSaveAsTemplate?: () => void;
  lastSavedAt?: string | null;
  lastPublishedAt?: string | null;
  templateKey?: string | null;
}

export default function StudioToolbar({
  previewMode, onPreviewModeChange, onFullscreen, publicUrl, t,
  hasUnsavedChanges, isSaving, isPublished, isPublishing, onSaveDraft, onPublish,
  onSaveAsTemplate,
  lastSavedAt, lastPublishedAt, templateKey,
}: Props) {
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);

  useEffect(() => {
    if (!isSaving && savedFeedback) return;
    if (isSaving) setSavedFeedback(false);
  }, [isSaving, savedFeedback]);

  const handleSave = async () => {
    if (!onSaveDraft) return;
    onSaveDraft();
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2500);
  };

  const canPublish = onPublish && !hasUnsavedChanges && !isPublishing;

  return (
    <div
      className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl"
      style={{ background: t.surface.primary, border: `1px solid ${t.surface.border}` }}
    >
      {/* Left: Status badge */}
      <div className="relative">
        <button
          onClick={() => setStatusOpen(v => !v)}
          className="flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all hover:scale-[1.02]"
          style={{
            background: statusOpen ? `${isPublished ? '#10b981' : '#f59e0b'}12` : 'transparent',
            border: statusOpen ? `1px solid ${isPublished ? '#10b981' : '#f59e0b'}25` : '1px solid transparent',
          }}
        >
          <Circle
            className="w-2 h-2 fill-current"
            style={{ color: isPublished ? '#10b981' : '#f59e0b' }}
          />
          <span
            className="text-[10px] font-bold"
            style={{ color: isPublished ? '#10b981' : '#f59e0b' }}
          >
            {isPublished ? 'Publie' : 'Brouillon'}
          </span>
          {hasUnsavedChanges && (
            <span className="text-[9px] font-medium" style={{ color: t.text.quaternary }}>
              (non sauvegarde)
            </span>
          )}
          <ChevronDown
            className="w-2.5 h-2.5 transition-transform"
            style={{
              color: t.text.quaternary,
              transform: statusOpen ? 'rotate(180deg)' : 'none',
            }}
          />
        </button>

        <StudioSiteStatus
          isOpen={statusOpen}
          onClose={() => setStatusOpen(false)}
          isPublished={!!isPublished}
          hasUnsavedChanges={!!hasUnsavedChanges}
          lastSavedAt={lastSavedAt ?? null}
          lastPublishedAt={lastPublishedAt ?? null}
          templateKey={templateKey ?? null}
          publicUrl={publicUrl}
          isPublishing={!!isPublishing}
          onPublish={() => { setStatusOpen(false); onPublish?.(); }}
          t={t}
        />
      </div>

      {/* Center: Preview mode toggles */}
      <div className="flex items-center gap-1 rounded-lg p-0.5" style={{ background: t.surface.secondary }}>
        <button
          onClick={() => onPreviewModeChange('desktop')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-semibold transition-all"
          style={{
            background: previewMode === 'desktop' ? t.card.bg : 'transparent',
            border: previewMode === 'desktop' ? `1px solid ${t.surface.border}` : '1px solid transparent',
            color: previewMode === 'desktop' ? '#0ea5e9' : t.text.tertiary,
            boxShadow: previewMode === 'desktop' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
          }}
        >
          <Monitor className="w-3 h-3" />
          <span className="hidden sm:inline">Desktop</span>
        </button>
        <button
          onClick={() => onPreviewModeChange('mobile')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-semibold transition-all"
          style={{
            background: previewMode === 'mobile' ? t.card.bg : 'transparent',
            border: previewMode === 'mobile' ? `1px solid ${t.surface.border}` : '1px solid transparent',
            color: previewMode === 'mobile' ? '#0ea5e9' : t.text.tertiary,
            boxShadow: previewMode === 'mobile' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
          }}
        >
          <Smartphone className="w-3 h-3" />
          <span className="hidden sm:inline">Mobile</span>
        </button>
        <button
          onClick={onFullscreen}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-semibold transition-all"
          style={{ color: t.text.tertiary }}
        >
          <Maximize2 className="w-3 h-3" />
          <span className="hidden sm:inline">Plein ecran</span>
        </button>
      </div>

      {/* Right: Actions - Enregistrer | Enregistrer dans Templates | Publier */}
      <div className="flex items-center gap-1.5">
        {/* Save draft */}
        {onSaveDraft && (
          <button
            onClick={handleSave}
            disabled={!hasUnsavedChanges || isSaving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all"
            style={{
              background: hasUnsavedChanges ? 'rgba(14,165,233,0.1)' : t.surface.secondary,
              border: hasUnsavedChanges ? '1px solid rgba(14,165,233,0.3)' : `1px solid ${t.surface.border}`,
              color: hasUnsavedChanges ? '#0ea5e9' : t.text.quaternary,
              opacity: hasUnsavedChanges ? 1 : 0.5,
              cursor: hasUnsavedChanges ? 'pointer' : 'default',
            }}
          >
            {isSaving ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : savedFeedback && !hasUnsavedChanges ? (
              <Check className="w-3 h-3" />
            ) : (
              <Save className="w-3 h-3" />
            )}
            <span className="hidden sm:inline">
              {isSaving ? 'Sauvegarde...' : savedFeedback && !hasUnsavedChanges ? 'Sauvegarde !' : 'Enregistrer'}
            </span>
          </button>
        )}

        {/* Save as template */}
        {onSaveAsTemplate && (
          <button
            onClick={onSaveAsTemplate}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all hover:scale-105"
            style={{
              background: 'rgba(245,158,11,0.1)',
              border: '1px solid rgba(245,158,11,0.3)',
              color: '#f59e0b',
            }}
          >
            <BookmarkPlus className="w-3 h-3" />
            <span className="hidden lg:inline">Templates</span>
          </button>
        )}

        {/* Publish */}
        <button
          onClick={onPublish}
          disabled={!canPublish}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all"
          style={{
            background: canPublish ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #10b981, #059669)',
            color: '#ffffff',
            opacity: canPublish ? 1 : 0.4,
            cursor: canPublish ? 'pointer' : 'not-allowed',
          }}
        >
          {isPublishing ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Rocket className="w-3 h-3" />
          )}
          <span className="hidden sm:inline">
            {isPublishing ? 'Publication...' : 'Publier'}
          </span>
        </button>
      </div>
    </div>
  );
}
