import { useState, useEffect, useRef } from 'react';
import { Search, X, ArrowRightLeft, UserCheck, ShieldCheck } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import type { Vendor } from './types';

interface TransferModalProps {
  count: number;
  onClose: () => void;
  onConfirm: (vendorId: string | null) => void;
}

export default function TransferModal({ count, onClose, onConfirm }: TransferModalProps) {
  const tokens = useThemeTokens();

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [transferring, setTransferring] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.from('vendors').select('id, first_name, last_name, email').order('last_name', { ascending: true }).then(({ data }) => {
      setVendors((data ?? []) as Vendor[]);
      setLoading(false);
    });
  }, []);

  const q = search.toLowerCase();
  const filtered = vendors.filter(v => {
    const full = `${v.first_name} ${v.last_name}`.toLowerCase();
    const fullRev = `${v.last_name} ${v.first_name}`.toLowerCase();
    return full.includes(q) || fullRev.includes(q) || (v.email ?? '').toLowerCase().includes(q);
  });

  const handleConfirm = async () => {
    if (selected === undefined) return;
    setTransferring(true);
    await onConfirm(selected);
    setTransferring(false);
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: tokens.modal.overlayBg, backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl overflow-hidden"
        style={{
          background: tokens.modal.bg,
          border: tokens.modal.border,
          boxShadow: tokens.modal.shadow,
        }}
      >
        <div className="h-0.5 w-full" style={{ background: 'linear-gradient(90deg, #22d3ee, #3b82f6)' }} />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-xl flex items-center justify-center transition-all"
          style={{ background: tokens.modal.closeBtnBg, color: tokens.modal.closeBtnText }}
          onMouseEnter={e => { e.currentTarget.style.background = tokens.modal.closeBtnHoverBg; e.currentTarget.style.color = tokens.modal.closeBtnHoverText; }}
          onMouseLeave={e => { e.currentTarget.style.background = tokens.modal.closeBtnBg; e.currentTarget.style.color = tokens.modal.closeBtnText; }}
        >
          <X className="w-4 h-4" />
        </button>

        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: tokens.accent.bg, border: `1px solid ${tokens.accent.border}` }}>
              <ArrowRightLeft className="w-4 h-4" style={{ color: tokens.accent.text }} />
            </div>
            <div>
              <h3 className="text-base font-bold" style={{ color: tokens.modal.title }}>Transferer des leads</h3>
              <p className="text-xs" style={{ color: tokens.modal.subtitle }}>{count} lead{count > 1 ? 's' : ''} selectionne{count > 1 ? 's' : ''}</p>
            </div>
          </div>
        </div>

        <div className="px-6 pb-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: tokens.modal.fieldLabel }} />
            <input
              type="text"
              placeholder="Rechercher un vendeur..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl text-xs focus:outline-none transition-all"
              style={{
                background: tokens.input.bg,
                border: `1px solid ${tokens.input.border}`,
                color: tokens.input.text,
                caretColor: tokens.input.text
              }}
              onFocus={e => (e.currentTarget.style.borderColor = tokens.input.borderFocus)}
              onBlur={e => (e.currentTarget.style.borderColor = tokens.input.border)}
            />
          </div>
        </div>

        <div className="px-6 pb-4 space-y-1.5 max-h-64 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-5 h-5 border-2 border-t-cyan-400 rounded-full animate-spin" style={{ borderColor: tokens.text.quaternary, borderTopColor: '#22d3ee' }} />
            </div>
          ) : (
            <>
              <button
                onClick={() => setSelected(null)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left"
                style={{
                  background: selected === null ? tokens.accent.bg : tokens.modal.fieldBg,
                  border: selected === null ? `1px solid ${tokens.accent.border}` : `1px solid ${tokens.modal.fieldBorder}`,
                }}
              >
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: tokens.danger.bg, border: `1px solid ${tokens.danger.border}` }}>
                  <ShieldCheck className="w-3.5 h-3.5" style={{ color: tokens.danger.text }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold" style={{ color: tokens.modal.title }}>Admin</p>
                  <p className="text-[10px]" style={{ color: tokens.modal.fieldLabel }}>Retirer d'un vendeur</p>
                </div>
                {selected === null && (
                  <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: tokens.accent.text }}>
                    <svg width="8" height="6" viewBox="0 0 8 6" fill="none"><path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                )}
              </button>

              {filtered.map(vendor => {
                const isSelected = selected === vendor.id;
                const initials = `${vendor.first_name?.[0] ?? ''}${vendor.last_name?.[0] ?? ''}`.toUpperCase();
                return (
                  <button
                    key={vendor.id}
                    onClick={() => setSelected(vendor.id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left"
                    style={{
                      background: isSelected ? tokens.accent.bg : tokens.modal.fieldBg,
                      border: isSelected ? `1px solid ${tokens.accent.border}` : `1px solid ${tokens.modal.fieldBorder}`,
                    }}
                  >
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-[10px] font-bold" style={{ background: 'linear-gradient(135deg, #22d3ee, #2563eb)', color: tokens.text.primary }}>
                      {initials || '?'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold truncate" style={{ color: tokens.modal.title }}>{vendor.first_name} {vendor.last_name}</p>
                      <p className="text-[10px] truncate" style={{ color: tokens.modal.fieldLabel }}>{vendor.email}</p>
                    </div>
                    {isSelected && (
                      <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: tokens.accent.text }}>
                        <svg width="8" height="6" viewBox="0 0 8 6" fill="none"><path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </div>
                    )}
                  </button>
                );
              })}

              {!loading && filtered.length === 0 && search && (
                <p className="text-center text-xs py-4" style={{ color: tokens.modal.fieldLabel }}>Aucun vendeur trouve</p>
              )}
            </>
          )}
        </div>

        <div className="px-6 pb-6 flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-xl text-xs font-semibold transition-all"
            style={{ background: tokens.modal.fieldBg, color: tokens.modal.subtitle, border: `1px solid ${tokens.modal.fieldBorder}` }}
          >
            Annuler
          </button>
          <button
            onClick={handleConfirm}
            disabled={selected === undefined || transferring}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all"
            style={{
              background: tokens.accent.bg,
              color: selected === undefined ? 'rgba(34,211,238,0.3)' : tokens.accent.text,
              border: `1px solid ${tokens.accent.border}`,
              opacity: transferring ? 0.7 : (selected === undefined ? 0.5 : 1),
            }}
          >
            <UserCheck className="w-3.5 h-3.5" />
            {transferring ? 'Transfert...' : 'Confirmer'}
          </button>
        </div>
      </div>
    </div>
  );
}
