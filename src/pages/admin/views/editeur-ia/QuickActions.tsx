import { Wand2 } from 'lucide-react';
import { QUICK_ACTIONS } from './editeurIaTypes';

interface Props {
  onAction: (prompt: string) => void;
}

export default function QuickActions({ onAction }: Props) {
  return (
    <div className="px-4 pb-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40 mb-2">
        Actions rapides
      </p>
      <div className="grid grid-cols-2 gap-1.5">
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action.label}
            onClick={() => onAction(action.prompt)}
            className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-[11px] font-medium text-white/70 bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] hover:text-white/90 transition-all duration-150 text-left"
          >
            <Wand2 className="w-3 h-3 flex-shrink-0 text-cyan-400/60" />
            <span className="truncate">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
