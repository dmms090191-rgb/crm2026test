import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import type { AdminUser } from './views/SAAdmins';

export function useAdminsCache() {
  const [cachedAdmins, setCachedAdmins] = useState<AdminUser[]>([]);
  /*
   * VRAI DES LE DEPART, et ce n'est pas un detail d'affichage.
   *
   * La liste part vide, et le chargement est lance par l'effet ci-dessous — donc APRES
   * le premier rendu. Pendant ce rendu, le couple etait « zero societe, et je ne charge
   * rien » : les ecrans qui lisent ce drapeau pour choisir entre un squelette et un
   * chiffre affichaient donc « 0 Societes » avant meme que la question soit posee a la
   * base. Releve du 13/11/2026 au harnais : compteur 0, en chargement faux, premier
   * rendu a 0 ms, la reponse n'arrivant qu'a 411 ms.
   *
   * Un zero ne doit s'afficher que si la base a REELLEMENT repondu zero. Avant la
   * premiere reponse, l'etat honnete n'est pas « zero », c'est « je ne sais pas encore ».
   *
   * Le drapeau retombe a faux dans le `finally` du chargement, succes comme echec : il
   * ne peut donc pas rester bloque a vrai si la requete part en erreur.
   */
  const [adminsRefreshing, setAdminsRefreshing] = useState(true);
  const [adminsError, setAdminsError] = useState('');
  const adminsLoadedRef = useRef(false);

  const fetchAdminsCache = useCallback(async () => {
    setAdminsRefreshing(true);
    setAdminsError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setAdminsError('Non authentifie'); setAdminsRefreshing(false); return; }
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-admins`,
        { headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json', 'Apikey': import.meta.env.VITE_SUPABASE_ANON_KEY } }
      );
      const json = await res.json();
      if (!res.ok) { setAdminsError(json.error || 'Erreur inconnue'); setAdminsRefreshing(false); return; }
      setCachedAdmins(json.admins || []);
      adminsLoadedRef.current = true;
    } catch (e) { setAdminsError(String(e)); }
    finally { setAdminsRefreshing(false); }
  }, []);

  useEffect(() => { fetchAdminsCache(); }, [fetchAdminsCache]);

  return { cachedAdmins, adminsRefreshing, adminsError, fetchAdminsCache };
}
