import { useState } from 'react';
import type { ThemeTokens } from '../../../../lib/themeTokensTypes';

interface Props {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  tokens: ThemeTokens['dropdown'];
}

export default function VendorThemeOption({ icon, label, active, onClick, tokens }: Props) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors duration-150"
      style={{
        color: active ? tokens.activeCheck : (hovered ? tokens.itemTextHover : tokens.itemText),
        background: hovered ? tokens.itemBgHover : 'transparent',
      }}
    >
      {icon}
      <span className="font-medium flex-1 text-left">{label}</span>
      {active && (
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: tokens.activeCheck, boxShadow: `0 0 6px ${tokens.activeCheck}` }} />
      )}
    </button>
  );
}
