import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';

/**
 * LE company_id DE LA SOCIETE COURANTE — LU SANS ALLER-RETOUR RESEAU.
 *
 * ---------- POURQUOI getSession ET NON getUser ----------
 *
 * Ce contexte est la RACINE du chemin de chargement : tout hook qui lit des donnees de
 * Societe attend son companyId, et ne peut rien demander avant. Ce qu'il coute, tout le
 * reste le paie.
 *
 * En supabase-js v2, `auth.getUser()` INTERROGE LE SERVEUR (GET /auth/v1/user) pour
 * faire valider le jeton. `auth.getSession()` lit la session deja stockee, sans reseau.
 * Mesure depuis une machine filaire : 72 ms de mediane pour /auth/v1/user. Sur un
 * telephone en 4G, c'est plusieurs fois plus — et c'est un aller-retour que TOUTES les
 * requetes du panel attendent, avant meme d'etre emises.
 *
 * ---------- ET LA SECURITE, ALORS ----------
 *
 * Elle ne change pas d'un iota, et il faut dire pourquoi plutot que de l'affirmer.
 *
 * Ce companyId ne sert qu'a DECIDER CE QUE LE CLIENT DEMANDE : des `.eq('company_id', x)`
 * et l'affichage. Il n'autorise rien. L'autorite, c'est la RLS, qui lit le company_id
 * dans le JETON VERIFIE PAR LE SERVEUR a chaque requete, jamais dans celui que le
 * navigateur annonce. Quelqu'un qui trafiquerait sa session locale pour y ecrire le
 * company_id d'une autre Societe n'obtiendrait donc rien : ses requetes partiraient avec
 * ce company_id, et la RLS les refuserait avec le jeton reel. Il ne verrait pas une
 * ligne de plus — il verrait moins, puisqu'il ne demanderait plus les siennes.
 *
 * getUser() ne protegeait pas de ce scenario non plus : il valide le jeton, ce que le
 * serveur refait de toute facon a chaque appel REST.
 *
 * ---------- POURQUOI L'ABONNEMENT ----------
 *
 * getSession() repond une fois. Sans abonnement, une connexion ou un renouvellement
 * survenus APRES ce premier passage laisseraient le contexte sur son ancienne valeur.
 * onAuthStateChange couvre les deux, et vaut aussi quand la session n'etait pas encore
 * hydratee au montage.
 */

interface CompanyIdContextValue {
  companyId: string | null;
}

const CompanyIdContext = createContext<CompanyIdContextValue>({ companyId: null });

interface CompanyIdProviderProps {
  overrideCompanyId?: string | null;
  children: ReactNode;
}

export function CompanyIdProvider({ overrideCompanyId, children }: CompanyIdProviderProps) {
  const [authCompanyId, setAuthCompanyId] = useState<string | null>(null);

  useEffect(() => {
    if (overrideCompanyId) return;
    let vivant = true;

    /* La session deja en memoire : aucune requete ne part. */
    supabase.auth.getSession().then(({ data: { session } }) => {
      const id = session?.user?.app_metadata?.company_id;
      if (vivant && id) setAuthCompanyId(id);
    });

    const { data: abonnement } = supabase.auth.onAuthStateChange((_evenement, session) => {
      if (!vivant) return;
      /* On ne remet PAS a null sur un evenement sans company_id : une deconnexion
         demonte l'arbre de toute facon, et effacer ici ferait clignoter les vues qui
         s'appuient dessus pendant un simple renouvellement de jeton. */
      const id = session?.user?.app_metadata?.company_id;
      if (id) setAuthCompanyId(id);
    });

    return () => { vivant = false; abonnement.subscription.unsubscribe(); };
  }, [overrideCompanyId]);

  const companyId = overrideCompanyId ?? authCompanyId;

  return (
    <CompanyIdContext.Provider value={{ companyId }}>
      {children}
    </CompanyIdContext.Provider>
  );
}

export function useCompanyId(): string | null {
  const { companyId } = useContext(CompanyIdContext);
  return companyId;
}
