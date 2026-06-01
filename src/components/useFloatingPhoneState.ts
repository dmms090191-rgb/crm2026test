import { useState, useRef, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'talvex_floating_phone';

interface PhonePrefs {
  x: number;
  y: number;
  scale: number;
  modelId: string;
  minimized: boolean;
}

const DEFAULTS: PhonePrefs = {
  x: -1,
  y: -1,
  scale: 100,
  modelId: 'iphone-17-pro-max',
  minimized: false,
};

function loadPrefs(): PhonePrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULTS, ...parsed };
    }
  } catch { /* ignore */ }
  return { ...DEFAULTS };
}

function savePrefs(prefs: PhonePrefs) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs)); } catch { /* ignore */ }
}

export function useFloatingPhoneState() {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: -1, y: -1 });
  const [scale, setScale] = useState(100);
  const [modelId, setModelId] = useState('iphone-17-pro-max');

  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const prefs = loadPrefs();
    setScale(prefs.scale);
    setModelId(prefs.modelId);
    if (prefs.x >= 0 && prefs.y >= 0) {
      setPos({ x: prefs.x, y: prefs.y });
    }
  }, []);

  const persist = useCallback((partial: Partial<PhonePrefs>) => {
    const prefs = loadPrefs();
    const updated = { ...prefs, ...partial };
    savePrefs(updated);
  }, []);

  const openPhone = useCallback(() => {
    setOpen(true);
    setMinimized(false);
    persist({ minimized: false });
  }, [persist]);

  const closePhone = useCallback(() => {
    setOpen(false);
    setMinimized(false);
  }, []);

  const toggleMinimize = useCallback(() => {
    setMinimized(prev => {
      persist({ minimized: !prev });
      return !prev;
    });
  }, [persist]);

  const handleScaleChange = useCallback((newScale: number) => {
    const clamped = Math.max(60, Math.min(150, newScale));
    setScale(clamped);
    persist({ scale: clamped });
  }, [persist]);

  const handleModelChange = useCallback((id: string) => {
    setModelId(id);
    persist({ modelId: id });
  }, [persist]);

  const startDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    const el = (e.currentTarget as HTMLElement).closest('[data-floating-phone]') as HTMLElement;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };

    const onMove = (ev: MouseEvent) => {
      if (!dragging.current) return;
      const nx = Math.max(0, Math.min(window.innerWidth - 60, ev.clientX - dragOffset.current.x));
      const ny = Math.max(0, Math.min(window.innerHeight - 60, ev.clientY - dragOffset.current.y));
      setPos({ x: nx, y: ny });
    };
    const onUp = () => {
      dragging.current = false;
      setPos(p => {
        persist({ x: p.x, y: p.y });
        return p;
      });
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [persist]);

  return {
    open, minimized, pos, scale, modelId,
    openPhone, closePhone, toggleMinimize,
    handleScaleChange, handleModelChange, startDrag,
  };
}
