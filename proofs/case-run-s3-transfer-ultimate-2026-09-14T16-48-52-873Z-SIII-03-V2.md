# SIII-03-V2 — SIII-03 → Aucune arrivée d’eau

Score: 100.0 % (certificats 0/0, juge 100/100)

Certificats manqués: aucun

## Réponse

**Domaine gagnant (variante r ∈ {0}) :**

$$W = \{1,2,3\}\times\{0,1,2\} = \{(1,0),(1,1),(1,2),(2,0),(2,1),(2,2),(3,0),(3,1),(3,2)\}, \quad |W| = 9.$$

C'est **l'ensemble sûr entier** : aucun état sûr n'est perdant. Actions admissibles (celles dont *tous* les successeurs restent dans W) :

| État | Actions admissibles |
|---|---|
| (1,0),(1,1),(1,2) | CHARGE |
| (2,0),(2,1),(2,2) | CHARGE |
| (3,0) | CHARGE |
| (3,1),(3,2) | CHARGE **et** POMPE |

**Comparaison avec le dossier de base (r ∈ {0,1}) :** le domaine gagnant y valait 8 états, tous sauf **(3,0)**. La variante **rajoute exactement (3,0)** : `W_{r=0} \ W_{r∈{0,1}} = {(3,0)}`.

## Preuves et certificats

**Dynamique sous r = 0.** CHARGE : `h' = h + 0 = h`, `b' = min(2, b+1)`. POMPE (si b ≥ 1) : `h' = h − 2`, `b' = b − 1`. Comme r est fixé à 0, chaque action n'a **qu'un seul successeur** (la clause « les deux successeurs doivent être sûrs » se réduit à « le successeur doit être sûr »).

**CHARGE est sûre depuis tout état sûr.** `h' = h ∈ {1,2,3}` (invariant : h inchangé) et `b' = min(2,b+1) ∈ {0,1,2}`. Donc CHARGE ne quitte jamais l'ensemble sûr. C'est le point clé de la variante : sans perturbation additive, le niveau ne peut plus franchir la borne haute 3.

