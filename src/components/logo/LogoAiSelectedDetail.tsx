import { useState, useEffect, useRef } from 'react';
import { Wand2, X } from 'lucide-react';
import type { useThemeTokens } from '../../hooks/useThemeTokens';
import { notifyLogoChanged } from '../../hooks/useActiveLogo';
import { supabase } from '../../lib/supabase';
import type { SavedLogo } from './logoAiTypes';
import { ZOOM_DEFAULT, PREVIEW_BG_KEY, PREVIEW_BG_PRESETS } from './logoAiTypes';
import { loadCustomColors, saveCustomColors } from './logoAiTypes';
import LogoDetailPreview, { buildPreviewTabs } from './LogoDetailPreview';
import LogoDetailSidebar from './LogoDetailSidebar';

interface Props {
  logo: SavedLogo | null;
  family: SavedLogo[];
  t: ReturnType<typeof useThemeTokens>;
  onFullscreen: (url: string) => void;
  onDeselect: () => void;
  onSelectAsActive: (id: string) => void;
  selectingActive: boolean;
  companyId: string | null;
}

export default function LogoAiSelectedDetail({
  logo, family, t, onFullscreen, onDeselect, onSelectAsActive, selectingActive, companyId,
}: Props) {
  const [previewBg, setPreviewBg] = useState<string | null>(() => {
    try { return localStorage.getItem(PREVIEW_BG_KEY); } catch { return null; }
  });
  const [customColors, setCustomColors] = useState<string[]>(loadCustomColors);
  const [zoom, setZoom] = useState(ZOOM_DEFAULT);
  const [showScaleSlider, setShowScaleSlider] = useState(false);
  const [sidebarScale, setSidebarScale] = useState(1);
  const [savedScale, setSavedScale] = useState(1);
  const scaleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [previewPage, setPreviewPage] = useState<number>(0);

  useEffect(() => { setPreviewPage(0); }, [logo?.id]);

  useEffect(() => {
    if (!companyId) return;
    (async () => {
      const { data } = await supabase.from('company_home_pages').select('logo_scale')
        .eq('company_id', companyId).limit(1).maybeSingle();
      const s = data?.logo_scale ?? 1;
      setSidebarScale(s);
      setSavedScale(s);
    })();
  }, [companyId]);

  const handleScaleInput = (value: number) => {
    setSidebarScale(value);
    if (scaleTimerRef.current) clearTimeout(scaleTimerRef.current);
    scaleTimerRef.current = setTimeout(async () => {
      if (!companyId) return;
      await supabase.from('company_home_pages')
        .update({ logo_scale: value, updated_at: new Date().toISOString() })
        .eq('company_id', companyId);
      notifyLogoChanged();
    }, 300);
  };

  const validateScale = () => { setSavedScale(sidebarScale); setShowScaleSlider(false); };

  const cancelScale = () => {
    setSidebarScale(savedScale);
    setShowScaleSlider(false);
    if (!companyId) return;
    supabase.from('company_home_pages')
      .update({ logo_scale: savedScale, updated_at: new Date().toISOString() })
      .eq('company_id', companyId).then(() => notifyLogoChanged());
  };

  const applyBg = (color: string | null) => {
    setPreviewBg(color);
    try {
      if (color) localStorage.setItem(PREVIEW_BG_KEY, color);
      else localStorage.removeItem(PREVIEW_BG_KEY);
    } catch { /* no-op */ }
  };

  const saveCurrentColor = () => {
    if (!previewBg) return;
    const upper = previewBg.toUpperCase();
    if (PREVIEW_BG_PRESETS.some(p => p.value.toUpperCase() === upper)) return;
    if (customColors.some(c => c.toUpperCase() === upper)) return;
    const next = [upper, ...customColors].slice(0, 12);
    setCustomColors(next);
    saveCustomColors(next);
  };

  const removeCustomColor = (color: string) => {
    const next = customColors.filter(c => c !== color);
    setCustomColors(next);
    saveCustomColors(next);
    if (previewBg?.toUpperCase() === color.toUpperCase()) applyBg(null);
  };

  if (!logo) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center gap-1.5 px-3 py-1.5 flex-shrink-0"
          style={{ borderBottom: `1px dashed ${t.surface.border}` }}>
          <span className="w-4 h-4 rounded flex items-center justify-center text-[8px] font-extrabold flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.10), rgba(217,119,6,0.14))', color: '#b45309', border: '1px solid rgba(245,158,11,0.10)' }}>
            9
          </span>
          <Wand2 className="w-2.5 h-2.5 flex-shrink-0" style={{ color: '#d97706' }} />
          <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: t.text.tertiary }}>
            Apercu du pack
          </span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-3 py-6">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.04), rgba(217,119,6,0.06))', border: '1px solid rgba(245,158,11,0.06)' }}>
            <Wand2 className="w-5 h-5" style={{ color: '#d97706', opacity: 0.3 }} />
          </div>
          <div className="text-center">
            <p className="text-[10px] font-semibold mb-0.5" style={{ color: t.text.tertiary }}>Apercu du logo selectionne</p>
            <p className="text-[9px]" style={{ color: t.text.quaternary }}>Cliquez sur un logo ci-dessus</p>
          </div>
        </div>
      </div>
    );
  }

  const isFamily = family.length > 1;
  const previewTabs = buildPreviewTabs(family);
  const displayedLogos = previewTabs ? previewTabs[previewPage]?.logos ?? [logo] : [logo];

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between gap-2 px-3 py-1.5 flex-shrink-0"
        style={{ borderBottom: `1px dashed ${t.surface.border}` }}>
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="w-4 h-4 rounded flex items-center justify-center text-[8px] font-extrabold flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.10), rgba(217,119,6,0.14))', color: '#b45309', border: '1px solid rgba(245,158,11,0.10)' }}>
            9
          </span>
          <Wand2 className="w-2.5 h-2.5 flex-shrink-0" style={{ color: '#d97706' }} />
          <span className="text-[9px] font-bold uppercase tracking-wider truncate" style={{ color: t.text.tertiary }}>
            {isFamily ? 'Apercu du pack' : 'Apercu'}
          </span>
          {isFamily && (
            <span className="px-1.5 py-0.5 rounded text-[7px] font-bold uppercase flex-shrink-0"
              style={{ background: 'rgba(245,158,11,0.08)', color: '#d97706', border: '1px solid rgba(245,158,11,0.12)' }}>
              Famille
            </span>
          )}
        </div>
        <button onClick={onDeselect}
          className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-colors hover:brightness-110"
          style={{ color: t.text.quaternary, border: `1px solid ${t.surface.border}` }}>
          <X className="w-2.5 h-2.5" />
        </button>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        <LogoDetailPreview
          logo={logo} family={family} displayedLogos={displayedLogos}
          previewPage={previewPage} setPreviewPage={setPreviewPage}
          previewBg={previewBg} zoom={zoom} setZoom={setZoom} t={t}
        />

        <div className="hidden lg:block w-px flex-shrink-0" style={{ background: t.surface.border }} />
        <div className="block lg:hidden h-px flex-shrink-0" style={{ background: t.surface.border }} />

        <LogoDetailSidebar
          logo={logo} family={family} displayedLogos={displayedLogos} t={t}
          previewBg={previewBg} applyBg={applyBg}
          customColors={customColors} saveCurrentColor={saveCurrentColor} removeCustomColor={removeCustomColor}
          onFullscreen={onFullscreen} onSelectAsActive={onSelectAsActive} selectingActive={selectingActive}
          showScaleSlider={showScaleSlider} setShowScaleSlider={setShowScaleSlider}
          sidebarScale={sidebarScale} handleScaleInput={handleScaleInput}
          validateScale={validateScale} cancelScale={cancelScale}
        />
      </div>
    </div>
  );
}
