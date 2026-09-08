import { supabase } from '../lib/supabase';

/**
 * Lecture / ecriture d'une petite liste d'ids dans les preferences d'un compte.
 *
 * Support : `user_preferences.sidebar_orders[storageKey]`, sur la LIGNE du
 * proprietaire. Une cle par CONCEPT — l'ordre choisi par le Groupe et le
 * masquage decide par Talvex vivent dans deux cles distinctes et ne se
 * marchent jamais dessus.
 *
 * Aucune table, aucune colonne, aucune migration : le mecanisme existe deja.
 */

export const prefCacheKey = (storageKey: string, owner: string) => `actpref:${storageKey}:${owner}`;

export function readPrefCache(key: string): string[] | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.every(x => typeof x === 'string') ? parsed : null;
  } catch { return null; }
}

export function writePrefCache(key: string, value: string[]) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* noop */ }
}

export async function loadPrefRemote(owner: string, storageKey: string): Promise<string[] | null> {
  const { data, error } = await supabase
    .from('user_preferences')
    .select('sidebar_orders')
    .eq('user_id', owner)
    .maybeSingle();
  if (error || !data) return null;
  const all = data.sidebar_orders as Record<string, unknown> | null;
  const saved = all?.[storageKey];
  return Array.isArray(saved) && saved.every(x => typeof x === 'string') ? (saved as string[]) : null;
}

/** Ecrit CETTE cle en preservant toutes les autres de `sidebar_orders`. */
export async function savePrefRemote(owner: string, storageKey: string, value: string[]) {
  const { data: existing } = await supabase
    .from('user_preferences')
    .select('sidebar_orders')
    .eq('user_id', owner)
    .maybeSingle();
  const current = (existing?.sidebar_orders as Record<string, unknown> | null) ?? {};
  await supabase.from('user_preferences').upsert(
    { user_id: owner, sidebar_orders: { ...current, [storageKey]: value }, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' },
  );
}
