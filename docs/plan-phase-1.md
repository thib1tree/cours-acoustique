# Plan de la phase 1 — à valider

Ce document est soumis à l'auteur **avant toute écriture de code**. Trois choses sont
à valider, par ordre de priorité :

1. **La liste des déclics** du chapitre pilote (§ 7) et de la page de prérequis (§ 6) ;
2. Les **choix techniques** et l'**architecture** (§ 1 à 4) ;
3. Le **déroulé** et les **questions ouvertes** (§ 9 et § 10).

Les maquettes des deux directions visuelles viendront juste après la validation de ce plan
(§ 5 décrit ce qu'elles contiendront).

---

## 1. Arborescence

```
.
├── CLAUDE.md                     # guide opérationnel (fait foi pour les sessions)
├── README.md  CONTRIBUTING.md  CODE_OF_CONDUCT.md  CREDITS.md
├── LICENSE                       # MIT (code)
├── LICENSE-CONTENT               # CC BY-SA 4.0 (src/content/)
├── docs/
│   ├── plan-phase-1.md
│   └── design/                   # maquettes statiques des deux directions, captures
├── .github/
│   ├── workflows/ci.yml          # lint + typecheck + Vitest + build + Playwright
│   ├── workflows/deploy.yml      # GitHub Pages (sur main)
│   ├── ISSUE_TEMPLATE/           # erreur scientifique, bug, proposition de chapitre
│   └── pull_request_template.md  # dont une case « relecture scientifique »
├── public/
│   ├── fonts/                    # polices auto-hébergées (woff2, sous-ensembles latin)
│   └── icons/                    # icônes PWA
├── src/
│   ├── lib/
│   │   ├── physics/              # pur TS, aucun DOM ; chaque fichier a son *.test.ts
│   │   │   ├── constants.ts      # CODATA/NIST, avec source en commentaire
│   │   │   ├── media.ts          # gaz parfait, liquides, solides ; c(T), ρ, K, Z
│   │   │   ├── complex.ts        # arithmétique complexe minimale (phaseurs)
│   │   │   ├── levels.ts         # dB : Lp, Li, Lw, sommes cohérentes/incohérentes
│   │   │   ├── plane-wave.ts     # p, v, ξ, densités d'énergie, intensité
│   │   │   ├── dalembert.ts      # solution f(x−c₀t)+g(x+c₀t), conditions initiales
│   │   │   ├── mass-spring.ts    # chaîne discrète : intégrateur, relation de dispersion
│   │   │   ├── fdtd1d.ts         # schéma p–v décalé 1D (référence CPU)
│   │   │   ├── fdtd2d.ts         # schéma 2D (référence CPU du shader de l'accueil)
│   │   │   ├── simple-wave.ts    # onde simple non linéaire, distance de choc
│   │   │   └── thermo.ts         # adiabatique / isotherme, longueur de diffusion thermique
│   │   ├── audio/
│   │   │   ├── engine.ts         # AudioContext paresseux, déverrouillage iOS, pause onglet
│   │   │   ├── limiter.ts        # gain maître bas + compresseur-limiteur + écrêtage doux
│   │   │   └── synth/            # oscillateurs, bruit, train d'impulsions glottiques, formants
│   │   ├── scene/
│   │   │   ├── scene.svelte.ts   # état réactif partagé (runes) : params, termes, survol
│   │   │   ├── registry.ts       # une scène par identifiant, partagée entre îlots
│   │   │   └── url-state.ts      # sérialisation des paramètres dans l'URL
│   │   ├── color/
│   │   │   ├── oklab.ts          # conversions sRGB ↔ OKLab/OKLCh
│   │   │   ├── colormaps.ts      # divergente pression, séquentielle énergie → LUT
│   │   │   └── cvd.ts            # simulation de daltonisme (Machado 2009) pour les tests
│   │   └── gl/                   # programmes, textures flottantes, ping-pong, repli
│   ├── components/
│   │   ├── viz/                  # cf. § 4
│   │   ├── ui/                   # cf. § 4
│   │   └── layout/               # ChapterLayout, Bench (paillasse), MarginNote, CourseMap
│   ├── content/
│   │   ├── config.ts             # schémas Zod des collections (métadonnées obligatoires)
│   │   ├── chapitres/01-equation-des-ondes/index.mdx
│   │   ├── prerequis/mecanique-des-fluides/index.mdx
│   │   ├── glossaire/*.md        # une entrée par terme (définition courte + lien)
│   │   ├── references.yml        # bibliographie centralisée, citée par clé
│   │   └── notations.md          # fait foi
│   ├── i18n/fr.ts                # chaînes d'interface
│   ├── pages/                    # index (accueil), carte, chapitres/[slug], prerequis/[slug]
│   └── styles/                   # tokens.css, base.css, katex-overrides.css
├── tests/e2e/                    # Playwright : parcours, accessibilité, captures
├── astro.config.ts  tsconfig.json  vitest.config.ts  playwright.config.ts
└── eslint.config.js  .prettierrc  package.json  pnpm-lock.yaml
```

## 2. Choix techniques

Je suis le brief, avec les précisions suivantes.

| Brique                      | Choix                                                                                                                                                        | Justification / remarque                                                                                                                                                                         |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Site                        | **Astro 7** + **MDX**                                                                                                                                        | Statique, îlots ; MDX éditable par des non-développeurs. Collections de contenu typées (Zod) : un chapitre sans `prerequisites`/`level`/`duration` ne compile pas.                               |
| Interactif                  | **Svelte 5** (runes), **TypeScript strict**                                                                                                                  | `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`. TypeScript 7 si `astro check`/`svelte-check` le supportent au moment de l'échafaudage, sinon la dernière 5.x/6.x compatible. |
| Équations                   | **KaTeX** côté build (`remark-math` + `rehype-katex`)                                                                                                        | Les équations statiques ne chargent pas de JS. Les **équations vivantes** utilisent KaTeX côté client, chargé à la demande (cf. § 3.2).                                                          |
| Rendu 2D simple             | Canvas 2D                                                                                                                                                    | Chaîne masses-ressorts, courbes, schémas de tube.                                                                                                                                                |
| Champs d'onde               | **WebGL2**                                                                                                                                                   | WebGPU reporté : WebGL2 couvre tous les navigateurs mobiles visés ; on garde l'abstraction `lib/gl` pour un backend WebGPU ultérieur. Repli Canvas 2D basse résolution si pas de WebGL2.         |
| Audio                       | Web Audio API                                                                                                                                                | `AudioWorklet` seulement si nécessaire (pas en phase 1).                                                                                                                                         |
| Tests                       | **Vitest** (physique, couleurs, logique de scène) ; **Playwright** (5 tailles, clair/sombre, captures, axe-core) ; **Lighthouse CI** (mobile ≥ 90 perf/a11y) | Les captures sont prises en mode déterministe (`?test=1` : temps figé, graine fixe) pour éviter les faux positifs des animations.                                                                |
| Qualité                     | ESLint (flat config, typescript-eslint, plugins astro et svelte) + Prettier                                                                                  | Biome écarté : support Svelte/Astro encore partiel.                                                                                                                                              |
| Polices                     | **Source Serif 4** (texte) et **Atkinson Hyperlegible Next** (interface), via `@fontsource-variable`, auto-hébergées                                         | Alternatives à comparer dans les maquettes : **Literata** et **Newsreader** pour la serif. Sous-ensembles latin + grec (symboles).                                                               |
| PWA                         | `@vite-pwa/astro` (Workbox)                                                                                                                                  | Précache des pages et des îlots ; installable. Peu coûteux, je propose de l'inclure dès la phase 1.                                                                                              |
| CI/CD                       | **pnpm**, GitHub Actions, GitHub Pages                                                                                                                       | `base: '/cours-acoustique/'` sauf domaine personnalisé (cf. questions).                                                                                                                          |
| Dépendances lourdes évitées | pas de D3, pas de Three.js, pas de framework CSS                                                                                                             | Le volume de chaque îlot reste petit ; mise en page du graphe de prérequis calculée au build par un algorithme en couches maison (le graphe a ~20 nœuds).                                        |

## 3. Quatre décisions d'architecture structurantes

### 3.1 Les « scènes » : un état partagé entre îlots

Dans Astro, chaque composant interactif est un îlot isolé. Or le brief exige qu'une
**équation dans le texte** pilote une **visualisation dans la paillasse**, et inversement.
Je propose un registre de scènes (`lib/scene`) : chaque scène a un identifiant
(`wave-eq/dalembert`), des paramètres typés (avec bornes, pas, unité, symbole LaTeX), un
ensemble de **termes actifs**, un **terme survolé**, et une sérialisation URL. Tous les îlots
qui déclarent `scene="wave-eq/dalembert"` partagent le même objet réactif (même module
ES dans la page). Conséquence : un curseur, une équation et une visualisation peuvent être
placés n'importe où dans le MDX et restent synchronisés.

### 3.2 L'équation vivante

- L'auteur écrit du LaTeX annoté : `\term{inertia}{\rho_0 \frac{\partial v}{\partial t}}`
  et `\val{c0}` pour une valeur numérique liée à un paramètre de scène.
- Rendu initial au build (HTML statique, lisible sans JS) ; à l'hydratation, KaTeX
  (chargé à la demande) re-rend l'expression quand une valeur change (une fois par image
  au plus ; une petite expression se rend en bien moins d'1 ms).
- Survol/toucher d'un terme → `scene.hoveredTerm` → la visualisation met en évidence
  l'élément correspondant ; l'inverse aussi.
- Chaque terme peut porter `toggleable` : un interrupteur (accessible au clavier) le
  désactive dans la simulation ; le terme apparaît alors barré dans l'équation.
- Équations longues sur mobile : découpage en lignes déclaré par l'auteur (`\\` aux points
  de coupure autorisés) et rendu par étapes ; jamais de défilement horizontal de la page.

