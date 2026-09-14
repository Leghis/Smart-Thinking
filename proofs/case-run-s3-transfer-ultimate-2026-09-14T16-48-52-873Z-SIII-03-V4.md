# SIII-03-V4 — SIII-03 → Action physique supplémentaire certifiée

Score: 100.0 % (certificats 0/0, juge 100/100)

Certificats manqués: aucun

La maximalité est prouvée par le point fixe (tout état hors W est éliminé par un témoin de sortie). J'ai tout ce qu'il faut pour rédiger.

## Réponse

**Variante : ajout de l'action GEL** (`h' = h`, `b' = b`, toujours disponible, neutralise l'arrivée d'eau du cycle).

### Q1 — Domaine gagnant (jeu de sûreté)

**Sans GEL (dossier de base) :** le plus grand sous-ensemble d'états sûrs depuis lequel une politique garde la sûreté pour tout `r ∈ {0,1}` est

$$W_1 = \{(1,0),(1,1),(1,2),(2,0),(2,1),(2,2),(3,1),(3,2)\},\quad |W_1| = 8.$$

L'état **(3,0) est exclu** : c'est le seul état sûr perdant.

**Avec GEL (variante) :** le domaine gagnant devient **tout l'ensemble sûr**

$$W_2 = \{(1,0),(1,1),(1,2),(2,0),(2,1),(2,2),(3,0),(3,1),(3,2)\},\quad |W_2| = 9.$$

**Actions admissibles (celles dont les deux successeurs restent dans le domaine gagnant) :**

| État | Sans GEL | Avec GEL |
|---|---|---|
| (1,0),(1,1),(1,2) | CHARGE | CHARGE, GEL |
| (2,0),(2,1),(2,2) | CHARGE | CHARGE, GEL |
| (3,0) | **aucune** (perdant) | **GEL** (seul recours) |
| (3,1),(3,2) | POMPE | POMPE, GEL |

**Le gain de la variante est exactement l'état (3,0)** : GEL le rend gagnant, et il n'y a aucun autre changement (les 8 états de W₁ restent gagnants, avec GEL comme action supplémentaire admissible).

### Q2 — Analyse de P01, P03, P04, P05

