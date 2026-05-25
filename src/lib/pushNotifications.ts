import { supabase } from './supabase';

export type PushPermissionState = 'granted' | 'denied' | 'default' | 'unsupported';

export function getPushSupport(): { supported: boolean; needsPwa: boolean } {
  const hasSW = 'serviceWorker' in navigator;
  const hasPush = 'PushManager' in window;
  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
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
