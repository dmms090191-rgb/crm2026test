import { Users, ListChecks, FolderOpen, Calendar, MessageCircle, HeadphonesIcon, Star, Quote } from 'lucide-react';

const TRUST_ITEMS = [
  { icon: <Users className="w-5 h-5" />, title: 'Conseillers disponibles', desc: 'Un interlocuteur dedie repond a vos questions.' },
  { icon: <ListChecks className="w-5 h-5" />, title: 'Suivi etape par etape', desc: 'Chaque phase de votre projet est tracee et visible.' },
  { icon: <FolderOpen className="w-5 h-5" />, title: 'Documents centralises', desc: 'Devis, contrats et factures accessibles en ligne.' },
  { icon: <Calendar className="w-5 h-5" />, title: 'Rendez-vous organises', desc: 'Planification simple et rappels automatiques.' },
  { icon: <MessageCircle className="w-5 h-5" />, title: 'Communication claire', desc: 'Echangez avec votre conseiller depuis votre espace.' },
  { icon: <HeadphonesIcon className="w-5 h-5" />, title: 'Support client', desc: 'Assistance disponible a chaque etape du projet.' },
];

const TESTIMONIALS = [
  {
    name: 'Famille Cohen',
    text: "Nous avons compris les etapes, les couts et le suivi sans nous perdre dans les documents.",
    stars: 5,
  },
  {
    name: 'Mme Levy',
    text: "Le rendez-vous technique a ete simple a organiser et le suivi etait clair.",
    stars: 5,
  },
  {
    name: 'David M.',
    text: "J'ai pu comparer les options et recevoir une proposition adaptee a ma maison.",
    stars: 5,
  },
];

export default function RenewableTrust() {
  return (
    <section id="temoignages" className="relative py-20 sm:py-28">
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/3 w-[500px] h-[500px] rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(circle, #10b981, transparent 70%)' }} />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Trust heading */}
        <div className="text-center mb-12 sm:mb-16">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold mb-4"
            style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', color: '#34d399' }}>
            Confiance
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white mb-3">
            Un accompagnement serieux du premier contact au suivi final
          </h2>
        </div>

        {/* Trust grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-16 sm:mb-20">
          {TRUST_ITEMS.map((item, i) => (
            <div key={i} className="group rounded-2xl p-5 transition-all duration-300 hover:scale-[1.02]"
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 text-emerald-400 transition-transform duration-300 group-hover:scale-110"
                style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)' }}>
                {item.icon}
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-white mb-1">{item.title}</h3>
              <p className="text-[11px] text-slate-400 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Testimonials */}
        <div className="text-center mb-8 sm:mb-10">
          <h3 className="text-xl sm:text-2xl font-extrabold text-white mb-2">Ce que disent nos clients</h3>
          <p className="text-sm text-slate-400">Des retours concrets de clients accompagnes.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {TESTIMONIALS.map((t, i) => (
            <div key={i} className="group relative rounded-2xl p-6 transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1"
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
                boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
              }}>
              <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: 'radial-gradient(ellipse at top left, rgba(16,185,129,0.05), transparent 60%)' }} />

              <div className="relative">
                <Quote className="w-5 h-5 text-emerald-500/30 mb-3" />
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-4 italic">
                  "{t.text}"
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold text-emerald-400"
                      style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
                      {t.name.charAt(0)}
                    </div>
                    <span className="text-xs font-semibold text-white/70">{t.name}</span>
                  </div>
                  <div className="flex gap-0.5">
                    {Array.from({ length: t.stars }).map((_, si) => (
                      <Star key={si} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
