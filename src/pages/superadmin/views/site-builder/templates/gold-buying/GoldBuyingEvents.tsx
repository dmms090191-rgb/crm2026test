import { useState, useEffect, useRef } from 'react';
import { MapPin, Clock, Phone, Calendar, Navigation } from 'lucide-react';

const EVENTS = [
  {
    city: 'Erstein', zip: '67150', day: 'Lundi 8 Juin 2026',
    venue: 'Hotel Restaurant Crystal', address: '41-43 Avenue de la Gare',
    hours: '09h30 a 18h30 NON STOP',
  },
  {
    city: 'Obernai', zip: '67210', day: 'Mardi 9 Juin 2026',
    venue: 'Hotel La Diligence', address: '23 Place du Marche',
    hours: '09h30 a 18h30 NON STOP',
  },
  {
    city: 'Gerardmer', zip: '88400', day: 'Mercredi 10 Juin 2026',
    venue: 'Le Manoir au Lac', address: '59 Chemin de la Droite du Lac',
    hours: '09h30 a 18h30 NON STOP',
  },
  {
    city: 'Barr', zip: '67140', day: 'Jeudi 11 Juin 2026',
    venue: 'Hotel Le Manoir', address: '11 Rue Saint-Marc',
    hours: '09h30 a 18h30 NON STOP',
  },
];

interface Props {
  title?: string;
  subtitle?: string;
}

export default function GoldBuyingEvents({ title, subtitle }: Props = {}) {
  const [activeEvent, setActiveEvent] = useState(0);
  const [visibleCards, setVisibleCards] = useState<Set<number>>(new Set());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const idx = Number(entry.target.getAttribute('data-event'));
          if (!isNaN(idx)) setVisibleCards(prev => new Set(prev).add(idx));
        }
      });
    }, { threshold: 0.2 });

    const items = ref.current?.querySelectorAll('[data-event]');
    items?.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <section id="gold-events" className="relative py-24 overflow-hidden">
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, #0a0a0a, #0d0b08, #0a0a0a)' }} />

      <div ref={ref} className="relative z-10 max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <span className="text-xs font-bold tracking-[0.3em] uppercase" style={{ color: '#d4a017' }}>
            Prochains passages
          </span>
          <h2 className="text-3xl sm:text-4xl font-black mt-3 mb-4 text-white/90">
            {title ? title : (
              <>Nous serons dans{' '}
              <span className="text-transparent bg-clip-text" style={{
                background: 'linear-gradient(135deg, #f5d060, #d4a017)',
                WebkitBackgroundClip: 'text',
              }}>votre ville</span></>
            )}
          </h2>
          <p className="text-sm text-white/40 max-w-md mx-auto">
            {subtitle || 'Retrouvez-nous dans les villes ci-dessous. Sans rendez-vous, venez quand vous voulez.'}
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {EVENTS.map((e, i) => (
            <button key={i} onClick={() => setActiveEvent(i)}
              className="px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300"
              style={{
                background: activeEvent === i ? 'rgba(212,160,23,0.12)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${activeEvent === i ? 'rgba(212,160,23,0.3)' : 'rgba(255,255,255,0.06)'}`,
                color: activeEvent === i ? '#d4a017' : 'rgba(255,255,255,0.4)',
              }}>
              {e.city}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {EVENTS.map((event, i) => (
            <div
              key={i}
              data-event={i}
              className="relative rounded-2xl overflow-hidden transition-all duration-700 cursor-pointer"
              style={{
                background: activeEvent === i
                  ? 'linear-gradient(135deg, rgba(212,160,23,0.08), rgba(0,0,0,0))'
                  : 'rgba(255,255,255,0.015)',
                border: `1px solid ${activeEvent === i ? 'rgba(212,160,23,0.25)' : 'rgba(255,255,255,0.05)'}`,
                opacity: visibleCards.has(i) ? 1 : 0,
                transform: visibleCards.has(i) ? 'translateY(0)' : 'translateY(20px)',
                transitionDelay: `${i * 100}ms`,
                boxShadow: activeEvent === i ? '0 0 30px rgba(212,160,23,0.08)' : 'none',
              }}
              onClick={() => setActiveEvent(i)}
            >
              <div className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="w-4 h-4 flex-shrink-0" style={{ color: activeEvent === i ? '#d4a017' : 'rgba(255,255,255,0.3)' }} />
                  <span className="text-base font-black text-white/90">{event.city}</span>
                  <span className="text-[10px] font-semibold text-white/30">{event.zip}</span>
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#ef4444' }} />
                  <span className="text-xs font-bold" style={{ color: '#ef4444' }}>{event.day}</span>
                </div>

                <div className="space-y-1.5 mt-3">
                  <div className="flex items-start gap-2">
                    <Navigation className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.25)' }} />
                    <div>
                      <p className="text-[11px] font-semibold text-white/60">{event.venue}</p>
                      <p className="text-[10px] text-white/35">{event.address}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3 flex-shrink-0" style={{ color: '#d4a017' }} />
                    <span className="text-[11px] font-bold" style={{ color: '#d4a017' }}>{event.hours}</span>
                  </div>
                </div>
              </div>

              {activeEvent === i && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5"
                  style={{ background: 'linear-gradient(to right, #d4a017, #f5d060, #d4a017)' }} />
              )}
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl"
            style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
            <Phone className="w-3.5 h-3.5" style={{ color: '#ef4444' }} />
            <span className="text-xs text-white/50">Difficultes a nous trouver ?</span>
            <a href="tel:0981222566" className="text-xs font-bold" style={{ color: '#ef4444' }}>09 81 22 25 66</a>
          </div>
        </div>
      </div>
    </section>
  );
}
