import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type PwaInstallState =
  | 'prompt-ready'
  | 'installed'
  | 'ios-manual'
  | 'android-manual'
  | 'unsupported';

function isIos(): boolean {
  return /iPhone|iPad|iPod/.test(navigator.userAgent) &&
    !(window as unknown as Record<string, unknown>).MSStream;
}

function isAndroid(): boolean {
  return /Android/i.test(navigator.userAgent);
}

function isStandalone(): boolean {
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  if ((navigator as unknown as Record<string, boolean>).standalone) return true;
  return document.referrer.includes('android-app://');
}

// ---- Global early capture ----
// beforeinstallprompt fires once, very early. If we only listen inside a
// React component that lazy-loads later, we miss it. Capture at module level.
let _deferredPrompt: BeforeInstallPromptEvent | null = null;
let _promptCaptured = false;
const _listeners: Array<(e: BeforeInstallPromptEvent | null) => void> = [];

function _notifyListeners(e: BeforeInstallPromptEvent | null) {
  _listeners.forEach(fn => fn(e));
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    _deferredPrompt = e as BeforeInstallPromptEvent;
    _promptCaptured = true;
    _notifyListeners(_deferredPrompt);
  });

  window.addEventListener('appinstalled', () => {
    _deferredPrompt = null;
    _notifyListeners(null);
  });
}

export default function usePwaInstall() {
  const [state, setState] = useState<PwaInstallState>(() => {
    if (typeof window === 'undefined') return 'unsupported';
    if (isStandalone()) return 'installed';
    if (_promptCaptured && _deferredPrompt) return 'prompt-ready';
    if (isIos()) return 'ios-manual';
    if (isAndroid()) return 'android-manual';
    return 'unsupported';
  });
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (isStandalone()) {
      setState('installed');
      return;
    }

    // If prompt was already captured globally before this component mounted
    if (_deferredPrompt) {
      setState('prompt-ready');
    }

    const handler = (e: BeforeInstallPromptEvent | null) => {
      if (e) setState('prompt-ready');
      else setState('installed');
    };
    _listeners.push(handler);

    return () => {
      const idx = _listeners.indexOf(handler);
      if (idx >= 0) _listeners.splice(idx, 1);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    if (!_deferredPrompt) return 'unavailable';
    setInstalling(true);
    try {
      await _deferredPrompt.prompt();
      const { outcome } = await _deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        _deferredPrompt = null;
        setState('installed');
      }
      return outcome;
    } catch {
      return 'unavailable';
    } finally {
      setInstalling(false);
    }
  }, []);

  return { state, installing, promptInstall, isIos: isIos() };
}
