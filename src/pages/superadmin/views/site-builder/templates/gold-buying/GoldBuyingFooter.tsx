import { Phone, Mail, MapPin } from 'lucide-react';

interface Props {
  copyright?: string;
}

export default function GoldBuyingFooter({ copyright }: Props = {}) {
  return (
    <footer className="relative py-12 overflow-hidden">
      <div className="absolute inset-0 bg-[#050505]" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#d4a017]/20 to-transparent" />

      <div className="relative z-10 max-w-5xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
          <div className="text-center md:text-left">
            <h3 className="text-xl font-black text-white/80 mb-1">
              <span className="text-white/50">Compagnie de l'</span>
              <span className="text-transparent bg-clip-text" style={{
                background: 'linear-gradient(135deg, #f5d060, #d4a017)',
                WebkitBackgroundClip: 'text',
              }}>Or</span>
            </h3>
            <p className="text-xs text-white/30">Expert specialiste en metaux precieux</p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <a href="tel:0981222566" className="flex items-center gap-2 text-xs text-white/40 hover:text-white/60 transition-colors">
              <Phone className="w-3.5 h-3.5" style={{ color: '#d4a017' }} />
              09 81 22 25 66
            </a>
            <a href="mailto:contact@orexpert.fr" className="flex items-center gap-2 text-xs text-white/40 hover:text-white/60 transition-colors">
              <Mail className="w-3.5 h-3.5" style={{ color: '#d4a017' }} />
              contact@orexpert.fr
            </a>
            <span className="flex items-center gap-2 text-xs text-white/40">
              <MapPin className="w-3.5 h-3.5" style={{ color: '#d4a017' }} />
              Lyon, France
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />
          <div className="flex gap-1">
            <div className="w-1 h-1 rounded-full" style={{ background: '#002395' }} />
            <div className="w-1 h-1 rounded-full" style={{ background: '#ffffff40' }} />
            <div className="w-1 h-1 rounded-full" style={{ background: '#ED2939' }} />
          </div>
          <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />
        </div>

        <div className="text-center space-y-2">
          <p className="text-[10px] text-white/25">
            Societe Or Expert SAS - Capital social de 10.000 EUR - SIRET : 893 848 846 00018
          </p>
          <p className="text-[10px] text-white/25">
            Garantie des douanes n 21/066 - 8 rue Etienne Richerand, 69003 Lyon
          </p>
          <p className="text-[10px] text-white/20">
            &copy; {copyright || `${new Date().getFullYear()} Compagnie de l'Or. Tous droits reserves.`}
          </p>
        </div>
      </div>
    </footer>
  );
}
