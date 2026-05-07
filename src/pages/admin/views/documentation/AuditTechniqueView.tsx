import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  ShieldCheck, CheckCircle, AlertTriangle, XCircle,
  Loader2, Play, ListFilter,
} from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import { MOCK_SECTIONS, MOCK_GLOBAL_SCORE, computeCurrentSections, computeGlobalScore, type AuditSection } from './auditMockData';
import { useAuditSnapshot } from './useAuditSnapshot';
import { saveAuditRun } from '../../../../lib/auditHistoryService';
import TriagePanel from './TriagePanel';
import AuditHistoryStrip from './AuditHistoryStrip';
import FileSizeMetricsBlock from './FileSizeMetricsBlock';
import { scoreColor } from './auditUtils';
import ScoreBar from './ScoreBar';
import SectionBlock from './AuditSectionBlock';

type ViewTab = 'detail' | 'triage';

export default function AuditTechniqueView() {
  const tokens = useThemeTokens();
  const snapshot = useAuditSnapshot();

  const [sections, setSections] = useState<AuditSection[]>(MOCK_SECTIONS);
  const [globalScore, setGlobalScore] = useState(MOCK_GLOBAL_SCORE);
  const [analyzing, setAnalyzing] = useState(false);
  const [tab, setTab] = useState<ViewTab>('detail');
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [highlightedSection, setHighlightedSection] = useState<string | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const fresh = computeCurrentSections(snapshot);
    setSections(fresh);
    setGlobalScore(computeGlobalScore(fresh));
  }, [snapshot]);

  const handleTriageItemClick = useCallback((sectionId: string) => {
    setTab('detail');

    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);

    requestAnimationFrame(() => {
      const el = document.getElementById(`audit-section-${sectionId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setHighlightedSection(sectionId);
        highlightTimerRef.current = setTimeout(() => setHighlightedSection(null), 2000);
      }
    });
  }, []);

  const handleGlobalAnalyze = useCallback(async () => {
    setAnalyzing(true);
    try {
      const fresh = computeCurrentSections(snapshot);
      const score = computeGlobalScore(fresh);
      setSections(fresh);
      setGlobalScore(score);

      try {
        await saveAuditRun(fresh, score);
      } catch { /* save failure should not block local update */ }

      setHistoryRefreshKey((k) => k + 1);
    } finally {
      setAnalyzing(false);
    }
  }, [snapshot]);

  const globalColor = scoreColor(globalScore);

  const { totalChecks, totalOk, totalWarn, totalErr } = useMemo(() => {
    const checks = sections.flatMap((s) => s.checks);
    return {
      totalChecks: checks.length,
      totalOk: checks.filter((c) => c.status === 'ok').length,
      totalWarn: checks.filter((c) => c.status === 'warning').length,
      totalErr: checks.filter((c) => c.status === 'error').length,
    };
  }, [sections]);

  const tabs: { key: ViewTab; label: string; icon: React.ReactNode }[] = [
    { key: 'detail', label: 'Audit detail', icon: <ShieldCheck className="w-3.5 h-3.5" /> },
    { key: 'triage', label: 'Triage', icon: <ListFilter className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-y-auto md:overflow-y-visible">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6 flex-shrink-0">
        <div className="flex items-center gap-3 md:gap-4">
          <div
            className="w-9 h-9 md:w-11 md:h-11 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: 'rgba(45,212,191,0.10)',
              border: '1px solid rgba(45,212,191,0.18)',
              boxShadow: '0 0 24px rgba(45,212,191,0.06)',
            }}
          >
            <ShieldCheck className="w-4 h-4 md:w-5 md:h-5" style={{ color: '#2dd4bf' }} />
          </div>
          <div>
            <h2
              className="text-base md:text-lg font-bold tracking-tight"
              style={{ color: tokens.text.primary, letterSpacing: '-0.02em' }}
            >
              Audit technique
            </h2>
            <p className="text-xs mt-0.5" style={{ color: tokens.text.quaternary }}>
              Analyse de la sante technique du projet
            </p>
          </div>
        </div>

        <button
          onClick={handleGlobalAnalyze}
          disabled={analyzing}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 disabled:opacity-50 self-start md:self-auto"
          style={{
            background: 'rgba(45,212,191,0.10)',
            border: '1px solid rgba(45,212,191,0.20)',
            color: '#2dd4bf',
          }}
          onMouseEnter={(e) => {
            if (!analyzing) e.currentTarget.style.background = 'rgba(45,212,191,0.18)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(45,212,191,0.10)';
          }}
        >
          {analyzing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Play className="w-4 h-4" />
          )}
          {analyzing ? 'Analyse en cours...' : 'Analyser'}
        </button>
      </div>

      <div
        className="rounded-xl p-4 md:p-5 mb-5 flex-shrink-0"
        style={{ background: tokens.surface.tertiary, border: `1px solid ${tokens.surface.border}` }}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 md:gap-0 mb-3">
          <span className="text-sm font-semibold" style={{ color: tokens.text.primary }}>
            Score global
          </span>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 md:gap-4">
            <span className="flex items-center gap-1.5 text-xs" style={{ color: tokens.success.text }}>
              <CheckCircle className="w-3.5 h-3.5" /> {totalOk} OK
            </span>
            <span className="flex items-center gap-1.5 text-xs" style={{ color: tokens.warning.text }}>
              <AlertTriangle className="w-3.5 h-3.5" /> {totalWarn} avert.
            </span>
            <span className="flex items-center gap-1.5 text-xs" style={{ color: tokens.danger.text }}>
              <XCircle className="w-3.5 h-3.5" /> {totalErr} erreur{totalErr > 1 ? 's' : ''}
            </span>
            <span className="text-xs" style={{ color: tokens.text.quaternary }}>
              {totalChecks} points
            </span>
          </div>
        </div>
        <ScoreBar score={globalScore} color={globalColor} tokens={tokens} />
      </div>

      <div className="mb-5 flex-shrink-0">
        <FileSizeMetricsBlock />
      </div>

      <div className="mb-4 flex-shrink-0">
        <AuditHistoryStrip refreshKey={historyRefreshKey} />
      </div>

      <div className="flex items-center gap-1 mb-4 flex-shrink-0">
        {tabs.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150"
              style={{
                background: active ? tokens.surface.tertiary : 'transparent',
                border: `1px solid ${active ? tokens.surface.border : 'transparent'}`,
                color: active ? tokens.text.primary : tokens.text.tertiary,
              }}
              onMouseEnter={(e) => {
                if (!active) e.currentTarget.style.background = tokens.surface.hover;
              }}
              onMouseLeave={(e) => {
                if (!active) e.currentTarget.style.background = 'transparent';
              }}
            >
              {t.icon}
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="md:flex-1 md:min-h-0 md:overflow-y-auto md:pr-1">
        {tab === 'detail' ? (
          <div className="flex flex-col gap-4">
            {sections.map((section) => (
              <SectionBlock key={section.id} section={section} tokens={tokens} highlighted={highlightedSection === section.id} />
            ))}
          </div>
        ) : (
          <TriagePanel onItemClick={handleTriageItemClick} sections={sections} />
        )}
      </div>
    </div>
  );
}
