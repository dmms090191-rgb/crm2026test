import { useState } from 'react';
import { Home, Building2, Store, TrendingDown, Sun, Thermometer, Layers, ArrowRight, Sparkles } from 'lucide-react';

const HOUSING = [
  { id: 'maison', icon: <Home className="w-5 h-5" />, label: 'Maison' },
  { id: 'appartement', icon: <Building2 className="w-5 h-5" />, label: 'Appartement' },
  { id: 'professionnel', icon: <Store className="w-5 h-5" />, label: 'Local pro' },
];

const GOALS = [
  { id: 'facture', icon: <TrendingDown className="w-4.5 h-4.5" />, label: 'Reduire facture' },
  { id: 'produire', icon: <Sun className="w-4.5 h-4.5" />, label: 'Produire energie' },
  { id: 'confort', icon: <Thermometer className="w-4.5 h-4.5" />, label: 'Ameliorer confort' },
];

const PROJECTS = [
  { id: 'solaire', label: 'Solaire' },
  { id: 'isolation', label: 'Isolation' },
  { id: 'audit', label: 'Audit' },
  { id: 'complet', label: 'Solution complete' },
];

interface Props {
  onRegister: () => void;
}

export default function RenewableSimulator({ onRegister }: Props) {
  const [housing, setHousing] = useState<string | null>(null);
  const [goal, setGoal] = useState<string | null>(null);
  const [project, setProject] = useState<string | null>(null);

  const hasSelection = housing || goal || project;
  const isComplete = housing && goal && project;

  return (
    <section id="simulator" className="relative py-20 sm:py-28">
      <div className="absolute inset-0">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(circle, #06b6d4, transparent 70%)' }} />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] rounded-full opacity-[0.03]"
          style={{ background: 'radial-gradient(circle, #10b981, transparent 70%)' }} />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 sm:mb-16">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold mb-4"
            style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)', color: '#22d3ee' }}>
            <Sparkles className="w-3 h-3" />
            Simulateur
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white mb-3">
            Estimez votre projet
          </h2>
          <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto">
            Decrivez votre situation en quelques clics pour recevoir une premiere estimation personnalisee.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8">
          {/* Selection panel */}
          <div className="lg:col-span-3 space-y-6">
            {/* Housing type */}
            <SimSection title="Type de logement">
              <div className="grid grid-cols-3 gap-3">
                {HOUSING.map(h => (
                  <SelectCard key={h.id} active={housing === h.id} onClick={() => setHousing(h.id)}
                    icon={h.icon} label={h.label} />
                ))}
              </div>
            </SimSection>

            {/* Goal */}
            <SimSection title="Votre objectif">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {GOALS.map(g => (
                  <SelectCard key={g.id} active={goal === g.id} onClick={() => setGoal(g.id)}
                    icon={g.icon} label={g.label} />
                ))}
              </div>
            </SimSection>

            {/* Project type */}
            <SimSection title="Type de projet">
              <div className="flex flex-wrap gap-2">
                {PROJECTS.map(p => (
                  <button key={p.id} onClick={() => setProject(p.id)}
                    className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200"
                    style={{
                      background: project === p.id ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${project === p.id ? 'rgba(16,185,129,0.35)' : 'rgba(255,255,255,0.06)'}`,
                      color: project === p.id ? '#34d399' : 'rgba(255,255,255,0.5)',
                      boxShadow: project === p.id ? '0 0 20px rgba(16,185,129,0.08)' : 'none',
                    }}>
                    {p.label}
                  </button>
                ))}
              </div>
            </SimSection>
          </div>

          {/* Result panel */}
          <div className="lg:col-span-2">
            <div className="sticky top-4 rounded-2xl p-6 transition-all duration-500"
              style={{
                background: hasSelection ? 'rgba(16,185,129,0.04)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${hasSelection ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.06)'}`,
                boxShadow: hasSelection ? '0 8px 40px rgba(16,185,129,0.08)' : '0 4px 24px rgba(0,0,0,0.15)',
              }}>
              <div className="flex items-center gap-2 mb-5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                </div>
                <span className="text-sm font-bold text-white">Votre estimation</span>
              </div>

              {!hasSelection ? (
                <div className="text-center py-6">
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Selectionnez vos options a gauche pour afficher une estimation de votre projet.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {housing && (
                    <ResultLine label="Logement" value={HOUSING.find(h => h.id === housing)?.label ?? ''} />
                  )}
                  {goal && (
                    <ResultLine label="Objectif" value={GOALS.find(g => g.id === goal)?.label ?? ''} />
                  )}
                  {project && (
                    <ResultLine label="Projet" value={PROJECTS.find(p => p.id === project)?.label ?? ''} />
                  )}

                  <div className="pt-3 mt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    {isComplete ? (
                      <>
                        <p className="text-xs text-slate-400 leading-relaxed mb-4">
                          Votre projet semble adapte a une etude personnalisee. Un conseiller peut analyser votre logement et vous proposer une solution claire.
                        </p>
                        <button onClick={onRegister}
                          className="group w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs font-bold text-white transition-all hover:scale-[1.02]"
                          style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 4px 20px rgba(16,185,129,0.25)' }}>
                          Recevoir une estimation
                          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </button>
                      </>
                    ) : (
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Completez toutes les options pour obtenir votre estimation.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SimSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs sm:text-sm font-bold text-white/80 mb-3">{title}</h3>
      {children}
    </div>
  );
}

function SelectCard({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick}
      className="flex flex-col items-center gap-2 p-4 rounded-xl transition-all duration-200 hover:scale-[1.03]"
      style={{
        background: active ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.02)',
        border: `1px solid ${active ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.06)'}`,
        color: active ? '#34d399' : 'rgba(255,255,255,0.5)',
        boxShadow: active ? '0 0 24px rgba(16,185,129,0.08)' : 'none',
      }}>
      {icon}
      <span className="text-[11px] sm:text-xs font-semibold">{label}</span>
    </button>
  );
}

function ResultLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
      <span className="text-xs font-semibold text-emerald-400">{value}</span>
    </div>
  );
}
