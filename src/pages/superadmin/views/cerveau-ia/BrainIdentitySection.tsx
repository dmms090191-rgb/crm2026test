import { Building2, Globe, Phone, Mail, MapPin, Briefcase, Languages } from 'lucide-react';
import type { AiCompanyBrain } from './brainTypes';

interface Props {
  brain: AiCompanyBrain;
  onChange: (fields: Partial<AiCompanyBrain>) => void;
  tokens: ReturnType<typeof import('../../../../hooks/useThemeTokens').useThemeTokens>;
}

export default function BrainIdentitySection({ brain, onChange, tokens: t }: Props) {
  const inputStyle = { background: t.input.bg, border: `1px solid ${t.input.border}`, color: t.input.text };

  return (
    <div className="rounded-2xl p-5" style={{ background: `linear-gradient(135deg, ${t.surface.secondary}, ${t.surface.secondary}80)`, border: `1px solid ${t.surface.border}`, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 1px 2px rgba(0,0,0,0.04)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: t.accent.bg, border: `1px solid ${t.accent.border}` }}>
          <Building2 className="w-4 h-4" style={{ color: t.accent.text }} />
        </div>
        <h3 className="text-sm font-bold" style={{ color: t.text.primary }}>Identite de l'entreprise</h3>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: t.text.secondary }}>Nom de l'entreprise</label>
            <input
              value={brain.company_name}
              onChange={e => onChange({ company_name: e.target.value })}
              placeholder="Ex: DesignSpace3D"
              className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-all"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold mb-1.5" style={{ color: t.text.secondary }}>
              <Briefcase className="w-3 h-3" /> Secteur d'activite
            </label>
            <input
              value={brain.business_sector}
              onChange={e => onChange({ business_sector: e.target.value })}
              placeholder="Ex: Architecture d'interieur, E-commerce..."
              className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-all"
              style={inputStyle}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: t.text.secondary }}>Description de l'entreprise</label>
          <textarea
            value={brain.company_description}
            onChange={e => onChange({ company_description: e.target.value })}
            placeholder="Decrivez l'activite, le secteur, et ce qui differencie l'entreprise..."
            rows={3}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-all resize-none"
            style={inputStyle}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold mb-1.5" style={{ color: t.text.secondary }}>
              <MapPin className="w-3 h-3" /> Ville
            </label>
            <input
              value={brain.city}
              onChange={e => onChange({ city: e.target.value })}
              placeholder="Ex: Paris"
              className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-all"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold mb-1.5" style={{ color: t.text.secondary }}>
              <Globe className="w-3 h-3" /> Pays
            </label>
            <input
              value={brain.country}
              onChange={e => onChange({ country: e.target.value })}
              placeholder="Ex: France"
              className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-all"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold mb-1.5" style={{ color: t.text.secondary }}>
              <Languages className="w-3 h-3" /> Langue
            </label>
            <select
              value={brain.language}
              onChange={e => onChange({ language: e.target.value })}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-all"
              style={inputStyle}
            >
              <option value="fr">Francais</option>
              <option value="en">English</option>
              <option value="es">Espanol</option>
              <option value="de">Deutsch</option>
              <option value="it">Italiano</option>
              <option value="pt">Portugues</option>
              <option value="ar">العربية</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold mb-1.5" style={{ color: t.text.secondary }}>
              <Phone className="w-3 h-3" /> Telephone
            </label>
            <input
              value={brain.phone}
              onChange={e => onChange({ phone: e.target.value })}
              placeholder="Ex: +33 1 23 45 67 89"
              className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-all"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold mb-1.5" style={{ color: t.text.secondary }}>
              <Mail className="w-3 h-3" /> Email
            </label>
            <input
              value={brain.email}
              onChange={e => onChange({ email: e.target.value })}
              placeholder="Ex: contact@entreprise.fr"
              className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-all"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold mb-1.5" style={{ color: t.text.secondary }}>
              <Globe className="w-3 h-3" /> Site web
            </label>
            <input
              value={brain.website}
              onChange={e => onChange({ website: e.target.value })}
              placeholder="Ex: https://www.entreprise.fr"
              className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-all"
              style={inputStyle}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
