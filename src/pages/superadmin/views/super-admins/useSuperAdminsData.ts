import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../../../lib/supabase';
import type { CompanySuperAdmin } from './superAdminTypes';
import {
  lireGroupesConnus, ecrireGroupesConnus, memoriserStatutConnu,
  generationCourante, nouvelleGeneration,
} from '../../../../lib/memoireGroupes';

/*
 * LA LISTE DES GROUPES : la derniere connue tout de suite, le reseau en arriere-plan.
 *
 * Avant le 19/11/2026, ce hook repartait d'une liste vide a chaque montage et la vue montrait un
 * spinner central jusqu'a la reponse de l'Edge Function (jusqu'a 24,5 s mesures en production).
 * Desormais l'etat initial vient de src/lib/memoireGroupes.ts (memoire + sessionStorage) et la
 * lecture reseau ne fait que le REMPLACER quand elle reussit. Une lecture en echec garde la
 * liste connue et remplit seulement `error`.
 *
 * TROIS SORTES DE LECTURES, et c'est la regle qui protege les ecritures :
 *   - 'forcee' (`refresh`, et apres un changement de statut) : une generation nouvelle, une
 *     requete neuve. Elle sert apres une creation, une suppression, un changement de statut,
 *     l'ouverture des Actions et le bouton Actualiser. Une reponse d'une generation plus
 *     ancienne n'ecrit plus rien ;
 *   - 'montage' : elle ne rejoint une lecture deja en vol que si sa requete n'est pas encore
 *     partie (verrou d'auth-js) ou l'est depuis moins de PARTAGE_MAX_MS (StrictMode, passage de
 *     la carte du tableau de bord a la vue).
 *     Plus ancienne, cette lecture a pu partir AVANT une ecriture faite hors de ce hook (une
 *     Visu qui modifie le Groupe) : le montage repart alors comme une lecture forcee ;
 *   - 'suite' : apres une reponse perimee, on reprend la lecture de la generation courante,
 *     en vol ou deja memorisee. Jamais de requete en double : apres une deconnexion
 *     (l'oubli ouvre une generation sans lecture), rien ne repart.
 */

type Resultat =
  | { ok: true; userId: string; list: CompanySuperAdmin[]; statuts: Record<string, string> | null }
  | { ok: false; erreur: string };

type Mode = 'montage' | 'forcee' | 'suite';

const PARTAGE_MAX_MS = 2000;

/* `depart` : l'instant ou la requete part REELLEMENT, apres le getSession qui attend le verrou
   d'auth-js. Tant qu'elle n'est pas partie (null), elle lira forcement l'etat le plus recent :
   la rejoindre est sans risque, et evite une seconde Edge Function au deverrouillage. */
interface LectureEnVol { generation: number; depart: number | null; promesse: Promise<Resultat> }
let lectureEnVol: LectureEnVol | null = null;
/** Generation de la derniere lecture qui a ecrit la memoire. */
let generationEcrite = -1;