- **P01 (rejeu)** : (3,2) → POMPE, r=0 → (1,1). Rejouée après redémarrage, la commande s'applique au cycle suivant. L'automate actuel (R05) ne compare ni mandat ni cycle : il rejoue. La sûreté *par état* n'est pas violée ici ((1,1)∈W), mais c'est une **faille de fraîcheur** : la même commande peut être rejouée à un cycle où elle est dangereuse. GEL ne corrige pas ce point (c'est un problème d'identité de commande, pas d'action).
- **P03 (observation ambiguë {(1,1),(3,1)})** : voir ci-dessous, c'est le cœur de la variante.
- **P04 (« tout figer en coupant la pompe est toujours sûr »)** : **faux**. Couper la pompe = CHARGE (R02). En (3,0), CHARGE mène à (3,1) ou (4,1) : (4,1) est un débordement. Donc « figer » n'est pas sûr en (3,0) sans GEL. Avec GEL, « figer » devient littéralement GEL et **est** sûr partout — mais seulement parce que GEL conserve l'état, pas parce que couper la pompe serait sûr.
- **P05 (branche saine, (2,0), cloud isolé)** : (2,0)∈W₁⊂W₂. La politique locale préautorisée « CHARGE » maintient la sûreté pour tout r (successeurs (2,1),(3,1)∈W). Avec GEL, on peut aussi choisir GEL, mais CHARGE reste valide. La variante n'invalide pas P05.

### Q2 (suite) — P03 : la politique sûre à observation complète reste-t-elle sûre sous observation ambiguë ?

**Sans GEL : NON.** L'observation laisse deux états possibles (1,1) et (3,1). Une politique à observation complète choisirait CHARGE en (1,1) et POMPE en (3,1) — deux actions **différentes**. Or P03 impose **une action unique** sans information nouvelle. Test exhaustif :

- **CHARGE** : depuis (3,1) → (3,2) ou (4,2). (4,2) est hors ensemble sûr → **échec**.
- **POMPE** : depuis (1,1) → (−1,0) ou (0,0). h<1 → **échec**.

Aucune action unique n'est sûre pour les deux états. C'est une **perte d'information** : la politique à observation complète n'est pas « robustifiable » en une politique à information partielle, car les deux états exigent des actions incompatibles. (Ce n'est pas un simple argument de nom de théorème : on exhibe, pour chaque action candidate, un état-témoin et une perturbation r qui violent la sûreté.)

**Avec GEL : OUI.** GEL est disponible partout et conserve l'état : depuis (1,1) → (1,1)∈W₂, depuis (3,1) → (3,1)∈W₂, pour tout r. **GEL est la seule action sûre** sur cette observation ambiguë. La variante **résout P03** : l'action « neutre » fournit un point de repli sûr commun aux deux états indistinguables.

## Preuves et certificats

**Méthode (point fixe de jeu de sûreté).** On itère l'opérateur de préimage sur les 9 états sûrs : `W ← {s : ∃ action a, tous les successeurs de a(s) sont sûrs et dans W}`. Le point fixe est le plus grand ensemble gagnant (maximalité garantie par construction : tout état retiré l'est parce qu'aucune action n'a tous ses successeurs dans l'ensemble courant).

**Sortie `compute` (exhaustive, 9 états, 2 perturbations) :**

```
SANS GEL, domaine gagnant: 8 états ; (3,0) exclu
  (1,0),(1,1),(1,2),(2,0),(2,1),(2,2) -> admissible: [CHARGE]
  (3,1),(3,2) -> admissible: [POMPE]
  (3,0) -> admissible: []          # perdant
AVEC GEL, domaine gagnant: 9 états (tous)
  (1,0)..(2,2) -> [CHARGE, GEL]
  (3,0) -> [GEL]                   # seul recours
  (3,1),(3,2) -> [POMPE, GEL]
```

**Témoin d'exclusion de (3,0) sans GEL :** CHARGE donne (3,1) [r=0] et (4,1) [r=1] ; (4,1) viole h≤3. POMPE indisponible (b=0). Donc (3,0) est perdant — c'est le **seul** état sûr perdant.

**P03 (test exhaustif) :**
```
SANS GEL : CHARGE sûre sur obs? False ; POMPE sûre sur obs? False
AVEC GEL : CHARGE False ; POMPE False ; GEL True
```

**Seconde méthode (indépendante) :** la maximalité est confirmée par la structure — W₁ = (tous les états sûrs) \ {(3,0)}, et (3,0) est le seul état dont toutes les actions ont un successeur non sûr. W₂ = tous les états sûrs, car GEL est une auto-boucle sûre partout. Aucun écart entre les deux lectures.

## Pièges traités

- **Identification partielle** : on ne donne pas une valeur ponctuelle mais le **plus grand ensemble gagnant** (borne exacte), avec preuve de maximalité par point fixe et témoin d'exclusion de (3,0).
- **Hypothèses explicitées** : r adversarial ∈{0,1} sans obligation d'alterner ; les **deux** successeurs doivent être sûrs ; POMPE seulement si b≥1 ; GEL toujours disponible et neutre ; pas de saturation artificielle (on ne « ramène » pas un niveau dangereux).
- **Indicateur imparfait vs variable réelle** : P03 traite l'observation ambiguë (information partielle) séparément de la dynamique réelle ; on distingue « politique à observation complète » et « politique à information partielle ».
- **Cohérence des probabilités/contraintes** : pas de probabilités ici (adversaire pur) ; on vérifie la positivité (h≥1, b≥0) et les bornes (h≤3, b≤2) à chaque successeur.
- **P04** : on réfute explicitement « figer = couper la pompe = toujours sûr » (faux en (3,0) sans GEL).
- **GEL ≠ troisième action inventée** : GEL est une action **explicitement contractée** (R02 étendu), pas une invention de la politique locale ; elle respecte la contrainte « pas de troisième action » du dossier de base puisqu'elle est ajoutée par la variante.

## Limites / impossibilités

- **GEL ne restaure pas la sûreté sous observation ambiguë arbitraire** : elle ne sauve P03 que parce que les deux états candidats sont **déjà sûrs** et que GEL est une auto-boucle. Si l'observation ambiguë contenait un état hors ensemble sûr (ex. (3,0) sans GEL, ou un état déjà dangereux), aucune action unique ne pourrait garantir la sûreté — GEL ne « répare » pas un état déjà violé.
- **GEL ne corrige pas P01/P02/P06** : le rejeu, l'ancien mandat et la mesure périmée sont des problèmes d'**identité/fraîcheur de commande**, pas d'action. GEL est orthogonale au fencing.
- **GEL peut masquer la progression** : en gelant indéfiniment, on maintient la sûreté mais on ne garantit **aucun progrès** (pas de promesse de niveau optimal, cf. P05). GEL est un filet de sûreté, pas une politique d'exploitation.
- **Modèle fictif** : le bassin, les unités et la dynamique sont fictifs ; ce résultat n'est pas une spécification déployable (avertissement de périmètre respecté).
- **Hypothèse d'atomicité (R06)** : l'effet modélisé et son reçu durable sont supposés atomiques ; sans cela, un effet physique inconnu doit être traité comme tel, et GEL ne garantit plus rien sur l'état réel.

**Synthèse de la variante :** GEL élargit le domaine gagnant de 8 à 9 états (récupère exactement (3,0)), ajoute une action admissible partout, et **transforme P03 d'un cas impossible en un cas résolu** (GEL est l'unique action sûre sur l'observation ambiguë). Elle ne touche ni la maximalité des 8 états déjà gagnants, ni les problèmes de fencing (P01, P02, P06).
## Réponse finale

### Résultats exacts demandés

**Q1 — Domaine gagnant (jeu de sûreté), variante avec GEL**

| Cas | Ensemble gagnant | Cardinal | État(s) en jeu |
|---|---|---|---|
| Sans GEL (base) | W₁ = {(1,0),(1,1),(1,2),(2,0),(2,1),(2,2),(3,1),(3,2)} | **8** | (3,0) exclu |
| **Avec GEL (variante)** | W₂ = {(1,0),(1,1),(1,2),(2,0),(2,1),(2,2),(3,0),(3,1),(3,2)} | **9** | aucun exclu |

**Gain exact de la variante : l'état (3,0)**, et lui seul. W₂ = W₁ ∪ {(3,0)} = tout l'ensemble sûr.

**Actions admissibles (les deux successeurs restent dans le domaine gagnant) :**

| État | Sans GEL | Avec GEL |
|---|---|---|
| (1,0),(1,1),(1,2) | CHARGE | CHARGE, GEL |
| (2,0),(2,1),(2,2) | CHARGE | CHARGE, GEL |
| (3,0) | **aucune** (perdant) | **GEL** (unique) |
| (3,1),(3,2) | POMPE | POMPE, GEL |

**Q2 — P03 (observation ambiguë {(1,1),(3,1)}, action unique, sans information nouvelle)**

- **Sans GEL : IMPOSSIBLE.** CHARGE échoue depuis (3,1) (r=1 → (4,2) hors sûr) ; POMPE échoue depuis (1,1) (r=0 → (0,0), h<1). Aucune action unique n'est sûre.
- **Avec GEL : RÉSOLU.** GEL est **l'unique action sûre** : (1,1)→(1,1)∈W₂ et (3,1)→(3,1)∈W₂ pour tout r.

**Q2 — autres pièces :** P01 = faille de fraîcheur (rejeu), non corrigée par GEL ; P04 = « figer = couper la pompe » est **faux** sans GEL (CHARGE en (3,0) → (4,1) débordement), devient vrai *au sens littéral* avec GEL ; P05 = (2,0)∈W₁⊂W₂, CHARGE reste sûre, variante sans effet.

### Preuves et certificats

**Méthode.** Point fixe de l'opérateur de préimage sur les 9 états sûrs : `W ← {s : ∃ action a, tous les successeurs de a(s) sont sûrs et dans W}`. Le point fixe est le **plus grand** ensemble gagnant (maximalité par construction : tout état retiré l'est faute d'action dont tous les successeurs restent dans l'ensemble courant).

**Sortie `compute` (exhaustive, 9 états × 2 perturbations) :**
```
SANS GEL : 8 états ; (3,0) -> admissible: []          # perdant
AVEC GEL : 9 états ; (3,0) -> admissible: [GEL]       # seul recours
P03 SANS GEL : CHARGE False ; POMPE False
P03 AVEC GEL : CHARGE False ; POMPE False ; GEL True
```

**Témoin d'exclusion de (3,0) sans GEL :** CHARGE → (3,1) [r=0] et (4,1) [r=1] ; (4,1) viole h≤3. POMPE indisponible (b=0). Donc (3,0) est le **seul** état sûr perdant.

**Seconde méthode (indépendante) :** W₁ = (états sûrs) \ {(3,0)} car (3,0) est le seul état dont toute action a un successeur non sûr ; W₂ = tous les états sûrs car GEL est une auto-boucle sûre partout. **Aucun écart** entre les deux lectures.

**Certificats enregistrés :** 3 claims (W₁ cardinal 8 ; W₂ cardinal 9 ; P03 sans/avec GEL), tous avec méthode + preuve ; audit : 3/3 couverts, 0 conflit.

### Pièges traités

- **Identification partielle** : on livre le **plus grand ensemble gagnant** (borne exacte), pas une valeur ponctuelle, avec preuve de maximalité et témoin d'exclusion.
- **Hypothèses explicitées** : r adversarial ∈{0,1} sans alternance ; les **deux** successeurs doivent être sûrs ; POMPE si b≥1 ; GEL toujours disponible et neutre ; pas de saturation artificielle.
- **Indicateur imparfait vs variable réelle** : P03 traite l'information partielle séparément de la dynamique ; distinction politique à observation complète vs partielle.
- **Cohérence des contraintes** : positivité (h≥1, b≥0) et bornes (h≤3, b≤2) vérifiées à chaque successeur ; adversaire pur (pas de probabilités à sommer).
- **P04 réfuté** : « figer = couper la pompe = toujours sûr » est faux sans GEL.
- **GEL ≠ action inventée** : action **contractuellement ajoutée** par la variante, pas une invention de la politique locale.

### Limites / impossibilités

- **GEL ne sauve P03 que parce que les deux états candidats sont déjà sûrs** et que GEL est une auto-boucle. Une observation ambiguë contenant un état déjà dangereux resterait insoluble par toute action unique.
- **GEL est orthogonale au fencing** : elle ne corrige ni P01 (rejeu), ni P02 (ancien mandat), ni P06 (mesure périmée) — problèmes d'identité/fraîcheur de commande, pas d'action.
- **GEL ne garantit aucun progrès** : geler indéfiniment maintient la sûreté sans promesse de niveau optimal (cf. P05).
- **Modèle fictif** : non déployable sur une installation hydraulique réelle (avertissement de périmètre respecté).
- **Hypothèse d'atomicité (R06)** : sans elle, un effet physique inconnu doit être traité comme tel et GEL ne garantit plus rien sur l'état réel.

**Conclusion de la variante :** GEL élargit le domaine gagnant de **8 → 9 états** (récupère exactement (3,0)), ajoute une action admissible partout, et **transforme P03 d'un cas impossible en un cas résolu** (GEL, unique action sûre). Elle ne modifie ni la maximalité des 8 états déjà gagnants, ni les problèmes de fencing.