import { useState } from 'react';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import { useFormatTel } from '../../hooks/useFormatTel';
import { FORMATS_TEL, LIBELLE_FORMAT_TEL, type FormatTel } from '../../lib/formatTel';
import { Phone } from 'lucide-react';

/**
 * LE SELECTEUR DE FORMAT — `0 | +33 | 0033`, un seul pour toute la liste.
 *
 * ---------- UN REGLAGE GLOBAL, PAS UNE QUESTION PAR CONTACT ----------
 *
 * On clique une fois, puis on appelle dix prospects sans y revenir. Demander le prefixe a
 * chaque contact aurait ajoute un geste a chaque appel — c'est-a-dire a la seule chose que ce
 * module sert a faire.
 *
 * ---------- POURQUOI TROIS BOUTONS VISIBLES ET NON UN MENU ----------
 *
 * Trois notations tiennent en trois boutons. Un menu deroulant coute un clic de plus et CACHE
 * le reglage actif, alors que savoir d'un coup d'oeil « je suis en +33 » est precisement ce
 * qu'on verifie avant de composer un numero.
 *
 * ---------- CE QU'UN CLIC NE FAIT PAS ----------
 *
 * Il ne declenche aucune ecriture sur `leads`. Le numero en base ne change jamais : seuls
 * changent la facon de l'ecrire et le lien d'appel. Ce composant n'importe pas `supabase` —
 * c'est le hook qui enregistre la PREFERENCE, dans `user_preferences`.
 *
 * ---------- L'ETAT ACTIF NE REPOSE PAS SUR LA SEULE COULEUR ----------
 *
 * Il repose aussi sur `aria-pressed`, lu par les lecteurs d'ecran, et sur la graisse du texte.
 * Un daltonien ou un ecran en plein soleil ne doivent pas avoir a deviner lequel est actif.
 *
 * ---------- LE SURVOL PASSE PAR UN ETAT REACT, PAS PAR `currentTarget.style` ----------
 *
 * La barre d'outils du CRM ecrit ses couleurs de survol directement dans le style en ligne.
 * Ca tient pour un bouton dont l'etat change rarement. Ici l'etat change A CHAQUE CLIC, et
 * le motif casse : releve du 12/11/2026, apres un passage du pointeur puis un clic ailleurs,
 * le bouton « 0 » INACTIF gardait `background: rgb(10, 18, 32)` — la couleur de survol,
 * ecrite a la main et jamais reprise par React. A l'ecran, deux boutons paraissaient actifs
 * et rien ne disait lequel comptait.
 *
 * Le survol est donc un ETAT, et toutes les couleurs sont derivees du rendu. React garde la
 * main sur l'attribut `style`, et la desynchronisation ne peut plus se produire.
 */
export default function SelecteurFormatTel({ className = '' }: { className?: string }) {
  const t = useThemeTokens();
  const { format, choisir } = useFormatTel();
  const [survole, setSurvole] = useState<FormatTel | null>(null);

  return (
    <div
      className={`flex items-center gap-2 flex-wrap ${className}`}
      role="group"
      aria-label="Format d'affichage et d'appel des numeros de telephone"
    >
      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: t.text.quaternary }}>
        <Phone className="w-3.5 h-3.5" style={{ color: t.table.cellIcon }} />
        <span className="hidden sm:inline">Format d'appel</span>
      </span>

      {/* `overflow-hidden` sur le conteneur, et donc AUCUN rayon a repeter sur les boutons :
          les angles sont decoupes par le parent. Un rayon pose sur chaque bouton se serait
          desynchronise du conteneur a la premiere retouche. */}
      {/* 44 px de haut au doigt, 36 a la souris — la cible tactile recommandee sous 768, la
          hauteur des autres boutons de la barre d'outils au-dessus. Releve du 12/11/2026 :
          `h-10` donnait 40 px de conteneur, donc 38 de bouton bordure deduite. */}
      <div
        className="inline-flex items-stretch h-11 md:h-9 rounded-lg overflow-hidden"
        style={{ background: t.surface.primary, border: `1px solid ${t.surface.border}` }}
        /* Le filet de securite : quitter le groupe efface le survol, meme si le bouton n'a
           pas recu son propre `mouseleave`. Et `onBlur` pour le parcours au clavier. */
        onMouseLeave={() => setSurvole(null)}
        onBlur={() => setSurvole(null)}
      >
        {FORMATS_TEL.map((f, i) => {
          const actif = f === format;
          const survol = !actif && survole === f;
          return (
            <button
              key={f}
              type="button"
              onClick={() => choisir(f)}
              aria-pressed={actif}
              title={LIBELLE_FORMAT_TEL[f]}
              /* `min-w-[44px]` : la cible tactile recommandee. Le bouton `0` ne fait qu'un
                 caractere de large — sans plancher, il aurait ete le plus difficile a toucher
                 alors que c'est le format par defaut, donc le plus utilise. */
              className="inline-flex items-center justify-center min-w-[44px] px-3 text-xs tabular-nums transition-all duration-200"
              style={{
                background: actif ? t.accent.bg : survol ? t.surface.secondary : 'transparent',
                color: actif ? t.accent.text : survol ? t.text.primary : t.text.secondary,
                fontWeight: actif ? 700 : 500,
                borderInlineStart: i > 0 ? `1px solid ${t.surface.border}` : undefined,
                boxShadow: actif ? `inset 0 0 12px ${t.accent.bg}` : 'none',
              }}
              onMouseEnter={() => setSurvole(f)}
              onMouseLeave={() => setSurvole(p => (p === f ? null : p))}
              /* Le pointeur peut quitter le GROUPE sans qu'un `mouseleave` atteigne le bouton
                 — c'est precisement ce qui laissait la couleur de survol collee. Le filet de
                 securite est pose sur le conteneur, plus bas. */
            >
              {f}
            </button>
          );
        })}
      </div>
    </div>
  );
}
