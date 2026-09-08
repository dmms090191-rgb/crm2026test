import { useState, useEffect, lazy, Suspense } from 'react';
import { Crown, MessageSquare } from 'lucide-react';
import { useThemeTokens } from '../../hooks/useThemeTokens';

const CSAChatRoisAdmin = lazy(() => import('./CSAChatRoisAdmin'));

/**
 * Porte d'entree visuelle vers la messagerie Talvex du panel Groupe.
 *
 * Tant que « Contacter Talvex » n'a pas ete clique, le fil n'est pas monte.
 * Un clic monte CSAChatRoisAdmin tel quel : meme conversation, meme historique,
 * meme Realtime, meme gestion des non-lus. Aucune architecture de chat nouvelle.
 */
export default function CSATalvexGate({ csaAuthId, autoOpen = false, onAutoOpenConsumed }: {
  csaAuthId: string;
  /** Arrivee par une notification : on saute l ecran d accueil. */
  autoOpen?: boolean;
  onAutoOpenConsumed?: () => void;
}) {
  const t = useThemeTokens();
  // Le composant est monte/demonte a chaque changement de vue : l etat initial
  // capture donc bien la facon dont on vient d arriver.
  const [open, setOpen] = useState(autoOpen);

  // Le drapeau ne vaut que pour cette arrivee : on le consomme aussitot,
  // pour qu une ouverture manuelle ulterieure repasse par l ecran d accueil.
  useEffect(() => { if (autoOpen) onAutoOpenConsumed?.(); }, [autoOpen, onAutoOpenConsumed]);

  if (open) {
    return (
      <Suspense fallback={<div className="flex-1 flex items-center justify-center"><div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>}>
        <div className="h-full flex flex-col">
          <CSAChatRoisAdmin csaAuthId={csaAuthId} />
        </div>
      </Suspense>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="text-center space-y-5 max-w-sm">
        <div
          className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center"
          style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)' }}
        >
          <Crown className="w-8 h-8" style={{ color: '#f59e0b' }} />
        </div>

        <div className="space-y-1.5">
          <h2 className="text-base font-bold" style={{ color: t.text.primary }}>
            Talvex Administrateur
          </h2>
          <p className="text-xs leading-relaxed" style={{ color: t.text.tertiary }}>
            Échangez directement avec la direction de la plateforme.
          </p>
        </div>

        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold text-white transition-all hover:brightness-110"
          style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', boxShadow: '0 2px 12px rgba(245,158,11,0.3)' }}
        >
          <MessageSquare className="w-4 h-4" />
          Contacter Talvex
        </button>
      </div>
    </div>
  );
}
