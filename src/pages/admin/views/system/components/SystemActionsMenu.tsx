import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal, X } from 'lucide-react';
import type { useThemeTokens } from '../../../../../hooks/useThemeTokens';

export interface ActionDef {
  label: string;
  icon: React.ReactNode;
  action: () => void;
  danger?: boolean;
}

interface Props {
  /** Nom affiche en tete de la feuille mobile. */
  name: string;
  items: ActionDef[];
  tokens: ReturnType<typeof useThemeTokens>;
}

/**
 * Le menu « ... » du module Systeme : un seul et meme composant pour une categorie, un sous-groupe
 * et une note. La liste des actions est fournie par l'appelant ; le menu ne decide de rien.
 *
 * Il etait auparavant enferme dans SystemCategoryActions : les notes n'avaient donc pas de menu,
 * seulement une corbeille revelee au survol. Extrait ici tel quel, sans changer son apparence.
 */
export default function SystemActionsMenu({ name, items, tokens }: Props) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      const target = e.target as Node;
      if (btnRef.current?.contains(target)) return;
      if (dropdownRef.current?.contains(target)) return;
      if (sheetRef.current?.contains(target)) return;
      close();
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    const handle = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, [open, close]);

  const handleAction = useCallback((action: () => void) => {
    close();
    requestAnimationFrame(() => { action(); });
  }, [close]);

  return (
    <>
      <button
        ref={btnRef}
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="p-1.5 rounded-md transition-colors"
        style={{ color: tokens.text.tertiary }}
        title="Actions"
        aria-label={`Actions sur ${name}`}
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {open && (
        <>
          <DesktopDropdown btnRef={btnRef} dropdownRef={dropdownRef} items={items} tokens={tokens} onAction={handleAction} />
          <MobileSheet sheetRef={sheetRef} name={name} items={items} tokens={tokens} onAction={handleAction} onClose={close} />
        </>
      )}
    </>
  );
}

function DesktopDropdown({ btnRef, dropdownRef, items, tokens, onAction }: { btnRef: React.RefObject<HTMLButtonElement | null>; dropdownRef: React.RefObject<HTMLDivElement | null>; items: ActionDef[]; tokens: ReturnType<typeof useThemeTokens>; onAction: (action: () => void) => void }) {
  const [pos, setPos] = useState({ top: 0, right: 0 });

  useEffect(() => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
    }
  }, [btnRef]);

  return createPortal(
    <div data-tx-sysmenu ref={dropdownRef as React.RefObject<HTMLDivElement>} className="hidden md:block fixed z-[9999] rounded-lg shadow-xl py-1 min-w-[170px]" style={{ top: pos.top, right: pos.right, background: tokens.surface.primary, border: `1px solid ${tokens.surface.border}` }}>
      {items.map((item, i) => (
        <button key={i} onClick={() => onAction(item.action)} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left transition-colors hover:opacity-80" style={{ color: item.danger ? tokens.danger.text : tokens.text.secondary }} data-tx-danger={item.danger ? '' : undefined}>
          <span style={{ color: item.danger ? tokens.danger.text : tokens.text.quaternary }}>{item.icon}</span>
          <span>{item.label}</span>
        </button>
      ))}
    </div>,
    document.body
  );
}

function MobileSheet({ sheetRef, name, items, tokens, onAction, onClose }: { sheetRef: React.RefObject<HTMLDivElement | null>; name: string; items: ActionDef[]; tokens: ReturnType<typeof useThemeTokens>; onAction: (action: () => void) => void; onClose: () => void }) {
  return createPortal(
    <div className="md:hidden fixed inset-0 z-[9999] flex flex-col justify-end">
      <div data-tx-veil className="absolute inset-0" style={{ background: tokens.modal.overlayBg }} onClick={onClose} />
      <div data-tx-sheet ref={sheetRef as React.RefObject<HTMLDivElement>} className="relative rounded-t-2xl pb-[env(safe-area-inset-bottom)] animate-slide-up" style={{ background: tokens.surface.primary, borderTop: `1px solid ${tokens.surface.border}` }}>
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: tokens.surface.border }} />
        </div>
        <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: `1px solid ${tokens.surface.border}` }}>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider" style={{ color: tokens.text.quaternary }}>Actions</p>
            <p className="text-sm font-semibold mt-0.5 truncate max-w-[250px]" style={{ color: tokens.text.primary }}>{name}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg" style={{ color: tokens.text.tertiary, background: tokens.surface.secondary }}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-4 py-3 space-y-1">
          {items.map((item, i) => (
            <button key={i} onClick={() => onAction(item.action)} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors active:scale-[0.98]" style={{ color: item.danger ? tokens.danger.text : tokens.text.secondary, background: item.danger ? tokens.danger.bg : tokens.surface.secondary }} data-tx-danger={item.danger ? '' : undefined}>
              <span className="shrink-0" style={{ color: item.danger ? tokens.danger.text : tokens.accent.text }}>{item.icon}</span>
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}
