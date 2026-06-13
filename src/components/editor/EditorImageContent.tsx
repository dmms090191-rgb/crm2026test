import { useState, useRef, useCallback } from 'react';
import { ImagePlus, Trash2, Upload, Loader2, CheckCircle2 } from 'lucide-react';
import { useEditorMode } from '../../contexts/EditorModeContext';
import type { EditorPanelTokens } from './editorPanelTheme';
import { supabase } from '../../lib/supabase';
import { PositionControls } from './EditorImagePositionControls';
import { ZoomSlider, FitModeSelector } from './EditorImageZoomAndFit';

interface Props {
  ctx: ReturnType<typeof useEditorMode>;
  pt: EditorPanelTokens;
}

export default function EditorImageContent({ ctx, pt }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [removeConfirm, setRemoveConfirm] = useState(false);

  const hasImage = !!ctx.backgroundImage;

  const handleUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Le fichier doit etre une image');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('L\'image ne doit pas depasser 5 Mo');
      return;
    }

    setUploading(true);
    setError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError('Non authentifie'); return; }

      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${user.id}/bg_${Date.now()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from('editor-backgrounds')
        .upload(path, file, { upsert: true });

      if (uploadErr) { setError(uploadErr.message); return; }

      const { data: urlData } = supabase.storage
        .from('editor-backgrounds')
        .getPublicUrl(path);

      ctx.setBackgroundImage(urlData.publicUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setUploading(false);
    }
  }, [ctx]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    e.target.value = '';
  }, [handleUpload]);

  const handleRemove = useCallback(() => {
    ctx.setBackgroundImage(null);
    setRemoveConfirm(false);
  }, [ctx]);

  return (
    <div className="px-3 py-3 flex flex-col gap-4">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={handleFileChange}
      />

      <div className="flex flex-col items-center gap-1.5 pt-1">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: pt.accent.bg, border: `1px solid ${pt.accent.border}` }}
        >
          <ImagePlus className="w-5 h-5" style={{ color: pt.accent.solid }} />
        </div>
        <span className="text-xs font-bold" style={{ color: pt.text.primary }}>
          Image de fond
        </span>
        <p className="text-[10px] text-center leading-relaxed px-2" style={{ color: pt.label.muted }}>
          Inserer une image en arriere-plan principal.
        </p>
      </div>

      {hasImage && (
        <div className="flex flex-col gap-2">
          <div
            className="relative rounded-xl overflow-hidden"
            style={{ border: `1px solid ${pt.surface.border}` }}
          >
            <img
              src={ctx.backgroundImage!}
              alt="Arriere-plan"
              className="w-full h-32 object-cover"
            />
            <div
              className="absolute bottom-0 inset-x-0 flex items-center gap-1.5 px-2.5 py-2"
              style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.7))' }}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <span className="text-[10px] font-semibold text-white/90">Image active</span>
            </div>
          </div>

          <ZoomSlider zoom={ctx.backgroundImageZoom} onChange={ctx.setBackgroundImageZoom} pt={pt} />

          <FitModeSelector fit={ctx.backgroundImageFit} onChange={ctx.setBackgroundImageFit} pt={pt} />

          <PositionControls
            posX={ctx.backgroundImagePositionX}
            posY={ctx.backgroundImagePositionY}
            onChange={ctx.setBackgroundImagePosition}
            pt={pt}
          />

        </div>
      )}

      <button
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[11px] font-bold transition-all duration-200 hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
        style={{
          background: hasImage ? pt.surface.secondary : `linear-gradient(135deg, ${pt.accent.solid}, ${pt.accent.bgHover})`,
          color: hasImage ? pt.text.primary : '#fff',
          border: `1px solid ${hasImage ? pt.surface.border : pt.accent.border}`,
        }}
      >
        {uploading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Envoi en cours...
          </>
        ) : hasImage ? (
          <>
            <Upload className="w-3.5 h-3.5" />
            Remplacer l'image
          </>
        ) : (
          <>
            <ImagePlus className="w-4 h-4" />
            Inserer une image
          </>
        )}
      </button>

      {hasImage && !removeConfirm && (
        <button
          onClick={() => setRemoveConfirm(true)}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[11px] font-semibold transition-all duration-200 hover:scale-[1.02]"
          style={{
            background: pt.danger.bg,
            color: pt.danger.text,
            border: `1px solid ${pt.danger.border}`,
          }}
        >
          <Trash2 className="w-3.5 h-3.5" />
          Supprimer l'image
        </button>
      )}

      {hasImage && removeConfirm && (
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: pt.surface.secondary, border: `1px solid ${pt.surface.border}` }}
        >
          <p className="text-[10px] font-medium px-3 pt-2.5 pb-2" style={{ color: pt.text.secondary }}>
            Supprimer l'image de fond ? La Zone 4 reviendra a sa couleur precedente.
          </p>
          <div className="flex gap-1.5 px-3 pb-2.5">
            <button
              onClick={() => setRemoveConfirm(false)}
              className="flex-1 py-1.5 rounded-lg text-[10px] font-semibold transition-all"
              style={{ background: pt.surface.secondary, color: pt.text.secondary, border: `1px solid ${pt.surface.border}` }}
            >
              Annuler
            </button>
            <button
              onClick={handleRemove}
              className="flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all hover:scale-[1.02]"
              style={{ background: pt.danger.bg, color: pt.danger.text, border: `1px solid ${pt.danger.border}` }}
            >
              Supprimer
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="text-[10px] font-medium px-1" style={{ color: pt.danger.text }}>
          {error}
        </p>
      )}
    </div>
  );
}
