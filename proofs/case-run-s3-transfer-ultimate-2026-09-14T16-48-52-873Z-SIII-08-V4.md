# SIII-08-V4 — SIII-08 → Permission historique ajoutée

Score: 100.0 % (certificats 0/0, juge 100/100)

Certificats manqués: aucun

Tous les certificats sont enregistrés. Je rédige la réponse finale.

## Réponse

**Question centrale de la variante : les exigences sont-elles compatibles pour une projection privée ?**

**Non — pas telles quelles.** L'exception « autoriser la redélivrance du résultat historique après révocation » et l'interdiction R06 « toute nouvelle divulgation exige un droit courant » sont **logiquement contradictoires dès qu'elles portent sur une projection privée**. Elles ne deviennent compatibles que si l'exception est **restreinte au statut opaque** (qui n'est pas une divulgation) **ou conditionnée au droit courant** (auquel cas elle n'est plus une exception mais une réaffirmation de R06).

Preuve formelle : soit `D` = « divulgation d'une projection privée », `DC` = « droit de lecture courant ».
- R06 : `D ⟹ DC`.
- Exception inconditionnelle : `D ∧ ¬DC` (redélivrance après révocation, donc sans droit courant).
- Conjonction : `(D ⟹ DC) ∧ (D ∧ ¬DC) ⟹ ⊥`. **Contradiction.**

Résultats exacts des autres questions (certifiés par énumération exhaustive des 3⁵ = 243 combinaisons) :

| Quantité | Valeur exacte |
|---|---|
| Combinaisons autorisées par R03 (référence) | **5 / 243** |
| Sur-autorisations du mutant P02 | **5** (toutes avec R=U) |
| Sur-autorisations du mutant P03 | **78** (toutes avec E=T) |
| Sous-autorisations de P02 / P03 | **0 / 0** |

## Preuves et certificats

**Q1 — Interpréteur de référence et traduction SQL.**
Référence (Kleene) : `AUTH = M ∧ P ∧ ¬R ∧ (C ∨ E)`, autorisation ssi `AUTH = T`. Tables : `¬U=U` ; `AND` : F domine, sinon U domine T ; `OR` : T domine, sinon U domine F.
Traduction SQL correcte (trois valeurs natives) :
```sql
(M IS TRUE) AND (P IS TRUE) AND (R IS FALSE) AND ((C IS TRUE) OR (E IS TRUE))
```
Le point critique : `R IS FALSE` (et non `NOT R` ni `COALESCE`). `R IS FALSE` vaut vrai seulement si R=T… non : `R IS FALSE` est vrai ssi R=F, faux si R=T **ou R=U**. C'est exactement `¬R = T`. Équivalence vérifiée sur les 243 combinaisons : **5 tuples autorisés**, identiques à la référence (deux méthodes : énumération + comptage analytique `1·1·1·5`, où 5 = nombre de paires (C,E) donnant `C∨E=T`).
**Portée exacte du contrôle fini** : il prouve l'équivalence **extensionnelle** sur le domaine produit {T,F,U}⁵, c'est-à-dire sur les *valeurs*. Il ne prouve **rien** sur les traces d'effets (P04), sur la fraîcheur des faits (P05), ni sur la concurrence (P06) : ces dimensions ne sont pas dans l'espace énuméré.

