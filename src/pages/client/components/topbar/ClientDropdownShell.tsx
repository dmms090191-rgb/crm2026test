import type { ThemeTokens } from '../../../../lib/themeTokensTypes';

export function ClientDropdownPanel({ tokens, width, align, children }: { tokens: ThemeTokens; width: string; align: 'left' | 'right'; children: React.ReactNode }) {
  return (
    <div
      className={`absolute ${align === 'left' ? 'left-0' : 'right-0'} top-full mt-2 ${width} rounded-xl overflow-hidden z-50`}
      style={{
        background: tokens.dropdown.bg,
        border: `1px solid ${tokens.dropdown.border}`,
        boxShadow: tokens.dropdown.shadow,
        backdropFilter: 'blur(16px)',
      }}
    >
      {children}
    </div>
  );
}

export function ClientDropdownHeader({ label, tokens }: { label: string; tokens: ThemeTokens }) {
  return (
    <div className="px-3 py-2 border-b" style={{ borderColor: tokens.dropdown.border }}>
      <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: tokens.topbar.notifIcon }}>
        {label}
      </p>
    </div>
  );
}

export function ClientDropdownEmpty({ text, tokens }: { text: string; tokens: ThemeTokens }) {
  return (
    <div className="px-3 py-4 text-center">
      <p className="text-xs" style={{ color: tokens.dropdown.itemText }}>{text}</p>
    </div>
  );
}
