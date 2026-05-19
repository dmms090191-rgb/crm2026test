import { useState, useCallback } from 'react';
import { Terminal, Plus, Pencil, Trash2, Copy, Check } from 'lucide-react';
import SATestCommandModal, { type TestCommand } from './SATestCommandModal';

const STORAGE_KEY = 'crm_test_commands';

const DEFAULT_COMMANDS: TestCommand[] = [
  { id: 'default-1', name: 'Lancer tous les tests', command: 'npm.cmd run test:e2e' },
  { id: 'default-2', name: 'Interface Playwright', command: 'npx.cmd playwright test --ui' },
  { id: 'default-3', name: 'Voir les tests en direct', command: 'npx.cmd playwright test --headed' },
  { id: 'default-4', name: 'Liste des tests disponibles', command: 'npx.cmd playwright test --list' },
  { id: 'default-5', name: 'Test inscription en lent', command: 'npm.cmd run test:e2e:slow -- e2e/inscription-public.spec.ts' },
  { id: 'default-6', name: 'Test inscription en debug', command: 'npm.cmd run test:e2e:debug -- e2e/inscription-public.spec.ts' },
  { id: 'default-7', name: 'Rapport Playwright', command: 'npx.cmd playwright show-report' },
];

function loadCommands(): TestCommand[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_COMMANDS));
      return DEFAULT_COMMANDS;
    }
    return JSON.parse(raw) as TestCommand[];
  } catch {
    return DEFAULT_COMMANDS;
  }
}

function saveCommands(items: TestCommand[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export default function SATestCommands() {
  const [items, setItems] = useState<TestCommand[]>(loadCommands);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TestCommand | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleSave = useCallback((entry: TestCommand) => {
    setItems(prev => {
      const exists = prev.findIndex(t => t.id === entry.id);
      const next = exists >= 0
        ? prev.map(t => (t.id === entry.id ? entry : t))
        : [...prev, entry];
      saveCommands(next);
      return next;
    });
    setEditing(null);
  }, []);

  const handleDelete = useCallback((id: string) => {
    setItems(prev => {
      const next = prev.filter(t => t.id !== id);
      saveCommands(next);
      return next;
    });
  }, []);

  const handleCopy = async (item: TestCommand) => {
    try {
      await navigator.clipboard.writeText(item.command);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // fallback silently
    }
  };

  const openAdd = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (item: TestCommand) => {
    setEditing(item);
    setModalOpen(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)' }}
          >
            <Terminal className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100">Commandes Playwright</h2>
            <p className="text-[11px] text-slate-400">{items.length} commande{items.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white transition-all"
          style={{
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            boxShadow: '0 2px 10px rgba(245,158,11,0.3)',
          }}
        >
          <Plus className="w-3.5 h-3.5" />
          Ajouter une commande
        </button>
      </div>

      {items.length === 0 ? (
        <div
          className="rounded-xl p-6 text-center"
          style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(51,65,85,0.5)' }}
        >
          <p className="text-xs text-slate-500">Aucune commande enregistree.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(item => (
            <div
              key={item.id}
              className="rounded-xl p-3 flex flex-col sm:flex-row sm:items-center gap-2"
              style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(51,65,85,0.5)' }}
            >
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-200">{item.name}</p>
                <p
                  className="text-[11px] font-mono text-amber-300/80 mt-1 px-2 py-1 rounded-md truncate"
                  style={{ background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(71,85,105,0.3)' }}
                >
                  {item.command}
                </p>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleCopy(item)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all"
                  style={{
                    background: copiedId === item.id ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.1)',
                    border: copiedId === item.id ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(245,158,11,0.25)',
                    color: copiedId === item.id ? '#4ade80' : '#f59e0b',
                  }}
                  title="Copier"
                >
                  {copiedId === item.id
                    ? <><Check className="w-3 h-3" /> Copiee</>
                    : <><Copy className="w-3 h-3" /> Copier</>
                  }
                </button>
                <button
                  onClick={() => openEdit(item)}
                  className="p-1.5 rounded-md hover:bg-slate-700/50 transition-colors"
                  title="Modifier"
                >
                  <Pencil className="w-3.5 h-3.5 text-slate-400" />
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="p-1.5 rounded-md hover:bg-red-500/10 transition-colors"
                  title="Supprimer"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <SATestCommandModal
        open={modalOpen}
        initial={editing}
        onSave={handleSave}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
