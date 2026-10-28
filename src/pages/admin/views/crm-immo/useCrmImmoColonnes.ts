import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../../lib/supabase';
import { useCompanyId } from '../../../../hooks/useCompanyId';
import {
  positionsApres, cleReglage, reglageValide, REGLAGE_VIDE, type ReglageLocal,
} from '../../../../lib/crmImmoColonnes';
import { lireReglageDistant, ecrireReglageDistant } from '../../../../hooks/crmImmoReglageDistant';
import type { ColonneImmo, TypeColonne } from './crmImmoTypes';

/**
 * Couche de donnees des colonnes personnalisees — SEUL endroit qui parle a
 * `crm_immo_colonnes`, plus le reglage LOCAL des colonnes systeme.
 *
 * ---------- DEUX PERSISTANCES, ET UNE SEULE SOURCE PAR FAMILLE ----------
 *
 * Les colonnes PERSONNALISEES vivent en base : elles appartiennent a la Societe, tout le
 * monde doit voir les memes. Leur ordre et leur masquage y sont aussi (position, masquee).
 *
 * L'ordre et le masquage des colonnes SYSTEME vivaient dans le NAVIGATEUR, et c'etait le
 * defaut corrige le 28/10/2026 : deux ordinateurs du meme compte affichaient des colonnes
 * differentes, parce que le localStorage n'est jamais synchronise. Ils vivent desormais
 * dans `user_preferences.sidebar_orders`, sous la cle crm_immo_colonnes:<companyId>, comme
 * la barre laterale V2 et les preferences d'actions. Le localStorage est retrograde en
 * CACHE : il peint tout de suite, la base fait autorite.
 *
 * TROIS REGLES, TRANCHEES PAR DAVID LE 28/10, ET QU'IL NE FAUT PAS ASSOUPLIR :
 *
 *   1. La base fait autorite SEULEMENT SI ELLE A QUELQUE CHOSE. Une base vide ne veut pas
 *      dire « pas de colonnes » : elle veut dire « personne n'a encore range ».
 *   2. AUCUN AMORCAGE AUTOMATIQUE. On ne promeut jamais le cache local vers la base au
 *      chargement. Sinon le PREMIER POSTE A OUVRIR GAGNE et le reglage de l'autre est
 *      detruit sans rattrapage — une course deciderait.
 *   3. La base ne se remplit qu'au PREMIER GESTE EXPLICITE dans la modale Colonnes, c'est-
 *      a-dire par enregistrerReglage, et par rien d'autre.
 *
 * ---------- LA LECTURE PORTE TOUJOURS LES DEUX CRITERES ----------
 *
 * `.order('position').order('created_at')` — les DEUX. `position` n'est volontairement
 * pas unique en base (un glisser-deposer passe par un etat transitoire en doublon) :
 * avec `position` seul, deux colonnes de meme rang s'echangeraient a chaque rechargement.
 */
/**
 * @param proprietaireReglage  Auth id de l'entite dont on lit et ecrit la preference de
 *   colonnes. C'est l'entite VISUALISEE, pas l'observateur — la regle que le depot s'est
 *   donnee (AppShell.tsx : « une preference suit l'entite VISUALISEE »), et celle que David
 *   a confirmee le 28/10.
 *
 *   Il arrive en parametre et n'est PAS relu ici, volontairement : useAuthUserId appelle
 *   supabase.auth.getUser(), un aller-retour serveur de 72 ms de mediane que le commit
 *   ee04a89 (« CRM Immo : quatre allers-retours auth retires de l'ouverture ») a justement
 *   chasse de ce chemin. AdminDashboard tient deja cet id, lu par getSession, donc sans
 *   reseau : il descend jusqu'ici.
 *
 *   Nul tant que la session n'est pas resolue : dans cet etat on ne lit ni n'ecrit rien en
 *   base, et le cache local suffit a peindre.
 */
