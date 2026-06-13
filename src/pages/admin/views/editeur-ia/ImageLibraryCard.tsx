import { useState } from 'react';
import { Pencil, Download, Trash2, Check, X, Layers } from 'lucide-react';
import type { AiGeneratedImage } from './editeurIaTypes';

interface Props {
  image: AiGeneratedImage;
  isActive: boolean;
  onSelect: () => void;
  onRename: (name: string) => void;
  onDownload: () => void;
  onDelete: () => void;
  onUseAsZone4: () => void;
}

export default function ImageLibraryCard({
  image, isActive, onSelect, onRename, onDownload, onDelete, onUseAsZone4,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(image.name);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const timeAgo = formatTimeAgo(image.created_at);

  const handleRename = () => {
    if (editName.trim() && editName !== image.name) {
      onRename(editName.trim());
    }
    setEditing(false);
  };

  return (
    <div
      onClick={onSelect}
      className={`group relative rounded-xl overflow-hidden cursor-pointer transition-all duration-200 border ${
        isActive
          ? 'border-cyan-500/40 bg-cyan-500/[0.06] shadow-[0_0_12px_rgba(6,182,212,0.1)]'
          : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.1]'
      }`}
    >
      <div className="flex gap-3 p-2.5">
        <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-black/30">
          <img src={image.generated_image_url} alt={image.name} className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 min-w-0 py-0.5">
          {editing ? (
            <div className="flex items-center gap-1">
              <input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setEditing(false); }}
                onClick={e => e.stopPropagation()}
                className="flex-1 bg-white/[0.06] border border-white/[0.1] rounded px-1.5 py-0.5 text-[11px] text-white/80 outline-none focus:border-cyan-500/30"
                autoFocus
              />
              <button onClick={(e) => { e.stopPropagation(); handleRename(); }} className="p-0.5 text-emerald-400/60 hover:text-emerald-400">
                <Check className="w-3 h-3" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); setEditing(false); }} className="p-0.5 text-white/30 hover:text-white/60">
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <p className="text-[11px] font-semibold text-white/70 truncate">{image.name}</p>
          )}
          <p className="text-[9px] text-white/30 mt-0.5">
            {image.width} x {image.height} px
          </p>
          <p className="text-[9px] text-white/20 mt-0.5">{timeAgo}</p>
        </div>

        <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); setEditing(true); setEditName(image.name); }}
            className="p-1.5 rounded-md hover:bg-white/[0.06] text-white/30 hover:text-white/60 transition-colors"
            title="Renommer"
          >
            <Pencil className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDownload(); }}
            className="p-1.5 rounded-md hover:bg-white/[0.06] text-white/30 hover:text-white/60 transition-colors"
            title="Telecharger"
          >
            <Download className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onUseAsZone4(); }}
            className="p-1.5 rounded-md hover:bg-cyan-500/10 text-white/30 hover:text-cyan-400/70 transition-colors"
            title="Utiliser comme fond Zone 4"
          >
            <Layers className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }}
            className="p-1.5 rounded-md hover:bg-red-500/10 text-white/30 hover:text-red-400/70 transition-colors"
            title="Supprimer"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {confirmDelete && (
        <div
          className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2 z-10 rounded-xl"
          onClick={e => e.stopPropagation()}
        >
          <p className="text-[10px] text-white/60 font-medium">Supprimer cette image ?</p>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmDelete(false)}
              className="px-3 py-1 rounded-lg text-[10px] font-semibold text-white/50 bg-white/[0.06] border border-white/[0.08] hover:bg-white/[0.1]"
            >
              Annuler
            </button>
            <button
              onClick={() => { setConfirmDelete(false); onDelete(); }}
              className="px-3 py-1 rounded-lg text-[10px] font-semibold text-red-300 bg-red-500/15 border border-red-500/20 hover:bg-red-500/25"
            >
              Supprimer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "A l'instant";
  if (min < 60) return `Il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Il y a ${h} h`;
  const d = Math.floor(h / 24);
  return `Il y a ${d} j`;
}
