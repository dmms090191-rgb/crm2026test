import type { EditorTab, EditorZone } from './editorModeTypes';

interface TabSwitchHandlers {
  activeZone: EditorZone | null;
  setActiveZoneRaw: (z: EditorZone | null) => void;
  setTextTargetRaw: (t: null) => void;
  setTypoTargetRaw: (t: null) => void;
  setActiveButtonTargetRaw: (t: null) => void;
  setActiveCardTargetRaw: (t: null) => void;
}

export function applyTabSwitch(tab: EditorTab, h: TabSwitchHandlers): void {
  if (tab === 'fonds') {
    h.setTextTargetRaw(null);
    h.setTypoTargetRaw(null);
    h.setActiveButtonTargetRaw(null);
    h.setActiveCardTargetRaw(null);
    if (!h.activeZone) h.setActiveZoneRaw('zone1');
  } else if (tab === 'image') {
    h.setTextTargetRaw(null);
    h.setTypoTargetRaw(null);
    h.setActiveButtonTargetRaw(null);
    h.setActiveCardTargetRaw(null);
    h.setActiveZoneRaw(null);
  } else {
    h.setActiveButtonTargetRaw(null);
    h.setActiveCardTargetRaw(null);
    h.setActiveZoneRaw(null);
  }
}
