import { useState, useRef, useCallback, useEffect } from 'react';
import CalquerLogoCanvas from './CalquerLogoCanvas';
import CalquerLogoTabBar, { type CalquerTab } from './CalquerLogoTabBar';
import CalquerLogoPanel from './CalquerLogoPanel';
import CalquerLogoColorPanel from './CalquerLogoColorPanel';
import CalquerLogoColorLogoPanel from './CalquerLogoColorLogoPanel';
import CalquerLogoSaveModal from './CalquerLogoSaveModal';
import CalquerLogoLoadModal from './CalquerLogoLoadModal';
import CalquerLogoWelcome from './CalquerLogoWelcome';
import { useCalquerSaves } from './useCalquerSaves';
import { createSession, updateSession, loadSession, imageUrlToDataUrl, dataUrlToObjectUrl } from './calquer-logo-save-api';
import type { SessionEditorState } from './calquer-logo-save-types';

import { applyLogoColorConfig, applyLogoColorConfigRaster } from './calquer-logo-recolor';
import type { BgConfig, LogoColorConfig, ColorIsolationState } from './calquer-logo-types';
import { bgConfigToCss, DEFAULT_BG_CONFIG, DEFAULT_LOGO_COLOR } from './calquer-logo-types';
import {
  pickColorFromImage, buildMaskFromImage, generatePreviewUrl,
  applyKeepSelection,
} from './calquer-logo-color-isolation';

const STORAGE_KEY = 'calquer-logo-state';

interface SavedState { zoom: number; panX: number; panY: number; bgConfig: BgConfig; }
const DEFAULTS: SavedState = { zoom: 1, panX: 0, panY: 0, bgConfig: DEFAULT_BG_CONFIG };
function loadState(): SavedState {
  try { const raw = localStorage.getItem(STORAGE_KEY); if (!raw) return { ...DEFAULTS }; return { ...DEFAULTS, ...JSON.parse(raw) }; }
  catch { return { ...DEFAULTS }; }
}
function saveState(s: SavedState) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* */ } }

const DEFAULT_CI: ColorIsolationState = { pickedColor: null, tolerance: 30, selectionMask: null, inverted: false };

