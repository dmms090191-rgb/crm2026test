import { useState } from 'react';
import { Pencil, Trash2, FileCode2, Copy, ClipboardCheck, Code2, ChevronDown, ChevronRight } from 'lucide-react';
import type { FinishedTest } from './SATestFinishedModal';

interface Props {
  test: FinishedTest;
  onEdit: () => void;
  onDelete: () => void;
}

export default function SATestFinishedItem({ test, onEdit, onDelete }: Props) {
  const commands = (test.commands || '').split('\n').filter(l => l.trim());
  const hasCode = !!(test.test_code || '').trim();
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [codeExpanded, setCodeExpanded] = useState(false);

  const copyOne = (cmd: string, idx: number) => {
    navigator.clipboard.writeText(cmd);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1500);
  };

  const copyAll = () => {
    navigator.clipboard.writeText(commands.join('\n'));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 1500);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(test.test_code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 1500);
  };

  return (
    <div className="rounded-lg p-3 group transition-colors hover:bg-slate-800/30" style={{ background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(51,65,85,0.35)' }}>
      <div className="flex items-start gap-2.5">
        <div className="w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5" style={{ background: 'rgba(16,185,129,0.1)' }}>
          <FileCode2 className="w-3 h-3 text-emerald-400" />
        </div>
        <div className="min-w-0 flex-1">
          {test.filename && (
            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-medium mb-1.5" style={{ background: 'rgba(56,189,248,0.08)', color: '#7dd3fc', border: '1px solid rgba(56,189,248,0.15)' }}>
              {test.filename}
            </span>
          )}
          <p className="text-xs font-bold text-emerald-300 leading-snug">{test.title}</p>
          {test.description && <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{test.description}</p>}

          {commands.length > 0 && (
            <div className="mt-2.5 rounded-lg overflow-hidden" style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(51,65,85,0.4)' }}>
              <div className="flex items-center justify-between px-2.5 py-1.5" style={{ borderBottom: '1px solid rgba(51,65,85,0.3)' }}>
                <span className="text-[10px] font-medium text-slate-500">Commandes ({commands.length})</span>
                <button
                  onClick={copyAll}
                  className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-all"
                  style={{ background: copiedAll ? 'rgba(16,185,129,0.15)' : 'rgba(51,65,85,0.4)', color: copiedAll ? '#34d399' : '#94a3b8' }}
                >
                  {copiedAll ? <ClipboardCheck className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copiedAll ? 'Copie !' : 'Copier tout'}
                </button>
              </div>
              <div className="p-2 space-y-0.5">
                {commands.map((cmd, idx) => (
                  <div key={idx} className="flex items-center gap-2 group/cmd rounded px-2 py-1 hover:bg-slate-800/40 transition-colors">
                    <span className="text-[10px] font-bold text-slate-600 w-4 shrink-0 text-right">{idx + 1}.</span>
                    <code className="text-[11px] text-sky-300 font-mono flex-1 break-all">{cmd}</code>
                    <button
                      onClick={() => copyOne(cmd, idx)}
                      className="p-1 rounded hover:bg-slate-700/50 transition-colors opacity-0 group-hover/cmd:opacity-100 shrink-0"
                      title="Copier cette commande"
                    >
                      {copiedIdx === idx
                        ? <ClipboardCheck className="w-3 h-3 text-emerald-400" />
                        : <Copy className="w-3 h-3 text-slate-500" />
                      }
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {hasCode && (
            <div className="mt-2.5 rounded-lg overflow-hidden" style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(51,65,85,0.4)' }}>
              <div className="flex items-center justify-between px-2.5 py-1.5" style={{ borderBottom: codeExpanded ? '1px solid rgba(51,65,85,0.3)' : 'none' }}>
                <button onClick={() => setCodeExpanded(p => !p)} className="flex items-center gap-1.5 text-[10px] font-medium text-slate-500 hover:text-slate-300 transition-colors">
                  {codeExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  <Code2 className="w-3 h-3" />
                  Code du test
                </button>
                <button
                  onClick={copyCode}
                  className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-all"
                  style={{ background: copiedCode ? 'rgba(16,185,129,0.15)' : 'rgba(51,65,85,0.4)', color: copiedCode ? '#34d399' : '#94a3b8' }}
                >
                  {copiedCode ? <ClipboardCheck className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copiedCode ? 'Copie !' : 'Copier le code'}
                </button>
              </div>
              {codeExpanded && (
                <pre className="p-3 overflow-auto text-[11px] font-mono leading-relaxed text-emerald-200/90" style={{ maxHeight: '400px' }}>
                  <code>{test.test_code}</code>
                </pre>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onEdit} className="p-1.5 rounded-md hover:bg-slate-700/50 transition-colors" title="Modifier">
            <Pencil className="w-3.5 h-3.5 text-slate-400" />
          </button>
          <button onClick={onDelete} className="p-1.5 rounded-md hover:bg-red-500/10 transition-colors" title="Supprimer">
            <Trash2 className="w-3.5 h-3.5 text-red-400" />
          </button>
        </div>
      </div>
    </div>
  );
}
