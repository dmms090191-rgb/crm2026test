import { useState, useCallback } from 'react';
import { Sparkles, List, Image as ImageIcon } from 'lucide-react';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import LogoAiTab from './LogoAiTab';
import LogoListTab from './LogoListTab';

type LogoSubTab = 'ai' | 'list';

interface TabDef { id: LogoSubTab; label: string; icon: React.ReactNode }

const TABS: TabDef[] = [
  { id: 'ai', label: 'Logo IA', icon: <Sparkles className="w-4 h-4" /> },
  { id: 'list', label: 'Liste des logos', icon: <List className="w-4 h-4" /> },
];

interface Props {
  companyId: string | null;
  title?: string;
  subtitle?: string;
}

export default function LogoPage({ companyId, title = 'Logo', subtitle = 'Gerez les logos de votre societe' }: Props) {
  const t = useThemeTokens();
  const [activeTab, setActiveTab] = useState<LogoSubTab>('ai');
  const [listKey, setListKey] = useState(0);

  const handleSaved = useCallback(() => {
    setListKey(k => k + 1);
  }, []);

  const handleSwitchToUpload = useCallback(() => {
    setActiveTab('list');
  }, []);

  return (
    <div className="space-y-5">
      {/* Premium header */}
      <div
        className="relative overflow-hidden rounded-2xl p-5 sm:p-6"
        style={{
          background: t.card.bg,
          border: `1px solid ${t.card.border}`,
          boxShadow: `0 1px 3px rgba(0,0,0,0.04), ${t.card.shadow}`,
        }}
      >
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'radial-gradient(circle at 20% 50%, #f59e0b 0%, transparent 50%), radial-gradient(circle at 80% 50%, #d97706 0%, transparent 50%)',
          }}
        />
        <div className="relative flex items-center gap-4">
          <div
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              boxShadow: '0 4px 20px rgba(245,158,11,0.3), 0 0 0 1px rgba(245,158,11,0.1)',
            }}
          >
            <ImageIcon className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2
              className="text-base sm:text-lg font-bold tracking-tight"
              style={{ color: t.heading.primary }}
            >
              {title}
            </h2>
            <p className="text-xs sm:text-sm mt-0.5" style={{ color: t.label.muted }}>
              {subtitle}
            </p>
            <p className="text-[11px] sm:text-xs mt-1 hidden sm:block" style={{ color: t.text.quaternary }}>
              Creez, importez, editez et selectionnez les logos de votre marque.
            </p>
          </div>
        </div>
      </div>

      {/* Tab navigation + content */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: t.card.bg,
          border: `1px solid ${t.card.border}`,
          boxShadow: `0 1px 3px rgba(0,0,0,0.04), ${t.card.shadow}`,
        }}
      >
        {/* Tab bar */}
        <div
          className="flex gap-0 px-1 pt-1"
          style={{ borderBottom: `1px solid ${t.card.border}` }}
        >
          {TABS.map(tab => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="relative flex items-center gap-2 px-4 sm:px-5 py-3 sm:py-3.5 text-xs sm:text-[13px] font-semibold whitespace-nowrap transition-colors"
                style={{
                  color: active ? '#d97706' : t.text.tertiary,
                  background: 'transparent',
                }}
              >
                <span style={{ opacity: active ? 1 : 0.6 }}>{tab.icon}</span>
                {tab.label}
                {active && (
                  <span
                    className="absolute bottom-0 left-3 right-3 h-[2px] rounded-t-full"
                    style={{ background: 'linear-gradient(90deg, #f59e0b, #d97706)' }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div className="p-4 sm:p-5 min-h-[200px]">
          <div style={{ display: activeTab === 'ai' ? undefined : 'none' }}>
            <LogoAiTab
              companyId={companyId}
              onSaved={handleSaved}
              onSwitchToUpload={handleSwitchToUpload}
            />
          </div>
          {activeTab === 'list' && <LogoListTab key={listKey} companyId={companyId} onSwitchToAi={() => setActiveTab('ai')} />}
        </div>
      </div>
    </div>
  );
}
