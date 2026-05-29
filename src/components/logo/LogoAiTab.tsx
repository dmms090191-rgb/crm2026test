import { useState, useCallback } from 'react';
import { Sparkles, Loader2, Info, AlertTriangle } from 'lucide-react';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import { supabase } from '../../lib/supabase';
import {
  PRESETS, UNIT_COST_PER_IMAGE, TRANSPARENT_COST_PER_IMAGE,
  type Engine, type Preset, type LogoType, type RecraftStyle, type NumProposals, type ColorPaletteId,
} from './logoAiConstants';
import { hexToRgb, rasterizeSvgUrl } from './logoAiHelpers';
import LogoAiEngineSelector from './LogoAiEngineSelector';
import LogoAiV4Controls from './LogoAiV4Controls';
import LogoAiV3Controls from './LogoAiV3Controls';
import LogoAiOptionsBar from './LogoAiOptionsBar';
import LogoAiResultsGrid from './LogoAiResultsGrid';

interface Props {
  companyId: string | null;
  onSaved?: () => void;
  onSwitchToUpload?: () => void;
}

export default function LogoAiTab({ companyId, onSaved, onSwitchToUpload }: Props) {
  const t = useThemeTokens();

  const [engine, setEngine] = useState<Engine>('v4_1');
  const [preset, setPreset] = useState<Preset>('typographic');
  const [colorPalette, setColorPalette] = useState<ColorPaletteId>('custom');
  const [customPrimary, setCustomPrimary] = useState('#001F3F');
  const [customSecondary, setCustomSecondary] = useState('#00BCD4');
  const [brandName, setBrandName] = useState('');
  const [prompt, setPrompt] = useState('');
  const [numProposals, setNumProposals] = useState<NumProposals>(2);
  const [transparentBg, setTransparentBg] = useState(false);

  const [logoType, setLogoType] = useState<LogoType>('symbol_and_text');
  const [recraftStyle, setRecraftStyle] = useState<RecraftStyle>('Vector art');

  const [loading, setLoading] = useState(false);
  const [postProcessing, setPostProcessing] = useState(false);
  const [postProcessStatus, setPostProcessStatus] = useState<string | null>(null);
  const [savingIdx, setSavingIdx] = useState<number | null>(null);
  const [savedSet, setSavedSet] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [generatedUrls, setGeneratedUrls] = useState<string[]>([]);

  const genCost = numProposals * UNIT_COST_PER_IMAGE;
  const transpCost = transparentBg ? numProposals * TRANSPARENT_COST_PER_IMAGE : 0;
  const estimatedCost = genCost + transpCost;

  const currentPresetDef = PRESETS.find(p => p.id === preset);
  const needsBrand = engine === 'v4_1' ? (currentPresetDef?.needsBrand ?? true) : logoType !== 'symbol_only';
  const canGenerate = engine === 'v4_1'
    ? (needsBrand ? brandName.trim().length > 0 : true)
    : prompt.trim().length > 0;

  const removeBackground = useCallback(async (pngBase64: string, cId: string, token: string): Promise<string> => {
    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/edit-logo`;
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'remove-background', image_base64: pngBase64, company_id: cId }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Erreur removeBackground');
    return data.image_url;
  }, []);

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setLoading(true); setError(null); setGeneratedUrls([]); setSavedSet(new Set());
    setPostProcessing(false); setPostProcessStatus(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError('Vous devez etre connecte.'); return; }

      const payload: Record<string, unknown> = {
        engine, n: numProposals, brand_name: brandName.trim(), company_id: companyId ?? '',
      };
      if (engine === 'v4_1') {
        payload.preset = preset;
        if (prompt.trim()) payload.prompt = prompt.trim();
        if (colorPalette === 'custom') {
          payload.colors = [Array.from(hexToRgb(customPrimary)), Array.from(hexToRgb(customSecondary))];
        } else if (colorPalette === 'black_white') {
          payload.colors = [[0, 0, 0], [255, 255, 255]];
        }
      } else {
        payload.prompt = prompt.trim();
        payload.logo_type = logoType;
        payload.recraft_style = recraftStyle;
        payload.brand_name = logoType === 'symbol_only' ? '' : brandName.trim();
      }

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-logo`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) { setError(data.error || 'Erreur lors de la generation.'); return; }

      const urls: string[] = data.image_urls ?? (data.image_url ? [data.image_url] : []);

      if (transparentBg && urls.length > 0) {
        setLoading(false); setPostProcessing(true);
        const transparentUrls: string[] = [];
        for (let i = 0; i < urls.length; i++) {
          setPostProcessStatus(`Conversion transparente ${i + 1}/${urls.length}...`);
          try {
            const pngDataUrl = await rasterizeSvgUrl(urls[i]);
            transparentUrls.push(await removeBackground(pngDataUrl, companyId ?? '', session.access_token));
          } catch (e) {
            transparentUrls.push(urls[i]);
            console.error(`[LogoAiTab] removeBackground failed for logo ${i}:`, e);
          }
        }
        setGeneratedUrls(transparentUrls);
        setPostProcessing(false); setPostProcessStatus(null);
      } else {
        setGeneratedUrls(urls);
      }
    } catch {
      setError('Une erreur est survenue lors de la generation.');
    } finally {
      setLoading(false); setPostProcessing(false); setPostProcessStatus(null);
    }
  };

  const handleSave = async (url: string, idx: number) => {
    if (!companyId) { setError('Aucune societe associee. Impossible de sauvegarder.'); return; }
    setSavingIdx(idx); setError(null);
    try {
      const { data: existing } = await supabase
        .from('company_logos').select('position').eq('company_id', companyId)
        .order('position', { ascending: false }).limit(1);
      const maxPos = existing && existing.length > 0 ? existing[0].position + 1 : 0;
      const label = transparentBg ? 'Logo IA (transparent)' : 'Logo IA';
      const { error: dbErr } = await supabase.from('company_logos').insert({
        company_id: companyId, url,
        file_name: `${label} - ${new Date().toLocaleDateString('fr-FR')}`,
        is_active: false, position: maxPos,
      });
      if (dbErr) throw dbErr;
      setSavedSet(prev => new Set(prev).add(idx));
      onSaved?.();
    } catch (e: unknown) {
      setError(`Erreur sauvegarde : ${e instanceof Error ? e.message : String(e)}`);
    } finally { setSavingIdx(null); }
  };

  const btnStyle = (active: boolean) => ({
    background: active ? 'rgba(245,158,11,0.1)' : t.surface.secondary,
    border: `1px solid ${active ? 'rgba(245,158,11,0.3)' : t.surface.border}`,
    color: active ? '#d97706' : t.text.tertiary,
  });

  return (
    <div className="space-y-4">
      {/* Help banner */}
      <div className="flex items-start gap-2.5 rounded-xl px-4 py-3"
        style={{ background: 'rgba(14,165,233,0.06)', border: '1px solid rgba(14,165,233,0.12)' }}>
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#0ea5e9' }} />
        <p className="text-[11px] leading-relaxed" style={{ color: t.text.secondary }}>
          L'IA genere des propositions de logos vectoriels. Sauvegardez la meilleure ou{' '}
          {onSwitchToUpload ? (
            <button onClick={onSwitchToUpload} className="underline font-semibold hover:opacity-80 transition-opacity" style={{ color: '#0ea5e9' }}>
              importez votre propre logo
            </button>
          ) : <span>importez votre propre logo depuis l'onglet Liste</span>}.
        </p>
      </div>

      {/* Controls */}
      <div className="rounded-xl p-5" style={{ background: t.surface.primary, border: `1px solid ${t.surface.border}` }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', boxShadow: '0 0 16px rgba(245,158,11,0.3)' }}>
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold" style={{ color: t.text.primary }}>Generer un logo avec l'IA</h3>
            <p className="text-[11px]" style={{ color: t.text.tertiary }}>
              {engine === 'v4_1' ? 'Recraft V4.1 Vector -- meilleure qualite, prompts controles' : 'Recraft V3 Vector -- mode avance avec styles'}
            </p>
          </div>
        </div>

        <div className="space-y-3" style={{ borderTop: `1px solid ${t.surface.border}`, paddingTop: 16 }}>
          <LogoAiEngineSelector engine={engine} setEngine={setEngine} btnStyle={btnStyle} labelColor={t.text.secondary} />

          {engine === 'v4_1' ? (
            <LogoAiV4Controls
              preset={preset} setPreset={setPreset} needsBrand={needsBrand}
              brandName={brandName} setBrandName={setBrandName}
              colorPalette={colorPalette} setColorPalette={setColorPalette}
              customPrimary={customPrimary} setCustomPrimary={setCustomPrimary}
              customSecondary={customSecondary} setCustomSecondary={setCustomSecondary}
              prompt={prompt} setPrompt={setPrompt} btnStyle={btnStyle}
              surfaceSecondary={t.surface.secondary} surfaceBorder={t.surface.border}
              surfacePrimary={t.surface.primary} textPrimary={t.text.primary}
              textSecondary={t.text.secondary} textTertiary={t.text.tertiary} textQuaternary={t.text.quaternary}
            />
          ) : (
            <LogoAiV3Controls
              brandName={brandName} setBrandName={setBrandName}
              logoType={logoType} setLogoType={setLogoType}
              recraftStyle={recraftStyle} setRecraftStyle={setRecraftStyle}
              prompt={prompt} setPrompt={setPrompt} btnStyle={btnStyle}
              surfaceSecondary={t.surface.secondary} surfaceBorder={t.surface.border}
              textPrimary={t.text.primary} textSecondary={t.text.secondary} textQuaternary={t.text.quaternary}
            />
          )}

          <LogoAiOptionsBar
            transparentBg={transparentBg} setTransparentBg={setTransparentBg}
            numProposals={numProposals} setNumProposals={setNumProposals} btnStyle={btnStyle}
            surfaceSecondary={t.surface.secondary} surfaceBorder={t.surface.border}
            textSecondary={t.text.secondary} textTertiary={t.text.tertiary} textQuaternary={t.text.quaternary}
          />

          <div className="flex items-center justify-end gap-2">
            <span className="text-[10px] font-medium" style={{ color: '#d97706' }}>
              Cout estime : {estimatedCost} unites API
              {transparentBg && <span style={{ color: '#0ea5e9' }}> (dont {transpCost} transparent)</span>}
            </span>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading || postProcessing || !canGenerate}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all hover:brightness-110 disabled:opacity-50 disabled:hover:brightness-100"
            style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff', boxShadow: '0 2px 12px rgba(245,158,11,0.25)' }}
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {loading ? 'Generation en cours...' : `Generer ${numProposals} logo${numProposals > 1 ? 's' : ''}`}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl px-4 py-3" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#ef4444' }} />
          <p className="text-xs leading-relaxed" style={{ color: '#ef4444' }}>{error}</p>
        </div>
      )}

      <LogoAiResultsGrid
        generatedUrls={generatedUrls} transparentBg={transparentBg}
        savedSet={savedSet} savingIdx={savingIdx} companyId={companyId}
        loading={loading} postProcessing={postProcessing} postProcessStatus={postProcessStatus}
        engine={engine} numProposals={numProposals} genCost={genCost}
        onSave={handleSave} onClear={() => { setGeneratedUrls([]); setSavedSet(new Set()); }}
        onSwitchToUpload={onSwitchToUpload}
        textPrimary={t.text.primary} textSecondary={t.text.secondary}
        textTertiary={t.text.tertiary} textQuaternary={t.text.quaternary}
        surfacePrimary={t.surface.primary} surfaceSecondary={t.surface.secondary} surfaceBorder={t.surface.border}
      />
    </div>
  );
}
