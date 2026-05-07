import { useState } from 'react';
import { Pencil, Trash2, ChevronDown, ChevronUp, Clock, Calendar } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';

export interface Note {
  id: string;
  title: string;
  content: string;
  note_date: string;
  time_start: string;
  time_end: string;
  created_at: string;
}

interface NotesListProps {
  notes: Note[];
  onEdit: (note: Note) => void;
  onDelete: (id: string) => void;
}

function formatDate(dateStr: string) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

function timeRange(start: string, end: string) {
  if (!start && !end) return null;
  if (start && end) return `${start} – ${end}`;
  if (start) return `${start}`;
  return `${end}`;
}

export default function NotesList({ notes, onEdit, onDelete }: NotesListProps) {
  const tokens = useThemeTokens();

  const [expanded, setExpanded] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  if (notes.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-10 rounded-xl"
        style={{ background: tokens.surface.borderLight, border: `1px solid ${tokens.surface.borderLight}` }}
      >
        <p className="text-xs" style={{ color: tokens.text.quaternary }}>Aucune note pour l'instant</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      {notes.map((note) => {
        const isOpen = expanded === note.id;
        const tr = timeRange(note.time_start, note.time_end);

        return (
          <div
            key={note.id}
            className="rounded-xl overflow-hidden transition-all duration-150"
            style={{
              background: isOpen ? tokens.accent.bg : 'rgba(255,255,255,0.02)',
              border: isOpen ? `1px solid ${tokens.accent.border}` : `1px solid ${tokens.surface.borderLight}`,
            }}
          >
            <div
              className="flex items-center gap-3 px-4 py-2.5 cursor-pointer select-none"
              onClick={() => setExpanded(isOpen ? null : note.id)}
            >
              <div className="flex flex-col flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="flex items-center gap-1 text-xs" style={{ color: tokens.text.quaternary }}>
                    <Calendar className="w-3 h-3 flex-shrink-0" />
                    {formatDate(note.note_date)}
                  </span>
                  {tr && (
                    <span className="flex items-center gap-1 text-xs" style={{ color: tokens.text.quaternary }}>
                      <Clock className="w-3 h-3 flex-shrink-0" />
                      {tr}
                    </span>
                  )}
                </div>
                <span className="text-xs font-medium truncate" style={{ color: isOpen ? tokens.accent.text : tokens.text.secondary }}>
                  {note.title}
                </span>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit(note); }}
                  className="flex items-center justify-center w-6 h-6 rounded-md transition-all duration-100"
                  style={{ color: tokens.text.quaternary }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = tokens.accent.text; e.currentTarget.style.background = tokens.accent.bg; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = tokens.text.quaternary; e.currentTarget.style.background = 'transparent'; }}
                  title="Modifier"
                >
                  <Pencil className="w-3 h-3" />
                </button>
                {confirmDelete === note.id ? (
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => { onDelete(note.id); setConfirmDelete(null); }}
                      className="text-xs px-2 py-0.5 rounded-md font-medium transition-all duration-100"
                      style={{ background: tokens.danger.bg, border: `1px solid ${tokens.danger.border}`, color: tokens.danger.text }}
                    >
                      Confirmer
                    </button>
                    <button
                      onClick={() => setConfirmDelete(null)}
                      className="text-xs px-2 py-0.5 rounded-md transition-all duration-100"
                      style={{ color: tokens.text.tertiary }}
                    >
                      Non
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={(e) => { e.stopPropagation(); setConfirmDelete(note.id); }}
                    className="flex items-center justify-center w-6 h-6 rounded-md transition-all duration-100"
                    style={{ color: tokens.text.quaternary }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = tokens.danger.text; e.currentTarget.style.background = tokens.danger.bg; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = tokens.text.quaternary; e.currentTarget.style.background = 'transparent'; }}
                    title="Supprimer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
                <span style={{ color: tokens.text.quaternary }}>
                  {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </span>
              </div>
            </div>

            {isOpen && note.content && (
              <div
                className="px-4 pb-3 text-xs leading-relaxed font-mono whitespace-pre-wrap"
                style={{
                  color: tokens.modal.fieldValue,
                  borderTop: `1px solid ${tokens.surface.borderLight}`,
                  paddingTop: '12px',
                }}
              >
                {note.content}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