### 3.3 Champ scalaire 2D (WebGL2) : deux modes, un seul composant

- **Mode phaseur** : `P(x, y)` complexe calculé une fois (CPU), téléversé en texture
  RG32F ; le shader affiche `Re{P e^{−iωt}}` à chaque image avec la LUT de couleur.
  Coût par image quasi nul.
- **Mode solveur** : FDTD 2D en ping-pong sur textures flottantes (accueil, puis chapitres
  ultérieurs). Le même schéma existe en TS (`fdtd2d.ts`), testé contre des solutions
  analytiques ; un test Playwright compare le résultat GPU au résultat CPU sur une grille
  de 64 × 64 (tolérance documentée).
- Résolution adaptative : mesure du temps par image, réduction de la grille si > 16 ms ;
  `devicePixelRatio` plafonné ; pause hors écran (`IntersectionObserver`) et onglet masqué.

### 3.4 La paillasse persistante

- **Bureau** : grille en trois zones (marge, texte, paillasse). Dans une section
  `<Bench scene="…">`, la visualisation est ancrée (`position: sticky`) ; chaque
  `<BenchStep set={{…}}>` du texte applique un préréglage de scène quand il entre dans la
  zone de lecture (scrollytelling sobre, transition 200 ms, aucune action si
  `prefers-reduced-motion`).
