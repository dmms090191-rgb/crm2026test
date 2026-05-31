import { useState } from 'react';
import { Settings2, FileText, Palette, Sparkles, Star } from 'lucide-react';
import type { ThemeTokens } from '../../../../../lib/themeTokensTypes';
import type { SectionConfig } from './templateSectionsConfig';
import { ICON_MAP } from './settings/settingsIconMap';
import SettingsContentTab from './settings/SettingsContentTab';
import SettingsStyleTab from './settings/SettingsStyleTab';
import SettingsAdvancedTab from './settings/SettingsAdvancedTab';

type SettingsSubTab = 'contenu' | 'style' | 'avance';

interface Props {
  section: SectionConfig | null;
  t: ThemeTokens;
  contentValues?: Record<string, string>;
  styleValues?: Record<string, string>;
  onFieldChange?: (fieldKey: string, value: string) => void;
  onStyleChange?: (styleKey: string, value: string) => void;
  onFieldFocus?: (fieldKey: string) => void;
  onResetSection?: () => void;
}

export default function StudioSectionSettings({
  section, t, contentValues, styleValues,
  onFieldChange, onStyleChange, onFieldFocus, onResetSection,
}: Props) {
  const [subTab, setSubTab] = useState<SettingsSubTab>('contenu');

  if (!section) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-4 py-12">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
          style={{ background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.15)' }}
        >
          <Settings2 className="w-5 h-5" style={{ color: 'rgba(14,165,233,0.4)' }} />
        </div>
        <p className="text-[11px] font-medium text-center leading-relaxed" style={{ color: t.text.tertiary }}>
          Selectionnez ou ajoutez un element pour commencer.
        </p>
      </div>
    );
  }

  const subTabs: { id: SettingsSubTab; label: string; icon: React.ReactNode }[] = [
    { id: 'contenu', label: 'Contenu', icon: <FileText className="w-3 h-3" /> },
    { id: 'style', label: 'Style', icon: <Palette className="w-3 h-3" /> },
    { id: 'avance', label: 'Avance', icon: <Sparkles className="w-3 h-3" /> },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-3 flex items-center gap-2" style={{ borderBottom: `1px solid ${t.surface.border}` }}>
        <div
          className="w-6 h-6 rounded-md flex items-center justify-center"
          style={{ background: 'rgba(245,158,11,0.1)' }}
        >
          <span className="text-[10px] font-black" style={{ color: '#f59e0b' }}>3</span>
        </div>
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <span style={{ color: '#0ea5e9' }}>
            {ICON_MAP[section.icon] ?? <Star className="w-4 h-4" />}
          </span>
          <h3 className="text-xs font-bold truncate" style={{ color: t.text.primary }}>
            {section.label}
          </h3>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-0.5 px-2 pt-2">
        {subTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setSubTab(tab.id)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[10px] font-semibold transition-all flex-1 justify-center"
            style={{
              background: subTab === tab.id ? 'rgba(14,165,233,0.08)' : 'transparent',
              border: subTab === tab.id ? '1px solid rgba(14,165,233,0.2)' : '1px solid transparent',
              color: subTab === tab.id ? '#0ea5e9' : t.text.quaternary,
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {subTab === 'contenu' && (
          <SettingsContentTab
            section={section}
            t={t}
            values={contentValues}
            onChange={onFieldChange}
            onFieldFocus={onFieldFocus}
            onResetSection={onResetSection}
          />
        )}
        {subTab === 'style' && (
          <SettingsStyleTab
            section={section}
            t={t}
            values={styleValues}
            onChange={onStyleChange}
          />
        )}
        {subTab === 'avance' && <SettingsAdvancedTab t={t} />}
      </div>
    </div>
  );
}
