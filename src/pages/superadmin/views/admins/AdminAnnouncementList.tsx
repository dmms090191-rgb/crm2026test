import { useState } from 'react';
import { Pencil, Trash2, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { supabase } from '../../../../lib/supabase';
import type { Announcement } from './AdminAnnouncementForm';

interface Props {
  announcements: Announcement[];
  loading: boolean;
  onEdit: (a: Announcement) => void;
  onRefresh: () => void;
}

export default function AdminAnnouncementList({ announcements, loading, onEdit, onRefresh }: Props) {
  const tokens = useThemeTokens();
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  const handleToggle = async (a: Announcement) => {
    setToggling(a.id);
    await supabase.from('admin_announcements').update({
      is_active: !a.is_active,
      updated_at: new Date().toISOString(),
    }).eq('id', a.id);
    setToggling(null);
    onRefresh();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('admin_announcements').delete().eq('id', id);
    setDeleteConfirm(null);
    onRefresh();
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: tokens.accent.text }} />
      </div>
    );
  }

  if (announcements.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-2">
        <p className="text-sm" style={{ color: tokens.text.quaternary }}>Aucune annonce</p>
        <p className="text-xs" style={{ color: tokens.label.hint }}>Creez votre premiere annonce dans l'onglet "Creer"</p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {announcements.map(a => (
        <div
          key={a.id}
          className="rounded-xl p-3.5 transition-all"
          style={{
            background: tokens.surface.secondary,
            border: `1px solid ${a.is_active ? 'rgba(16,185,129,0.25)' : tokens.surface.border}`,
          }}
        >
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-semibold truncate" style={{ color: tokens.text.primary }}>
                  {a.title || '(sans titre)'}
                </p>
                <span
                  className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full flex-shrink-0"
                  style={a.is_active
                    ? { background: 'rgba(16,185,129,0.12)', color: '#10b981' }
                    : { background: 'rgba(100,116,139,0.12)', color: '#94a3b8' }
                  }
                >
                  {a.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              {a.message && (
                <p className="text-xs leading-relaxed line-clamp-2" style={{ color: tokens.text.tertiary }}>
                  {a.message}
                </p>
              )}
              <p className="text-[10px] mt-1.5" style={{ color: tokens.label.hint }}>
                {formatDate(a.created_at)}
              </p>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => handleToggle(a)}
                disabled={toggling === a.id}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:scale-110 disabled:opacity-50"
                style={{
                  background: a.is_active ? 'rgba(16,185,129,0.1)' : 'rgba(100,116,139,0.1)',
                  color: a.is_active ? '#10b981' : '#94a3b8',
                }}
                title={a.is_active ? 'Desactiver' : 'Activer'}
              >
                {toggling === a.id
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : a.is_active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />
                }
              </button>
              <button
                onClick={() => onEdit(a)}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:scale-110"
                style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}
                title="Modifier"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              {deleteConfirm === a.id ? (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleDelete(a.id)}
                    className="px-2 py-1 rounded text-[10px] font-bold"
                    style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}
                  >
                    Oui
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="px-2 py-1 rounded text-[10px] font-bold"
                    style={{ background: tokens.surface.hover, color: tokens.text.secondary }}
                  >
                    Non
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setDeleteConfirm(a.id)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:scale-110"
                  style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444' }}
                  title="Supprimer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
