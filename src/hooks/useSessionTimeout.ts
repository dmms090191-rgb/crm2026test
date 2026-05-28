import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const DEFAULT_TIMEOUT_MINUTES = 90;
const WARNING_BEFORE_MS = 5 * 60 * 1000;
const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove', 'click'] as const;
const THROTTLE_MS = 30_000;

interface SessionTimeoutState {
  timeoutMinutes: number;
  showWarning: boolean;
  remainingSeconds: number;
  resetActivity: () => void;
  dismissWarning: () => void;
  updateTimeout: (minutes: number) => void;
}

export async function fetchTimeoutMinutes(companyId: string | null): Promise<number> {
  if (companyId) {
    const { data } = await supabase
      .from('session_timeout_settings')
      .select('timeout_minutes')
      .eq('company_id', companyId)
      .maybeSingle();
    if (data?.timeout_minutes) return data.timeout_minutes;
  }

  const { data: global } = await supabase
    .from('session_timeout_settings')
    .select('timeout_minutes')
    .is('company_id', null)
    .maybeSingle();

  return global?.timeout_minutes ?? DEFAULT_TIMEOUT_MINUTES;
}

export async function upsertTimeout(companyId: string | null, minutes: number): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  let query = supabase.from('session_timeout_settings').select('id');
  query = companyId ? query.eq('company_id', companyId) : query.is('company_id', null);
  const { data: existing } = await query.maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('session_timeout_settings')
      .update({ timeout_minutes: minutes, updated_at: new Date().toISOString(), updated_by: user.id })
      .eq('id', existing.id);
    return !error;
  }

  const { error } = await supabase
    .from('session_timeout_settings')
    .insert({ company_id: companyId, timeout_minutes: minutes, updated_by: user.id });
  return !error;
}

export function useSessionTimeout(
  companyId: string | null,
  isLoggedIn: boolean,
  onLogout: () => void,
): SessionTimeoutState {
  const [timeoutMinutes, setTimeoutMinutes] = useState(DEFAULT_TIMEOUT_MINUTES);
  const [showWarning, setShowWarning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  const lastActivityRef = useRef(Date.now());
  const warningTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const countdownRef = useRef<ReturnType<typeof setInterval>>();
  const throttleRef = useRef(0);

  useEffect(() => {
    if (!isLoggedIn) return;
    fetchTimeoutMinutes(companyId).then(setTimeoutMinutes);
  }, [companyId, isLoggedIn]);

  const clearTimers = useCallback(() => {
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
  }, []);

  const startTimers = useCallback(() => {
    clearTimers();
    const totalMs = timeoutMinutes * 60 * 1000;
    const warningAt = totalMs - WARNING_BEFORE_MS;

    if (warningAt > 0) {
      warningTimerRef.current = setTimeout(() => {
        setShowWarning(true);
        setRemainingSeconds(Math.round(WARNING_BEFORE_MS / 1000));
        countdownRef.current = setInterval(() => {
          setRemainingSeconds(prev => {
            if (prev <= 1) {
              clearInterval(countdownRef.current);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }, warningAt);
    }

    logoutTimerRef.current = setTimeout(() => {
      clearTimers();
      setShowWarning(false);
      onLogout();
    }, totalMs);
  }, [timeoutMinutes, clearTimers, onLogout]);

  const resetActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    setShowWarning(false);
    startTimers();
  }, [startTimers]);

  const dismissWarning = useCallback(() => {
    resetActivity();
  }, [resetActivity]);

  const updateTimeout = useCallback((minutes: number) => {
    setTimeoutMinutes(minutes);
  }, []);

  useEffect(() => {
    if (!isLoggedIn) {
      clearTimers();
      setShowWarning(false);
      return;
    }

    startTimers();

    const handleActivity = () => {
      const now = Date.now();
      if (now - throttleRef.current < THROTTLE_MS) return;
      throttleRef.current = now;
      lastActivityRef.current = now;
      if (!showWarning) startTimers();
    };

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, handleActivity, { passive: true });
    }

    return () => {
      clearTimers();
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, handleActivity);
      }
    };
  }, [isLoggedIn, startTimers, clearTimers, showWarning]);

  return {
    timeoutMinutes,
    showWarning,
    remainingSeconds,
    resetActivity,
    dismissWarning,
    updateTimeout,
  };
}
