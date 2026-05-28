import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Clock, Check, Loader2 } from 'lucide-react';
import type { ThemeTokens } from '../lib/themeTokensTypes';
import { fetchTimeoutMinutes, upsertTimeout } from '../hooks/useSessionTimeout';

interface Props {
  open: boolean;
  onClose: () => void;
  tokens: ThemeTokens;
  role: 'super_admin' | 'admin';
  companyId: string | null;
  onSaved?: (minutes: number) => void;
}

const TIMEOUT_OPTIONS = [
  { value: 30, label: '30 minutes' },
  { value: 60, label: '1 heure' },
  { value: 90, label: '1h30' },
  { value: 120, label: '2 heures' },
  { value: 240, label: '4 heures' },
] as const;

export default function SessionTimeoutModal({ open, onClose, tokens, role, companyId, onSaved }: Props) {
  const [selected, setSelected] = useState(90);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const m = tokens.modal;

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setSaved(false);
    const targetCompanyId = role === 'super_admin' ? null : companyId;
    fetchTimeoutMinutes(targetCompanyId).then(minutes => {
      setSelected(minutes);
      setLoading(false);
    });
  }, [open, role, companyId]);

  if (!open) return null;

  const handleSave = async () => {
    setSaving(true);
    const targetCompanyId = role === 'super_admin' ? null : companyId;
    const ok = await upsertTimeout(targetCompanyId, selected);
    setSaving(false);
    if (ok) {
      setSaved(true);
      onSaved?.(selected);
      setTimeout(onClose, 800);
    }
  };

  const scopeLabel = role === 'super_admin'
    ? 'Valeur globale par defaut (toutes les societes)'
    : 'Duree pour votre societe (admin, vendeurs, clients)';

  return createPortal(
    <div
      className="fixed inset-0 z-[100000] flex items-center justify-center p-3 sm:p-4"
      style={{ backgroundColor: m.overlayBg, backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl sm:rounded-3xl w-full max-w-md relative overflow-hidden"
        style={{
          background: m.bg,
          border: `1px solid ${m.border}`,
          boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-5 sm:right-5 w-9 h-9 rounded-full flex items-center justify-center transition-colors z-10"
          style={{ backgroundColor: m.closeBtnBg, color: m.closeBtnText }}
          onMouseEnter={e => {
            e.currentTarget.style.backgroundColor = m.closeBtnHoverBg;
            e.currentTarget.style.color = m.closeBtnHoverText;
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = m.closeBtnBg;
            e.currentTarget.style.color = m.closeBtnText;
          }}
        >
          <X className="w-4.5 h-4.5" />
        </button>

        <div className="p-5 sm:p-7">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-lg">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold" style={{ color: tokens.text.primary }}>
                Duree de session
              </h2>
              <p className="text-[11px] mt-0.5" style={{ color: tokens.text.tertiary }}>
                Deconnexion automatique apres inactivite
              </p>
            </div>
          </div>

          <p className="text-[11px] mt-4 mb-5 px-3 py-2 rounded-lg" style={{ color: tokens.text.secondary, background: tokens.surface.tertiary }}>
            {scopeLabel}
          </p>

          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: tokens.text.tertiary }} />
            </div>
          ) : (
            <div className="space-y-2">
              {TIMEOUT_OPTIONS.map(opt => {
                const isActive = selected === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => { setSelected(opt.value); setSaved(false); }}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200"
                    style={{
                      background: isActive
                        ? 'linear-gradient(135deg, rgba(14,165,233,0.12), rgba(37,99,235,0.08))'
                        : tokens.surface.secondary,
                      border: `1.5px solid ${isActive ? 'rgba(14,165,233,0.4)' : tokens.surface.border}`,
                      color: isActive ? '#0ea5e9' : tokens.text.primary,
                    }}
                  >
                    <span>{opt.label}</span>
                    {isActive && <Check className="w-4 h-4" />}
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-6 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors"
              style={{
                background: tokens.surface.tertiary,
                color: tokens.text.secondary,
                border: `1px solid ${tokens.surface.border}`,
              }}
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={saving || saved || loading}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
              style={{
                background: saved
                  ? 'linear-gradient(135deg, #10b981, #059669)'
                  : 'linear-gradient(135deg, #0ea5e9, #2563eb)',
                boxShadow: saved ? '0 4px 16px rgba(16,185,129,0.3)' : '0 4px 16px rgba(14,165,233,0.3)',
              }}
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saved && <Check className="w-4 h-4" />}
              {saved ? 'Enregistre' : saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
