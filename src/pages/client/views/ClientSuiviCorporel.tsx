import { useState } from 'react';
import { Activity, ClipboardPlus, List } from 'lucide-react';
import { useThemeTokens } from '../../../hooks/useThemeTokens';
import SuiviCorporelForm from './suivi-corporel/SuiviCorporelForm';
import SuiviCorporelList from './suivi-corporel/SuiviCorporelList';

type SubTab = 'ajouter' | 'liste';

const TABS: { id: SubTab; label: string; icon: typeof ClipboardPlus }[] = [
  { id: 'ajouter', label: 'Ajouter un bilan', icon: ClipboardPlus },
  { id: 'liste', label: 'Liste des bilans', icon: List },
];

interface Props {
  clientId: string;
  clientEmail: string;
}

export default function ClientSuiviCorporel({ clientId, clientEmail }: Props) {
  const tokens = useThemeTokens();
  const [activeTab, setActiveTab] = useState<SubTab>('ajouter');
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSaved = () => {
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-5 md:gap-6">
      <SuiviHeader tokens={tokens} />
      <SubTabBar activeTab={activeTab} onTabChange={setActiveTab} tokens={tokens} />
      <div className="flex-1 min-h-0">
        {activeTab === 'ajouter' ? (
          <SuiviCorporelForm
            clientId={clientId}
            clientEmail={clientEmail}
            onSaved={handleSaved}
          />
        ) : (
          <SuiviCorporelList
            clientId={clientId}
            refreshKey={refreshKey}
          />
        )}
      </div>
    </div>
  );
}

function SuiviHeader({ tokens }: { tokens: ReturnType<typeof useThemeTokens> }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{
          background: 'linear-gradient(135deg, rgba(16,185,129,0.18), rgba(16,185,129,0.06))',
          boxShadow: '0 0 24px rgba(16,185,129,0.08)',
        }}
      >
        <Activity className="w-5 h-5" style={{ color: '#10b981' }} />
      </div>
      <div>
        <h2 className="text-lg md:text-xl font-bold leading-tight" style={{ color: tokens.text.primary }}>
          Suivi corporel
        </h2>
        <p className="text-xs mt-0.5" style={{ color: tokens.text.tertiary }}>
          Suivez l'evolution de vos bilans
        </p>
      </div>
    </div>
  );
}

function SubTabBar({ activeTab, onTabChange, tokens }: {
  activeTab: SubTab;
  onTabChange: (t: SubTab) => void;
  tokens: ReturnType<typeof useThemeTokens>;
}) {
  return (
    <div className="flex overflow-x-auto no-scrollbar" style={{ WebkitOverflowScrolling: 'touch' }}>
      <div
        className="inline-flex rounded-xl p-1 gap-1"
        style={{
          background: tokens.card.bg,
          border: `1px solid ${tokens.card.border}`,
          boxShadow: tokens.card.shadow,
        }}
      >
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="relative flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-all duration-200"
              style={{
                background: active ? 'rgba(16,185,129,0.12)' : 'transparent',
                color: active ? '#10b981' : tokens.text.tertiary,
                boxShadow: active ? '0 1px 4px rgba(16,185,129,0.10)' : 'none',
              }}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {tab.label}
              {active && (
                <span
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                  style={{ background: '#10b981' }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
