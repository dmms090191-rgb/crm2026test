import { createContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { getUserTimezone, setUserTimezone, getTzCountryLabel, getTzCountryCode } from '../lib/timezone';

type PanelRole = 'admin' | 'vendor' | 'client' | 'super_admin';

export interface TimezoneContextValue {
  timezone: string;
  tzLabel: string;
  tzCode: string;
  setTimezone: (tz: string) => void;
  userRole: PanelRole;
  userName: string;
}

export const TimezoneContext = createContext<TimezoneContextValue | undefined>(undefined);

interface TimezoneProviderProps {
  children: ReactNode;
  panelRole: PanelRole;
  /**
   * LE COMPTE VISUALISE, quand il n'est pas celui de l'acteur authentifie.
   *
   * `panelRole` dit quel PANNEAU est affiche ; il ne dit PAS a qui appartient la
   * session. En Visu Societe, `panelRole` vaut 'admin' alors que le jeton est celui du
   * Talvex Administrateur. Confondre les deux a produit le defaut corrige ici.
   *
   * Absent (ou egal a l'acteur) = l'acteur agit sur son propre compte.
   */
  effectiveUserId?: string;
}

/**
 * LE FUSEAU HORAIRE, ET LA DISTINCTION QUI MANQUAIT.
 *
 * ---------- LE DEFAUT, MESURE LE 23 OCTOBRE 2026 ----------
 *
 * L'ecriture etait gardee par `if (panelRole === 'admin')`, sans jamais verifier que le
 * porteur du jeton etait bien cet admin. En Visu Societe, changer l'horloge appelait
 * donc `supabase.auth.updateUser({ data: { timezone } })` — une methode qui n'agit QUE
 * sur l'utilisateur connecte. Resultat : le reglage de la Societe n'etait jamais
 * enregistre, et le fuseau du Talvex Administrateur changeait a son insu.
 *
 * La branche `vendor`, juste a cote, faisait deja cette verification. L'asymetrie etait
 * le defaut.
 *
 * ---------- DEUX IDENTITES, NOMMEES SEPAREMENT ----------
 *
 *   `acteurId`    qui porte le jeton, donc qui AGIT. Lu dans la session, jamais ailleurs.
 *   `cibleId`     le compte REGLE : `effectiveUserId` en Visu, l'acteur sinon.
 *
 * `estMonCompte` est vrai quand les deux coincident. C'est la seule condition sous
 * laquelle `auth.updateUser` est employe — et c'est la meme forme que celle deja
 * retenue pour le theme (`isOwnAccount`, ThemeContext.tsx:156).
 *
 * ---------- ET QUAND CE N'EST PAS MON COMPTE ----------
 *
 * Ecrire le `user_metadata` d'autrui demande l'API Admin, donc la cle de service, qui ne
 * doit jamais atteindre le navigateur. L'ecriture passe alors par l'Edge Function
 * `update-admin-for-super-admin`, qui verifie elle-meme le droit de l'appelant.
 */
export function TimezoneProvider({ children, panelRole, effectiveUserId }: TimezoneProviderProps) {
  const [timezone, setTimezoneState] = useState<string>(() => getUserTimezone(panelRole));
  const [acteurId, setActeurId] = useState<string | null>(null);
  const [userName, setUserName] = useState('');

  /**
   * Vrai seulement quand l'acteur agit sur son propre compte.
   *
   * Le compte REGLE, lui, est `effectiveUserId ?? acteurId` : il est recalcule au plus
   * pres de chaque usage, a partir de la session relue, pour qu'un etat perime ne puisse
   * pas desigher la mauvaise cible.
   */
  const estMonCompte = !effectiveUserId || effectiveUserId === acteurId;

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || cancelled) return;
      const user = session.user;
      setActeurId(user.id);

      const meta = user.user_metadata;
      const name = [meta?.first_name, meta?.last_name].filter(Boolean).join(' ') || user.email?.split('@')[0] || '';
      setUserName(name);

      /*
       * La cle locale porte l'identifiant du compte REGLE : sans cela, le reglage de la
       * Societe observee et celui de l'observateur se melangeraient dans le meme
       * localStorage.
       */
      const idPourLaCle = effectiveUserId ?? user.id;
      const specificKey = `crm_user_timezone_${panelRole}_${idPourLaCle}`;
      const hasSpecific = !!localStorage.getItem(specificKey);

      if (hasSpecific) {
        if (!cancelled) setTimezoneState(localStorage.getItem(specificKey)!);
        return;
      }

      let seedTz: string | null = null;

      /*
       * ON NE SEME QUE DEPUIS SON PROPRE COMPTE.
       *
       * `user.user_metadata` est celui de l'ACTEUR. En Visu, le lire reviendrait a
       * afficher le fuseau de l'observateur comme s'il etait celui de la Societe — le
       * pendant, en lecture, du defaut corrige en ecriture. Le contexte n'a pas acces au
       * `user_metadata` de la cible (ImpersonatedAdminInfo ne porte pas de fuseau) : on
       * garde donc le defaut local, ce qui est faux pour personne.
       */
      if (panelRole === 'admin' && estMonCompte) {
        seedTz = meta?.timezone || null;
      } else if (panelRole === 'vendor' && user.app_metadata?.role === 'vendor') {
        const { data: vendor } = await supabase
          .from('vendors')
          .select('timezone')
          .eq('auth_user_id', user.id)
          .maybeSingle();
        seedTz = vendor?.timezone || null;
      }

      if (seedTz) {
        setUserTimezone(seedTz, panelRole, idPourLaCle);
        if (!cancelled) setTimezoneState(seedTz);
      } else {
        const current = getUserTimezone(panelRole);
        setUserTimezone(current, panelRole, idPourLaCle);
      }
    })();

    return () => { cancelled = true; };
  }, [panelRole, effectiveUserId, estMonCompte]);

  const setTimezone = useCallback(async (tz: string) => {
    setTimezoneState(tz);

    const { data: { session } } = await supabase.auth.getSession();
    const acteur = session?.user?.id ?? acteurId;
    /* Le reglage local suit le compte REGLE, jamais l'acteur. */
    const cible = effectiveUserId ?? acteur;

    setUserTimezone(tz, panelRole, cible);

    if (!session) return;

    const monCompte = !effectiveUserId || effectiveUserId === session.user.id;

    if (panelRole === 'admin') {
      if (monCompte) {
        /* Son propre compte : l'API utilisateur suffit, aucun privilege requis. */
        await supabase.auth.updateUser({ data: { timezone: tz } });
      } else if (cible) {
        /*
         * VISU : la cible est quelqu'un d'autre. `auth.updateUser` ecrirait dans le
         * compte de l'acteur — c'est exactement le defaut corrige. On passe donc par le
         * serveur, qui detient la cle de service et verifie le droit de l'appelant.
         */
        await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-admin-for-super-admin`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
              Apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({ admin_id: cible, timezone: tz }),
          },
        ).catch(() => undefined);
      }
    } else if (panelRole === 'vendor' && session.user.app_metadata?.role === 'vendor') {
      await supabase
        .from('vendors')
        .update({ timezone: tz })
        .eq('auth_user_id', session.user.id);
    }
  }, [panelRole, acteurId, effectiveUserId]);

  const tzLabel = getTzCountryLabel(timezone);
  const tzCode = getTzCountryCode(timezone);

  return (
    <TimezoneContext.Provider value={{ timezone, tzLabel, tzCode, setTimezone, userRole: panelRole, userName }}>
      {children}
    </TimezoneContext.Provider>
  );
}
