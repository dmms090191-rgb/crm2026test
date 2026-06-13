import type { CSSProperties } from 'react';
import type { VCConfig, VCElementType } from './visualCustomizeTypes';
import type { VCModalKind } from './useVCPresets';

export interface VCRegisteredElement {
  id: string;
  type: VCElementType;
  label: string;
  ref: HTMLElement | null;
}

export interface VCActiveSelection {
  id: string;
  type: VCElementType;
  label: string;
}

export interface QuickApplyState {
  active: boolean;
  presetConfig: VCConfig | null;
  presetModalKind: VCModalKind | null;
  presetName: string;
}

export interface VCContextValue {
  enabled: boolean;
  setEnabled: (v: boolean) => void;
  markersHidden: boolean;
  setMarkersHidden: (v: boolean) => void;
  configs: Record<string, VCConfig>;
  draft: Record<string, VCConfig>;
  activeSelection: VCActiveSelection | null;
  setActiveSelection: (s: VCActiveSelection | null) => void;
  updateDraft: (id: string, cfg: VCConfig) => void;
  commitDraft: (id: string, type: VCElementType) => Promise<void>;
  quickCommit: (id: string, type: VCElementType, cfg: VCConfig) => Promise<void>;
  resetDraft: (id: string) => void;
  resetElement: (id: string) => Promise<void>;
  registerElement: (id: string, type: VCElementType, label: string, el: HTMLElement | null) => void;
  unregisterElement: (id: string) => void;
  registered: VCRegisteredElement[];
  styleFor: (id: string, type: VCElementType) => CSSProperties | undefined;
  previewBarVisible: boolean;
  setPreviewBarVisible: (v: boolean) => void;
  getConfigsSnapshot: () => Record<string, { type: VCElementType; config: VCConfig }>;
  applyBulkConfigs: (entries: Record<string, { type: VCElementType; config: VCConfig }>) => Promise<void>;
  quickApply: QuickApplyState;
  setQuickApply: (v: QuickApplyState) => void;
  commitAllDrafts: () => Promise<void>;
  clearAllDrafts: () => void;
  hasPendingDrafts: boolean;
  replaceAllConfigs: (entries: Record<string, { type: VCElementType; config: VCConfig }>) => Promise<void>;
  clearAllConfigs: () => Promise<void>;
  quickApplyToast: string | null;
  setQuickApplyToast: (v: string | null) => void;
}

export interface VCProviderProps {
  children: React.ReactNode;
  scope?: string;
}
