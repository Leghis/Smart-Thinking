# SIII-08-V1 — SIII-08 → Urgence non substitutive

Score: 100.0 % (certificats 0/0, juge 100/100)

Certificats manqués: aucun

Tous les résultats sont certifiés. Je rédige la réponse finale.

## Réponse

**Politique variante (R03 modifiée) :** l'accès complet exige désormais **M=T ∧ P=T ∧ R=F ∧ C=T**. E n'accorde plus aucune substitution : il devient un fait **inerte** pour la décision.

**Nombre de combinaisons autorisantes : 3 sur 243.**

Liste exacte (ordre M, P, R, C, E) :

| # | M | P | R | C | E |
|---|---|---|---|---|---|
| 1 | T | T | F | T | T |
| 2 | T | T | F | T | F |
| 3 | T | T | F | T | U |

E est libre sur {T, F, U} : les trois lignes ne diffèrent que par E, ce qui confirme que **E n'a plus aucun effet sur la décision**.

**Comparaison avec le dossier de base :** la politique R03 d'origine autorisait **5** combinaisons ; la variante en autorise **3**. La suppression de la substitution par E retire exactement **2** combinaisons : `(T,T,F,F,T)` et `(T,T,F,U,T)` — les cas où C n'est pas T mais E=T.

**Plan qui s'applique :** le plan « décision pure + consommation séparée » reste le bon patron, mais **la phase de consommation devient vide**. Puisque E ne peut plus déclencher d'accès d'urgence, **R04 (consommation de jeton à usage unique) est inopérant** : il n'existe plus de branche d'urgence. Le plan se réduit à :

1. **Interpréteur de référence** : `authorize = (M=T) ∧ (P=T) ∧ (R=F) ∧ (C=T)`, résultat T seulement si les quatre conditions sont T.
2. **SQL correct** : `M IS TRUE AND P IS TRUE AND R IS FALSE AND C IS TRUE` (jamais `COALESCE`, jamais `IS NOT TRUE`).
3. **IR décision/consommation** : la décision est une fonction pure des cinq faits ; la phase d'effet (consommation de jeton) est **désactivée** dans cette variante, mais l'architecture séparée est conservée pour rester compatible avec un éventuel retour de la branche d'urgence.
4. **Point de linéarisation** : la transaction d'accès (vérification des faits courants + enregistrement) reste le point unique de sérialisation ; la révocation suit le même ordre logique.

## Preuves et certificats

**Méthode 1 — énumération exhaustive** des 3⁵ = 243 combinaisons en logique de Kleene (NOT échange T/F, laisse U ; AND : F domine, sinon U domine T ; OR : T domine, sinon U domine F). Résultat : `var = 3`, liste `[(T,T,F,T,T), (T,T,F,T,F), (T,T,F,T,U)]`.

**Méthode 2 — comptage analytique indépendant.** En logique de Kleene, un AND vaut T **si et seulement si tous** ses opérandes valent T. Donc `M∧P∧¬R∧C = T` ⟺ M=T, P=T, ¬R=T (⟺ R=F), C=T. E n'apparaît pas dans l'expression. Nombre = 1·1·1·1·3 = **3**. Concordance exacte avec la méthode 1.

**Vérification d'inertie de E** : pour chaque (M,P,R,C) fixé, l'ensemble {var(M,P,R,C,E) : E ∈ {T,F,U}} est un singleton → E n'influence jamais la décision. Confirmé par calcul.

**Contre-exemples mutants (sous la variante) :**
- **P02 (NULL)** autorise **10** combinaisons, dont **7 faux positifs** (0 faux négatif). Exemple : `(T,T,F,F,T)` — P02 autorise car `COALESCE(R,FALSE)` et `IS TRUE` écrasent U→F, mais la variante refuse (C=F). Autres faux positifs : `(T,T,F,U,T)`, `(T,T,U,T,T)`, `(T,T,U,T,F)`, `(T,T,U,T,U)`, `(T,T,U,F,T)`, `(T,T,U,U,T)`. Le mutant traite U comme F pour R et pour C/E, autorisant des cas où R=U ou C=U.
- **P03 (parenthèses)** autorise **83** combinaisons, dont **80 faux positifs** (0 faux négatif). Exemple : `(F,T,F,T,T)` — P03 autorise car E=T sort du groupe, mais la variante refuse (M=F). La parenthèse `((M∧P∧¬R∧C)∨E)` fait de E un substitut **global**, ce que la variante interdit absolument.

**Certificats enregistrés** (ledger) : 4 affirmations, toutes avec méthode ET preuve, aucune en conflit, aucune à méthode unique.

## Pièges traités

- **L'adversaire choisit le scénario / pire cas** : le comptage porte sur **toutes** les 243 combinaisons, y compris celles où U apparaît. Aucune moyenne, aucune hypothèse de « fait présent ».
- **Déterminisme et énumération exhaustive** : l'espace des décisions est fini (3⁵) et parcouru intégralement ; la politique est une fonction déterministe des faits.
- **Valeurs exactes** : les résultats sont des entiers (3, 5, 10, 83, 7, 80, 2), aucune approximation.
- **Contrôle du budget / contraintes de domaine** : dans la variante, **aucun jeton n'est consommé** (R04 inopérant) ; le budget d'urgence est préservé par construction. La contrainte « C=T obligatoire » est vérifiée sur chaque combinaison autorisante.
- **U ≠ F** : piège central. U sur C ou sur R **refuse** l'accès (C=U et R=U ne sont pas T/F). C'est précisément ce que P02 viole en écrasant U→F.
- **Valeur logique vs effet de bord** : la variante élimine la branche d'effet, mais l'IR séparant décision et consommation reste requise pour ne pas confondre équivalence de valeur et équivalence de trace (leçon de P04).
- **Fraîcheur des faits** : la décision doit porter sur les faits **courants** au point de linéarisation ; un mélange de révisions (P05) doit être signalé comme défaut de preuve et non compilé en T.

## Limites / impossibilités

- **Portée du contrôle fini** : l'équivalence sur les 243 combinaisons prouve l'équivalence **extensionnelle** de la fonction d'autorisation sur le domaine {T,F,U}⁵. Elle **ne prouve pas** l'équivalence des traces d'exécution (effets, ordre d'évaluation, consommation de jetons) — c'est exactement la faille de P04. Dans cette variante, l'absence de branche d'urgence rend ce risque nul pour la consommation, mais l'argument reste valable pour tout effet résiduel (journalisation, cache).
- **E inerte ≠ E supprimé** : E reste un fait évalué et signé ; il peut encore servir à l'audit ou à un futur retour de la politique d'urgence. Le rendre inerte pour la décision ne dispense pas de le collecter ni de signaler son incohérence de révision.
- **Concurrence et révocation (P06/P07)** : le comptage ne traite pas la course entre deux requêtes ni le rejeu. Ces garanties reposent sur le point de linéarisation transactionnel et l'idempotence par identifiant d'opération, **hors du périmètre du décompte** ; elles ne peuvent pas être déduites du seul nombre de combinaisons.
- **Frontend vs backend** : l'équivalence frontend/backend n'est garantie que si les deux compilent la **même** politique variante avec les mêmes primitives pures (`IS TRUE`/`IS FALSE`, sans `COALESCE`). Toute divergence de traduction de U rouvre les faux positifs mesurés (7 pour P02, 80 pour P03).