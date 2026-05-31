import { useState, useEffect, useRef } from "react";
import { Zap, Menu, X, Rocket, LayoutGrid, RefreshCw, Headphones as HeadphonesIcon, CheckCircle2, ArrowRight, Smartphone, Download } from "lucide-react";
import TalvexDashboardMockup from "./TalvexDashboardMockup";
import TalvexFeatureTabs from "./TalvexFeatureTabs";
import TalvexFooter from "./TalvexFooter";
import { SectorsSection, HowItWorksSection, SupportSection, AiSection, SitesDomainsSection, TestimonialsSection, PricingWrapper, FinalCtaSection } from "./TalvexInteractiveSections";

interface Props {
  onLogin: () => void;
  onRegister: () => void;
}

const card = "bg-white/[0.02] border border-white/[0.06] rounded-2xl";
const gradText = "bg-gradient-to-r from-sky-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent";

export default function TalvexInteractiveWebsiteView({ onLogin, onRegister }: Props) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => setScrolled(!e.isIntersecting), { threshold: 1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const navLinks = [
    { label: "Fonctionnalites", href: "#features" },
    { label: "Secteurs", href: "#sectors" },
    { label: "IA", href: "#ai" },
    { label: "Tarifs", href: "#pricing" },
    { label: "Contact", href: "#contact" },
  ];

  return (
    <div className="min-h-screen bg-[#030712] text-white overflow-x-hidden">
      <div ref={sentinelRef} className="h-0" />
      {/* Header */}
      <header className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? "bg-[#030712]/80 backdrop-blur-xl border-b border-white/[0.06]" : "bg-transparent"}`}>
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 h-16">
          <a href="#" className="flex items-center gap-2 text-xl font-bold">
            <Zap className="w-6 h-6 text-cyan-400" />
            <span className={gradText}>Talvex</span>
          </a>
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((l) => (
              <a key={l.label} href={l.href} className="text-sm text-slate-400 hover:text-white transition">{l.label}</a>
            ))}
          </nav>
          <div className="hidden md:flex items-center gap-3">
            <button onClick={onRegister} className="text-sm text-slate-300 hover:text-white transition">Inscription</button>
            <button onClick={onLogin} className="text-sm px-4 py-2 rounded-lg bg-gradient-to-r from-sky-500 to-cyan-500 hover:opacity-90 transition font-medium">Connexion</button>
          </div>
          <button className="md:hidden text-slate-300" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
        {mobileOpen && (
          <div className="md:hidden bg-[#030712]/95 backdrop-blur-xl border-t border-white/[0.06] px-4 pb-4">
            {navLinks.map((l) => (
              <a key={l.label} href={l.href} className="block py-2 text-slate-400 hover:text-white transition" onClick={() => setMobileOpen(false)}>{l.label}</a>
            ))}
            <div className="flex flex-col gap-2 mt-3">
              <button onClick={() => { onRegister(); setMobileOpen(false); }} className="text-sm text-slate-300 py-2">Inscription</button>
              <button onClick={() => { onLogin(); setMobileOpen(false); }} className="text-sm px-4 py-2 rounded-lg bg-gradient-to-r from-sky-500 to-cyan-500 font-medium">Connexion</button>
            </div>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="overflow-hidden pt-12 pb-20 px-4">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6">
              Lancez, gérez et faites évoluer votre entreprise avec{" "}
              <span className={gradText}>Talvex</span>
            </h1>
            <p className="text-slate-400 text-lg mb-8">
              Configurez votre espace, choisissez un template de site, organisez vos prospects et faites évoluer votre plateforme selon vos besoins.
            </p>
            <div className="flex flex-wrap gap-3 mb-4">
              <button onClick={onRegister} className="px-6 py-3 rounded-lg bg-gradient-to-r from-sky-500 to-cyan-500 font-semibold hover:opacity-90 transition flex items-center gap-2">
                Commencer maintenant <ArrowRight className="w-4 h-4" />
              </button>
              <button className="px-6 py-3 rounded-lg border border-white/[0.1] text-slate-300 hover:bg-white/[0.04] transition">Voir la démo</button>
            </div>
            <div className="flex flex-wrap gap-3 mb-8">
              <button onClick={onLogin} className="text-sm text-cyan-400 hover:text-cyan-300 transition">Connexion</button>
              <button onClick={onRegister} className="text-sm text-cyan-400 hover:text-cyan-300 transition">Inscription</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {["Inscription rapide", "Site configurable", "CRM centralisé", "Support et évolution"].map((b) => (
                <span key={b} className="text-xs px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-slate-400">{b}</span>
              ))}
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-r from-sky-500/10 to-cyan-500/10 rounded-3xl blur-3xl" />
            <div className="relative"><TalvexDashboardMockup /></div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="overflow-hidden py-16 px-4">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { val: "1", label: "Plateforme centrale" },
            { val: "3", label: "Panels connectés" },
            { val: "6", label: "Modules clés" },
            { val: "24/48h", label: "Évolution" },
          ].map((s) => (
            <div key={s.label} className={`${card} p-6 text-center backdrop-blur-sm`}>
              <div className={`text-3xl font-bold mb-1 ${gradText}`}>{s.val}</div>
              <div className="text-slate-400 text-sm">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Quick Start */}
      <section className="overflow-hidden py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">Lancez votre espace en <span className={gradText}>quelques minutes</span></h2>
          <p className="text-slate-400 text-center mb-12 max-w-2xl mx-auto">Tout ce dont vous avez besoin pour démarrer rapidement.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Rocket, title: "Inscription rapide", text: "Une entreprise peut démarrer rapidement sur Talvex. Il suffit de créer un compte, et votre espace est prêt à être configuré." },
              { icon: LayoutGrid, title: "Site configurable", text: "Choisissez un template de site adapté à votre activité. Personnalisez-le à votre image, il est prêt à l'emploi." },
              { icon: RefreshCw, title: "Talvex vous suit", text: "Votre activité change ? Talvex s'adapte. Changez de template, ajoutez des services, demandez des améliorations." },
              { icon: HeadphonesIcon, title: "Support et évolution", text: "Un problème, une modification ? L'équipe Talvex traite vos demandes avec un objectif de 24/48h selon la complexité." },
            ].map((c) => (
              <div key={c.title} className={`${card} p-6 hover:bg-white/[0.04] transition group`}>
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-sky-500/20 to-cyan-500/20 flex items-center justify-center mb-4">
                  <c.icon className="w-5 h-5 text-cyan-400" />
                </div>
                <h3 className="font-semibold mb-2">{c.title}</h3>
                <p className="text-sm text-slate-400">{c.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Tabs */}
      <section className="overflow-hidden py-20 px-4" id="features">
        <div className="max-w-6xl mx-auto"><TalvexFeatureTabs /></div>
      </section>

      {/* Adapt */}
      <section className="overflow-hidden py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            Votre activité évolue ? <span className={gradText}>Talvex évolue avec vous.</span>
          </h2>
          <p className="text-slate-400 text-center mb-12 max-w-2xl mx-auto">
            Talvex s'adapte à chaque étape de votre croissance. Pas besoin de changer d'outil.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              "Vous changez de template de site en un clic",
              "Vous ajoutez un nouveau service",
              "Vous demandez une amélioration",
              "Vous adaptez votre espace à votre nouvelle activité",
              "Vous gardez vos clients et vos données au même endroit",
            ].map((t, i) => (
              <div key={i} className={`${card} p-5 flex items-start gap-3 hover:bg-white/[0.04] transition`}>
                <CheckCircle2 className="w-5 h-5 text-cyan-400 mt-0.5 shrink-0" />
                <span className="text-slate-300 text-sm">{t}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <SectorsSection />
      <HowItWorksSection />
      <SupportSection />
      <AiSection />
      <SitesDomainsSection />
      <TestimonialsSection />
      <PricingWrapper onLogin={onLogin} />
      <FinalCtaSection onLogin={onLogin} onRegister={onRegister} />

      {/* Download App */}
      <section className="overflow-hidden py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] mb-6">
            <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-xs text-slate-400 font-medium">Application mobile</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Gerez votre activite <span className={gradText}>partout</span>
          </h2>
          <p className="text-slate-400 text-lg mb-10 max-w-xl mx-auto">
            Retrouvez l'ensemble de vos outils Talvex dans votre poche. Leads, messagerie, rendez-vous — tout est accessible en un instant.
          </p>
          <div className="inline-flex flex-col items-center gap-3">
            <div
              className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl text-base font-bold cursor-not-allowed"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1.5px dashed rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.3)',
              }}
            >
              <Download className="w-5 h-5 opacity-50" />
              Telecharger l'application
            </div>
            <span className="text-xs text-slate-500">Telechargement bientot disponible</span>
          </div>
        </div>
      </section>

      <TalvexFooter onLogin={onLogin} onRegister={onRegister} />
    </div>
  );
}
