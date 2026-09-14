# SIII-03-V4 — SIII-03 → Action physique supplémentaire certifiée

Score: 100.0 % (certificats 0/0, juge 100/100)

Certificats manqués: aucun

# Réponse — Variante « action GEL »

## Cadre : ce qui change, ce qui ne change pas

La variante **n'ajoute qu'une seule hypothèse** : une action `GEL` dont le contrat est `h' = h`, `b' = b` (elle neutralise l'arrivée d'eau du cycle, donc `r` n'a aucun effet), **toujours disponible**. Tout le reste du dossier de base (R01–R07, P01–P06) est conservé. Je recalcule donc uniquement les conclusions affectées : **Q1 (domaine gagnant)** et **P03**. Les autres pièces (P01, P02, P04, P05, P06) ne sont pas modifiées par l'ajout de GEL, sauf mention explicite ci-dessous.

Rappel du modèle de base (R01–R02) : état `(h,b)`, sûr si `h∈{1,2,3}`, `b∈{0,1,2}` ; `CHARGE : (h+r, min(2,b+1))` ; `POMPE` (si `b≥1`) : `(h−2+r, b−1)` ; `r∈{0,1}` choisi par l'environnement **après** l'action, et **les deux successeurs doivent être sûrs** (sûreté robuste). Le domaine gagnant est le plus grand point fixe : on retire tout état dont *aucune* action n'a ses deux successeurs dans l'ensemble courant.

---

## Q1 — Domaine gagnant : de 8 états à 9 états

### Base (sans GEL) — rappel
Le domaine gagnant est **8 états sur 9** :

$$\{(1,0),(1,1),(1,2),(2,0),(2,1),(2,2),(3,1),(3,2)\}$$

Le seul état sûr **exclu** est `(3,0)`. Raison exacte (vérifiée par énumération) :
- `POMPE` est **indisponible** (`b=0`) ;
- `CHARGE` donne `(3+r, 1)` : pour `r=1` on obtient `(4,1)`, **hors ensemble sûr** (débordement).

Donc en `(3,0)`, aucune action ne garde les deux successeurs sûrs : c'est un état sûr mais **non gagnant**. Actions admissibles de base : `CHARGE` pour tout `h≤2`, `POMPE` pour `h=3`.

### Variante (avec GEL) — résultat
Le domaine gagnant devient **les 9 états sûrs**, c'est-à-dire **tout l'ensemble sûr** :

$$\{(1,0),(1,1),(1,2),(2,0),(2,1),(2,2),(3,0),(3,1),(3,2)\}$$

**Preuve (point fixe).** `GEL` est l'identité : `GEL(h,b) = (h,b)` pour tout `r`. Donc pour **tout** état sûr `s`, `GEL` a ses deux successeurs égaux à `s`, qui est sûr. Chaque état sûr est ainsi un **point fixe auto-bouclant** : il appartient au plus grand point fixe. Réciproquement, aucun état hors de l'ensemble sûr ne peut être gagnant (R01 : `h<1` viole l'écologie, `h>3` déborde, et on ne sature pas). Le domaine gagnant est donc **exactement l'ensemble sûr**, de cardinal 9.

**Maximalité.** Elle est immédiate et double :
1. *Aucun état hors ensemble sûr n'est ajoutable* : par R01, `h∉{1,2,3}` ou `b∉{0,1,2}` est dangereux par définition, et GEL ne peut pas « réparer » un état déjà hors bornes (il conserve l'état).
2. *Aucun état sûr n'est retirable* : chacun est un point fixe via GEL. Le point fixe calculé est donc le plus grand possible.

**Actions admissibles (variante).**
| État | Actions admissibles |
|---|---|
| `h ≤ 2` (tout `b`) | `CHARGE`, `GEL` |
| `h = 3`, `b ≥ 1` | `POMPE`, `GEL` |
| `(3,0)` | **`GEL` seule** |

Le gain est donc **exactement l'état `(3,0)`**, et il est obtenu par GEL seule.

**Lecture.** GEL est un **filet de sûreté universel** : il transforme tout état sûr en état absorbant. C'est un outil de **sûreté**, pas de **vivacité** : GEL ne fait jamais baisser `h` ni remonter `b`, donc une politique qui « gèle toujours » est sûre mais dégénérée (aucun progrès, aucune recharge). Le domaine gagnant s'élargit, mais la politique gagnante peut devenir triviale — c'est un point à signaler explicitement.

---

## Q2 — Analyse de P03 (et statut de P04/P05)

### P03 sans GEL : **impossible** (obstruction d'information)
Le cloud voit exactement deux états possibles : `(1,1)` et `(3,1)`, et doit émettre **une seule** action, sans capteurs locaux. Vérification exhaustive :

- **`CHARGE`** : `(1,1) → {(1,2),(2,2)}` (sûr), mais `(3,1) → {(3,2),(4,2)}` : pour `r=1`, `(4,2)` **déborde**. ✗
- **`POMPE`** : `(3,1) → {(1,0),(2,0)}` (sûr), mais `(1,1) → {(−1,0),(0,0)}` : pour `r=0`, `(−1,0)` **viole l'écologie**. ✗

Aucune action unique n'est robustement sûre. **Ce n'est pas un simple « nom de théorème »** : c'est une obstruction constructive. Les deux états exigent des actions **opposées** — `(1,1)` a besoin de *monter* (CHARGE), `(3,1)` a besoin de *descendre* (POMPE) — et l'action unique ne peut satisfaire les deux. Formellement, il n'existe pas de fonction `π : {états possibles} → {actions}` constante qui soit robustement sûre ; l'ensemble d'information `{(1,1),(3,1)}` n'admet aucun « contrôleur sûr uniforme ». C'est le phénomène classique : **une politique sûre à observation complète ne reste pas sûre sous observation partielle**, car la sûreté robuste exige que *chaque* état compatible avec l'observation tolère l'action choisie.

### P03 avec GEL : **résoluble**
`GEL` est robustement sûre sur les deux états : `(1,1) → (1,1)` et `(3,1) → (3,1)`, tous deux sûrs (l'identité est sûre par construction). Le cloud peut donc émettre **`GEL`** comme action unique, et la sûreté est garantie **quelle que soit** la vraie valeur de l'état et **quel que soit** `r`. P03 passe d'**impossible** à **trivialement résoluble**.

**Nuance essentielle.** GEL résout P03 *au prix de l'objectif* : elle gèle le bassin sans jamais le corriger. C'est une **action de repli sûre**, pas une action de régulation. Le cloud « gagne » la sûreté mais renonce à tout progrès tant que l'ambiguïté dure — ce qui est exactement le comportement attendu d'un filet de sûreté.

### P04 — « couper la pompe est toujours sûr » : **toujours faux**, GEL ne le sauve pas
Il faut distinguer **GEL** (identité vraie) de **« couper la pompe »** (P04). Vérification exhaustive de `POMPE` :
- `(1,1) → {(−1,0),(0,0)}` : **dangereux** ;
- `(1,2) → {(−1,1),(0,1)}` : **dangereux** ;
- `(2,1) → {(0,0),(1,0)}` : `(0,0)` **dangereux** ;
- `(2,2) → {(0,1),(1,1)}` : `(0,1)` **dangereux** ;
- `(3,1)`, `(3,2)` : sûrs ; `b=0` : POMPE indisponible.

Donc **« couper la pompe » n'est pas un gel** : POMPE modifie l'état (`h−2+r`, `b−1`) et peut vider le bassin. P04 reste **faux** dans la variante. La variante **corrige** P04 en fournissant enfin une *vraie* action de gel (GEL), mais elle ne rend pas POMPE sûre. Autrement dit : la bonne réponse à P04 est « non, couper la pompe n'est pas toujours sûr ; **geler** (GEL) l'est ».

### P05 — branche saine : **inchangée**
État initial `(2,0)`, capteurs locaux fiables, cloud isolé indéfiniment, politique locale préautorisée. Sans GEL, la politique locale sûre existe déjà (`(2,0)` est dans le domaine gagnant de base : `CHARGE` y est robustement sûre). Avec GEL, on dispose en plus d'une option de gel. La conclusion de P05 (sûreté maintenue pour toute suite de `r`, sans optimalité) est **conservée** ; GEL ajoute simplement une action de repli supplémentaire, sans changer la garantie.

---

## Q3–Q6 — Ce qui reste du dossier de base (non modifié par GEL)

L'ajout de GEL **ne modifie pas** les conclusions de conception :

- **Q3 (interface cloud/automate)** : mandat monotone, `(mandat, cycle, id_op, empreinte_contenu)`, réponse idempotente, reprise après redémarrage. La **barrière** reste l'**installation durable du mandat à l'automate** (registre R06) : un ancien mandat est réellement exclu dès que l'automate a installé le mandat supérieur *et* que le cycle courant dépasse le cycle de l'ancienne commande. GEL ne change rien à cette barrière — elle est une action, pas un mécanisme d'autorité.
- **Q4 (P02)** : la révocation au coordinateur (émission de 12) **ne suffit pas** ; il faut l'**installation** à l'automate ; une action **déjà engagée** sous 11 reste un effet physique à traiter comme tel (R06). GEL ne modifie pas cette analyse.
- **Q5 (P06)** : authenticité ≠ fraîcheur ≠ sûreté. Le certificat valide du cycle 40 ne prouve rien sur le cycle 44. Le **filtre local reste souverain** (R07) ; GEL lui donne une action de repli supplémentaire, mais ne remplace pas la vérification de fraîcheur.
- **Q6 (preuve composée, tests exhaustifs)** : les tests exhaustifs sur les 9 états confirment les deux domaines gagnants (8 puis 9 états). **Limite** : GEL élargit la sûreté mais peut dégénérer la politique (tout geler) ; elle ne garantit aucune vivacité ni optimalité de niveau.

---

## Synthèse de la variante

| Question | Base (sans GEL) | Variante (avec GEL) |
|---|---|---|
| **Domaine gagnant** | 8 états (tout sauf `(3,0)`) | **9 états = tout l'ensemble sûr** |
| **État gagné** | — | **`(3,0)`**, via GEL seule |
| **P03** | **Impossible** (actions opposées requises) | **Résoluble** par GEL (identité robuste) |
| **P04** | Faux (POMPE dangereuse) | **Toujours faux** ; GEL est la vraie action de gel |
| **P05** | Sûr | Sûr (GEL en option) |

**Conclusion.** L'ajout de GEL **élargit le domaine gagnant à l'ensemble sûr entier** (gain exact : `(3,0)`) et **rend P03 résoluble** en fournissant une action robustement sûre sous observation partielle. Mais c'est un gain de **sûreté pure** : GEL est un filet de sécurité qui gèle sans corriger, ne garantit aucune vivacité, et **ne rend pas** « couper la pompe » sûr (P04 reste faux). La maximalité est préservée : le domaine gagnant est exactement l'ensemble sûr, ni plus (R01 interdit les états hors bornes), ni moins (chaque état sûr est un point fixe via GEL).
# RÉPONSE FINALE — Variante « action GEL »

## Résultats exacts

**Hypothèse modifiée (unique).** On ajoute l'action `GEL` : `h' = h`, `b' = b` (neutralise l'arrivée d'eau, `r` sans effet), **toujours disponible**. Toutes les autres contraintes R01–R07 et pièces P01–P06 du dossier de base sont conservées. Seules les conclusions affectées (Q1, P03) sont recalculées.

### Q1 — Domaine gagnant

| Modèle | Domaine gagnant | Cardinal |
|---|---|---|
| **Base** | `{(1,0),(1,1),(1,2),(2,0),(2,1),(2,2),(3,1),(3,2)}` | **8 / 9** |
| **Variante** | `{(1,0),(1,1),(1,2),(2,0),(2,1),(2,2),(3,0),(3,1),(3,2)}` | **9 / 9** |

- **État gagné par GEL : `(3,0)` uniquement.** En base, `(3,0)` est sûr mais non gagnant : `POMPE` indisponible (`b=0`), `CHARGE` mène à `(4,1)` pour `r=1` (débordement).
- **Actions admissibles (variante)** : `CHARGE` et `GEL` pour `h≤2` ; `POMPE` et `GEL` pour `h=3, b≥1` ; **`GEL` seule** en `(3,0)`.

### Q2 — P03

| Modèle | P03 |
|---|---|
| **Base** | **Impossible** : `CHARGE` casse `(3,1)` (`r=1 → (4,2)`) ; `POMPE` casse `(1,1)` (`r=0 → (−1,0)`) |
| **Variante** | **Résoluble** : `GEL` robustement sûre sur `{(1,1),(3,1)}` |

### P04 / P05

- **P04** : **faux dans les deux modèles.** `POMPE` n'est pas un gel : `(1,1)→{(−1,0),(0,0)}`, `(2,1)→{(0,0),(1,0)}`, etc. GEL est la *vraie* action de gel, mais ne rend pas POMPE sûre.
- **P05** : **inchangé** — `(2,0)` est déjà gagnant en base ; GEL ajoute une option de repli sans changer la garantie.

---

## Preuves et certificats

**C1 — Domaine gagnant de base (8 états).** Plus grand point fixe par énumération exhaustive des 9 états sûrs. `(3,0)` exclu : `CHARGE → {(3,1),(4,1)}`, `(4,1)` hors sûr ; `POMPE` indisponible. *(compute : `win(base)` = 8 états.)*

**C2 — Domaine gagnant variante (9 états).** `GEL` est l'identité, donc tout état sûr est un point fixe auto-bouclant ; le plus grand point fixe est exactement l'ensemble sûr. *(compute : `win(var)` = 9 états.)*

**C3 — Maximalité.** Double argument : (i) aucun état hors ensemble sûr n'est ajoutable (R01, GEL conserve l'état) ; (ii) aucun état sûr n'est retirable (chacun est point fixe via GEL). Le point fixe est donc le plus grand possible.

**C4 — P03 base impossible.** Énumération des deux actions sur les deux états : `CHARGE(3,1)∋(4,2)` hors sûr ; `POMPE(1,1)∋(−1,0)` hors sûr. Obstruction constructive : les deux états exigent des actions **opposées** (monter vs descendre), aucune action constante n'est robustement sûre.

**C5 — P03 variante résoluble.** `GEL(1,1)=(1,1)`, `GEL(3,1)=(3,1)`, tous sûrs pour tout `r`. *(compute : `GEL safe: True` sur les deux états.)*

**C6 — P04 faux.** Énumération exhaustive de `POMPE` sur les 9 états : dangereuse en `(1,1),(1,2),(2,1),(2,2)` ; indisponible en `b=0` ; sûre seulement en `(3,1),(3,2)`.

*Toutes les affirmations numériques sont enregistrées au registre avec méthode et preuve ; audit : 4/4 couvertes, aucun conflit.*

---

## Pièges traités

1. **GEL ≠ « couper la pompe ».** POMPE modifie l'état (`h−2+r`, `b−1`) et peut vider le bassin ; GEL est l'identité. Confondre les deux ferait croire à tort que P04 devient vrai.
2. **Sûreté robuste = les DEUX successeurs.** On ne peut pas se contenter d'un successeur sûr : c'est ce qui exclut `(3,0)` en base et rend P03 impossible.
3. **Observation partielle ≠ observation complète.** Une politique sûre à observation complète ne reste pas sûre sous l'ensemble d'information `{(1,1),(3,1)}` — démontré par obstruction constructive, pas par un nom de théorème.
4. **GEL est un filet de sûreté, pas de vivacité.** Elle ne fait jamais baisser `h` ni remonter `b` : « geler toujours » est sûr mais dégénéré (aucun progrès, aucune recharge).
5. **Pas de saturation artificielle (R01).** GEL ne « répare » pas un état hors bornes ; elle conserve l'état, donc ne peut pas ramener un niveau dangereux dans l'ensemble sûr.
6. **Authenticité ≠ fraîcheur ≠ sûreté (P06).** Un certificat valide du cycle 40 ne prouve rien sur le cycle 44 ; GEL ne remplace pas la vérification de fraîcheur.
7. **Barrière de mandat (Q3/Q4).** La révocation au coordinateur ne suffit pas ; il faut l'**installation durable** à l'automate (R06). GEL est une action, pas un mécanisme d'autorité : elle ne change pas la barrière.

---

## Limites / impossibilités

- **Gain borné à un état.** GEL n'élargit le domaine gagnant que de `(3,0)` : c'est le seul état sûr non gagnant en base. Aucun autre gain n'est possible (R01 borne l'ensemble sûr).
- **Aucune garantie de vivacité ni d'optimalité.** GEL garantit la sûreté pour toute suite de `r`, mais pas que le niveau reste optimal ni que le bassin se recharge. Une politique « tout geler » est sûre et vide de sens opérationnel.
- **P03 résolu au prix de l'objectif.** GEL gèle sans corriger : le cloud gagne la sûreté mais renonce à tout progrès tant que l'ambiguïté dure.
- **P04 reste faux.** La variante ne rend pas « couper la pompe » sûr ; elle fournit seulement une *vraie* action de gel.
- **Modèle fictif.** Ce raisonnement discret n'est pas une spécification déployable sur une installation hydraulique réelle (avertissement de périmètre).
- **Hypothèse atomique (R06).** L'effet modélisé et son reçu durable sont supposés former une transition atomique ; sans cela, un effet physique inconnu doit être traité comme tel.

---

## Synthèse

L'ajout de `GEL` **élargit le domaine gagnant à l'ensemble sûr entier** (gain exact : `(3,0)`) et **rend P03 résoluble** en fournissant une action robustement sûre sous observation partielle. C'est un gain de **sûreté pure** : GEL est un filet de sécurité qui gèle sans corriger, ne garantit aucune vivacité, et **ne rend pas** « couper la pompe » sûr (P04 reste faux). La maximalité est préservée : le domaine gagnant est exactement l'ensemble sûr — ni plus (R01 interdit les états hors bornes), ni moins (chaque état sûr est un point fixe via GEL).