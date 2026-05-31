import { useState, useEffect, useCallback, useRef } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type PwaInstallState =
  | 'prompt-ready'
  | 'installed'
  | 'ios-manual'
  | 'unsupported';

function isIos(): boolean {
  return /iPhone|iPad|iPod/.test(navigator.userAgent) && !(window as unknown as Record<string, unknown>).MSStream;
}

function isStandalone(): boolean {
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  if ((navigator as unknown as Record<string, boolean>).standalone) return true;
  return false;
}

export default function usePwaInstall() {
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);
  const [state, setState] = useState<PwaInstallState>(() => {
    if (isStandalone()) return 'installed';
    if (isIos()) return 'ios-manual';
    return 'unsupported';
  });
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (isStandalone()) {
      setState('installed');
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
      setState('prompt-ready');
    };

    window.addEventListener('beforeinstallprompt', handler);

    const installedHandler = () => {
      setState('installed');
      deferredPrompt.current = null;
    };
    window.addEventListener('appinstalled', installedHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    if (!deferredPrompt.current) return 'unavailable';
    setInstalling(true);
    try {
      await deferredPrompt.current.prompt();
      const { outcome } = await deferredPrompt.current.userChoice;
      if (outcome === 'accepted') {
        setState('installed');
        deferredPrompt.current = null;
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
