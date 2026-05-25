import { useState, useEffect, useCallback } from 'react';
import {
  getPushSupport,
  getPermissionState,
  subscribeToPush,
  unsubscribeFromPush,
  sendTestNotification,
  getActiveSubscription,
  registerServiceWorker,
  type PushPermissionState,
} from '../lib/pushNotifications';

interface UsePushNotificationsResult {
  supported: boolean;
  needsPwa: boolean;
  vapidMissing: boolean;
  permission: PushPermissionState;
  subscribed: boolean;
  loading: boolean;
  error: string | null;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
  sendTest: () => Promise<boolean>;
}

export function usePushNotifications(
  userId: string | null,
  role: string,
  companyId: string | null,
): UsePushNotificationsResult {
  const [supported, setSupported] = useState(true);
  const [needsPwa, setNeedsPwa] = useState(false);
  const [permission, setPermission] = useState<PushPermissionState>('default');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';
  const vapidMissing = !vapidKey;

  useEffect(() => {
    const { supported: s, needsPwa: np } = getPushSupport();
    setSupported(s);
    setNeedsPwa(np);
    setPermission(getPermissionState());

    if (s) {
      registerServiceWorker();
      getActiveSubscription().then(sub => setSubscribed(!!sub));
    }
  }, []);

  const subscribe = useCallback(async () => {
    if (!userId) return;
    if (vapidMissing) return;
    setLoading(true);
    setError(null);
    const result = await subscribeToPush(vapidKey, userId, role, companyId);
    if (result.success) {
      setSubscribed(true);
      setPermission('granted');
    } else {
      setError(result.error || 'Echec de l\'activation');
      setPermission(getPermissionState());
    }
    setLoading(false);
  }, [userId, role, companyId, vapidKey, vapidMissing]);

  const unsubscribe = useCallback(async () => {
    setLoading(true);
    setError(null);
    await unsubscribeFromPush();
    setSubscribed(false);
    setLoading(false);
  }, []);

  const sendTest = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    setError(null);
    const result = await sendTestNotification();
    if (!result.success) {
      setError(result.error || 'Echec du test');
    }
    setLoading(false);
    return result.success;
  }, []);

  return { supported, needsPwa, vapidMissing, permission, subscribed, loading, error, subscribe, unsubscribe, sendTest };
}