**POMPE** : `h' = h − 2`. Sûre seulement si `h − 2 ≥ 1`, i.e. `h = 3` (donne h' = 1) ; depuis h = 1 ou 2, h' = −1 ou 0 < 1 → non sûr. Disponible seulement si b ≥ 1. Donc POMPE admissible uniquement en (3,1) et (3,2).

**Certificat de maximalité (deux méthodes indépendantes, concordantes) :**

1. *Point fixe par élimination* : on retire itérativement tout état n'ayant aucune action à successeurs tous sûrs et dans W. Résultat : `W = 9 états`, aucune élimination.
2. *Attracteur du complément* : on construit l'ensemble des états perdants L par itération. Résultat : `L = ∅`, donc `W = S \ L = S` (9 états).

Les deux convergent vers le même W. **Maximalité** : tout état hors W serait dans L (perdant) ; comme L = ∅, aucun état sûr n'est exclu — W est donc le plus grand possible, égal à S. **Témoin de gain en (3,0)** : CHARGE mène à (3,1) ∈ W (vérifié : `succ((3,0),'C',0) = (3,1)`), et depuis (3,1) on peut boucler CHARGE↔POMPE en restant sûr.

**Pourquoi (3,0) bascule.** Dans le cas original, depuis (3,0) : CHARGE avec r = 1 donne h' = 4 (débordement) → interdite ; POMPE indisponible (b = 0) → état perdant. Sous r = 0, CHARGE donne h' = 3 (sûr) → (3,0) devient gagnant. C'est **le seul** état dont le statut change.

## Pièges traités

- **Identification partielle** : on ne donne pas une valeur ponctuelle mais l'ensemble exact W et les actions admissibles par état ; la maximalité est prouvée par double méthode (aucun état sûr n'est omis).
- **Hypothèses énoncées avant calcul** : r ∈ {0} (perturbation supprimée), une seule action par cycle, POMPE conditionnée à b ≥ 1, non-saturation des niveaux dangereux (on n'écrête pas h = 4 vers 3), sûreté exigée sur *tous* les successeurs.
- **Indicateur imparfait vs variable réelle** : ici l'observation est complète (h,b,seq lisibles) ; le cas d'observation partielle (P03) est traité séparément dans le dossier de base et n'affecte pas le calcul de W, qui porte sur l'état réel.
- **Cohérence des probabilités/contraintes** : r déterministe (= 0) ; b reste dans {0,1,2} par `min(2,·)` et `b−1 ≥ 0` sous condition de disponibilité ; h reste dans {1,2,3} sous CHARGE. Aucune contrainte de monotonie violée.
- **Non-réduction à « empêcher deux écritures »** : le domaine gagnant inclut des états où l'arrêt de la pompe (POMPE indisponible ou non choisie) n'est pas la seule option sûre — CHARGE reste un refuge sûr partout, ce qui évite le piège « figer = toujours sûr » (P04).

## Limites / impossibilités

- **Le résultat est spécifique à r = 0.** Dès que la perturbation {0,1} est rétablie, (3,0) redevient perdant et |W| retombe à 8. La conclusion « tout l'ensemble sûr est gagnant » **ne se transporte pas** au modèle de base.
- **Sûreté ≠ optimalité.** W garantit l'invariant de sûreté pour toute suite de r (= 0), pas l'atteinte d'un niveau cible ni la performance. Aucune promesse de niveau optimal n'est faite (conforme à P05).
- **Hypothèse d'atomicité (R06)** : la preuve suppose que l'effet physique et son reçu durable forment une transition atomique ; sans cela, un effet physique inconnu doit être traité comme tel et le domaine gagnant pourrait se réduire.
- **Modèle fictif** : bassin, unités et dynamique discrets sont un support de raisonnement, non une spécification déployable (avertissement de périmètre).
- **Observation partielle** : W est calculé sur l'état réel ; sous capteurs indisponibles (P03), la politique doit être évaluée sur l'ensemble d'états possibles, ce qui peut rendre une action sûre sur l'état réel non sûre sur l'ensemble — question distincte du présent recalcul.
## Réponse

**Résultat exact demandé — le domaine gagnant sous r ∈ {0} :**

$$W = \{1,2,3\}\times\{0,1,2\} = \{(1,0),(1,1),(1,2),(2,0),(2,1),(2,2),(3,0),(3,1),(3,2)\}, \qquad |W| = 9.$$

C'est **l'ensemble sûr entier** : sous r = 0, aucun état sûr n'est perdant. Le domaine gagnant coïncide donc avec S.

**Actions admissibles** (celles dont *tous* les successeurs restent dans W) :

| État | Actions admissibles |
|---|---|
| (1,0), (1,1), (1,2) | CHARGE |
| (2,0), (2,1), (2,2) | CHARGE |
| (3,0) | CHARGE |
| (3,1), (3,2) | CHARGE **et** POMPE |

**Écart avec le dossier de base (r ∈ {0,1}) :** le domaine gagnant y valait 8 états (tous sauf (3,0)). La variante **rajoute exactement (3,0)** :

$$W_{r=0} \setminus W_{r\in\{0,1\}} = \{(3,0)\}, \qquad |W_{r=0}| - |W_{r\in\{0,1\}}| = 9 - 8 = 1.$$

## Preuves et certificats

**Dynamique sous r = 0.** CHARGE : `h' = h + 0 = h`, `b' = min(2, b+1)`. POMPE (si b ≥ 1) : `h' = h − 2`, `b' = b − 1`. Comme r est fixé à 0, chaque action n'a **qu'un seul successeur** : la clause « les deux successeurs doivent être sûrs » se réduit à « le successeur doit être sûr ».

**Lemme 1 — CHARGE est sûre depuis tout état sûr.** `h' = h ∈ {1,2,3}` (h est inchangé) et `b' = min(2, b+1) ∈ {0,1,2}`. Donc CHARGE ne quitte jamais l'ensemble sûr. C'est le point clé de la variante : sans perturbation additive, le niveau ne peut plus franchir la borne haute 3.

**Lemme 2 — POMPE n'est sûre que depuis h = 3.** `h' = h − 2 ≥ 1 ⟺ h = 3` (donne h' = 1). Depuis h = 1 ou 2, h' = −1 ou 0 < 1 → non sûr. Disponibilité : b ≥ 1. Donc POMPE admissible uniquement en (3,1) et (3,2).

**Certificat de maximalité — deux méthodes indépendantes, concordantes :**

1. *Point fixe par élimination* : on retire itérativement tout état n'ayant aucune action à successeurs tous sûrs et dans W. Résultat : `W = 9 états`, **aucune élimination**.
2. *Attracteur du complément* : on construit l'ensemble des états perdants L par itération. Résultat : `L = ∅`, donc `W = S \ L = S` (9 états).

Les deux convergent vers le même W. **Maximalité** : tout état hors W serait dans L (perdant) ; comme L = ∅, aucun état sûr n'est exclu — W est donc le plus grand possible, égal à S. **Témoin de gain en (3,0)** : CHARGE mène à (3,1) ∈ W (vérifié : `succ((3,0),'C',0) = (3,1)`), et depuis (3,1) on peut boucler CHARGE↔POMPE en restant sûr.

**Pourquoi (3,0) bascule.** Dans le cas original, depuis (3,0) : CHARGE avec r = 1 donne h' = 4 (débordement) → interdite ; POMPE indisponible (b = 0) → état perdant. Sous r = 0, CHARGE donne h' = 3 (sûr) → (3,0) devient gagnant. C'est **le seul** état dont le statut change.

**Sorties d'outils (compute) :**
- `r={0}` → 9 états, `perdants = []`
- `r={0,1}` → 8 états, `diff = {(3,0)}`
- Admissibilités : `(3,1) → ['C','P']`, `(3,2) → ['C','P']`, tous les autres → `['C']`

## Pièges traités

- **Identification partielle** : on ne donne pas une valeur ponctuelle mais l'ensemble exact W et les actions admissibles par état ; la maximalité est prouvée par double méthode (aucun état sûr n'est omis).
- **Hypothèses énoncées avant calcul** : r ∈ {0} (perturbation supprimée), une seule action par cycle, POMPE conditionnée à b ≥ 1, non-saturation des niveaux dangereux (on n'écrête pas h = 4 vers 3), sûreté exigée sur *tous* les successeurs.
- **Indicateur imparfait vs variable réelle** : ici l'observation est complète (h, b, seq lisibles) ; le cas d'observation partielle (P03) est traité séparément dans le dossier de base et n'affecte pas le calcul de W, qui porte sur l'état réel.
- **Cohérence des contraintes** : r déterministe (= 0) ; b reste dans {0,1,2} par `min(2,·)` et `b−1 ≥ 0` sous condition de disponibilité ; h reste dans {1,2,3} sous CHARGE. Aucune contrainte de monotonie violée.
- **Non-réduction à « empêcher deux écritures »** : le domaine gagnant inclut des états où l'arrêt de la pompe n'est pas la seule option sûre — CHARGE reste un refuge sûr partout, ce qui évite le piège « figer = toujours sûr » (P04).

## Limites / impossibilités

- **Le résultat est spécifique à r = 0.** Dès que la perturbation {0,1} est rétablie, (3,0) redevient perdant et |W| retombe à 8. La conclusion « tout l'ensemble sûr est gagnant » **ne se transporte pas** au modèle de base.
- **Sûreté ≠ optimalité.** W garantit l'invariant de sûreté pour toute suite de r (= 0), pas l'atteinte d'un niveau cible ni la performance. Aucune promesse de niveau optimal n'est faite (conforme à P05).
- **Hypothèse d'atomicité (R06)** : la preuve suppose que l'effet physique et son reçu durable forment une transition atomique ; sans cela, un effet physique inconnu doit être traité comme tel et le domaine gagnant pourrait se réduire.
- **Modèle fictif** : bassin, unités et dynamique discrets sont un support de raisonnement, non une spécification déployable (avertissement de périmètre).
- **Observation partielle** : W est calculé sur l'état réel ; sous capteurs indisponibles (P03), la politique doit être évaluée sur l'ensemble d'états possibles, ce qui peut rendre une action sûre sur l'état réel non sûre sur l'ensemble — question distincte du présent recalcul.

---

**Synthèse.** Sous la variante r ∈ {0}, le domaine gagnant est l'ensemble sûr entier (9 états), contre 8 dans le dossier de base : la suppression de la perturbation additive rend (3,0) gagnant, car CHARGE y préserve h = 3 au lieu de risquer h = 4. CHARGE est admissible partout ; POMPE s'y ajoute en (3,1) et (3,2). Résultat certifié par deux méthodes indépendantes (élimination et attracteur du complément), avec témoin explicite en (3,0).
## Réponse

**Résultat exact demandé — le domaine gagnant sous r ∈ {0} :**

$$W = \{1,2,3\}\times\{0,1,2\} = \{(1,0),(1,1),(1,2),(2,0),(2,1),(2,2),(3,0),(3,1),(3,2)\}, \qquad |W| = 9.$$

C'est **l'ensemble sûr entier** : sous r = 0, aucun état sûr n'est perdant. Le domaine gagnant coïncide donc avec S.

**Actions admissibles** (celles dont *tous* les successeurs restent dans W) :

| État | Actions admissibles |
|---|---|
| (1,0), (1,1), (1,2) | CHARGE |
| (2,0), (2,1), (2,2) | CHARGE |
| (3,0) | CHARGE |
| (3,1), (3,2) | CHARGE **et** POMPE |

**Écart avec le dossier de base (r ∈ {0,1}) :** le domaine gagnant y valait 8 états (tous sauf (3,0)). La variante **rajoute exactement (3,0)** :

$$W_{r=0} \setminus W_{r\in\{0,1\}} = \{(3,0)\}, \qquad |W_{r=0}| - |W_{r\in\{0,1\}}| = 9 - 8 = 1.$$

## Preuves et certificats

**Dynamique sous r = 0.** CHARGE : `h' = h + 0 = h`, `b' = min(2, b+1)`. POMPE (si b ≥ 1) : `h' = h − 2`, `b' = b − 1`. Comme r est fixé à 0, chaque action n'a **qu'un seul successeur** : la clause « les deux successeurs doivent être sûrs » se réduit à « le successeur doit être sûr ».

**Lemme 1 — CHARGE est sûre depuis tout état sûr.** `h' = h ∈ {1,2,3}` (h est inchangé) et `b' = min(2, b+1) ∈ {0,1,2}`. Donc CHARGE ne quitte jamais l'ensemble sûr. C'est le point clé de la variante : sans perturbation additive, le niveau ne peut plus franchir la borne haute 3.

**Lemme 2 — POMPE n'est sûre que depuis h = 3.** `h' = h − 2 ≥ 1 ⟺ h = 3` (donne h' = 1). Depuis h = 1 ou 2, h' = −1 ou 0 < 1 → non sûr. Disponibilité : b ≥ 1. Donc POMPE admissible uniquement en (3,1) et (3,2).

