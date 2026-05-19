import { useState } from 'react';
import { FlaskConical, Languages, Terminal, Blocks, BookOpen, CheckCircle2 } from 'lucide-react';
import SATestTranslations from './SATestTranslations';
import SATestCommands from './SATestCommands';
import SATestFunctions from './SATestFunctions';
import SATestTutoCommands from './SATestTutoCommands';
import SATestFinishedList from './SATestFinishedList';

type Tab = 'translations' | 'commands' | 'functions' | 'tutos' | 'finished';

const TABS: { key: Tab; label: string; icon: typeof Languages }[] = [
  { key: 'translations', label: 'Traductions des tests', icon: Languages },
  { key: 'commands', label: 'Liste commandes', icon: Terminal },
  { key: 'functions', label: 'Fonctions reutilisables', icon: Blocks },
  { key: 'tutos', label: 'Tuto commande', icon: BookOpen },
  { key: 'finished', label: 'Liste des tests prets', icon: CheckCircle2 },
];

export default function SATestsSysteme() {
  const [activeTab, setActiveTab] = useState<Tab>('translations');

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', boxShadow: '0 0 20px rgba(245,158,11,0.3)' }}
          >
            <FlaskConical className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-100">Tests CRM</h1>
            <p className="text-xs text-slate-400">Gestion des tests Playwright du CRM</p>
          </div>
        </div>

        <div
          className="inline-flex rounded-lg p-1 gap-1"
          style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(51,65,85,0.5)' }}
        >
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-all"
                style={{
                  background: isActive ? 'rgba(245,158,11,0.12)' : 'transparent',
                  border: isActive ? '1px solid rgba(245,158,11,0.25)' : '1px solid transparent',
                  color: isActive ? '#f59e0b' : '#94a3b8',
                }}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
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
