# Cours d'acoustique interactif

Un cours d'acoustique **open source** de niveau master et au-delà, où chaque notion se
**manipule, se voit et s'entend**. Le texte guide l'expérimentation ; les visualisations
montrent le mécanisme physique (quelle force agit sur quelle particule, d'où vient le
retard de phase, où va l'énergie) jusqu'à ce que l'équation devienne évidente.

Public : étudiants de L3 et master en physique, mécanique ou ingénierie, ingénieurs,
chercheurs d'autres domaines. Ce n'est pas de la vulgarisation.

**Site** : https://thib1tree.github.io/cours-acoustique/

État : phase 1, preuve de concept. Disponible : la page de prérequis « Rappels de
mécanique des fluides » et le chapitre 1 (« Équation des ondes et célérité », « Impédance,
énergie, niveaux »). La carte du cours montre le reste du programme.

## Principes

- Deux niveaux de visualisation pour chaque notion : un **schéma** qui isole un mécanisme,
  et des cas du **monde réel** avec des ordres de grandeur sourcés.
- Des **équations vivantes** : chaque terme est relié à la visualisation et peut être
  désactivé pour voir à quoi il sert.
- Le **son** comme troisième dimension (Web Audio, limiteur en sortie, volume bas par défaut).
- Une **rigueur testée** : chaque formule et chaque solveur est vérifié automatiquement
  contre une solution analytique de référence.

## Lancer le site en local

Prérequis : Node.js ≥ 22 et pnpm 10.

```sh
pnpm install
pnpm dev          # http://localhost:4321/cours-acoustique/
pnpm test         # tests physiques (Vitest)
pnpm build && pnpm test:e2e   # tests de bout en bout (Playwright, 5 tailles d'écran)
pnpm lint
```

## Organisation

```
src/lib/physics/     formules et solveurs, chacun testé contre une solution analytique
src/lib/audio/       moteur audio (limiteur, volume bas, déverrouillage iOS)
src/lib/scene/       état partagé des visualisations, encodé dans l'URL
src/components/      visualisations (Svelte), interface, blocs de contenu
src/content/         chapitres en MDX, curriculum, glossaire, notations
docs/                plan de la phase 1, directions visuelles
```

## Technologies

Astro + MDX, Svelte 5, TypeScript strict, KaTeX, WebGL2, Web Audio API, Vitest,
Playwright, GitHub Actions, GitHub Pages. Aucun traqueur, aucun cookie.

## Contribuer

Les corrections scientifiques sont les contributions les plus précieuses. Voir
[CONTRIBUTING.md](CONTRIBUTING.md) et le [code de conduite](CODE_OF_CONDUCT.md).

## Licences

- Code : [MIT](LICENSE).
- Contenu pédagogique (`src/content/`) : [CC BY-SA 4.0](LICENSE-CONTENT).
- Ressources tierces : [CREDITS.md](CREDITS.md).
