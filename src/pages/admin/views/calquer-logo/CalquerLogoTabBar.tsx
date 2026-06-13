import { Image, Palette, Layers } from 'lucide-react';

export type CalquerTab = 'logo' | 'masque' | 'couleur';

interface Props {
  activeTab: CalquerTab;
  onTabChange: (tab: CalquerTab) => void;
  showMask: boolean;
}

const ALL_TABS: { key: CalquerTab; label: string; icon: typeof Image }[] = [
  { key: 'logo', label: 'Logo', icon: Image },
  { key: 'masque', label: 'Masque', icon: Layers },
  { key: 'couleur', label: 'Couleur', icon: Palette },
];

export default function CalquerLogoTabBar({ activeTab, onTabChange, showMask }: Props) {
  const tabs = showMask ? ALL_TABS : ALL_TABS.filter(t => t.key !== 'masque');

  return (
    <div className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5"
      style={{
        background: 'rgba(15,23,42,0.7)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
      {tabs.map(({ key, label, icon: Icon }) => {
        const active = activeTab === key;
        return (
          <button key={key} onClick={() => onTabChange(key)}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-semibold transition-all duration-200"
            style={{
              background: active ? 'rgba(59,130,246,0.15)' : 'transparent',
              border: `1px solid ${active ? 'rgba(59,130,246,0.3)' : 'transparent'}`,
              color: active ? '#60a5fa' : 'rgba(148,163,184,0.6)',
            }}>
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
