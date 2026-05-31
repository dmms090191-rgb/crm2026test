import { useState, useEffect, useCallback } from 'react';
import { Brain, Save, Loader2, CheckCircle2, XCircle, Eye, Sparkles } from 'lucide-react';
import { fetchPlatformBrain, upsertBrain } from './brainApi';
import { defaultBrain } from './brainTypes';
import type { AiCompanyBrain, DaySchedule } from './brainTypes';
import { D } from './brainTheme';
import BrainScoreBar from './BrainScoreBar';
import BrainKnowledgePanel from './BrainKnowledgePanel';
import SACerveauCards from './SACerveauCards';
import BrainPreviewModal from './BrainPreviewModal';
import BrainTestChat from './BrainTestChat';

type SaveStatus = 'idle' | 'saving' | 'success' | 'error';

export default function SACerveauIA() {
  const [brain, setBrain] = useState<AiCompanyBrain | null>(null);
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [saveError, setSaveError] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchPlatformBrain().then(data => {
      setBrain(data ?? { ...defaultBrain(null, 'platform'), id: '', created_at: '', updated_at: '' } as AiCompanyBrain);
      setLoading(false);
    });
  }, []);

  const handleChange = useCallback((fields: Partial<AiCompanyBrain>) => {
    setBrain(prev => prev ? { ...prev, ...fields } : prev);
    setDirty(true);
    setSaveStatus('idle');
    setSaveError('');
  }, []);

  const handleSave = useCallback(async () => {
    if (!brain || saveStatus === 'saving') return;
    setSaveStatus('saving');
    setSaveError('');
    try {
      const { id: _id, created_at: _ca, updated_at: _ua, ...fields } = brain;
      const { data: result, error } = await upsertBrain(null, fields, 'platform');
      if (error || !result) { setSaveStatus('error'); setSaveError(error ?? 'Erreur inconnue'); return; }
      setBrain(result);
      setDirty(false);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus(s => s === 'success' ? 'idle' : s), 3000);
    } catch (err) { setSaveStatus('error'); setSaveError(String(err)); }
  }, [brain, saveStatus]);

  const isSaving = saveStatus === 'saving';
  const scoreSections = brain ? [
    { label: 'Presentation', filled: !!(brain.business_context_text?.trim() || brain.company_name) },
    { label: 'Coordonnees', filled: !!(brain.phone || brain.email) },
    { label: 'Horaires', filled: !!(brain.opening_hours && typeof brain.opening_hours === 'object' && Object.values(brain.opening_hours).some((d: DaySchedule) => d && !d.closed)) },
    { label: 'FAQ', filled: (brain.faq?.length ?? 0) > 0 },
    { label: 'Reponses types', filled: (brain.official_responses?.length ?? 0) > 0 },
    { label: 'Regles IA', filled: !!brain.tone },
    { label: 'Interdictions', filled: (brain.forbidden_actions?.length ?? 0) > 0 },
    { label: 'Sensibles', filled: (brain.sensitive_requests?.length ?? 0) > 0 },
    { label: 'Connaissances', filled: (brain.knowledge_sections ?? []).filter(s => s.content.trim().length > 0).length >= 3 },
  ] : [];

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 rounded-full border-[3px] animate-spin" style={{ borderColor: D.pageBorder, borderTopColor: D.accent }} />
    </div>
  );

  return (
    <div className="relative">
      <div className="p-4 md:p-8 lg:p-10 space-y-6 max-w-5xl mx-auto">
        {/* Hero header -- dark card on white page */}
        <div className="relative rounded-2xl overflow-hidden" style={{ background: D.card, border: `1px solid ${D.cardBorder}`, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
          <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${D.accent}40, transparent)` }} />

          <div className="relative px-6 py-6 md:px-8 md:py-7">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-13 h-13 rounded-2xl flex items-center justify-center" style={{ background: `linear-gradient(145deg, ${D.accent}, ${D.accentMuted})`, boxShadow: `0 8px 32px ${D.accentGlowStrong}` }}>
                    <Brain className="w-6 h-6 text-white" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-md flex items-center justify-center" style={{ background: D.card, border: `1.5px solid ${D.cardBorder}` }}>
                    <Sparkles className="w-2.5 h-2.5" style={{ color: D.accent }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h1 className="text-xl md:text-2xl font-extrabold tracking-tight" style={{ color: D.text }}>Cerveau IA</h1>
                    <span className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-widest" style={{ background: D.accentBg, color: D.accent, border: `1px solid ${D.accentBorder}` }}>SA</span>
                  </div>
                  <p className="text-[12px] mt-1 font-medium" style={{ color: D.textMuted }}>Centre de configuration du support IA Talvex</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button onClick={() => setPreviewOpen(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-semibold transition-all duration-200 hover:brightness-125" style={{ background: D.accentBg, border: `1px solid ${D.accentBorder}`, color: D.accent }}>
                  <Eye className="w-4 h-4" />Apercu
                </button>
                <button onClick={handleSave} disabled={isSaving || !dirty} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[12px] font-bold transition-all duration-200 disabled:opacity-30" style={{ background: saveStatus === 'success' ? 'linear-gradient(135deg, #22c55e, #16a34a)' : `linear-gradient(135deg, ${D.accent}, ${D.accentMuted})`, color: '#fff', boxShadow: saveStatus === 'success' ? '0 4px 20px rgba(34,197,94,0.3)' : `0 4px 20px ${D.accentGlow}` }}>
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : saveStatus === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                  {saveStatus === 'success' ? 'Enregistre' : 'Enregistrer'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Banners -- light style on white background */}
        {saveStatus === 'success' && (
          <div className="rounded-xl px-5 py-3.5 flex items-center gap-3" style={{ background: D.pageGreenBg, border: `1px solid ${D.pageGreenBorder}` }}>
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: '#16a34a' }} />
            <p className="text-[12px] font-semibold" style={{ color: '#16a34a' }}>Cerveau IA enregistre avec succes.</p>
          </div>
        )}
        {saveStatus === 'error' && (
          <div className="rounded-xl px-5 py-3.5 flex items-center gap-3" style={{ background: D.pageRedBg, border: `1px solid ${D.pageRedBorder}` }}>
            <XCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#dc2626' }} />
            <p className="text-[12px] font-semibold" style={{ color: '#dc2626' }}>Erreur : {saveError || 'Echec.'}</p>
          </div>
        )}

        {brain && (
          <div className="space-y-6">
            <BrainScoreBar sections={scoreSections} />
            <BrainKnowledgePanel brain={brain} onChange={handleChange} />
            <SACerveauCards brain={brain} onChange={handleChange} onSave={handleSave} saving={isSaving} />
            <BrainTestChat isPlatform />
          </div>
        )}

        {brain && <BrainPreviewModal open={previewOpen} onClose={() => setPreviewOpen(false)} brain={brain} />}
      </div>
    </div>
  );
}
