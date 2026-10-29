import { useEffect, useState } from 'react';
import {
  Monitor, Apple, Smartphone, Download, Clock, CheckCircle2, AlertCircle, ExternalLink,
  Share2, Plus, ChevronDown, Info,
} from 'lucide-react';
import type { useThemeTokens } from '../../hooks/useThemeTokens';
import {
  PLATEFORMES,
  estTelechargeable,
  estInstallableParMagasin,
  lireSignauxPlateforme,
  plateformeDepuisSignaux,
  rangerPlateformes,
  voieNavigateur,
  type Manifeste,
  type Plateforme,
  type VoieNavigateur,
} from '../../lib/plateforme';
import { estDesktop, estApplicationInstallee } from '../../lib/runtime';
import { ADRESSE_MANIFESTE } from '../../lib/miseAJour';

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

/**
 * LA TROISIEME VOIE : INSTALLER DEPUIS LE NAVIGATEUR.
 *
 * ---------- POURQUOI ELLE N'EST PAS UN BOUTON ----------
 *
 * Les deux autres voies ont une destination : un fichier a telecharger, une page de magasin
 * a ouvrir. Celle-ci n'en a pas. Le geste se fait dans le navigateur lui-meme, et AUCUN
 * code de la page ne peut le declencher : sur iOS, << Sur l'ecran d'accueil >> n'est pas
 * exposee aux pages web. Mettre un bouton ici serait un bouton qui ne fait rien — exactement
 * ce que le reste de ce fichier s'interdit.
 *
 * On montre donc le MODE D'EMPLOI, numerote, avec les icones que l'utilisateur va chercher
 * du regard dans sa barre d'outils.
 *
 * ---------- ET ON DIT LA RESERVE ----------
 *
 * La session d'une application posee depuis le navigateur ne survit pas a sa fermeture :
 * hors application Capacitor, le jeton reste dans le stockage de l'onglet. C'est une
 * politique de securite assumee (voir src/lib/stockageSession.ts), decision confirmee par
 * David le 29/10/2026. La taire ferait prendre une regle pour une panne : on l'ecrit, ici,
 * AVANT l'installation plutot qu'apres la premiere deconnexion surprise.
 *
 * Les jetons de couleur arrivent en PROP : ce fichier ne lit aucun contexte de theme, parce
 * qu'il se monte sur la page publique ou il n'y a pas de ThemeProvider.
 */
