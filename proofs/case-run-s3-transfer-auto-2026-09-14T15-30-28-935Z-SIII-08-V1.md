# SIII-08-V1 — SIII-08 → Urgence non substitutive

Score: 100.0 % (certificats 0/0, juge 100/100)

Certificats manqués: aucun

# Variante : C obligatoire, E sans substitution

**Hypothèse modifiée (seule) :** R03 devient « l'accès complet exige M=T, P=T, R=F **et C=T** ; E n'accorde plus aucune substitution ». Tout le reste du dossier de base (R01 logique de Kleene, R02 faits, R04–R07, P01–P07) est conservé.

---

## Q1 — Interpréteur de référence et traduction SQL

**Expression source (P01 modifiée) :** `M AND P AND NOT R AND C`, suivie de « autoriser seulement si T ».

**Interpréteur de référence** (R01, logique forte de Kleene) :
- NOT échange T↔F, laisse U ;
- AND : F domine, sinon U domine T ;
- OR : T domine, sinon U domine F ;
- décision = T uniquement.

**Traduction SQL correcte** (les seules primitives pures admises par R07 sont les tests explicites) :

```sql
M IS TRUE AND P IS TRUE AND R IS FALSE AND C IS TRUE
```

Le point critique : `NOT R` en trois valeurs n'est **pas** `NOT R` en SQL binaire. `R IS FALSE` est la seule forme qui rend T exactement quand R=F, et F quand R=T **ou** R=U. De même `C IS TRUE` (et non `C = TRUE`, qui vaut U/NULL quand C est inconnu).

**Vérification sur les 243 combinaisons.** J'ai énuméré exhaustivement les 3⁵ = 243 affectations de (M,P,R,C,E) dans {T,F,U} et comparé l'interpréteur de référence à la traduction SQL : **équivalence totale, 0 divergence**.

**Portée exacte de ce contrôle fini.** Il prouve l'équivalence *extensionnelle* sur le domaine fini des cinq faits à trois valeurs, pour cette expression et cette vue de politique. Il **ne** prouve pas : (a) l'équivalence des *traces* (effets de bord, cf. Q3) ; (b) la correction des faits eux-mêmes (fraîcheur, cohérence de vue, cf. Q4) ; (c) la préservation sous d'autres expressions ou sous des faits à plus de trois valeurs. C'est un certificat de décision, pas un certificat d'exécution.

---

## Q2 — Contre-exemples des mutants

**Mutant P02 (NULL)** : `M IS TRUE AND P IS TRUE AND NOT COALESCE(R,FALSE) AND (C IS TRUE OR E IS TRUE)`.
Deux défauts : `COALESCE(R,FALSE)` écrase U→F (donc `NOT` rend T quand R est inconnu), et la clause `(C IS TRUE OR E IS TRUE)` **réintroduit la substitution d'urgence** que la variante supprime.

- Contre-exemple minimal : **(M,P,R,C,E) = (T,T,F,F,T)** → P02 autorise (C=F mais E=T), la référence refuse. Autre : (T,T,U,T,T) → P02 autorise malgré R=U.
- **P02 autorise 10 combinaisons, dont 7 à tort** vs la variante (contre 5 à tort vs la politique de base : la variante aggrave l'écart, car E ne doit plus jamais compenser C).

**Mutant P03 (parenthèses)** : `((M AND P AND NOT R AND C) OR E) IS TRUE`.
Le `OR E` sort E du contexte M∧P∧¬R∧C : E=T suffit à autoriser, ignorant appartenance, finalité, révocation et consentement.

- Contre-exemple minimal : **(T,T,T,T,T)** → P03 autorise alors que R=T (révocation établie) ; la référence refuse. Autre : (T,T,T,F,T).
- **P03 autorise 83 combinaisons, dont 80 à tort** vs la variante (78 à tort vs la base).

| Mutant | Autorise | À tort (vs variante) | À tort (vs base) |
|---|---|---|---|
| P02 NULL | 10 | **7** | 5 |
| P03 parenthèses | 83 | **80** | 78 |

---

## Q3 — P04 : valeur vs exécution

P04 : M=T, P=T, R=F, C=T, E=T. L'interpréteur initial évalue C d'abord (C=T) et **court-circuite** la branche d'urgence : aucun jeton consommé. L'optimiseur place `consumeEmergencyToken()` en tête du OR : il consomme le jeton puis renvoie T.

La commutativité de OR est **valide sur les valeurs** (T∨x = x∨T = T) mais **invalide sur les exécutions** : `consumeEmergencyToken()` n'est pas une primitive pure (R07). Sa *valeur* T est équivalente, sa *trace* (consommation d'un jeton à usage unique) ne l'est pas. R04 impose : quand C=T, l'accès ordinaire est préféré et **ne doit pas** consommer de jeton, même si E=T.

