/**
 * Curriculum graph: every planned page, its prerequisites, and whether it is written.
 * The course map and the prerequisite path are computed from this file. Chapter
 * front matter `prerequisites` must use these ids (checked by a test).
 */
export interface CurriculumNode {
  readonly id: string;
  readonly num: string;
  readonly title: string;
  readonly summary: string;
  readonly requires: readonly string[];
  /** Path under the site base when the page exists. */
  readonly href?: string;
}

export const CURRICULUM: readonly CurriculumNode[] = [
  {
    id: 'complexes',
    num: '0.1',
    title: 'Nombres complexes et phaseurs',
    summary: 'La notation e^{−iωt} et ce qu’elle simplifie.',
    requires: [],
  },
  {
    id: 'fourier',
    num: '0.2',
    title: 'Analyse de Fourier',
    summary: 'Séries, transformée, TFD.',
    requires: ['complexes'],
  },
  {
    id: 'edp',
    num: '0.3',
    title: 'EDP et séparation des variables',
    summary: 'Équations aux dérivées partielles et leurs solutions élémentaires.',
    requires: [],
  },
  {
    id: 'fluides',
    num: '0.4',
    title: 'Rappels de mécanique des fluides',
    summary:
      'Particule de fluide, conservation de la masse, Euler, équation d’état, compressibilité.',
    requires: [],
    href: 'prerequis/mecanique-des-fluides/',
  },
  {
    id: 'speciales',
    num: '0.5',
    title: 'Fonctions spéciales',
    summary: 'Bessel, Legendre, harmoniques sphériques.',
    requires: [],
  },
  {
    id: 'green',
    num: '0.6',
    title: 'Fonctions de Green',
    summary: 'Réponse à une source ponctuelle.',
    requires: ['edp'],
  },
  {
    id: 'signal',
    num: '0.7',
    title: 'Traitement du signal',
    summary: 'Convolution, filtrage, réponse impulsionnelle.',
    requires: ['fourier'],
  },
  {
    id: 'ondes',
    num: '1a',
    title: 'Équation des ondes et célérité',
    summary:
      'D’une chaîne de masses à l’équation des ondes ; pourquoi le son va plus vite dans l’eau.',
    requires: ['fluides', 'edp'],
    href: 'chapitres/01a-equation-des-ondes/',
  },
  {
    id: 'impedance',
    num: '1b',
    title: 'Impédance, énergie, niveaux',
    summary: 'Pourquoi p et v sont en phase, où va l’énergie, et pourquoi des décibels.',
    requires: ['ondes', 'complexes'],
    href: 'chapitres/01b-impedance-energie-niveaux/',
  },
  {
    id: 'planes',
    num: '2',
    title: 'Ondes planes',
    summary: 'Interfaces, réflexion, transmission, matériaux absorbants.',
    requires: ['impedance'],
    href: 'chapitres/02-ondes-planes/',
  },
  {
    id: 'guides',
    num: '3',
    title: 'Guides et cavités',
    summary: 'Modes, tubes, correction de bout, résonateur de Helmholtz.',
    requires: ['planes', 'speciales'],
    href: 'chapitres/03-guides-cavites/',
  },
  {
    id: 'rayonnement',
    num: '4',
    title: 'Rayonnement',
    summary: 'Monopôle, dipôle, piston bafflé, champ proche, Kirchhoff-Helmholtz.',
    requires: ['impedance', 'speciales', 'green'],
    href: 'chapitres/04-rayonnement/',
  },
  {
    id: 'mouvement',
    num: '5',
    title: 'Sources en mouvement',
    summary: 'Doppler, amplification convective, cône de Mach.',
    requires: ['rayonnement'],
    href: 'chapitres/05-sources-en-mouvement/',
  },
  {
    id: 'diffraction',
    num: '6',
    title: 'Diffraction et diffusion',
    summary: 'Sphère, cylindre, écrans, Fresnel.',
    requires: ['rayonnement'],
    href: 'chapitres/06-diffraction-diffusion/',
  },
  {
    id: 'salles',
    num: '7',
    title: 'Acoustique des salles',
    summary: 'Modes, Sabine, sources-images, réponse impulsionnelle.',
    requires: ['guides', 'signal'],
  },
  {
    id: 'vibro',
    num: '8',
    title: 'Vibroacoustique',
    summary: 'Plaques, coïncidence, loi de masse, isolation.',
    requires: ['planes', 'rayonnement'],
  },
  {
    id: 'electro',
    num: '9',
    title: 'Électroacoustique',
    summary: 'Haut-parleurs, Thiele-Small, microphones.',
    requires: ['guides', 'rayonnement'],
  },
  {
    id: 'exterieur',
    num: '10',
    title: 'Propagation extérieure et sous-marine',
    summary: 'Absorption, gradients, effet de sol, canal SOFAR.',
    requires: ['planes', 'diffraction'],
  },
  {
    id: 'nonlineaire',
    num: '11',
    title: 'Acoustique non linéaire',
    summary: 'Burgers, chocs, lithotripsie.',
    requires: ['impedance'],
  },
  {
    id: 'antennes',
    num: '12',
    title: 'Antennes et imagerie',
    summary: 'Formation de voies, holographie, retournement temporel.',
    requires: ['rayonnement', 'signal'],
  },
  {
    id: 'psycho',
    num: '13',
    title: 'Psychoacoustique',
    summary: 'Sonie, masquage, hauteur, localisation.',
    requires: ['impedance', 'fourier'],
  },
  {
    id: 'au-dela',
    num: '14',
    title: 'Au-delà',
    summary: 'FDTD, FEM, BEM, métamatériaux, Lighthill.',
    requires: ['diffraction', 'vibro', 'nonlineaire'],
  },
];

export const byId = (id: string): CurriculumNode | undefined => CURRICULUM.find((n) => n.id === id);
