import { useState, useEffect } from 'react';
import { AlertTriangle, Trash2, X, ShieldAlert } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import type { Vendor } from './vendeurTypes';

interface VendorDeleteModalProps {
  vendorIds: string[];
  vendors: Vendor[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function VendorDeleteModal({ vendorIds, vendors, onClose, onSuccess }: VendorDeleteModalProps) {
  const t = useThemeTokens();
  const [checking, setChecking] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [blockedVendors, setBlockedVendors] = useState<{ id: string; name: string; leadCount: number }[]>([]);
  const [deletableIds, setDeletableIds] = useState<string[]>([]);

  useEffect(() => {
    async function run() {
      setChecking(true);
      const blocked: { id: string; name: string; leadCount: number }[] = [];
      const deletable: string[] = [];
      for (const id of vendorIds) {
        const { count } = await supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .eq('vendor_id', id);
        const vendor = vendors.find(v => v.id === id);
        const name = vendor ? `${vendor.first_name} ${vendor.last_name}`.trim() : id;
        if (count && count > 0) {
          blocked.push({ id, name, leadCount: count });
        } else {
          deletable.push(id);
        }
      }
      setBlockedVendors(blocked);
      setDeletableIds(deletable);
      setChecking(false);
    }
    run();
  }, [vendorIds, vendors]);

  async function handleDelete() {
    if (deletableIds.length === 0) return;
    setDeleting(true);
    await supabase.from('vendors').delete().in('id', deletableIds);
    setDeleting(false);
    onSuccess();
  }

  const totalSelected = vendorIds.length;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: t.modal.overlayBg }} />
      <div
        className="relative rounded-2xl p-6 max-w-md w-full space-y-4 max-h-[80vh] overflow-auto"
        style={{ background: t.card.bg, border: `1px solid ${t.card.border}` }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold" style={{ color: t.text.primary }}>
            Supprimer {totalSelected} vendeur{totalSelected > 1 ? 's' : ''}
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:opacity-70 transition-opacity" style={{ color: t.text.tertiary }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {checking ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: t.accent.border, borderTopColor: t.accent.text }} />
            <span className="ml-2 text-xs" style={{ color: t.text.secondary }}>Verification des leads assignes...</span>
          </div>
        ) : (
          <>
            {blockedVendors.length > 0 && (
              <div className="rounded-xl px-4 py-3 space-y-2" style={{ background: t.danger.bg, border: `1px solid ${t.danger.border}` }}>
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0" style={{ color: t.danger.text }} />
                  <span className="text-xs font-semibold" style={{ color: t.danger.text }}>
                    {blockedVendors.length} vendeur{blockedVendors.length > 1 ? 's' : ''} avec leads assignes
                  </span>
                </div>
                <p className="text-[11px]" style={{ color: t.danger.text }}>
                  La suppression est bloquee pour ces vendeurs. Reassignez leurs leads avant de les supprimer.
                </p>
                <div className="space-y-1 mt-1">
                  {blockedVendors.map(v => (
                    <div key={v.id} className="flex items-center justify-between text-[11px] px-2 py-1 rounded" style={{ background: t.surface.secondary }}>
                      <span style={{ color: t.text.primary }}>{v.name}</span>
                      <span style={{ color: t.danger.text }}>{v.leadCount} lead{v.leadCount > 1 ? 's' : ''}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {deletableIds.length > 0 && (
              <div className="rounded-xl px-4 py-3" style={{ background: t.warning.bg, border: `1px solid ${t.warning.border}` }}>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: t.warning.text }} />
                  <span className="text-xs font-semibold" style={{ color: t.warning.text }}>
                    {deletableIds.length} vendeur{deletableIds.length > 1 ? 's' : ''} supprimable{deletableIds.length > 1 ? 's' : ''}
                  </span>
                </div>
                <p className="text-[11px] mt-1" style={{ color: t.warning.text }}>
                  Cette action est irreversible. Les comptes seront definitivement supprimes.
                </p>
              </div>
            )}

            {deletableIds.length === 0 && blockedVendors.length > 0 && (
              <p className="text-xs text-center py-2" style={{ color: t.text.tertiary }}>
                Aucun vendeur ne peut etre supprime.
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-xs font-semibold transition-all"
                style={{ background: t.surface.secondary, color: t.text.secondary, border: `1px solid ${t.surface.border}` }}
              >
                Annuler
              </button>
              {deletableIds.length > 0 && (
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
                  style={{ background: t.danger.bg, color: t.danger.text, border: `1px solid ${t.danger.border}`, opacity: deleting ? 0.6 : 1 }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {deleting ? 'Suppression...' : `Confirmer (${deletableIds.length})`}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
