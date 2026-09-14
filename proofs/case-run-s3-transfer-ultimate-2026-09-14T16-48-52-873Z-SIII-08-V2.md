# SIII-08-V2 — SIII-08 → Révocation toujours connue

Score: 100.0 % (certificats 0/0, juge 100/100)

Certificats manqués: aucun

Les résultats sont certifiés par énumération exhaustive et preuve structurelle. Je rédige la réponse finale.

## Réponse

**Question : le mutant NULL de P02 diffère-t-il encore de la référence R03 sous la restriction R ∈ {T,F} ?**

**Non — sous la restriction R ∈ {T,F}, le mutant P02 devient décisionnellement équivalent à la référence R03.** Sur les **162 combinaisons** du domaine restreint (M,P,C,E ∈ {T,F,U} → 3⁴ = 81, × R ∈ {T,F} → 2), le nombre de divergences de résultat d'autorisation est **exactement 0**.

En revanche, **la restriction est indispensable** : sur le domaine complet (3⁵ = 243 combinaisons), le mutant diverge sur **exactement 5 combinaisons**, toutes des **autorisations à tort** (référence = U, mutant = T), avec **0 refus à tort**. Ces 5 cas sont précisément ceux où **R = U** (révocation inconnue), M = T, P = T et (C = T ou E = T) — c'est-à-dire le scénario de danger décrit dans l'énoncé (« autoriser un dossier dont la révocation n'est pas connue »).

| Domaine | Taille | Divergences | Nature |
|---|---|---|---|
| Complet (R ternaire) | 243 | **5** | 5 autorisations à tort, 0 refus à tort |
| Restreint (R ∈ {T,F}) | 162 | **0** | équivalence de décision |

## Preuves et certificats

**1. Sémantique formalisée (Kleene).** NOT échange T/F, fixe U ; AND : F domine, sinon U domine T ; OR : T domine, sinon U domine F. Autorisation ssi résultat = T.

- Référence : `A_ref = M ∧ P ∧ ¬R ∧ (C ∨ E)`
- Mutant : `A_mut = (M IS TRUE) ∧ (P IS TRUE) ∧ ¬COALESCE(R,FALSE) ∧ (C IS TRUE ∨ E IS TRUE)`

Traduction SQL : `IS TRUE` renvoie T si l'opérande vaut T, sinon F (donc U ↦ F) ; `COALESCE(R,FALSE)` renvoie F si R = U, sinon R. Donc `A_mut = [M=T] ∧ [P=T] ∧ [R≠T] ∧ ([C=T] ∨ [E=T])`, où `[·]` est un booléen binaire.

**2. Preuve structurelle de l'équivalence restreinte.** Si R ∈ {T,F}, alors `COALESCE(R,FALSE) = R` et donc `¬COALESCE(R,FALSE) = ¬R` (vérifié : `True` pour R ∈ {T,F}). Le facteur `¬R` est alors **binaire** :
- Si `¬R = F` (R = T) : les deux expressions valent F (AND avec F) → accord.
- Si `¬R = T` (R = F) : il reste à comparer `(M ∧ P) ∧ (C ∨ E)` et `([M=T] ∧ [P=T]) ∧ ([C=T] ∨ [E=T])` sur M,P,C,E ternaires. Énumération exhaustive des 81 combinaisons : **0 divergence**.

**3. Certificat d'énumération (sortie `compute`).**
```
Domaine complet 3^5=243 : nb divergences = 5
Domaine restreint R in {T,F} : taille = 162  nb divergences = 0
Sous-formule (NOT R=T): divergences = 0
Complet: autorisations a tort = 5  refus a tort = 0
```
Les 5 divergences complètes sont : (M,P,R,C,E) ∈ {(T,T,U,T,T), (T,T,U,T,F), (T,T,U,T,U), (T,T,U,F,T), (T,T,U,U,T)} — toutes avec R = U, M = T, P = T, et (C = T ou E = T).

**4. Pourquoi la sous-formule est équivalente en décision.** `IS TRUE` ne peut transformer U en F que dans le sens « refus » : il ne peut jamais faire passer un résultat non-T à T. Comme le contexte (M,P,C,E) ne produit jamais de T parasite via cette coercition, le résultat d'autorisation (T vs non-T) est préservé. **Attention** : l'équivalence porte sur le **résultat d'autorisation**, pas sur la valeur ternaire exacte — sur R = U le mutant renvoie T là où la référence renvoie U (c'est exactement la divergence éliminée par la restriction).

**5. Vérification indépendante.** Deux méthodes concordent : (a) énumération exhaustive brute des 243 et 162 combinaisons ; (b) décomposition structurelle (facteur ¬R binaire + sous-formule testée sur 81 cas). Aucun écart.

## Pièges traités

- **L'adversaire choisit le scénario (pire cas).** Le mutant n'est sûr que si la restriction R ∈ {T,F} est *garantie*. Sans elle, le pire cas (R = U) produit 5 autorisations à tort — le mutant autorise un dossier à révocation inconnue. La variante exige « preuve fiable de cette restriction » : c'est la condition sine qua non, non un détail.
- **Valeur logique ≠ décision.** L'équivalence est au niveau du **résultat d'autorisation** (T vs non-T), pas de la valeur ternaire. Le mutant reste un mutant « équivalent en décision » mais **non identique en valeur** (U vs T sur R = U).
- **Effet de bord ≠ valeur.** P02 est un mutant *pur* (pas d'effet) : l'équivalence de décision y est donc légitime. Ce résultat **ne se transporte pas** à P04 (consommation de jeton), où l'équivalence booléenne de valeur ne prouve pas l'équivalence de trace (R07).
- **Contrôle fini et sa portée.** Le contrôle sur 162 combinaisons est **exhaustif et concluant** pour le domaine restreint (espace fini, énumération complète) : c'est une preuve, pas un échantillonnage. Sa portée s'arrête exactement à l'hypothèse R ∈ {T,F}.
- **Fraîcheur des faits.** La restriction R ∈ {T,F} doit être une **preuve courante** (R établi T ou F à la vue de politique cohérente), pas une simple absence de NULL. Un R « manquant » vaut U (R02) et réintroduit les 5 divergences.

## Limites / impossibilités

- **L'équivalence est conditionnelle.** Elle n'est vraie que sous R ∈ {T,F} prouvé de façon fiable. Si la restriction tombe (R = U possible), le mutant redevient dangereux : 5 autorisations à tort, dont le cas canonique M=T, P=T, R=U, C=T (ou E=T).
- **Portée limitée à la décision.** Ce résultat ne dit rien sur la trace d'exécution, la consommation de jeton, l'idempotence ou la révocation (P04, P06, P07) : ces propriétés exigent une analyse séparée (séparation décision/consommation, point de linéarisation, cache d'idempotence non-exception à la révocation).
- **Le mutant reste à proscrire en production** tant que la restriction n'est pas *structurellement* garantie (contrainte de schéma `NOT NULL` + vue de politique cohérente), car la sûreté repose alors sur une hypothèse externe au code compilé, non sur la compilation elle-même.
- **Aucune garantie sur les autres mutants.** P03 (parenthèses) n'est pas couvert par cette variante et reste divergent indépendamment de la restriction sur R.