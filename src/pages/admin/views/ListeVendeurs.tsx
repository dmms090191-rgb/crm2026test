import { useState, useEffect } from 'react';
import { List, ChevronDown, LogIn, MessageSquare, Mail, Phone } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useThemeTokens } from '../../../hooks/useThemeTokens';
import type { Vendor } from './vendeurs/vendeurTypes';
import VendorDetailModal from './vendeurs/VendorDetailModal';
import DualScrollWrapper from '../../../components/DualScrollWrapper';

export type { Vendor } from './vendeurs/vendeurTypes';

interface ListeVendeursProps {
  onConnectAsVendor?: (vendor: Vendor) => void;
  onOpenChat?: (vendor: Vendor) => void;
}

export default function ListeVendeurs({ onConnectAsVendor, onOpenChat }: ListeVendeursProps) {
  const tokens = useThemeTokens();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);

  useEffect(() => {
    fetchVendors();
  }, []);

  async function fetchVendors() {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('vendors')
        .select('*')
        .order('created_at', { ascending: false });
      if (data) setVendors(data);
    } finally {
      setLoading(false);
    }
  }

  function handleUpdate() {
    fetchVendors();
    if (selectedVendor) {
      supabase.from('vendors').select('*').eq('id', selectedVendor.id).maybeSingle().then(({ data }) => {
        if (data) setSelectedVendor(data);
      });
    }
  }

  const maskedPassword = '••••••';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold" style={{ color: tokens.text.primary }}>Liste vendeurs</h2>
          <p className="text-xs mt-0.5" style={{ color: tokens.input.placeholder }}>Liste des vendeurs</p>
        </div>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: tokens.accent.bg, boxShadow: `0 0 16px ${tokens.accent.border}` }}
        >
          <List className="w-4 h-4" style={{ color: tokens.accent.text }} />
        </div>
      </div>

      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: tokens.card.bg,
          border: `1px solid ${tokens.card.border}`,
        }}
      >
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: tokens.accent.border, borderTopColor: tokens.accent.text }} />
          </div>
        ) : vendors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: tokens.accent.bg, border: `1px solid ${tokens.accent.border}` }}
            >
              <List className="w-5 h-5" style={{ color: tokens.accent.text }} />
            </div>
            <p className="text-sm" style={{ color: tokens.input.placeholder }}>Aucun vendeur enregistré</p>
            <p className="text-xs" style={{ color: tokens.text.quaternary }}>Créez un vendeur depuis l'onglet "Vendeur"</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block">
              <DualScrollWrapper deps={[loading, vendors.length]}>
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${tokens.table.headerBorder}` }}>
                      {['Prénom', 'Nom', 'Adresse email', 'Mot de passe', 'Téléphone', 'Actions'].map(col => (
                        <th
                          key={col}
                          className="px-5 py-3 text-left text-[10px] font-bold tracking-[0.15em] uppercase"
                          style={{ color: tokens.table.headerText }}
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {vendors.map((vendor, idx) => (
                      <tr
                        key={vendor.id}
                        data-row-id={vendor.id}
                        className="group transition-all duration-150"
                        style={{
                          borderBottom: idx < vendors.length - 1 ? `1px solid ${tokens.table.rowBorder}` : 'none',
                        }}
                      >
                        <td className="px-5 py-3.5">
                          <span className="text-sm font-medium" style={{ color: tokens.table.cellText }}>{vendor.first_name}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-sm font-medium" style={{ color: tokens.table.cellText }}>{vendor.last_name}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-sm" style={{ color: tokens.table.cellTextMuted }}>{vendor.email}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-sm font-mono tracking-widest" style={{ color: tokens.label.hint }}>{maskedPassword}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-sm" style={{ color: tokens.table.cellTextMuted }}>{vendor.phone || '\u2014'}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setSelectedVendor(vendor)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105"
                              style={{ background: tokens.accent.bg, border: `1px solid ${tokens.accent.border}`, color: tokens.accent.text }}
                            >
                              <ChevronDown className="w-3 h-3" />
                              Détail
                            </button>
                            <button
                              onClick={() => onConnectAsVendor?.(vendor)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105"
                              style={{ background: tokens.success.bg, border: `1px solid ${tokens.success.border}`, color: tokens.success.text }}
                            >
                              <LogIn className="w-3 h-3" />
                              Connect
                            </button>
                            <button
                              onClick={() => onOpenChat?.(vendor)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105"
                              style={{ background: tokens.accent.bg, border: `1px solid ${tokens.accent.border}`, color: tokens.accent.text }}
                              title="Ouvrir le chat"
                            >
                              <MessageSquare className="w-3 h-3" />
                              Chat
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </DualScrollWrapper>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y" style={{ borderColor: tokens.table.rowBorder }}>
              {vendors.map((vendor) => {
                const initials = `${(vendor.first_name?.[0] ?? '').toUpperCase()}${(vendor.last_name?.[0] ?? '').toUpperCase()}`;
                return (
                  <div key={vendor.id} className="px-4 py-4" style={{ borderColor: tokens.table.rowBorder }}>
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: 'linear-gradient(135deg, #22d3ee, #2563eb)', boxShadow: '0 2px 8px rgba(0,0,0,0.3)', color: '#fff' }}>{initials || '?'}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: tokens.table.cellText }}>{vendor.first_name} {vendor.last_name}</p>
                        {vendor.email && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <Mail className="w-3 h-3 flex-shrink-0" style={{ color: tokens.table.cellIcon }} />
                            <span className="text-xs truncate" style={{ color: tokens.table.cellTextMuted }}>{vendor.email}</span>
                          </div>
                        )}
                        {vendor.phone && (
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Phone className="w-3 h-3 flex-shrink-0" style={{ color: tokens.table.cellIcon }} />
                            <span className="text-xs" style={{ color: tokens.table.cellTextMuted }}>{vendor.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button onClick={() => setSelectedVendor(vendor)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all" style={{ background: tokens.accent.bg, border: `1px solid ${tokens.accent.border}`, color: tokens.accent.text }}>
                        <ChevronDown className="w-3 h-3" />Details
                      </button>
                      <button onClick={() => onOpenChat?.(vendor)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all" style={{ background: tokens.accent.bg, border: `1px solid ${tokens.accent.border}`, color: tokens.accent.text }}>
                        <MessageSquare className="w-3 h-3" />Message
                      </button>
                      <button onClick={() => onConnectAsVendor?.(vendor)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all" style={{ background: tokens.success.bg, border: `1px solid ${tokens.success.border}`, color: tokens.success.text }}>
                        <LogIn className="w-3 h-3" />Connect
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {selectedVendor && (
        <VendorDetailModal
          vendor={selectedVendor}
          onClose={() => setSelectedVendor(null)}
          onUpdate={handleUpdate}
        />
      )}
    </div>
  );
}
