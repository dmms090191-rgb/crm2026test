import { useState, useEffect, useCallback, useRef } from 'react';
import { Brain, ChevronDown, Save, Loader2, Building2, AlertCircle } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { fetchBrain, upsertBrain, fetchCompanies } from './brainApi';
import { defaultBrain } from './brainTypes';
import type { AiCompanyBrain } from './brainTypes';
import BrainIdentitySection from './BrainIdentitySection';
import BrainServicesSection from './BrainServicesSection';
import BrainScheduleSection from './BrainScheduleSection';
import BrainRulesSection from './BrainRulesSection';
import BrainFaqSection from './BrainFaqSection';
import BrainToneToolsSection from './BrainToneToolsSection';
import BrainTestSection from './BrainTestSection';

interface Company {
  id: string;
  name: string;
}

export default function SACerveauIA() {
  const t = useThemeTokens();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [brain, setBrain] = useState<AiCompanyBrain | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const dirty = useRef(false);

  useEffect(() => {
    fetchCompanies().then(list => {
      setCompanies(list);
      if (list.length > 0) setSelectedCompanyId(list[0].id);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!selectedCompanyId) return;
    setLoading(true);
    dirty.current = false;
    fetchBrain(selectedCompanyId).then(data => {
      if (data) {
        setBrain(data);
      } else {
        const d = defaultBrain(selectedCompanyId);
        setBrain({ ...d, id: '', created_at: '', updated_at: '' } as AiCompanyBrain);
      }
      setLoading(false);
    });
  }, [selectedCompanyId]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setPickerOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleChange = useCallback((fields: Partial<AiCompanyBrain>) => {
    setBrain(prev => prev ? { ...prev, ...fields } : prev);
    dirty.current = true;
    setSaved(false);
  }, []);

  async function handleSave() {
    if (!brain || !selectedCompanyId || saving) return;
    setSaving(true);
    const { id: _id, created_at: _ca, updated_at: _ua, ...fields } = brain;
    const result = await upsertBrain(selectedCompanyId, fields);
    if (result) setBrain(result);
    dirty.current = false;
    setSaved(true);
    setSaving(false);
    setTimeout(() => setSaved(false), 2000);
  }

  const selectedName = companies.find(c => c.id === selectedCompanyId)?.name || '';

  if (loading && companies.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: t.accent.border, borderTopColor: t.accent.text }} />
      </div>
    );
  }

  const noCompanies = !loading && companies.length === 0;
  const noSelection = !loading && companies.length > 0 && !selectedCompanyId;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', boxShadow: '0 0 20px rgba(245,158,11,0.3)' }}>
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold" style={{ color: t.text.primary }}>Cerveau IA</h1>
            <p className="text-[10px]" style={{ color: t.text.tertiary }}>Configurez l'assistant intelligent de chaque entreprise</p>
          </div>
        </div>

        {companies.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="relative" ref={pickerRef}>
              <button
                onClick={() => setPickerOpen(v => !v)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
                style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.text.primary }}
              >
                {selectedName || 'Selectionnez...'}
                <ChevronDown className="w-3 h-3" style={{ color: t.text.tertiary }} />
              </button>
              {pickerOpen && (
                <div className="absolute right-0 top-full mt-1 w-56 rounded-xl overflow-hidden z-50" style={{ background: t.dropdown.bg, border: `1px solid ${t.dropdown.border}`, boxShadow: t.dropdown.shadow }}>
                  {companies.map(c => (
                    <button
                      key={c.id}
                      onClick={() => { setSelectedCompanyId(c.id); setPickerOpen(false); }}
                      className="w-full px-3 py-2 text-left text-xs transition-colors"
                      style={{ color: c.id === selectedCompanyId ? t.accent.text : t.dropdown.itemText, background: c.id === selectedCompanyId ? t.accent.bg : 'transparent' }}
                      onMouseEnter={e => { if (c.id !== selectedCompanyId) e.currentTarget.style.background = t.dropdown.itemBgHover; }}
                      onMouseLeave={e => { if (c.id !== selectedCompanyId) e.currentTarget.style.background = 'transparent'; }}
                    >
                      {c.name || c.id}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={handleSave}
              disabled={saving || !dirty.current}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all hover:scale-105 disabled:opacity-40"
              style={{ background: saved ? t.success.bg : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', border: saved ? `1px solid ${t.success.border}` : 'none', color: saved ? t.success.text : '#fff' }}
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {saved ? 'Enregistre' : 'Enregistrer'}
            </button>
          </div>
        )}
      </div>

      {noCompanies ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}` }}>
            <AlertCircle className="w-7 h-7" style={{ color: t.text.tertiary }} />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold" style={{ color: t.text.primary }}>Aucune societe trouvee</p>
            <p className="text-xs mt-1" style={{ color: t.text.tertiary }}>Creez d'abord une societe dans l'onglet Admins pour configurer son cerveau IA.</p>
          </div>
        </div>
      ) : noSelection ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}` }}>
            <Building2 className="w-7 h-7" style={{ color: t.text.tertiary }} />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold" style={{ color: t.text.primary }}>Selectionnez une societe</p>
            <p className="text-xs mt-1" style={{ color: t.text.tertiary }}>Choisissez une societe dans le menu ci-dessus pour configurer son cerveau IA.</p>
          </div>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: t.accent.border, borderTopColor: t.accent.text }} />
        </div>
      ) : brain ? (
        <div className="space-y-4">
          <BrainIdentitySection brain={brain} onChange={handleChange} tokens={t} />
          <BrainServicesSection brain={brain} onChange={handleChange} tokens={t} />
          <BrainScheduleSection brain={brain} onChange={handleChange} tokens={t} />
          <BrainRulesSection brain={brain} onChange={handleChange} tokens={t} />
          <BrainFaqSection brain={brain} onChange={handleChange} tokens={t} />
          <BrainToneToolsSection brain={brain} onChange={handleChange} tokens={t} />
          <BrainTestSection companyId={selectedCompanyId} tokens={t} />
        </div>
      ) : null}
    </div>
  );
}