export default function CalquerLogo() {
  const [mode, setMode] = useState<'welcome' | 'editor'>('welcome');
  const [activeTab, setActiveTab] = useState<CalquerTab>('logo');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [transformedUrl, setTransformedUrl] = useState<string | null>(null);
  const [showTransformed, setShowTransformed] = useState(false);
  const [zoom, setZoom] = useState(() => loadState().zoom);
  const [panX, setPanX] = useState(() => loadState().panX);
  const [panY, setPanY] = useState(() => loadState().panY);
  const [bgConfig, setBgConfig] = useState<BgConfig>(() => loadState().bgConfig);
  const [logoColorConfig, setLogoColorConfig] = useState<LogoColorConfig>({ ...DEFAULT_LOGO_COLOR });
  const baseTransformedRef = useRef<string | null>(null);
  const [iaBaseSvg, setIaBaseSvg] = useState<string | null>(null);
  const [iaSvgContent, setIaSvgContent] = useState<string | null>(null);

  const [ciState, setCiState] = useState<ColorIsolationState>({ ...DEFAULT_CI });
  const [ciPipetteActive, setCiPipetteActive] = useState(false);
  const [ciApplying, setCiApplying] = useState(false);
  const [ciPreviewUrl, setCiPreviewUrl] = useState<string | null>(null);
  const ciUndoUrl = useRef<string | null>(null);
  const [ciHasResult, setCiHasResult] = useState(false);

  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [loadModalOpen, setLoadModalOpen] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [savingChanges, setSavingChanges] = useState(false);
  const [changesSaved, setChangesSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<{ getImageRect: () => { x: number; y: number; w: number; h: number } | null }>(null);
  const saves = useCalquerSaves();

  useEffect(() => { saveState({ zoom, panX, panY, bgConfig }); }, [zoom, panX, panY, bgConfig]);

  const handleUpload = useCallback(() => fileRef.current?.click(), []);
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    if (transformedUrl) URL.revokeObjectURL(transformedUrl);
    setTransformedUrl(null); setShowTransformed(false);
    setImageUrl(URL.createObjectURL(file)); setCurrentSessionId(null); setChangesSaved(false);
    setIaBaseSvg(null); setIaSvgContent(null);
    setLogoColorConfig({ ...DEFAULT_LOGO_COLOR }); baseTransformedRef.current = null;
    setCiState({ ...DEFAULT_CI }); setCiPipetteActive(false); setCiHasResult(false);
    if (ciPreviewUrl) URL.revokeObjectURL(ciPreviewUrl); setCiPreviewUrl(null);
    ciUndoUrl.current = null;
    e.target.value = '';
  }, [imageUrl, transformedUrl, ciPreviewUrl]);

  const handleDownloadPng = useCallback(() => {
    const url = transformedUrl || imageUrl;
    if (!url) return;
    const a = document.createElement('a'); a.href = url; a.download = 'logo-transparent.png'; a.click();
  }, [transformedUrl, imageUrl]);

  const handlePanChange = useCallback((x: number, y: number) => { setPanX(x); setPanY(y); }, []);

  const setSvgAsTransformed = useCallback((svg: string) => {
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    if (transformedUrl) URL.revokeObjectURL(transformedUrl);
    setTransformedUrl(url); setShowTransformed(true);
  }, [transformedUrl]);

  const revokeRecolored = useCallback(() => {
    if (transformedUrl && transformedUrl !== baseTransformedRef.current) URL.revokeObjectURL(transformedUrl);
  }, [transformedUrl]);

  const handleLogoColorChange = useCallback(async (cfg: LogoColorConfig) => {
    setLogoColorConfig(cfg);
    if (iaBaseSvg) {
      const r = applyLogoColorConfig(iaBaseSvg, cfg); setIaSvgContent(r); setSvgAsTransformed(r);
    } else if (baseTransformedRef.current) {
      revokeRecolored();
      const url = await applyLogoColorConfigRaster(baseTransformedRef.current, cfg);
      setTransformedUrl(url); setShowTransformed(true);
    }
  }, [iaBaseSvg, setSvgAsTransformed, revokeRecolored]);

  const handleLogoColorReset = useCallback(() => {
    setLogoColorConfig({ ...DEFAULT_LOGO_COLOR });
    if (iaBaseSvg) { setIaSvgContent(iaBaseSvg); setSvgAsTransformed(iaBaseSvg); }
    else if (baseTransformedRef.current) { revokeRecolored(); setTransformedUrl(baseTransformedRef.current); setShowTransformed(true); }
  }, [iaBaseSvg, setSvgAsTransformed, revokeRecolored]);

  const updateCiPreview = useCallback(async (mask: number[]) => {
    if (!imageUrl) return;
    if (ciPreviewUrl) URL.revokeObjectURL(ciPreviewUrl);
    const url = await generatePreviewUrl(imageUrl, mask);
    setCiPreviewUrl(url);
  }, [imageUrl, ciPreviewUrl]);

  const handleCiPipetteClick = useCallback(async (clickX: number, clickY: number) => {
    if (!imageUrl || !ciPipetteActive) return;
    const imgRect = canvasRef.current?.getImageRect(); if (!imgRect) return;
    setCiApplying(true);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;
    await new Promise<void>(r => { img.onload = () => r(); });
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    const color = await pickColorFromImage(imageUrl, clickX, clickY, imgRect, nw, nh);
    const { mask } = await buildMaskFromImage(imageUrl, color[0], color[1], color[2], ciState.tolerance);
    setCiState(s => ({ ...s, pickedColor: color, selectionMask: mask, inverted: false }));
    ciUndoUrl.current = imageUrl;
    const url = await applyKeepSelection(imageUrl, mask);
    if (transformedUrl) URL.revokeObjectURL(transformedUrl);
    setTransformedUrl(url); setShowTransformed(true); baseTransformedRef.current = url;
    if (ciPreviewUrl) URL.revokeObjectURL(ciPreviewUrl);
    setCiPreviewUrl(null);
    setCiPipetteActive(false);
    setCiHasResult(true);
    setCiApplying(false);
  }, [imageUrl, ciPipetteActive, ciState.tolerance, ciPreviewUrl, transformedUrl]);

  const handleCiToleranceChange = useCallback(async (t: number) => {
    setCiState(s => {
      const next = { ...s, tolerance: t };
      const src = ciUndoUrl.current || imageUrl;
      if (s.pickedColor && src && ciHasResult) {
        buildMaskFromImage(src, s.pickedColor[0], s.pickedColor[1], s.pickedColor[2], t).then(async ({ mask }) => {
          setCiState(cs => ({ ...cs, selectionMask: mask }));
          const url = await applyKeepSelection(src, mask);
          if (transformedUrl) URL.revokeObjectURL(transformedUrl);
          setTransformedUrl(url); setShowTransformed(true); baseTransformedRef.current = url;
        });
      } else if (s.pickedColor && src) {
        buildMaskFromImage(src, s.pickedColor[0], s.pickedColor[1], s.pickedColor[2], t).then(({ mask }) => {
          setCiState(cs => ({ ...cs, selectionMask: mask }));
          updateCiPreview(mask);
        });
      }
      return next;
    });
  }, [imageUrl, updateCiPreview, ciHasResult, transformedUrl]);

  const handleCiUndo = useCallback(() => {
    if (!ciUndoUrl.current) return;
    if (transformedUrl) URL.revokeObjectURL(transformedUrl);
    setTransformedUrl(null); setShowTransformed(false);
    setCiHasResult(false);
    setCiState(s => ({ ...s, selectionMask: null }));
  }, [transformedUrl]);

  const handleCiReset = useCallback(() => {
    setCiState({ ...DEFAULT_CI });
    setCiPipetteActive(false);
    setCiHasResult(false);
    ciUndoUrl.current = null;
    if (ciPreviewUrl) URL.revokeObjectURL(ciPreviewUrl);
    setCiPreviewUrl(null);
  }, [ciPreviewUrl]);

  const buildEditorState = useCallback((): SessionEditorState => ({
    cleanMethod: 'couleur-isolation', bgConfig, zoom, panX, panY,
    hasOverlay: false, overlayOpacity: 0.5, inverted: false,
    splitView: false, showTransformed,
    maskShapes: [], maskFolders: [],
    iaStep: iaSvgContent ? 'vectorized' : 'idle',
    previewBgColor: null, logoColorConfig,
  }), [bgConfig, zoom, panX, panY, showTransformed, iaSvgContent, logoColorConfig]);

  const getSavePayload = useCallback(async () => {
    const tSrc = baseTransformedRef.current || transformedUrl;
    const [imgData, tData] = await Promise.all([
      imageUrl ? imageUrlToDataUrl(imageUrl) : null,
      tSrc ? imageUrlToDataUrl(tSrc) : null,
    ]);
    return { imgData, tData, state: buildEditorState(), baseSvg: iaBaseSvg || iaSvgContent, currentSvg: iaSvgContent };
  }, [imageUrl, transformedUrl, iaBaseSvg, iaSvgContent, buildEditorState]);

  const handleSave = useCallback(async (title: string) => {
    const p = await getSavePayload();
    if (currentSessionId) await updateSession(currentSessionId, p.imgData, p.baseSvg, p.currentSvg, p.state, p.tData);
    else { const id = await createSession(title, p.imgData, p.baseSvg, p.currentSvg, p.state, undefined, p.tData); setCurrentSessionId(id); }
    saves.refresh();
  }, [getSavePayload, currentSessionId, saves]);

  const handleSaveChanges = useCallback(async () => {
    if (!currentSessionId || savingChanges) return;
    setSavingChanges(true); setChangesSaved(false);
    try {
      const p = await getSavePayload();
      await updateSession(currentSessionId, p.imgData, p.baseSvg, p.currentSvg, p.state, p.tData);
      saves.refresh(); setChangesSaved(true);
      setTimeout(() => setChangesSaved(false), 3000);
    } catch { /* silent */ }
    setSavingChanges(false);
  }, [currentSessionId, savingChanges, getSavePayload, saves]);

  const handleOpenSave = useCallback(async (id: string) => {
    const session = await loadSession(id);
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    if (transformedUrl) URL.revokeObjectURL(transformedUrl);
    setImageUrl(session.original_image_data ? dataUrlToObjectUrl(session.original_image_data) : null);
    const baseSvg = session.svg_content || null;
    const currentSvg = session.current_svg_content || null;
    setIaSvgContent(currentSvg || baseSvg); setIaBaseSvg(baseSvg);
    const tUrl = session.transformed_image_data ? dataUrlToObjectUrl(session.transformed_image_data) : null;
    baseTransformedRef.current = tUrl;
    const es = session.editor_state;
    const lcc = es?.logoColorConfig || { ...DEFAULT_LOGO_COLOR };
    if (lcc.mode !== 'none' && baseSvg) {
      const r = applyLogoColorConfig(baseSvg, lcc); setIaSvgContent(r);
      const u = URL.createObjectURL(new Blob([r], { type: 'image/svg+xml' }));
      setTransformedUrl(u); setShowTransformed(true);
    } else if (lcc.mode !== 'none' && tUrl) {
      const u = await applyLogoColorConfigRaster(tUrl, lcc);
      setTransformedUrl(u); setShowTransformed(true);
    } else {
      setTransformedUrl(tUrl); setShowTransformed(!!tUrl);
    }
    if (es) {
      setBgConfig(es.bgConfig || DEFAULT_BG_CONFIG);
      setZoom(es.zoom || 1); setPanX(es.panX || 0); setPanY(es.panY || 0);
      setLogoColorConfig(lcc);
    }
    setCurrentSessionId(id); setMode('editor');
    setActiveTab(tUrl ? 'couleur' : 'logo');
  }, [imageUrl, transformedUrl]);

  const displayUrl = (showTransformed && transformedUrl) ? transformedUrl : imageUrl;

  const renderPanel = () => {
    if (activeTab === 'couleur') {
      return <CalquerLogoColorPanel bgConfig={bgConfig} onBgConfigChange={setBgConfig} hasTransformed={!!transformedUrl} />;
    }
    if (activeTab === 'couleur-logo') {
      return (
        <CalquerLogoColorLogoPanel
          hasContent={!!iaSvgContent || !!transformedUrl}
          logoColorConfig={logoColorConfig}
          onConfigChange={handleLogoColorChange}
          onReset={handleLogoColorReset}
        />
      );
    }
    return (
      <CalquerLogoPanel
        onUpload={handleUpload} hasImage={!!imageUrl}
        ciState={ciState} pipetteActive={ciPipetteActive}
        applying={ciApplying} hasResult={ciHasResult}
        onActivatePipette={() => setCiPipetteActive(v => !v)}
        onToleranceChange={handleCiToleranceChange}
        onUndo={handleCiUndo} onReset={handleCiReset}
      />
    );
  };

  const resetEditor = useCallback(() => {
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    if (transformedUrl) URL.revokeObjectURL(transformedUrl);
    if (ciPreviewUrl) URL.revokeObjectURL(ciPreviewUrl);
    setImageUrl(null); setTransformedUrl(null); setShowTransformed(false);
    setActiveTab('logo'); setZoom(1); setPanX(0); setPanY(0);
    setBgConfig({ ...DEFAULT_BG_CONFIG }); setLogoColorConfig({ ...DEFAULT_LOGO_COLOR });
    baseTransformedRef.current = null;
    setIaSvgContent(null); setIaBaseSvg(null);
    setCiState({ ...DEFAULT_CI }); setCiPipetteActive(false);
    setCiApplying(false); setCiPreviewUrl(null); setCiHasResult(false);
    ciUndoUrl.current = null;
    setCurrentSessionId(null); setSavingChanges(false); setChangesSaved(false);
  }, [imageUrl, transformedUrl, ciPreviewUrl]);

  const handleWelcomeLoad = useCallback(() => { saves.refresh(); setLoadModalOpen(true); }, [saves]);
  const handleBackToWelcome = useCallback(() => { resetEditor(); setMode('welcome'); }, [resetEditor]);

  if (mode === 'welcome') return (
    <div className="flex flex-col h-full min-h-0">
      <CalquerLogoWelcome onLoadSave={handleWelcomeLoad} onNewLogo={() => { resetEditor(); setMode('editor'); }} />
      <CalquerLogoLoadModal open={loadModalOpen} onClose={() => setLoadModalOpen(false)}
        sessions={saves.sessions} loading={saves.loading}
        onOpen={handleOpenSave} onDelete={saves.handleDelete} onRename={saves.handleRename} />
    </div>
  );

  return (
    <div className="flex flex-col h-full min-h-0">
      <input ref={fileRef} type="file" className="hidden" accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml" onChange={handleFileChange} />
      <CalquerLogoTabBar
        activeTab={activeTab} onTabChange={setActiveTab}
        hasImage={!!imageUrl} hasTransformed={!!transformedUrl}
        onLoad={() => setLoadModalOpen(true)} onSave={() => setSaveModalOpen(true)}
        onDownload={handleDownloadPng}
        hasActiveSession={!!currentSessionId} onSaveChanges={handleSaveChanges}
        savingChanges={savingChanges} changesSaved={changesSaved} onBackToWelcome={handleBackToWelcome}
      />
      <div className="flex flex-1 min-h-0">
        {renderPanel()}
        <CalquerLogoCanvas ref={canvasRef} imageUrl={displayUrl} zoom={zoom} onZoomChange={setZoom}
          hasOverlay={false} overlayOpacity={0.5} inverted={false}
          onSwap={() => {}} panX={panX} panY={panY} onPanChange={handlePanChange}
          splitView={false} originalUrl={imageUrl} transformedUrl={transformedUrl}
          transformedBg={bgConfigToCss(bgConfig)} showTransformed={showTransformed}
          showMaskOverlay={false} mask={{ tool: 'rectangle', mode: 'supprimer', opacity: 60, size: 20, strokeColor: '#ef4444', shapes: [], selectedId: null, folders: [] }}
          moveMode={false}
          onMaskAddShape={() => {}} onMaskSelectShape={() => {}} onMaskMoveShape={() => {}} onMaskDeleteSelected={() => {}}
          pipetteActive={activeTab === 'logo' && ciPipetteActive}
          onPipetteClick={handleCiPipetteClick}
          selectionPreviewUrl={activeTab === 'logo' ? ciPreviewUrl : null}
        />
      </div>
      <CalquerLogoSaveModal open={saveModalOpen} onClose={() => setSaveModalOpen(false)} onSave={handleSave} />
      <CalquerLogoLoadModal open={loadModalOpen} onClose={() => setLoadModalOpen(false)}
        sessions={saves.sessions} loading={saves.loading}
        onOpen={handleOpenSave} onDelete={saves.handleDelete} onRename={saves.handleRename} />
    </div>
  );
}
