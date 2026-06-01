import { useState, useEffect, useRef, useCallback } from 'react';
import { RotateCcw, Wifi, BatteryMedium, Signal } from 'lucide-react';
import SimulatedPhoneHomeScreen from './SimulatedPhoneHomeScreen';
import SimulatedPhoneLoginScreen from './SimulatedPhoneLoginScreen';

type PhoneModelId = 'iphone-17-pro-max' | 'samsung-s26-ultra';
type PhoneAppState = 'homeIcon' | 'login' | 'connected';

interface PhoneModel {
  id: PhoneModelId;
  label: string;
  shortLabel: string;
  viewportW: number;
  viewportH: number;
  borderRadius: string;
  notchStyle: 'dynamic-island' | 'punch-hole';
}

const PHONE_MODELS: PhoneModel[] = [
  {
    id: 'iphone-17-pro-max',
    label: 'iPhone 17 Pro Max',
    shortLabel: 'iPhone 17 Pro Max',
    viewportW: 440,
    viewportH: 956,
    borderRadius: '2.8rem',
    notchStyle: 'dynamic-island',
  },
  {
    id: 'samsung-s26-ultra',
    label: 'Samsung Galaxy S26 Ultra',
    shortLabel: 'Samsung S26 Ultra',
    viewportW: 480,
    viewportH: 1040,
    borderRadius: '2.2rem',
    notchStyle: 'punch-hole',
  },
];

const SCALE = 0.42;

export type { PhoneModelId };

interface Props {
  showReloadButton?: boolean;
  appIconUrl?: string | null;
  appName?: string;
  hideModelSelector?: boolean;
  externalModelId?: PhoneModelId;
}

