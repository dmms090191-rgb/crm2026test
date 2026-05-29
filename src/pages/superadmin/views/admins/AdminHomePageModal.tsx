import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, ArrowLeft, Megaphone, PlusCircle, List, Loader2 } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { supabase } from '../../../../lib/supabase';
import type { AdminUser } from '../SAAdmins';
import AdminAnnouncementForm from './AdminAnnouncementForm';
import AdminAnnouncementList from './AdminAnnouncementList';
import type { Announcement } from './AdminAnnouncementForm';

interface AdminHomePageModalProps {
  admin: AdminUser;
  onClose: () => void;
  onBack?: () => void;
}

const TABS = [
  { key: 'create', label: 'Creer une annonce', icon: PlusCircle },
  { key: 'list', label: 'Liste des annonces', icon: List },
] as const;

type TabKey = (typeof TABS)[number]['key'];

function AdminHomePageModal({ admin, onClose, onBack }: AdminHomePageModalProps) {
  const tokens = useThemeTokens();
  const [tab, setTab] = useState<TabKey>('create');
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [editItem, setEditItem] = useState<Announcement | null>(null);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const loadAnnouncements = useCallback(async () => {
    if (!admin.company_id) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from('admin_announcements')
      .select('*')
      .eq('company_id', admin.company_id)
      .order('created_at', { ascending: false });
    setAnnouncements((data ?? []) as Announcement[]);
    setLoading(false);
  }, [admin.company_id]);

  useEffect(() => { loadAnnouncements(); }, [loadAnnouncements]);

  const handleEdit = (a: Announcement) => {
    setEditItem(a);
    setTab('create');
  };

  const handleSaved = () => {
    loadAnnouncements();
  };

  const handleCancelEdit = () => {
    setEditItem(null);
  };

  const handleTabChange = (key: TabKey) => {
    if (key === 'list') setEditItem(null);
    setTab(key);
  };

  return createPortal(
    <div
      className="flex items-center justify-center p-4"
      style={{
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100dvh',
        zIndex: 99999, background: tokens.modal.overlayBg,
        backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-lg rounded-2xl overflow-hidden flex flex-col"
        style={{ background: tokens.modal.bg, border: `1px solid ${tokens.modal.border}`, boxShadow: tokens.modal.shadow, height: 'min(540px, 90dvh)' }}
      >
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0 gap-3" style={{ borderBottom: `1px solid ${tokens.surface.border}` }}>
          <div className="flex items-center gap-3 min-w-0">
            {onBack && (
              <button
                onClick={onBack}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all flex-shrink-0 hover:scale-105"
                style={{ background: tokens.surface.secondary, border: `1px solid ${tokens.surface.border}`, color: tokens.text.secondary }}
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
              <Megaphone className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate" style={{ color: tokens.modal.title }}>
                Annonces — {admin.company || 'Sans societe'}
              </p>
              <p className="text-xs truncate" style={{ color: tokens.modal.subtitle }}>{admin.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: tokens.modal.closeBtnBg, color: tokens.modal.closeBtnText }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex px-6 pt-3 gap-1" style={{ borderBottom: `1px solid ${tokens.surface.border}` }}>
          {TABS.map(t => {
            const active = tab === t.key;
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => handleTabChange(t.key)}
                className="flex items-center gap-1.5 px-3 pb-2.5 text-xs font-semibold transition-all relative"
                style={{ color: active ? tokens.accent.text : tokens.text.tertiary }}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
                {t.key === 'list' && announcements.length > 0 && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
                    {announcements.length}
                  </span>
                )}
                {active && (
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full" style={{ background: tokens.accent.text }} />
                )}
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {!admin.company_id ? (
            <p className="text-sm text-center py-8" style={{ color: tokens.text.tertiary }}>Cet admin n'est rattache a aucune societe.</p>
          ) : loading && tab === 'list' ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: tokens.accent.text }} />
            </div>
          ) : tab === 'create' ? (
            <AdminAnnouncementForm
              companyId={admin.company_id}
              editItem={editItem}
              onSaved={handleSaved}
              onCancelEdit={editItem ? handleCancelEdit : undefined}
            />
          ) : (
            <AdminAnnouncementList
              announcements={announcements}
              loading={loading}
              onEdit={handleEdit}
              onRefresh={loadAnnouncements}
            />
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

export default AdminHomePageModal;