**Représentation intermédiaire séparant décision et consommation** (IR en deux phases) :

```
Phase 1 — DÉCISION (pure, sans effet) :
  need_token := (C IS NOT TRUE) AND (E IS TRUE)   -- ici toujours F dans la variante
  allowed    := (M IS TRUE) AND (P IS TRUE) AND (R IS FALSE) AND (C IS TRUE)
Phase 2 — EFFET (atomique, conditionnel) :
  IF allowed AND need_token THEN consume_token(principal,objet,action)
  IF allowed THEN record_access(op_id)
```

Dans la **variante**, `need_token` est **structurellement faux** (C=T est requis pour autoriser, donc la branche d'urgence n'est jamais atteinte). Le plan d'exécution ne contient donc **aucun appel à `consumeEmergencyToken()`** : P04 devient impossible par construction. C'est le point clé de la variante.

---

## Q4 — Vues de faits, cache, concurrence (P05/P06)

**P05 (révisions croisées).** e7 dit R=F, e8 dit M=T,P=T, mais à e8 la valeur courante de R est T. Combiner des signatures de révisions différentes produit une vue incohérente : R02 exige une **vue de politique cohérente** et impose de signaler le mélange de révisions comme **défaut de preuve**. Réparation : chaque fait porte un identifiant de vue/révision ; on n'assemble que des faits de **même vue** ; tout mélange → U **plus** un drapeau `proof_defect`. Le frontend ne peut donc pas affirmer « tous les faits certifiés » : il doit propager le défaut.

**P06 (concurrence).** C=F, un seul jeton valide, E=T. A et B lisent l'état avant consommation. Les deux sont légitimes à soumettre, mais **aucun privilège ne permet de réutiliser le jeton**. Réparation : la consommation est un **compare-and-swap atomique** sur le jeton (usage unique, R04/R05). Une seule requête gagne ; l'autre échoue proprement (jeton déjà consommé) et doit être re-soumise avec un nouveau jeton ou un consentement.

**Point de linéarisation.** L'accès se linéarise au **commit de la transaction** qui (i) vérifie les faits courants, (ii) consomme le jeton si nécessaire, (iii) enregistre l'accès avec son `op_id`. Avant ce point, rien n'est engagé ; après, l'effet est définitif et unique.

**Politique changeant pendant le calcul.** On fige une **vue de politique** (snapshot) au début de la transaction ; si la vue change avant le commit, la transaction est **abortée et rejouée** sur la nouvelle vue. On ne mélange jamais deux vues dans une même décision (R02).

---

## Q5 — Idempotence, usage unique, révocation (P07)

P07 : A a consommé son jeton, la réponse réseau est perdue, puis la lecture est révoquée ; le client rejoue A et le cache renvoie l'ancienne projection privée.

**Distinction fondamentale :**
- **Rejouer un statut** : renvoyer un *statut opaque d'opération* (`op_id` → « déjà exécuté », succès/échec) est idempotent et sûr — c'est un accusé de réception, pas une donnée.
- **Divulguer un résultat** : renvoyer l'*ancienne projection privée* est une **nouvelle divulgation** qui exige une **autorisation de lecture courante** (R06). Le cache d'idempotence **n'est pas** une exception générale à la révocation.

**Réconciliation :**
1. Le rejeu de A ne consomme **pas** un second jeton (R05) : l'`op_id` est reconnu, la consommation est unique.
2. Mais la réponse ne peut pas re-servir la projection privée sans re-vérifier la lecture courante. Après révocation, la re-divulgation est **refusée** ; on renvoie au plus le statut opaque.
3. Donc : idempotence de l'**effet** (jeton, enregistrement) ≠ idempotence de la **divulgation** (contenu). Le cache stocke le statut, pas le payload privé, ou re-valide le payload à chaque service.

---

## Q6 — Preuve composée, tests, limites

**Preuve composée (variante).**
- *Décision* : `allowed ⇔ (M=T ∧ P=T ∧ R=F ∧ C=T)`. Preuve par énumération exhaustive des 243 combinaisons : la traduction SQL `M IS TRUE AND P IS TRUE AND R IS FALSE AND C IS TRUE` coïncide exactement avec l'interpréteur de référence (0 divergence).
- *Effet* : `need_token ⇔ (C≠T ∧ E=T)`. Dans la variante, `allowed ⇒ C=T`, donc `allowed ∧ need_token` est **insatisfiable** → **aucune consommation de jeton** n'est possible sur un accès autorisé. La trace d'urgence est vide par construction.
- *Sûreté* : toute autorisation implique R=F (absence établie de révocation) et C=T (consentement établi) ; U ne peut jamais produire une autorisation (U≠T).