export default function SimulatedPhone({ showReloadButton = true, appIconUrl = null, appName, hideModelSelector, externalModelId }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [internalModelId, setInternalModelId] = useState<PhoneModelId>('iphone-17-pro-max');
  const modelId = externalModelId ?? internalModelId;
  const [phoneState, setPhoneState] = useState<PhoneAppState>('homeIcon');

  const model = PHONE_MODELS.find(m => m.id === modelId)!;
  const frameW = model.viewportW * SCALE + 24;
  const frameH = model.viewportH * SCALE + 24;

  const prevExtModelRef = useRef(externalModelId);
  useEffect(() => {
    if (externalModelId && externalModelId !== prevExtModelRef.current && phoneState === 'connected') {
      setLoaded(false);
      setIframeKey(k => k + 1);
    }
    prevExtModelRef.current = externalModelId;
  }, [externalModelId, phoneState]);

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'talvex-phone-logout') {
        setPhoneState('login');
        setLoaded(false);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleReload = useCallback(() => {
    if (phoneState === 'connected') {
      setLoaded(false);
      setIframeKey(k => k + 1);
    }
  }, [phoneState]);

  const handleModelChange = useCallback((id: PhoneModelId) => {
    setInternalModelId(id);
    if (phoneState === 'connected') {
      setLoaded(false);
      setIframeKey(k => k + 1);
    }
  }, [phoneState]);

  const handleOpenApp = useCallback(() => setPhoneState('login'), []);
  const handleBackToHome = useCallback(() => setPhoneState('homeIcon'), []);
  const handlePhoneLogin = useCallback(() => {
    setPhoneState('connected');
    setLoaded(false);
    setIframeKey(k => k + 1);
  }, []);

  const viewportH = model.viewportH - 48;

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Model selector */}
      {!hideModelSelector && (
        <div className="flex items-center gap-1.5 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          {PHONE_MODELS.map(m => {
            const active = m.id === modelId;
            return (
              <button
                key={m.id}
                onClick={() => handleModelChange(m.id)}
                className="px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200"
                style={{
                  background: active ? 'rgba(14,165,233,0.15)' : 'transparent',
                  color: active ? '#0ea5e9' : 'rgba(255,255,255,0.4)',
                  border: active ? '1px solid rgba(14,165,233,0.25)' : '1px solid transparent',
                }}
              >
                {m.shortLabel}
              </button>
            );
          })}
        </div>
      )}

      {/* Info line */}
      <div className="flex items-center gap-3">
        {showReloadButton && phoneState === 'connected' && (
          <button
            onClick={handleReload}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all hover:scale-105"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.45)',
            }}
          >
            <RotateCcw className="w-2.5 h-2.5" />
            Recharger
          </button>
        )}
        <span className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.2)' }}>
          {model.viewportW} x {model.viewportH}
        </span>
      </div>

      {/* Phone frame */}
      <div className="relative transition-all duration-300">
        <div
          className="absolute -inset-4 opacity-25 transition-all duration-300"
          style={{
            borderRadius: model.borderRadius,
            background: 'radial-gradient(circle, rgba(14,165,233,0.12) 0%, transparent 70%)',
            filter: 'blur(20px)',
          }}
        />
        <div
          className="relative flex flex-col overflow-hidden transition-all duration-300"
          style={{
            width: frameW,
            height: frameH,
            borderRadius: model.borderRadius,
            border: '8px solid rgba(30,41,59,0.95)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.4), 0 0 40px rgba(14,165,233,0.06), inset 0 0 0 2px rgba(255,255,255,0.05)',
            background: '#0f172a',
          }}
        >
          {/* Status bar */}
          <div
            className="flex items-center justify-between px-5 py-1 flex-shrink-0 relative z-10"
            style={{ background: '#0f172a' }}
          >
            <span className="text-[9px] font-semibold text-white/50">9:41</span>
            {model.notchStyle === 'dynamic-island' ? (
              <div
                className="absolute top-1 left-1/2 -translate-x-1/2 h-[14px] rounded-full"
                style={{ width: 56, background: '#000', border: '1px solid rgba(255,255,255,0.06)' }}
              />
            ) : (
              <div
                className="absolute top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full"
                style={{ background: '#000', border: '1px solid rgba(255,255,255,0.06)' }}
              />
            )}
            <div className="flex items-center gap-1.5">
              <Signal className="w-2.5 h-2.5 text-white/40" />
              <Wifi className="w-2.5 h-2.5 text-white/40" />
              <BatteryMedium className="w-3 h-2.5 text-white/40" />
            </div>
          </div>

          {/* Content area */}
          <div className="flex-1 relative overflow-hidden">
            {phoneState === 'homeIcon' && (
              <SimulatedPhoneHomeScreen appIconUrl={appIconUrl} appName={appName} onOpenApp={handleOpenApp} />
            )}
            {phoneState === 'login' && (
              <SimulatedPhoneLoginScreen appIconUrl={appIconUrl} appName={appName} onLogin={handlePhoneLogin} onBack={handleBackToHome} />
            )}
            {phoneState === 'connected' && (
              <>
                {!loaded && (
                  <div className="absolute inset-0 flex items-center justify-center z-10" style={{ background: '#0f172a' }}>
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                      <span className="text-[10px] text-white/40">Chargement...</span>
                    </div>
                  </div>
                )}
                <iframe
                  key={iframeKey}
                  ref={iframeRef}
                  src={`${window.location.origin}?virtualPhone=1`}
                  title={`Apercu mobile Talvex - ${model.label}`}
                  onLoad={() => setLoaded(true)}
                  className="border-0"
                  style={{
                    width: model.viewportW,
                    height: viewportH,
                    transform: `scale(${SCALE})`,
                    transformOrigin: 'top left',
                  }}
                  sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                />
              </>
            )}
          </div>

          {/* Home indicator */}
          <div className="flex justify-center py-1.5 flex-shrink-0" style={{ background: '#0f172a' }}>
            <div
              className="h-1 rounded-full bg-white/15"
              style={{ width: model.notchStyle === 'dynamic-island' ? 96 : 80 }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