- **Mobile** : la visualisation active devient un mini-lecteur ancré en bas (hauteur
  ~22 % de l'écran), qui se déploie d'un glissement vers le haut ou d'un toucher ; les
  contrôles sont dans le tiroir, sous le phénomène, dans la zone du pouce.
- **Tablette** : paillasse à droite en paysage, mini-lecteur en portrait.

## 4. Composants de la phase 1

### Visualisation (`components/viz/`)

| Composant         | Rôle                                                                                    | Utilisé par                      |
| ----------------- | --------------------------------------------------------------------------------------- | -------------------------------- |
| `ScalarField2D`   | champ animé WebGL2 (phaseur ou solveur), légende avec unités, infobulle valeur locale   | accueil, chapitre (bonus 2D)     |
| `WaveFieldHero`   | accueil : FDTD GPU, impulsion au clic/toucher, option audio                             | accueil                          |
| `Line1D`          | « tube » 1D : champ de pression coloré + particules lagrangiennes + sondes              | chapitre (cœur)                  |
| `MassSpringChain` | chaîne de masses-ressorts, N variable, morphing vers le continu                         | chapitre                         |
| `Plot`            | courbe(s) interactive(s) : fonction, réponse en fréquence, axes log, curseur de lecture | chapitre, prérequis              |
| `PolarPlot`       | diagramme polaire de directivité (dB ou linéaire)                                       | livré et testé, utilisé en ch. 4 |
| `FluidParcel`     | particule de fluide et forces de pression sur ses faces, vue eulérienne/lagrangienne    | prérequis                        |
| `PVDiagram`       | diagramme p–V : isotherme contre adiabatique                                            | chapitre (Newton/Laplace)        |
| `LevelRuler`      | échelle de niveaux en dB, bascule linéaire/log, exemples réels                          | chapitre (décibels)              |
| `ColorLegend`     | légende de palette avec unités                                                          | partout                          |

### Interface (`components/ui/`)

`SymbolSlider` (curseur lié à un symbole, valeur éditable, flèches et Maj+flèches),
`LiveEquation`, `TermToggle`, `Quiz` (QCM, valeur numérique avec tolérance, curseur à placer,
prédiction verrouillée avant de voir la simulation), `Prediction`, `Insight` (« Le déclic »),
`Misconception` (« Intuition piège »), `ModelLimits`, `RealWorld`, `Derivation` +
`DerivationStep` (dépliables, numérotées), `MarginNote`, `GlossaryTerm`, `Cite`,
`ListenButton`, `VizControls` (réinitialiser, lecture/pause, ralenti, agrandir, partager).

### Mise en page (`components/layout/`)

`ChapterLayout` (métadonnées, prérequis, progression), `Bench`/`BenchStep`, `CourseMap`
(graphe des prérequis, progression locale), `ThemeToggle`.

### Audio (`lib/audio/`)

Moteur unique : `AudioContext` créé au premier geste, gain maître par défaut −30 dBFS
environ, `DynamicsCompressorNode` en limiteur (seuil −6 dBFS, ratio 20, attaque 1 ms) puis
écrêtage doux de sécurité ; arrêt quand l'onglet est masqué ; message iOS « vérifiez le
bouton silencieux ». Test unitaire du limiteur via `OfflineAudioContext` dans Playwright.

## 5. Design : ce que contiendront les deux directions

Deux directions, toutes deux « chambre anéchoïque », contrastées sur la manière de structurer
la page. Chacune livrée en maquettes statiques HTML (accueil, chapitre avec visualisation,
carte du cours, vue mobile), clair et sombre, avec captures.

- **A. « Instrument »** : la page est un appareil de mesure. Structure portée par de fines
  graduations (les règles et axes servent de séparateurs), grille stricte visible dans
  l'alignement, interface en Atkinson très présente, valeurs en chiffres tabulaires,
  visualisations encadrées par leurs propres axes gradués. Densité plutôt élevée,
  sensation de paillasse de laboratoire.
- **B. « Planche »** : la page est un livre de physique moderne. Serif dominante et
  généreuse, aucune bordure, notes en marge très présentes, visualisations traitées comme
  des planches pleine largeur sur une surface à peine plus sombre, interface réduite au
  minimum jusqu'à l'interaction. Densité faible, rythme lent.

Les jetons communs (palette physique, durées, cibles tactiles) seront identiques ; seuls
l'échelle typographique, les espacements, le traitement des cadres et la place de
l'interface changent. Je comparerai les deux au brief et signalerai ce qui me paraît
générique avant de vous les montrer.

## 6. Page de prérequis « Rappels de mécanique des fluides » — déclics proposés

1. **Deux façons de regarder le même écoulement.** `FluidParcel` en bascule directe :
   une sonde fixe (eulérien) voit la vitesse varier ; une particule suivie (lagrangien) a
   sa propre histoire. La dérivée particulaire D/Dt = ∂/∂t + v·∇ est la différence entre les
   deux, rendue visible par un vecteur « terme convectif » qu'on peut désactiver.
2. **C'est le gradient de pression qui pousse, pas la pression.** Une particule plongée dans
   une pression uniforme élevée ne bouge pas ; les forces sur ses faces se compensent.
   Curseur : pression moyenne contre écart entre faces. D'où −∇p dans Euler.
3. **Conservation de la masse = comptabilité des flux** : une boîte avec flux entrant et
   sortant ; la masse volumique monte si l'on entre plus qu'on ne sort.
4. **Compressibilité** : un piston sur un volume de gaz, puis d'eau ; même ΔV/V demande
   ~15 000 fois plus de pression dans l'eau (valeur calculée depuis des sources).
5. **Équation d'état** : fermer le système ; sans elle, 3 inconnues pour 2 équations.

Ce sont des rappels, donc pas d'intuition piège obligatoire ; je propose quand même :
« la pression pousse dans une direction » (c'est un scalaire ; c'est son gradient qui a une
direction).

## 7. Chapitre pilote « L'équation des ondes » — déclics proposés

Accroche proposée : _« L'eau est 800 fois plus dense que l'air. Le son devrait y être plus
lent. Il y va 4 fois plus vite. »_ Prédiction demandée avant toute explication.

Je reprends les pistes du brief, j'en évalue chacune et j'en ajoute quatre (marquées ★).
Ordre = ordre de lecture proposé.

### D1. Le milieu continu est une chaîne de masses et de ressorts

- **Déclic** : ∂²u/∂x² n'est rien d'autre que la force nette des deux ressorts voisins
  sur une masse, K(u_{n+1} − 2u_n + u_{n−1}) ; l'équation des ondes, c'est Newton appliqué
  à chaque tranche.
- **Visualisation** : `MassSpringChain`. Curseur N (4 → 200) : la chaîne se fond en milieu
  continu. Survol du terme ∂²u/∂x² → la flèche de force nette s'affiche sur une masse.
  Courbe de dispersion ω(k) discrète contre continue : à grand ka, les impulsions se
  déforment (dispersion de réseau).
- **Limites du modèle** : le passage au continu suppose λ ≫ espacement. Pour l'air, l'échelle
  pertinente est le libre parcours moyen (≈ 70 nm `TODO-VERIFY`), d'où une limite de
  l'hypothèse continue vers le GHz. Pont vers la diffusion thermique (D3).
- **Évaluation** : excellent, je le garde en ouverture.

### D2. La célérité est un compromis raideur/inertie : c₀ = √(K/ρ₀)

- **Déclic** : en reliant ressorts ↔ compressibilité et masses ↔ masse volumique, la chaîne
  donne c = √(K/ρ₀) sans calcul. Air, eau, acier, hélium deviennent des points d'un plan
  (log ρ₀, log K) traversé d'isocélérités : l'eau est ~800 × plus dense mais ~15 000 × plus
  raide.
- **Visualisation** : `Plot` log-log interactif + deux curseurs K et ρ₀ sur la chaîne.
- **Point scientifique à trancher (question Q2)** : pour un solide, le module pertinent
  pour l'onde longitudinale n'est pas K mais le module d'onde P, M = K + 4G/3 (et E pour une
  barre mince). « Expliquer l'acier d'un coup » avec K seul serait faux de ~25 %.
