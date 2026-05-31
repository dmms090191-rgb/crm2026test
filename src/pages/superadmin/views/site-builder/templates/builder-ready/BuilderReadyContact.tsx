import { Phone, Mail, MapPin, Send, Clock, ArrowRight } from 'lucide-react';

interface Props {
  title?: string;
  subtitle?: string;
  phone?: string;
  email?: string;
  address?: string;
  buttonText?: string;
}

export default function BuilderReadyContact({
  title, subtitle, phone, email, address, buttonText,
}: Props) {
  const heading = title || 'Contactez-nous';
  const desc = subtitle || 'Une question, un projet ? Nous vous repondons sous 24h.';
  const phoneVal = phone || '01 23 45 67 89';
  const emailVal = email || 'contact@example.fr';
  const addressVal = address || '12 rue de la Paix, 75002 Paris';
  const btnText = buttonText || 'Envoyer le message';

  return (
    <section id="contact" className="relative py-20 sm:py-24 lg:py-32 overflow-hidden">
      <div className="absolute inset-0"
        style={{ background: 'linear-gradient(180deg, #111827 0%, #0c1220 50%, #0f172a 100%)' }} />

      {/* Top line */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[1px]"
        style={{ background: 'linear-gradient(to right, transparent, rgba(16,185,129,0.2), transparent)' }} />

      {/* Ambient glow */}
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full opacity-[0.04]"
        style={{ background: 'radial-gradient(circle, #10b981, transparent 65%)' }} />

      <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <span className="inline-block text-[10px] sm:text-[11px] font-bold tracking-[0.2em] uppercase mb-3 sm:mb-4"
            style={{ color: '#10b981' }}>
            Contact
          </span>

          <h2
            data-studio-field="contact-title"
            className="font-black leading-tight tracking-tight text-white/95"
            style={{ fontSize: 'clamp(1.5rem, 4vw, 2.75rem)' }}
          >
            {heading}
          </h2>

          <p
            data-studio-field="contact-subtitle"
            className="mt-4 sm:mt-5 text-sm sm:text-base lg:text-lg leading-relaxed"
            style={{ color: 'rgba(255,255,255,0.45)' }}
          >
            {desc}
          </p>
        </div>

        {/* Two-column layout: stacked on mobile, side-by-side on lg */}
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* Left: contact info */}
          <div className="lg:w-5/12 flex flex-col gap-3 sm:gap-4">
            <a
              data-studio-field="contact-phone"
              href={`tel:${phoneVal.replace(/\s/g, '')}`}
              className="flex items-center gap-4 p-4 sm:p-5 rounded-xl sm:rounded-2xl transition-all active:scale-[0.98] hover:border-emerald-500/20"
              style={{ background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.12)' }}
            >
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.18)' }}>
                <Phone className="w-5 h-5" style={{ color: '#10b981' }} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-[11px] font-semibold" style={{ color: 'rgba(255,255,255,0.4)' }}>Telephone</p>
                <p className="text-base sm:text-lg font-bold truncate" style={{ color: '#10b981' }}>{phoneVal}</p>
              </div>
              <ArrowRight className="w-4 h-4 ml-auto flex-shrink-0" style={{ color: 'rgba(16,185,129,0.4)' }} />
            </a>

            <a
              data-studio-field="contact-email"
              href={`mailto:${emailVal}`}
              className="flex items-center gap-4 p-4 sm:p-5 rounded-xl sm:rounded-2xl transition-all active:scale-[0.98] hover:border-white/10"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <Mail className="w-5 h-5" style={{ color: 'rgba(255,255,255,0.5)' }} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-[11px] font-semibold" style={{ color: 'rgba(255,255,255,0.4)' }}>Email</p>
                <p className="text-sm sm:text-[15px] font-bold text-white/80 truncate">{emailVal}</p>
              </div>
              <ArrowRight className="w-4 h-4 ml-auto flex-shrink-0" style={{ color: 'rgba(255,255,255,0.15)' }} />
            </a>

            <div
              data-studio-field="contact-address"
              className="flex items-center gap-4 p-4 sm:p-5 rounded-xl sm:rounded-2xl"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <MapPin className="w-5 h-5" style={{ color: 'rgba(255,255,255,0.5)' }} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-[11px] font-semibold" style={{ color: 'rgba(255,255,255,0.4)' }}>Adresse</p>
                <p className="text-sm sm:text-[15px] font-bold text-white/80">{addressVal}</p>
              </div>
            </div>

            {/* Quick info badges */}
            <div className="flex flex-wrap items-center gap-3 pt-2 px-1">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3 h-3" style={{ color: '#10b981' }} />
                <span className="text-[10px] sm:text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>Reponse sous 24h</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Send className="w-3 h-3" style={{ color: '#10b981' }} />
                <span className="text-[10px] sm:text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>Devis gratuit</span>
              </div>
            </div>
          </div>

          {/* Right: form */}
          <div
            className="flex-1 rounded-xl sm:rounded-2xl p-5 sm:p-7 lg:p-8"
            style={{
              background: 'linear-gradient(160deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))',
              border: '1px solid rgba(255,255,255,0.06)',
              boxShadow: '0 8px 40px rgba(0,0,0,0.15)',
            }}
          >
            <div className="flex items-center gap-2.5 mb-6 sm:mb-8">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.2)' }}>
                <Send className="w-4 h-4" style={{ color: '#0ea5e9' }} />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-white/85">Envoyez-nous un message</h3>
            </div>

            <div className="space-y-4 sm:space-y-5">
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-5">
                <FormField label="Nom" placeholder="Votre nom" type="text" />
                <FormField label="Email" placeholder="votre@email.fr" type="email" />
              </div>
              <FormField label="Telephone" placeholder="06 12 34 56 78" type="tel" />
              <div>
                <label className="block text-[10px] sm:text-[11px] font-bold tracking-wider uppercase mb-2"
                  style={{ color: 'rgba(255,255,255,0.35)' }}>Message</label>
                <textarea placeholder="Decrivez votre projet ou votre question..." rows={4}
                  className="w-full px-4 py-3 sm:py-3.5 rounded-lg sm:rounded-xl text-sm outline-none transition-all resize-none focus:border-sky-500/30"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.8)' }} />
              </div>
              <button
                data-studio-field="contact-button_text"
                className="w-full flex items-center justify-center gap-2.5 px-6 py-4 rounded-xl text-sm sm:text-[15px] font-bold transition-all active:scale-[0.98] hover:brightness-110 hover:shadow-lg"
                style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', color: '#fff', boxShadow: '0 4px 24px rgba(14,165,233,0.3)' }}>
                <Send className="w-4 h-4" />
                {btnText}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom padding gradient into next section */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />
    </section>
  );
}

function FormField({ label, placeholder, type }: { label: string; placeholder: string; type: string }) {
  return (
    <div className="flex-1">
      <label className="block text-[10px] sm:text-[11px] font-bold tracking-wider uppercase mb-2"
        style={{ color: 'rgba(255,255,255,0.35)' }}>{label}</label>
      <input type={type} placeholder={placeholder}
        className="w-full px-4 py-3 sm:py-3.5 rounded-lg sm:rounded-xl text-sm outline-none transition-all focus:border-sky-500/30"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.8)' }} />
    </div>
  );
}
