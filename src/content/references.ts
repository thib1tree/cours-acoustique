/**
 * Bibliography. Never cite a page, equation or section number without checking it:
 * locations go in the `loc` prop of <Cite> and are marked TODO-VERIFY until checked.
 */
export interface Reference {
  short: string;
  full: string;
  url?: string;
  note?: string;
}

export const REFERENCES: Record<string, Reference> = {
  pierce: {
    short: 'Pierce, 2019',
    full: 'A. D. Pierce, <i>Acoustics: An Introduction to Its Physical Principles and Applications</i>, 3<sup>e</sup> éd., Springer / ASA Press, 2019.',
    url: 'https://doi.org/10.1007/978-3-030-11214-1',
    note: 'Ouvrage de référence pour les notations (convention e^{−iωt}).',
  },
  bruneau: {
    short: 'Bruneau, 2006',
    full: 'M. Bruneau, <i>Manuel d’acoustique fondamentale</i>, Hermès, 1998 ; trad. angl. <i>Fundamentals of Acoustics</i>, ISTE, 2006.',
    note: 'TODO-VERIFY : éditions et années.',
  },
  hamilton: {
    short: 'Hamilton et Blackstock, 2008',
    full: 'M. F. Hamilton, D. T. Blackstock (dir.), <i>Nonlinear Acoustics</i>, Acoustical Society of America, 2008.',
    note: 'TODO-VERIFY : édition (Academic Press 1998, réimpression ASA 2008).',
  },
  finn: {
    short: 'Finn, 1964',
    full: 'B. S. Finn, « Laplace and the speed of sound », <i>Isis</i> 55(1), 7–19, 1964.',
    url: 'https://doi.org/10.1086/349791',
    note: 'TODO-VERIFY : référence historique sur la correction de Laplace.',
  },
  marczak: {
    short: 'Marczak, 1997',
    full: 'W. Marczak, « Water as a standard in the measurements of speed of sound in liquids », <i>J. Acoust. Soc. Am.</i> 102(5), 2776–2779, 1997.',
    url: 'https://doi.org/10.1121/1.420332',
    note: 'TODO-VERIFY : valeur 1482,3 m/s à 20 °C.',
  },
  codata: {
    short: 'CODATA, 2018',
    full: 'E. Tiesinga <i>et al.</i>, « CODATA recommended values of the fundamental physical constants: 2018 », <i>Rev. Mod. Phys.</i> 93, 025010, 2021.',
    url: 'https://doi.org/10.1103/RevModPhys.93.025010',
  },
  peterson: {
    short: 'Peterson et Barney, 1952',
    full: 'G. E. Peterson, H. L. Barney, « Control methods used in a study of the vowels », <i>J. Acoust. Soc. Am.</i> 24(2), 175–184, 1952.',
    url: 'https://doi.org/10.1121/1.1906875',
    note: 'TODO-VERIFY : formants de /ɑ/ masculin (730, 1090, 2440 Hz).',
  },
  machado: {
    short: 'Machado et al., 2009',
    full: 'G. M. Machado, M. M. Oliveira, L. A. F. Fernandes, « A physiologically-based model for simulation of color vision deficiency », <i>IEEE TVCG</i> 15(6), 1291–1298, 2009.',
    url: 'https://doi.org/10.1109/TVCG.2009.113',
  },
  ottosson: {
    short: 'Ottosson, 2020',
    full: 'B. Ottosson, « A perceptual color space for image processing », 2020.',
    url: 'https://bottosson.github.io/posts/oklab/',
  },
  kinsler: {
    short: 'Kinsler et al., 2000',
    full: 'L. E. Kinsler, A. R. Frey, A. B. Coppens, J. V. Sanders, <i>Fundamentals of Acoustics</i>, 4<sup>e</sup> éd., Wiley, 2000.',
  },
};
