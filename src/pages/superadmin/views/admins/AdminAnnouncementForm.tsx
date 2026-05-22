import { useState, useEffect } from 'react';
import { Save, Loader2, Eye, EyeOff } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { supabase } from '../../../../lib/supabase';

interface Announcement {
  id: string;
  company_id: string;
  title: string;
  message: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Props {
  companyId: string;
  editItem?: Announcement | null;
  onSaved: () => void;
  onCancelEdit?: () => void;
}

export default function AdminAnnouncementForm({ companyId, editItem, onSaved, onCancelEdit }: Props) {
  const tokens = useThemeTokens();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (editItem) {
      setTitle(editItem.title);
      setMessage(editItem.message);
      setIsActive(editItem.is_active);
    } else {
      setTitle('');
      setMessage('');
      setIsActive(true);
    }
    setError('');
    setSuccess('');
  }, [editItem]);

  const handleSave = async () => {
    if (!title.trim()) { setError('Le titre est requis.'); return; }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      if (editItem) {
        const { error: dbErr } = await supabase.from('admin_announcements').update({
          title: title.trim(),
          message: message.trim(),
          is_active: isActive,
          updated_at: new Date().toISOString(),
        }).eq('id', editItem.id);
        if (dbErr) throw dbErr;
      } else {
        const { error: dbErr } = await supabase.from('admin_announcements').insert({
          company_id: companyId,
          title: title.trim(),
          message: message.trim(),
          is_active: isActive,
        });
        if (dbErr) throw dbErr;
      }
      setSuccess(editItem ? 'Annonce modifiee' : 'Annonce creee');
      setTimeout(() => setSuccess(''), 2000);
      if (!editItem) {
        setTitle('');
        setMessage('');
        setIsActive(true);
      }
      onSaved();
    } catch {
      setError('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    background: tokens.input?.bg ?? tokens.surface.main,
    border: `1px solid ${tokens.input?.border ?? tokens.surface.border}`,
    color: tokens.input?.text ?? tokens.text.primary,
  };

  return (
    <div className="space-y-4">
      {editItem && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', color: '#f59e0b' }}>
          Modification de l'annonce : {editItem.title || '(sans titre)'}
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold mb-1.5" style={{ color: tokens.label.primary }}>Titre</label>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Ex: Mise a jour CRM"
          className="w-full px-3 py-2 rounded-lg text-sm"
          style={inputStyle}
        />
      </div>

      <div>
        <label className="block text-xs font-semibold mb-1.5" style={{ color: tokens.label.primary }}>Message</label>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Ex: Une nouvelle fonction IA est disponible dans votre CRM."
          rows={4}
          className="w-full px-3 py-2 rounded-lg text-sm resize-none"
          style={inputStyle}
        />
      </div>

      <div className="flex items-center justify-between py-2">
        <span className="text-xs font-semibold" style={{ color: tokens.label.primary }}>Annonce active</span>
        <button
          onClick={() => setIsActive(!isActive)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
          style={{
            background: isActive ? 'rgba(16,185,129,0.12)' : 'rgba(100,116,139,0.12)',
            border: `1px solid ${isActive ? 'rgba(16,185,129,0.3)' : 'rgba(100,116,139,0.2)'}`,
            color: isActive ? '#10b981' : '#94a3b8',
          }}
        >
          {isActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          {isActive ? 'Active' : 'Inactive'}
        </button>
      </div>

      {error && <p className="text-xs font-medium text-red-400">{error}</p>}
      {success && <p className="text-xs font-medium text-emerald-400">{success}</p>}

      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all hover:scale-105 disabled:opacity-50"
          style={{ background: tokens.accent.text, color: '#fff' }}
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          {editItem ? 'Enregistrer' : 'Creer l\'annonce'}
        </button>
        {editItem && onCancelEdit && (
          <button
            onClick={onCancelEdit}
            className="px-4 py-2 rounded-lg text-xs font-semibold"
            style={{ color: tokens.text.tertiary, background: tokens.surface.hover, border: `1px solid ${tokens.surface.borderLight}` }}
          >
            Annuler
          </button>
        )}
      </div>
    </div>
  );
}

export type { Announcement };
