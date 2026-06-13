import { useCallback } from 'react';
import { supabase } from '../../../../lib/supabase';
import type { ChatMessage, AiGeneratedImage, AiOperation } from './editeurIaTypes';
import { resizeImageFile, buildImageName, buildAiResponse } from './editeurIaHelpers';

interface Params {
  resolvedCompanyId: string | null;
  userId: string | null;
  stability: ReturnType<typeof import('./useStabilityAi').useStabilityAi>;
  library: ReturnType<typeof import('./useAiImageLibrary').useAiImageLibrary>;
  fetchCredits: () => void;
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  setCurrentImage: (img: AiGeneratedImage | null) => void;
  setSourceImageRef: (ref: { url: string; name: string } | null) => void;
  setMobileTab: (tab: 'chat' | 'result' | 'library') => void;
}

export function useEditeurIaHandlers(p: Params) {
  const { resolvedCompanyId, userId, stability, library, fetchCredits, setMessages, setCurrentImage, setSourceImageRef, setMobileTab } = p;

  const handleSend = useCallback(async (text: string, imageFile?: File, continueFromUrl?: string) => {
    if (!resolvedCompanyId || !userId) {
      const errMsg: ChatMessage = {
        id: `ai-err-${Date.now()}`,
        role: 'ai',
        text: `Erreur : ${!userId ? 'Utilisateur non authentifie.' : 'Aucune entreprise associee au compte.'}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errMsg]);
      return;
    }

    let imageUrl: string | undefined;
    let wasResized = false;

    if (continueFromUrl) {
      imageUrl = continueFromUrl;
    } else if (imageFile) {
      let fileToUpload = imageFile;
      try {
        const resizeResult = await resizeImageFile(imageFile);
        fileToUpload = resizeResult.file;
        wasResized = resizeResult.resized;
      } catch { /* use original if resize fails */ }
      const ext = wasResized ? 'png' : (imageFile.name.split('.').pop() || 'png');
      const path = `${userId}/src_${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('ai-images').upload(path, fileToUpload, { upsert: true });
      if (!upErr) {
        const { data: urlData } = supabase.storage.from('ai-images').getPublicUrl(path);
        imageUrl = urlData.publicUrl;
      }
    }

    if (wasResized) {
      const infoMsg: ChatMessage = {
        id: `info-${Date.now()}`,
        role: 'ai',
        text: 'Image reduite automatiquement pour respecter la limite Stability AI (max 1 megapixel). Vous pourrez agrandir le resultat apres generation.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, infoMsg]);
    }

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: continueFromUrl ? `[Modification] ${text}` : text,
      imageUrl: continueFromUrl ? undefined : imageUrl,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);

    const lower = text.toLowerCase();
    const operation: AiOperation = imageUrl
      ? (lower.includes('agrandir') || lower.includes('upscale') ? 'upscale'
        : lower.includes('etendre') || lower.includes('remplir') || lower.includes('outpaint') ? 'outpaint'
        : 'img2img')
      : 'generate';

    const isCorrection = !!continueFromUrl;

    const result = await stability.generate({
      operation,
      prompt: text,
      image_url: imageUrl,
      model: 'sd3.5-large',
      aspect_ratio: operation === 'generate' ? '16:9' : undefined,
      preserve_mode: isCorrection && operation === 'img2img' ? true : undefined,
      strength: isCorrection && operation === 'img2img' ? 0.20 : undefined,
      left: operation === 'outpaint' ? 200 : undefined,
      right: operation === 'outpaint' ? 200 : undefined,
    });

    if (result) {
      const saved = await library.saveImage({
        company_id: resolvedCompanyId,
        user_id: userId,
        operation,
        source_image_url: imageUrl || null,
        generated_image_url: result.image_url,
        storage_path: result.storage_path,
        prompt: text,
        model: result.model,
        width: result.width,
        height: result.height,
        credits_used: result.credits_used,
        metadata: { seed: result.seed },
        name: buildImageName(text, operation),
      });

      let aiText = buildAiResponse(operation, result.model);
      if (result.prompt_translated) {
        aiText += '\n\nPrompt traduit automatiquement en anglais pour Stability AI.';
      }

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'ai',
        text: aiText,
        imageUrl: result.image_url,
        timestamp: new Date(),
        generatedImageId: saved?.id,
      };
      setMessages(prev => [...prev, aiMsg]);

      if (saved) setCurrentImage(saved);
      setSourceImageRef(null);
      setMobileTab('result');
      fetchCredits();
    } else if (stability.error) {
      const errMsg: ChatMessage = {
        id: `ai-err-${Date.now()}`,
        role: 'ai',
        text: `Erreur : ${stability.error}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errMsg]);
    }
  }, [resolvedCompanyId, userId, stability, library, fetchCredits, setMessages, setCurrentImage, setSourceImageRef, setMobileTab]);

  const handleUpscaleForCover = useCallback(async (img: AiGeneratedImage) => {
    if (!resolvedCompanyId || !userId) return;

    const upscaleMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: '[Upscale] Agrandir pour couvrir l\'ecran Talvex (1821x1094)',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, upscaleMsg]);

    const result = await stability.generate({
      operation: 'upscale',
      prompt: 'upscale',
      image_url: img.generated_image_url,
    });

    if (result) {
      const saved = await library.saveImage({
        company_id: resolvedCompanyId,
        user_id: userId,
        operation: 'upscale',
        source_image_url: img.generated_image_url,
        generated_image_url: result.image_url,
        storage_path: result.storage_path,
        prompt: 'Upscale pour fond Talvex',
        model: result.model,
        width: result.width,
        height: result.height,
        credits_used: result.credits_used,
        metadata: { seed: result.seed },
        name: `Agrandissement - ${img.name.substring(0, 30)}`,
      });

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'ai',
        text: `Image agrandie (${result.width}x${result.height}). Prete pour couvrir le fond Talvex.`,
        imageUrl: result.image_url,
        timestamp: new Date(),
        generatedImageId: saved?.id,
      };
      setMessages(prev => [...prev, aiMsg]);

      if (saved) setCurrentImage(saved);
      setMobileTab('result');
      fetchCredits();
    } else if (stability.error) {
      const errMsg: ChatMessage = {
        id: `ai-err-${Date.now()}`,
        role: 'ai',
        text: `Erreur upscale : ${stability.error}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errMsg]);
    }
  }, [resolvedCompanyId, userId, stability, library, fetchCredits, setMessages, setCurrentImage, setMobileTab]);

  return { handleSend, handleUpscaleForCover };
}
