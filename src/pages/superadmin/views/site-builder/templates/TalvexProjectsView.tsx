import { Globe, Zap, Bot, Search, Monitor, BookOpen, Activity, Layers, Clock, Store, Rocket } from 'lucide-react';

const PROJECTS = [
  {
    icon: <Globe className="w-5 h-5" />,
    title: 'Sites & Templates',
    color: '#0ea5e9',
    items: [
      'Templates sectoriels personnalisables',
      'Éditeur visuel simplifié',
      'Prévisualisation en temps réel',
      'Multi-sites par société',
      'Pages dynamiques liées au CRM',
    ],
  },
  {
    icon: <Zap className="w-5 h-5" />,
    title: 'IA Talvex',
    color: '#06b6d4',
    items: [
      'Qualification automatique des leads',
      'Réponses assistées par IA',
      'Analyse de conversations',
      'Suggestions d\'actions commerciales',
      'Cerveau IA configurable par société',
    ],
  },
  {
    icon: <Bot className="w-5 h-5" />,
    title: 'Automatisations',
    color: '#10b981',
    items: [
      'Relances automatiques de leads',
      'Notifications intelligentes',
      'Workflow personnalisables',
      'Déclencheurs conditionnels',
      'Rapports automatisés',
    ],
  },
  {
    icon: <Search className="w-5 h-5" />,
    title: 'Prospection IA',
    color: '#f59e0b',
    items: [
      'Recherche de prospects ciblée',
      'Enrichissement automatique',
      'Scoring de leads',
      'Détection d\'opportunités',
      'Import intelligent',
    ],
  },
  {
    icon: <Monitor className="w-5 h-5" />,
    title: 'Mode démo en direct',
    color: '#8b5cf6',
    items: [
      'Démonstration guidée pour prospects',
      'Contrôle à distance du curseur',
      'Navigation synchronisée',
      'Mode smartphone simulé',
      'Sessions enregistrables',
    ],
  },
  {
    icon: <BookOpen className="w-5 h-5" />,
    title: 'Prise en main / Formation',
    color: '#ec4899',
    items: [
      'Tutoriels intégrés',
      'Guides pas à pas',
      'Documentation contextuelle',
      'Vidéos de formation',
      'Checklist de démarrage',
    ],
  },
  {
    icon: <Activity className="w-5 h-5" />,
    title: 'Santé des données',
    color: '#ef4444',
    items: [
      'Audit automatique des données',
      'Détection de doublons',
      'Nettoyage de la base',
      'Score de qualité',
      'Alertes proactives',
    ],
  },
  {
    icon: <Layers className="w-5 h-5" />,
    title: 'Technologies et modules',
    color: '#0ea5e9',
    items: [
      'Architecture modulaire',
      'API connectées',
      'Supabase & Edge Functions',
      'Temps réel & notifications push',
      'Performance optimisée',
    ],
  },
  {
    icon: <Clock className="w-5 h-5" />,
    title: 'Évolution continue 24/48h',
    color: '#06b6d4',
    items: [
      'Demandes d\'amélioration traitées rapidement',
      'Suivi clair des demandes',
      'Priorités transparentes',
      'Mises à jour régulières',
      'Communication directe',
    ],
  },
  {
    icon: <Store className="w-5 h-5" />,
    title: 'Marketplace / Templates / Modules',
    color: '#10b981',
    items: [
      'Catalogue de templates',
      'Modules complémentaires',
      'Extensions sectorielles',
      'Intégrations tierces',
      'Personnalisations avancées',
    ],
  },
];

export default function TalvexProjectsView() {
  return (
    <div className="space-y-0">
      {/* Hero */}
      <section className="relative py-16 sm:py-24 px-4 sm:px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-sky-500/3" />
        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold mb-6">
            <Rocket className="w-3.5 h-3.5" />
            Nos projets
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold text-white leading-tight mb-5">
            Nos projets pour faire évoluer{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-sky-400">
              Talvex
            </span>
          </h1>
          <p className="text-sm sm:text-lg text-slate-400 max-w-3xl mx-auto leading-relaxed">
            Talvex avance étape par étape : d'abord une base stable, puis des modules intelligents pour aider les entreprises à mieux vendre, mieux s'organiser et mieux suivre leurs clients.
          </p>
        </div>
      </section>

      {/* Projects grid */}
      <section className="py-8 sm:py-12 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4">
          {PROJECTS.map((p, i) => (
            <div
              key={i}
              className="rounded-2xl p-5 sm:p-6 border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-all group"
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${p.color}12`, border: `1px solid ${p.color}25` }}
                >
                  <span style={{ color: p.color }}>{p.icon}</span>
                </div>
                <h3 className="text-sm sm:text-base font-bold text-white">{p.title}</h3>
              </div>
              <ul className="space-y-2">
                {p.items.map((item, j) => (
                  <li key={j} className="flex items-center gap-2.5">
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: p.color }} />
                    <span className="text-xs sm:text-sm text-slate-400">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Final message */}
      <section className="py-12 sm:py-20 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto rounded-2xl p-8 sm:p-12 text-center border border-cyan-500/20" style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.08), rgba(14,165,233,0.04))' }}>
          <Rocket className="w-8 h-8 text-cyan-400 mx-auto mb-4" />
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-xl mx-auto">
            Talvex est construit pour avancer avec les entreprises. La plateforme commence par une base solide, puis évolue progressivement vers une solution complète : CRM, sites, domaines, IA, automatisations, accompagnement, données et croissance.
          </p>
        </div>
      </section>
    </div>
  );
}
