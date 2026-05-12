import { useState } from 'react';
import { X, Trash2 } from 'lucide-react';
import type { useThemeTokens } from '../../../../../hooks/useThemeTokens';
import type { SystemStatus } from '../types';

interface Props {
  statuses: SystemStatus[];
  tokens: ReturnType<typeof useThemeTokens>;
  onCreateStatus: (name: string, color: string, icon: string) => void;
  onUpdateStatus: (id: string, updates: Partial<Pick<SystemStatus, 'name' | 'color' | 'icon' | 'is_active'>>) => void;
  onDeleteStatus: (id: string) => void;
  onClose: () => void;
}

export default function SystemStatusModal({ statuses, tokens, onCreateStatus, onUpdateStatus, onDeleteStatus, onClose }: Props) {
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#3b82f6');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const sorted = [...statuses].sort((a, b) => a.position - b.position);

  const handleCreate = () => {
    if (!newName.trim()) return;
    onCreateStatus(newName.trim(), newColor, 'circle');
    setNewName('');
    setNewColor('#3b82f6');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: tokens.modal.overlayBg }}>
      <div className="relative w-full max-w-lg rounded-xl shadow-2xl max-h-[80vh] flex flex-col" style={{ background: tokens.modal.bg, border: `1px solid ${tokens.modal.border}` }}>
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: tokens.surface.border }}>
          <h3 className="text-base font-semibold" style={{ color: tokens.modal.title }}>Gerer les statuts</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ background: tokens.modal.closeBtnBg, color: tokens.modal.closeBtnText }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-2">
          {sorted.map((s) => (
            <div key={s.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg" style={{ background: tokens.surface.secondary, border: `1px solid ${tokens.surface.border}` }}>
              <input
                type="color"
                value={s.color}
                onChange={(e) => onUpdateStatus(s.id, { color: e.target.value })}
                className="w-6 h-6 rounded cursor-pointer border-0 p-0"
                style={{ background: 'none' }}
              />
              <input
                type="text"
                defaultValue={s.name}
                onBlur={(e) => { if (e.target.value.trim() && e.target.value !== s.name) onUpdateStatus(s.id, { name: e.target.value.trim() }); }}
                className="flex-1 text-sm px-2 py-1 rounded outline-none"
                style={{ background: tokens.input.bg, border: `1px solid ${tokens.input.border}`, color: tokens.input.text }}
              />
              <button
                onClick={() => onUpdateStatus(s.id, { is_active: !s.is_active })}
                className="px-2 py-1 rounded text-[10px] font-medium"
                style={{
                  background: s.is_active ? '#22c55e18' : tokens.surface.tertiary,
                  color: s.is_active ? '#22c55e' : tokens.text.quaternary,
                  border: `1px solid ${s.is_active ? '#22c55e40' : tokens.surface.border}`,
                }}
              >
                {s.is_active ? 'Actif' : 'Inactif'}
              </button>
              {confirmDeleteId === s.id ? (
                <div className="flex items-center gap-1">
                  <button onClick={() => { onDeleteStatus(s.id); setConfirmDeleteId(null); }} className="px-2 py-0.5 rounded text-[10px] font-medium" style={{ background: tokens.danger.bg, color: tokens.danger.text }}>Oui</button>
                  <button onClick={() => setConfirmDeleteId(null)} className="px-2 py-0.5 rounded text-[10px] font-medium" style={{ background: tokens.surface.tertiary, color: tokens.text.tertiary }}>Non</button>
                </div>
              ) : (
                <button onClick={() => setConfirmDeleteId(s.id)} className="p-1 rounded" style={{ color: tokens.text.tertiary }}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="p-5 border-t flex items-center gap-2" style={{ borderColor: tokens.surface.border }}>
          <input
            type="color"
            value={newColor}
            onChange={(e) => setNewColor(e.target.value)}
            className="w-8 h-8 rounded cursor-pointer border-0 p-0"
          />
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
            placeholder="Nouveau statut..."
            className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
            style={{ background: tokens.input.bg, border: `1px solid ${tokens.input.border}`, color: tokens.input.text }}
          />
          <button
            onClick={handleCreate}
            disabled={!newName.trim()}
            className="px-4 py-2 rounded-lg text-xs font-medium disabled:opacity-40"
            style={{ background: tokens.accent.bg, color: tokens.accent.text, border: `1px solid ${tokens.accent.border}` }}
          >
            Ajouter
          </button>
        </div>
      </div>
    </div>
  );
}
