# Installer Talvex natif sur mon iPhone, sans payer, depuis Windows

Objectif : un vrai Talvex iOS natif, qui tourne sur **mon** iPhone, pour **tester**.
Pas de publication, pas d'App Store, pas de TestFlight, pas d'adhésion à 99 $/an.

**Coût total : 0 €.** Rien à acheter, aucun Mac à louer.

---

## Pourquoi ça marche, en une phrase

Compiler une application iOS exige macOS. **Signer** ne l'exige pas : Xcode sait signer avec
un Apple ID gratuit (une « Personal Team »), et des outils Windows font la même chose. On
sépare donc les deux : un Mac distant **compile**, et **mon PC signe et installe**.

C'est ce qui permet de se passer du Mac physique. Un Mac dans le nuage ne peut ni recevoir
un câble USB, ni être sur mon réseau local — il ne pourrait donc jamais installer sur mon
téléphone lui-même. Mon PC, si.

---

## Ce que la voie gratuite coûte en contrepartie

À savoir **avant** de commencer, parce qu'aucune de ces limites ne se contourne :

| Limite | Valeur | Conséquence pour moi |
|---|---|---|
| Validité de l'installation | **7 jours** | L'application cesse de s'ouvrir. Il faut la réinstaller. |
| Applications simultanées | **3** | Largement assez pour tester Talvex. |
| Nouveaux identifiants d'application | **~10 par semaine** | Sans effet : Talvex n'en demande qu'un. |

Ces trois limites rendent la voie gratuite **parfaite pour tester** et **impossible pour
distribuer**. C'est exactement la frontière que les 99 $/an achètent : avec eux, la validité
passe à un an et le plafond de 3 applications disparaît.

> **Note pour plus tard** — AltStore PAL supprime l'expiration à 7 jours, mais il est
> **réservé à l'Union européenne** et exige un Apple ID européen. Je n'ai pas vérifié son
> coût ni s'il s'applique à ma situation : à instruire le jour où les 7 jours deviendront
> pénibles.

---

## Étape 1 — Ouvrir un compte Codemagic (gratuit)

Le Mac, je ne le loue pas : **Codemagic en prête un**.

1. Aller sur codemagic.io et créer un compte **avec le compte GitHub** qui porte le dépôt.
2. Autoriser Codemagic à lire le dépôt `crm2026test`.
3. Le plan gratuit donne **500 minutes de Mac mini M2 par mois**, un membre, un build à la
   fois. Notre chaîne est plafonnée à 45 minutes : cela laisse une dizaine de compilations
   par mois, sans rien payer.

**Aucune carte bancaire n'est demandée pour le plan gratuit.** Si une page en réclame une,
s'arrêter et me le dire : ce n'est pas la bonne.

## Étape 2 — Poser les deux variables web

Le dépôt est **public** : il ne contient aucun secret, et il ne doit jamais en contenir.
Les deux valeurs dont la compilation a besoin se posent donc **dans Codemagic**.

Dans Codemagic → l'application → *Environment variables*, créer un groupe nommé
exactement **`talvex_web`**, et y mettre :

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Les deux se lisent dans mon fichier `.env` local. La clé « anon » est publique par
conception — c'est la RLS qui protège — mais elle n'a pas sa place dans un dépôt public.

> Le nom du groupe doit être `talvex_web` au caractère près : c'est celui que
> `codemagic.yaml` réclame. Un nom différent fait échouer la compilation sur une erreur qui
> ne dit pas sa cause.

## Étape 3 — Lancer la chaîne **`talvex-ios-perso`**

Dans Codemagic, choisir la chaîne **« Talvex iOS - non signé, pour mon iPhone »**.

**Ne pas prendre `talvex-ios`** : celle-là signe et envoie sur TestFlight, donc elle exige
l'adhésion payante et échouera.

Elle fait, dans l'ordre : les dépendances, le paquet web, la synchronisation du projet iOS,
l'alignement de la version, **les relevés de non-régression**, puis l'archive non signée et
son emballage en `.ipa`.

Si elle s'arrête :

