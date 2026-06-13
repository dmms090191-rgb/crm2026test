import { useState } from 'react';
import { X, BookmarkPlus, Loader2 } from 'lucide-react';
import type { ThemeTokens } from '../../../../../lib/themeTokensTypes';

interface Props {
  isOpen: boolean;
  isSaving: boolean;
  onSave: (name: string) => Promise<void>;
  onClose: () => void;
  t: ThemeTokens;
}

export default function SaveAsTemplateModal({ isOpen, isSaving, onSave, onClose, t }: Props) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Le nom du template est requis');
      return;
    }
    if (trimmed.length < 2) {
      setError('Le nom doit contenir au moins 2 caracteres');
      return;
    }
    setError('');
    try {
      await onSave(trimmed);
      setName('');
    } catch {
      setError('Erreur lors de la sauvegarde');
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={onClose} />

      <div
        className="relative w-full max-w-md rounded-2xl overflow-hidden animate-in fade-in zoom-in-95"
        style={{
          background: 'linear-gradient(135deg, rgba(30,41,59,0.95), rgba(15,23,42,0.98))',
          border: '1px solid rgba(148,163,184,0.2)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(148,163,184,0.1)' }}>
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(245,158,11,0.05))',
                border: '1px solid rgba(245,158,11,0.25)',
              }}
            >
              <BookmarkPlus className="w-4 h-4" style={{ color: '#f59e0b' }} />
            </div>
            <div>
              <h2 className="text-sm font-bold" style={{ color: t.text.primary }}>Enregistrer dans Templates</h2>
              <p className="text-[10px]" style={{ color: t.text.quaternary }}>
                Sauvegarder la configuration actuelle comme template reutilisable
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:scale-110"
            style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.text.tertiary }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold" style={{ color: t.text.secondary }}>
              Nom du template
            </label>
            <input
              type="text"
              value={name}
              onChange={e => { setName(e.target.value); setError(''); }}
              placeholder="Ex: Mon site vitrine, Landing page pro..."
              autoFocus
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all focus:ring-2 focus:ring-amber-500/30"
              style={{
                background: t.surface.secondary,
                border: error ? '1.5px solid #ef4444' : `1.5px solid ${t.surface.border}`,
                color: t.text.primary,
              }}
            />
            {error && (
              <p className="text-[10px] font-medium" style={{ color: '#ef4444' }}>{error}</p>
            )}
          </div>

          <div
            className="rounded-xl px-3 py-2.5 space-y-1"
            style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.15)' }}
          >
            <p className="text-[10px] font-semibold" style={{ color: '#f59e0b' }}>Ce qui sera sauvegarde :</p>
            <ul className="text-[10px] space-y-0.5" style={{ color: t.text.tertiary }}>
              <li>- Fond (couleur unie / degrade / direction)</li>
              <li>- Hauteur de page (desktop et mobile)</li>
              <li>- Elements (boutons, textes, positions, styles)</li>
              <li>- Mode d'arriere-plan</li>
            </ul>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl text-[11px] font-semibold transition-all hover:scale-105"
              style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.text.secondary }}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSaving || !name.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-bold transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: '#fff',
                boxShadow: '0 2px 12px rgba(245,158,11,0.3)',
              }}
            >
              {isSaving ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <BookmarkPlus className="w-3 h-3" />
              )}
              {isSaving ? 'Sauvegarde...' : 'Enregistrer le template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
