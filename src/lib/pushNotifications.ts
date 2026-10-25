import { supabase } from './supabase';
import { estApplicationInstallee } from './runtime';

export type PushPermissionState = 'granted' | 'denied' | 'default' | 'unsupported';

export function getPushSupport(): { supported: boolean; needsPwa: boolean } {
  /*
   * L'application installee n'enregistre aucun service worker (voir src/main.tsx), et les
   * notifications web en exigent un. Il faut le declarer ICI, et pas seulement refuser
   * l'enregistrement plus bas : sans worker, navigator.serviceWorker.ready est une
   * promesse qui NE SE RESOUT JAMAIS. Les DEUX fonctions qui l'attendent — unsubscribeFromPush
   * et getActiveSubscription, cette derniere etant appelee par usePushNotifications des le
   * montage — resteraient donc pendantes, et l'etat d'abonnement ne serait jamais connu.
   * subscribeToPush, lui, se protege deja : registerServiceWorker rend null et il repond
   * sw_unavailable. Mieux vaut annoncer franchement que ce n'est pas disponible.
   *
   * Consequence a assumer : pas de notifications poussees dans l'application Windows tant
   * qu'elles ne passent pas par les notifications natives de Tauri. Le web et la PWA, eux,
   * ne changent pas d'un octet.
   */
  if (estApplicationInstallee()) return { supported: false, needsPwa: false };

  const hasSW = 'serviceWorker' in navigator;
  const hasPush = 'PushManager' in window;
  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
  /* En mobile natif, inviter a « installer la PWA » serait absurde : l'application EST
     installee. Les notifications y passeront par le canal natif Capacitor, pas par le web. */
  const isStandalone = estApplicationInstallee()
    || window.matchMedia('(display-mode: standalone)').matches
    || (navigator as unknown as { standalone?: boolean }).standalone === true;

  if (!hasSW || !hasPush) {
    return { supported: false, needsPwa: isIos && !isStandalone };
  }
  return { supported: true, needsPwa: false };
}

export function getPermissionState(): PushPermissionState {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission as PushPermissionState;
}

function getDeviceType(): string {
  const ua = navigator.userAgent;
  if (/Tablet|iPad/i.test(ua)) return 'tablet';
  if (/Mobile|Android|iPhone/i.test(ua)) return 'mobile';
  return 'desktop';
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  // Ceinture et bretelles : getPushSupport ci-dessus empeche deja l'appel par le hook,
  // mais cette fonction est exportee et un futur appelant ne passerait pas forcement par
  // lui. C'est le dernier point ou l'enregistrement peut encore etre arrete.
  if (estApplicationInstallee()) return null;
  if (!('serviceWorker' in navigator)) return null;
  try {
    return await navigator.serviceWorker.register('/service-worker.js');
  } catch {
    return null;
  }
}

export async function subscribeToPush(
  vapidPublicKey: string,
  userId: string,
  role: string,
  companyId: string | null,
): Promise<{ success: boolean; error?: string }> {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { success: false, error: 'permission_denied' };
    }

    const registration = await registerServiceWorker();
    if (!registration) {
      return { success: false, error: 'sw_unavailable' };
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });

    const json = subscription.toJSON();
    const endpoint = json.endpoint!;
    const p256dh = json.keys!.p256dh!;
    const auth = json.keys!.auth!;

    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        user_id: userId,
        role,
        company_id: companyId || null,
        endpoint,
        p256dh,
        auth,
        user_agent: navigator.userAgent,
        device_type: getDeviceType(),
        enabled: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'endpoint' },
    );

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'unknown' };
  }
}

export async function unsubscribeFromPush(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (subscription) {
    const endpoint = subscription.endpoint;
    await subscription.unsubscribe();
    await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
  }
}

export async function sendTestNotification(): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { success: false, error: 'not_authenticated' };

    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-push-notification`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          Apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ type: 'test' }),
      },
    );

    if (!res.ok) {
      const body = await res.text();
      return { success: false, error: body };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'unknown' };
  }
}

export async function getActiveSubscription(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const registration = await navigator.serviceWorker.ready;
    return await registration.pushManager.getSubscription();
  } catch {
    return null;
  }
}
