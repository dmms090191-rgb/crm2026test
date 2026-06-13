import { useState, useEffect } from 'react';
import { LogIn, Loader2, AlertCircle } from 'lucide-react';
import LoginModal from '../../components/LoginModal';
import { getHomePageBySlug, getHomePageById, getTemplateById, type CompanyHomePage } from '../../lib/companyHomePages';
import { getTemplateComponent, type SectionOverride } from '../superadmin/views/site-builder/templates/templateRegistry';
import { supabase } from '../../lib/supabase';

interface Props {
  preloadedPage?: CompanyHomePage | null;
  slug?: string | null;
  pageId?: string | null;
  domainCompanyId?: string | null;
  onLogin?: () => void;
}

interface PublishedSectionRow {
  section_key: string;
  position: number;
  is_visible: boolean;
  published_content: Record<string, string> | null;
  published_styles: Record<string, string> | null;
}

export default function CompanySitePage({ preloadedPage, slug, pageId, domainCompanyId, onLogin: onLoginProp }: Props) {
  const [page, setPage] = useState<CompanyHomePage | null>(preloadedPage ?? null);
  const [templateKey, setTemplateKey] = useState<string | null>(null);
  const [sectionOverrides, setSectionOverrides] = useState<Record<string, SectionOverride> | undefined>();
  const [sectionOrder, setSectionOrder] = useState<string[] | undefined>();
  const [loading, setLoading] = useState(!preloadedPage);
  const [notFound, setNotFound] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

  useEffect(() => {
    document.getElementById('root')?.classList.add('app-ready');
  }, []);

  useEffect(() => {
    if (slug === '__domain_not_found__') {
      setNotFound(true);
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const data = preloadedPage
          ?? (slug
            ? await getHomePageBySlug(slug)
            : pageId
              ? await getHomePageById(pageId)
              : null);
        if (!data) { setNotFound(true); return; }
        setPage(data);
        if (data.active_template_id) {
          const tmpl = await getTemplateById(data.active_template_id);
          if (tmpl) setTemplateKey(tmpl.template_key);
        }
        if (data.is_published) {
          const { data: rows } = await supabase
            .from('site_sections')
            .select('section_key, position, is_visible, published_content, published_styles')
            .eq('home_page_id', data.id)
            .not('published_content', 'is', null)
            .order('position', { ascending: true });
          if (rows && rows.length > 0) {
            const typed = rows as PublishedSectionRow[];
            const overrides: Record<string, SectionOverride> = {};
            const order: string[] = [];
            for (const row of typed) {
              overrides[row.section_key] = {
                content: row.published_content ?? {},
                styles: row.published_styles ?? {},
                visible: row.is_visible,
              };
              order.push(row.section_key);
            }
            setSectionOverrides(overrides);
            setSectionOrder(order);
          }
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug, pageId]);

  const effectiveCompanyId = domainCompanyId ?? page?.company_id ?? null;

  const handleLogin = () => {
    if (onLoginProp) onLoginProp();
    else window.location.href = '/';
  };

  if (loading) return <LoadingScreen />;
  if (notFound || !page) return <NotFoundScreen />;

  const TemplateComponent = templateKey ? getTemplateComponent(templateKey) : null;
  if (TemplateComponent) {
    return (
      <TemplateComponent
        domainCompanyId={effectiveCompanyId}
        onDomainLogin={handleLogin}
        sectionOverrides={sectionOverrides}
        sectionOrder={sectionOrder}
        appIconUrl={page.app_icon_url || page.logo_url || null}
      />
    );
  }

  const mainColor = page.main_color || '#0ea5e9';
  const secondaryColor = page.secondary_color || '#10b981';

  return (
    <div className="min-h-screen flex flex-col" style={{ background: `linear-gradient(160deg, #0f172a 0%, #1e293b 50%, ${mainColor}08 100%)` }}>
      {/* Header */}
      <header className="w-full px-4 sm:px-6 py-4 sm:py-5 border-b border-white/5">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            {page.logo_url && (
              <img
                src={page.logo_url}
                alt=""
                className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl object-cover flex-shrink-0"
                style={{ border: `1px solid ${mainColor}40`, boxShadow: `0 2px 16px ${mainColor}20` }}
              />
            )}
            <span className="text-lg sm:text-xl font-bold text-white truncate">
              {page.title || 'Bienvenue'}
            </span>
          </div>
          <button
            onClick={() => setLoginOpen(true)}
            className="flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-sm sm:text-base font-semibold text-white transition-all duration-200 hover:scale-105 hover:shadow-lg flex-shrink-0"
            style={{ background: `linear-gradient(135deg, ${mainColor}, ${secondaryColor})`, boxShadow: `0 4px 20px ${mainColor}30` }}
          >
            <LogIn className="w-4 h-4" />
            Connexion
          </button>
        </div>
      </header>

      {/* Hero section */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-12 sm:py-20">
        <div className="max-w-4xl w-full">
          {page.hero_image_url && (
            <div className="relative mb-8 sm:mb-12 rounded-2xl overflow-hidden aspect-[21/9] max-h-[320px]">
              <img src={page.hero_image_url} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0" style={{ background: `linear-gradient(to top, #0f172aee 0%, transparent 60%)` }} />
            </div>
          )}

          <div className="text-center space-y-5 sm:space-y-6">
            {page.logo_url && !page.hero_image_url && (
              <div className="flex justify-center mb-4">
                <img
                  src={page.logo_url}
                  alt=""
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover"
                  style={{ border: `2px solid ${mainColor}30`, boxShadow: `0 4px 32px ${mainColor}20` }}
                />
              </div>
            )}
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold text-white leading-tight">
              {page.title || 'Bienvenue'}
            </h1>
            {page.subtitle && (
              <p className="text-lg sm:text-xl md:text-2xl font-medium" style={{ color: mainColor }}>
                {page.subtitle}
              </p>
            )}
            {page.welcome_message && (
              <p className="max-w-2xl mx-auto text-base sm:text-lg text-slate-400 leading-relaxed">
                {page.welcome_message}
              </p>
            )}
            <div className="pt-6 sm:pt-8">
              <button
                onClick={() => setLoginOpen(true)}
                className="group inline-flex items-center gap-2.5 px-8 sm:px-10 py-3.5 sm:py-4 rounded-xl text-base sm:text-lg font-semibold text-white transition-all duration-200 hover:scale-105 hover:shadow-xl"
                style={{ background: `linear-gradient(135deg, ${mainColor}, ${secondaryColor})`, boxShadow: `0 4px 24px ${mainColor}35` }}
              >
                <LogIn className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                Connexion
              </button>
            </div>
          </div>
        </div>
      </main>

      <footer className="py-4 sm:py-6 text-center text-xs sm:text-sm text-slate-500 px-4">
        &copy; {new Date().getFullYear()} {page.title || 'Bienvenue'}. Tous droits r&eacute;serv&eacute;s.
      </footer>

      <LoginModal isOpen={loginOpen} onClose={() => setLoginOpen(false)} onLogin={handleLogin} domainCompanyId={effectiveCompanyId} appIconUrl={page.app_icon_url || page.logo_url || null} />
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
    </div>
  );
}

function NotFoundScreen() {
  const isDomainAccess = !window.location.pathname.startsWith('/site/');
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8 text-red-400" />
        </div>
        <h1 className="text-2xl font-bold text-white">
          {isDomainAccess ? 'Site introuvable' : 'Page introuvable'}
        </h1>
        <p className="text-slate-400 text-sm max-w-sm">
          {isDomainAccess
            ? 'Ce domaine n\'est pas configure ou le site n\'est pas encore actif.'
            : 'Ce site n\'existe pas ou n\'est pas encore actif.'}
        </p>
        {!isDomainAccess && (
          <a href="/" className="inline-block mt-4 px-5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-sm font-medium text-white hover:bg-slate-700 transition-colors">
            Retour &agrave; l'accueil
          </a>
        )}
      </div>
    </div>
  );
}
