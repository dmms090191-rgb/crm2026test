import { Eye, EyeOff, Lock } from 'lucide-react';
import type { ThemeTokens } from '../../lib/themeTokensTypes';

interface Props {
  digits: string[];
  showPin: boolean;
  setShowPin: (v: boolean | ((p: boolean) => boolean)) => void;
  isDark: boolean;
  tokens: ThemeTokens;
  pinRefs: React.MutableRefObject<(HTMLInputElement | null)[]>;
  handlePinInput: (index: number, value: string) => void;
  handlePinKeyDown: (index: number, e: React.KeyboardEvent<HTMLInputElement>) => void;
  handlePinFocus: (index: number) => void;
}

export default function LoginPinInput({
  digits, showPin, setShowPin, isDark, tokens, pinRefs, handlePinInput, handlePinKeyDown, handlePinFocus,
}: Props) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" style={{ color: tokens.input.placeholder }} />
          <label className="text-xs sm:text-sm font-medium truncate" style={{ color: tokens.modal.fieldLabel }}>Mot de passe (6 chiffres)</label>
        </div>
        <button
          type="button"
          onClick={() => setShowPin((v: boolean) => !v)}
          className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex-shrink-0 ml-2"
          style={{
            background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
            color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.55)',
            border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.12)',
          }}
        >
          {showPin ? <EyeOff className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> : <Eye className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
          {showPin ? 'Masquer' : 'Afficher'}
        </button>
      </div>

      <div className="flex gap-1.5 sm:gap-2 justify-center w-full max-w-[320px] mx-auto">
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={el => { pinRefs.current[i] = el; }}
            type={showPin ? 'text' : 'password'}
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={e => handlePinInput(i, e.target.value)}
            onKeyDown={e => handlePinKeyDown(i, e)}
            onFocus={() => handlePinFocus(i)}
            className="flex-1 min-w-0 max-w-[48px] sm:max-w-[56px] aspect-[4/5] rounded-lg sm:rounded-xl text-center text-lg sm:text-xl font-bold transition-all caret-transparent"
            style={{
              background: digit
                ? 'rgba(249,115,22,0.1)'
                : isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
              border: digit
                ? '1px solid rgba(249,115,22,0.4)'
                : isDark ? '1px solid rgba(255,255,255,0.09)' : '1px solid rgba(0,0,0,0.15)',
              outline: 'none',
              color: isDark ? '#ffffff' : '#1a1a2e',
            }}
            onFocusCapture={e => (e.currentTarget.style.borderColor = 'rgba(249,115,22,0.6)')}
            onBlurCapture={e => (e.currentTarget.style.borderColor = digit
              ? 'rgba(249,115,22,0.4)'
              : isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.15)'
            )}
          />
        ))}
      </div>
      <p className="text-xs text-center mt-2" style={{ color: tokens.label.hint }}>Utilisez les flèches gauche/droite pour naviguer</p>
    </div>
  );
}
