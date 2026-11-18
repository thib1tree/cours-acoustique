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
  delany: {
    short: 'Delany et Bazley, 1970',
    full: 'M. E. Delany, E. N. Bazley, « Acoustical properties of fibrous absorbent materials », <i>Applied Acoustics</i> 3(2), 105–116, 1970.',
    url: 'https://doi.org/10.1016/0003-682X(70)90031-9',
    note: 'TODO-VERIFY : coefficients du modèle et domaine de validité 0,01 < X < 1.',
  },
  allard: {
    short: 'Allard et Atalla, 2009',
    full: 'J.-F. Allard, N. Atalla, <i>Propagation of Sound in Porous Media</i>, 2<sup>e</sup> éd., Wiley, 2009.',
    url: 'https://doi.org/10.1002/9780470747339',
  },
  iso10534: {
    short: 'ISO 10534',
    full: 'ISO 10534-1 et 10534-2, <i>Acoustique : détermination du facteur d’absorption acoustique et de l’impédance dans les tubes d’impédance</i> (méthode du taux d’ondes stationnaires ; méthode de la fonction de transfert).',
    note: 'TODO-VERIFY : intitulés et années des deux parties.',
  },
  kinsler: {
    short: 'Kinsler et al., 2000',
    full: 'L. E. Kinsler, A. R. Frey, A. B. Coppens, J. V. Sanders, <i>Fundamentals of Acoustics</i>, 4<sup>e</sup> éd., Wiley, 2000.',
  },
  fletcher: {
    short: 'Fletcher et Rossing, 1998',
    full: 'N. H. Fletcher, T. D. Rossing, <i>The Physics of Musical Instruments</i>, 2<sup>e</sup> éd., Springer, 1998.',
    url: 'https://doi.org/10.1007/978-0-387-21603-4',
    note: 'TODO-VERIFY : édition et DOI.',
  },
  rayleigh: {
    short: 'Rayleigh, 1896',
    full: 'J. W. Strutt, Lord Rayleigh, <i>The Theory of Sound</i>, 2<sup>e</sup> éd., Macmillan, 1896 (2 vol.).',
    note: 'TODO-VERIFY : volume où figurent le résonateur et la correction de bout bafflée.',
  },
  levine: {
    short: 'Levine et Schwinger, 1948',
    full: 'H. Levine, J. Schwinger, « On the radiation of sound from an unflanged circular pipe », <i>Physical Review</i> 73(4), 383–406, 1948.',
    url: 'https://doi.org/10.1103/PhysRev.73.383',
    note: 'TODO-VERIFY : référence complète et valeur 0,6133 a.',
  },
  abramowitz: {
    short: 'Abramowitz et Stegun, 1964',
    full: 'M. Abramowitz, I. A. Stegun (dir.), <i>Handbook of Mathematical Functions</i>, National Bureau of Standards, 1964.',
    note: 'TODO-VERIFY : table des zéros de J′ₙ (chapitre 9).',
  },
  morse: {
    short: 'Morse et Ingard, 1968',
    full: 'P. M. Morse, K. U. Ingard, <i>Theoretical Acoustics</i>, McGraw-Hill, 1968 ; rééd. Princeton University Press, 1986.',
    note: 'TODO-VERIFY : éditions.',
  },
};
