import { useState, useRef, useCallback, useEffect } from 'react';
import CalquerLogoToolbar from './CalquerLogoToolbar';
import CalquerLogoCanvas from './CalquerLogoCanvas';
import CalquerLogoTabBar, { type CalquerTab } from './CalquerLogoTabBar';
import CalquerLogoColorPanel from './CalquerLogoColorPanel';
import CalquerLogoMaskPanel from './CalquerLogoMaskPanel';
import CalquerLogoShapesPanel from './CalquerLogoShapesPanel';

import type { BgConfig, CleanMethod, MaskState, MaskShape, MaskFolder, MaskTool, MaskMode } from './calquer-logo-types';
import { bgConfigToCss, DEFAULT_BG_CONFIG } from './calquer-logo-types';
import { applyMaskToImage } from './calquer-logo-mask-apply';
import { removeWhiteBackground } from './calquer-logo-remove-bg';

const STORAGE_KEY = 'calquer-logo-state';
const MASK_ORG_KEY = 'calquer-logo-mask-org';

interface SavedState {
  zoom: number; hasOverlay: boolean; overlayOpacity: number;
  inverted: boolean; panX: number; panY: number; bgConfig: BgConfig; cleanMethod: CleanMethod;
}

const DEFAULTS: SavedState = {
  zoom: 1, hasOverlay: false, overlayOpacity: 0.5,
  inverted: false, panX: 0, panY: 0, bgConfig: DEFAULT_BG_CONFIG, cleanMethod: 'none',
};

function loadState(): SavedState {
  try { const raw = localStorage.getItem(STORAGE_KEY); if (!raw) return { ...DEFAULTS }; return { ...DEFAULTS, ...JSON.parse(raw) }; }
  catch { return { ...DEFAULTS }; }
}
function saveState(s: SavedState) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* */ } }

interface MaskOrgState { folders: MaskFolder[]; }
function loadMaskOrg(): MaskOrgState {
  try { const r = localStorage.getItem(MASK_ORG_KEY); return r ? { folders: [], ...JSON.parse(r) } : { folders: [] }; }
  catch { return { folders: [] }; }
}
function saveMaskOrg(o: MaskOrgState) { try { localStorage.setItem(MASK_ORG_KEY, JSON.stringify(o)); } catch { /* */ } }

const DEFAULT_MASK: MaskState = {
  tool: 'rectangle', mode: 'supprimer', opacity: 60, size: 20, strokeColor: '#ef4444',
  shapes: [], selectedId: null, folders: [],
};