- ★ **Déclic supplémentaire** : pour un gaz parfait K = γp₀, donc c₀ = √(γp₀/ρ₀) =
  √(γRT/M) **ne dépend pas de la pression**. Intuition piège : « en altitude, l'air est moins
  dense, le son va plus vite (ou moins vite) » ; à température égale, ni l'un ni l'autre.

### D3. L'erreur de Newton : le son est un phénomène thermodynamique

- **Déclic** : une compression acoustique est trop rapide pour que la chaleur ait le temps
  de diffuser sur une demi-longueur d'onde ; le gaz comprimé s'échauffe, donc il est plus
  raide (γ). Newton (isotherme) trouve ≈ 290 m/s, soit ≈ 15 % de moins que 343 m/s
  (ratio 1/√γ, calculé).
- **Visualisation** : `PVDiagram` (isotherme et adiabatique, pentes p₀ et γp₀) couplé à la
  chaîne colorée en température ; interrupteur « échanges thermiques instantanés »
  qui fait chuter c en direct. Curseur de fréquence comparant la longueur de diffusion
  thermique √(2D/ω) à λ.
- ★ **Prolongement** : ce rapport croît comme √f ; le régime isotherme reviendrait aux très
  hautes fréquences, là où l'hypothèse continue cède de toute façon. Pont vers le chapitre 2
  (matériaux poreux : dans les petits pores, la compressibilité passe d'adiabatique à
  isotherme). À vérifier dans Pierce (`TODO-VERIFY`).
