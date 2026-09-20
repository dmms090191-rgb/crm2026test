/*
 * TALIXY — reglages du son d'interface (module pur, sans import : testable avec node --test).
 *
 * Decisions de David : son actif par defaut a 35 %, coupure et volume 0-100 %, reglage attache a la personne
 * REELLEMENT connectee (compte Auth), jamais a l'entite visualisee ; la Visu ne coupe pas le son.
 * Stockage : navigateur, une cle par compte Auth (le reglage survit a la deconnexion et a la reconnexion).
 */

export interface TalixySoundPrefs {
  /** Volume 0-100 (%). */
  volume: number;
  muted: boolean;
}

export const TALIXY_SOUND_DEFAULT: Readonly<TalixySoundPrefs> = { volume: 35, muted: false };

/** Gain maximal (volume 100 %) et courbe de perception : le volume entendu suit mieux une puissance qu'une droite. */
export const TALIXY_SOUND_LEVEL = { maxGain: 1.0, curve: 1.15 } as const;

export function soundPrefsKey(authUserId: string): string {
  return `talixy:sound:${authUserId}`;
}

export function clampVolume(v: unknown): number {
  const x = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(x)) return TALIXY_SOUND_DEFAULT.volume;
  return Math.round(Math.max(0, Math.min(100, x)));
}

/** Lecture tolerante : valeur absente ou abimee -> reglage par defaut (jamais d'erreur, jamais de NaN). */
export function parseSoundPrefs(raw: string | null | undefined): TalixySoundPrefs {
  if (!raw) return { ...TALIXY_SOUND_DEFAULT };
  try {
    const o = JSON.parse(raw) as Partial<Record<keyof TalixySoundPrefs, unknown>> | null;
    if (!o || typeof o !== 'object') return { ...TALIXY_SOUND_DEFAULT };
    return {
      volume: o.volume === undefined ? TALIXY_SOUND_DEFAULT.volume : clampVolume(o.volume),
      muted: o.muted === true,
    };
  } catch {
    return { ...TALIXY_SOUND_DEFAULT };
  }
}

export function serializeSoundPrefs(p: TalixySoundPrefs): string {
  return JSON.stringify({ volume: clampVolume(p.volume), muted: p.muted === true });
}

/** Gain a appliquer au son : 0 si coupe ou volume nul. */
export function soundGain(p: TalixySoundPrefs): number {
  if (p.muted) return 0;
  const v = clampVolume(p.volume) / 100;
  return v <= 0 ? 0 : TALIXY_SOUND_LEVEL.maxGain * Math.pow(v, TALIXY_SOUND_LEVEL.curve);
}
