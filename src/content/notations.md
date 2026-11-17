---
title: Notations et conventions
---

Ce fichier **fait foi** pour tout le cours. Une notation qui s'en écarte doit être signalée là où elle apparaît.

## Convention temporelle

Une grandeur harmonique s'écrit $p(\mathbf{x}, t) = \operatorname{Re}\{P(\mathbf{x})\,e^{-i\omega t}\}$. Une onde plane progressive vers les $x$ croissants s'écrit $e^{i(kx-\omega t)}$.

Conséquences pratiques :

- dériver par rapport au temps revient à multiplier l'amplitude complexe par $-i\omega$ ;
- une impédance de masse s'écrit $Z = -i\omega m$, une impédance de raideur $Z = iK/\omega$ ;
- une onde amortie vers les $x$ croissants a un nombre d'onde de partie imaginaire positive.

Correspondance avec les ouvrages de référence :

| Ouvrage                                     | Convention                    | Passage d'une écriture à l'autre |
| ------------------------------------------- | ----------------------------- | -------------------------------- |
| Pierce, _Acoustics_                         | $e^{-i\omega t}$ (à vérifier) | identique au site                |
| Bruneau, _Manuel d'acoustique fondamentale_ | $e^{+j\omega t}$ (à vérifier) | remplacer $j$ par $-i$           |

<!-- TODO-VERIFY: conventions temporelles de Pierce (3e éd., 2019) et de Bruneau (1998 / 2006). -->

## Symboles

| Symbole           | Grandeur                                                                                                      | Unité SI |
| ----------------- | ------------------------------------------------------------------------------------------------------------- | -------- |
| $p$               | pression acoustique (écart à la pression statique)                                                            | Pa       |
| $p_0$             | pression statique                                                                                             | Pa       |
| $\rho_0$          | masse volumique au repos                                                                                      | kg/m³    |
| $\rho'$           | fluctuation de masse volumique                                                                                | kg/m³    |
| $c_0$             | célérité du son                                                                                               | m/s      |
| $\mathbf{v}$, $v$ | vitesse particulaire (vecteur, composante)                                                                    | m/s      |
| $\xi$             | déplacement particulaire                                                                                      | m        |
| $K$               | module de compressibilité ($K = \rho_0 c_0^2$)                                                                | Pa       |
| $\gamma$          | rapport des capacités thermiques $c_p/c_v$                                                                    | —        |
| $Z$               | impédance ; $Z_c = \rho_0 c_0$ impédance caractéristique                                                      | Pa·s/m   |
| $k$               | nombre d'onde $\omega/c_0$                                                                                    | rad/m    |
| $\omega$          | pulsation $2\pi f$                                                                                            | rad/s    |
| $\lambda$         | longueur d'onde $2\pi/k$                                                                                      | m        |
| $I$               | intensité acoustique (flux d'énergie)                                                                         | W/m²     |
| $e_c$, $e_p$      | densités d'énergie cinétique et potentielle                                                                   | J/m³     |
| $L_p$             | niveau de pression, $20\log_{10}(p_{\mathrm{eff}}/p_{\mathrm{ref}})$, $p_{\mathrm{ref}} = 20\ \mu\mathrm{Pa}$ | dB       |
| $L_I$             | niveau d'intensité, $10\log_{10}(I/I_{\mathrm{ref}})$, $I_{\mathrm{ref}} = 10^{-12}\ \mathrm{W/m^2}$          | dB       |
| $\beta$           | coefficient de non-linéarité $1 + B/2A$                                                                       | —        |

## Couleurs des grandeurs physiques

Les mêmes couleurs désignent les mêmes grandeurs dans toutes les figures :

- **pression** : du cobalt (raréfaction, $p<0$) au carmin (compression, $p>0$), en passant par la couleur du fond pour $p=0$ ;
- **vitesse particulaire** : sarcelle ;
- **énergie et intensité** : ambre.

Le reste de l'interface est neutre.
