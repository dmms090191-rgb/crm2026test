import { useState, useEffect } from 'react';
import { X, Check, Image as ImageIcon, Loader2 } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';

interface Logo {
  id: string;
  url: string;
  file_name: string;
  is_active: boolean;
  is_favorite: boolean;
}

interface Props {
  companyId: string;
  currentIconUrl: string | null;
  onSelect: (url: string, logoId: string) => void;
  onClose: () => void;
}

export default function AdminAppIconPickerModal({ companyId, currentIconUrl, onSelect, onClose }: Props) {
  const t = useThemeTokens();
  const [logos, setLogos] = useState<Logo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('company_logos')
        .select('id, url, file_name, is_active, is_favorite')
        .eq('company_id', companyId)
        .order('is_favorite', { ascending: false })
        .order('created_at', { ascending: false });
      if (data) setLogos(data as Logo[]);
      setLoading(false);
    })();
  }, [companyId]);

  const handleConfirm = () => {
    if (selectedUrl && selectedId) {
      onSelect(selectedUrl, selectedId);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60000] flex items-center justify-center p-3 sm:p-4"
      style={{ backgroundColor: t.modal.overlayBg, backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl p-5 sm:p-6 max-h-[85vh] flex flex-col"
        style={{
          background: t.modal.bg,
          border: `1px solid ${t.modal.border}`,
          boxShadow: '0 24px 80px rgba(0,0,0,0.3)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, rgba(14,165,233,0.12), rgba(16,185,129,0.12))',
                border: '1px solid rgba(14,165,233,0.2)',
              }}
            >
              <ImageIcon className="w-5 h-5" style={{ color: '#0ea5e9' }} />
            </div>
            <div>
              <h3 className="text-sm font-bold" style={{ color: t.heading.primary }}>
                Choisir une icone
              </h3>
              <p className="text-[11px]" style={{ color: t.text.tertiary }}>
                Selectionnez un logo comme icone d'application
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors hover:bg-white/5"
            style={{ color: t.text.quaternary }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#0ea5e9' }} />
            </div>
          ) : logos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <ImageIcon className="w-10 h-10 opacity-20" style={{ color: t.text.quaternary }} />
              <p className="text-sm text-center" style={{ color: t.text.tertiary }}>
                Aucun logo sauvegarde pour cette societe.
              </p>
              <p className="text-xs text-center" style={{ color: t.text.quaternary }}>
                Rendez-vous dans l'onglet Logo pour generer ou importer des logos.
              </p>
            </div>
          ) : (
            <>
              {/* Current icon preview */}
              {currentIconUrl && (
                <div className="mb-4">
                  <p className="text-[10px] font-semibold mb-2 uppercase tracking-wider" style={{ color: t.text.quaternary }}>
                    Icone actuelle
                  </p>
                  <div
                    className="inline-flex items-center gap-3 px-3 py-2 rounded-xl"
                    style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}` }}
                  >
                    <img src={currentIconUrl} alt="Icone actuelle" className="w-10 h-10 rounded-lg object-cover" />
                    <span className="text-[11px] font-medium" style={{ color: t.text.secondary }}>
                      Icone actuelle
                    </span>
                  </div>
                </div>
              )}

              <p className="text-[10px] font-semibold mb-3 uppercase tracking-wider" style={{ color: t.text.quaternary }}>
                Logos disponibles ({logos.length})
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                {logos.map(logo => {
                  const isSelected = selectedUrl === logo.url;
                  return (
                    <button
                      key={logo.id}
                      onClick={() => { setSelectedUrl(logo.url); setSelectedId(logo.id); }}
                      className="relative aspect-square rounded-xl overflow-hidden transition-all duration-150 group"
                      style={{
                        border: isSelected
                          ? '2.5px solid #0ea5e9'
                          : `1.5px solid ${t.surface.border}`,
                        boxShadow: isSelected
                          ? '0 0 0 3px rgba(14,165,233,0.15), 0 4px 16px rgba(14,165,233,0.2)'
                          : '0 1px 4px rgba(0,0,0,0.08)',
                        background: t.surface.secondary,
                      }}
                    >
                      <img
                        src={logo.url}
                        alt={logo.file_name}
                        className="w-full h-full object-cover transition-transform duration-150 group-hover:scale-105"
                      />
                      {isSelected && (
                        <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(14,165,233,0.15)' }}>
                          <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: '#0ea5e9' }}>
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        </div>
                      )}
                      {logo.is_favorite && !isSelected && (
                        <div className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.9)' }}>
                          <span className="text-[7px] text-white font-bold">F</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {logos.length > 0 && (
          <div className="flex items-center justify-end gap-2 mt-5 pt-4 flex-shrink-0" style={{ borderTop: `1px solid ${t.surface.border}` }}>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold transition-all"
              style={{ color: t.text.tertiary, background: t.surface.secondary, border: `1px solid ${t.surface.border}` }}
            >
              Annuler
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selectedUrl}
              className="px-5 py-2 rounded-lg text-xs font-bold text-white transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: selectedUrl ? 'linear-gradient(135deg, #0ea5e9, #10b981)' : 'rgba(255,255,255,0.08)',
                boxShadow: selectedUrl ? '0 4px 16px rgba(14,165,233,0.25)' : 'none',
              }}
            >
              Appliquer cette icone
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