- **Évaluation** : excellent déclic historique ; je le garde.

### D4. La dérivation pas à pas, chaque terme désactivable

- **Système** : continuité, Euler, état → linéarisation → équation des ondes. Chaque étape
  dépliable, hypothèses et ordres négligés explicités.
- **Termes désactivables** dans `Line1D` (simulation p–v 1D) :
  - inertie ρ₀ ∂v/∂t désactivée → le fluide n'a plus de masse : la pression s'égalise
    instantanément, pas d'onde ;
  - compressibilité désactivée (c₀² → ∞) → fluide incompressible : tout le tube bouge
    en bloc, célérité infinie. ★ **Pont** : c'est exactement le champ proche d'une source
    compacte (chapitre 4), localement incompressible ;
  - le terme convectif et la non-linéarité de l'état (cf. D10).
- **Évaluation** : indispensable ; c'est le cœur de l'outil « équation vivante ».

### D5. Les particules oscillent sur place, la perturbation voyage

- **Visualisation** : `Line1D`, vue eulérienne (champ de pression coloré) et vue
  lagrangienne (tranches qui oscillent) superposées ; on suit une tranche, on pose une
  sonde fixe ; bascule entre les deux. Amplification des déplacements affichée en clair
  (« déplacements × 10⁸ »).
