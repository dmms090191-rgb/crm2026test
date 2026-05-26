import { Sun, Thermometer, Dumbbell, Home, Hammer, ShieldCheck, GraduationCap, MapPin, BrainCircuit, MessageSquare, PenTool, Bot, Eye, Globe, ArrowRight, CheckCircle2, Star, LayoutGrid } from "lucide-react";
import TalvexPricingSection from "./TalvexPricingSection";

const card = "bg-white/[0.02] border border-white/[0.06] rounded-2xl";
const gradText = "bg-gradient-to-r from-sky-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent";

export function SectorsSection() {
  return (
    <section className="overflow-hidden py-20 px-4" id="sectors">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">Conçu pour <span className={gradText}>votre secteur</span></h2>
        <p className="text-slate-400 text-center mb-12 max-w-2xl mx-auto">Talvex est pensé pour les entreprises locales de tous secteurs.</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Sun, label: "Énergie renouvelable" },
            { icon: Thermometer, label: "Pompe à chaleur" },
            { icon: Dumbbell, label: "Fitness / Musculation" },
            { icon: Home, label: "Immobilier" },
            { icon: Hammer, label: "Rénovation" },
            { icon: ShieldCheck, label: "Assurance" },
            { icon: GraduationCap, label: "Formation" },
            { icon: MapPin, label: "Services locaux" },
          ].map((s) => (
            <div key={s.label} className={`${card} p-5 flex flex-col items-center text-center gap-3 hover:bg-white/[0.04] hover:border-cyan-500/20 transition cursor-default`}>
              <s.icon className="w-7 h-7 text-cyan-400" />
              <span className="text-sm text-slate-300">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function HowItWorksSection() {
  return (
    <section className="overflow-hidden py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Comment ça <span className={gradText}>fonctionne</span></h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { n: "1", title: "Créez votre espace", text: "Votre société est configurée en quelques minutes. Vous accédez immédiatement à votre panel d'administration." },
            { n: "2", title: "Choisissez votre site et gérez vos prospects", text: "Vous choisissez un template de site adapté à votre activité. Vous gérez vos prospects depuis un CRM centralisé." },
            { n: "3", title: "Faites évoluer votre plateforme", text: "Votre activité change ? Talvex peut adapter votre espace, vos outils et votre site à tout moment." },
          ].map((s) => (
            <div key={s.n} className="text-center">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-sky-500 to-cyan-500 flex items-center justify-center text-xl font-bold mx-auto mb-4">{s.n}</div>
              <h3 className="font-semibold text-lg mb-2">{s.title}</h3>
              <p className="text-sm text-slate-400">{s.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function SupportSection() {
  return (
    <section className="overflow-hidden py-20 px-4" id="contact">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
          Un souci ? Une idée ? <span className={gradText}>Talvex vous accompagne</span>
        </h2>
        <p className="text-slate-400 text-center mb-12 max-w-2xl mx-auto">
          Traitement rapide, objectif 24/48h selon la demande. Notre équipe est là pour vous aider à chaque étape.
        </p>
        <div className="flex flex-col md:flex-row gap-4">
          {[
            { step: "1", title: "Vous décrivez le besoin" },
            { step: "2", title: "Talvex analyse la demande" },
            { step: "3", title: "La demande est traitée" },
            { step: "4", title: "Votre plateforme évolue" },
          ].map((s, i) => (
            <div key={s.step} className={`${card} p-5 flex-1 text-center backdrop-blur-sm`}>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-500 to-cyan-500 flex items-center justify-center text-sm font-bold mx-auto mb-3">{s.step}</div>
              <p className="text-sm text-slate-300">{s.title}</p>
              {i < 3 && <ArrowRight className="w-4 h-4 text-slate-600 mx-auto mt-3 hidden md:block" />}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function AiSection() {
  return (
    <section className="overflow-hidden py-20 px-4" id="ai">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
          Une IA pensée pour <span className={gradText}>accompagner les petites entreprises</span>
        </h2>
        <p className="text-slate-400 text-center mb-12 max-w-2xl mx-auto">
          Des outils intelligents intégrés pour vous aider à gagner du temps et convertir plus de prospects.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: BrainCircuit, title: "Qualification de leads", text: "L'IA analyse et qualifie vos prospects automatiquement selon leur potentiel." },
            { icon: MessageSquare, title: "Réponses assistées", text: "Générez des réponses professionnelles en un clic pour vos messages clients." },
            { icon: PenTool, title: "Création de contenu", text: "Créez des descriptions, emails et textes marketing adaptés à votre activité." },
            { icon: Bot, title: "Automatisations futures", text: "Des automatisations intelligentes viendront enrichir votre workflow." },
          ].map((c) => (
            <div key={c.title} className={`${card} p-6 hover:bg-white/[0.04] transition`}>
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
  );
}

export function SitesDomainsSection() {
  return (
    <section className="overflow-hidden py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">Un site pour <span className={gradText}>chaque entreprise</span></h2>
        <p className="text-slate-400 text-center mb-12 max-w-2xl mx-auto">
          Chaque entreprise dispose de son propre site web, personnalisable et hébergé par Talvex.
        </p>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { icon: LayoutGrid, title: "Templates site", text: "Choisissez parmi une collection de templates professionnels adaptés à votre secteur." },
            { icon: Eye, title: "Aperçu du site", text: "Visualisez votre site en temps réel avant de le publier. Ajustez chaque détail." },
            { icon: Globe, title: "Domaine personnalisé", text: "Connectez votre propre nom de domaine pour une identité professionnelle complète." },
          ].map((c) => (
            <div key={c.title} className={`${card} p-6 hover:bg-white/[0.04] transition`}>
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
  );
}

export function TestimonialsSection() {
  return (
    <section className="overflow-hidden py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Ce que disent <span className={gradText}>nos utilisateurs</span></h2>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { name: "Marc D. - Société rénovation", quote: "Talvex nous a permis de centraliser tous nos prospects et de suivre chaque chantier efficacement. En quelques jours, on était opérationnels." },
            { name: "Julie R. - Énergie renouvelable", quote: "Le site template était parfait pour notre activité. On a pu le personnaliser et commencer à recevoir des leads immédiatement." },
            { name: "Thomas L. - Coach fitness", quote: "Simple, rapide, efficace. Je gère mes clients, mes rendez-vous et mon site depuis un seul endroit. Exactement ce qu'il me fallait." },
          ].map((t) => (
            <div key={t.name} className={`${card} p-6 backdrop-blur-sm`}>
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 text-cyan-400 fill-cyan-400" />)}
              </div>
              <p className="text-sm text-slate-400 mb-4 italic">"{t.quote}"</p>
              <p className="text-sm font-medium text-slate-300">{t.name}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function PricingWrapper({ onLogin }: { onLogin: () => void }) {
  return (
    <section className="overflow-hidden py-20 px-4" id="pricing">
      <div className="max-w-6xl mx-auto"><TalvexPricingSection onLogin={onLogin} /></div>
    </section>
  );
}

export function FinalCtaSection({ onLogin, onRegister }: { onLogin: () => void; onRegister: () => void }) {
  return (
    <section className="overflow-hidden py-20 px-4">
      <div className="max-w-6xl mx-auto text-center">
        <div className={`${card} p-12 md:p-16 backdrop-blur-sm relative`}>
          <div className="absolute inset-0 bg-gradient-to-r from-sky-500/5 to-cyan-500/5 rounded-2xl" />
          <div className="relative">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Prêt à lancer votre espace <span className={gradText}>Talvex</span> ?
            </h2>
            <p className="text-slate-400 mb-8 max-w-xl mx-auto">
              Rejoignez les entreprises qui utilisent Talvex pour gérer et développer leur activité au quotidien.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <button onClick={onLogin} className="px-6 py-3 rounded-lg bg-gradient-to-r from-sky-500 to-cyan-500 font-semibold hover:opacity-90 transition">Connexion</button>
              <button onClick={onRegister} className="px-6 py-3 rounded-lg border border-white/[0.1] text-slate-300 hover:bg-white/[0.04] transition">Inscription</button>
              <button className="px-6 py-3 rounded-lg border border-white/[0.1] text-slate-300 hover:bg-white/[0.04] transition">Voir la démo</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
