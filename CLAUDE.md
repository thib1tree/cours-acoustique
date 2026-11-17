# CLAUDE.md — Cours d'acoustique interactif

Guide opérationnel pour toute session de travail sur ce dépôt (humaine ou IA).
Il résume le cahier des charges de l'auteur. En cas de doute : **demander à l'auteur
plutôt que trancher seul** sur toute question pédagogique ou scientifique.

> État : phase 1 (preuve de concept) en cours de planification.
> Plan détaillé : [`docs/plan-phase-1.md`](docs/plan-phase-1.md).
> Les sections marquées *(à compléter)* le seront quand la direction visuelle sera choisie.

---

## 1. Le projet en une phrase

Un cours d'acoustique **open source** de niveau master et au-delà, dont la valeur
ajoutée est l'**interactivité** : pour chaque notion, le lecteur manipule, voit et
entend. Le texte guide l'expérimentation, jamais l'inverse. Ce n'est **pas** de la
vulgarisation : on explique *pourquoi* et *comment*, jusqu'au mécanisme physique.

Rôles : l'auteur (master en acoustique) est relecteur scientifique et décideur.
Claude est ingénieur principal (architecture, code, visualisations) et co-rédacteur ;
tout contenu rédigé est relu par l'auteur.

## 2. Exigence n° 1 : provoquer des déclics

Une belle animation qui reste en surface est un échec. Pour chaque notion :

1. **Mécanisme avant résultat** : chaîne causale physique (quelle force sur quelle
   particule, d'où vient le retard de phase, où va l'énergie). Pas de « on montre que ».
2. **Chaque terme d'une équation est visible et désactivable** dans la simulation.
3. **Plusieurs regards** sur le même cas, basculables en direct : eulérien/lagrangien,
   temps/fréquence, stationnaire/progressif, local/global.
4. **Affronter une fausse intuition** par chapitre : prédiction → simulation → démontage.
5. **Limites du modèle** : quand l'approximation casse, le quantifier, et le montrer en
   poussant le curseur hors du domaine de validité.
6. **Raisonner avant de calculer** : analyse dimensionnelle, ordres de grandeur, cas limites.
7. **Aucune étape magique** dans les dérivations (hypothèse, identité, ordre négligé et
   pourquoi). Étapes lourdes repliables, jamais absentes.
8. **Relier les chapitres** quand un même mécanisme réapparaît.

**Avant de rédiger un chapitre** : soumettre à l'auteur la liste des déclics visés et
les visualisations qui les provoquent. Rien n'est rédigé avant sa validation.

## 3. Anatomie d'un chapitre

