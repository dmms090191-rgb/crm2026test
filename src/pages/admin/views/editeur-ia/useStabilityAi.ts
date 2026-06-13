import { useState, useCallback } from 'react';
import { supabase } from '../../../../lib/supabase';
import type { GenerationRequest, GenerationResult } from './editeurIaTypes';

interface UseStabilityAiReturn {
  generating: boolean;
  error: string;
  generate: (request: GenerationRequest) => Promise<GenerationResult | null>;
  clearError: () => void;
}

function fallbackForStatus(status: number): string {
  if (status === 401) return 'Session expiree. Veuillez vous reconnecter.';
  if (status === 403) return 'Acces refuse. Vous n\'avez pas les droits necessaires.';
  if (status === 400) return 'Requete invalide. Verifiez le prompt et l\'image.';
  if (status >= 500 && status < 600) return 'Erreur du serveur. Veuillez reessayer dans quelques instants.';
  return `Erreur inattendue (code ${status}). Veuillez reessayer.`;
}

export function useStabilityAi(): UseStabilityAiReturn {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const generate = useCallback(async (request: GenerationRequest): Promise<GenerationResult | null> => {
    setGenerating(true);
    setError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Non authentifie');
        return null;
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stability-image-editor`;
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      let data: Record<string, unknown>;
      try {
        data = await res.json();
      } catch {
        setError(fallbackForStatus(res.status));
        return null;
      }

      if (!res.ok || !data.success) {
        const msg = (typeof data.error === 'string' && data.error) || fallbackForStatus(res.status);
        setError(msg);
        return null;
      }

      return data as unknown as GenerationResult;
    } catch (e) {
      if (e instanceof TypeError && e.message.includes('fetch')) {
        setError('Impossible de joindre le serveur. Verifiez votre connexion.');
      } else {
        const msg = e instanceof Error ? e.message : 'Erreur inconnue';
        setError(msg);
      }
      return null;
    } finally {
      setGenerating(false);
    }
  }, []);

  const clearError = useCallback(() => setError(''), []);

  return { generating, error, generate, clearError };
}
