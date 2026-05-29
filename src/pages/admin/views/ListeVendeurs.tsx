import { useState, useEffect, useCallback } from 'react';
import { List, MoreHorizontal, Mail, Phone, CheckSquare, Trash2, X, Lock, Unlock } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useThemeTokens } from '../../../hooks/useThemeTokens';
import { useSimulation } from '../../../contexts/SimulationContext';
import { useCompanyId } from '../../../hooks/useCompanyId';
import type { Vendor } from './vendeurs/vendeurTypes';
import VendorDetailModal from './vendeurs/VendorDetailModal';
import VendorDeleteModal from './vendeurs/VendorDeleteModal';
import VendorActionModal from './vendeurs/VendorActionModal';
import ListeVendeursMobileCard from './vendeurs/ListeVendeursMobileCard';
import DualScrollWrapper from '../../../components/DualScrollWrapper';
import CheckBox from './crm/CheckBox';
import CopyButton from '../../../components/CopyButton';

export type { Vendor } from './vendeurs/vendeurTypes';

interface ListeVendeursProps {
  onConnectAsVendor?: (vendor: Vendor) => void;
  onOpenChat?: (vendor: Vendor) => void;
}

export default function ListeVendeurs({ onConnectAsVendor, onOpenChat }: ListeVendeursProps) {
  const tokens = useThemeTokens();
  const { isSimulating } = useSimulation();
  const companyId = useCompanyId();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [actionVendor, setActionVendor] = useState<Vendor | null>(null);
  const [actionsSourceVendor, setActionsSourceVendor] = useState<Vendor | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => { if (companyId) fetchVendors(); }, [companyId]);

  async function fetchVendors() {
    if (!companyId) return;
    setLoading(true);
    try {
      const { data } = await supabase.from('vendors').select('*').eq('company_id', companyId).order('created_at', { ascending: false });
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

  const toggleSelect = useCallback((id: string) => {
    setSelected(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }, []);

  const toggleAll = useCallback(() => {
    setSelected(prev => prev.size === vendors.length ? new Set() : new Set(vendors.map(v => v.id)));
  }, [vendors]);

  const exitSelectMode = useCallback(() => {
    setSelectMode(false);
    setSelected(new Set());
  }, []);

  const handleDeleteSuccess = useCallback(() => {
    setShowDeleteModal(false);
    setSelected(new Set());
    setSelectMode(false);
    fetchVendors();
  }, []);

  const toggleColumnLock = useCallback(async (vendorId: string) => {
    const vendor = vendors.find(v => v.id === vendorId);
    if (!vendor || isSimulating) return;
    const newVal = !(vendor.can_customize_columns !== false);
    setVendors(prev => prev.map(v => v.id === vendorId ? { ...v, can_customize_columns: newVal } : v));
    await supabase.from('vendors').update({ can_customize_columns: newVal }).eq('id', vendorId);
  }, [vendors, isSimulating]);

  const maskedPassword = '••••••';
  const allChecked = vendors.length > 0 && selected.size === vendors.length;
  const someChecked = selected.size > 0 && selected.size < vendors.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold" style={{ color: tokens.text.primary }}>Liste vendeurs</h2>
          <p className="text-xs mt-0.5" style={{ color: tokens.input.placeholder }}>
            {vendors.length} vendeur{vendors.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectMode ? (
            <>
              {selected.size > 0 && (
                <button
                  onClick={() => { if (!isSimulating) setShowDeleteModal(true); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105"
                  style={{ background: tokens.danger.bg, border: `1px solid ${tokens.danger.border}`, color: tokens.danger.text, opacity: isSimulating ? 0.5 : 1 }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Supprimer {selected.size}
                </button>
              )}
              <button
                onClick={exitSelectMode}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105"
                style={{ background: tokens.surface.secondary, border: `1px solid ${tokens.surface.border}`, color: tokens.text.secondary }}
              >
                <X className="w-3.5 h-3.5" />
                Annuler
              </button>
            </>
          ) : (
            <button
              onClick={() => setSelectMode(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105"
              style={{ background: tokens.accent.bg, border: `1px solid ${tokens.accent.border}`, color: tokens.accent.text }}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              Selectionner
            </button>
          )}
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: tokens.accent.bg, boxShadow: `0 0 16px ${tokens.accent.border}` }}
          >
            <List className="w-4 h-4" style={{ color: tokens.accent.text }} />
          </div>
        </div>
      </div>

      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: tokens.card.bg, border: `1px solid ${tokens.card.border}` }}
      >
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: tokens.accent.border, borderTopColor: tokens.accent.text }} />
          </div>
        ) : vendors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: tokens.accent.bg, border: `1px solid ${tokens.accent.border}` }}>
              <List className="w-5 h-5" style={{ color: tokens.accent.text }} />
            </div>
            <p className="text-sm" style={{ color: tokens.input.placeholder }}>Aucun vendeur enregistre</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block">
              <DualScrollWrapper deps={[loading, vendors.length, selectMode]}>
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${tokens.table.headerBorder}` }}>
                      {selectMode && (
                        <th className="px-3 py-3 w-10">
                          <CheckBox checked={allChecked} indeterminate={someChecked} onChange={toggleAll} />
                        </th>
                      )}
                      {['Prenom', 'Nom', 'Adresse email', 'Mot de passe', 'Telephone', 'Colonnes', 'Actions'].map(col => (
                        <th key={col} className="px-5 py-3 text-left text-[10px] font-bold tracking-[0.15em] uppercase" style={{ color: tokens.table.headerText }}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {vendors.map((vendor, idx) => (
                      <tr
                        key={vendor.id}
                        data-row-id={vendor.id}
                        className="group transition-all duration-150"
                        style={{ borderBottom: idx < vendors.length - 1 ? `1px solid ${tokens.table.rowBorder}` : 'none', background: selected.has(vendor.id) ? tokens.accent.bg : undefined }}
                      >
                        {selectMode && (
                          <td className="px-3 py-3.5">
                            <CheckBox checked={selected.has(vendor.id)} onChange={() => toggleSelect(vendor.id)} />
                          </td>
                        )}
                        <td className="px-5 py-3.5"><span className="text-sm font-medium" style={{ color: tokens.table.cellText }}>{vendor.first_name}</span></td>
                        <td className="px-5 py-3.5"><span className="text-sm font-medium" style={{ color: tokens.table.cellText }}>{vendor.last_name}</span></td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1">
                            <span className="text-sm truncate" style={{ color: tokens.table.cellTextMuted }}>{vendor.email}</span>
                            {vendor.email && <CopyButton value={vendor.email} />}
                          </div>
                        </td>
                        <td className="px-5 py-3.5"><span className="text-sm font-mono tracking-widest" style={{ color: tokens.label.hint }}>{maskedPassword}</span></td>
                        <td className="px-5 py-3.5"><span className="text-sm" style={{ color: tokens.table.cellTextMuted }}>{vendor.phone || '\u2014'}</span></td>
                        <td className="px-5 py-3.5">
                          {(() => {
                            const unlocked = vendor.can_customize_columns !== false;
                            return (
                              <button
                                onClick={() => toggleColumnLock(vendor.id)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105"
                                style={unlocked
                                  ? { background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', color: '#16a34a' }
                                  : { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }
                                }
                                title={unlocked ? 'Le vendeur peut personnaliser ses colonnes' : 'Le vendeur ne peut pas personnaliser ses colonnes'}
                              >
                                {unlocked ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                                {unlocked ? 'Libre' : 'Bloque'}
                              </button>
                            );
                          })()}
                        </td>
                        <td className="px-5 py-3.5">
                          <button
                            onClick={() => setActionVendor(vendor)}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200"
                            style={{ background: tokens.accent.bg, border: `1px solid ${tokens.accent.border}`, color: tokens.accent.text }}
                            onMouseEnter={e => { e.currentTarget.style.background = tokens.accent.bgHover; e.currentTarget.style.boxShadow = `0 2px 8px ${tokens.accent.bg}`; }}
                            onMouseLeave={e => { e.currentTarget.style.background = tokens.accent.bg; e.currentTarget.style.boxShadow = 'none'; }}
                          >
                            <MoreHorizontal className="w-3.5 h-3.5" />Actions
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </DualScrollWrapper>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y" style={{ borderColor: tokens.table.rowBorder }}>
              {vendors.map((vendor) => (
                <ListeVendeursMobileCard
                  key={vendor.id}
                  vendor={vendor}
                  isSelected={selected.has(vendor.id)}
                  selectMode={selectMode}
                  onToggleSelect={toggleSelect}
                  onDetail={(v, fromActions) => { if (fromActions) setActionsSourceVendor(v); setSelectedVendor(v); }}
                  onOpenChat={onOpenChat}
                  onConnectAsVendor={onConnectAsVendor}
                  tokens={tokens}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {selectedVendor && (
        <VendorDetailModal
          vendor={selectedVendor}
          onClose={() => { setSelectedVendor(null); setActionsSourceVendor(null); }}
          onUpdate={handleUpdate}
          onBack={actionsSourceVendor ? () => { setSelectedVendor(null); setActionVendor(actionsSourceVendor); } : undefined}
        />
      )}

      {actionVendor && (
        <VendorActionModal
          vendor={actionVendor}
          tokens={tokens}
          onClose={() => { setActionVendor(null); setActionsSourceVendor(null); }}
          onDetail={() => { setActionsSourceVendor(actionVendor); setSelectedVendor(actionVendor); setActionVendor(null); }}
          onConnect={() => { onConnectAsVendor?.(actionVendor); setActionVendor(null); setActionsSourceVendor(null); }}
          onChat={() => { onOpenChat?.(actionVendor); setActionVendor(null); setActionsSourceVendor(null); }}
        />
      )}

      {showDeleteModal && (
        <VendorDeleteModal
          vendorIds={Array.from(selected)}
          vendors={vendors}
          onClose={() => setShowDeleteModal(false)}
          onSuccess={handleDeleteSuccess}
        />
      )}
    </div>
  );
}
