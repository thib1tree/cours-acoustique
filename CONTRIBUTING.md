# Contribuer

Merci de vouloir améliorer ce cours. Trois types de contributions, du plus simple au plus
technique :

1. **Signaler une erreur scientifique** : ouvrez une issue « Erreur scientifique » en citant
   la page, le passage, et si possible une référence. C'est la contribution la plus utile.
2. **Améliorer un texte** : les chapitres sont des fichiers MDX (du Markdown avec des
   composants) dans `src/content/`. On peut les modifier directement depuis GitHub.
3. **Ajouter une visualisation ou un chapitre** : lisez d'abord [`CLAUDE.md`](CLAUDE.md),
   qui fait foi pour les conventions, l'architecture et la direction visuelle.

## Exigences pédagogiques

Chaque notion vise un **déclic** : le lecteur doit voir le mécanisme physique, pas seulement
le résultat. Avant d'écrire un chapitre, ouvrez une issue « Proposition de chapitre » avec la
**liste des déclics visés** et les visualisations qui les provoquent ; c'est elle qui est
validée en premier. L'anatomie d'un chapitre (accroche, prédiction, exploration, mécanisme,
formalisation, intuition piège, limites du modèle, monde réel, vérification, pour aller plus
loin) est décrite dans `CLAUDE.md` § 3.

## Conventions scientifiques

- Unités SI ; convention temporelle **e^{−iωt}** (signaler tout écart).
- Notations : [`src/content/notations.md`](src/content/notations.md) fait foi.
- Chaque dérivation énonce ses hypothèses ; aucune étape magique.
- **Aucune valeur réelle sans source.** En cas de doute, laissez un marqueur
  `{/* TODO-VERIFY: … */}` (commentaire JSX, seul permis en MDX) : il sera relu avant publication. Ne citez jamais un numéro de
  page ou d'équation que vous n'avez pas sous les yeux.

## Conventions de code

- Code, identifiants, noms de fichiers et commentaires en **anglais** ; contenu en français.
- TypeScript strict, Svelte 5 (runes).
- `src/lib/physics/` : fonctions pures, sans DOM, **chacune testée contre une solution
  analytique** avec une tolérance documentée.
- Commits au format [Conventional Commits](https://www.conventionalcommits.org/fr/)
  (`feat(viz): …`, `fix(physics): …`, `docs(content): …`).

## Écrire dans le MDX

- Les équations statiques s'écrivent en LaTeX entre `$…$` ou `$$…$$` (rendu KaTeX au build).
  Coupez les équations longues avec `\begin{aligned}` pour qu'elles tiennent sur un téléphone.
- Les équations vivantes utilisent `<LiveEquation scene="…" tex={String.raw`…`} />` avec
  les macros `\term{clé}{…}` (terme relié à la figure) et `\val{clé}` (valeur en direct).
- Les commentaires HTML sont interdits en MDX : écrivez `{/* TODO-VERIFY: … */}`.
- Une note en marge s'écrit dans le paragraphe : `texte<MarginNote n="1">note</MarginNote> suite`.

## Ajouter un chapitre

1. Déclarez le chapitre et ses prérequis dans `src/content/curriculum.ts` (la carte du
   cours en est tirée), puis créez `src/content/chapitres/NN-slug/index.mdx` avec les
   métadonnées obligatoires : `curriculumId`, `title`, `summary`, `number`, `level`,
   `duration`, `keyConcepts`, `prerequisites`, `references` (le build échoue si l'une manque).
2. Déclarez les scènes interactives dans `src/scenes/`.
3. Assemblez des composants existants de `src/components/` (catalogue dans `CLAUDE.md` § 8) ;
   si une brique manque, rendez-la générique avant de l'ajouter.
4. Placez les formules et solveurs dans `src/lib/physics/` avec leurs tests.
5. Vérifiez en local : `pnpm lint && pnpm test && pnpm build && pnpm test:e2e`.

## Relecture scientifique

Toute modification du contenu ou de `src/lib/physics/` est relue par un relecteur
scientifique avant fusion. Le modèle de pull request contient une liste de contrôle :
hypothèses énoncées, valeurs sourcées, `TODO-VERIFY` listés, tests de référence ajoutés.

## Licences

En contribuant, vous acceptez que votre code soit publié sous licence MIT et votre contenu
pédagogique sous licence CC BY-SA 4.0.