- **Ordres de grandeur (calculés)** : à 1 kHz, 0 dB → ξ ≈ 1 × 10⁻¹¹ m (une fraction de
  diamètre atomique) ; 60 dB → ξ ≈ 10 nm, plus petit que le libre parcours moyen. La
  mécanique des milieux continus marche quand même, parce qu'elle décrit une moyenne sur
  un très grand nombre de molécules. Encart pour le lecteur avancé.
- ★ **Intuition piège** : « la pression est maximale là où les particules sont le plus
  déplacées ». Non : p = −K ∂ξ/∂x ; elle est maximale là où les particules **convergent**,
  en quadrature avec ξ dans une onde progressive. Prédiction : placer un curseur là où
  vous pensez que p est maximal.

### D6. d'Alembert : f(x − c₀t) + g(x + c₀t)

- **Visualisation** : le lecteur **dessine** une impulsion au doigt ou à la souris ; elle
  se propage. Deux impulsions se croisent et se traversent sans se perturber ; bascule
  « somme » / « décomposition f et g ».
- **Déclic 1** : deux impulsions de signe opposé se croisent → la pression s'annule
  partout un instant. Où est passée l'énergie ? Toute en cinétique (préparation de D8).
- **Déclic 2** : une impulsion **lâchée au repos** se scinde en deux moitiés qui partent en
  sens opposés. Pourquoi ? Parce qu'on a imposé v = 0 ; ce qui fixe la direction de
  propagation est la relation entre p et v. Transition directe vers D7.

### D7. L'impédance caractéristique ρ₀c₀

- **Déclic (dérivation sans calcul)** : un piston poussé brusquement à la vitesse v ; le
  front avance à c₀ ; en dt, une masse ρ₀c₀ dt par unité de surface est mise en mouvement
  à v. Quantité de mouvement fournie = p dt, donc **p = ρ₀c₀ v**. On _voit_ la zone mise
  en mouvement grandir.
- **Pourquoi en phase** : dans une onde vers +x, pour que la compression avance, le fluide
  doit entrer par son front ; donc v > 0 là où p > 0. `Line1D` affiche p (carmin) et v
  (sarcelle) superposés ; inverser la direction de l'onde inverse le signe de v.
- **Ponts** : à même v, l'eau demande ~3 600 × plus de pression → désadaptation d'impédance
  (chapitre 2) ; un tube terminé par ρ₀c₀ ne réfléchit rien (terminaison anéchoïque,
  chapitre 3) ; ρ₀c₀ se comporte comme une résistance : l'énergie part et ne revient pas.

### D8. Énergie : équipartition et intensité comme flux

- **Visualisation** : `Line1D` avec densités d'énergie cinétique et potentielle (ambre,
  deux nuances) et flèches d'intensité. Curseur **R** (0 → 1) : amplitude d'une onde
  réfléchie qu'on ajoute. R = 0 : onde progressive, e_c = e_p partout à chaque instant,
  l'énergie avance à c₀ (I = e c₀). R = 1 : onde stationnaire, e_c et e_p se séparent dans
  l'espace et le temps, l'intensité instantanée oscille, l'intensité active est nulle.
  Transition continue entre les deux.
- **Évaluation** : très bon ; il prépare aussi le champ proche réactif du chapitre 4.

### D9. Les décibels

- **Visualisation** : `LevelRuler` de 0 à ~194 dB avec exemples réels sourcés ; bascule
  échelle linéaire → tout s'écrase sur zéro sauf l'extrémité : on comprend pourquoi le log.
- **Déclics** : (a) 194 dB : p_eff = p₀ ; au-delà, la raréfaction d'une sinusoïde
  demanderait une pression absolue négative (borne du régime linéaire, et même de la
  sinusoïde) ; (b) N sources incohérentes → +10 log N, N sources cohérentes en phase →
  +20 log N : d'où vient l'énergie « en plus » ? (interférences, pont vers le chapitre 4).
- **Écoute** : pas de ±1, 3, 6, 10 dB, avec mise en garde sur l'absence de calibration.
- **Intuition piège** : « deux fois plus de sources, deux fois plus fort » (+3 dB ;
  la sonie suit plutôt une loi de puissance, chapitre 13).
- **Remarque** : la sonie n'est pas logarithmique (Stevens) ; je propose de ne **pas**
  justifier le dB par la loi de Weber-Fechner, mais par l'étendue dynamique, en signalant
  la nuance.

