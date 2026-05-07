import { useState } from 'react';
import { CheckCircle, XCircle, Trash2, X, Check } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import type { Registration } from './inscriptionTypes';
import { formatDate, formatTime } from './inscriptionTypes';

interface HistoryModalProps {
  type: 'accepted' | 'refused';
  rows: Registration[];
  onClose: () => void;
  onDelete: (ids: string[]) => void;
}

export default function HistoryModal({ type, rows, onClose, onDelete }: HistoryModalProps) {
  const tokens = useThemeTokens();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setSelected(prev => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id); else s.add(id);
      return s;
    });
  };

  const toggleAll = () => {
    setSelected(prev => prev.size === rows.length ? new Set() : new Set(rows.map(r => r.id)));
  };

  const isAccepted = type === 'accepted';
  const accentColor = isAccepted ? tokens.success.text : tokens.danger.text;
  const accentBg = isAccepted ? tokens.success.bg : tokens.danger.bg;
  const accentBorder = isAccepted ? tokens.success.border : tokens.danger.border;

  return (
    <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4" style={{ background: tokens.modal.overlayBg }}>
      <div
        className="w-full max-w-3xl rounded-2xl overflow-hidden flex flex-col"
        style={{ background: tokens.card.bg, border: tokens.card.border, maxHeight: '85vh' }}
      >
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: tokens.card.border }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: accentBg, border: `1px solid ${accentBorder}` }}>
              {isAccepted ? <CheckCircle className="w-4 h-4" style={{ color: accentColor }} /> : <XCircle className="w-4 h-4" style={{ color: accentColor }} />}
            </div>
            <div>
              <h3 className="text-sm font-bold" style={{ color: tokens.text.primary }}>{isAccepted ? 'Historique — Acceptes' : 'Historique — Refuses'}</h3>
              <p className="text-xs" style={{ color: tokens.text.quaternary }}>{rows.length} enregistrement{rows.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center transition-all" style={{ color: tokens.text.tertiary }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {rows.length === 0 ? (
          <div className="flex-1 flex items-center justify-center py-16">
            <p className="text-sm" style={{ color: tokens.text.quaternary }}>Aucun enregistrement</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 px-5 py-3" style={{ borderBottom: tokens.table.rowBorder }}>
              <button
                onClick={toggleAll}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                style={{ background: tokens.input.bg, color: tokens.text.tertiary, border: tokens.input.border }}
              >
                <Check className="w-3 h-3" />
                {selected.size === rows.length ? 'Tout deselectionner' : 'Tout selectionner'}
              </button>
              {selected.size > 0 && (
                <button
                  onClick={() => { onDelete([...selected]); setSelected(new Set()); }}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                  style={{ background: tokens.danger.bg, color: tokens.danger.text, border: tokens.danger.border }}
                >
                  <Trash2 className="w-3 h-3" />
                  Supprimer la selection ({selected.size})
                </button>
              )}
              <button
                onClick={() => onDelete(rows.map(r => r.id))}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ml-auto"
                style={{ background: tokens.danger.bg, color: tokens.danger.text, border: tokens.danger.border, opacity: 0.7 }}
              >
                <Trash2 className="w-3 h-3" />
                Vider la liste
              </button>
            </div>

            <div className="overflow-auto flex-1">
              <table className="w-full text-sm">
                <thead style={{ background: tokens.table.headerBg }}>
                  <tr style={{ borderBottom: tokens.table.rowBorder }}>
                    <th className="text-left px-4 py-2.5 text-[10px] font-bold tracking-[0.12em] uppercase w-8" style={{ color: tokens.table.headerText }}></th>
                    <th className="text-left px-4 py-2.5 text-[10px] font-bold tracking-[0.12em] uppercase" style={{ color: tokens.table.headerText }}>Prenom</th>
                    <th className="text-left px-4 py-2.5 text-[10px] font-bold tracking-[0.12em] uppercase" style={{ color: tokens.table.headerText }}>Nom</th>
                    <th className="text-left px-4 py-2.5 text-[10px] font-bold tracking-[0.12em] uppercase" style={{ color: tokens.table.headerText }}>Email</th>
                    <th className="text-left px-4 py-2.5 text-[10px] font-bold tracking-[0.12em] uppercase" style={{ color: tokens.table.headerText }}>Telephone</th>
                    <th className="text-left px-4 py-2.5 text-[10px] font-bold tracking-[0.12em] uppercase" style={{ color: tokens.table.headerText }}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => (
                    <tr
                      key={row.id}
                      style={{
                        borderBottom: tokens.table.rowBorder,
                        background: selected.has(row.id) ? tokens.table.rowHover : 'transparent',
                      }}
                    >
                      <td className="px-4 py-2.5">
                        <input
                          type="checkbox"
                          checked={selected.has(row.id)}
                          onChange={() => toggle(row.id)}
                          className="w-3.5 h-3.5 rounded cursor-pointer"
                          style={{ accentColor: tokens.accent.bg }}
                        />
                      </td>
                      <td className="px-4 py-2.5 font-medium" style={{ color: tokens.text.secondary }}>{row.first_name}</td>
                      <td className="px-4 py-2.5" style={{ color: tokens.text.secondary }}>{row.last_name}</td>
                      <td className="px-4 py-2.5 text-xs" style={{ color: tokens.text.tertiary }}>{row.email}</td>
                      <td className="px-4 py-2.5 text-xs" style={{ color: tokens.text.tertiary }}>{row.phone || '—'}</td>
                      <td className="px-4 py-2.5 text-xs whitespace-nowrap" style={{ color: tokens.text.tertiary }}>
                        {formatDate(row.registered_at)} {formatTime(row.registered_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