**Certificat de maximalité — deux méthodes indépendantes, concordantes :**

1. *Point fixe par élimination* : on retire itérativement tout état n'ayant aucune action à successeurs tous sûrs et dans W. Résultat : `W = 9 états`, **aucune élimination**.
2. *Attracteur du complément* : on construit l'ensemble des états perdants L par itération. Résultat : `L = ∅`, donc `W = S \ L = S` (9 états).

Les deux convergent vers le même W. **Maximalité** : tout état hors W serait dans L (perdant) ; comme L = ∅, aucun état sûr n'est exclu — W est donc le plus grand possible, égal à S. **Témoin de gain en (3,0)** : CHARGE mène à (3,1) ∈ W (vérifié : `succ((3,0),'C',0) = (3,1)`), et depuis (3,1) on peut boucler CHARGE↔POMPE en restant sûr.

**Pourquoi (3,0) bascule.** Dans le cas original, depuis (3,0) : CHARGE avec r = 1 donne h' = 4 (débordement) → interdite ; POMPE indisponible (b = 0) → état perdant. Sous r = 0, CHARGE donne h' = 3 (sûr) → (3,0) devient gagnant. C'est **le seul** état dont le statut change.

**Sorties d'outils (compute) :**
- `r={0}` → 9 états, `perdants = []`
- `r={0,1}` → 8 états, `diff = {(3,0)}`
- Admissibilités : `(3,1) → ['C','P']`, `(3,2) → ['C','P']`, tous les autres → `['C']`

