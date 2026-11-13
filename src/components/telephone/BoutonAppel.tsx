import { Phone } from 'lucide-react';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import { telHref, type FormatTel } from '../../lib/formatTel';

/**
 * L'ICONE D'APPEL — composer le numero d'un prospect en un geste, depuis la carte.
 *
 * ---------- ELLE N'EXISTE QUE SUR LES CARTES, ET C'EST VOULU ----------
 *
 * Les deux CRM rendent TOUJOURS leurs deux presentations : `md:` bascule par `display`, pas
 * par montage. Les lignes de tableau et les cartes sont donc toutes dans le DOM en meme
 * temps, et c'est le conteneur `md:hidden` des cartes qui rend ce bouton invisible au-dela de
 * 768 px. Aucune colonne n'est ajoutee au tableau, aucune largeur ne bouge, et l'en-tete du
 * tableau — construit depuis la liste des colonnes — n'a rien a resynchroniser.
 *
 * ---------- `stopPropagation`, PARCE QUE LA CARTE EST CLIQUABLE ----------
 *
 * Sans lui, toucher l'icone declencherait AUSSI ce que la carte fait au clic. On passerait
 * l'appel et on ouvrirait une fiche par-dessus. Le precedent existe deja dans le CRM Societe
 * du SuperAdmin.
 *
 * ---------- UN NUMERO INEXPLOITABLE NE DONNE PAS DE LIEN MORT ----------
 *
 * `telHref` rend `null` quand il n'y a rien a composer, et on ne rend alors RIEN : pas de
 * `href` vide — qui pointerait sur la page courante et rechargerait le CRM — pas d'icone
 * grisee qui promet une action absente, pas d'erreur en console.
 */
export default function BoutonAppel({ tel, format }: { tel: string; format: FormatTel }) {
  const t = useThemeTokens();
  const href = telHref(tel, format);
  if (!href) return null;

  const numero = href.slice('tel:'.length);

  return (
    <a
      href={href}
      onClick={e => e.stopPropagation()}
      /* 44 px de cible tactile, pour une icone de 16. L'ecart vit dans le padding, pas dans
         la taille du dessin : une icone de 44 px aurait ecrase la ligne. */
      className="inline-flex items-center justify-center shrink-0 w-11 h-11 -my-1.5 rounded-lg transition-all active:scale-95"
      style={{ background: t.accent.bg, border: `1px solid ${t.accent.border}`, color: t.accent.text }}
      aria-label={`Appeler le ${numero}`}
      title={`Appeler le ${numero}`}
    >
      <Phone className="w-4 h-4" />
    </a>
  );
}
