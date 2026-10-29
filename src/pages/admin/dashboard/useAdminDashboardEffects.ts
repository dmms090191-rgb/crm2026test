import { useEffect, type MutableRefObject } from 'react';
import { supabase } from '../../../lib/supabase';
import { consumeConnectReturnContext } from '../../../lib/connectReturnContext';
import { importDocumentationCrm } from './adminLazyViews';
import { planifierAuRepos } from '../../../lib/auRepos';
import type { ActiveView } from '../AdminDashboard';

interface Params {
  companyId: string | null;
  setAdminAuthId: (id: string) => void;
  setAdminName: (name: string) => void;
  setAdminEmail: (email: string) => void;
  /**
   * Vrai quand une Societe est VISUALISEE. Le compte JWT ne doit alors jamais
   * ecraser l'identite affichee : seul son id sert encore, pour les requetes.
   */
  isImpersonating: boolean;
  setCompanyName: (name: string) => void;
  setActiveView: (v: ActiveView) => void;
  activeView: ActiveView;
  pendingScrollRef: MutableRefObject<{ leadId?: string; vendorId?: string; scrollY: number } | null>;
}

export function useAdminDashboardEffects({
  companyId,
  setAdminAuthId,
  setAdminName,
  setAdminEmail,
  isImpersonating,
  setCompanyName,
  setActiveView,
  activeView,
  pendingScrollRef,
}: Params) {
  useEffect(() => {
    const ctx = consumeConnectReturnContext('admin');
    if (ctx) {
      setActiveView(ctx.fromTab as ActiveView);
      pendingScrollRef.current = { leadId: ctx.leadId, vendorId: ctx.vendorId, scrollY: ctx.scrollY };
    }
  }, []);

  useEffect(() => {
    if (!pendingScrollRef.current) return;
    const { leadId, vendorId, scrollY } = pendingScrollRef.current;
    pendingScrollRef.current = null;
    const targetId = leadId || vendorId;
    if (!targetId) { window.scrollTo({ top: scrollY, behavior: 'smooth' }); return; }
    let n = 0;
    const poll = () => {
      const el = document.querySelector(`[data-row-id="${targetId}"]`);
      if (!el) { if (++n < 30) setTimeout(poll, 150); return; }
      requestAnimationFrame(() => {
        const main = el.closest('main');
        if (main) { const r = el.getBoundingClientRect(), m = main.getBoundingClientRect(); main.scrollTo({ top: Math.max(0, r.top - m.top + main.scrollTop - main.clientHeight / 2 + r.height / 2), behavior: 'smooth' }); }
        else el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('scroll-highlight'); setTimeout(() => el.classList.remove('scroll-highlight'), 2000);
      });
    };
    const tm = setTimeout(poll, 200);
    return () => clearTimeout(tm);
  }, [activeView]);

  /* getSession et non getUser : les TROIS champs lus ici — id, email, user_metadata —
     sont deja dans le jeton en stockage, et getUser les redemandait au serveur. Tous les
     appels auth de supabase-js prennent un verrou global, que chaque requete REST doit
     prendre a son tour pour obtenir son jeton : un aller-retour auth au montage retarde
     donc l'ensemble des requetes du panel, pas seulement celle-ci. */
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user;
      if (!user) return;
      // L'ID du compte connecte reste necessaire (requetes, Realtime).
      setAdminAuthId(user.id);
      // Mais son IDENTITE ne doit jamais ecraser celle d'une Societe visualisee.
      // Ce getUser est asynchrone : sans cette garde il gagnait la course contre
      // l'identite impersonated, et la topbar retombait sur le compte Talvex.
      if (isImpersonating) return;
      // Aucune requete supplementaire : l'email vient du getUser deja effectue ici.
      if (user.email) setAdminEmail(user.email);
      if (user.user_metadata) {
        const { first_name, last_name } = user.user_metadata;
        if (first_name || last_name) {
          setAdminName([first_name, last_name].filter(Boolean).join(' '));
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isImpersonating]);

  useEffect(() => {
    if (!companyId) return;
    supabase.from('companies').select('name').eq('id', companyId).maybeSingle()
      .then(({ data }) => { if (data?.name) setCompanyName(data.name); });
  }, [companyId]);

  /*
   * ---------- C'EST CET APPEL QUI TUAIT LE PANEL SUR L'iPHONE ----------
   *
   * Il n'a aucune garde et aucune dependance : il partait donc a CHAQUE montage du panel
   * admin, avant tout le reste. Sur Safari iOS, ou requestIdleCallback n'existe pas, la
   * ReferenceError levee ici remontait a l'ErrorBoundary et remplacait l'interface entiere
   * par « Une erreur est survenue » — pour un simple prechargement de la documentation.
   *
   * L'autre appel du panel (AdminDashboard.tsx) est garde par le droit CRM Immo : il ne
   * plantait donc qu'une partie des Societes, et plus tard. Celui-ci plantait tout le
   * monde, tout de suite. Les deux passent desormais par le meme helper.
   */
  useEffect(() => planifierAuRepos(() => { importDocumentationCrm(); }), []);

}