**Tests positifs :** (T,T,F,T,T), (T,T,F,T,F), (T,T,F,T,U) → autorisés (les 3 seules combinaisons).
**Tests négatifs :** (T,T,F,F,T) → refusé (C≠T, E ne compense plus) ; (T,T,U,T,T) → refusé (R inconnu) ; (T,T,T,T,T) → refusé (révoqué) ; (F,T,F,T,T) → refusé (non membre) ; (T,F,F,T,T) → refusé (finalité) ; toute combinaison avec un fait U sur M,P,R,C → refusée.

**Limites de la compilation frontend/backend.** Le frontend ne peut pas décider seul : il ne voit qu'une vue partielle et peut mélanger des révisions (P05). Le backend est l'autorité (faits courants + linéarisation). Le frontend ne doit servir que de **pré-filtre optimiste** ; toute décision d'autorisation et tout effet (jeton, enregistrement) restent côté backend, dans la transaction. La compilation doit préserver la décision sur T,F,U **et** ne jamais déplacer un effet hors de la phase atomique.

---

## Réponse à la question posée

**Combien de combinaisons autorisent ?** **3** sur 243 : exactement (M=T, P=T, R=F, C=T) avec E ∈ {T, F, U}. E étant devenu sans effet, il ne contraint plus rien ; les quatre autres faits sont tous fixés à une valeur unique.

**Quel plan s'applique ?** Un plan **purement décisionnel, sans branche d'urgence** :

```sql
-- Décision (pure)
M IS TRUE AND P IS TRUE AND R IS FALSE AND C IS TRUE
-- Effet : aucun consumeEmergencyToken() (need_token ≡ F dans la variante)
-- puis record_access(op_id) atomique, linéarisé au commit
```

Conséquences directes de la variante : (1) la substitution d'urgence disparaît, donc P04 (consommation inutile de jeton) devient **impossible par construction** ; (2) les mutants P02 et P03 deviennent **plus dangereux** (7 et 80 combinaisons autorisées à tort, contre 5 et 78 dans le dossier de base), car ils continuent d'exploiter E comme substitut de C ; (3) le seul chemin d'autorisation exige désormais un consentement **établi** (C=T) et une absence de révocation **établie** (R=F), U ne pouvant jamais autoriser.
# RÉPONSE FINALE — Variante « C obligatoire, E sans substitution »

## 1. Résultats exacts

**Hypothèse modifiée (unique) :** R03 devient « l'accès complet exige M=T, P=T, R=F **et C=T** ; E n'accorde plus aucune substitution ». Toutes les autres règles du dossier de base (R01 logique de Kleene, R02 faits, R04–R07, P01–P07) sont conservées.

**Expression source (P01 modifiée) :** `M AND P AND NOT R AND C`, autoriser seulement si T.

**Traduction SQL correcte :**
```sql
M IS TRUE AND P IS TRUE AND R IS FALSE AND C IS TRUE
```

**Nombre de combinaisons autorisantes : 3 sur 243.**

| M | P | R | C | E | Décision |
|---|---|---|---|---|---|
| T | T | F | T | T | **T** |
| T | T | F | T | F | **T** |
| T | T | F | T | U | **T** |

E est devenu sans effet : il ne contraint plus rien. Les quatre autres faits sont chacun fixés à une valeur unique (M=T, P=T, R=F, C=T), d'où 1×1×1×1×3 = **3**.

**Plan d'exécution :** plan **purement décisionnel, sans branche d'urgence**.
- Décision (pure) : `M IS TRUE AND P IS TRUE AND R IS FALSE AND C IS TRUE`.
- Effet : **aucun** `consumeEmergencyToken()` — `need_token ≡ (C≠T ∧ E=T)` est structurellement faux puisque `allowed ⇒ C=T`.
- Puis `record_access(op_id)` atomique, linéarisé au commit.

## 2. Certificats

**Certificat de décision (énumération exhaustive).** Les 3⁵ = 243 affectations de (M,P,R,C,E) dans {T,F,U} ont été énumérées en logique forte de Kleene (NOT échange T↔F, laisse U ; AND : F domine sinon U domine T ; OR : T domine sinon U domine F ; décision = T). L'interpréteur de référence et la traduction SQL coïncident sur **les 243 combinaisons, 0 divergence**. Ensemble autorisant exact : {(T,T,F,T,T), (T,T,F,T,F), (T,T,F,T,U)}.

**Certificat d'effet (trace vide).** `allowed ⇒ C=T`, donc `allowed ∧ need_token` est insatisfiable : aucune consommation de jeton n'est possible sur un accès autorisé. La trace d'urgence est vide **par construction**, non par optimisation.

**Certificat mutants (vs variante).**

