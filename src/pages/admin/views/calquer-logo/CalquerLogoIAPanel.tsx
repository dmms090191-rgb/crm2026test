import { useState, useCallback, useEffect } from 'react';
import { Sparkles, Check, X, Download, Scissors, Wand2, RotateCcw, AlertTriangle, ScanSearch, Loader2 } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { isolateLogo, improveSvg, svgToDataUrl } from './calquer-logo-svg-utils';
import CalquerLogoSvgPreview from './CalquerLogoSvgPreview';
import CalquerLogoSvgTools from './CalquerLogoSvgTools';
import CalquerLogoZoneSummary from './CalquerLogoZoneSummary';
import { detectZones } from './calquer-logo-svg-zones';
import type { SvgZone } from './calquer-logo-svg-zones';
import CalquerLogoCreditsPanel, { loadCreditHistory, saveCreditHistory, type CreditSnapshot } from './CalquerLogoCreditsPanel';
import { WorkflowHeader, StepButton, WarningBox } from './CalquerLogoIAPanelParts';

interface Props {
  imageUrl: string | null;
  onUseSvg: (svgUrl: string) => void;
  onRestoreOriginal?: () => void;
  hasTransformed: boolean;
  onSvgContentChange?: (svg: string | null) => void;
  onBaseSvgChange?: (svg: string | null) => void;
  onPreviewBgColorChange?: (color: string | null) => void;
  onZonesChange?: (zones: SvgZone[], viewBox: string) => void;
  onZoneSelect?: (id: string | null) => void;
  onZoneHover?: (id: string | null) => void;
  externalSelectedZoneId?: string | null;
  externalHoveredZoneId?: string | null;
  restoredSvg?: string | null;
  restoredImprovedSvg?: string | null;
  initialPreviewBgColor?: string | null;
}

type Step = 'idle' | 'isolated' | 'vectorized' | 'improved';
type Loading = null | 'isolate' | 'vectorize' | 'improve';

