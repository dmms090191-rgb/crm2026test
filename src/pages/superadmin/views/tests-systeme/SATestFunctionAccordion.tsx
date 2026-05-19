import { ChevronDown, ChevronRight, Pencil, Trash2, ArrowUp, ArrowDown, MoveRight, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import type { TestFunction, TestFunctionCategory } from './SATestFunctionModal';

interface Props {
  cat: TestFunctionCategory;
  catItems: TestFunction[];
  isOpen: boolean;
  expandedIds: Set<string>;
  isDeletable: boolean;
  onToggle: () => void;
  onToggleExpand: (id: string) => void;
  onEdit: () => void;
  onDelete: () => void;
  onEditItem: (item: TestFunction) => void;
  onDeleteItem: (id: string) => void;
  onMoveItem: (item: TestFunction) => void;
  onReorder: (id: string, dir: 'up' | 'down') => void;
}

export default function SATestFunctionAccordion({ cat, catItems, isOpen, expandedIds, isDeletable, onToggle, onToggleExpand, onEdit, onDelete, onEditItem, onDeleteItem, onMoveItem, onReorder }: Props) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyName = (item: TestFunction) => {
    navigator.clipboard.writeText(item.name).then(() => {
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 1500);
    });
  };

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(51,65,85,0.5)' }}>
      <div className="flex items-center gap-2 px-4 py-3 hover:bg-slate-800/30 transition-colors">
        <button onClick={onToggle} className="flex items-center gap-2 flex-1 text-left">
          {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
          <span className="text-xs font-semibold text-slate-200 flex-1">{cat.name}</span>
        </button>
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)' }}>
          {catItems.length}
        </span>
        {isDeletable && (
          <>
            <button onClick={onEdit} className="p-1 rounded-md hover:bg-slate-700/50 transition-colors" title="Modifier la categorie">
              <Pencil className="w-3 h-3 text-slate-500" />
            </button>
            <button onClick={onDelete} className="p-1 rounded-md hover:bg-red-500/10 transition-colors" title="Supprimer la categorie">
              <Trash2 className="w-3 h-3 text-red-400/70" />
            </button>
          </>
        )}
      </div>

      {isOpen && catItems.length > 0 && (
        <div style={{ borderTop: '1px solid rgba(51,65,85,0.4)' }}>
          {catItems.map((item, idx) => {
            const isExpanded = expandedIds.has(item.id);
            return (
              <div key={item.id} style={{ borderTop: idx > 0 ? '1px solid rgba(51,65,85,0.3)' : undefined }}>
                <div className="flex items-center gap-3 px-4 py-2.5 pl-9">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-amber-400 font-mono">{item.name}</p>
                      <button
                        onClick={() => copyName(item)}
                        className="p-1 rounded hover:bg-slate-700/50 transition-colors group"
                        title="Copier le nom"
                      >
                        {copiedId === item.id
                          ? <Check className="w-3 h-3 text-green-400" />
                          : <Copy className="w-3 h-3 text-slate-500 group-hover:text-slate-300" />
                        }
                      </button>
                      {copiedId === item.id && (
                        <span className="text-[10px] text-green-400 font-medium">Copie</span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">{item.description}</p>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button onClick={() => onReorder(item.id, 'up')} disabled={idx === 0} className="p-1 rounded-md hover:bg-slate-700/50 transition-colors disabled:opacity-20 disabled:cursor-not-allowed" title="Monter">
                      <ArrowUp className="w-3 h-3 text-slate-400" />
                    </button>
                    <button onClick={() => onReorder(item.id, 'down')} disabled={idx === catItems.length - 1} className="p-1 rounded-md hover:bg-slate-700/50 transition-colors disabled:opacity-20 disabled:cursor-not-allowed" title="Descendre">
                      <ArrowDown className="w-3 h-3 text-slate-400" />
                    </button>
                    <button onClick={() => onMoveItem(item)} className="p-1.5 rounded-md hover:bg-slate-700/50 transition-colors" title="Deplacer vers une autre categorie">
                      <MoveRight className="w-3.5 h-3.5 text-sky-400" />
                    </button>
                    <button onClick={() => onToggleExpand(item.id)} className="p-1.5 rounded-md hover:bg-slate-700/50 transition-colors" title="Voir les composants">
                      {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-emerald-400" /> : <ChevronRight className="w-3.5 h-3.5 text-emerald-400" />}
                    </button>
                    <button onClick={() => onEditItem(item)} className="p-1.5 rounded-md hover:bg-slate-700/50 transition-colors" title="Modifier">
                      <Pencil className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                    <button onClick={() => onDeleteItem(item.id)} className="p-1.5 rounded-md hover:bg-red-500/10 transition-colors" title="Supprimer">
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  </div>
                </div>
                {isExpanded && (
                  <div className="mx-9 mb-2.5 px-3 py-2 rounded-lg" style={{ background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(71,85,105,0.3)' }}>
                    {item.components ? (
                      <ul className="space-y-1">
                        {item.components.split('\n').filter(l => l.trim()).map((line, i) => {
                          const cleaned = line.replace(/^\s*\d+[\.\)]\s*/, '');
                          return (
                            <li key={i} className="flex items-baseline gap-2 text-[11px] text-slate-300 leading-relaxed">
                              <span className="text-amber-500/70 font-medium shrink-0">{i + 1}.</span>
                              <span>{cleaned || line.trim()}</span>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="text-[11px] text-slate-500 italic">Aucun composant detaille ajoute.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