## Pièges traités

- **Identification partielle** : on ne donne pas une valeur ponctuelle mais l'ensemble exact W et les actions admissibles par état ; la maximalité est prouvée par double méthode (aucun état sûr n'est omis).
- **Hypothèses énoncées avant calcul** : r ∈ {0} (perturbation supprimée), une seule action par cycle, POMPE conditionnée à b ≥ 1, non-saturation des niveaux dangereux (on n'écrête pas h = 4 vers 3), sûreté exigée sur *tous* les successeurs.
- **Indicateur imparfait vs variable réelle** : ici l'observation est complète (h, b, seq lisibles) ; le cas d'observation partielle (P03) est traité séparément dans le dossier de base et n'affecte pas le calcul de W, qui porte sur l'état réel.
- **Cohérence des contraintes** : r déterministe (= 0) ; b reste dans {0,1,2} par `min(2,·)` et `b−1 ≥ 0` sous condition de disponibilité ; h reste dans {1,2,3} sous CHARGE. Aucune contrainte de monotonie violée.
- **Non-réduction à « empêcher deux écritures »** : le domaine gagnant inclut des états où l'arrêt de la pompe n'est pas la seule option sûre — CHARGE reste un refuge sûr partout, ce qui évite le piège « figer = toujours sûr » (P04).

## Limites / impossibilités

- **Le résultat est spécifique à r = 0.** Dès que la perturbation {0,1} est rétablie, (3,0) redevient perdant et |W| retombe à 8. La conclusion « tout l'ensemble sûr est gagnant » **ne se transporte pas** au modèle de base.
- **Sûreté ≠ optimalité.** W garantit l'invariant de sûreté pour toute suite de r (= 0), pas l'atteinte d'un niveau cible ni la performance. Aucune promesse de niveau optimal n'est faite (conforme à P05).
- **Hypothèse d'atomicité (R06)** : la preuve suppose que l'effet physique et son reçu durable forment une transition atomique ; sans cela, un effet physique inconnu doit être traité comme tel et le domaine gagnant pourrait se réduire.
- **Modèle fictif** : bassin, unités et dynamique discrets sont un support de raisonnement, non une spécification déployable (avertissement de périmètre).
- **Observation partielle** : W est calculé sur l'état réel ; sous capteurs indisponibles (P03), la politique doit être évaluée sur l'ensemble d'états possibles, ce qui peut rendre une action sûre sur l'état réel non sûre sur l'ensemble — question distincte du présent recalcul.

---

**Synthèse.** Sous la variante r ∈ {0}, le domaine gagnant est l'ensemble sûr entier (9 états), contre 8 dans le dossier de base : la suppression de la perturbation additive rend (3,0) gagnant, car CHARGE y préserve h = 3 au lieu de risquer h = 4. CHARGE est admissible partout ; POMPE s'y ajoute en (3,1) et (3,2). Résultat certifié par deux méthodes indépendantes (élimination et attracteur du complément), avec témoin explicite en (3,0).
## Réponse

**Résultat exact demandé — le domaine gagnant sous r ∈ {0} :**

$$W = \{1,2,3\}\times\{0,1,2\} = \{(1,0),(1,1),(1,2),(2,0),(2,1),(2,2),(3,0),(3,1),(3,2)\}, \qquad |W| = 9.$$

C'est **l'ensemble sûr entier** : sous r = 0, aucun état sûr n'est perdant. Le domaine gagnant coïncide donc avec S.

**Actions admissibles** (celles dont *tous* les successeurs restent dans W) :

| État | Actions admissibles |
|---|---|
| (1,0), (1,1), (1,2) | CHARGE |
| (2,0), (2,1), (2,2) | CHARGE |
| (3,0) | CHARGE |
| (3,1), (3,2) | CHARGE **et** POMPE |

**Écart avec le dossier de base (r ∈ {0,1}) :** le domaine gagnant y valait 8 états (tous sauf (3,0)). La variante **rajoute exactement (3,0)** :

$$W_{r=0} \setminus W_{r\in\{0,1\}} = \{(3,0)\}, \qquad |W_{r=0}| - |W_{r\in\{0,1\}}| = 9 - 8 = 1.$$

## Preuves et certificats

**Dynamique sous r = 0.** CHARGE : `h' = h + 0 = h`, `b' = min(2, b+1)`. POMPE (si b ≥ 1) : `h' = h − 2`, `b' = b − 1`. Comme r est fixé à 0, chaque action n'a **qu'un seul successeur** : la clause « les deux successeurs doivent être sûrs » se réduit à « le successeur doit être sûr ».

**Lemme 1 — CHARGE est sûre depuis tout état sûr.** `h' = h ∈ {1,2,3}` (h est inchangé) et `b' = min(2, b+1) ∈ {0,1,2}`. Donc CHARGE ne quitte jamais l'ensemble sûr. C'est le point clé de la variante : sans perturbation additive, le niveau ne peut plus franchir la borne haute 3.

**Lemme 2 — POMPE n'est sûre que depuis h = 3.** `h' = h − 2 ≥ 1 ⟺ h = 3` (donne h' = 1). Depuis h = 1 ou 2, h' = −1 ou 0 < 1 → non sûr. Disponibilité : b ≥ 1. Donc POMPE admissible uniquement en (3,1) et (3,2).

**Certificat de maximalité — deux méthodes indépendantes, concordantes :**

1. *Point fixe par élimination* : on retire itérativement tout état n'ayant aucune action à successeurs tous sûrs et dans W. Résultat : `W = 9 états`, **aucune élimination**.
2. *Attracteur du complément* : on construit l'ensemble des états perdants L par itération. Résultat : `L = ∅`, donc `W = S \ L = S` (9 états).

Les deux convergent vers le même W. **Maximalité** : tout état hors W serait dans L (perdant) ; comme L = ∅, aucun état sûr n'est exclu — W est donc le plus grand possible, égal à S. **Témoin de gain en (3,0)** : CHARGE mène à (3,1) ∈ W (vérifié : `succ((3,0),'C',0) = (3,1)`), et depuis (3,1) on peut boucler CHARGE↔POMPE en restant sûr.

**Pourquoi (3,0) bascule.** Dans le cas original, depuis (3,0) : CHARGE avec r = 1 donne h' = 4 (débordement) → interdite ; POMPE indisponible (b = 0) → état perdant. Sous r = 0, CHARGE donne h' = 3 (sûr) → (3,0) devient gagnant. C'est **le seul** état dont le statut change.

**Sorties d'outils (compute) :**
- `r={0}` → 9 états, `perdants = []`
- `r={0,1}` → 8 états, `diff = {(3,0)}`
- Admissibilités : `(3,1) → ['C','P']`, `(3,2) → ['C','P']`, tous les autres → `['C']`

## Pièges traités

- **Identification partielle** : on ne donne pas une valeur ponctuelle mais l'ensemble exact W et les actions admissibles par état ; la maximalité est prouvée par double méthode (aucun état sûr n'est omis).
- **Hypothèses énoncées avant calcul** : r ∈ {0} (perturbation supprimée), une seule action par cycle, POMPE conditionnée à b ≥ 1, non-saturation des niveaux dangereux (on n'écrête pas h = 4 vers 3), sûreté exigée sur *tous* les successeurs.
- **Indicateur imparfait vs variable réelle** : ici l'observation est complète (h, b, seq lisibles) ; le cas d'observation partielle (P03) est traité séparément dans le dossier de base et n'affecte pas le calcul de W, qui porte sur l'état réel.
- **Cohérence des contraintes** : r déterministe (= 0) ; b reste dans {0,1,2} par `min(2,·)` et `b−1 ≥ 0` sous condition de disponibilité ; h reste dans {1,2,3} sous CHARGE. Aucune contrainte de monotonie violée.
- **Non-réduction à « empêcher deux écritures »** : le domaine gagnant inclut des états où l'arrêt de la pompe n'est pas la seule option sûre — CHARGE reste un refuge sûr partout, ce qui évite le piège « figer = toujours sûr » (P04).

## Limites / impossibilités

- **Le résultat est spécifique à r = 0.** Dès que la perturbation {0,1} est rétablie, (3,0) redevient perdant et |W| retombe à 8. La conclusion « tout l'ensemble sûr est gagnant » **ne se transporte pas** au modèle de base.
- **Sûreté ≠ optimalité.** W garantit l'invariant de sûreté pour toute suite de r (= 0), pas l'atteinte d'un niveau cible ni la performance. Aucune promesse de niveau optimal n'est faite (conforme à P05).
- **Hypothèse d'atomicité (R06)** : la preuve suppose que l'effet physique et son reçu durable forment une transition atomique ; sans cela, un effet physique inconnu doit être traité comme tel et le domaine gagnant pourrait se réduire.
- **Modèle fictif** : bassin, unités et dynamique discrets sont un support de raisonnement, non une spécification déployable (avertissement de périmètre).
- **Observation partielle** : W est calculé sur l'état réel ; sous capteurs indisponibles (P03), la politique doit être évaluée sur l'ensemble d'états possibles, ce qui peut rendre une action sûre sur l'état réel non sûre sur l'ensemble — question distincte du présent recalcul.

---

**Synthèse.** Sous la variante r ∈ {0}, le domaine gagnant est l'ensemble sûr entier (9 états), contre 8 dans le dossier de base : la suppression de la perturbation additive rend (3,0) gagnant, car CHARGE y préserve h = 3 au lieu de risquer h = 4. CHARGE est admissible partout ; POMPE s'y ajoute en (3,1) et (3,2). Résultat certifié par deux méthodes indépendantes (élimination et attracteur du complément), avec témoin explicite en (3,0).