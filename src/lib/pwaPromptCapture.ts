interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let promptCaptured = false;
const listeners: Array<(e: BeforeInstallPromptEvent | null) => void> = [];

function notifyListeners(e: BeforeInstallPromptEvent | null) {
  listeners.forEach(fn => fn(e));
}

window.addEventListener('beforeinstallprompt', (e: Event) => {
  e.preventDefault();
  deferredPrompt = e as BeforeInstallPromptEvent;
  promptCaptured = true;
  notifyListeners(deferredPrompt);
});

window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  notifyListeners(null);
});

export function getPwaPrompt(): BeforeInstallPromptEvent | null {
  return deferredPrompt;
}

export function wasPwaPromptCaptured(): boolean {
  return promptCaptured;
}

export function clearPwaPrompt() {
  deferredPrompt = null;
}

export function subscribePwaPrompt(fn: (e: BeforeInstallPromptEvent | null) => void): () => void {
  listeners.push(fn);
  return () => {
    const idx = listeners.indexOf(fn);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}