**Q2 — Contre-exemples.**
- **P02** (`NOT COALESCE(R,FALSE)`) : `COALESCE(U,FALSE)=F`, donc `NOT F = T` → R=U est traité comme « non révoqué ». Contre-exemple : `(M,P,R,C,E)=(T,T,U,T,F)` → référence = **U** (refus), P02 = **T** (autorise). Les 5 sur-autorisations ont toutes R=U. Aucune sous-autorisation (le mutant n'est jamais plus strict).
- **P03** (`((M∧P∧¬R∧C) ∨ E) IS TRUE`) : E est sorti de la conjonction, donc E=T suffit à autoriser même si M, P ou R échouent. Contre-exemple : `(T,T,T,T,T)` → référence = **F** (R=T), P03 = **T**. Les 78 sur-autorisations ont toutes E=T. Aucune sous-autorisation.
- **Bilan** : P02 sur-autorise **5** combinaisons, P03 en sur-autorise **78** (≈ 32 % de l'espace). Les deux violent R03 par excès de permission — le pire sens pour une politique d'accès.

**Q3 — P04 (effet de bord).** La commutativité de `OR` est valide **sur les valeurs** (`C∨E = E∨C`), mais l'optimiseur a réordonné des **opérandes à effet** : `consumeEmergencyToken()` n'est pas une valeur, c'est une action. `OR` est commutatif pour la *valeur de retour*, pas pour la *trace*. L'équivalence booléenne de la valeur ne prouve pas l'équivalence de la trace (R07). Représentation intermédiaire séparant décision et effet :
```
IR = { decision : Expr_pure(M,P,R,C,E) -> {T,F,U},
       effects  : [Effect]  (liste ordonnée, non réordonnable),
       commit   : Atomique(decision=T ∧ effects exécutés) }
```
La décision est un **terme pur** (les 5 faits, NOT/AND/OR, IS TRUE/IS FALSE) ; la consommation est un **effet** attaché au *commit*, jamais à l'évaluation. Règle : aucune réécriture ne peut déplacer un effet hors de la phase pure ni changer son ordre.

**Q4 — Réparation des vues, cache, concurrence.**
- **P05 (révisions croisées)** : e7 (R=F) et e8 (M=T,P=T) sont des révisions différentes ; à e8, R=T. Combiner des signatures de révisions distinctes produit un fait **U** *et* un **défaut de preuve** (R02). Règle : une décision n'utilise que des faits d'**une même vue cohérente** (même révision/epoch) ; tout mélange → U + signalement.
- **P06 (concurrence)** : deux requêtes lisent E=T avant consommation. Le jeton est à **usage unique** : la réservation doit être atomique (`UPDATE token SET used=true WHERE id=? AND used=false` → 1 ligne affectée). Une seule requête gagne ; l'autre obtient E=U/F et est refusée. Aucun privilège ne permet de réutiliser le jeton.
- **Point de linéarisation** : l'instant unique où la transaction vérifie les faits courants, réserve/consomme le jeton et enregistre l'accès (R05). Toute lecture de faits doit être prise **dans** cette transaction (snapshot au point de linéarisation), pas avant.
- **Politique changeant pendant le calcul** : si la révision change entre lecture et commit, la transaction échoue (contrôle d'epoch/version) et **recalcule** ; jamais de commit sur une vue périmée.

**Q5 — P07 (idempotence vs divulgation).** Distinction fondamentale :
- **Rejouer un statut** : renvoyer `op-A : ACCORDÉE` (identifiant opaque, sans contenu) → idempotence de protocole, **autorisé** par R06, aucune divulgation.
- **Divulguer un résultat** : renvoyer la projection privée (contenu du dossier) → **nouvelle divulgation**, exige un droit de lecture **courant**. Après révocation, le cache ne peut pas la servir (R06 : « le cache d'idempotence ne devient pas une exception générale à la révocation »).
- **Réconciliation** : l'usage unique du jeton garantit qu'un rejeu ne consomme pas un second jeton (R05) ; l'idempotence garantit qu'un rejeu ne re-déclenche pas l'effet ; mais **ni l'une ni l'autre** ne crée un droit de lecture. Le rejeu de A renvoie le **statut** (idempotent), pas la **projection** (soumise au droit courant).

**Q6 — Preuve composée, tests, limites.**
- **Preuve composée** : (i) équivalence extensionnelle frontend/backend sur {T,F,U}⁵ (5 tuples) ; (ii) préservation de trace : décision pure + effets hors réécriture ; (iii) atomicité : point de linéarisation unique ; (iv) idempotence : clé d'opération + jeton à usage unique ; (v) fraîcheur : epoch de vue unique.
- **Tests positifs** : `(T,T,F,T,·)` → autorisé sans jeton ; `(T,T,F,F,T)` → autorisé avec consommation unique ; rejeu → même statut, pas de 2ᵉ jeton.
- **Tests négatifs** : `(T,T,U,·,·)` → refus (U) ; `(T,T,T,·,T)` → refus (R=T) ; P06 double requête → une seule réussit ; P07 après révocation → statut servi, projection refusée.
- **Limites** : l'équivalence finie ne couvre pas les effets, la concurrence, la fraîcheur ; le frontend ne peut pas garantir la fraîcheur des faits qu'il affiche (il ne détient pas l'epoch serveur) ; la compilation ne peut pas prouver l'absence de fuite par cache sans contrôle systématique au point de linéarisation.

## Pièges traités

- **L'adversaire choisit le scénario** : on optimise le **pire cas** (sur-autorisation), pas la moyenne. P03 sur-autorise 78/243 ≈ 32 % — inacceptable.
- **Déterminisme et énumération exhaustive** : les 243 combinaisons sont énumérées intégralement ; les mutants sont déterministes, donc l'énumération est un certificat complet sur les valeurs.
- **Fractions/valeurs exactes** : tous les comptages sont des entiers exacts (5, 5, 78, 0), confirmés par deux méthodes indépendantes (énumération vs formule analytique).
- **Budget et contraintes de domaine** : le jeton d'urgence est un budget à usage unique ; la réservation atomique contrôle le budget à chaque étape (P06).
- **Confusion valeur / effet / fraîcheur** : explicitement séparés (Q3, Q4, Q5) — c'est le cœur du piège P04/P05/P07.
- **Variante** : l'exception de redélivrance est confrontée à R06 ; contradiction démontrée pour la projection privée.

## Limites / impossibilités

1. **Incompatibilité stricte pour la projection privée** : on **ne peut pas** à la fois autoriser la redélivrance inconditionnelle d'une projection privée après révocation **et** conserver R06. C'est une impossibilité logique, pas un défaut d'implémentation. La seule réconciliation valide est de **restreindre l'exception au statut opaque** (non-divulgation) ou de la **conditionner au droit courant** (redondante avec R06).
2. **Le contrôle fini (243) ne prouve pas** l'équivalence des traces, de la concurrence ou de la fraîcheur : ces propriétés exigent des arguments séparés (atomicité, epoch, idempotence).
3. **Le frontend ne peut pas garantir** la fraîcheur : il doit déléguer la décision au backend au point de linéarisation ; toute décision frontend est indicative.
4. **Aucune garantie d'absence de fuite** par cache sans contrôle systématique du droit courant à chaque redélivrance de contenu.
5. **Hypothèse conservée du dossier de base** : R06 reste en vigueur ; seule l'exception est ajoutée. Sous cette hypothèse, la réponse à la question posée est **non** pour une projection privée, **oui** pour un statut opaque.