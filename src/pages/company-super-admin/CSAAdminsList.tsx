import { useState, useEffect, useCallback } from 'react';
import { Users, RefreshCw, AlertCircle, UserCheck, UserX, Plus, MoreHorizontal, User, Mail, Building2, Phone, Shield, CalendarDays, Lock, Settings } from 'lucide-react';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import { supabase } from '../../lib/supabase';
import CSAAdminsCreateModal from './CSAAdminsCreateModal';
import CSAAdminActionsModal from './CSAAdminActionsModal';
import CSAAdminDetailModal from './CSAAdminDetailModal';

export interface CSAAdminUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  company: string;
  company_id: string;
  role: string;
  pin: string;
  created_at: string;
  last_sign_in_at: string | null;
  access_enabled: boolean;
}

function formatDate(d: string | null) {
  if (!d) return '\u2014';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function CSAAdminsList({ companyId, onConnectAsAdmin }: { companyId: string; onConnectAsAdmin?: (admin: CSAAdminUser) => void }) {
  const t = useThemeTokens();
  const [admins, setAdmins] = useState<CSAAdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [actionsAdmin, setActionsAdmin] = useState<CSAAdminUser | null>(null);
  const [detailAdmin, setDetailAdmin] = useState<CSAAdminUser | null>(null);

  const fetchAdmins = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError('Session expiree'); setLoading(false); return; }
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-admins-for-super-admin`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          Apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ target_company_id: companyId }),
      });
      if (!res.ok) { setError('Erreur lors du chargement'); setLoading(false); return; }
      const data = await res.json();
      setAdmins(data.admins ?? []);
    } catch {
      setError('Erreur reseau');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => { fetchAdmins(); }, [fetchAdmins]);

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg sm:text-xl font-bold" style={{ color: t.text.primary }}>Liste des admins</h2>
          <p className="text-xs mt-0.5" style={{ color: t.text.tertiary }}>
            {admins.length} admin{admins.length !== 1 ? 's' : ''} dans votre societe
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:scale-105 hover:brightness-110"
            style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', boxShadow: '0 2px 8px rgba(245,158,11,0.35)' }}
          >
            <Plus className="w-3.5 h-3.5" />
            Creer un admin
          </button>
          <button
            onClick={fetchAdmins}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105"
            style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.text.secondary }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: t.accent.bg, boxShadow: `0 0 16px ${t.accent.border}` }}>
            <Users className="w-4 h-4" style={{ color: t.accent.text }} />
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl" style={{ background: t.danger.bg, border: `1px solid ${t.danger.border}` }}>
          <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: t.danger.text }} />
          <p className="text-xs font-medium" style={{ color: t.danger.text }}>{error}</p>
        </div>
      )}

      <div className="rounded-2xl overflow-hidden" style={{
        background: `linear-gradient(135deg, ${t.surface.secondary}, ${t.surface.secondary}80)`,
        border: `1px solid ${t.surface.border}`,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
      }}>
        {loading && admins.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="w-6 h-6 animate-spin" style={{ color: t.text.tertiary }} />
          </div>
        ) : admins.length === 0 && !error ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: t.accent.bg, border: `1px solid ${t.accent.border}` }}>
              <Users className="w-5 h-5" style={{ color: t.accent.text }} />
            </div>
            <p className="text-sm font-medium" style={{ color: t.text.tertiary }}>Aucun admin — cliquez sur "Creer un admin" pour commencer</p>
          </div>
        ) : (
          <>
            <CSAAdminsDesktopTable admins={admins} t={t} onActions={setActionsAdmin} />
            <CSAAdminsMobileList admins={admins} t={t} onActions={setActionsAdmin} />
          </>
        )}
      </div>

      {showCreate && (
        <CSAAdminsCreateModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); fetchAdmins(); }}
          targetCompanyId={companyId}
        />
      )}
      {actionsAdmin && (
        <CSAAdminActionsModal
          admin={actionsAdmin}
          onClose={() => setActionsAdmin(null)}
          onDetail={a => { setActionsAdmin(null); setDetailAdmin(a); }}
          onConnect={a => { setActionsAdmin(null); onConnectAsAdmin?.(a); }}
        />
      )}
      {detailAdmin && (
        <CSAAdminDetailModal
          admin={detailAdmin}
          onClose={() => setDetailAdmin(null)}
          onUpdate={fetchAdmins}
        />
      )}
    </div>
  );
}

interface TableProps {
  admins: CSAAdminUser[];
  t: ReturnType<typeof useThemeTokens>;
  onActions: (admin: CSAAdminUser) => void;
}

const COL_ICONS: Record<string, React.FC<{ className?: string; style?: React.CSSProperties }>> = {
  Prenom: User, Nom: User, Email: Mail, Societe: Building2, Telephone: Phone,
  Role: Shield, 'Cree le': CalendarDays, Acces: Lock, Actions: Settings,
};

function CSAAdminsDesktopTable({ admins, t, onActions }: TableProps) {
  const cols = ['Prenom', 'Nom', 'Email', 'Societe', 'Telephone', 'Role', 'Cree le', 'Acces', 'Actions'];
  return (
    <div className="hidden md:block overflow-x-auto">
      <table className="w-full table-auto" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
        <thead>
          <tr style={{ background: t.table.headerBg }}>
            {cols.map((col) => {
              const Icon = COL_ICONS[col];
              return (
                <th key={col} className="px-5 py-4 text-left" style={{ borderBottom: `2px solid ${t.accent.solid}` }}>
                  <div className="flex items-center gap-2">
                    {Icon && <Icon className="w-3 h-3 flex-shrink-0" style={{ color: t.accent.text, opacity: 0.6 }} />}
                    <span className="text-[10px] font-bold tracking-[0.1em] uppercase" style={{ color: t.table.headerText }}>{col}</span>
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {admins.map((admin, idx) => (
            <tr key={admin.id} style={{ borderBottom: idx < admins.length - 1 ? `1px solid ${t.table.rowBorder}` : 'none' }}
              className="transition-colors duration-100"
              onMouseEnter={e => { e.currentTarget.style.background = t.table.rowHover; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              <td className="px-4 py-3 text-xs font-medium" style={{ color: t.text.primary, borderRight: `1px solid ${t.table.rowBorder}` }}>{admin.first_name || '\u2014'}</td>
              <td className="px-4 py-3 text-xs font-medium" style={{ color: t.text.primary, borderRight: `1px solid ${t.table.rowBorder}` }}>{admin.last_name || '\u2014'}</td>
              <td className="px-4 py-3 text-xs" style={{ color: t.text.secondary, borderRight: `1px solid ${t.table.rowBorder}` }}>{admin.email}</td>
              <td className="px-4 py-3 text-xs font-medium" style={{ color: t.text.secondary, borderRight: `1px solid ${t.table.rowBorder}` }}>{admin.company || '\u2014'}</td>
              <td className="px-4 py-3 text-xs font-mono" style={{ color: t.text.secondary, borderRight: `1px solid ${t.table.rowBorder}` }}>{admin.phone || '\u2014'}</td>
              <td className="px-4 py-3 text-xs" style={{ color: t.text.secondary, borderRight: `1px solid ${t.table.rowBorder}` }}>
                <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold" style={{ background: t.accent.bg, border: `1px solid ${t.accent.border}`, color: t.accent.text }}>
                  {admin.role || 'admin'}
                </span>
              </td>
              <td className="px-4 py-3 text-xs" style={{ color: t.text.tertiary, borderRight: `1px solid ${t.table.rowBorder}` }}>{formatDate(admin.created_at)}</td>
              <td className="px-4 py-3" style={{ borderRight: `1px solid ${t.table.rowBorder}` }}>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold" style={
                  admin.access_enabled
                    ? { background: t.success.bg, border: `1px solid ${t.success.border}`, color: t.success.text }
                    : { background: t.danger.bg, border: `1px solid ${t.danger.border}`, color: t.danger.text }
                }>
                  {admin.access_enabled ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                  {admin.access_enabled ? 'Actif' : 'Inactif'}
                </span>
              </td>
              <td className="px-4 py-3 text-center">
                <button
                  onClick={() => onActions(admin)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200"
                  style={{ background: t.accent.bg, border: `1px solid ${t.accent.border}`, color: t.accent.text }}
                  onMouseEnter={e => { e.currentTarget.style.background = t.accent.bgHover; e.currentTarget.style.boxShadow = `0 2px 8px ${t.accent.bg}`; }}
                  onMouseLeave={e => { e.currentTarget.style.background = t.accent.bg; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  <MoreHorizontal className="w-3.5 h-3.5" />Actions
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CSAAdminsMobileList({ admins, t, onActions }: TableProps) {
  return (
    <div className="md:hidden divide-y" style={{ borderColor: t.table.rowBorder }}>
      {admins.map(admin => (
        <div key={admin.id} className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0" style={{
              background: admin.access_enabled
                ? `linear-gradient(135deg, ${t.accent.text}, ${t.accent.text}cc)`
                : `linear-gradient(135deg, ${t.text.quaternary}, ${t.text.quaternary}cc)`,
            }}>
              {(admin.first_name || admin.email).charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate" style={{ color: t.text.primary }}>
                {[admin.first_name, admin.last_name].filter(Boolean).join(' ') || admin.email}
              </p>
              <p className="text-xs truncate" style={{ color: t.text.tertiary }}>{admin.email}</p>
            </div>
            <button
              onClick={() => onActions(admin)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold flex-shrink-0 transition-all duration-200"
              style={{ background: t.accent.bg, border: `1px solid ${t.accent.border}`, color: t.accent.text }}
            >
              <MoreHorizontal className="w-3.5 h-3.5" />Actions
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-[10px] font-bold tracking-wider uppercase block mb-0.5" style={{ color: t.text.quaternary }}>Societe</span>
              <span className="font-medium" style={{ color: t.text.secondary }}>{admin.company || '\u2014'}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold tracking-wider uppercase block mb-0.5" style={{ color: t.text.quaternary }}>Acces</span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold" style={
                admin.access_enabled
                  ? { background: t.success.bg, color: t.success.text }
                  : { background: t.danger.bg, color: t.danger.text }
              }>
                {admin.access_enabled ? 'Actif' : 'Inactif'}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold tracking-wider uppercase block mb-0.5" style={{ color: t.text.quaternary }}>Telephone</span>
              <span className="font-mono" style={{ color: t.text.secondary }}>{admin.phone || '\u2014'}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold tracking-wider uppercase block mb-0.5" style={{ color: t.text.quaternary }}>Cree le</span>
              <span style={{ color: t.text.secondary }}>{formatDate(admin.created_at)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
