import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useWorkMode } from '../../../../hooks/useWorkMode';
import { useSimulation } from '../../../../contexts/SimulationContext';
import { useCompanyId } from '../../../../hooks/useCompanyId';
import { supabase } from '../../../../lib/supabase';
import { telDuLead, telCorrespond } from '../../../../lib/formatTel';
import { lireParCurseur } from '../../../../lib/lectureIntegrale';
import { champContact } from '../../../../lib/identiteLead';
import { leadCorrespond } from '../../../../lib/rechercheLeads';
import { ONGLET_PRINCIPAL } from '../../../../lib/ongletsLeads';
import type { ImportedLead, Vendor, StatutDef } from './types';

/** Les colonnes lues pour chaque lead : les colonnes PLATES aussi, pour l'identite et la recherche. */
export const COLONNES_LEAD_CRM = 'id, data, prenom, nom, email, telephone, imported_at, statut, actif, vendor_id, ai_enabled';

interface VueCrm {
  /** L'onglet de colonnes ouvert : ses leads seulement (Principal = tous). */
  ongletActif?: string;
  dansOnglet?: (leadId: string, ongletId: string) => boolean;
  /** Vrai quand le TABLEAU est monte (un seul arbre) : la barre de defilement du haut se recale. */
  estBureau?: boolean;
}

/** Plus recents d'abord, puis par id : l'ordre de la lecture par curseur n'est pas celui de l'ecran. */
const parDateDecroissante = (a: ImportedLead, b: ImportedLead) =>
  (a.imported_at < b.imported_at ? 1 : a.imported_at > b.imported_at ? -1 : 0) || a.id.localeCompare(b.id);

