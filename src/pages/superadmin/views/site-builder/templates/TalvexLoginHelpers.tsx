import type { SiteModalTheme } from './siteModalTheme';

export function FloatingOrbs({ theme }: { theme: SiteModalTheme }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute -top-20 -left-20 w-40 h-40 rounded-full opacity-[0.07] animate-[orbFloat_8s_ease-in-out_infinite]"
        style={{ background: `radial-gradient(circle, ${theme.orbColor1}, transparent 70%)` }} />
      <div className="absolute -bottom-16 -right-16 w-48 h-48 rounded-full opacity-[0.05] animate-[orbFloat_10s_ease-in-out_infinite_reverse]"
        style={{ background: `radial-gradient(circle, ${theme.orbColor2}, transparent 70%)` }} />
      <div className="absolute top-1/2 -left-10 w-24 h-24 rounded-full opacity-[0.04] animate-[orbFloat_12s_ease-in-out_infinite_2s]"
        style={{ background: `radial-gradient(circle, ${theme.primary}, transparent 70%)` }} />
    </div>
  );
}

export function GlowLine({ active, theme }: { active: boolean; theme: SiteModalTheme }) {
  return (
    <div className="absolute bottom-0 left-0 right-0 h-[2px] overflow-hidden rounded-b-3xl">
      <div
        className="h-full transition-all duration-700 ease-out"
        style={{
          width: active ? '100%' : '0%',
          background: `linear-gradient(90deg, transparent, ${theme.primary}, ${theme.secondary}, ${theme.primary}, transparent)`,
          margin: '0 auto',
        }}
      />
    </div>
  );
}

export function PinDigitBox({ digit, index, showPin, focused, inputRef, onInput, onKeyDown, onFocus, theme }: {
  digit: string; index: number; showPin: boolean; focused: boolean;
  inputRef: (el: HTMLInputElement | null) => void;
  onInput: (i: number, v: string) => void;
  onKeyDown: (i: number, e: React.KeyboardEvent) => void;
  onFocus: (i: number) => void;
  theme: SiteModalTheme;
}) {
  const filled = !!digit;
  return (
    <div className="relative flex-1 min-w-0 max-w-[52px]">
      {filled && (
        <div className="absolute inset-0 rounded-xl opacity-60 animate-[pinGlow_2s_ease-in-out_infinite]"
          style={{ background: `radial-gradient(circle at center, rgba(${theme.primaryRgb},0.15), transparent 70%)` }} />
      )}
      <input
        ref={inputRef}
        type={showPin ? 'text' : 'password'}
        inputMode="numeric"
        maxLength={1}
        value={digit}
        onChange={e => onInput(index, e.target.value)}
        onKeyDown={e => onKeyDown(index, e)}
        onFocus={() => onFocus(index)}
        className="relative z-10 w-full aspect-square rounded-xl text-center text-xl font-bold text-white caret-transparent outline-none transition-all duration-300"
        style={{
          background: filled
            ? `linear-gradient(135deg, rgba(${theme.primaryRgb},0.12), rgba(${theme.secondaryRgb},0.08))`
            : focused
              ? 'rgba(255,255,255,0.06)'
              : 'rgba(255,255,255,0.03)',
          border: filled
            ? `1.5px solid rgba(${theme.primaryRgb},0.5)`
            : focused
              ? `1.5px solid rgba(${theme.primaryRgb},0.35)`
              : '1.5px solid rgba(255,255,255,0.06)',
          boxShadow: filled
            ? `0 0 20px rgba(${theme.primaryRgb},0.12), inset 0 1px 0 rgba(255,255,255,0.05)`
            : focused
              ? `0 0 12px rgba(${theme.primaryRgb},0.08)`
              : 'inset 0 1px 0 rgba(255,255,255,0.02)',
          transform: filled ? 'scale(1.04)' : 'scale(1)',
        }}
      />
      {focused && !filled && (
        <div className="absolute inset-x-0 bottom-2.5 flex justify-center z-20 pointer-events-none">
          <div className="w-4 h-0.5 rounded-full animate-pulse" style={{ backgroundColor: theme.primary }} />
        </div>
      )}
    </div>
  );
}

export const LOGIN_MODAL_STYLES = `
  @keyframes orbFloat {
    0%, 100% { transform: translate(0, 0) scale(1); }
    33% { transform: translate(12px, -18px) scale(1.1); }
    66% { transform: translate(-8px, 12px) scale(0.95); }
  }
  @keyframes pinGlow {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 0.8; }
  }
  @keyframes modalEnter {
    from { opacity: 0; transform: translateY(20px) scale(0.96); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes backdropIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
  @keyframes iconPulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.08); }
  }
  @keyframes progressGlow {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 1; }
  }
  @keyframes successRipple {
    0% { transform: scale(0.8); opacity: 1; }
    100% { transform: scale(2); opacity: 0; }
  }
`;

export function buildInputStyles(t: SiteModalTheme): string {
  return `
    .site-modal-input::placeholder {
      color: ${t.placeholderColor} !important;
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
      caret-color: ${t.caretColor} !important;
      transition: background-color 5000s ease-in-out 0s;
    }
  `;
}
