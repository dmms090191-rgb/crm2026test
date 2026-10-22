/**
 * LA CONVERSION D'UNE PHOTO AVANT ENVOI — et son refus de perdre un fichier.
 *
 * ---------- LA DECISION, ET CE QUI L'A TRANCHEE ----------
 *
 * On convertit QUAND LE NAVIGATEUR SAIT DECODER, et on garde l'original sinon. Aucune
 * bibliotheque n'est ajoutee.
 *
 * Mesure avec temoin : Chromium sur Windows REFUSE de decoder un HEIC (un PNG minimal se
 * decode, un HEIC et un HEIF declenchent onerror). Mais sur un appareil Apple le
 * decodeur est natif — or c'est la seule source reelle de HEIC. La conversion marche donc
 * la ou le HEIC apparait, et echoue la ou il n'apparait presque jamais.
 *
 * Une bibliotheque n'aurait servi que le cas << un HEIC recopie sur un PC >> : libheif-js
 * pese 757 Ko gzippes, et la question des brevets HEVC pour un produit commercial est
 * NON RESOLUE. On n'embarque pas un decodeur HEVC pour un cas marginal.
 *
 * ---------- LES TROIS FACONS DONT LA CONVERSION PEUT RATER ----------
 *
 * 1. Le decodage leve une exception (format inconnu, memoire insuffisante).
 * 2. `toBlob` rend null.
 * 3. Le canvas rend du BLANC SANS LEVER D'ERREUR. C'est le cas d'iOS au-dela de son
 *    plafond (16 777 216 px), et c'est le plus dangereux : on televerserait un JPEG vide
 *    et le document serait perdu en silence.
 *
 * Le troisieme cas est structurellement evite — le canvas de sortie fait au plus
 * 2560 x 1920, soit 4,9 Mpx — ET verifie quand meme, parce que la memoire disponible
 * abaisse le plafond effectif sur un telephone d'entree de gamme.
 *
 * Dans les trois cas, le resultat est le meme : on rend l'original, intact. Jamais
 * d'echec silencieux, jamais de fichier perdu.
 */
import {
  COTE_MAX, QUALITE_JPEG, aConvertir, echelleVers, estHeif, etendueSuffisante,
} from './crmImmoDocuments';

export interface Converti {
  /** Ce qu'il faut televerser : le JPEG produit, ou le fichier d'origine. */
  donnees: Blob;
  /** Le type a annoncer et a enregistrer. */
  type: string;
  /** Le type d'ORIGINE si une conversion a eu lieu, null sinon. */
  typeOrigine: string | null;
  /**
   * Pourquoi la conversion n'a pas eu lieu, quand elle etait souhaitable. Vide si elle a
   * reussi ou si elle n'avait pas lieu d'etre (un PDF). Sert a le DIRE a l'utilisateur
   * plutot qu'a le taire.
   */
  avertissement: string;
}

/** Les 64 premiers octets, pour reconnaitre le format sans se fier au nom ni au type. */
async function premiersOctets(f: Blob): Promise<Uint8Array> {
  try {
    return new Uint8Array(await f.slice(0, 64).arrayBuffer());
  } catch {
    return new Uint8Array(0);
  }
}

/**
 * LE GARDE-FOU. Vrai si ce blob d'image porte vraiment du contenu.
 *
 * On REDUIT dans un canvas de 32 x 32 et on mesure l'etendue des valeurs. La reduction
 * MOYENNE les pixels, donc elle ne peut pas rater du contenu par alignement — ce qui est
 * arrive a une premiere version qui echantillonnait des points sur une grille reguliere
 * et declarait << vide >> une image parfaitement bonne.
 *
 * Cout : un drawImage et 4 Ko de lecture. Aucune allocation a la taille de l'image.
 */
