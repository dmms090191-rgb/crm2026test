import { useState } from 'react';
import { X, Eye, EyeOff, Lock } from 'lucide-react';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import { isProtectedTab } from './useSAHiddenTabs';
import type { SidebarSection } from '../../lib/sidebarOrderTypes';

interface Props {
  open: boolean;
  onClose: () => void;
  sections: SidebarSection[];
  hiddenTabs: Set<string>;
  onToggle: (tabId: string) => void;
}

export default function SAHideTabsModal({ open, onClose, sections, hiddenTabs, onToggle }: Props) {
  const t = useThemeTokens();

  if (!open) return null;

  const allItems = sections.flatMap(s => s.items.map(item => ({ ...item, section: s.title })));

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg max-h-[85vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: t.card.bg, border: `1px solid ${t.card.border}` }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: `1px solid ${t.card.border}` }}>
          <div>
            <h2 className="text-lg font-bold" style={{ color: t.card.title }}>
              Masquer les onglets Rois Admin
            </h2>
            <p className="text-sm mt-0.5" style={{ color: t.card.subtitle }}>
              Choisissez les onglets a afficher ou masquer dans votre sidebar.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl transition-all duration-200 hover:opacity-80"
            style={{ background: t.card.bg, border: `1px solid ${t.card.border}` }}
          >
            <X className="w-4 h-4" style={{ color: t.card.subtitle }} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {sections.map(section => (
            <div key={section.title}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: t.card.subtitle }}>
                {section.title}
              </p>
              <div className="space-y-1">
                {section.items.map(item => (
                  <TabRow
                    key={item.id}
                    id={item.id}
                    label={item.label}
                    icon={item.icon}
                    isHidden={hiddenTabs.has(item.id)}
                    isProtected={isProtectedTab(item.id)}
                    onToggle={onToggle}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderTop: `1px solid ${t.card.border}` }}
        >
          <p className="text-xs" style={{ color: t.card.subtitle }}>
            {hiddenTabs.size} onglet{hiddenTabs.size !== 1 ? 's' : ''} masque{hiddenTabs.size !== 1 ? 's' : ''}
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 hover:opacity-90"
            style={{ background: t.button.primaryBg, color: t.button.primaryText }}
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

function TabRow({ id, label, icon, isHidden, isProtected, onToggle }: {
  id: string;
  label: string;
  icon: React.ReactNode;
  isHidden: boolean;
  isProtected: boolean;
  onToggle: (id: string) => void;
}) {
  const t = useThemeTokens();
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200"
      style={{
        background: hovered ? `${t.button.primaryBg}08` : 'transparent',
        border: `1px solid ${hovered ? t.card.border : 'transparent'}`,
        opacity: isHidden ? 0.5 : 1,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex items-center gap-3">
        <span style={{ color: isHidden ? t.card.subtitle : t.card.title }}>{icon}</span>
        <span
          className="text-sm font-medium"
          style={{ color: isHidden ? t.card.subtitle : t.card.title }}
        >
          {label}
        </span>
      </div>

      {isProtected ? (
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs"
          style={{ background: `${t.card.subtitle}15`, color: t.card.subtitle }}
          title="Cet onglet ne peut pas etre masque"
        >
          <Lock className="w-3 h-3" />
          <span>Protege</span>
        </div>
      ) : (
        <button
          onClick={() => onToggle(id)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200"
          style={{
            background: isHidden ? '#ef444415' : `${t.button.primaryBg}15`,
            color: isHidden ? '#ef4444' : t.button.primaryBg,
            border: `1px solid ${isHidden ? '#ef444425' : `${t.button.primaryBg}25`}`,
          }}
        >
          {isHidden ? (
            <>
              <EyeOff className="w-3.5 h-3.5" />
              <span>Masque</span>
            </>
          ) : (
            <>
              <Eye className="w-3.5 h-3.5" />
              <span>Visible</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