1. Accroche (question concrète ou expérience sonore)
2. Prédiction (le lecteur s'engage)
3. Exploration (visualisation niveau 1)
4. Mécanisme (bascules de représentation) + encadré **« Le déclic »**
5. Formalisation (dérivations dépliables, équations vivantes à termes désactivables)
6. **« Intuition piège »** et **« Limites du modèle »**
7. **Monde réel** (niveau 2, expliqué jusqu'au mécanisme, valeurs sourcées)
8. Vérification : 3 à 6 questions de compréhension, corrigées
9. Pour aller plus loin (niveau recherche, références)

Métadonnées obligatoires (frontmatter) : `prerequisites`, `duration`, `level`
(`L3` | `M1` | `M2` | `beyond`), `keyConcepts`.

Deux niveaux de visualisation :
- **Schéma** : un seul mécanisme, 1 à 3 curseurs reliés à un symbole, couleurs
  sémantiques, équations vivantes. Le lecteur doit pouvoir prédire avant de bouger.
- **Monde réel** : cas concrets avec ordres de grandeur réels **sourcés**.

Le son est une troisième dimension : l'entendre dès que c'est pertinent.

## 4. Conventions scientifiques (font foi partout)

- Unités **SI**.
- Convention temporelle **e^{−iωt}** : `p(x,t) = Re{P(x) e^{−iωt}}` ; onde progressive
  vers les x croissants : `e^{i(kx − ωt)}`. Tout écart doit être signalé explicitement.
- Notations : `p` pression acoustique, `ρ₀` masse volumique au repos, `c₀` célérité,
  `v` vitesse particulaire (vecteur en gras), `Z` impédance, `k` nombre d'onde,
  `ω` pulsation, `λ` longueur d'onde, `I` intensité, `L_p` niveau (réf. 20 µPa).
- Le fichier [`src/content/notations.md`](src/content/notations.md) **fait foi** ;
  il donne aussi la correspondance avec Bruneau et Pierce.
- Chaque dérivation énonce ses hypothèses (linéarité, fluide parfait, petites perturbations…).
- Références de niveau et de notation : **Bruneau** (*Manuel d'acoustique fondamentale*)
  et **Pierce** (*Acoustics*). Nous n'avons pas ces livres : **jamais** de numéro de
  page, d'équation ou de section sans marqueur `TODO-VERIFY`.

## 5. Garde-fous non négociables

- **Aucune donnée « monde réel » inventée.** Toute valeur réelle est sourcée. En cas de
  doute : `<!-- TODO-VERIFY: ce qu'il faut vérifier -->` (dans le MDX) ou
  `// TODO-VERIFY: …` (dans le code). Ces marqueurs sont listés à chaque bilan.
- Une valeur **calculable** à partir de constantes sourcées (CODATA, NIST) est calculée
  dans `src/lib/physics/`, pas recopiée.
- Chaque fonction ou solveur de `src/lib/physics/` est **testé contre une solution
  analytique de référence**, avec une tolérance documentée dans le test. Si une
  visualisation s'écarte de la théorie au-delà de la tolérance, **la CI échoue**.
- Solveurs numériques : stabilité (CFL) et dispersion numérique documentées dans le code
  **et** dans un encart pour le lecteur avancé.
- Aucun secret, aucun traqueur, aucun cookie, aucun service payant, aucune ressource sous
  droits (sons synthétisés ou CC0/CC BY listés dans `CREDITS.md`).

## 6. Architecture

```
src/
  lib/
    physics/      # fonctions pures, sans DOM, 100 % testées (Vitest)
    audio/        # moteur Web Audio : contexte, geste utilisateur, limiteur
    scene/        # état partagé d'une « scène » (paramètres, termes actifs, survol, URL)
    color/        # palettes perceptuelles, tests de daltonisme
    gl/           # utilitaires WebGL2 (programmes, textures, ping-pong)
  components/
    viz/          # briques de visualisation génériques (Svelte 5)
    ui/           # curseurs, équation vivante, questions, encadrés, dépliables
    layout/       # gabarits (chapitre, paillasse, notes en marge, carte du cours)
  content/
    chapitres/NN-slug/index.mdx   # contenu (français)
    prerequis/slug/index.mdx
    glossaire/                    # une entrée par terme
    notations.md
  i18n/           # chaînes d'interface (fr d'abord)
  styles/         # jetons de design (CSS custom properties)
tests/
  e2e/            # Playwright (multi-tailles, captures)
```

Règles :
- `lib/physics` n'importe **jamais** le DOM ni Svelte.
- Un nouveau chapitre doit **assembler des briques existantes** ; une brique créée pour un
  chapitre est rendue générique avant d'être fusionnée.
- Les îlots Svelte d'une même scène communiquent par `lib/scene` (registre par identifiant),
  ce qui permet à une équation dans le texte de piloter une visualisation dans la paillasse.
- Animer des phaseurs : calculer `P(x)` complexe **une fois**, animer `Re{P e^{−iωt}}`.

## 7. Langue et code

- Contenu pédagogique en **français**. Code, noms de fichiers, identifiants et commentaires
  en **anglais**. Chaînes d'interface dans `src/i18n/` (prêt pour l'i18n).
- TypeScript **strict**. Svelte 5 (runes).
- Commits : petits, clairs, en anglais, **Conventional Commits**
  (`feat(viz): …`, `fix(physics): …`, `docs(content): …`, `test: …`, `chore: …`).

## 8. Direction visuelle (résumé ; jetons détaillés à compléter)

Concept : **la chambre anéchoïque**. L'interface s'efface ; seules les ondes ont de la
couleur. Chaque trait, chaque couleur, chaque animation porte une information.

Couleurs sémantiques (constantes dans tout le site, ajustées en mode sombre) :

| Grandeur | Rôle | Point de départ |
|---|---|---|
| p < 0 (raréfaction) | pôle bas de la palette divergente | cobalt `#2F5BD3` |
| p > 0 (compression) | pôle haut de la palette divergente | carmin `#C0265E` |
| vitesse particulaire | courbes, vecteurs | sarcelle `#0E8A7E` |
| énergie, intensité | palette séquentielle, flux | ambre `#D2961B` |
| fond | — | `#F6F7F9` |
| encre | texte | `#1D2330` |

- La couleur est **réservée aux grandeurs physiques et aux éléments interactifs**.
- Palette divergente (signé) / séquentielle (positif), perceptuellement uniformes,
  vérifiées pour les daltonismes courants (test automatisé). **Toujours une légende avec unités.**
- Typographie : serif de lecture (piste Source Serif 4) + sans-serif d'interface (piste
  Atkinson Hyperlegible Next, chiffres tabulaires). Polices auto-hébergées.
- Colonne de lecture 60–75 caractères, notes en marge (Tufte) repliées sur mobile,
  visualisations pleine largeur, paillasse persistante (mini-lecteur sur mobile).
- Mouvement réservé à la physique et aux réponses aux actions (150–250 ms).
  `prefers-reduced-motion` : animations en pause par défaut.
- **À éviter** : crème + terracotta, noir + vert acide, cartes arrondies identiques avec
  ombre, petits libellés en majuscules espacées, points médians entre métadonnées,
  flèches « → » sur les liens, monospace pour les étiquettes, mot isolé coloré dans un
  titre, émojis, illustrations génériques, numérotation décorative.
- Seul élément « osé » : le champ d'onde vivant plein écran de l'accueil (FDTD GPU).

Jetons (couleurs, typographie, espacements, rayons, durées) : *(à compléter après le
choix de la direction visuelle)*.

## 9. Expérience et performance

- **Mobile et ordinateur sont deux expériences de premier ordre** : parité fonctionnelle
  totale, seule la disposition change. Tablette traitée à part.
- Rien ne dépend du survol ; cibles tactiles ≥ 44 px ; texte courant ≥ 16 px.
- Curseurs : flèches (pas fin), Maj + flèches (grand pas), valeur éditable au clavier.
- Chaque visualisation : réinitialiser, lecture/pause, ralenti, mode agrandi,
  état encodé dans l'URL, infobulles avec unités, texte alternatif.
- 60 i/s visés ; pause hors écran et onglet masqué ; densité de pixels plafonnée ;
  résolution réduite pendant le glissement d'un curseur, affinée au relâchement.
- Audio : démarrage sur geste uniquement, volume par défaut bas, **limiteur en sortie**,
  « casque recommandé » pour le binaural, déverrouillage iOS, avertissement bouton silencieux.
- Lighthouse mobile ≥ 90 (performance et accessibilité).

## 10. Commandes (prévues ; à mettre à jour après l'échafaudage)

```sh
pnpm install
pnpm dev            # serveur de développement
pnpm build          # build statique (dist/)
pnpm preview        # sert le build
pnpm test           # Vitest (physique + logique)
pnpm test:e2e       # Playwright (toutes tailles d'écran)
pnpm lint           # ESLint + Prettier --check + astro check
pnpm format         # Prettier --write
```

## 11. Méthode de travail

1. Planifier avant de coder ; attendre la validation de l'auteur sur le plan, la liste des
   déclics d'un chapitre et la direction visuelle.
2. Vérifier soi-même : tests, captures Playwright (bureau/mobile, clair/sombre) regardées
   et critiquées **avant** d'annoncer qu'une tâche est finie. Avant de conclure, retirer
   un élément superflu.
3. Fin de chaque étape : fait / reste / `TODO-VERIFY` à relire / questions.
4. Les réorganisations du curriculum sont proposées, jamais appliquées sans accord.
5. Phase 1 : socle, design system, composants de base, une page de prérequis
   (mécanique des fluides), chapitre pilote « L'équation des ondes ». Puis **arrêt et bilan**.

## 12. Licences

Code : **MIT**. Contenu pédagogique (`src/content/`) : **CC BY-SA 4.0**.
