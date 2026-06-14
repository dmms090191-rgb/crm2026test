import { useState } from 'react';
import { X, FolderOpen, Trash2, Pencil, Check, Loader2, Clock } from 'lucide-react';
import type { SavedSession } from './calquer-logo-save-types';

interface Props {
  open: boolean;
  onClose: () => void;
  sessions: SavedSession[];
  loading: boolean;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
}

export default function CalquerLogoLoadModal({ open, onClose, sessions, loading, onOpen, onDelete, onRename }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);

  if (!open) return null;

  const startRename = (s: SavedSession) => { setEditingId(s.id); setEditTitle(s.title); };
  const commitRename = () => {
    if (editingId && editTitle.trim()) onRename(editingId, editTitle.trim());
    setEditingId(null);
  };
  const handleOpen = async (id: string) => {
    setOpeningId(id);
    try { await onOpen(id); onClose(); }
    catch { /* */ }
    setOpeningId(null);
  };
  const handleDelete = (id: string) => { onDelete(id); setConfirmDeleteId(null); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-lg rounded-xl p-5 space-y-4 max-h-[80vh] flex flex-col"
        style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 16px 48px rgba(0,0,0,0.4)' }}>

        <div className="flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg" style={{ background: 'rgba(59,130,246,0.15)' }}>
              <FolderOpen className="w-4 h-4" style={{ color: '#60a5fa' }} />
            </div>
            <h2 className="text-sm font-bold" style={{ color: 'rgba(226,232,240,0.95)' }}>
              Charger une sauvegarde
            </h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-white/5 transition-colors">
            <X className="w-4 h-4" style={{ color: 'rgba(148,163,184,0.6)' }} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'rgba(148,163,184,0.5)' }} />
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <FolderOpen className="w-8 h-8 mx-auto" style={{ color: 'rgba(148,163,184,0.2)' }} />
            <p className="text-xs" style={{ color: 'rgba(148,163,184,0.4)' }}>Aucune sauvegarde</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0 pr-1">
            {sessions.map(s => (
              <SaveRow key={s.id} session={s}
                isEditing={editingId === s.id} editTitle={editTitle}
                onEditTitleChange={setEditTitle} onStartRename={() => startRename(s)}
                onCommitRename={commitRename} onCancelEdit={() => setEditingId(null)}
                isConfirmingDelete={confirmDeleteId === s.id}
                onRequestDelete={() => setConfirmDeleteId(s.id)}
                onConfirmDelete={() => handleDelete(s.id)}
                onCancelDelete={() => setConfirmDeleteId(null)}
                onOpen={() => handleOpen(s.id)} opening={openingId === s.id} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SaveRow({ session, isEditing, editTitle, onEditTitleChange, onStartRename, onCommitRename, onCancelEdit,
  isConfirmingDelete, onRequestDelete, onConfirmDelete, onCancelDelete, onOpen, opening,
}: {
  session: SavedSession; isEditing: boolean; editTitle: string;
  onEditTitleChange: (v: string) => void; onStartRename: () => void;
  onCommitRename: () => void; onCancelEdit: () => void;
  isConfirmingDelete: boolean; onRequestDelete: () => void;
  onConfirmDelete: () => void; onCancelDelete: () => void;
  onOpen: () => void; opening: boolean;
}) {
  return (
    <div className="rounded-lg transition-all duration-150"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center gap-3 px-3 py-2.5">
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="flex items-center gap-1.5">
              <input value={editTitle} onChange={e => onEditTitleChange(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') onCommitRename(); if (e.key === 'Escape') onCancelEdit(); }}
                onBlur={onCommitRename} autoFocus
                className="flex-1 min-w-0 text-xs bg-transparent border-b outline-none px-0.5 py-0.5"
                style={{ borderColor: 'rgba(59,130,246,0.4)', color: 'rgba(226,232,240,0.9)' }} />
              <button onClick={onCommitRename} className="p-0.5 rounded hover:bg-white/5">
                <Check className="w-3.5 h-3.5" style={{ color: '#22c55e' }} />
              </button>
            </div>
          ) : (
            <>
              <p className="text-xs font-medium truncate" style={{ color: 'rgba(226,232,240,0.9)' }}>
                {session.title}
              </p>
              <div className="flex items-center gap-1 mt-0.5">
                <Clock className="w-2.5 h-2.5" style={{ color: 'rgba(148,163,184,0.35)' }} />
                <p className="text-[10px]" style={{ color: 'rgba(148,163,184,0.4)' }}>
                  {formatDate(session.updated_at)}
                </p>
              </div>
            </>
          )}
        </div>

        {!isEditing && (
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={onOpen} disabled={opening}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-all duration-200 hover:scale-[1.02] disabled:opacity-60"
              style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa' }}>
              {opening ? <Loader2 className="w-3 h-3 animate-spin" /> : <FolderOpen className="w-3 h-3" />}
              Ouvrir
            </button>
            <button onClick={onStartRename} title="Renommer"
              className="p-1.5 rounded-md hover:bg-white/5 transition-colors">
              <Pencil className="w-3 h-3" style={{ color: 'rgba(148,163,184,0.5)' }} />
            </button>
            <button onClick={onRequestDelete} title="Supprimer"
              className="p-1.5 rounded-md hover:bg-red-500/10 transition-colors">
              <Trash2 className="w-3 h-3" style={{ color: 'rgba(239,68,68,0.5)' }} />
            </button>
          </div>
        )}
      </div>

      {isConfirmingDelete && (
        <div className="flex items-center gap-2 px-3 py-2 mx-2 mb-2 rounded-md"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
          <p className="flex-1 text-[11px]" style={{ color: '#ef4444' }}>Supprimer cette sauvegarde ?</p>
          <button onClick={onConfirmDelete}
            className="px-2.5 py-1 rounded text-[11px] font-semibold transition-colors"
            style={{ background: 'rgba(239,68,68,0.2)', color: '#ef4444' }}>
            Oui
          </button>
          <button onClick={onCancelDelete} className="p-1 rounded hover:bg-white/5">
            <X className="w-3 h-3" style={{ color: 'rgba(148,163,184,0.5)' }} />
          </button>
        </div>
      )}
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