| Mutant | Autorise | À tort (vs variante) | À tort (vs base) |
|---|---|---|---|
| P02 NULL | 10 | **7** | 5 |
| P03 parenthèses | 83 | **80** | 78 |

- P02 : `COALESCE(R,FALSE)` écrase U→F, et `(C IS TRUE OR E IS TRUE)` réintroduit la substitution supprimée. Contre-exemple minimal : **(T,T,F,F,T)** (C=F mais E=T → autorisé à tort) ; aussi (T,T,U,T,T) (R inconnu).
- P03 : `((M AND P AND NOT R AND C) OR E) IS TRUE` sort E du contexte. Contre-exemple minimal : **(T,T,T,T,T)** (R=T révoqué, mais E=T → autorisé à tort) ; aussi (T,T,T,F,T).

**Sûreté.** Toute autorisation implique R=F (absence **établie** de révocation) et C=T (consentement **établi**). U ne peut jamais produire une autorisation (U≠T).

## 3. Pièges

1. **Confondre valeur et trace.** La commutativité de OR est valide sur les valeurs (T∨x = x∨T = T) mais invalide sur les exécutions : `consumeEmergencyToken()` n'est pas une primitive pure (R07). Sa valeur T est équivalente, sa trace (jeton à usage unique) ne l'est pas. Dans la variante, ce piège est neutralisé car la branche d'urgence n'existe plus dans le plan.
2. **`NOT R` en trois valeurs ≠ `NOT R` SQL binaire.** Seul `R IS FALSE` rend T exactement quand R=F, et F quand R=T **ou** R=U. `COALESCE(R,FALSE)` (P02) transforme U en F et autorise à tort.
3. **`C = TRUE` vs `C IS TRUE`.** `C = TRUE` vaut U/NULL quand C est inconnu ; seul `C IS TRUE` est correct.
4. **U ≠ « faux dans le monde ».** U est une absence de preuve ; il ne doit jamais être rabattu sur F ni sur T.
5. **Mélange de révisions (P05).** Combiner e7 (R=F) et e8 (M=T,P=T) alors que R est courant=T produit une vue incohérente : R02 impose de signaler le mélange comme **défaut de preuve**, pas de le résoudre silencieusement.
6. **Réutilisation de jeton (P06).** Aucun privilège ne donne le droit de réutiliser un jeton à usage unique ; la consommation doit être un compare-and-swap atomique.
7. **Cache = exception à la révocation (P07).** Faux : rejouer un **statut** est idempotent et sûr ; re-divulguer une **projection privée** est une nouvelle divulgation exigeant une autorisation de lecture **courante**.
8. **Le contrôle fini ne prouve pas tout.** L'équivalence sur 243 combinaisons est extensionnelle : elle ne couvre ni les traces, ni la fraîcheur/cohérence des faits, ni d'autres expressions.

## 4. Limites

- **Portée du certificat fini.** L'énumération prouve l'équivalence de décision sur le domaine fini des cinq faits à trois valeurs, pour cette expression et cette vue. Elle ne prouve pas l'équivalence des traces, ni la correction des faits, ni la préservation sous d'autres expressions ou sous des faits à plus de trois valeurs.
- **Frontend vs backend.** Le frontend ne voit qu'une vue partielle et peut mélanger des révisions (P05) : il ne peut être qu'un **pré-filtre optimiste**. Toute décision d'autorisation et tout effet (jeton, enregistrement) restent côté backend, dans la transaction, avec linéarisation au commit.
- **Politique changeant pendant le calcul.** On fige un snapshot de vue au début de la transaction ; si la vue change avant le commit, la transaction est **abortée et rejouée** sur la nouvelle vue. On ne mélange jamais deux vues dans une décision.
- **Effet de la variante sur les mutants.** La variante **durcit** la politique : P02 et P03 deviennent plus dangereux (7 et 80 combinaisons à tort, contre 5 et 78 dans le dossier de base), car ils continuent d'exploiter E comme substitut de C — substitution désormais interdite.

## 5. Synthèse

**Combien de combinaisons autorisent ?** **3** sur 243 : (M=T, P=T, R=F, C=T) avec E ∈ {T, F, U}.

**Quel plan s'applique ?** Un plan **purement décisionnel sans branche d'urgence** : décision `M IS TRUE AND P IS TRUE AND R IS FALSE AND C IS TRUE`, **aucune** consommation de jeton (`need_token ≡ F`), puis `record_access(op_id)` atomique linéarisé au commit. La substitution d'urgence disparaissant, P04 (consommation inutile) devient **impossible par construction**, et le seul chemin d'autorisation exige un consentement **établi** (C=T) et une absence de révocation **établie** (R=F), U ne pouvant jamais autoriser.