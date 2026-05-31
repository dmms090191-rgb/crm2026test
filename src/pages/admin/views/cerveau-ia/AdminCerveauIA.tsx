import { useState, useEffect, useCallback } from 'react';
import { Brain, Save, Loader2, Shield, CheckCircle2, XCircle } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { useCompanyId } from '../../../../hooks/useCompanyId';
import { fetchBrain, upsertBrain } from '../../../../lib/brainApi';
import { defaultBrain } from '../../../../lib/brainTypes';
import type { AiCompanyBrain, DaySchedule } from '../../../../lib/brainTypes';
import { supabase } from '../../../../lib/supabase';
import BrainScoreBar from '../../../superadmin/views/cerveau-ia/BrainScoreBar';
import AdminCerveauCards from './AdminCerveauCards';

type SaveStatus = 'idle' | 'saving' | 'success' | 'error';

export default function AdminCerveauIA() {
  const t = useThemeTokens();
  const companyId = useCompanyId();
  const [brain, setBrain] = useState<AiCompanyBrain | null>(null);
  const [loading, setLoading] = useState(true);
  const [companyName, setCompanyName] = useState('');
  const [dirty, setDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    if (!companyId) return;
    setLoading(true);
    setDirty(false);
    setSaveStatus('idle');
    setSaveError('');
    Promise.all([
      fetchBrain(companyId),
      supabase.from('companies').select('name').eq('id', companyId).maybeSingle(),
    ]).then(([brainData, companyData]) => {
      setBrain(brainData ?? { ...defaultBrain(companyId), id: '', created_at: '', updated_at: '' } as AiCompanyBrain);
      setCompanyName(companyData.data?.name ?? '');
      setLoading(false);
    });
  }, [companyId]);

  const handleChange = useCallback((fields: Partial<AiCompanyBrain>) => {
    setBrain(prev => prev ? { ...prev, ...fields } : prev);
    setDirty(true);
    setSaveStatus('idle');
    setSaveError('');
  }, []);

  async function handleSave() {
    if (!brain || !companyId || saveStatus === 'saving') return;
    setSaveStatus('saving');
    setSaveError('');
    try {
      const { id: _id, created_at: _ca, updated_at: _ua, ...fields } = brain;
      const { data: result, error } = await upsertBrain(companyId, fields, 'company');
      if (error || !result) {
        setSaveStatus('error');
        setSaveError(error ?? 'Erreur inconnue');
        return;
      }
      setBrain(result);
      setDirty(false);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus(s => s === 'success' ? 'idle' : s), 3000);
    } catch (err) {
      setSaveStatus('error');
      setSaveError(String(err));
    }
  }

  const isSaving = saveStatus === 'saving';
  const accent = '#0ea5e9';

  const scoreSections = brain ? [
    { label: 'Identite', filled: !!(brain.company_name || brain.business_context_text?.trim()) },
    { label: 'Coordonnees', filled: !!(brain.phone || brain.email) },
    { label: 'Horaires', filled: !!(brain.opening_hours && typeof brain.opening_hours === 'object' && Object.values(brain.opening_hours).some((d: DaySchedule) => d && !d.closed)) },
    { label: 'Services', filled: (brain.services?.length ?? 0) > 0 },
    { label: 'FAQ', filled: (brain.faq?.length ?? 0) > 0 },
    { label: 'RDV', filled: !!(brain.appointment_rules?.duration_minutes) },
    { label: 'Ton IA', filled: !!brain.tone },
  ] : [];

  if (!companyId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm" style={{ color: t.text.tertiary }}>Aucune societe associee a ce compte.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: t.accent.border, borderTopColor: t.accent.text }} />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)', boxShadow: '0 0 20px rgba(14,165,233,0.3)' }}>
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold" style={{ color: t.text.primary }}>Cerveau IA AD</h1>
            <p className="text-[10px]" style={{ color: t.text.tertiary }}>Configurez ce que l'IA doit savoir pour repondre a vos clients.</p>
          </div>
        </div>
        <button onClick={handleSave} disabled={isSaving || !dirty} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all hover:scale-105 disabled:opacity-40" style={{ background: saveStatus === 'success' ? t.success.bg : 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)', border: saveStatus === 'success' ? `1px solid ${t.success.border}` : 'none', color: saveStatus === 'success' ? t.success.text : '#fff' }}>
          {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saveStatus === 'success' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
          {saveStatus === 'success' ? 'Enregistre' : 'Enregistrer'}
        </button>
      </div>

      {saveStatus === 'success' && (
        <div className="rounded-xl px-4 py-3 flex items-center gap-2" style={{ background: t.success.bg, border: `1px solid ${t.success.border}` }}>
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: t.success.text }} />
          <p className="text-xs font-semibold" style={{ color: t.success.text }}>Cerveau IA enregistre avec succes.</p>
        </div>
      )}
      {saveStatus === 'error' && (
        <div className="rounded-xl px-4 py-3 flex items-center gap-2" style={{ background: t.danger.bg, border: `1px solid ${t.danger.border}` }}>
          <XCircle className="w-4 h-4 flex-shrink-0" style={{ color: t.danger.text }} />
          <p className="text-xs font-semibold" style={{ color: t.danger.text }}>Erreur : {saveError || 'Echec de la sauvegarde.'}</p>
        </div>
      )}

      {/* Company badge */}
      <div className="rounded-xl px-4 py-3 flex items-start gap-3" style={{ background: 'rgba(14,165,233,0.06)', border: '1px solid rgba(14,165,233,0.15)' }}>
        <Shield className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: accent }} />
        <div>
          <p className="text-xs font-semibold" style={{ color: accent }}>Cerveau IA de : {companyName || 'Votre societe'}</p>
          <p className="text-[10px] mt-0.5" style={{ color: t.text.tertiary }}>Ces informations sont utilisees pour repondre aux clients de cette societe uniquement.</p>
        </div>
      </div>

      {brain && (
        <div className="space-y-4">
          <BrainScoreBar sections={scoreSections} tokens={t} accentColor={accent} />
          <AdminCerveauCards brain={brain} onChange={handleChange} onSave={handleSave} saving={isSaving} tokens={t} companyId={companyId} />
        </div>
      )}
    </div>
  );
}
