import { useState, useEffect, useCallback } from 'react';
import { getPwaPrompt, wasPwaPromptCaptured, clearPwaPrompt, subscribePwaPrompt } from '../lib/pwaPromptCapture';

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

export default function usePwaInstall() {
  const [state, setState] = useState<PwaInstallState>(() => {
    if (isStandalone()) return 'installed';
    if (wasPwaPromptCaptured() && getPwaPrompt()) return 'prompt-ready';
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

    if (getPwaPrompt()) {
      setState('prompt-ready');
    }

    return subscribePwaPrompt((e) => {
      if (e) setState('prompt-ready');
      else setState('installed');
    });
  }, []);

  const promptInstall = useCallback(async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    const prompt = getPwaPrompt();
    if (!prompt) return 'unavailable';
    setInstalling(true);
    try {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === 'accepted') {
        clearPwaPrompt();
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
