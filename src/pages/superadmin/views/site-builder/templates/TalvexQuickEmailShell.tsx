import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Inbox } from 'lucide-react';
import type { SiteModalTheme } from './siteModalTheme';

const STORAGE_KEY = 'crm_quick_login_emails';

export function getQuickEmails(): string[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}
export function setQuickEmails(emails: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(emails));
}
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function ModalShell({ open, onClose, children, theme }: { open: boolean; onClose: () => void; children: React.ReactNode; theme: SiteModalTheme }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (open) requestAnimationFrame(() => setMounted(true));
    else setMounted(false);
  }, [open]);

  if (!open) return null;

  return createPortal(
    <>
      <style>{`
        @keyframes qeBackdropIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes qeModalIn { from { opacity: 0; transform: translateY(16px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes qeOrbFloat { 0%, 100% { transform: translate(0,0) scale(1); } 50% { transform: translate(8px,-12px) scale(1.08); } }
        @keyframes qeShimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(200%); } }
        @keyframes qeItemIn { from { opacity: 0; transform: translateX(-8px); } to { opacity: 1; transform: translateX(0); } }
        .site-modal-input::placeholder {
          color: ${theme.placeholderColor} !important;
          opacity: 1 !important;
        }
        .site-modal-input:invalid {
          box-shadow: none !important;
          outline: none !important;
        }
        .site-modal-input:-webkit-autofill,
        .site-modal-input:-webkit-autofill:focus {
          -webkit-text-fill-color: #fff !important;
          -webkit-box-shadow: 0 0 0 1000px rgba(15,23,42,0.97) inset !important;
          caret-color: ${theme.caretColor} !important;
          transition: background-color 5000s ease-in-out 0s;
        }
      `}</style>
      <div
        className="fixed inset-0 z-[70] flex items-center justify-center p-4"
        style={{
          backgroundColor: 'rgba(2,6,14,0.82)',
          backdropFilter: 'blur(16px)',
          animation: 'qeBackdropIn 0.25s ease-out',
        }}
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div
          className="w-[92%] max-w-sm rounded-2xl relative overflow-hidden"
          style={{
            background: 'linear-gradient(165deg, rgba(15,23,42,0.97), rgba(6,10,20,0.99))',
            border: `1px solid rgba(${theme.primaryRgb},0.12)`,
            boxShadow: `0 0 60px rgba(${theme.primaryRgb},0.06), 0 20px 50px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.04)`,
            animation: mounted ? 'qeModalIn 0.35s cubic-bezier(0.16,1,0.3,1) forwards' : 'none',
            opacity: mounted ? 1 : 0,
          }}
        >
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-12 -right-12 w-28 h-28 rounded-full opacity-[0.06]"
              style={{ background: `radial-gradient(circle, ${theme.orbColor1}, transparent 70%)`, animation: 'qeOrbFloat 8s ease-in-out infinite' }} />
            <div className="absolute -bottom-10 -left-10 w-24 h-24 rounded-full opacity-[0.04]"
              style={{ background: `radial-gradient(circle, ${theme.orbColor2}, transparent 70%)`, animation: 'qeOrbFloat 10s ease-in-out infinite reverse' }} />
          </div>
          {children}
        </div>
      </div>
    </>,
    document.body
  );
}

export function ModalHeader({ title, icon: Icon, onClose, count, theme }: { title: string; icon: typeof X; onClose: () => void; count?: number; theme: SiteModalTheme }) {
  return (
    <div className="relative px-5 pt-5 pb-4">
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-110 hover:rotate-90 group"
        style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <X className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 transition-colors" />
      </button>
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            background: `linear-gradient(135deg, rgba(${theme.primaryRgb},0.15), rgba(${theme.secondaryRgb},0.08))`,
            border: `1px solid rgba(${theme.primaryRgb},0.25)`,
          }}
        >
          <Icon className="w-5 h-5" style={{ color: theme.primary }} />
        </div>
        <div>
          <h3 className="text-[15px] font-bold text-white">{title}</h3>
          {count !== undefined && (
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              {count} email{count !== 1 ? 's' : ''} enregistre{count !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function EmptyState({ message, sub }: { message: string; sub: string }) {
  return (
    <div className="px-5 py-8 flex flex-col items-center text-center">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1.5px dashed rgba(255,255,255,0.08)' }}
      >
        <Inbox className="w-6 h-6 text-slate-600" />
      </div>
      <p className="text-[13px] font-medium text-slate-500">{message}</p>
      <p className="text-[11px] text-slate-600 mt-1">{sub}</p>
    </div>
  );
}
