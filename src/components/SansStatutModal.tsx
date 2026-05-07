import { useState } from 'react';
import { X, Tag, Users, User, Phone, Mail } from 'lucide-react';
import { useThemeTokens } from '../hooks/useThemeTokens';
import type { SansStatutLead, VendorCount } from '../hooks/useSansStatutStats';

interface SansStatutModalProps {
  open: boolean;
  onClose: () => void;
  role: 'admin' | 'vendor';
  count: number;
  adminCount?: number;
  byVendor?: VendorCount[];
  leads: SansStatutLead[];
  vendors?: { id: string; name: string }[];
  loading?: boolean;
}

type FilterKey = 'all' | 'admin' | string;

export default function SansStatutModal({
  open,
  onClose,
  role,
  count,
  adminCount = 0,
  byVendor = [],
  leads,
  vendors = [],
  loading = false,
}: SansStatutModalProps) {
  const tokens = useThemeTokens();
  const [filter, setFilter] = useState<FilterKey>('all');

  if (!open) return null;

  const filteredLeads = role === 'vendor'
    ? leads
    : filter === 'all'
      ? leads
      : filter === 'admin'
        ? leads.filter(l => !l.vendor_id)
        : leads.filter(l => l.vendor_id === filter);

  const filterCount = (key: FilterKey): number => {
    if (key === 'all') return count;
    if (key === 'admin') return adminCount;
    return byVendor.find(v => v.vendorId === key)?.count ?? 0;
  };

  const filters: { key: FilterKey; label: string }[] = [
    { key: 'all', label: 'Tous' },
    { key: 'admin', label: 'Admin' },
    ...vendors
      .filter(v => byVendor.some(bv => bv.vendorId === v.id))
      .map(v => ({ key: v.id, label: v.name })),
  ];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div
        className="absolute inset-0 backdrop-blur-sm"
        style={{ background: 'rgba(0,0,0,0.6)' }}
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-[1050px] flex flex-col rounded-2xl overflow-hidden"
        style={{
          height: '78vh',
          background: tokens.card.bg,
          border: `1px solid ${tokens.card.border}`,
          boxShadow: '0 25px 50px rgba(0,0,0,0.4)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: `1px solid ${tokens.surface.border}` }}>
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(45,212,191,0.1)', color: '#2dd4bf' }}
            >
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold" style={{ color: tokens.text.primary }}>
                Sans statut
              </h3>
              <p className="text-xs" style={{ color: tokens.text.quaternary }}>
                {role === 'admin' ? `Total CRM : ${count} lead${count !== 1 ? 's' : ''}` : `${count} lead${count !== 1 ? 's' : ''}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: tokens.text.tertiary }}
            onMouseEnter={e => (e.currentTarget.style.background = tokens.surface.hover)}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Admin stats strip */}
        {role === 'admin' && (
          <div className="flex items-center gap-4 px-6 py-3" style={{ borderBottom: `1px solid ${tokens.surface.borderLight}` }}>
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" style={{ color: '#2dd4bf' }} />
              <span className="text-xs font-medium" style={{ color: tokens.text.secondary }}>
                Admin : <span className="font-bold" style={{ color: tokens.text.primary }}>{adminCount}</span>
              </span>
            </div>
            {byVendor.map(v => (
              <div key={v.vendorId} className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" style={{ color: tokens.text.quaternary }} />
                <span className="text-xs" style={{ color: tokens.text.tertiary }}>
                  {v.vendorName} : <span className="font-semibold" style={{ color: tokens.text.primary }}>{v.count}</span>
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Filters (admin only) */}
        {role === 'admin' && (
          <div className="flex items-center gap-2 px-6 py-3 flex-wrap" style={{ borderBottom: `1px solid ${tokens.surface.borderLight}` }}>
            {filters.map(f => {
              const active = filter === f.key;
              return (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className="px-3 py-1 rounded-lg text-xs font-semibold transition-all"
                  style={active
                    ? { background: 'rgba(45,212,191,0.1)', color: '#2dd4bf', border: '1px solid rgba(45,212,191,0.25)' }
                    : { background: 'transparent', color: tokens.text.tertiary, border: `1px solid ${tokens.surface.borderLight}` }
                  }
                >
                  {f.label} ({filterCount(f.key)})
                </button>
              );
            })}
          </div>
        )}

        {/* Leads list */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: tokens.surface.border, borderTopColor: '#2dd4bf' }} />
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <Tag className="w-5 h-5" style={{ color: tokens.text.quaternary }} />
              <p className="text-sm" style={{ color: tokens.text.quaternary }}>Aucun lead pour ce filtre</p>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: `1px solid ${tokens.surface.borderLight}` }}>
                  <th className="text-left py-2 font-semibold" style={{ color: tokens.text.tertiary }}>Prenom</th>
                  <th className="text-left py-2 font-semibold" style={{ color: tokens.text.tertiary }}>Nom</th>
                  <th className="text-left py-2 font-semibold" style={{ color: tokens.text.tertiary }}>Email</th>
                  <th className="text-left py-2 font-semibold" style={{ color: tokens.text.tertiary }}>Telephone</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map(lead => (
                  <tr
                    key={lead.id}
                    className="transition-colors"
                    style={{ borderBottom: `1px solid ${tokens.surface.borderLight}` }}
                    onMouseEnter={e => (e.currentTarget.style.background = tokens.surface.hover)}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td className="py-2.5" style={{ color: tokens.text.primary }}>{lead.prenom || '—'}</td>
                    <td className="py-2.5" style={{ color: tokens.text.primary }}>{lead.nom || '—'}</td>
                    <td className="py-2.5">
                      {lead.email ? (
                        <span className="flex items-center gap-1" style={{ color: tokens.text.secondary }}>
                          <Mail className="w-3 h-3" style={{ color: tokens.text.quaternary }} />
                          {lead.email}
                        </span>
                      ) : (
                        <span style={{ color: tokens.text.quaternary }}>—</span>
                      )}
                    </td>
                    <td className="py-2.5">
                      {lead.telephone ? (
                        <span className="flex items-center gap-1" style={{ color: tokens.text.secondary }}>
                          <Phone className="w-3 h-3" style={{ color: tokens.text.quaternary }} />
                          {lead.telephone}
                        </span>
                      ) : (
                        <span style={{ color: tokens.text.quaternary }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 px-6 py-3 flex items-center justify-between" style={{ borderTop: `1px solid ${tokens.surface.border}` }}>
          <p className="text-xs" style={{ color: tokens.text.quaternary }}>
            {filteredLeads.length} lead{filteredLeads.length !== 1 ? 's' : ''} affiche{filteredLeads.length !== 1 ? 's' : ''}
          </p>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{ background: 'rgba(45,212,191,0.1)', color: '#2dd4bf', border: '1px solid rgba(45,212,191,0.25)' }}
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