export default function CalquerLogoIAPanel({ imageUrl, onUseSvg, onRestoreOriginal, hasTransformed, onSvgContentChange, onBaseSvgChange, onPreviewBgColorChange, onZonesChange, onZoneSelect, onZoneHover, externalSelectedZoneId, externalHoveredZoneId, restoredSvg, restoredImprovedSvg, initialPreviewBgColor }: Props) {
  const [step, setStep] = useState<Step>('idle');
  const [loading, setLoading] = useState<Loading>(null);
  const [error, setError] = useState('');
  const [isolatedUrl, setIsolatedUrl] = useState<string | null>(null);
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [improvedSvg, setImprovedSvg] = useState<string | null>(null);
  const [improveStats, setImproveStats] = useState<{ before: number; after: number; removed: number } | null>(null);
  const [zones, setZones] = useState<SvgZone[]>([]);
  const [zonesDetected, setZonesDetected] = useState(false);
  const selectedZoneId = externalSelectedZoneId ?? null;
  const hoveredZoneId = externalHoveredZoneId ?? null;
  const [analyzingShapes, setAnalyzingShapes] = useState(false);
  const [currentCredits, setCurrentCredits] = useState<number | null>(null);
  const [loadingCredits, setLoadingCredits] = useState(false);
  const [lastSnapshot, setLastSnapshot] = useState<CreditSnapshot | null>(null);
  const [creditHistory, setCreditHistory] = useState<CreditSnapshot[]>(() => loadCreditHistory());
  const [previewBgColor, setPreviewBgColorRaw] = useState<string | null>(initialPreviewBgColor ?? null);
  const setPreviewBgColor = useCallback((c: string | null) => {
    setPreviewBgColorRaw(c);
    onPreviewBgColorChange?.(c);
  }, [onPreviewBgColorChange]);

  const clearError = () => setError('');

  const fetchCredits = useCallback(async () => {
    setLoadingCredits(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoadingCredits(false); return; }
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/vectorize-logo?action=credits`;
      const resp = await fetch(url, { headers: { Authorization: `Bearer ${session.access_token}` } });
      const json = await resp.json();
      if (json.credits != null) setCurrentCredits(json.credits);
    } catch { /* silent */ }
    setLoadingCredits(false);
  }, []);

  useEffect(() => { fetchCredits(); }, [fetchCredits]);

  useEffect(() => {
    if (!restoredSvg) return;
    setSvgContent(restoredSvg);
    setImprovedSvg(restoredImprovedSvg || null);
    setStep(restoredImprovedSvg ? 'improved' : 'vectorized');
    setIsolatedUrl(null);
    setImproveStats(null);
    setZones([]); setZonesDetected(false); onZoneSelect?.(null);
    clearError();
    onBaseSvgChange?.(restoredSvg);
    onSvgContentChange?.(restoredImprovedSvg || restoredSvg);
  }, [restoredSvg, restoredImprovedSvg]);

  const updateApiIaEntry = useCallback(async (credits: number) => {
    try { await supabase.from('sa_ai_apis').update({ remaining_credit: `${credits} credits`, last_checked_at: new Date().toISOString() }).ilike('name', '%vectorizer%'); } catch { /* silent */ }
  }, []);

  const handleIsolate = async () => {
    if (!imageUrl) return; setLoading('isolate'); clearError();
    try { setIsolatedUrl(await isolateLogo(imageUrl)); setStep('isolated'); }
    catch (err) { setError(err instanceof Error ? err.message : 'Erreur lors de l\'isolation'); }
    setLoading(null);
  };

  const handleVectorize = async () => {
    const srcUrl = isolatedUrl || imageUrl;
    if (!srcUrl) return;
    setLoading('vectorize'); clearError();
    try {
      const resp = await fetch(srcUrl);
      const blob = await resp.blob();
      const formData = new FormData();
      formData.append('image', blob, 'logo.png');
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError('Session expiree. Reconnectez-vous.'); setLoading(null); return; }
      const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/vectorize-logo`;
      const result = await fetch(fnUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      });
      const json = await result.json();
      if (!result.ok) { setError(json.error || `Erreur ${result.status}`); setLoading(null); return; }
      if (!json.svg) { setError('Reponse invalide du serveur'); setLoading(null); return; }

      setSvgContent(json.svg);
      setImprovedSvg(null); setImproveStats(null);
      setZones([]); setZonesDetected(false); onZoneSelect?.(null);
      setStep('vectorized');
      onSvgContentChange?.(json.svg);
      onBaseSvgChange?.(json.svg);

      const snapshot: CreditSnapshot = {
        creditsBefore: json.creditsBefore ?? null,
        creditsAfter: json.creditsAfter ?? null,
        creditsUsed: json.creditsUsed ?? null,
        timestamp: new Date().toISOString(),
      };
      setLastSnapshot(snapshot);
      if (json.creditsAfter != null) {
        setCurrentCredits(json.creditsAfter);
        updateApiIaEntry(json.creditsAfter);
      }
      const newHistory = [snapshot, ...creditHistory].slice(0, 20);
      setCreditHistory(newHistory);
      saveCreditHistory(newHistory);
    } catch (err) { setError(err instanceof Error ? err.message : 'Erreur reseau'); }
    setLoading(null);
  };

  const handleImprove = () => {
    if (!svgContent) return;
    setLoading('improve'); clearError();
    try {
      const source = improvedSvg || svgContent;
      const parser = new DOMParser();
      const bDoc = parser.parseFromString(source, 'image/svg+xml');
      const bCount = bDoc.querySelectorAll('path, rect, circle, ellipse, polygon, polyline, line, text').length;
      const cleaned = improveSvg(source);
      const aDoc = parser.parseFromString(cleaned, 'image/svg+xml');
      const aCount = aDoc.querySelectorAll('path, rect, circle, ellipse, polygon, polyline, line, text').length;
      setImprovedSvg(cleaned);
      setImproveStats({ before: bCount, after: aCount, removed: bCount - aCount });
      setStep('improved'); onSvgContentChange?.(cleaned);
      if (zonesDetected) {
        const r = detectZones(cleaned);
        setZones(r.zones);
        onZonesChange?.(r.zones, r.viewBox);
      }
    } catch (err) { setError(err instanceof Error ? err.message : 'Erreur lors du nettoyage'); }
    setLoading(null);
  };

  const currentSvg = improvedSvg || svgContent;
  const handleUseSvg = () => { if (currentSvg) onUseSvg(svgToDataUrl(currentSvg)); };
  const handleDownload = () => {
    if (!currentSvg) return; const url = URL.createObjectURL(new Blob([currentSvg], { type: 'image/svg+xml' }));
    const a = document.createElement('a'); a.href = url; a.download = 'logo-vectorized.svg'; a.click(); URL.revokeObjectURL(url);
  };
  const handleAnalyzeShapes = () => {
    const source = improvedSvg || svgContent;
    if (!source) return;
    setAnalyzingShapes(true);
    try {
      const result = detectZones(source);
      setZones(result.zones); setZonesDetected(true);
      onZoneSelect?.(null); onZoneHover?.(null);
      onZonesChange?.(result.zones, result.viewBox);
    } catch { /* silent */ }
    setAnalyzingShapes(false);
  };
  const handleReset = () => {
    if (isolatedUrl) URL.revokeObjectURL(isolatedUrl);
    setStep('idle'); setIsolatedUrl(null); setSvgContent(null); setImprovedSvg(null); setImproveStats(null);
    setZones([]); setZonesDetected(false); onZoneSelect?.(null); onZoneHover?.(null);
    onZonesChange?.([], '0 0 300 300');
    clearError(); onSvgContentChange?.(null); onBaseSvgChange?.(null);
  };
  const stepNum = step === 'idle' ? 0 : step === 'isolated' ? 1 : step === 'vectorized' ? 2 : 3;

  return (
    <div className="w-64 flex-shrink-0 flex flex-col gap-3 p-4 overflow-y-auto border-r"
      style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(15,23,42,0.6)' }}>
      <WorkflowHeader stepNum={stepNum} />
      {!imageUrl && <WarningBox text="Importez un logo d'abord dans l'onglet Logo." />}
      {error && (
        <div className="flex items-start gap-2 p-2 rounded-lg"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: '#ef4444' }} />
          <p className="text-[10px]" style={{ color: '#ef4444' }}>{error}</p>
        </div>
      )}
      <StepButton label="Isoler le logo" desc="Supprime le fond avant vectorisation"
        icon={<Scissors className="w-4 h-4" />} onClick={handleIsolate}
        loading={loading === 'isolate'} disabled={!imageUrl || loading !== null} done={stepNum >= 1} color="#10b981" />
      <StepButton label="Vectoriser" desc={isolatedUrl ? 'A partir de l\'image isolee' : 'Envoie a Vectorizer.AI'}
        icon={<Sparkles className="w-4 h-4" />} onClick={handleVectorize}
        loading={loading === 'vectorize'} disabled={!imageUrl || loading !== null} done={stepNum >= 2} color="#3b82f6" />
      <StepButton label="Ameliorer le SVG" desc="Nettoie les elements parasites"
        icon={<Wand2 className="w-4 h-4" />} onClick={handleImprove}
        loading={loading === 'improve'} disabled={!svgContent || loading !== null} done={stepNum >= 3} color="#f59e0b" />
      {improveStats && (
        <div className="px-2 py-1.5 rounded-lg text-[9px] space-y-0.5"
          style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.12)' }}>
          <p style={{ color: '#f59e0b' }}>Avant: {improveStats.before} formes &rarr; Apres: {improveStats.after}</p>
          <p style={{ color: 'rgba(148,163,184,0.5)' }}>{improveStats.removed} element{improveStats.removed > 1 ? 's' : ''} supprime{improveStats.removed > 1 ? 's' : ''}</p>
        </div>
      )}
      {(svgContent || improvedSvg) && (
        <>
          <CalquerLogoSvgTools bgColor={previewBgColor}
            onBgColorChange={setPreviewBgColor} />
          <StepButton label="Analyser les zones du logo" desc={zonesDetected ? `${zones.length} zone${zones.length > 1 ? 's' : ''} detectee${zones.length > 1 ? 's' : ''}` : 'Regrouper les formes en zones logiques'}
            icon={analyzingShapes ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanSearch className="w-4 h-4" />}
            onClick={handleAnalyzeShapes} loading={analyzingShapes}
            disabled={(!svgContent && !improvedSvg) || analyzingShapes} done={zonesDetected} color="#06b6d4" />
          {zonesDetected && (
            <CalquerLogoZoneSummary zones={zones} selectedId={selectedZoneId} hoveredId={hoveredZoneId}
              onSelect={onZoneSelect || (() => {})} onHover={onZoneHover || (() => {})} />
          )}
        </>
      )}
      {currentSvg && (
        <div className="space-y-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(148,163,184,0.6)' }}>Apercu SVG</h3>
          <CalquerLogoSvgPreview svgContent={currentSvg} bgColor={previewBgColor} />
          <div className="flex flex-col gap-1.5">
            <button onClick={handleUseSvg} className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-[1.02]"
              style={{ background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', color: '#fff', boxShadow: '0 2px 8px rgba(34,197,94,0.3)' }}>
              <Check className="w-4 h-4" /> Utiliser ce SVG
            </button>
            <button onClick={handleDownload} className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 hover:scale-[1.02]"
              style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: '#60a5fa' }}>
              <Download className="w-3.5 h-3.5" /> Telecharger le SVG
            </button>
          </div>
        </div>
      )}
      {stepNum > 0 && (
        <button onClick={handleReset} className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200"
          style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(226,232,240,0.5)' }}>
          <RotateCcw className="w-3.5 h-3.5" /> Recommencer
        </button>
      )}
      {hasTransformed && onRestoreOriginal && (
        <button onClick={onRestoreOriginal} className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200"
          style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)', color: '#f59e0b' }}>
          <X className="w-3.5 h-3.5" /> Revenir a l'original
        </button>
      )}
      <div className="mt-auto pt-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <CalquerLogoCreditsPanel currentCredits={currentCredits} loadingCredits={loadingCredits}
          lastSnapshot={lastSnapshot} history={creditHistory} onRefreshCredits={fetchCredits} />
      </div>
    </div>
  );
}