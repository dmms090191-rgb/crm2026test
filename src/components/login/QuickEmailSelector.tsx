import { useState } from 'react';
import { ChevronDown, Star, Settings, Trash2, Plus, X } from 'lucide-react';
import type { useThemeTokens } from '../../hooks/useThemeTokens';

const STORAGE_KEY = 'crm_quick_login_emails';

function getQuickEmails(): string[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function setQuickEmails(emails: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(emails));
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

interface Props {
  email: string;
  onSelect: (email: string) => void;
  tokens: ReturnType<typeof useThemeTokens>;
}

export default function QuickEmailSelector({ email, onSelect, tokens }: Props) {
  const [quickEmails, setQuickEmailsState] = useState<string[]>(getQuickEmails);
  const [showPicker, setShowPicker] = useState(false);
  const [showManage, setShowManage] = useState(false);
  const [manageInput, setManageInput] = useState('');
  const [toast, setToast] = useState('');

  function refresh() {
    const list = getQuickEmails();
    setQuickEmailsState(list);
    return list;
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  }

  function handleSaveCurrent() {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;
    if (!isValidEmail(trimmed)) {
      showToast('Adresse email invalide.');
      return;
    }
    const list = refresh();
    if (list.includes(trimmed)) {
      showToast('Cet email est deja enregistre.');
      return;
    }
    const updated = [...list, trimmed];
    setQuickEmails(updated);
    setQuickEmailsState(updated);
    showToast('Email ajoute aux acces rapides.');
  }

  function handleRemove(target: string) {
    const updated = quickEmails.filter(e => e !== target);
    setQuickEmails(updated);
    setQuickEmailsState(updated);
    showToast('Email supprime de cet appareil.');
  }

  function handleClearAll() {
    setQuickEmails([]);
    setQuickEmailsState([]);
    showToast('Emails rapides vides sur cet appareil.');
  }

  function handleManageAdd() {
    const trimmed = manageInput.trim().toLowerCase();
    if (!trimmed) return;
    if (!isValidEmail(trimmed)) {
      showToast('Adresse email invalide.');
      return;
    }
    if (quickEmails.includes(trimmed)) {
      showToast('Cet email est deja enregistre.');
      return;
    }
    const updated = [...quickEmails, trimmed];
    setQuickEmails(updated);
    setQuickEmailsState(updated);
    setManageInput('');
    showToast('Email ajoute aux acces rapides.');
  }

  return (
    <>
      {/* Action buttons row */}
      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
        <button
          type="button"
          onClick={() => { refresh(); setShowPicker(true); }}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors"
          style={{ backgroundColor: tokens.surface.tertiary, color: tokens.text.tertiary }}
          title="Emails rapides"
          aria-label="Emails rapides"
        >
          <ChevronDown className="w-3.5 h-3.5" />
          <span>Rapides</span>
        </button>

        <button
          type="button"
          onClick={handleSaveCurrent}
          disabled={!email.trim()}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors disabled:opacity-40"
          style={{ backgroundColor: tokens.surface.tertiary, color: tokens.text.tertiary }}
          title="Enregistrer cet email"
          aria-label="Enregistrer cet email dans les acces rapides"
        >
          <Star className="w-3.5 h-3.5" />
          <span>Enregistrer</span>
        </button>

        <button
          type="button"
          onClick={() => { refresh(); setShowManage(true); }}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors"
          style={{ backgroundColor: tokens.surface.tertiary, color: tokens.text.tertiary }}
          title="Gerer les emails rapides"
          aria-label="Gerer les emails rapides"
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Gerer</span>
        </button>

        {toast && (
          <span className="text-[11px] font-medium animate-pulse basis-full mt-1" style={{ color: tokens.accent.text }}>
            {toast}
          </span>
        )}
      </div>

      {/* Picker overlay */}
      {showPicker && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowPicker(false); }}
        >
          <div
            className="w-[90%] max-w-xs rounded-2xl overflow-hidden shadow-xl"
            style={{ background: tokens.modal.bg, border: `1px solid ${tokens.modal.border}` }}
          >
            <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: `1px solid ${tokens.surface.border}` }}>
              <p className="text-sm font-semibold" style={{ color: tokens.text.primary }}>Emails rapides</p>
              <button
                type="button"
                onClick={() => setShowPicker(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                style={{ background: tokens.modal.closeBtnBg, color: tokens.modal.closeBtnText }}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {quickEmails.length === 0 ? (
                <div className="px-5 py-6 text-center space-y-1.5">
                  <p className="text-xs font-medium" style={{ color: tokens.text.quaternary }}>
                    Aucun email rapide enregistre sur cet appareil.
                  </p>
                  <p className="text-[11px]" style={{ color: tokens.text.tertiary }}>
                    Cliquez sur Enregistrer pour ajouter l'email actuel.
                  </p>
                </div>
              ) : (
                quickEmails.map(qe => (
                  <button
                    key={qe}
                    type="button"
                    onClick={() => { onSelect(qe); setShowPicker(false); }}
                    className="w-full text-left px-5 py-3 text-sm transition-colors border-b last:border-0"
                    style={{ color: tokens.modal.fieldValue, borderColor: tokens.surface.borderLight }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = tokens.surface.hover; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                    {qe}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Manage overlay */}
      {showManage && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowManage(false); }}
        >
          <div
            className="w-[90%] max-w-sm rounded-2xl overflow-hidden shadow-xl"
            style={{ background: tokens.modal.bg, border: `1px solid ${tokens.modal.border}` }}
          >
            <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: `1px solid ${tokens.surface.border}` }}>
              <p className="text-sm font-semibold" style={{ color: tokens.text.primary }}>Gerer les emails rapides</p>
              <button
                type="button"
                onClick={() => setShowManage(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                style={{ background: tokens.modal.closeBtnBg, color: tokens.modal.closeBtnText }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 pt-4 flex gap-2">
              <input
                type="email"
                value={manageInput}
                onChange={e => setManageInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleManageAdd(); } }}
                placeholder="Ajouter un email..."
                className="flex-1 min-w-0 px-3 py-2 rounded-lg text-sm outline-none focus:ring-1 transition-all"
                style={{ backgroundColor: tokens.input.bg, border: `1px solid ${tokens.input.border}`, color: tokens.input.text }}
              />
              <button
                type="button"
                onClick={handleManageAdd}
                className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
                style={{ backgroundColor: tokens.accent.solid, color: '#fff' }}
                title="Ajouter"
                aria-label="Ajouter cet email"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 py-3 max-h-56 overflow-y-auto space-y-1">
              {quickEmails.length === 0 ? (
                <p className="text-xs py-3 text-center" style={{ color: tokens.text.quaternary }}>Aucun email rapide enregistre.</p>
              ) : (
                quickEmails.map(qe => (
                  <div
                    key={qe}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg"
                    style={{ backgroundColor: tokens.surface.secondary }}
                  >
                    <span className="text-sm truncate flex-1" style={{ color: tokens.text.secondary }}>{qe}</span>
                    <button
                      type="button"
                      onClick={() => handleRemove(qe)}
                      className="shrink-0 w-7 h-7 rounded-md flex items-center justify-center transition-colors"
                      style={{ color: tokens.danger.text }}
                      title="Supprimer"
                      aria-label={`Supprimer ${qe}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="px-5 pb-5 pt-2" style={{ borderTop: `1px solid ${tokens.surface.border}` }}>
              <button
                type="button"
                onClick={handleClearAll}
                disabled={quickEmails.length === 0}
                className="w-full py-2.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-40"
                style={{ backgroundColor: tokens.danger.bg, color: tokens.danger.text }}
              >
                Vider les emails rapides de cet appareil
              </button>
            </div>

            {toast && (
              <p className="text-center text-[11px] font-medium pb-3 animate-pulse" style={{ color: tokens.accent.text }}>
                {toast}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