export function useCrmData(vue: VueCrm = {}) {
  const ongletActif = vue.ongletActif ?? ONGLET_PRINCIPAL;
  const dansOnglet = vue.dansOnglet;
  const { isSimulating } = useSimulation();
  const companyId = useCompanyId();
  const [leads, setLeads] = useState<ImportedLead[]>([]);
  const [statutDefs, setStatutDefs] = useState<StatutDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterVendor, setFilterVendor] = useState<string>('tous');
  const [filterEmail, setFilterEmail] = useState('');
  const [filterTel, setFilterTel] = useState('');
  const [filterPrenom, setFilterPrenom] = useState('');
  const [filterNom, setFilterNom] = useState('');
  const [statutFilter, setStatutFilter] = useState<string>('Tous');
  const [sortOrder, setSortOrder] = useState<'recent' | 'ancien'>('recent');
  const [recherche, setRecherche] = useState('');
  const [erreurChargement, setErreurChargement] = useState('');

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [detailLead, setDetailLead] = useState<{ lead: ImportedLead; index: number; fromActions?: boolean } | null>(null);
  const [showTransfer, setShowTransfer] = useState(false);
  const [authUserId, setAuthUserId] = useState<string>('');
  const workMode = useWorkMode(authUserId ? `crm_work_mode_admin_${authUserId}` : '');
  const cardRefsMap = useRef<Map<string, HTMLDivElement>>(new Map());
  const rowRefsMap = useRef<Map<string, HTMLTableRowElement>>(new Map());
  const recentUpdates = useRef<Map<string, number>>(new Map());
  /* Ce que le temps reel apporte PENDANT la lecture : sans cela, la liste lue (plus ancienne)
     ecraserait a son arrivee les leads inseres, modifies ou supprimes entre-temps. */
  const pendantLecture = useRef<{ ajouts: Map<string, Partial<ImportedLead> & { id: string }>; retraits: Set<string> } | null>(null);

  const topScrollRef = useRef<HTMLDivElement>(null);
  const bottomScrollRef = useRef<HTMLDivElement>(null);
  const topInnerRef = useRef<HTMLDivElement>(null);
  const syncingRef = useRef<'top' | 'bottom' | null>(null);

  useEffect(() => {
    const el = bottomScrollRef.current;
    if (!el) return;
    const sync = () => {
      if (topInnerRef.current) topInnerRef.current.style.width = el.scrollWidth + 'px';
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    const mo = new MutationObserver(sync);
    mo.observe(el, { childList: true, subtree: true });
    return () => { ro.disconnect(); mo.disconnect(); };
  }, [loading, leads.length, vue.estBureau]);

  const handleTopScroll = () => {
    if (syncingRef.current === 'bottom') { syncingRef.current = null; return; }
    syncingRef.current = 'top';
    if (bottomScrollRef.current && topScrollRef.current) {
      bottomScrollRef.current.scrollLeft = topScrollRef.current.scrollLeft;
    }
  };
  const handleBottomScroll = () => {
    if (syncingRef.current === 'top') { syncingRef.current = null; return; }
    syncingRef.current = 'bottom';
    if (topScrollRef.current && bottomScrollRef.current) {
      topScrollRef.current.scrollLeft = bottomScrollRef.current.scrollLeft;
    }
  };

  const loadStatuts = useCallback(async () => {
    if (!companyId) return;
    const { data } = await supabase.from('statuts').select('id, nom, couleur').eq('company_id', companyId).order('created_at', { ascending: true });
    setStatutDefs((data ?? []) as StatutDef[]);
  }, [companyId]);

  const loadVendors = useCallback(async () => {
    if (!companyId) return;
    const { data } = await supabase.from('vendors').select('id, first_name, last_name, email').eq('company_id', companyId).order('last_name', { ascending: true });
    setVendors((data ?? []) as Vendor[]);
  }, [companyId]);

  const handleTransfer = async (vendorId: string | null) => {
    if (isSimulating || !companyId) return;
    /* Seuls les leads SELECTIONNES ET AFFICHES : une case cochee dans un autre onglet, ou
       masquee par un filtre, n'est plus sous les yeux — on n'agit pas sur ce qu'on ne voit pas. */
    const ids = idsSelectionnesAffiches();
    if (ids.length === 0) return;
    /* Par lots de 150 : la liste part dans l'URL, et au-dela d'environ 410 identifiants la
       requete depasse la taille acceptee et echouait sans message. */
    const faits = new Set<string>();
    for (let i = 0; i < ids.length; i += 150) {
      const lot = ids.slice(i, i + 150);
      const { error } = await supabase.from('leads').update({ vendor_id: vendorId }).in('id', lot).eq('company_id', companyId);
      if (error) break;
      lot.forEach(id => faits.add(id));
    }
    setLeads(prev => prev.map(l => faits.has(l.id) ? { ...l, vendor_id: vendorId } : l));
    setSelected(new Set());
    setShowTransfer(false);
  };

  /* TOUS les leads, par pages de 1 000 et PAR CURSEUR sur l'id : PostgREST tronque une
     reponse au-dela de son plafond sans le dire, et une pagination par decalage rendait des
     doublons et des absents des qu'un import inserait pendant la lecture (contre-verification
     du 19/11). Ce que le temps reel a apporte pendant la lecture est reapplique a la fin. */
  const load = useCallback(async () => {
    if (!companyId) return;
    pendantLecture.current = { ajouts: new Map(), retraits: new Set() };
    const { data, error } = await lireParCurseur<ImportedLead>((apres, taille) => {
      const base = supabase.from('leads').select(COLONNES_LEAD_CRM).eq('company_id', companyId);
      return (apres ? base.gt('id', apres) : base).order('id', { ascending: true }).limit(taille);
    });
    const recus = pendantLecture.current;
    pendantLecture.current = null;
    if (error) setErreurChargement(error.message);
    else {
      const parId = new Map((data ?? []).map(l => [l.id, l]));
      for (const [id, l] of recus?.ajouts ?? []) parId.set(id, { ...(parId.get(id) ?? {}), ...l } as ImportedLead);
      for (const id of recus?.retraits ?? []) parId.delete(id);
      setErreurChargement('');
      setLeads([...parId.values()].sort(parDateDecroissante));
    }
    setLoading(false);
  }, [companyId]);

  /* getSession et non getUser : seul l'identifiant est lu ici, et il est deja dans le jeton
     en stockage. Le CRM est demonte et remonte a chaque changement d'onglet — un
     aller-retour serveur ici se payait donc a CHAQUE passage, et retardait au passage toutes
     les requetes du panel via le verrou global de supabase-js. Voir SuperAdminSidebar pour
     la mesure complete. */
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { if (session?.user) setAuthUserId(session.user.id); });
  }, []);

  useEffect(() => {
    if (!workMode.enabled || !workMode.activeId) return;
    const t = setTimeout(() => {
      const el = cardRefsMap.current.get(workMode.activeId!) ?? rowRefsMap.current.get(workMode.activeId!);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    }, 50);
    return () => clearTimeout(t);
  }, [workMode.enabled, workMode.activeId]);

  useEffect(() => { load(); loadStatuts(); loadVendors(); }, [load, loadStatuts, loadVendors]);

  useEffect(() => {
    if (!companyId) return;
    /* Le canal ne recoit que les leads de LA societe affichee : sans ce filtre, un Super
       Admin recevait chaque insertion de toutes les societes, et un import de 5 000 lignes
       ailleurs faisait recalculer ce CRM 5 000 fois. */
    const filtre = `company_id=eq.${companyId}`;
    const leadsChannel = supabase
      .channel(`leads-crm-${companyId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'leads', filter: filtre }, (payload) => {
        const inserted = payload.new as ImportedLead & { company_id?: string };
        if (inserted.company_id !== companyId) return;
        pendantLecture.current?.ajouts.set(inserted.id, inserted);
        setLeads(prev => prev.some(l => l.id === inserted.id) ? prev : [inserted, ...prev]);
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'leads' }, (payload) => {
        const retire = (payload.old as { id: string }).id;
        pendantLecture.current?.retraits.add(retire);
        setLeads(prev => prev.filter(l => l.id !== retire));
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'leads', filter: filtre }, (payload) => {
        const updated = payload.new as ImportedLead;
        const lockedUntil = recentUpdates.current.get(updated.id);
        if (lockedUntil && Date.now() < lockedUntil) return;
        if (pendantLecture.current) pendantLecture.current.ajouts.set(updated.id, { ...(pendantLecture.current.ajouts.get(updated.id) ?? {}), ...updated });
        setLeads(prev => prev.map(l => l.id === updated.id ? { ...l, ...updated } : l));
      })
      .subscribe();
    const statutsChannel = supabase
      .channel('statuts-crm')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'statuts' }, loadStatuts)
      .subscribe();
    return () => {
      supabase.removeChannel(leadsChannel);
      supabase.removeChannel(statutsChannel);
    };
  }, [companyId, loadStatuts]);

  const handleStatut = async (id: string, statut: string) => {
    if (isSimulating) return;
    const prev = leads.find(l => l.id === id)?.statut;
    recentUpdates.current.set(id, Date.now() + 3000);
    setLeads(ls => ls.map(l => l.id === id ? { ...l, statut } : l));
    const { error } = await supabase.from('leads').update({ statut }).eq('id', id);
    if (error) {
      setLeads(ls => ls.map(l => l.id === id ? { ...l, statut: prev } : l));
    }
    recentUpdates.current.delete(id);
  };

  const handleToggleActif = async (id: string, current: boolean) => {
    if (isSimulating) return;
    setLeads(ls => ls.map(l => l.id === id ? { ...l, actif: !current } : l));
    const { error } = await supabase.from('leads').update({ actif: !current }).eq('id', id);
    if (error) setLeads(ls => ls.map(l => l.id === id ? { ...l, actif: current } : l));
  };

  const handleToggleAi = async (id: string, current: boolean) => {
    if (isSimulating) return;
    setLeads(ls => ls.map(l => l.id === id ? { ...l, ai_enabled: !current } : l));
    const { error } = await supabase.from('leads').update({ ai_enabled: !current }).eq('id', id);
    if (error) setLeads(ls => ls.map(l => l.id === id ? { ...l, ai_enabled: current } : l));
  };

  const handleGlobalAiToggle = async (enabled: boolean) => {
    if (isSimulating || !companyId) return;
    setLeads(ls => ls.map(l => ({ ...l, ai_enabled: enabled })));
    const { error } = await supabase.from('leads').update({ ai_enabled: enabled }).eq('company_id', companyId);
    if (error) load();
  };

  const handleDeleteSelected = async () => {
    if (isSimulating || !companyId) return;
    const ids = idsSelectionnesAffiches();
    if (ids.length === 0) return;
    setDeleting(true);
    const faits = new Set<string>();
    for (let i = 0; i < ids.length; i += 150) {
      const lot = ids.slice(i, i + 150);
      const { error } = await supabase.from('leads').delete().in('id', lot).eq('company_id', companyId);
      if (error) break;
      lot.forEach(id => faits.add(id));
    }
    setLeads(prev => prev.filter(l => !faits.has(l.id)));
    setSelected(new Set());
    setDeleting(false);
  };

  const rechercheActive = recherche.trim() !== '';

  const filtered = useMemo(() => leads
    .filter(l => {
      /* La recherche globale traverse TOUS les onglets ; sinon, l'onglet ouvert borne la liste. */
      if (rechercheActive) { if (!leadCorrespond(l, recherche)) return false; }
      else if (ongletActif !== ONGLET_PRINCIPAL && !(dansOnglet?.(l.id, ongletActif) ?? false)) return false;
      const nom = champContact(l, 'nom').toLowerCase();
      const prenom = champContact(l, 'prenom').toLowerCase();
      const email = champContact(l, 'email').toLowerCase();
      if (filterNom && !nom.includes(filterNom.toLowerCase())) return false;
      if (filterPrenom && !prenom.includes(filterPrenom.toLowerCase())) return false;
      if (filterEmail && !email.includes(filterEmail.toLowerCase())) return false;
      /* La source passe par la cascade : le filtre voyait 13 numeros sur 33, il en voit
         maintenant 33. Et la comparaison tolere le format, sinon recopier le numero affiche
         en `+33` ne trouverait pas un lead stocke en `06 ...`. Purement additif. */
      if (filterTel && !telCorrespond(telDuLead(l), filterTel)) return false;
      if (statutFilter === 'sans_statut') {
        const nomStatut = l.statut ?? '';
        if (nomStatut !== '' && nomStatut !== 'Nouveau') return false;
      } else if (statutFilter !== 'Tous' && (l.statut || 'Nouveau') !== statutFilter) return false;
      if (filterVendor === 'admin' && l.vendor_id !== null) return false;
      if (filterVendor !== 'tous' && filterVendor !== 'admin' && l.vendor_id !== filterVendor) return false;
      return true;
    })
    .sort((a, b) => {
      const da = new Date(a.imported_at).getTime();
      const db = new Date(b.imported_at).getTime();
      const diff = sortOrder === 'recent' ? db - da : da - db;
      if (diff !== 0) return diff;
      return a.id.localeCompare(b.id);
    }), [leads, rechercheActive, recherche, ongletActif, dansOnglet, filterNom, filterPrenom, filterEmail, filterTel, statutFilter, filterVendor, sortOrder]);

  const filteredIds = filtered.map(l => l.id);
  function idsSelectionnesAffiches() { return filteredIds.filter(id => selected.has(id)); }
  const allChecked = filteredIds.length > 0 && filteredIds.every(id => selected.has(id));
  const someChecked = filteredIds.some(id => selected.has(id));

  const toggleAll = () => {
    if (allChecked) {
      setSelected(prev => { const n = new Set(prev); filteredIds.forEach(id => n.delete(id)); return n; });
    } else {
      setSelected(prev => { const n = new Set(prev); filteredIds.forEach(id => n.add(id)); return n; });
    }
  };

  const toggleOne = (id: string) => {
    setSelected(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };

  return {
    leads, statutDefs, vendors, loading, filtered, selected, setSelected, deleting,
    recherche, setRecherche, rechercheActive, erreurChargement, idsSelectionnesAffiches, reload: load,
    allChecked, someChecked, toggleAll, toggleOne,
    filterVendor, setFilterVendor,
    filterEmail, setFilterEmail, filterTel, setFilterTel,
    filterPrenom, setFilterPrenom, filterNom, setFilterNom,
    statutFilter, setStatutFilter, sortOrder, setSortOrder,
    detailLead, setDetailLead, showTransfer, setShowTransfer,
    workMode, cardRefsMap, rowRefsMap,
    topScrollRef, bottomScrollRef, topInnerRef,
    handleTopScroll, handleBottomScroll,
    handleStatut, handleToggleActif, handleToggleAi, handleGlobalAiToggle, handleDeleteSelected, handleTransfer,
  };
}
