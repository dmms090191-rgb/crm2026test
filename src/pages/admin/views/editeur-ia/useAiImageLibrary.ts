import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../../lib/supabase';
import type { AiGeneratedImage } from './editeurIaTypes';

interface UseAiImageLibraryReturn {
  images: AiGeneratedImage[];
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  renameImage: (id: string, name: string) => Promise<void>;
  deleteImage: (id: string) => Promise<void>;
  saveImage: (data: Omit<AiGeneratedImage, 'id' | 'created_at'>) => Promise<AiGeneratedImage | null>;
}

export function useAiImageLibrary(companyId: string | null): UseAiImageLibraryReturn {
  const [images, setImages] = useState<AiGeneratedImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    setError('');
    const { data, error: err } = await supabase
      .from('ai_generated_images')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (err) {
      setError(err.message);
    } else {
      setImages(data || []);
    }
    setLoading(false);
  }, [companyId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const renameImage = useCallback(async (id: string, name: string) => {
    const { error: err } = await supabase
      .from('ai_generated_images')
      .update({ name })
      .eq('id', id);
    if (err) throw new Error(err.message);
    setImages(prev => prev.map(img => img.id === id ? { ...img, name } : img));
  }, []);

  const deleteImage = useCallback(async (id: string) => {
    const img = images.find(i => i.id === id);
    if (!img) return;

    if (img.storage_path) {
      await supabase.storage.from('ai-images').remove([img.storage_path]);
    }

    const { error: err } = await supabase
      .from('ai_generated_images')
      .delete()
      .eq('id', id);
    if (err) throw new Error(err.message);
    setImages(prev => prev.filter(i => i.id !== id));
  }, [images]);

  const saveImage = useCallback(async (data: Omit<AiGeneratedImage, 'id' | 'created_at'>): Promise<AiGeneratedImage | null> => {
    const { data: inserted, error: err } = await supabase
      .from('ai_generated_images')
      .insert(data)
      .select()
      .maybeSingle();
    if (err) {
      setError(err.message);
      return null;
    }
    if (inserted) {
      setImages(prev => [inserted, ...prev]);
    }
    return inserted;
  }, []);

  return { images, loading, error, refresh, renameImage, deleteImage, saveImage };
}
