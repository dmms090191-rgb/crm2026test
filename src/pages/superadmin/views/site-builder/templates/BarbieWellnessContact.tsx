import { Sparkles, CheckCircle2, Send, Phone, Mail, User } from 'lucide-react';

interface Props {
  form: { nom: string; tel: string; email: string; objectif: string };
  setForm: React.Dispatch<React.SetStateAction<{ nom: string; tel: string; email: string; objectif: string }>>;
  sent: boolean;
  setSent: (v: boolean) => void;
}

export default function BarbieWellnessContact({ form, setForm, sent, setSent }: Props) {
  return (
    <>
      {/* ========== CONTACT ========== */}
      <section id="contact" className="relative py-16 sm:py-24 lg:py-32 overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(56,168,181,0.15), rgba(111,83,98,0.1), transparent)' }} />
        <div className="absolute top-[30%] right-[-10%] w-[250px] h-[250px] sm:w-[350px] sm:h-[350px] lg:w-[450px] lg:h-[450px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(56,168,181,0.1) 0%, transparent 70%)', animation: 'bw-halo-breathe 10s ease-in-out infinite' }} />
        <div className="absolute bottom-[10%] left-[-8%] w-[200px] h-[200px] sm:w-[280px] sm:h-[280px] lg:w-[380px] lg:h-[380px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(111,83,98,0.08) 0%, transparent 70%)', animation: 'bw-aurora 14s ease-in-out infinite reverse' }} />

        <div className="relative max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10 sm:mb-14">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-5 sm:mb-6"
              style={{ background: 'rgba(56,168,181,0.08)', backdropFilter: 'blur(12px)', border: '1px solid rgba(56,168,181,0.15)' }}>
              <Send className="w-3.5 h-3.5" style={{ color: '#38A8B5' }} />
              <span className="text-[10px] sm:text-xs font-semibold tracking-widest uppercase" style={{ color: '#5a8f96' }}>Contact</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-5" style={{ color: '#3d4f5a' }}>
              Prete a{' '}
              <span className="bw-gradient-text">commencer</span>
              <span style={{ color: '#3d4f5a' }}> ?</span>
            </h2>
            <p className="text-sm sm:text-base max-w-lg mx-auto leading-relaxed font-light px-2 sm:px-0" style={{ color: '#7a8e98' }}>
              Laissez vos coordonnees et notre equipe vous recontactera personnellement.
            </p>
          </div>

          {sent ? (
            <div className="rounded-2xl bw-glass p-8 sm:p-12 text-center">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-5 sm:mb-6"
                style={{ background: 'linear-gradient(135deg, rgba(56,168,181,0.12), rgba(111,83,98,0.06))', border: '1px solid rgba(56,168,181,0.15)' }}>
                <CheckCircle2 className="w-7 h-7 sm:w-8 sm:h-8" style={{ color: '#38A8B5' }} />
              </div>
              <h3 className="text-lg sm:text-xl font-bold mb-3" style={{ color: '#3d4f5a' }}>Message envoye</h3>
              <p className="text-xs sm:text-sm" style={{ color: '#7a8e98' }}>Merci ! Notre equipe vous recontactera tres prochainement.</p>
            </div>
          ) : (
            <div className="rounded-2xl bw-glass p-5 sm:p-8 md:p-10">
              <div className="space-y-4 sm:space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                  <div>
                    <label className="flex items-center gap-2 text-[10px] sm:text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#6b7f8a' }}>
                      <User className="w-3 h-3" /> Nom
                    </label>
                    <input
                      type="text"
                      value={form.nom}
                      onChange={e => setForm(p => ({ ...p, nom: e.target.value }))}
                      placeholder="Votre nom"
                      className="bw-input w-full px-4 sm:px-5 py-3 sm:py-3.5 rounded-xl text-sm transition-all"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-[10px] sm:text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#6b7f8a' }}>
                      <Phone className="w-3 h-3" /> Telephone
                    </label>
                    <input
                      type="tel"
                      value={form.tel}
                      onChange={e => setForm(p => ({ ...p, tel: e.target.value }))}
                      placeholder="06 12 34 56 78"
                      className="bw-input w-full px-4 sm:px-5 py-3 sm:py-3.5 rounded-xl text-sm transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="flex items-center gap-2 text-[10px] sm:text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#6b7f8a' }}>
                    <Mail className="w-3 h-3" /> Email
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                    placeholder="votre@email.com"
                    className="bw-input w-full px-4 sm:px-5 py-3 sm:py-3.5 rounded-xl text-sm transition-all"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-[10px] sm:text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#6b7f8a' }}>
                    <Sparkles className="w-3 h-3" /> Votre objectif
                  </label>
                  <textarea
                    value={form.objectif}
                    onChange={e => setForm(p => ({ ...p, objectif: e.target.value }))}
                    placeholder="Dites-nous ce que vous recherchez..."
                    rows={3}
                    className="bw-input w-full px-4 sm:px-5 py-3 sm:py-3.5 rounded-xl text-sm transition-all resize-none"
                  />
                </div>
                <button
                  onClick={() => setSent(true)}
                  className="group w-full bw-btn-primary flex items-center justify-center gap-3 px-7 sm:px-8 py-3.5 sm:py-4 rounded-xl text-white font-semibold text-sm tracking-wide transition-all duration-300 relative z-10">
                  <span className="relative z-10 flex items-center gap-3">
                    Etre recontactee
                    <Send className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
