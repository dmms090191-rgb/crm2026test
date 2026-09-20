import { useSyncExternalStore } from 'react';
import { supabase } from '../lib/supabase';
import { playTalixySound, type TalixySoundKind } from './talixySound';
import {
  TALIXY_SOUND_DEFAULT, clampVolume, parseSoundPrefs, serializeSoundPrefs, soundGain, soundPrefsKey,
  type TalixySoundPrefs,
} from './talixySoundPrefs';

/*
 * TALIXY — son d'interface : etat partage par toute l'application.
 * Le reglage est celui du compte Auth reellement connecte (en Visu, le JWT reste celui de l'acteur reel :
 * c'est donc son reglage qui s'applique, jamais celui de l'entite visualisee). La Visu ne coupe pas le son.
 */
interface SoundState { userId: string | null; prefs: TalixySoundPrefs }

let state: SoundState = { userId: null, prefs: { ...TALIXY_SOUND_DEFAULT } };
const listeners = new Set<() => void>();
let started = false;

function emit(next: SoundState) {
  state = next;
  listeners.forEach(l => l());
}

function readPrefs(userId: string | null): TalixySoundPrefs {
  if (!userId) return { ...TALIXY_SOUND_DEFAULT };
  try { return parseSoundPrefs(localStorage.getItem(soundPrefsKey(userId))); } catch { return { ...TALIXY_SOUND_DEFAULT }; }
}

function setUser(userId: string | null) {
  if (userId === state.userId) return;
  emit({ userId, prefs: readPrefs(userId) });
}

function start() {
  if (started) return;
  started = true;
  supabase.auth.getSession().then(({ data }) => setUser(data.session?.user.id ?? null), () => {});
  supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user.id ?? null));
}

function subscribe(listener: () => void) {
  start();
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function update(patch: Partial<TalixySoundPrefs>) {
  const prefs: TalixySoundPrefs = {
    volume: clampVolume(patch.volume ?? state.prefs.volume),
    muted: patch.muted ?? state.prefs.muted,
  };
  if (state.userId) {
    try { localStorage.setItem(soundPrefsKey(state.userId), serializeSoundPrefs(prefs)); } catch { /* stockage indisponible */ }
  }
  emit({ ...state, prefs });
}

const getSnapshot = () => state;

export function useTalixySound() {
  const s = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return {
    prefs: s.prefs,
    setVolume: (volume: number) => update({ volume }),
    setMuted: (muted: boolean) => update({ muted }),
    /** Joue le son avec le reglage courant de la personne connectee. */
    play: (kind: TalixySoundKind) => playTalixySound(kind, soundGain(state.prefs)),
  };
}
