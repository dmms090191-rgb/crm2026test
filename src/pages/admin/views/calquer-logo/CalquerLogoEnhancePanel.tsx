import { useState } from 'react';
import { Sparkles, Eraser, Focus, Loader2, CheckCircle2 } from 'lucide-react';

interface Props {
  hasContent: boolean;
  onSmooth: () => Promise<void>;
  onDespeckle: () => Promise<void>;
  onSharpen: () => Promise<void>;
}

const ACTIONS = [
  { id: 'smooth', label: 'Lisser les traits', desc: 'Adoucit les contours et reduit les pixels en escalier sur les bords.', icon: Sparkles },
  { id: 'despeckle', label: 'Nettoyer les imperfections', desc: 'Supprime les petits points isoles, pixels parasites et bavures.', icon: Eraser },
  { id: 'sharpen', label: 'Renforcer la nettete', desc: 'Rend les lignes plus nettes et le logo plus professionnel.', icon: Focus },
] as const;

type ActionId = typeof ACTIONS[number]['id'];

export default function CalquerLogoEnhancePanel({ hasContent, onSmooth, onDespeckle, onSharpen }: Props) {
  const [running, setRunning] = useState<ActionId | null>(null);
  const [done, setDone] = useState<ActionId | null>(null);

  const handlers: Record<ActionId, () => Promise<void>> = { smooth: onSmooth, despeckle: onDespeckle, sharpen: onSharpen };

  const handleClick = async (id: ActionId) => {
    if (running) return;
    setRunning(id); setDone(null);
    try { await handlers[id](); setDone(id); setTimeout(() => setDone(null), 2500); } catch { /* */ }
    setRunning(null);
  };

  return (
    <div className="w-64 flex-shrink-0 flex flex-col gap-4 p-4 overflow-y-auto border-r"
      style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(15,23,42,0.6)' }}>

      <div className="space-y-2.5">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider"
          style={{ color: 'rgba(148,163,184,0.6)' }}>
          Amelioration
        </h3>

        {!hasContent ? (
          <div className="px-3 py-4 rounded-lg text-center"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <Sparkles className="w-5 h-5 mx-auto mb-2" style={{ color: 'rgba(148,163,184,0.3)' }} />
            <p className="text-xs" style={{ color: 'rgba(148,163,184,0.5)' }}>
              Nettoyez d'abord votre logo (Nettoyage rapide ou IA) pour pouvoir l'ameliorer.
            </p>
          </div>
        ) : (
          <>
            <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(148,163,184,0.6)' }}>
              Ameliorez la qualite visuelle du logo. Chaque action s'applique en direct.
            </p>

            <div className="space-y-2">
              {ACTIONS.map(({ id, label, desc, icon: Icon }) => {
                const isRunning = running === id;
                const isDone = done === id;
                return (
                  <button key={id} onClick={() => handleClick(id)} disabled={!!running}
                    className="w-full flex items-start gap-3 px-3 py-3 rounded-lg text-left transition-all duration-200 hover:enabled:scale-[1.01] disabled:opacity-60"
                    style={{
                      background: isDone ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${isDone ? 'rgba(34,197,94,0.25)' : 'rgba(255,255,255,0.08)'}`,
                    }}>
                    <div className="flex-shrink-0 mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: isDone ? 'rgba(34,197,94,0.15)' : 'rgba(59,130,246,0.12)' }}>
                      {isRunning ? <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#60a5fa' }} />
                        : isDone ? <CheckCircle2 className="w-4 h-4" style={{ color: '#4ade80' }} />
                        : <Icon className="w-4 h-4" style={{ color: '#60a5fa' }} />}
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-semibold block" style={{ color: isDone ? '#4ade80' : 'rgba(226,232,240,0.85)' }}>
                        {isRunning ? 'En cours...' : isDone ? 'Applique' : label}
                      </span>
                      <span className="text-[10px] leading-snug block mt-0.5" style={{ color: 'rgba(148,163,184,0.5)' }}>
                        {desc}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      <div className="mt-auto pt-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <p className="text-[10px] leading-relaxed" style={{ color: 'rgba(148,163,184,0.5)' }}>
          Les ameliorations s'appliquent au logo transforme sans modifier l'arriere-plan ni la couleur.
        </p>
      </div>
    </div>
  );
}
