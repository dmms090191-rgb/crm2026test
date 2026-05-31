import { Briefcase, BarChart3, Shield, Zap, Headphones, Globe } from 'lucide-react';

const DEFAULT_SERVICES = [
  { icon: Briefcase, title: 'Gestion simplifiee', desc: 'Centralisez vos clients, vos rendez-vous et votre activite en un seul espace.', accent: '#0ea5e9' },
  { icon: BarChart3, title: 'Suivi en temps reel', desc: 'Visualisez vos indicateurs cles et prenez des decisions eclairees.', accent: '#10b981' },
  { icon: Shield, title: 'Securite totale', desc: 'Vos donnees sont protegees et sauvegardees automatiquement.', accent: '#f59e0b' },
  { icon: Zap, title: 'Automatisation', desc: 'Gagnez du temps avec des processus automatises et intelligents.', accent: '#0ea5e9' },
  { icon: Headphones, title: 'Support dedie', desc: 'Un accompagnement humain, reactif et disponible pour vous aider.', accent: '#10b981' },
  { icon: Globe, title: 'Accessible partout', desc: 'Travaillez depuis n\'importe quel appareil, a tout moment.', accent: '#f59e0b' },
];

interface Props {
  title?: string;
  subtitle?: string;
}

export default function BuilderReadyServices({ title, subtitle }: Props) {
  const heading = title || 'Tout ce dont vous avez besoin';
  const desc = subtitle || 'Des outils concus pour simplifier votre quotidien et faire grandir votre activite.';

  return (
    <section id="services" className="relative py-20 sm:py-24 lg:py-32 overflow-hidden">
      <div className="absolute inset-0"
        style={{ background: 'linear-gradient(180deg, #111827 0%, #0f172a 50%, #111827 100%)' }} />

      {/* Subtle accent */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[1px]"
        style={{ background: 'linear-gradient(to right, transparent, rgba(14,165,233,0.2), transparent)' }} />

      <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16 lg:mb-20">
          <span className="inline-block text-[10px] sm:text-[11px] font-bold tracking-[0.2em] uppercase mb-3 sm:mb-4"
            style={{ color: '#0ea5e9' }}>
            Nos services
          </span>

          <h2
            data-studio-field="services-title"
            className="font-black leading-tight tracking-tight text-white/95"
            style={{ fontSize: 'clamp(1.5rem, 4vw, 2.75rem)' }}
          >
            {heading}
          </h2>

          <p
            data-studio-field="services-subtitle"
            className="mt-4 sm:mt-5 text-sm sm:text-base lg:text-lg leading-relaxed"
            style={{ color: 'rgba(255,255,255,0.45)' }}
          >
            {desc}
          </p>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
          {DEFAULT_SERVICES.map((service, i) => (
            <ServiceCard key={i} service={service} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ServiceCard({ service, index }: { service: typeof DEFAULT_SERVICES[number]; index: number }) {
  const Icon = service.icon;
  const isAccented = index < 3;

  return (
    <div
      className="group rounded-xl sm:rounded-2xl p-5 sm:p-6 lg:p-7 transition-all duration-300 hover:-translate-y-1"
      style={{
        background: isAccented
          ? `linear-gradient(160deg, ${service.accent}08, transparent 60%)`
          : 'rgba(255,255,255,0.02)',
        border: `1px solid ${isAccented ? service.accent + '15' : 'rgba(255,255,255,0.06)'}`,
        boxShadow: '0 2px 20px rgba(0,0,0,0.1)',
      }}
    >
      <div
        className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center mb-4 sm:mb-5 transition-transform duration-300 group-hover:scale-110"
        style={{
          background: `${service.accent}10`,
          border: `1px solid ${service.accent}20`,
          boxShadow: `0 0 20px ${service.accent}08`,
        }}
      >
        <Icon className="w-5 h-5" style={{ color: service.accent }} />
      </div>

      <h3 className="text-sm sm:text-[15px] font-bold text-white/90 mb-2">
        {service.title}
      </h3>

      <p className="text-xs sm:text-[13px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>
        {service.desc}
      </p>
    </div>
  );
}
