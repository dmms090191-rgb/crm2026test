import { ChevronDown, ChevronRight, Pencil, Trash2, FolderOpen, Layers } from 'lucide-react';
import type { FinishedTest, FinishedSubcategory, FinishedCategory } from './SATestFinishedModal';
import SATestFinishedSubcategoryBlock from './SATestFinishedSubcategory';

interface Props {
  cat: FinishedCategory;
  subcatCount: number;
  testCount: number;
  isOpen: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddSubcat: () => void;
  subcategories: FinishedSubcategory[];
  tests: FinishedTest[];
  openSubcats: Set<string>;
  onToggleSubcat: (id: string) => void;
  onEditSubcat: (s: FinishedSubcategory) => void;
  onDeleteSubcat: (id: string) => void;
  onAddTest: (subId: string) => void;
  onEditTest: (t: FinishedTest) => void;
  onDeleteTest: (id: string) => void;
}

export default function SATestFinishedCategoryBlock({ cat, subcatCount, testCount, isOpen, onToggle, onEdit, onDelete, onAddSubcat, subcategories, tests, openSubcats, onToggleSubcat, onEditSubcat, onDeleteSubcat, onAddTest, onEditTest, onDeleteTest }: Props) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(51,65,85,0.5)', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
      <div className="flex items-center gap-2.5 px-4 py-3.5 cursor-pointer hover:bg-slate-800/30 transition-colors" onClick={onToggle}>
        <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0" style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)' }}>
          <Layers className="w-3.5 h-3.5 text-emerald-400" />
        </div>
        {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
        <span className="text-sm font-bold text-slate-100 flex-1">{cat.name}</span>
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold mr-1" style={{ background: 'rgba(56,189,248,0.1)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.2)' }}>
          {subcatCount} sous-cat.
        </span>
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.25)' }}>
          {testCount} test{testCount !== 1 ? 's' : ''}
        </span>
        <button onClick={e => { e.stopPropagation(); onEdit(); }} className="p-1.5 rounded-md hover:bg-slate-700/50 transition-colors ml-1" title="Modifier la categorie">
          <Pencil className="w-3 h-3 text-slate-500" />
        </button>
        <button onClick={e => { e.stopPropagation(); onDelete(); }} className="p-1.5 rounded-md hover:bg-red-500/10 transition-colors" title="Supprimer la categorie">
          <Trash2 className="w-3 h-3 text-red-400/70" />
        </button>
      </div>

      {isOpen && (
        <div className="px-4 pb-3 pt-1" style={{ borderTop: '1px solid rgba(51,65,85,0.4)' }}>
          <div className="mb-3 mt-2">
            <button
              onClick={onAddSubcat}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all hover:brightness-110"
              style={{ background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.2)', color: '#38bdf8' }}
            >
              <FolderOpen className="w-3 h-3" />
              Ajouter une sous-categorie
            </button>
          </div>

          {subcategories.length === 0 ? (
            <p className="text-[11px] text-slate-600 italic pl-2">Aucune sous-categorie.</p>
          ) : (
            <div className="space-y-2">
              {subcategories.map(sub => (
                <SATestFinishedSubcategoryBlock
                  key={sub.id}
                  sub={sub}
                  tests={tests.filter(t => t.subcategoryId === sub.id).sort((a, b) => a.order - b.order)}
                  isOpen={openSubcats.has(sub.id)}
                  onToggle={() => onToggleSubcat(sub.id)}
                  onEdit={() => onEditSubcat(sub)}
                  onDelete={() => onDeleteSubcat(sub.id)}
                  onAddTest={() => onAddTest(sub.id)}
                  onEditTest={onEditTest}
                  onDeleteTest={onDeleteTest}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