async function porteDuContenu(image: Blob): Promise<boolean> {
  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(image);
    const c = document.createElement('canvas');
    c.width = 32; c.height = 32;
    const ctx = c.getContext('2d');
    if (ctx === null) return false;
    ctx.drawImage(bitmap, 0, 0, 32, 32);
    const d = ctx.getImageData(0, 0, 32, 32).data;
    let mini = 255, maxi = 0;
    for (let i = 0; i < d.length; i += 4) {
      /* La luminance suffit : un canvas vide est uniforme sur les trois canaux. */
      const v = d[i];
      if (v < mini) mini = v;
      if (v > maxi) maxi = v;
    }
    return etendueSuffisante(mini, maxi);
  } catch {
    return false;
  } finally {
    bitmap?.close();
  }
}

/**
 * Prepare un fichier pour l'envoi.
 *
 * @param fichier  ce que l'utilisateur a fourni
 * @param type     le type retenu par typeDeclare(), qui se mefie de file.type
 */
export async function preparerPourEnvoi(fichier: File, type: string): Promise<Converti> {
  const intact: Converti = { donnees: fichier, type, typeOrigine: null, avertissement: '' };

  if (!aConvertir(type)) return intact;

  /* Les octets tranchent, pas le nom : file.type est VIDE sur certains .heic d'iOS, et
     une extension se renomme. */
  const octets = await premiersOctets(fichier);
  const heif = estHeif(octets);

  let bitmap: ImageBitmap | null = null;
  try {
    /*
     * `imageOrientation: 'from-image'` est la forme explicite qui garantit une image
     * DROITE. Mesure au pixel : un JPEG paysage marque << rotation 90 >> est rendu
     * 100 x 200, bande rouge de gauche passee en haut. Le reencodage canvas produit
     * ensuite une image droite SANS EXIF — donc sans metadonnee de rotation a
     * reinterpreter plus tard, et sans GPS.
     */
    bitmap = await createImageBitmap(fichier, { imageOrientation: 'from-image' });
  } catch {
    /* Le decodage a echoue. Sur Chromium, c'est le cas de tout HEIC. */
    return heif
      ? { ...intact, avertissement: 'Cette photo est au format HEIC de l’iPhone. Elle est conservée telle quelle, mais son aperçu ne s’affichera pas sur ordinateur.' }
      : intact;
  }

  try {
    const cible = echelleVers(bitmap.width, bitmap.height, COTE_MAX);
    /* Rien a gagner : une image deja petite et deja au bon format part telle quelle,
       plutot que de perdre de la qualite dans un reencodage inutile. */
    if (!heif && cible.largeur === bitmap.width && cible.hauteur === bitmap.height && type === 'image/jpeg') {
      return intact;
    }

    const c = document.createElement('canvas');
    c.width = cible.largeur; c.height = cible.hauteur;
    const ctx = c.getContext('2d');
    if (ctx === null) return intact;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, cible.largeur, cible.hauteur);

    const jpeg = await new Promise<Blob | null>(res => {
      try { c.toBlob(b => res(b), 'image/jpeg', QUALITE_JPEG); } catch { res(null); }
    });
    if (jpeg === null || jpeg.size === 0) return intact;

    /* L'EPREUVE DECISIVE : le JPEG produit porte-t-il vraiment l'image ? Sans ce
       controle, un canvas blanc d'iOS passerait pour une conversion reussie. */
    if (!(await porteDuContenu(jpeg))) {
      return { ...intact, avertissement: 'La conversion de cette photo n’a pas abouti sur cet appareil ; le fichier d’origine a été conservé.' };
    }

    return { donnees: jpeg, type: 'image/jpeg', typeOrigine: type, avertissement: '' };
  } catch {
    /* Memoire insuffisante, canvas refuse : l'original part, intact. */
    return { ...intact, avertissement: 'La conversion de cette photo n’a pas abouti sur cet appareil ; le fichier d’origine a été conservé.' };
  } finally {
    bitmap?.close();
  }
}
