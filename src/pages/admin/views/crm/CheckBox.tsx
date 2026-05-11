import { useThemeTokens } from '../../../../hooks/useThemeTokens';

interface CheckBoxProps {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
}

export default function CheckBox({ checked, indeterminate, onChange }: CheckBoxProps) {
  const tokens = useThemeTokens();

  return (
    <button
      onClick={onChange}
      className="flex items-center justify-center rounded transition-all duration-150 focus:outline-none flex-shrink-0"
      style={{
        width: 16,
        height: 16,
        background: checked || indeterminate ? tokens.danger.bg : tokens.input.bg,
        border: checked || indeterminate ? `1px solid ${tokens.danger.border}` : `1px solid ${tokens.input.border}`,
      }}
    >
      {checked && (
        <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
          <path d="M1 3.5L3.5 6L8 1" stroke={tokens.danger.text} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {!checked && indeterminate && (
        <svg width="8" height="2" viewBox="0 0 8 2" fill="none">
          <path d="M1 1H7" stroke={tokens.danger.text} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )}
    </button>
  );
}