export function useCrmImmoColonnes(proprietaireReglage: string | null) {
  const companyId = useCompanyId();
  const [colonnes, setColonnes] = useState<ColonneImmo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reglage, setReglage] = useState<ReglageLocal>(REGLAGE_VIDE);

  /* ---- Le CACHE local : il peint tout de suite, pour que le tableau ne clignote pas ---- */
  useEffect(() => {
    try {
      const brut = localStorage.getItem(cleReglage(companyId));
      setReglage(brut ? (reglageValide(JSON.parse(brut)) ?? REGLAGE_VIDE) : REGLAGE_VIDE);
    } catch {
      /* Navigation privee, stockage bloque, JSON abime : on repart des defauts plutot
         que de casser la page pour un confort d'affichage. */
      setReglage(REGLAGE_VIDE);
    }
  }, [companyId]);

  /* ---- La BASE fait autorite, mais seulement si elle a quelque chose ---- */
  useEffect(() => {
    if (!proprietaireReglage || !companyId) return;
    let vivant = true;
    void lireReglageDistant(proprietaireReglage, companyId).then(distant => {
      /*
       * `!distant` couvre les deux cas qui doivent rester sans effet : la cle n'existe pas
       * encore, et la lecture a echoue. Dans les deux, on GARDE ce que le cache a peint et
       * on n'ecrit RIEN.
       *
       * C'est la regle 2 : pas d'amorcage. Appliquer un reglage distant nul — comme le fait
       * useSidebarLayout — ecraserait ici la configuration locale par du vide, et comme on
       * reecrit le cache juste apres, l'ordre d'origine n'existerait plus NULLE PART.
       */
      if (!vivant || !distant) return;
      setReglage(distant);
      try { localStorage.setItem(cleReglage(companyId), JSON.stringify(distant)); } catch { /* noop */ }
    });
    return () => { vivant = false; };
  }, [proprietaireReglage, companyId]);

  /**
   * LE SEUL POINT D'ECRITURE, et c'est ce qui fait tenir la regle 3.
   *
   * Appele uniquement par la modale Colonnes (CrmImmo.tsx -> onReglage), donc uniquement
   * sur un GESTE de l'utilisateur. Aucun effet de chargement n'ecrit en base.
   *
   * Le cache part en premier : l'utilisateur doit voir son geste pris meme hors ligne. La
   * base suit, et son echec ne defait rien a l'ecran.
   */
  const enregistrerReglage = useCallback((suivant: ReglageLocal) => {
    setReglage(suivant);
    try {
      localStorage.setItem(cleReglage(companyId), JSON.stringify(suivant));
    } catch { /* stockage indisponible : le reglage vit le temps de la session */ }
    /* Jamais de cle parasite : companyId se resout de facon asynchrone, et ecrire sous
       `crm_immo_colonnes:none` polluerait la ligne de preferences pour toujours. */
    if (proprietaireReglage && companyId) {
      void ecrireReglageDistant(proprietaireReglage, companyId, suivant);
    }
  }, [companyId, proprietaireReglage]);

  /* ---- Les colonnes personnalisees, en base ---- */
  const load = useCallback(async () => {
    if (!companyId) { setColonnes([]); setLoading(false); return; }
    setLoading(true);
    const { data, error: err } = await supabase
      .from('crm_immo_colonnes')
      .select('*')
      .eq('company_id', companyId)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true });
    if (err) { setError(err.message); setColonnes([]); }
    else { setColonnes((data ?? []) as ColonneImmo[]); setError(''); }
    setLoading(false);
  }, [companyId]);

  useEffect(() => { void load(); }, [load]);

  const ajouter = useCallback(async (nom: string, type: TypeColonne) => {
    const propre = nom.trim();
    if (!propre) return { error: 'Le nom de la colonne est obligatoire.' };
    if (!companyId) return { error: 'Société introuvable.' };

    const { data, error: err } = await supabase
      .from('crm_immo_colonnes')
      .insert({ company_id: companyId, nom: propre, type, position: colonnes.length, masquee: false })
      .select('*')
      .single();

    if (err) {
      /* 23505 = l'index unique (company_id, lower(btrim(nom))). Le message brut de
         Postgres ne veut rien dire pour une agence immobiliere. */
      if (err.code === '23505') return { error: `Une colonne « ${propre} » existe déjà.` };
      return { error: err.message };
    }
    setColonnes(prev => [...prev, data as ColonneImmo]);
    return { error: null };
  }, [companyId, colonnes.length]);

  const renommer = useCallback(async (id: string, nom: string) => {
    const propre = nom.trim();
    if (!propre) return { error: 'Le nom de la colonne est obligatoire.' };

    /* Renommer est un UPDATE d'UNE SEULE LIGNE : la cle du jsonb des dossiers est l'ID
       de la colonne, pas son nom. Aucun dossier n'est touche. */
    const { data, error: err } = await supabase
      .from('crm_immo_colonnes')
      .update({ nom: propre })
      .eq('id', id)
      .select('*');

    if (err) {
      if (err.code === '23505') return { error: `Une colonne « ${propre} » existe déjà.` };
      return { error: err.message };
    }
    const lignes = (data ?? []) as ColonneImmo[];
    if (lignes.length === 0) return { error: 'Renommage refusé : droits insuffisants.' };
    setColonnes(prev => prev.map(c => (c.id === id ? lignes[0] : c)));
    return { error: null };
  }, []);

  const basculerMasquage = useCallback(async (id: string, masquee: boolean) => {
    const { data, error: err } = await supabase
      .from('crm_immo_colonnes')
      .update({ masquee })
      .eq('id', id)
      .select('*');
    if (err) return { error: err.message };
    const lignes = (data ?? []) as ColonneImmo[];
    if (lignes.length === 0) return { error: 'Modification refusée : droits insuffisants.' };
    setColonnes(prev => prev.map(c => (c.id === id ? lignes[0] : c)));
    return { error: null };
  }, []);

  const supprimer = useCallback(async (id: string) => {
    /* On ne touche PAS au jsonb des dossiers : la cle orpheline reste, inerte, jamais
       lue. Un DELETE qui reecrirait N dossiers serait lent et risque, pour un gain nul. */
    const { data, error: err } = await supabase
      .from('crm_immo_colonnes')
      .delete()
      .eq('id', id)
      .select('id');
    if (err) return { error: err.message };
    if ((data ?? []).length === 0) return { error: 'Suppression refusée : droits insuffisants.' };
    setColonnes(prev => prev.filter(c => c.id !== id));
    return { error: null };
  }, []);

  /**
   * Enregistre un nouvel ordre en UN SEUL upsert de lignes entieres.
   *
   * Une requete par colonne ferait N allers-retours et laisserait un ordre a moitie
   * ecrit si l'une echouait. `onConflict: 'id'` est exact : id est la cle primaire.
   */
  const reordonner = useCallback(async (ordre: ColonneImmo[]) => {
    const aEcrire = positionsApres(ordre);
    /* Mise a jour optimiste : le glisser-deposer doit repondre a l'oeil. */
    const avant = colonnes;
    setColonnes(ordre.map((c, i) => ({ ...c, position: i })));
    if (aEcrire.length === 0) return { error: null };

    const { data, error: err } = await supabase
      .from('crm_immo_colonnes')
      .upsert(aEcrire, { onConflict: 'id' })
      .select('id');

    if (err || (data ?? []).length !== aEcrire.length) {
      setColonnes(avant);
      return { error: err?.message ?? 'Le nouvel ordre n’a pas pu être enregistré entièrement.' };
    }
    return { error: null };
  }, [colonnes]);

  return {
    colonnes, loading, error, reglage,
    recharger: load, ajouter, renommer, basculerMasquage, supprimer, reordonner,
    enregistrerReglage,
  };
}
