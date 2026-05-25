import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';

export interface TestCommand {
  id: string;
  name: string;
  command: string;
}

interface Props {
  open: boolean;
  initial: TestCommand | null;
  onSave: (entry: TestCommand) => void;
  onClose: () => void;
}

export default function SATestCommandModal({ open, initial, onSave, onClose }: Props) {
  const t = useThemeTokens();
  const [name, setName] = useState('');
  const [command, setCommand] = useState('');

  useEffect(() => {
    if (initial) {
      setName(initial.name);
      setCommand(initial.command);
    } else {
      setName('');
      setCommand('');
    }
  }, [initial, open]);

  if (!open) return null;

  const handleSave = () => {
    const trimmedName = name.trim();
    const trimmedCmd = command.trim();
    if (!trimmedName || !trimmedCmd) return;

    onSave({
      id: initial?.id ?? crypto.randomUUID(),
      name: trimmedName,
      command: trimmedCmd,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 backdrop-blur-sm" style={{ background: t.modal.overlayBg }} onClick={onClose} />

      <div
        className="relative w-full max-w-md rounded-xl p-6"
        style={{ background: t.modal.bg, border: `1px solid ${t.modal.border}` }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-slate-100">
            {initial ? 'Modifier la commande' : 'Ajouter une commande'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-700/50 transition-colors"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Nom de la commande
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder='Exemple : "Lancer test inscription en lent"'
              className="w-full px-3 py-2 rounded-lg text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:ring-1 focus:ring-amber-500/50 transition-all"
              style={{ background: t.modal.fieldBg, border: `1px solid ${t.modal.fieldBorder}` }}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Commande
            </label>
            <input
              type="text"
              value={command}
              onChange={e => setCommand(e.target.value)}
              placeholder='Exemple : "npm.cmd run test:e2e:slow -- e2e/inscription-public.spec.ts"'
              className="w-full px-3 py-2 rounded-lg text-sm text-slate-100 font-mono placeholder:text-slate-500 outline-none focus:ring-1 focus:ring-amber-500/50 transition-all"
              style={{ background: t.modal.fieldBg, border: `1px solid ${t.modal.fieldBorder}` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium transition-all"
            style={{ background: t.surface.secondary, border: `1px solid ${t.modal.fieldBorder}`, color: t.text.secondary }}
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || !command.trim()}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              boxShadow: '0 2px 10px rgba(245,158,11,0.3)',
            }}
          >
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}