function InstallerDepuisLeNavigateur({ voie, t, cle }: { voie: VoieNavigateur; t: Jetons; cle: string }) {
  return (
    <div
      data-testid={`navigateur-${cle}`}
      style={{
        marginTop: 12, padding: '13px 14px', borderRadius: 11,
        background: t.surface.secondary, border: `1px solid ${t.surface.border}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9 }}>
        <Share2 className="w-4 h-4 shrink-0" style={{ color: t.accent.text }} />
        <span style={{ color: t.heading.primary, fontSize: 13, fontWeight: 650 }}>
          Installer maintenant depuis {voie.navigateur}
        </span>
      </div>

      {/* POURQUOI IL N'Y A PAS DE BOUTON, dit a l'utilisateur et pas seulement au lecteur du
          code. Sur Android, le navigateur expose un vrai bouton d'installation a la page.
          iOS ne l'expose a AUCUN navigateur, Safari compris : le geste manuel est la seule
          voie. Sans cette phrase, l'utilisateur cherche le bouton que les autres ont. */}
      <p style={{ color: t.label.muted, fontSize: 11.5, lineHeight: 1.45, margin: '0 0 9px' }}>
        Sur iPhone, aucun site ne peut s'installer tout seul : Apple réserve ce geste à
        l'utilisateur. Deux appuis suffisent.
      </p>

      <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 7 }}>
        {voie.etapes.map((etape, i) => (
          <li key={etape} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span
              style={{
                width: 19, height: 19, borderRadius: 999, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: t.surface.tertiary, border: `1px solid ${t.surface.border}`,
                color: t.accent.text, fontSize: 10.5, fontWeight: 700,
              }}
            >
              {i + 1}
            </span>
            <span style={{ color: t.label.muted, fontSize: 12.5, lineHeight: 1.4 }}>{etape}</span>
            {i === voie.etapes.length - 1 && <Plus className="w-3.5 h-3.5 shrink-0" style={{ color: t.accent.text }} />}
          </li>
        ))}
      </ol>

      {voie.pourquoiPasRecommande && (
        <p
          data-testid={`navigateur-conseil-${cle}`}
          style={{
            display: 'flex', alignItems: 'flex-start', gap: 7,
            margin: '9px 0 0', color: t.label.muted, fontSize: 11.5, lineHeight: 1.45,
          }}
        >
          <Info className="w-3.5 h-3.5 shrink-0" style={{ marginTop: 1.5 }} />
          <span>{voie.pourquoiPasRecommande}</span>
        </p>
      )}

      {voie.reserve && (
        <p
          data-testid={`navigateur-reserve-${cle}`}
          style={{
            display: 'flex', alignItems: 'flex-start', gap: 7,
            margin: '10px 0 0', color: t.label.muted, fontSize: 11.5, lineHeight: 1.45,
          }}
        >
          <Info className="w-3.5 h-3.5 shrink-0" style={{ marginTop: 1.5 }} />
          <span>{voie.reserve}</span>
        </p>
      )}
    </div>
  );
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
  /*
   * On garde la chaine d'agent, pas seulement la plateforme : le mode d'emploi de
   * l'installation depend du NAVIGATEUR autant que de l'appareil. Dans Safari le bouton
   * Partager est en bas de l'ecran, dans Chrome et Edge il est en haut, dans la barre
   * d'adresse. Envoyer un utilisateur de Chrome chercher un bouton en bas, c'est le mode
   * d'emploi d'un autre navigateur — et il abandonnera.
   */
  const [ua, setUa] = useState('');

  useEffect(() => {
    const signaux = lireSignauxPlateforme();
    setPlateforme(plateformeDepuisSignaux(signaux));
    setUa(signaux.ua);
  }, []);

  useEffect(() => {
    let vivant = true;
    /*
     * Un manifeste injoignable ne doit pas casser la page : il laisse simplement les
     * quatre cartes en « Bientot disponible », ce qui est l'etat sur par defaut.
     *
     * ---------- POURQUOI L'ADRESSE DEPEND DU RUNTIME ----------
     *
     * DEFAUT MESURE LE 29/10/2026, ET IL MENTAIT DEJA A L'ECRAN. Sur le web, une adresse
     * relative est juste. Mais dans une WebView Capacitor ou dans Tauri, l'origine est le
     * PAQUET LOCAL : un fetch relatif y lit le manifeste EMBARQUE, c'est-a-dire l'etat du
     * monde au moment de la compilation. Et un paquet vN ne peut pas, par construction,
     * embarquer un manifeste qui declare vN disponible — il a ete bati avant.
     *
     * Mesure des trois copies sur disque ce jour-la : public/ disait Android disponible en
     * 0.1.1, la copie embarquee dans ios/App/App/public/ disait Windows 0.1.0 et Android
     * « bientot / Google Play ». L'application Android affichait donc a ses porteurs un
     * ecran perime, sans que rien ne le signale.
     *
     * Le remede existait deja a cote, pour le bandeau de mise a jour : une adresse ABSOLUE
     * vers le site public (ADRESSE_MANIFESTE). On l'emploie ici des que l'application est
     * installee, et on garde l'adresse relative sur le web — ou elle est correcte et evite
     * un aller-retour inter-domaines inutile.
     */
    const adresse = estApplicationInstallee() ? ADRESSE_MANIFESTE : '/telechargements.json';
    fetch(adresse, { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (vivant) { setManifeste(d); setChargement(false); } })
      .catch(() => { if (vivant) { setManifeste(null); setChargement(false); } });
    return () => { vivant = false; };
  }, []);

  const surBureau = estDesktop();

  /*
   * CE QU'ON MONTRE D'ABORD. La detection ne RETIRE rien — les quatre plateformes restent
   * atteignables, celles qui ne concernent pas le visiteur dans un depliant. C'est ce que
   * l'en-tete de plateforme.ts promettait deja : une detection qui se trompe doit couter un
   * regard, jamais une impasse.
   *
   * DEFAUT QUE CECI CORRIGE, mesure le 29/10/2026 : la page affichait les quatre cartes
   * quelle que soit la plateforme, si bien qu'un visiteur iPhone se voyait proposer DEUX
   * boutons actionnables qui ne le concernaient pas, un .exe Windows et un .apk Android,
   * pendant que sa propre carte etait un pave mort.
   *
   * Plateforme inconnue : on retombe sur les deux familles d'origine et on montre tout.
   * C'est le seul comportement qui ne prive personne.
   */
  const { sienne, autres } = rangerPlateformes(plateforme);
  const sections: Array<{ cle: string; titre: string; liste: typeof PLATEFORMES; depliable: boolean }> =
    sienne.length > 0
      ? [
        { cle: 'sienne', titre: 'Votre appareil', liste: sienne, depliable: false },
        { cle: 'autres', titre: 'Autres plateformes', liste: autres, depliable: true },
      ]
      : (['ordinateur', 'mobile'] as const).map((famille) => ({
        cle: famille,
        titre: famille === 'ordinateur' ? 'Ordinateur' : 'Mobile',
        liste: PLATEFORMES.filter((p) => p.famille === famille),
        depliable: false,
      }));

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

      {sections.map((s) => {
        /* UN <details> NATIF, PAS UN ETAT REACT. Il se replie sans JavaScript, il est
           annonce aux lecteurs d'ecran, et la recherche du navigateur (Ctrl+F) sait y
           entrer. Un depliant maison aurait coute ces trois choses.
           Le <summary> doit etre l'enfant direct d'un <details>, sinon il ne replie rien :
           c'est le conteneur qui change, pas seulement son en-tete. */
        const Conteneur = (s.depliable ? 'details' : 'section') as 'section';
        return (
        <Conteneur key={s.cle} style={{ marginBottom: 26 }}>
          {s.depliable ? (
            <summary
              data-testid="autres-plateformes"
              style={{
                color: t.label.muted, fontSize: 11, fontWeight: 700,
                letterSpacing: '0.1em', textTransform: 'uppercase',
                display: 'flex', alignItems: 'center', gap: 7,
                cursor: 'pointer', listStyle: 'none', margin: '0 0 12px',
              }}
            >
              <ChevronDown className="w-3.5 h-3.5" />
              {s.titre}
            </summary>
          ) : (
            <h2
              style={{
                color: t.label.muted, fontSize: 11, fontWeight: 700,
                letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 12px',
              }}
            >
              {s.titre}
            </h2>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: 14 }}>
            {s.liste.map((p) => {
              const entree = manifeste?.[p.cle];
              const actif = estTelechargeable(entree);
              /* iOS ne se pose pas depuis une page web : l'installation passe par un
                 magasin. Deuxieme voie, meme exigence — rien ne s'allume sans destination. */
              const parMagasin = estInstallableParMagasin(entree);
              /*
               * TROISIEME VOIE, ET ELLE NE VIENT PAS DU MANIFESTE. Installer depuis le
               * navigateur ne depend d'aucune publication : ni fichier, ni version, ni
               * empreinte, ni magasin. La capacite tient a l'appareil, donc elle est
               * declaree dans plateforme.ts et vraie dès que le site est en ligne.
               *
               * ELLE NE S'OPPOSE PAS AUX DEUX AUTRES, elle les COMPLETE : tant que l'.ipa
               * n'existe pas, un iPhone peut quand meme installer Talvex. Le jour ou
               * TestFlight s'allumera, le bouton prendra le dessus et ce bloc s'effacera —
               * d'ou la condition sur `actif` et `parMagasin` plus bas, et non un ternaire
               * de plus, qui aurait casse l'exclusivite des trois etats du bouton.
               */
              const voie = voieNavigateur(p.cle, ua);
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
                      <Icone className="w-4 h-4" style={{ color: actif || parMagasin ? t.accent.text : t.label.muted }} />
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
                    ) : parMagasin ? (
                      <>
                        Installation via {entree?.magasin}
                        {entree?.version ? ` · version ${entree.version}` : ''}
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
                  ) : parMagasin ? (
                    /* Un lien vers un magasin, pas un telechargement : il ouvre un onglet,
                       et son libelle NOMME la destination. Un bouton qui dit « Telecharger »
                       alors qu'il emmene ailleurs ment, meme si la page d'arrivee est bonne. */
                    <a
                      href={entree!.lien}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-testid={`magasin-${p.cle}`}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        height: 44, borderRadius: 10, textDecoration: 'none',
                        background: t.accent.solid, color: t.text.inverse,
                        fontSize: 14, fontWeight: 650,
                      }}
                    >
                      <ExternalLink className="w-4 h-4" />
                      Installer via {entree!.magasin}
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

                  {/* Le mode d'emploi du navigateur, SEULEMENT quand aucune des deux autres
                      voies n'est ouverte : si l'application existe sur un magasin, c'est
                      elle qu'il faut installer, et deux chemins concurrents feraient hesiter. */}
                  {voie && !actif && !parMagasin && (
                    <InstallerDepuisLeNavigateur voie={voie} t={t} cle={p.cle} />
                  )}

                  {/* L'aide ne s'affiche que sous un bouton ACTIF : sous une attente, elle
                      n'ajouterait que du bruit. */}
                  {(actif || parMagasin) && entree?.aide && (
                    <p
                      data-testid={`aide-${p.cle}`}
                      style={{
                        color: t.label.muted, fontSize: 11.5, lineHeight: 1.45,
                        margin: '9px 0 0', textAlign: 'center',
                      }}
                    >
                      {entree.aide}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </Conteneur>
        );
      })}

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
