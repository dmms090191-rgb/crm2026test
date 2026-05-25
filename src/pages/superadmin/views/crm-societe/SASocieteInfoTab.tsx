import { ExternalLink, MapPin, Phone } from 'lucide-react';
import { useThemeTokens } from '../../../../hooks/useThemeTokens';
import type { Prospect } from './SAProspectModal';
import type { SAStatut } from './types';
import { getStatutColor } from './types';

interface Props {
  prospect: Prospect;
  saStatuts: SAStatut[];
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  const t = useThemeTokens();
  return (
    <div className="flex flex-col gap-1 py-2.5" style={{ borderBottom: `1px solid ${t.surface.borderLight}` }}>
      <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: t.text.quaternary }}>{label}</span>
      <div className="text-sm" style={{ color: t.text.primary }}>{children}</div>
    </div>
  );
}

export default function SASocieteInfoTab({ prospect: p, saStatuts }: Props) {
  const t = useThemeTokens();
  const cfg = getStatutColor(p.statut, saStatuts);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <div className="space-y-0">
      <InfoRow label="Prenom du gerant">
        <span className="font-medium">{p.manager_first_name || <span style={{ color: t.text.tertiary }}>-</span>}</span>
      </InfoRow>

      <InfoRow label="Nom du gerant">
        <span className="font-medium">{p.manager_last_name || <span style={{ color: t.text.tertiary }}>-</span>}</span>
      </InfoRow>

      <InfoRow label="Nom de la societe">
        <span className="font-semibold">{p.nom}</span>
      </InfoRow>

      <InfoRow label="Site internet">
        {p.site_internet ? (
          <a href={p.site_internet} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium" style={{ color: '#0ea5e9' }}>
            <ExternalLink className="w-3.5 h-3.5" />
            {p.site_internet}
          </a>
        ) : <span style={{ color: t.text.tertiary }}>-</span>}
      </InfoRow>

      <InfoRow label="Lien Google Maps">
        {p.lien_google_maps ? (
          <a href={p.lien_google_maps} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium" style={{ color: '#f59e0b' }}>
            <MapPin className="w-3.5 h-3.5" />
            Voir sur Maps
          </a>
        ) : <span style={{ color: t.text.tertiary }}>-</span>}
      </InfoRow>

      <InfoRow label="Telephone">
        {p.telephone ? (
          <a href={`tel:${p.telephone}`} className="inline-flex items-center gap-1.5 text-sm" style={{ color: t.text.primary }}>
            <Phone className="w-3.5 h-3.5" style={{ color: t.text.tertiary }} />
            {p.telephone}
          </a>
        ) : <span style={{ color: t.text.tertiary }}>-</span>}
      </InfoRow>

      <InfoRow label="Adresse">
        <span>{p.adresse || <span style={{ color: t.text.tertiary }}>-</span>}</span>
      </InfoRow>

      <InfoRow label="Secteur d'activite">
        <span>{p.secteur_activite || <span style={{ color: t.text.tertiary }}>-</span>}</span>
      </InfoRow>

      <InfoRow label="Descriptif / notes">
        {p.descriptif ? (
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{p.descriptif}</p>
        ) : <span style={{ color: t.text.tertiary }}>-</span>}
      </InfoRow>

      <InfoRow label="Statut">
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold"
          style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.dot, boxShadow: `0 0 4px ${cfg.dot}` }} />
          {p.statut}
        </span>
      </InfoRow>

      <InfoRow label="Date de creation">
        <span>{formatDate(p.created_at)}</span>
      </InfoRow>
    </div>
  );
}