| Message | Cause probable |
|---|---|
| L'image Xcode est introuvable | La version déclarée (`xcode: 26.6`) n'existe plus chez Codemagic. Me le dire : une ligne à changer. |
| `VITE_SUPABASE_URL` est vide | Le groupe de variables n'est pas nommé `talvex_web`, ou n'est pas rattaché à la chaîne. |
| Un relevé est rouge | Ne pas contourner. Me le dire : un relevé rouge dit quelque chose. |

## Étape 4 — Récupérer le `.ipa`

En fin de compilation, l'onglet *Artifacts* porte un fichier
**`Talvex-0.1.1-non-signe.ipa`**. Le télécharger sur le PC.

Les artefacts sont gardés **30 jours** sur le plan gratuit. Au-delà, il faut relancer une
compilation — ce qui ne coûte que des minutes.

## Étape 5 — Installer sur l'iPhone, depuis Windows

C'est ici que la signature a lieu, avec **mon Apple ID gratuit**.

1. Installer **Apple Devices** (ou iTunes) sur le PC : c'est lui qui fournit le pilote USB
   de l'iPhone. Sans lui, aucun outil ne verra le téléphone.
2. Installer **Sideloadly** (sideloadly.io). C'est l'outil le plus direct sous Windows.
3. Brancher l'iPhone en USB, et sur le téléphone répondre **« Faire confiance »**.
4. Dans Sideloadly : glisser le `.ipa`, saisir **mon Apple ID**, lancer.
5. Sur l'iPhone, aller dans **Réglages → Général → VPN et gestion de l'appareil**, et
   **faire confiance** au profil de développeur à mon nom. Sans ce geste, l'application est
   installée mais refuse de s'ouvrir.

> **Mon mot de passe Apple ne passe par personne d'autre que moi.** Je le saisis dans
> l'outil, sur ma machine. Claude ne saisit jamais d'identifiants, et ne doit jamais me
> demander celui-ci.
>
> Si mon compte a la double authentification — c'est le cas par défaut — Sideloadly demande
> un **mot de passe pour application**, à générer sur appleid.apple.com. Ce n'est pas mon
> mot de passe principal.

## Étape 6 — Au bout de 7 jours

L'application cesse de s'ouvrir. Deux façons de reprendre :

- **Sideloadly** : rebrancher et réinstaller le même `.ipa`. Pas besoin de recompiler.
- **AltStore** : son service `AltServer` tourne en fond sur le PC et rafraîchit
  l'application par le Wi-Fi, tant que le PC est allumé et sur le même réseau.

---

## Ce que ce chantier ne fait pas, et pourquoi

- **Aucune publication.** Personne d'autre que moi ne peut installer ce `.ipa` : il n'est
  signé que pour mes appareils.
- **Aucun TestFlight.** Le jour où je voudrai faire tester par quelqu'un d'autre, il faudra
  les 99 $/an, et la chaîne `talvex-ios` est déjà écrite pour ça.
- **La PWA reste une voie séparée et vivante.** Sur `/telecharger`, un iPhone peut toujours
  poser Talvex sur son écran d'accueil depuis Safari, sans rien installer ni signer. Les
  deux voies coexistent : la PWA pour n'importe qui, tout de suite ; le natif pour moi, pour
  tester le vrai comportement de l'application.

---

## Deux choses que je n'ai pas pu vérifier d'ici

Dit franchement, pour que je ne les prenne pas pour acquises :

1. **La chaîne n'a jamais tourné.** Elle est écrite d'après le projet réel et les pièges
   déjà mesurés (pas de `pod install` sous Capacitor 8, `npm ci` avant la résolution Swift),
   mais aucun build n'a été lancé. Le premier dira la vérité, et il consomme des minutes
   réelles.
2. **Le comportement sur l'appareil.** Aucun iPhone ni aucun Mac n'a été touché ici. Que
   Sideloadly accepte ce `.ipa` précis, que l'application s'ouvre, que le coffre Keychain
   fonctionne hors App Store : tout cela est déduit du code et de la documentation, jamais
   constaté à l'écran.

---

*Rédigé le 29/10/2026. Sources vérifiées ce jour : les limites du compte Apple gratuit
(7 jours, 3 applications, ~10 identifiants par semaine) et le plan gratuit de Codemagic
(500 minutes de Mac mini M2 par mois).*