async function lireDepuisLeReseau(auDepart: () => void): Promise<Resultat> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { ok: false, erreur: 'Non authentifie' };
    auDepart();

    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-company-super-admins`,
      {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'Apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
      }
    );
    const json = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, erreur: json?.error || 'Erreur de chargement' };
    /* Corps tronque ou illisible malgre un 200 (connexion coupee) : un echec, qui garde la liste
       connue, et non une liste vide qui serait memorisee comme « aucun groupe ». */
    if (!json || !Array.isArray(json.company_super_admins)) return { ok: false, erreur: 'Reponse illisible' };
    const list = json.company_super_admins as CompanySuperAdmin[];

    // Affectations company_id -> nom de statut. La bibliotheque reste sa_statuts.
    // En echec, `null` : les statuts connus restent affiches au lieu d'etre effaces.
    const { data: rows, error } = await supabase.from('sa_group_statuts').select('company_id, statut');
    let statuts: Record<string, string> | null = null;
    if (!error) {
      statuts = {};
      (rows ?? []).forEach((r: { company_id: string; statut: string }) => {
        if (r.company_id) statuts![r.company_id] = r.statut;
      });
    }
    return { ok: true, userId: session.user.id, list, statuts };
  } catch (err) {
    return { ok: false, erreur: String(err) };
  }
}

/* Une seule ecriture de la memoire par lecture, quel que soit le nombre de vues qui l'attendent. */
function lancerLecture(g: number): Promise<Resultat> {
  const entree = { generation: g, depart: null } as LectureEnVol;   // la promesse est posee juste en dessous
  const promesse = lireDepuisLeReseau(() => { entree.depart = performance.now(); }).then(r => {
    if (r.ok && g === generationCourante()) {
      const avant = lireGroupesConnus();
      ecrireGroupesConnus({
        userId: r.userId,
        list: r.list,
        statuts: r.statuts ?? (avant && avant.userId === r.userId ? avant.statuts : {}),
      });
      generationEcrite = g;
    }
    if (lectureEnVol?.promesse === promesse) lectureEnVol = null;
    return r;
  });
  entree.promesse = promesse;
  lectureEnVol = entree;
  return promesse;
}

export function useSuperAdminsData() {
  const [list, setList] = useState<CompanySuperAdmin[]>(() => lireGroupesConnus()?.list ?? []);
  /* `loading` dit « une lecture est en cours », PAS « rien a afficher » : la liste connue reste
     peinte pendant le rafraichissement. `connue` dit « une liste a deja ete lue », meme vide :
     la vue ne montre son squelette que tant qu'elle est fausse. */
  const [loading, setLoading] = useState(true);
  const [connue, setConnue] = useState(() => lireGroupesConnus() !== null);
  const [error, setError] = useState('');
  const [statuts, setStatuts] = useState<Record<string, string>>(() => lireGroupesConnus()?.statuts ?? {});
  const monte = useRef(true);
  /* Statuts dont l'enregistrement est EN COURS, par Groupe : une relecture partie avant leur upsert
     les ignorerait et ramenerait l'ancienne valeur a l'ecran. On les reapplique par-dessus. */
  const enAttente = useRef<Record<string, string>>({});

  const charger = useCallback(async (mode: Mode): Promise<void> => {
    const courante = generationCourante();
    const enVol = lectureEnVol && lectureEnVol.generation === courante ? lectureEnVol : null;
    let g: number;
    let promesse: Promise<Resultat>;
    if (mode === 'suite') {
      if (!enVol) {
        /* La lecture courante a deja repondu. Reussie, elle a ecrit la memoire : on la reprend.
           En echec, la vue qui l'avait lancee l'a dit. Dans les deux cas, aucune requete de plus. */
        if (generationEcrite === courante) {
          const v = lireGroupesConnus();
          if (v) { setList(v.list); setStatuts({ ...v.statuts, ...enAttente.current }); setConnue(true); }
        }
        setLoading(false);
        return;
      }
      g = courante;
      promesse = enVol.promesse;
    } else {
      setLoading(true);
      setError('');
      if (mode === 'montage' && enVol && (enVol.depart === null || performance.now() - enVol.depart < PARTAGE_MAX_MS)) {
        g = courante;
        promesse = enVol.promesse;
      } else {
        g = nouvelleGeneration();
        promesse = lancerLecture(g);
      }
    }
    const r = await promesse;
    if (!monte.current) return;
    /* Une ecriture plus recente a ouvert une autre generation : cette reponse est perimee. On
       reprend la lecture courante au lieu d'afficher une liste d'avant l'ecriture. */
    if (g !== generationCourante()) { await charger('suite'); return; }
    if (!r.ok) { setError(r.erreur); setLoading(false); return; }
    setList(r.list);
    if (r.statuts) setStatuts({ ...r.statuts, ...enAttente.current });
    setConnue(true);
    setLoading(false);
  }, []);

  /** Relecture FORCEE : toujours une requete neuve (voir l'en-tete). */
  const refresh = useCallback(() => charger('forcee'), [charger]);

  const setGroupStatut = useCallback(async (companyId: string, nom: string) => {
    if (!companyId) return;
    setStatuts(prev => ({ ...prev, [companyId]: nom }));
    enAttente.current = { ...enAttente.current, [companyId]: nom };
    const { error: echec } = await supabase
      .from('sa_group_statuts')
      .upsert({ company_id: companyId, statut: nom, updated_at: new Date().toISOString() }, { onConflict: 'company_id' });
    /* Un choix plus recent sur le meme Groupe a pu partir pendant cet enregistrement : c'est lui
       qui commande l'ecran, et lui seul retirera la marque « en cours ». */
    const dernierChoix = enAttente.current[companyId] === nom;
    if (dernierChoix) {
      const reste = { ...enAttente.current };
      delete reste[companyId];
      enAttente.current = reste;
    }
    if (echec) {
      /* Rien n'est enregistre : l'ecran revient a la derniere valeur connue (la memoire n'a pas ete
         touchee) et le dit, au lieu de laisser croire que le statut est pris. */
      const connu = lireGroupesConnus()?.statuts ?? {};
      if (dernierChoix) setStatuts(prev => {
        const suite = { ...prev };
        if (companyId in connu) suite[companyId] = connu[companyId];
        else delete suite[companyId];
        return suite;
      });
      setError(`Statut non enregistré : ${echec.message}`);
      return;
    }
    memoriserStatutConnu(companyId, nom);
    /* Puis une vraie relecture, SANS l'attendre : le menu des statuts se referme des la fin de
       l'ecriture, comme avant le 19/11, au lieu de rester ouvert pendant tout l'aller-retour
       vers l'Edge Function (jusqu'a 24,5 s mesures). */
    void charger('forcee');
  }, [charger]);

  useEffect(() => {
    monte.current = true;
    void charger('montage');
    return () => { monte.current = false; };
  }, [charger]);

  return { list, loading, connue, error, refresh, statuts, setGroupStatut };
}