export default function CalquerLogo() {
  const [activeTab, setActiveTab] = useState<CalquerTab>('logo');
  const [cleanMethod, setCleanMethod] = useState<CleanMethod>(() => loadState().cleanMethod);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [transformedUrl, setTransformedUrl] = useState<string | null>(null);
  const [showTransformed, setShowTransformed] = useState(false);
  const [splitView, setSplitView] = useState(false);
  const [transforming, setTransforming] = useState(false);
  const [zoom, setZoom] = useState(() => loadState().zoom);
  const [hasOverlay, setHasOverlay] = useState(() => loadState().hasOverlay);
  const [overlayOpacity, setOverlayOpacity] = useState(() => loadState().overlayOpacity);
  const [inverted, setInverted] = useState(() => loadState().inverted);
  const [panX, setPanX] = useState(() => loadState().panX);
  const [panY, setPanY] = useState(() => loadState().panY);
  const [bgConfig, setBgConfig] = useState<BgConfig>(() => loadState().bgConfig);
  const [mask, setMask] = useState<MaskState>(() => ({ ...DEFAULT_MASK, folders: loadMaskOrg().folders }));
  const [applyingMask, setApplyingMask] = useState(false);
  const [moveMode, setMoveMode] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<{ getImageRect: () => { x: number; y: number; w: number; h: number } | null }>(null);

  useEffect(() => { saveState({ zoom, hasOverlay, overlayOpacity, inverted, panX, panY, bgConfig, cleanMethod }); },
    [zoom, hasOverlay, overlayOpacity, inverted, panX, panY, bgConfig, cleanMethod]);
  useEffect(() => { saveMaskOrg({ folders: mask.folders }); }, [mask.folders]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!mask.selectedId) return;
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      e.preventDefault();
      setMask(m => ({ ...m, shapes: m.shapes.filter(s => s.id !== m.selectedId), selectedId: null }));
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mask.selectedId]);

  const handleMethodChange = useCallback((method: CleanMethod) => {
    setCleanMethod(method);
    if (method === 'rapide') setActiveTab('logo');
    if (method === 'manuel') setActiveTab('masque');
  }, []);
  const handleUpload = useCallback(() => fileRef.current?.click(), []);
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    if (transformedUrl) URL.revokeObjectURL(transformedUrl);
    setTransformedUrl(null); setShowTransformed(false); setSplitView(false);
    setMask(m => ({ ...DEFAULT_MASK, folders: m.folders }));
    setImageUrl(URL.createObjectURL(file)); e.target.value = '';
  }, [imageUrl, transformedUrl]);

  const handleTransform = useCallback(async () => {
    if (!imageUrl || transforming) return; setTransforming(true);
    try { const url = await removeWhiteBackground(imageUrl); if (transformedUrl) URL.revokeObjectURL(transformedUrl); setTransformedUrl(url); setShowTransformed(true); } catch { /* */ }
    setTransforming(false);
  }, [imageUrl, transforming, transformedUrl]);

  const handleToggleView = useCallback(() => setShowTransformed(v => !v), []);
  const handleToggleSplitView = useCallback(() => setSplitView(v => !v), []);
  const handleResetTransform = useCallback(() => { if (transformedUrl) URL.revokeObjectURL(transformedUrl); setTransformedUrl(null); setShowTransformed(false); setSplitView(false); }, [transformedUrl]);
  const handleDownloadPng = useCallback(() => { if (!transformedUrl) return; const a = document.createElement('a'); a.href = transformedUrl; a.download = 'logo-transparent.png'; a.click(); }, [transformedUrl]);
  const handleZoomIn = useCallback(() => setZoom(z => Math.min(4, +(z + 0.25).toFixed(2))), []);
  const handleZoomOut = useCallback(() => setZoom(z => Math.max(0.25, +(z - 0.25).toFixed(2))), []);
  const handleZoomReset = useCallback(() => { setZoom(1); setPanX(0); setPanY(0); }, []);
  const handleAddPage = useCallback(() => setHasOverlay(true), []);
  const handleSwap = useCallback(() => setInverted(v => !v), []);
  const handlePanChange = useCallback((x: number, y: number) => { setPanX(x); setPanY(y); }, []);

  const handleMaskToolChange = useCallback((t: MaskTool) => setMask(m => ({ ...m, tool: t })), []);
  const handleMaskModeChange = useCallback((mode: MaskMode) => setMask(m => ({
    ...m, mode, strokeColor: mode === 'garder' ? '#22c55e' : '#ef4444',
  })), []);
  const handleMaskSizeChange = useCallback((v: number) => setMask(m => {
    if (m.selectedId) {
      return { ...m, shapes: m.shapes.map(s => s.id === m.selectedId ? { ...s, size: v } : s), size: v };
    }
    return { ...m, size: v };
  }), []);
  const handleMaskAddShape = useCallback((s: MaskShape) => setMask(m => ({ ...m, shapes: [...m.shapes, s] })), []);
  const handleMaskSelectShape = useCallback((id: string | null) => { setMask(m => ({ ...m, selectedId: id })); if (!id) setMoveMode(false); }, []);
  const handleMaskDeleteSelected = useCallback(() => { setMask(m => ({ ...m, shapes: m.shapes.filter(s => s.id !== m.selectedId), selectedId: null })); setMoveMode(false); }, []);
  const handleMoveModeToggle = useCallback(() => setMoveMode(v => !v), []);
  const handleMaskDeleteShape = useCallback((id: string) => { setMask(m => ({ ...m, shapes: m.shapes.filter(s => s.id !== id), selectedId: m.selectedId === id ? null : m.selectedId })); }, []);
  const handleMaskMoveShape = useCallback((id: string, x: number, y: number) => { setMask(m => ({ ...m, shapes: m.shapes.map(s => s.id === id ? { ...s, x, y } : s) })); }, []);
  const handleMaskReset = useCallback(() => setMask(m => ({ ...m, shapes: [], selectedId: null })), []);

  const handleRenameShape = useCallback((id: string, name: string) => { setMask(m => ({ ...m, shapes: m.shapes.map(s => s.id === id ? { ...s, name } : s) })); }, []);
  const handleShapeColorChange = useCallback((id: string, color: string) => { setMask(m => ({ ...m, shapes: m.shapes.map(s => s.id === id ? { ...s, color } : s), strokeColor: color })); }, []);
  const handleCreateFolder = useCallback(() => {
    const id = `folder_${Date.now()}`; const idx = mask.folders.length + 1;
    setMask(m => ({ ...m, folders: [...m.folders, { id, name: `Dossier ${idx}`, expanded: true }] }));
  }, [mask.folders.length]);
  const handleRenameFolder = useCallback((id: string, name: string) => { setMask(m => ({ ...m, folders: m.folders.map(f => f.id === id ? { ...f, name } : f) })); }, []);
  const handleToggleFolder = useCallback((id: string) => { setMask(m => ({ ...m, folders: m.folders.map(f => f.id === id ? { ...f, expanded: !f.expanded } : f) })); }, []);
  const handleDeleteFolder = useCallback((id: string) => { setMask(m => { if (m.shapes.some(s => s.folderId === id)) return m; return { ...m, folders: m.folders.filter(f => f.id !== id) }; }); }, []);
  const handleMoveToFolder = useCallback((shapeId: string, folderId: string | undefined) => { setMask(m => ({ ...m, shapes: m.shapes.map(s => s.id === shapeId ? { ...s, folderId } : s) })); }, []);
  const handleReorderShape = useCallback((shapeId: string, targetShapeId: string | null, position: 'above' | 'below', targetFolderId: string | undefined) => {
    setMask(m => {
      const idx = m.shapes.findIndex(s => s.id === shapeId);
      if (idx === -1) return m;
      const shape = { ...m.shapes[idx], folderId: targetFolderId };
      const without = m.shapes.filter(s => s.id !== shapeId);
      if (!targetShapeId) { return { ...m, shapes: [...without, shape] }; }
      const targetIdx = without.findIndex(s => s.id === targetShapeId);
      if (targetIdx === -1) return { ...m, shapes: [...without, shape] };
      const insertAt = position === 'below' ? targetIdx + 1 : targetIdx;
      const result = [...without]; result.splice(insertAt, 0, shape);
      return { ...m, shapes: result };
    });
  }, []);

  const handleMaskApply = useCallback(async () => {
    if (!imageUrl || mask.shapes.length === 0 || applyingMask) return;
    const imgRect = canvasRef.current?.getImageRect(); if (!imgRect) return;
    setApplyingMask(true);
    try {
      const containerEl = document.querySelector('[data-calquer-canvas]');
      const cRect = containerEl ? { width: containerEl.clientWidth, height: containerEl.clientHeight } : { width: 800, height: 600 };
      const url = await applyMaskToImage(imageUrl, mask.shapes, cRect, imgRect);
      if (transformedUrl) URL.revokeObjectURL(transformedUrl);
      setTransformedUrl(url); setShowTransformed(true);
      setMask(m => ({ ...m, shapes: [], selectedId: null }));
    } catch { /* */ }
    setApplyingMask(false);
  }, [imageUrl, mask.shapes, applyingMask, transformedUrl]);

  const displayUrl = (showTransformed && transformedUrl) ? transformedUrl : imageUrl;
  const showMaskOverlay = cleanMethod === 'manuel' && activeTab === 'masque' && !!imageUrl && !showTransformed;
  const handleTabChange = useCallback((tab: CalquerTab) => { if (tab === 'masque' && cleanMethod !== 'manuel') return; setActiveTab(tab); }, [cleanMethod]);

  const renderPanel = () => {
    if (activeTab === 'couleur') return <CalquerLogoColorPanel bgConfig={bgConfig} onBgConfigChange={setBgConfig} hasTransformed={!!transformedUrl} />;
    if (activeTab === 'masque') return (
      <CalquerLogoMaskPanel mask={mask} moveMode={moveMode} onMoveModeToggle={handleMoveModeToggle}
        onToolChange={handleMaskToolChange} onModeChange={handleMaskModeChange}
        onSizeChange={handleMaskSizeChange} onColorChange={handleShapeColorChange}
        onApply={handleMaskApply} onReset={handleMaskReset} onDeleteSelected={handleMaskDeleteSelected} applying={applyingMask} />
    );
    return (
      <CalquerLogoToolbar onUpload={handleUpload} hasImage={!!imageUrl} zoom={zoom}
        onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} onZoomReset={handleZoomReset}
        hasOverlay={hasOverlay} onAddPage={handleAddPage} opacity={overlayOpacity}
        onOpacityChange={setOverlayOpacity} onTransform={handleTransform}
        hasTransformed={!!transformedUrl} showTransformed={showTransformed}
        onToggleView={handleToggleView} onResetTransform={handleResetTransform}
        onDownloadPng={handleDownloadPng} transforming={transforming}
        splitView={splitView} onToggleSplitView={handleToggleSplitView}
        cleanMethod={cleanMethod} onMethodChange={handleMethodChange} />
    );
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <input ref={fileRef} type="file" className="hidden" accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml" onChange={handleFileChange} />
      <CalquerLogoTabBar activeTab={activeTab} onTabChange={handleTabChange} showMask={cleanMethod === 'manuel'} />
      <div className="flex flex-1 min-h-0">
        {renderPanel()}
        <CalquerLogoCanvas ref={canvasRef} imageUrl={displayUrl} zoom={zoom} onZoomChange={setZoom}
          hasOverlay={hasOverlay} overlayOpacity={overlayOpacity} inverted={inverted}
          onSwap={handleSwap} panX={panX} panY={panY} onPanChange={handlePanChange}
          splitView={splitView} originalUrl={imageUrl} transformedUrl={transformedUrl}
          transformedBg={bgConfigToCss(bgConfig)} showTransformed={showTransformed}
          showMaskOverlay={showMaskOverlay} mask={mask} moveMode={moveMode}
          onMaskAddShape={handleMaskAddShape} onMaskSelectShape={handleMaskSelectShape}
          onMaskMoveShape={handleMaskMoveShape} onMaskDeleteSelected={handleMaskDeleteSelected} />
        {showMaskOverlay && (
          <CalquerLogoShapesPanel shapes={mask.shapes} selectedId={mask.selectedId}
            folders={mask.folders}
            onSelectShape={handleMaskSelectShape} onDeleteShape={handleMaskDeleteShape}
            onRenameShape={handleRenameShape}
            onCreateFolder={handleCreateFolder}
            onRenameFolder={handleRenameFolder} onToggleFolder={handleToggleFolder}
            onDeleteFolder={handleDeleteFolder} onMoveToFolder={handleMoveToFolder}
            onReorderShape={handleReorderShape} />
        )}
      </div>
    </div>
  );
}