### ★ D10. La linéarité n'est pas qu'une affaire de niveau, c'est aussi de distance

- **Déclic** : le critère p/(ρ₀c₀²) ≪ 1 est local. Mais la crête d'une onde va un peu plus
  vite que le creux (c₀ + βv), et ce petit écart **se cumule** : distance de formation du
  choc x̄ = 1/(β ε k). Pour une onde plane à 1 kHz et 140 dB, sans pertes : x̄ ≈ 20 m
  (calculé) ; à 120 dB, ≈ 2 km.
- **Deux sources de non-linéarité, chacune désactivable** : β = 1 + B/2A, avec le « 1 »
  convectif (l'air avance avec la crête) et B/2A = (γ − 1)/2 pour un gaz parfait (l'air
  comprimé est plus chaud, donc plus raide).
- **Visualisation** : solution exacte de l'onde simple (Poisson) jusqu'au choc, curseurs
  niveau et distance ; on voit la sinusoïde se raidir. Pas de solveur de choc en phase 1.
- Ce déclic sert d'encadré « Limites du modèle » du chapitre et prépare le chapitre 11.

### Intuitions pièges du chapitre (une principale, deux secondaires)

1. **Principale** : « le son transporte de l'air » (D5).
2. « La pression est maximale là où le déplacement est maximal » (D5).
3. « Dans une cloche à vide, le son ralentit puis s'arrête » : la célérité ne change pas
   (indépendante de p₀) ; c'est ρ₀c₀ qui s'effondre, donc le couplage cloche → gaz → tympan.
   (Je propose de la traiter dans « Monde réel », cf. § 8.)

### Questions de vérification envisagées

- « On double la température absolue : que devient c₀ ? Et ρ₀c₀ ? » (calcul, tolérance 1 %)
- « Placez le curseur là où la pression est maximale » (prédiction spatiale, D5)
- « Quel terme supprimer pour que le tube bouge en bloc ? » (D4)
- « R = 0,5 : l'intensité active est-elle nulle, positive, négative ? » (D8)
- « Deux haut-parleurs identiques en phase, très proches, à basse fréquence : +3 ou +6 dB ? »
- « Pourquoi l'onde de choc se forme-t-elle plus tôt à haute fréquence ? » (D10)

## 8. Exemples « monde réel » — état des sources

| Exemple                              | Valeur                                    | Statut                                                                      |
| ------------------------------------ | ----------------------------------------- | --------------------------------------------------------------------------- |
| Célérité dans l'air à 20 °C          | ≈ 343 m/s                                 | **calculée** (γ, R, M de l'air : CODATA/NIST)                               |
| Hélium à 20 °C                       | ≈ 1 007 m/s                               | **calculée** (γ = 5/3, M = 4,0026 g/mol)                                    |
| Eau douce à 20 °C                    | ≈ 1 482 m/s                               | `TODO-VERIFY` (formule de Del Grosso ou Marczak, à citer)                   |
| Acier                                | ≈ 5 900 m/s (onde P), ≈ 5 100 m/s (barre) | `TODO-VERIFY` (Kaye & Laby / NPL) + Q2                                      |
| Influence de la température          | c(T) = √(γRT/M)                           | calculée ; approximation linéaire comparée                                  |
| Distance d'un orage                  | ≈ 3 s/km                                  | calculée ; mise en garde sur le gradient thermique (pont ch. 10)            |
| Voix à l'hélium                      | f₀ inchangée, formants × c_mél/c_air      | principe sûr ; fraction réelle d'hélium dans le conduit vocal `TODO-VERIFY` |
| Cloche à vide (Boyle, 1660)          | —                                         | historique `TODO-VERIFY`                                                    |
| Décollage de fusée                   | ordre de 170–200 dB en champ proche       | **à sourcer**, aucune valeur avant vérification                             |
| Seuil d'audition, déplacement à 0 dB | ≈ 10⁻¹¹ m                                 | calculée                                                                    |

**Voix à l'hélium** (écoute) : synthèse source-filtre (train d'impulsions glottiques +
3 à 4 formants en filtres passe-bande). Curseur « fraction d'hélium » → célérité du mélange
(γ et M du mélange calculés) → formants qui montent, fondamentale fixe. On entend que la
hauteur ne change pas mais le timbre si.

## 9. Déroulé proposé (jalons et commits)

