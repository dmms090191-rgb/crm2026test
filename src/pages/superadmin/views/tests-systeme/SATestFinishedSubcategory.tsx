import { Plus, ChevronDown, ChevronRight, Pencil, Trash2, FolderOpen } from 'lucide-react';
import type { FinishedTest, FinishedSubcategory } from './SATestFinishedModal';
import SATestFinishedItem from './SATestFinishedItem';

interface Props {
  sub: FinishedSubcategory;
  tests: FinishedTest[];
  isOpen: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddTest: () => void;
  onEditTest: (t: FinishedTest) => void;
  onDeleteTest: (id: string) => void;
}

export default function SATestFinishedSubcategoryBlock({ sub, tests, isOpen, onToggle, onEdit, onDelete, onAddTest, onEditTest, onDeleteTest }: Props) {
  return (
    <div className="rounded-lg overflow-hidden ml-3" style={{ background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(51,65,85,0.4)' }}>
      <div className="flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-slate-800/20 transition-colors" onClick={onToggle}>
        <div className="w-5.5 h-5.5 rounded flex items-center justify-center shrink-0" style={{ background: 'rgba(56,189,248,0.1)' }}>
          <FolderOpen className="w-3 h-3 text-sky-400" />
        </div>
        {isOpen ? <ChevronDown className="w-3 h-3 text-slate-500 shrink-0" /> : <ChevronRight className="w-3 h-3 text-slate-500 shrink-0" />}
        <span className="text-xs font-semibold text-sky-300 flex-1">{sub.name}</span>
        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: 'rgba(16,185,129,0.1)', color: '#34d399', border: '1px solid rgba(16,185,129,0.2)' }}>
          {tests.length} test{tests.length !== 1 ? 's' : ''}
        </span>
        <button onClick={e => { e.stopPropagation(); onEdit(); }} className="p-1 rounded-md hover:bg-slate-700/50 transition-colors" title="Modifier">
          <Pencil className="w-3 h-3 text-slate-500" />
        </button>
        <button onClick={e => { e.stopPropagation(); onDelete(); }} className="p-1 rounded-md hover:bg-red-500/10 transition-colors" title="Supprimer">
          <Trash2 className="w-3 h-3 text-red-400/70" />
        </button>
      </div>

      {isOpen && (
        <div className="px-3 pb-3 pt-1" style={{ borderTop: '1px solid rgba(51,65,85,0.3)' }}>
          <div className="mb-2 mt-2 ml-3">
            <button
              onClick={onAddTest}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-semibold text-white transition-all hover:brightness-110"
              style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}
            >
              <Plus className="w-3 h-3" />
              Ajouter un test fini
            </button>
          </div>

          {tests.length > 0 && (
            <div className="space-y-1.5 ml-3">
              {tests.map(t => (
                <SATestFinishedItem key={t.id} test={t} onEdit={() => onEditTest(t)} onDelete={() => onDeleteTest(t.id)} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
