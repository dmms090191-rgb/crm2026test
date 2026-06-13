import { useState, useCallback, useEffect } from 'react';
import { useCompanyId } from '../../../../hooks/useCompanyId';
import { supabase } from '../../../../lib/supabase';
import { useEditorModeSafe } from '../../../../contexts/EditorModeContext';
import ChatPanel from './ChatPanel';
import ResultPanel from './ResultPanel';
import ImageLibrary from './ImageLibrary';
import { useStabilityAi } from './useStabilityAi';
import { useAiImageLibrary } from './useAiImageLibrary';
import type { ChatMessage, AiGeneratedImage } from './editeurIaTypes';
import { EditeurIaHeader, EditeurIaMobileTabs } from './EditeurIaLayout';
import { useEditeurIaHandlers } from './useEditeurIaHandlers';
import { VisualCustomizeProvider } from '../../../../components/visualCustomize/VisualCustomizeContext';
import VisualCustomizeToggle from '../../../../components/visualCustomize/VisualCustomizeToggle';
import VisualCustomizeOverlay from '../../../../components/visualCustomize/VisualCustomizeOverlay';
import VisualCustomizeModal from '../../../../components/visualCustomize/VisualCustomizeModal';

export default function EditeurIA() {
  return (
    <VisualCustomizeProvider scope="admin_editeur_ia">
      <EditeurIaInner />
      <VisualCustomizeOverlay />
      <VisualCustomizeModal />
      <VisualCustomizeToggle visible />
    </VisualCustomizeProvider>
  );
}

function EditeurIaInner() {
  const companyId = useCompanyId();
  const editorCtx = useEditorModeSafe();
  const stability = useStabilityAi();
  const [resolvedCompanyId, setResolvedCompanyId] = useState<string | null>(companyId);
  const library = useAiImageLibrary(resolvedCompanyId);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentImage, setCurrentImage] = useState<AiGeneratedImage | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [mobileTab, setMobileTab] = useState<'chat' | 'result' | 'library'>('chat');
  const [sourceImageRef, setSourceImageRef] = useState<{ url: string; name: string } | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
        if (!companyId && user.app_metadata?.company_id) {
          setResolvedCompanyId(user.app_metadata.company_id);
        }
      }
    });
  }, [companyId]);

  useEffect(() => {
    if (companyId) setResolvedCompanyId(companyId);
  }, [companyId]);

  useEffect(() => {
    fetchCredits();
  }, []);

  const fetchCredits = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-provider-status?provider=stability`;
      const res = await fetch(apiUrl, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (data.total_balance != null) setCredits(Number(data.total_balance));
    } catch { /* ignore */ }
  }, []);

  const { handleSend, handleUpscaleForCover } = useEditeurIaHandlers({
    resolvedCompanyId, userId, stability, library, fetchCredits,
    setMessages, setCurrentImage, setSourceImageRef, setMobileTab,
  });

  const handleUseAsZone4 = useCallback((url: string) => {
    if (editorCtx) {
      editorCtx.setBackgroundImage(url);
    }
  }, [editorCtx]);

  const handleDownload = useCallback((url: string, name: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name.replace(/\s+/g, '_')}.png`;
    a.target = '_blank';
    a.click();
  }, []);

  const handleContinueFromImage = useCallback((img: AiGeneratedImage) => {
    setSourceImageRef({ url: img.generated_image_url, name: img.name });
    setMobileTab('chat');
  }, []);

  const handleClearSourceImage = useCallback(() => {
    setSourceImageRef(null);
  }, []);

  const handleSelectLibraryImage = useCallback((img: AiGeneratedImage) => {
    setCurrentImage(img);
    setMobileTab('result');
  }, []);

  return (
    <div className="flex flex-col h-full">
      <EditeurIaHeader credits={credits} />

      {/* Desktop layout */}
      <div className="hidden lg:flex flex-1 min-h-0">
        <div className="w-[360px] flex-shrink-0">
          <ChatPanel messages={messages} generating={stability.generating} onSend={handleSend} sourceImageRef={sourceImageRef} onClearSourceImage={handleClearSourceImage} />
        </div>
        <div className="flex-1 min-w-0">
          <ResultPanel
            currentImage={currentImage}
            generating={stability.generating}
            onUseAsZone4={handleUseAsZone4}
            onDownload={handleDownload}
            onContinueFromImage={handleContinueFromImage}
            onUpscaleForCover={handleUpscaleForCover}
          />
        </div>
        <div className="w-[320px] flex-shrink-0">
          <ImageLibrary
            images={library.images}
            loading={library.loading}
            selectedId={currentImage?.id || null}
            onSelect={handleSelectLibraryImage}
            onRefresh={library.refresh}
            onRename={library.renameImage}
            onDelete={library.deleteImage}
            onDownload={handleDownload}
            onUseAsZone4={handleUseAsZone4}
          />
        </div>
      </div>

      {/* Mobile layout */}
      <div className="lg:hidden flex flex-col flex-1 min-h-0">
        <EditeurIaMobileTabs active={mobileTab} onChange={setMobileTab} />
        <div className="flex-1 min-h-0">
          {mobileTab === 'chat' && (
            <ChatPanel messages={messages} generating={stability.generating} onSend={handleSend} sourceImageRef={sourceImageRef} onClearSourceImage={handleClearSourceImage} />
          )}
          {mobileTab === 'result' && (
            <ResultPanel
              currentImage={currentImage}
              generating={stability.generating}
              onUseAsZone4={handleUseAsZone4}
              onDownload={handleDownload}
              onUpscaleForCover={handleUpscaleForCover}
            />
          )}
          {mobileTab === 'library' && (
            <ImageLibrary
              images={library.images}
              loading={library.loading}
              selectedId={currentImage?.id || null}
              onSelect={handleSelectLibraryImage}
              onRefresh={library.refresh}
              onRename={library.renameImage}
              onDelete={library.deleteImage}
              onDownload={handleDownload}
              onUseAsZone4={handleUseAsZone4}
            />
          )}
        </div>
      </div>

      {stability.error && !stability.generating && (
        <div className="px-4 py-2 bg-red-500/10 border-t border-red-500/20">
          <p className="text-[11px] text-red-300/80 text-center">
            {stability.error}
          </p>
        </div>
      )}

      <div className="px-4 py-1.5 border-t border-white/[0.04]">
        <p className="text-[10px] text-white/20 text-center">
          Conseil : Plus votre description est precise, meilleur sera le resultat genere par l'IA.
        </p>
      </div>
    </div>
  );
}
