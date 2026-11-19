import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const LOGO_CHANNEL = 'active-logo-changed';

export function notifyLogoChanged() {
  try {
    const bc = new BroadcastChannel(LOGO_CHANNEL);
    bc.postMessage('changed');
    bc.close();
  } catch {
    // BroadcastChannel not supported — realtime will handle it
  }
  window.dispatchEvent(new CustomEvent(LOGO_CHANNEL));
}

export interface ActiveLogoInfo {
  url: string | null;
  scale: number;
  /** Mode memoriser seulement : nombre de lectures REUSSIES du logo en base. Un consommateur qui a
      vu l'image echouer s'en sert pour la retenter quand la base confirme l'adresse. */
  lectures?: number;
}

/*
 * LE DERNIER LOGO CONNU, PAR SOCIETE (localStorage) : la meme recette que le cache du theme
 * (tlx_theme_*). Sans lui, le menu affichait le bouclier par defaut tant que les deux lectures
 * ci-dessous n'avaient pas repondu, soit pendant tout le reveil de la plateforme (jusqu'a 60 s
 * le 19/11/2026). On n'y range que l'URL publique du logo et son echelle, rien de personnel.
 * La base reste l'autorite : elle remplace ce qui est peint des qu'elle repond.
 *
 * RESERVE AU MENU DU PANEL TALVEX (SuperAdminSidebar, `memoriser` vrai), le seul a savoir
 * retomber sur le bouclier si l'image en cache n'existe plus. Les autres consommateurs (Admin,
 * Groupe, pages Application) gardent le comportement d'avant le 19/11 : rien de lu, rien d'ecrit.
 */
const cleLogo = (companyId: string) => `tlx_logo_${companyId}`;
const SANS_LOGO: ActiveLogoInfo = { url: null, scale: 1 };
const memeLogo = (a: ActiveLogoInfo, b: ActiveLogoInfo) => a.url === b.url && a.scale === b.scale;

function logoConnu(companyId: string | null): ActiveLogoInfo {
  if (!companyId) return SANS_LOGO;
  try {
    const v = JSON.parse(localStorage.getItem(cleLogo(companyId)) ?? 'null');
    if (v && (typeof v.url === 'string' || v.url === null) && typeof v.scale === 'number') return { url: v.url, scale: v.scale };
  } catch { /* ignore */ }
  return SANS_LOGO;
}

/**
 * @param memoriser  Vrai pour le seul menu du panel Talvex : premier rendu depuis le dernier logo
 *   connu, une lecture en echec garde le champ connu, une lecture entierement reussie est
 *   memorisee. Faux (defaut) : le comportement d'avant le 19/11.
 */
export function useActiveLogo(companyId: string | null, memoriser = false): ActiveLogoInfo {
  const [info, setInfo] = useState<ActiveLogoInfo>(() => (memoriser ? logoConnu(companyId) : SANS_LOGO));

  useEffect(() => {
    if (!companyId) { setInfo(SANS_LOGO); return; }
    if (memoriser) {
      const connu = logoConnu(companyId);
      setInfo(prev => (memeLogo(prev, connu) ? prev : connu));
    }

    let cancelled = false;
    /* Plusieurs lectures peuvent se croiser (montage, notifyLogoChanged, temps reel, autre onglet) :
       seule la plus RECENTE ecrit, sans quoi une reponse plus ancienne arrivee en dernier
       afficherait, et memoriserait, un logo ou une echelle perimes. */
    let derniere = 0;

    async function fetchLogo() {
      const mienne = ++derniere;
      const [logoRes, pageRes] = await Promise.all([
        supabase
          .from('company_logos')
          .select('url')
          .eq('company_id', companyId!)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle(),
        supabase
          .from('company_home_pages')
          .select('logo_scale')
          .eq('company_id', companyId!)
          .limit(1)
          .maybeSingle(),
      ]);
      if (cancelled || mienne !== derniere) return;
      if (!memoriser) {
        setInfo({ url: logoRes.data?.url ?? null, scale: pageRes.data?.logo_scale ?? 1 });
        return;
      }
      /* Une lecture en ECHEC (delai depasse, 500) ne dit pas que le logo a disparu : CHAQUE champ
         garde sa derniere valeur connue, l'autre prend sa valeur fraiche. Seule une reponse
         entierement reussie est memorisee. */
      setInfo(prev => ({
        url: logoRes.error ? prev.url : (logoRes.data?.url ?? null),
        scale: pageRes.error ? prev.scale : (pageRes.data?.logo_scale ?? 1),
        lectures: (prev.lectures ?? 0) + (logoRes.error ? 0 : 1),
      }));
      if (logoRes.error || pageRes.error) return;
      const frais = { url: logoRes.data?.url ?? null, scale: pageRes.data?.logo_scale ?? 1 };
      try { localStorage.setItem(cleLogo(companyId!), JSON.stringify(frais)); } catch { /* ignore */ }
    }

    fetchLogo();

    const handleLocal = () => { fetchLogo(); };
    window.addEventListener(LOGO_CHANNEL, handleLocal);

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel(LOGO_CHANNEL);
      bc.onmessage = () => { fetchLogo(); };
    } catch {
      // not supported
    }

    const channel = supabase
      .channel(`active-logo-${companyId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'company_logos', filter: `company_id=eq.${companyId}` },
        () => { fetchLogo(); },
      )
      .subscribe();

    return () => {
      cancelled = true;
      window.removeEventListener(LOGO_CHANNEL, handleLocal);
      bc?.close();
      supabase.removeChannel(channel);
    };
  }, [companyId, memoriser]);

  return info;
}
