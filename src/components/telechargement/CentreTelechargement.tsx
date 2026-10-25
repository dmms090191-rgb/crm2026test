import { useEffect, useState } from 'react';
import { Monitor, Apple, Smartphone, Download, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import type { useThemeTokens } from '../../hooks/useThemeTokens';
import {
  PLATEFORMES,
  estTelechargeable,
  lireSignauxPlateforme,
  plateformeDepuisSignaux,
  type Manifeste,
  type Plateforme,
} from '../../lib/plateforme';
import { estDesktop } from '../../lib/runtime';

/**
 * LE CENTRE DE TELECHARGEMENT TALVEX. Un seul composant, deux points de montage :
 * la page publique /telecharger (sans connexion) et l'onglet « Telecharger » du panneau.
 *
 * POURQUOI LES COULEURS ARRIVENT EN PROP. Ce composant doit s'afficher la ou il n'y a
 * AUCUN ThemeProvider — la page publique est montee avant toute authentification, et
 * useTheme y leverait. Il ne lit donc aucun contexte : son parent lui passe les jetons,
 * obtenus par useThemeTokens() dans le panneau, et par la fonction PURE getThemeTokens()
 * sur la page publique. Le `import type` ci-dessus est efface au build et n'entraine
 * aucune dependance a l'execution.
 *
 * LA REGLE QUI COMPTE : aucun faux bouton. Un bouton n'est actif que si le manifeste
 * declare la plateforme complete (statut, url, version, somme de controle) — voir
 * estTelechargeable dans src/lib/plateforme.ts. Manifeste absent, illisible ou incomplet :
 * tout retombe sur « Bientot disponible ». L'etat par defaut est INACTIF.
 *
 * LA DETECTION NE FAIT QUE METTRE EN AVANT. Les quatre plateformes restent visibles et
 * cliquables. Une detection qui se trompe doit couter un regard, jamais une impasse — et
 * elle n'active jamais rien par elle-meme.
 */

type Jetons = ReturnType<typeof useThemeTokens>;

const ICONES: Record<string, typeof Monitor> = {
  windows: Monitor,
  macos: Apple,
  android: Smartphone,
  ios: Smartphone,
};

function formaterTaille(octets?: number): string {
  if (!octets) return '';
  return `${(octets / (1024 * 1024)).toFixed(1)} Mo`;
}

interface Props {
  tokens: Jetons;
  /** Rend le titre : la page publique en a besoin, l'onglet a deja son fil d'Ariane. */
  avecEntete?: boolean;
}

export default function CentreTelechargement({ tokens: t, avecEntete = true }: Props) {
  const [manifeste, setManifeste] = useState<Manifeste | null>(null);
  const [chargement, setChargement] = useState(true);
  const [plateforme, setPlateforme] = useState<Plateforme>('inconnue');

  useEffect(() => {
    setPlateforme(plateformeDepuisSignaux(lireSignauxPlateforme()));
  }, []);

  useEffect(() => {
    let vivant = true;
    /* Un manifeste injoignable ne doit pas casser la page : il laisse simplement les
       quatre cartes en « Bientot disponible », ce qui est l'etat sur par defaut. */
    fetch('/telechargements.json', { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (vivant) { setManifeste(d); setChargement(false); } })
      .catch(() => { if (vivant) { setManifeste(null); setChargement(false); } });
    return () => { vivant = false; };
  }, []);

  const surBureau = estDesktop();

  return (
    <div style={{ maxWidth: 1040, margin: '0 auto', padding: '0 4px' }}>
      {avecEntete && (
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ color: t.heading.primary, fontSize: 26, fontWeight: 700, margin: 0 }}>
            Telecharger Talvex
          </h1>
          <p style={{ color: t.label.muted, fontSize: 14, margin: '6px 0 0' }}>
            Installez Talvex sur votre ordinateur ou votre telephone.
          </p>
        </div>
      )}

      {surBureau && (
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22,
            padding: '12px 14px', borderRadius: 10,
            background: t.surface.secondary, border: `1px solid ${t.surface.border}`,
            color: t.label.muted, fontSize: 13,
          }}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: t.accent.text }} />
          <span>Vous utilisez deja l'application Talvex pour Windows. Le telechargement reste disponible, pour l'installer sur un autre poste.</span>
        </div>
      )}

      {(['ordinateur', 'mobile'] as const).map((famille) => (
        <section key={famille} style={{ marginBottom: 26 }}>
          <h2
            style={{
              color: t.label.muted, fontSize: 11, fontWeight: 700,
              letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 12px',
            }}
          >
            {famille === 'ordinateur' ? 'Ordinateur' : 'Mobile'}
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: 14 }}>
            {PLATEFORMES.filter((p) => p.famille === famille).map((p) => {
              const entree = manifeste?.[p.cle];
              const actif = estTelechargeable(entree);
              const enAvant = plateforme === p.cle;
              const Icone = ICONES[p.cle] ?? Monitor;

              return (
                <div
                  key={p.cle}
                  style={{
                    borderRadius: 14, padding: 18,
                    background: enAvant ? t.surface.secondary : t.card.bg,
                    border: `1px solid ${enAvant ? t.accent.solid : t.card.border}`,
                    boxShadow: enAvant ? `0 0 0 1px ${t.accent.solid}33` : t.card.shadow,
                    transition: 'border-color 180ms ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 12 }}>
                    <span
                      style={{
                        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: t.surface.tertiary, border: `1px solid ${t.surface.border}`,
                      }}
                    >
                      <Icone className="w-4 h-4" style={{ color: actif ? t.accent.text : t.label.muted }} />
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ color: t.heading.primary, fontSize: 15, fontWeight: 650 }}>{p.nom}</div>
                      {enAvant && (
                        <div style={{ color: t.accent.text, fontSize: 11, fontWeight: 600 }}>
                          Votre appareil
                        </div>
                      )}
                    </div>
                  </div>

                  {/* La ligne d'etat : ce qu'on sait du fichier, ou pourquoi on ne sait rien. */}
                  <div style={{ color: t.label.muted, fontSize: 12, minHeight: 34, marginBottom: 12 }}>
                    {chargement ? (
                      'Verification en cours...'
                    ) : actif ? (
                      <>
                        Version {entree?.version}
                        {entree?.taille ? ` · ${formaterTaille(entree.taille)}` : ''}
                        {entree?.sha256 ? (
                          <>
                            <br />
                            <span style={{ fontSize: 10.5, opacity: 0.75 }}>
                              SHA-256 {entree.sha256.slice(0, 16).toLowerCase()}...
                            </span>
                          </>
                        ) : null}
                      </>
                    ) : entree?.magasin ? (
                      `Sera publie sur ${entree.magasin}.`
                    ) : (
                      "Cette version n'est pas encore publiee."
                    )}
                  </div>

                  {actif ? (
                    <a
                      href={entree!.url}
                      download
                      data-testid={`telecharger-${p.cle}`}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        height: 44, borderRadius: 10, textDecoration: 'none',
                        background: t.accent.solid, color: t.text.inverse,
                        fontSize: 14, fontWeight: 650,
                      }}
                    >
                      <Download className="w-4 h-4" />
                      Telecharger pour {p.nom}
                    </a>
                  ) : (
                    /* UN DIV, PAS UN BOUTON DESACTIVE. Un <button disabled> reste un bouton :
                       il se survole, il attire le clic, et il promet quelque chose qui
                       n'existe pas. Ici rien n'est cliquable, et le texte dit pourquoi. */
                    <div
                      data-testid={`bientot-${p.cle}`}
                      aria-disabled="true"
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        height: 44, borderRadius: 10,
                        background: t.surface.tertiary, border: `1px solid ${t.surface.border}`,
                        color: t.label.muted, fontSize: 13.5, fontWeight: 600,
                        cursor: 'not-allowed', userSelect: 'none',
                      }}
                    >
                      <Clock className="w-4 h-4" />
                      Bientot disponible
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {!chargement && !manifeste && (
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 9, marginTop: 4,
            color: t.label.muted, fontSize: 12.5,
          }}
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>La liste des versions n'a pas pu etre lue. Reessayez dans un instant.</span>
        </div>
      )}
    </div>
  );
}
