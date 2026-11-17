# Directions visuelles : deux propositions à départager

Deux directions, toutes deux fidèles au concept de la « chambre anéchoïque ». Elles
partagent les **mêmes jetons physiques** (palette, durées, cibles tactiles) et diffèrent
par la structure de la page. Chacune comprend quatre vues : accueil, chapitre avec
visualisation, carte du cours et mobile, en clair et en sombre.

Captures (régénérables avec `node scripts/design-captures.mjs` après `pnpm install`) :

| | Bureau | Mobile |
|---|---|---|
| A « Instrument » | [A-bureau.png](captures/A-bureau.png) | [A-mobile.png](captures/A-mobile.png) |
| B « Planche » | [B-bureau.png](captures/B-bureau.png) | [B-mobile.png](captures/B-mobile.png) |

Les maquettes HTML (`a/`, `b/`) s'ouvrent directement dans un navigateur, depuis un clone
où `pnpm install` a été lancé. Le champ d'onde de l'accueil y est déjà interactif (FDTD sur
CPU ; la version du site tournera sur GPU). Les autres visualisations sont figées.

## Jetons communs (déjà en place dans le code)

- **Palette physique** : `src/lib/color/palette.ts` (source unique), générée en
  `src/styles/palette.css`. La palette de pression est divergente (cobalt, puis fond de
  page, puis carmin) et l'énergie a une rampe séquentielle ambre. Les deux sont
  échantillonnées uniformément en OKLab. Les tests vérifient :
  - le gamut sRGB ;
  - les contrastes WCAG : encre ≥ 7:1, encre secondaire ≥ 4,5:1, traits physiques ≥ 3:1 ;
  - la symétrie des deux signes ;
  - la lisibilité de |p| sous protanopie, deutéranopie et tritanopie simulées.
- **Espacements** : 4, 8, 12, 16, 24, 32, 48, 64, 96 px. **Durées** : 150, 200 et 250 ms.
  **Cibles tactiles** : 44 px. **Gouttière mobile** : 16 px.
- **Couleur d'interaction** : l'encre, jamais une teinte d'accent. Un curseur prend la
  couleur de la grandeur qu'il commande (carmin pour `L_p`) et reste neutre pour un
  paramètre sans couleur (`f`).

## A « Instrument »

La page est un appareil de mesure.
- **Typographie** : titres et interface en Atkinson Hyperlegible Next, texte en Source Serif 4.
- **En-tête** : une règle graduée sert de barre de progression. Chaque graduation marque
  une section, et la partie remplie la portion déjà lue.
- **Visualisations** : encadrées par leurs propres axes gradués (positions en mètres).
  Les valeurs des curseurs sont dans des champs éditables.
- **Encadrés** : un filet vertical à gauche, sans carte ni ombre.
- **Carte du cours** : graphe en couches de gauche à droite, liens en « plan de métro »,
  panneau du chemin à parcourir.

## B « Planche »

La page est un livre de physique moderne.
- **Typographie** : texte et titres en Literata ; interface en Atkinson, réduite au minimum.
- **Mise en page** : les intitulés (« Prédiction », « Le déclic », « Intuition piège »)
  sont suspendus dans la marge gauche.
- **Visualisations** : des planches pleine largeur sur une surface à peine plus sombre,
  avec une légende rédigée.
- **Accueil** : page coupée en deux, le champ d'onde est une planche à part.
- **Carte du cours** : diagramme en arcs vertical (le même schéma sert sur mobile).

## Autocritique au regard du brief

Ce qui risquait d'être générique, et ce que j'en ai fait :

- **A, colonne de sections à gauche** : c'est l'élément qui rappelle le plus un gabarit
  de documentation. Je l'ai gardé pour la navigation, mais la signature de A est ailleurs :
  la règle de progression et les axes gradués portent tous deux une information.
- **B, mot-symbole en italique et contrôles en pilules** : ils tirent vers un blog
  éditorial et une application grand public. Si B est retenu, je propose des segments
  rectangulaires et un mot-symbole droit.
- **Défauts corrigés après les captures** :
  - un point médian dans un titre de figure (interdit par le brief) ;
  - des libellés qui se chevauchaient sous le piston ;
  - des liens de la carte qui traversaient les libellés ;
  - un accueil mobile illisible (trop de réflexions sur une petite grille) ;
  - une carte mobile de B trop petite ;
  - un texte qui disait « trait noir » alors qu'en sombre le trait est clair.
- **Élément superflu retiré** : la pastille « tranche suivie » dans la légende de la
  figure, redondante avec le texte.
- **Point ouvert** : le zéro d'Atkinson Hyperlegible Next est barré (« 0 » ressemble à
  « Ø »). En physique, Ø désigne aussi un diamètre ou l'ensemble vide. Les valeurs
  numériques pourraient utiliser les chiffres tabulaires de la serif.

## Recommandation

**A**, parce que sa structure sert directement l'objectif du site : manipuler et
mesurer. Les axes gradués, les unités visibles et les valeurs éditables rendent chaque
visualisation lisible comme une expérience. Deux emprunts à B l'amélioreraient :
1. les légendes de figure rédigées en serif (plus pédagogiques qu'un titre court) ;
2. les intitulés suspendus dans la marge pour « Le déclic » et « Intuition piège », sur
   grand écran.

B se lit plus agréablement sur de longues sessions ; c'est son vrai avantage.