1. **Socle** : Astro + Svelte + MDX + KaTeX, TS strict, ESLint/Prettier, Vitest, Playwright,
   CI, déploiement Pages, licences, README/CONTRIBUTING/CODE_OF_CONDUCT/CREDITS. Page vide déployée.
2. **Design** : jetons + deux directions en maquettes statiques → **arrêt pour votre choix**.
3. **Fondations** : `lib/color` (palettes + test daltonisme), `lib/scene`, `lib/audio`, `lib/gl`.
4. **Physique** : `lib/physics` complet pour la phase 1, avec tests de référence (§ 9 bis).
5. **Composants** : UI puis viz, chacun avec une page de démonstration interne
   (`/_lab/…`, exclue du sitemap) et des captures Playwright.
6. **Gabarits** : accueil (champ d'onde), carte du cours, gabarit de chapitre, paillasse.
7. **Contenu** : page de prérequis, puis chapitre pilote, section par section.
8. **Finitions** : PWA, Lighthouse, captures 5 tailles × 2 thèmes, autocritique, retrait d'un
   élément superflu. **Bilan et arrêt.**

### 9 bis. Tests physiques de référence (tolérances indicatives)

| Test                                         | Référence                                                                    | Tolérance                      |
| -------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------ |
| c adiabatique vs isotherme                   | ratio = √γ exactement                                                        | 1e−12 (relatif)                |
| c(20 °C) air                                 | 343,2 m/s (calcul indépendant dans le test)                                  | 1e−3                           |
| Chaîne discrète → continu                    | c_groupe(k→0) = a√(K/m) ; écart en O((ka)²) vérifié sur 3 N                  | 1e−3                           |
| Dispersion de la chaîne simulée              | ω = 2√(K/m)·                                                                 | sin(ka/2)                      | (FFT de la simulation) | 0,5 % |
| Forme d'une impulsion (FDTD 1D, Courant = 1) | translation exacte                                                           | 1e−10                          |
| Forme d'une impulsion (Courant < 1)          | erreur de dispersion conforme à la relation numérique                        | documentée                     |
| Équipartition (onde progressive)             | e_c = e_p en chaque point                                                    | 1e−12 (analytique), 1 % (FDTD) |
| Relation p = ρ₀c₀ v                          | onde progressive analytique et simulée                                       | 1e−12 / 1 %                    |
| Intensité moyenne                            | P²/(2ρ₀c₀)                                                                   | 1e−12                          |
| Onde stationnaire                            | intensité active nulle                                                       | 1e−12                          |
| Distance de choc                             | x̄ = 1/(βεk) vs instant où la pente de la solution de Poisson diverge         | 1 %                            |
| FDTD 2D (référence CPU)                      | fréquences propres d'une cavité rectangulaire rigide                         | 0,5 %                          |
| GPU vs CPU (Playwright)                      | même schéma, même grille                                                     | 1e−3 (float32)                 |
| Palette                                      | ΔE_OK monotone, extrémités distinguables en deutéranopie/protanopie simulées | seuils documentés              |

## 10. Décisions (déléguées par l'auteur, à revoir au bilan)

- **D-Q1. Déploiement** : GitHub Pages sous `https://thib1tree.github.io/cours-acoustique/`
  (`base: '/cours-acoustique/'`). La branche `main` est créée à partir de la branche de
  travail une fois le socle en place ; le déploiement se déclenche sur `main`. Il reste
  à activer Pages avec la source « GitHub Actions » dans les réglages du dépôt (action
  de l'auteur, impossible depuis la session).
- **D-Q2. Acier** : D2 reste centré sur les fluides (c₀ = √(K/ρ₀)) ; une note en marge
  donne la forme correcte pour un solide, c = √(M/ρ) avec M = K + 4G/3, et √(E/ρ) pour
  une barre mince. Les solides sont développés au chapitre 8.
- **D-Q3. Périmètre** : le chapitre 1 est scindé en deux pages liées dans le graphe :
  **1a « Équation des ondes et célérité »** (D1–D6) et **1b « Impédance, énergie,
  niveaux »** (D7–D10). Numérotation du curriculum inchangée.
- **D-Q4. Non-linéarité** : D10 est gardé avec la solution exacte de l'onde simple
  (Poisson) jusqu'au choc ; aucun solveur de choc en phase 1.
- **D-Q5. Conventions des ouvrages** : convention e^{−iωt} maintenue ; la correspondance
  avec Pierce et Bruneau est notée dans `notations.md` avec `TODO-VERIFY`.
- **D-Q6. Langue** : `CLAUDE.md` et la documentation restent en français.
