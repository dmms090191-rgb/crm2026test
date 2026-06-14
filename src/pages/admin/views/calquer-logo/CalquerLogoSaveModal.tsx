import { useState } from 'react';
import { Save, X, Loader2 } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (title: string) => Promise<void>;
  defaultTitle?: string;
}

export default function CalquerLogoSaveModal({ open, onClose, onSave, defaultTitle }: Props) {
  const [title, setTitle] = useState(defaultTitle || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const handleSave = async () => {
    if (!title.trim()) { setError('Entrez un titre'); return; }
    setSaving(true);
    setError('');
    try {
      await onSave(title.trim());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de sauvegarde');
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-sm rounded-xl p-5 space-y-4"
        style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 16px 48px rgba(0,0,0,0.4)' }}>

        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold" style={{ color: 'rgba(226,232,240,0.95)' }}>
            Sauvegarder le travail
          </h2>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-white/5 transition-colors">
            <X className="w-4 h-4" style={{ color: 'rgba(148,163,184,0.6)' }} />
          </button>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-medium" style={{ color: 'rgba(148,163,184,0.7)' }}>
            Nom de la sauvegarde
          </label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            placeholder="Ex: Logo Barbie test 1"
            autoFocus
            className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-all duration-200"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(226,232,240,0.9)',
            }}
          />
        </div>

        {error && (
          <p className="text-[11px] px-2" style={{ color: '#ef4444' }}>{error}</p>
        )}

        <div className="flex gap-2">
          <button onClick={onClose} disabled={saving}
            className="flex-1 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(226,232,240,0.7)' }}>
            Annuler
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 disabled:opacity-60 hover:enabled:scale-[1.02]"
            style={{
              background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
              color: '#fff',
              boxShadow: '0 2px 8px rgba(34,197,94,0.3)',
            }}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Sauvegarder
          </button>
        </div>
      </div>
    </div>
  );
}
