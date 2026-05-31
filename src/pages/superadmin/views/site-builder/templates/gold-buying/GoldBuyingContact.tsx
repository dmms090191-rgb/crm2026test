import { Phone, Mail, MapPin, Clock, Send, Home } from 'lucide-react';

interface Props {
  title?: string;
  address?: string;
  phone?: string;
  email?: string;
}

export default function GoldBuyingContact({ title, address, phone, email }: Props = {}) {
  return (
    <section id="gold-contact" className="relative py-24 overflow-hidden">
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, #0a0a0a, #0d0b08, #0a0a0a)' }} />

      <div className="relative z-10 max-w-5xl mx-auto px-6">
        <div className="text-center mb-16">
          <span className="text-xs font-bold tracking-[0.3em] uppercase" style={{ color: '#d4a017' }}>
            Contactez-nous
          </span>
          <h2 data-studio-field="contact-title" className="text-3xl sm:text-4xl font-black mt-3 mb-4 text-white/90">
            {title ? (
              <span className="text-transparent bg-clip-text" style={{
                background: 'linear-gradient(135deg, #f5d060, #d4a017)',
                WebkitBackgroundClip: 'text',
              }}>{title}</span>
            ) : (
              <>Expertise a{' '}
              <span className="text-transparent bg-clip-text" style={{
                background: 'linear-gradient(135deg, #f5d060, #d4a017)',
                WebkitBackgroundClip: 'text',
              }}>domicile gratuite</span></>
            )}
          </h2>
          <p className="text-sm text-white/40 max-w-lg mx-auto">
            Vous ne pouvez pas vous deplacer ? Contactez-nous pour convenir d'un rendez-vous.
            Nous pouvons aussi vous envoyer un kit d'envoi postal securise.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <a data-studio-field="contact-phone" href={`tel:${(phone || '09 81 22 25 66').replace(/\s/g, '')}`}
              className="flex items-center gap-4 p-5 rounded-2xl transition-all duration-300 group"
              style={{ background: 'rgba(212,160,23,0.04)', border: '1px solid rgba(212,160,23,0.12)' }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-110"
                style={{ background: 'rgba(212,160,23,0.1)', border: '1px solid rgba(212,160,23,0.2)' }}>
                <Phone className="w-5 h-5" style={{ color: '#d4a017' }} />
              </div>
              <div>
                <p className="text-xs font-semibold text-white/50 mb-0.5">Telephone</p>
                <p className="text-lg font-black" style={{ color: '#d4a017' }}>{phone || '09 81 22 25 66'}</p>
              </div>
            </a>

            <a data-studio-field="contact-email" href={`mailto:${email || 'contact@orexpert.fr'}`}
              className="flex items-center gap-4 p-5 rounded-2xl transition-all duration-300 group"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-110"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <Mail className="w-5 h-5 text-white/50" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white/50 mb-0.5">Email</p>
                <p className="text-sm font-bold text-white/80">{email || 'contact@orexpert.fr'}</p>
              </div>
            </a>

            <div data-studio-field="contact-address" className="flex items-center gap-4 p-5 rounded-2xl"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <MapPin className="w-5 h-5 text-white/50" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white/50 mb-0.5">Siege social</p>
                {address ? (
                  <p className="text-sm font-bold text-white/80">{address}</p>
                ) : (
                  <>
                    <p className="text-sm font-bold text-white/80">8 rue Etienne Richerand</p>
                    <p className="text-xs text-white/40">69003 Lyon</p>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl p-6" style={{ background: 'rgba(212,160,23,0.03)', border: '1px solid rgba(212,160,23,0.1)' }}>
            <div className="flex items-center gap-2 mb-6">
              <Send className="w-4 h-4" style={{ color: '#d4a017' }} />
              <h3 className="text-sm font-bold text-white/80">Demander une expertise a domicile</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold tracking-wider uppercase mb-1.5 text-white/40">Nom complet</label>
                <input type="text" placeholder="Jean Dupont"
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all focus:ring-1"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.8)', focusRingColor: '#d4a017' }} />
              </div>
              <div>
                <label className="block text-[10px] font-bold tracking-wider uppercase mb-1.5 text-white/40">Telephone</label>
                <input type="tel" placeholder="06 12 34 56 78"
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all focus:ring-1"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.8)' }} />
              </div>
              <div>
                <label className="block text-[10px] font-bold tracking-wider uppercase mb-1.5 text-white/40">Ville</label>
                <input type="text" placeholder="Strasbourg"
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all focus:ring-1"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.8)' }} />
              </div>
              <div>
                <label className="block text-[10px] font-bold tracking-wider uppercase mb-1.5 text-white/40">Description des objets</label>
                <textarea placeholder="Decrivez brievement les objets que vous souhaitez faire expertiser..." rows={3}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all resize-none focus:ring-1"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.8)' }} />
              </div>
              <button className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-bold transition-all duration-300"
                style={{ background: 'linear-gradient(135deg, #d4a017, #b8860b)', color: '#0a0a0a', boxShadow: '0 0 20px rgba(212,160,23,0.15)' }}>
                <Home className="w-4 h-4" />
                Demander un rendez-vous
              </button>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap justify-center gap-6">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5" style={{ color: '#d4a017' }} />
            <span className="text-xs text-white/40">Reponse sous 24h</span>
          </div>
          <div className="flex items-center gap-2">
            <Home className="w-3.5 h-3.5" style={{ color: '#d4a017' }} />
            <span className="text-xs text-white/40">Deplacement gratuit</span>
          </div>
          <div className="flex items-center gap-2">
            <Send className="w-3.5 h-3.5" style={{ color: '#d4a017' }} />
            <span className="text-xs text-white/40">Kit postal securise disponible</span>
          </div>
        </div>
      </div>
    </section>
  );
}
