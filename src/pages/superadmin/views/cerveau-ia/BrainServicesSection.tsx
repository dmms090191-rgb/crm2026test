import { Briefcase, Plus, Trash2 } from 'lucide-react';
import type { AiCompanyBrain, BrainService } from './brainTypes';

interface Props {
  brain: AiCompanyBrain;
  onChange: (fields: Partial<AiCompanyBrain>) => void;
  tokens: ReturnType<typeof import('../../../../hooks/useThemeTokens').useThemeTokens>;
  embedded?: boolean;
}

export default function BrainServicesSection({ brain, onChange, tokens: t, embedded }: Props) {
  const services = brain.services ?? [];

  function updateService(idx: number, field: keyof BrainService, value: string) {
    const next = [...services];
    next[idx] = { ...next[idx], [field]: value };
    onChange({ services: next });
  }

  function addService() {
    onChange({ services: [...services, { name: '', description: '', price: '' }] });
  }

  function removeService(idx: number) {
    onChange({ services: services.filter((_, i) => i !== idx) });
  }

  const content = (
    <>
      <div className="flex items-center justify-end mb-3">
        <button onClick={addService} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105" style={{ background: t.accent.bg, border: `1px solid ${t.accent.border}`, color: t.accent.text }}>
          <Plus className="w-3 h-3" /> Ajouter
        </button>
      </div>
      {services.length === 0 ? (
        <p className="text-xs py-4 text-center" style={{ color: t.input.placeholder }}>Aucun service configure. Ajoutez les services proposes par l'entreprise.</p>
      ) : (
        <div className="space-y-3">
          {services.map((svc, idx) => (
            <div key={idx} className="rounded-xl p-3 space-y-2" style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}` }}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input value={svc.name} onChange={e => updateService(idx, 'name', e.target.value)} placeholder="Nom du service" className="px-2.5 py-1.5 rounded-lg text-xs outline-none" style={{ background: t.input.bg, border: `1px solid ${t.input.border}`, color: t.input.text }} />
                  <input value={svc.description} onChange={e => updateService(idx, 'description', e.target.value)} placeholder="Description courte" className="px-2.5 py-1.5 rounded-lg text-xs outline-none" style={{ background: t.input.bg, border: `1px solid ${t.input.border}`, color: t.input.text }} />
                  <input value={svc.price} onChange={e => updateService(idx, 'price', e.target.value)} placeholder="Prix (ex: 50EUR)" className="px-2.5 py-1.5 rounded-lg text-xs outline-none" style={{ background: t.input.bg, border: `1px solid ${t.input.border}`, color: t.input.text }} />
                </div>
                <button onClick={() => removeService(idx)} className="p-1 rounded-lg transition-colors hover:opacity-70" style={{ color: t.text.tertiary }}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );

  if (embedded) return content;

  return (
    <div className="rounded-2xl p-5" style={{ background: `linear-gradient(135deg, ${t.surface.secondary}, ${t.surface.secondary}80)`, border: `1px solid ${t.surface.border}`, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 1px 2px rgba(0,0,0,0.04)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: t.accent.bg, border: `1px solid ${t.accent.border}` }}>
            <Briefcase className="w-4 h-4" style={{ color: t.accent.text }} />
          </div>
          <h3 className="text-sm font-bold" style={{ color: t.text.primary }}>Services proposes</h3>
        </div>
      </div>
      {content}
    </div>
  );
}
