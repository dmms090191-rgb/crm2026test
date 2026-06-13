import { useState } from 'react';
import { FlaskConical, Languages, Terminal, Blocks, BookOpen, CheckCircle2 } from 'lucide-react';
import SATestTranslations from './SATestTranslations';
import SATestCommands from './SATestCommands';
import SATestFunctions from './SATestFunctions';
import SATestTutoCommands from './SATestTutoCommands';
import SATestFinishedList from './SATestFinishedList';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';

type Tab = 'translations' | 'commands' | 'functions' | 'tutos' | 'finished';

const TABS: { key: Tab; label: string; icon: typeof Languages }[] = [
  { key: 'translations', label: 'Traductions des tests', icon: Languages },
  { key: 'commands', label: 'Liste commandes', icon: Terminal },
  { key: 'functions', label: 'Fonctions reutilisables', icon: Blocks },
  { key: 'tutos', label: 'Tuto commande', icon: BookOpen },
  { key: 'finished', label: 'Liste des tests prets', icon: CheckCircle2 },
];

export default function SATestsSysteme() {
  const t = useThemeTokens();
  const [activeTab, setActiveTab] = useState<Tab>('translations');

  return (
    <div className="p-3 sm:p-4 md:p-6 max-w-5xl mx-auto">
      <div className="mb-4 md:mb-6">
        <div className="flex items-center gap-2.5 sm:gap-3 mb-3 md:mb-4">
          <div
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', boxShadow: '0 0 20px rgba(245,158,11,0.3)' }}
          >
            <FlaskConical className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold" style={{ color: t.text.primary }}>Tests CRM</h1>
            <p className="text-[11px] sm:text-xs" style={{ color: t.text.tertiary }}>Gestion des tests Playwright du CRM</p>
          </div>
        </div>

        <div
          className="flex overflow-x-auto rounded-lg p-1 gap-1 scrollbar-none"
          style={{
            background: `linear-gradient(135deg, ${t.surface.secondary}, ${t.surface.secondary}80)`,
            border: `1px solid ${t.surface.border}`,
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 1px 2px rgba(0,0,0,0.04)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}
        >
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-md text-[11px] sm:text-xs font-medium transition-all whitespace-nowrap flex-shrink-0"
                style={{
                  background: isActive ? 'rgba(245,158,11,0.12)' : 'transparent',
                  border: isActive ? '1px solid rgba(245,158,11,0.25)' : '1px solid transparent',
                  color: isActive ? '#f59e0b' : '#94a3b8',
                }}
              >
                <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.split(' ').slice(0, 1).join('')}</span>
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === 'translations' && <SATestTranslations />}
      {activeTab === 'commands' && <SATestCommands />}
      {activeTab === 'functions' && <SATestFunctions />}
      {activeTab === 'tutos' && <SATestTutoCommands />}
      {activeTab === 'finished' && <SATestFinishedList />}
    </div>
  );
}
