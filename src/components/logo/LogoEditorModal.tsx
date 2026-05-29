import { useState, useCallback, useEffect } from 'react';
import { X, Loader2, AlertTriangle, Zap, Download } from 'lucide-react';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import { supabase } from '../../lib/supabase';
import type { CompanyLogo } from './LogoCard';
import {
  isSvgUrl, hexToRgb, rasterizeImageUrl, compositeOnColor,
  PRESET_COLORS, REMOVE_BG_COST, type EditorAction,
} from './logoEditorHelpers';
import LogoEditorPreviewPanel from './LogoEditorPreviewPanel';
import LogoEditorActionSelector from './LogoEditorActionSelector';

interface Props {
  logo: CompanyLogo;
  companyId: string;
  onClose: () => void;
  onSaved: () => void;
}

export default function LogoEditorModal({ logo, companyId, onClose, onSaved }: Props) {
  const t = useThemeTokens();
  const isSvg = isSvgUrl(logo.url);

  const [selectedAction, setSelectedAction] = useState<EditorAction>('remove-background');
  const [selectedColorIdx, setSelectedColorIdx] = useState(0);
  const [customColor, setCustomColor] = useState('#0ea5e9');
  const [useCustom, setUseCustom] = useState(false);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const currentColor = useCustom
    ? { label: 'Personnalisee', rgb: hexToRgb(customColor) as [number, number, number], hex: customColor }
    : PRESET_COLORS[selectedColorIdx];

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const callRemoveBackground = useCallback(async (pngBase64: string): Promise<string> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Vous devez etre connecte.');
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/edit-logo`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'remove-background', image_base64: pngBase64, company_id: companyId }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Erreur lors du traitement.');
    return data.image_url;
  }, [companyId]);

  const callRemoveBackgroundUrl = useCallback(async (): Promise<string> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Vous devez etre connecte.');
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/edit-logo`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'remove-background', image_url: logo.url, company_id: companyId }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Erreur lors du traitement.');
    return data.image_url;
  }, [companyId, logo.url]);

  const handleApply = async () => {
    setLoading(true); setError(null); setResultUrl(null); setStatusMsg(null);
    try {
      let transparentUrl: string;
      if (isSvg) {
        setStatusMsg('Conversion SVG vers PNG...');
        const pngDataUrl = await rasterizeImageUrl(logo.url);
        setStatusMsg('Suppression du fond via Recraft...');
        transparentUrl = await callRemoveBackground(pngDataUrl);
      } else {
        setStatusMsg('Suppression du fond via Recraft...');
        transparentUrl = await callRemoveBackgroundUrl();
      }

      if (selectedAction === 'remove-background') {
        setResultUrl(transparentUrl);
      } else {
        setStatusMsg('Application de la couleur de fond...');
        const compositeDataUrl = await compositeOnColor(transparentUrl, currentColor.rgb);
        const blob = await fetch(compositeDataUrl).then(r => r.blob());
        const filePath = `${companyId}/logo-edited-${Date.now()}.png`;
        const { error: upErr } = await supabase.storage
          .from('company-logos').upload(filePath, blob, { contentType: 'image/png', upsert: true });
        if (upErr) throw new Error(upErr.message);
        const { data: pub } = supabase.storage.from('company-logos').getPublicUrl(filePath);
        setResultUrl(pub.publicUrl);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue.');
    } finally { setLoading(false); setStatusMsg(null); }
  };

  const handleSave = async () => {
    if (!resultUrl) return;
    setSaving(true); setError(null);
    try {
      const { data: existing } = await supabase
        .from('company_logos').select('position').eq('company_id', companyId)
        .order('position', { ascending: false }).limit(1);
      const maxPos = existing && existing.length > 0 ? existing[0].position + 1 : 0;
      const actionLabel = selectedAction === 'remove-background' ? 'Transparent' : `Fond ${currentColor.label}`;
      const { error: dbErr } = await supabase.from('company_logos').insert({
        company_id: companyId, url: resultUrl,
        file_name: `${actionLabel} - ${new Date().toLocaleDateString('fr-FR')}`,
        is_active: false, position: maxPos,
      });
      if (dbErr) throw dbErr;
      onSaved();
    } catch (e: unknown) {
      setError(`Erreur sauvegarde : ${e instanceof Error ? e.message : String(e)}`);
    } finally { setSaving(false); }
  };

  const resetResult = () => { setResultUrl(null); setError(null); };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] rounded-2xl overflow-hidden flex flex-col"
        style={{
          background: t.surface.primary,
          border: `1px solid ${t.surface.border}`,
          boxShadow: '0 24px 64px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.03)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${t.surface.border}` }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', boxShadow: '0 4px 16px rgba(14,165,233,0.25)' }}>
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold" style={{ color: t.text.primary }}>Editer le logo</h3>
              <p className="text-[11px]" style={{ color: t.text.tertiary }}>Modifier l'arriere-plan avec l'IA</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}`, color: t.text.tertiary }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <LogoEditorPreviewPanel label="Original" checkerBg>
              <img src={logo.url} alt="Logo original" className="max-h-[140px] max-w-full object-contain" />
            </LogoEditorPreviewPanel>
            <LogoEditorPreviewPanel
              label="Resultat"
              checkerBg={!!resultUrl && selectedAction === 'remove-background'}
              bgColor={resultUrl && selectedAction === 'replace-background' ? currentColor.hex : undefined}
            >
              {loading ? (
                <div className="flex flex-col items-center gap-2.5">
                  <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#0ea5e9' }} />
                  <p className="text-[11px] font-medium" style={{ color: t.text.tertiary }}>{statusMsg || 'Traitement en cours...'}</p>
                </div>
              ) : resultUrl ? (
                <img src={resultUrl} alt="Logo edite" className="max-h-[140px] max-w-full object-contain" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-center">
                  <Zap className="w-5 h-5" style={{ color: t.text.quaternary }} />
                  <p className="text-[11px]" style={{ color: t.text.quaternary }}>L'apercu apparaitra ici</p>
                </div>
              )}
            </LogoEditorPreviewPanel>
          </div>

          <LogoEditorActionSelector
            selectedAction={selectedAction} setSelectedAction={setSelectedAction}
            selectedColorIdx={selectedColorIdx} setSelectedColorIdx={setSelectedColorIdx}
            customColor={customColor} setCustomColor={setCustomColor}
            useCustom={useCustom} setUseCustom={setUseCustom}
            onResetResult={resetResult}
          />

          {isSvg && (
            <div className="flex items-start gap-2.5 rounded-xl px-4 py-3"
              style={{ background: 'rgba(14,165,233,0.05)', border: '1px solid rgba(14,165,233,0.12)' }}>
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#0ea5e9' }} />
              <p className="text-[10px] leading-relaxed" style={{ color: t.text.secondary }}>
                Ce logo est en format SVG. Il sera converti en PNG avant traitement.
              </p>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-xl px-4 py-3"
              style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.12)' }}>
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#ef4444' }} />
              <p className="text-xs leading-relaxed" style={{ color: '#ef4444' }}>{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 flex items-center justify-between gap-3 flex-wrap" style={{ borderTop: `1px solid ${t.surface.border}` }}>
          <span className="text-[10px] font-medium" style={{ color: t.text.quaternary }}>
            Cout : {REMOVE_BG_COST} unites API Recraft
          </span>
          <div className="flex items-center gap-2.5">
            {resultUrl && (
              <button onClick={handleSave} disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)', color: '#fff', boxShadow: '0 2px 12px rgba(22,163,106,0.25)' }}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {saving ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>
            )}
            <button onClick={handleApply} disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', color: '#fff', boxShadow: '0 2px 12px rgba(14,165,233,0.25)' }}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              {loading ? 'Traitement...' : 'Appliquer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
