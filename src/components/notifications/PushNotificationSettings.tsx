import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Bell, BellOff, BellRing, Smartphone, CheckCircle2, AlertTriangle, X, Loader2, Send } from 'lucide-react';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import type { ThemeTokens } from '../../lib/themeTokensTypes';

interface Props {
  open: boolean;
  onClose: () => void;
  userId: string | null;
  role: string;
  companyId: string | null;
  tokens: ThemeTokens;
}

export default function PushNotificationSettings({ open, onClose, userId, role, companyId, tokens: t }: Props) {
  const push = usePushNotifications(userId, role, companyId);
  const [testSent, setTestSent] = useState(false);

  if (!open) return null;

  async function handleSubscribe() {
    await push.subscribe();
  }

  async function handleUnsubscribe() {
    await push.unsubscribe();
    setTestSent(false);
  }

  async function handleTest() {
    const ok = await push.sendTest();
    if (ok) {
      setTestSent(true);
      setTimeout(() => setTestSent(false), 3000);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-md rounded-2xl flex flex-col"
        style={{
          background: t.card.bg,
          border: `1px solid ${t.card.border}`,
          boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
          maxHeight: 'calc(100dvh - 32px)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex-shrink-0 flex items-center justify-between px-4 py-3"
          style={{ borderBottom: `1px solid ${t.card.border}` }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}
            >
              <Bell className="w-4.5 h-4.5 text-white" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold truncate" style={{ color: t.text.primary }}>
                Notifications telephone
              </h3>
              <p className="text-[10px]" style={{ color: t.text.tertiary }}>
                Recevez des alertes en temps reel
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors hover:opacity-70 flex-shrink-0"
            style={{ color: t.text.tertiary }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body - scrollable */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1 min-h-0">
          {push.vapidMissing && (
            <div className="rounded-xl p-4" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
              <div className="flex items-start gap-3">
                <Bell className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: '#f59e0b' }} />
                <div>
                  <p className="text-xs font-semibold" style={{ color: t.text.primary }}>Configuration en cours</p>
                  <p className="text-[11px] mt-1 leading-relaxed" style={{ color: t.text.secondary }}>
                    Les notifications telephone ne sont pas encore configurees. Contactez l'administrateur.
                  </p>
                </div>
              </div>
            </div>
          )}

          {!push.vapidMissing && !push.supported && (
            <div className="rounded-xl p-4" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
              <div className="flex items-start gap-3">
                <Smartphone className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: '#f59e0b' }} />
                <div>
                  {push.needsPwa ? (
                    <>
                      <p className="text-xs font-semibold" style={{ color: t.text.primary }}>Installation requise sur iPhone</p>
                      <p className="text-[11px] mt-1 leading-relaxed" style={{ color: t.text.secondary }}>
                        Sur iPhone, ajoutez Talvex a l'ecran d'accueil depuis Safari pour activer les notifications :
                      </p>
                      <ol className="text-[11px] mt-2 space-y-1 list-decimal list-inside" style={{ color: t.text.secondary }}>
                        <li>Appuyez sur le bouton de partage (rectangle avec fleche)</li>
                        <li>Selectionnez "Sur l'ecran d'accueil"</li>
                        <li>Appuyez sur "Ajouter"</li>
                        <li>Ouvrez Talvex depuis l'ecran d'accueil</li>
                      </ol>
                    </>
                  ) : (
                    <>
                      <p className="text-xs font-semibold" style={{ color: t.text.primary }}>Navigateur non compatible</p>
                      <p className="text-[11px] mt-1" style={{ color: t.text.secondary }}>
                        Votre navigateur ne supporte pas les notifications push. Utilisez Chrome, Edge, Firefox ou Safari (iOS 16.4+).
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {!push.vapidMissing && push.supported && push.permission === 'denied' && (
            <div className="rounded-xl p-4" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <div className="flex items-start gap-3">
                <BellOff className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: '#ef4444' }} />
                <div>
                  <p className="text-xs font-semibold" style={{ color: t.text.primary }}>Notifications bloquees</p>
                  <p className="text-[11px] mt-1" style={{ color: t.text.secondary }}>
                    Les notifications ont ete bloquees dans votre navigateur. Pour les reactiver, allez dans les parametres de votre navigateur et autorisez les notifications pour ce site.
                  </p>
                </div>
              </div>
            </div>
          )}

          {!push.vapidMissing && push.supported && push.permission !== 'denied' && !push.subscribed && (
            <div className="rounded-xl p-4" style={{ background: t.surface.secondary, border: `1px solid ${t.surface.border}` }}>
              <div className="flex items-start gap-3">
                <BellRing className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: '#f59e0b' }} />
                <div>
                  <p className="text-xs font-semibold" style={{ color: t.text.primary }}>Activer les notifications</p>
                  <p className="text-[11px] mt-1.5 leading-relaxed" style={{ color: t.text.secondary }}>
                    Recevez une notification sur votre telephone quand :
                  </p>
                  <ul className="text-[11px] mt-1.5 space-y-0.5" style={{ color: t.text.secondary }}>
                    <li>- Un nouveau message arrive</li>
                    <li>- Un rendez-vous est confirme</li>
                    <li>- Une action necessite votre attention</li>
                  </ul>
                </div>
              </div>
              <button
                onClick={handleSubscribe}
                disabled={push.loading}
                className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white transition-all hover:scale-[1.02] disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}
              >
                {push.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
                Activer les notifications telephone
              </button>
            </div>
          )}

          {!push.vapidMissing && push.supported && push.subscribed && (
            <>
              <div className="rounded-xl p-4" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ color: '#22c55e' }} />
                  <div>
                    <p className="text-xs font-semibold" style={{ color: t.text.primary }}>Notifications activees</p>
                    <p className="text-[11px] mt-0.5" style={{ color: t.text.secondary }}>
                      Cet appareil recevra les notifications Talvex.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleTest}
                  disabled={push.loading}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all hover:scale-[1.02] disabled:opacity-50"
                  style={{
                    background: testSent ? 'rgba(34,197,94,0.1)' : t.surface.secondary,
                    border: `1px solid ${testSent ? 'rgba(34,197,94,0.3)' : t.surface.border}`,
                    color: testSent ? '#22c55e' : t.text.primary,
                  }}
                >
                  {push.loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : testSent ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
                  {testSent ? 'Envoyee !' : 'Notification test'}
                </button>
                <button
                  onClick={handleUnsubscribe}
                  disabled={push.loading}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all hover:scale-[1.02] disabled:opacity-50"
                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', color: '#ef4444' }}
                >
                  <BellOff className="w-3.5 h-3.5" />
                  Desactiver
                </button>
              </div>
            </>
          )}

          {push.error && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#ef4444' }} />
              <p className="text-[11px]" style={{ color: '#ef4444' }}>{push.error}</p>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
