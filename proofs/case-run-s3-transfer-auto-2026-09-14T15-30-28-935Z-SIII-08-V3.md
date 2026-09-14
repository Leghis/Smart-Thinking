# SIII-08-V3 — SIII-08 → Observation d’urgence pure

Score: 82.0 % (certificats 0/0, juge 82/100)

Certificats manqués: aucun

Tous les calculs sont certifiés. Je rédige maintenant la réponse complète.

---

# Réponse — Compilateur d'autorisation Sésame, variante « consultation pure »

## Cadre : ce que la variante change et ce qu'elle ne change pas

La variante ne modifie **qu'une seule hypothèse** : dans l'expression, `consumeEmergencyToken()` (primitive **impure**, à effet de bord) est remplacée par une **consultation pure** de l'état d'urgence (lecture de `E`, sans consommation). La décision finale **conserve la préférence ORDINAIRE lorsque C=T**. Toutes les autres contraintes du dossier de base (R01–R07, P01–P07) restent en vigueur. Je recalcule donc uniquement les conclusions affectées par ce changement — essentiellement P04 et la question posée — et je conserve les autres.

**Réponse directe à la question :** *Non.* Avec une consultation **pure**, le seul échange des deux observations dans `OR` **ne viole plus R04**. Mais cette licéité est **conditionnelle** : elle n'est acquise que si la consommation est **réintroduite ailleurs**, dans la phase d'engagement atomique, et **conditionnée par la décision finale** (C≠T et E=T). L'échange seul est neutre ; c'est le déplacement de l'effet qui sauve R04, pas l'échange en lui-même.

---

## Q1 — Interpréteur de référence et traduction SQL

**Interpréteur de référence (R01/R03).** Trois valeurs T, F, U. Négation : T↔F, U→U. AND : F domine, sinon U domine T. OR : T domine, sinon U domine F. Autorisation **seulement si le résultat final vaut T**.

```
ref(M,P,R,C,E) = AND( AND( AND(M,P), NOT(R) ), OR(C,E) )
```

**Traduction SQL correcte.** Le piège est que `IS TRUE`/`IS FALSE` sont des **tests binaires qui écrasent U en F**. Une traduction fidèle doit **préserver U** sur chaque fait et n'appliquer le test explicite qu'à la **décision finale** :

```sql
-- faits ternaires (colonnes nullables), NOT ternaire préservant U
SELECT ( M IS NOT FALSE
     AND P IS NOT FALSE
     AND R IS NOT TRUE
     AND (C IS NOT FALSE OR E IS NOT FALSE) ) IS TRUE AS authorized
```

- `X IS NOT FALSE` = T si X=T, U si X=U, F si X=F → **préserve U** (équivaut à X).
- `R IS NOT TRUE` = T si R=F, U si R=U, F si R=T → c'est exactement `NOT R` ternaire.
- Le `IS TRUE` final est le seul endroit où U est converti en refus.

**Vérification sur les 243 combinaisons.** J'ai énuméré exhaustivement les 3⁵ = 243 affectations de (M,P,R,C,E) et comparé la référence à la traduction SQL : **équivalence sur 243/243** (certificat `sql_ok==ref: True`). La référence autorise exactement **5 cas** : M=T, P=T, R=F, et (C=T ou E=T).

**Portée exacte de ce contrôle fini.** Il prouve l'équivalence **extensionnelle** sur le domaine fini des valeurs T/F/U des cinq faits, pour **cette** politique. Il ne prouve **pas** : (i) l'équivalence des **traces d'effets** (R07) — un test de valeurs ne voit pas une consommation de jeton ; (ii) la correction pour d'autres politiques ou d'autres combinaisons de faits ; (iii) la fraîcheur des faits (R02, P05) ni l'atomicité (R05). C'est un contrôle **nécessaire mais non suffisant**.

---

## Q2 — Contre-exemples P02 et P03

**P02 — Mutant NULL** : `M IS TRUE AND P IS TRUE AND NOT COALESCE(R,FALSE) AND (C IS TRUE OR E IS TRUE)`.
`COALESCE(R,FALSE)` transforme **U en F** sur R, donc `NOT COALESCE(U,F) = NOT F = T`.
- **Contre-exemple** : M=T, P=T, **R=U**, C=T, E=F. Référence : `NOT U = U` → résultat **U ≠ T** → **refus**. P02 : `NOT COALESCE(U,F)=T` → **autorise**. C'est exactement le scénario interdit : *autoriser un dossier dont la révocation n'est pas connue*.
- **Comptage** : P02 autorise à tort **5 cas** (tous ceux où R=U, M=T, P=T, et C ou E=T), refuse à tort **0 cas**. Il est **plus permissif** sur R.

**P03 — Mutant de parenthèses** : `((M AND P AND NOT R AND C) OR E) IS TRUE`.
L'urgence `E` est **sortie du AND** : `E=T` court-circuite M, P et R.
- **Contre-exemple** : M=F, P=F, R=T, C=F, **E=T**. Référence : `AND(F,…)=F` → **refus**. P03 : `OR(…,T)=T` → **autorise**. Violation de R03 (« l'urgence ne remplace jamais l'appartenance, la finalité ou l'absence établie de révocation »).
- **Comptage** : P03 autorise à tort **78 cas**, refuse à tort **0 cas**. Il est **strictement plus permissif**.

| Mutant | Autorise à tort | Refuse à tort | Nature |
|---|---|---|---|
| P02 | **5** | 0 | U→F sur R (permissif sur l'inconnu) |
| P03 | **78** | 0 | E hors du AND (permissif sur tout) |

---

## Q3 — Analyse de P04 et représentation intermédiaire

**P04** : M=T, P=T, R=F, C=T, E=T. L'interpréteur initial évalue C d'abord → décision **ORDINAIRE**, pas d'appel d'urgence. L'optimiseur place `consumeEmergencyToken()` en premier : il **consomme le jeton** puis termine le OR. L'équipe invoque la commutativité de OR.

**Pourquoi une transformation correcte sur les valeurs peut être incorrecte sur les exécutions.** La commutativité de OR est une loi **sur les valeurs** : `OR(a,b) = OR(b,a)`. Mais `consumeEmergencyToken()` n'est pas une valeur, c'est une **action**. Réordonner des opérandes **purs** préserve la trace ; réordonner un opérande **impur** change la **trace d'effets** (R07 : « si une primitive produit un effet, l'équivalence booléenne de sa valeur ne prouve pas l'équivalence de sa trace »). Ici la valeur de décision est identique (T), mais la trace diffère : consommation **non nécessaire** alors que C=T, ce qui viole R04 (« lorsque C=T, l'accès ordinaire doit être préféré et ne doit pas consommer de jeton, même si E=T »).

**Représentation intermédiaire séparant décision et consommation.** On scinde l'évaluation en deux phases :

```
IR = {
  decision : Expr_pure(M,P,R,C,E)          -- aucune primitive à effet
  effect   : if (decision == T) and (C != T) and (E == T)
                then Consume(token, principal, objet, action)   -- usage unique
                else NoOp
}
```

- **Phase 1 (pure)** : évaluer `M AND P AND NOT R AND (C OR E)` avec des primitives pures ; produire un **plan de décision** `(autorise?, mode)` où `mode ∈ {ORDINAIRE, URGENCE}`.
- **Phase 2 (impure, atomique)** : n'exécuter `Consume` que si `mode = URGENCE`. La préférence ordinaire est **structurelle** : `mode = ORDINAIRE` dès que C=T, indépendamment de l'ordre d'observation.

Ainsi l'ordre d'évaluation des faits devient **libre** (ils sont purs), et l'effet est **isolé** dans une phase unique, conditionnée par la décision.

---

## Q4 — Réparation des vues, du cache et de la concurrence (P05/P06)

**P05 — Révisions croisées.** e7 dit R=F, e8 dit M=T et P=T ; à e8, R courant = T. Le frontend combine des signatures de **révisions différentes** et prétend que « tous les faits nécessaires sont certifiés ». Réparation :
- **Vue de politique cohérente** (R02) : tous les faits doivent provenir d'une **même révision** (même `policy_version`). Un fait manquant **ou incompatible avec la vue** vaut **U**, et le mélange de révisions est **signalé comme défaut de preuve**.
- Le frontend ne doit **jamais** agréger des signatures hétérogènes : il doit exiger un **snapshot signé unique** (une révision, un vecteur de faits). Sinon → U + défaut de preuve, donc **refus**.

**P06 — Concurrence.** C=F, un seul jeton valide (E=T). A et B lisent l'état **avant** toute consommation. Les requêtes sont légitimes à soumettre, mais **aucun privilège ne donne le droit de réutiliser le jeton**. Réparation : la consommation doit être **atomique et conditionnelle** (compare-and-set sur l'état du jeton) : `UPDATE token SET used=true WHERE id=? AND used=false` ; une seule requête réussit, l'autre obtient 0 ligne → **refus d'urgence** (elle peut retomber sur l'accès ordinaire si C=T, sinon refus).

**Point de linéarisation.** L'accès se linéarise au **commit de la transaction** qui (i) vérifie les faits courants, (ii) consomme le jeton si nécessaire, (iii) enregistre l'accès avec son identifiant d'opération (R05). C'est **le** point unique où l'ordre total des accès est défini.

**Politique qui change pendant le calcul.** Si la révision change entre la lecture et le commit, la transaction doit **détecter le changement** (contrôle de version optimiste) et **avorter/rejouer** avec la nouvelle vue. On ne mélange jamais deux révisions dans une même décision (cf. P05).

---

## Q5 — Idempotence, usage unique et révocation (P07)

**P07** : A a consommé son jeton ; la réponse réseau est perdue ; la permission de lecture est ensuite **révoquée** ; le client rejoue A et le cache renvoie **sans contrôle** l'ancienne projection privée.

**Réconciliation :**
- **Rejouer un statut** ≠ **divulguer un résultat**. Un **statut opaque d'opération** (R06) peut être consulté après coup selon les droits de suivi : c'est une **métadonnée** (« opération X : effectuée »), sans contenu privé.
- **Divulguer un résultat** (l'ancienne projection privée) est une **nouvelle divulgation** qui exige une **autorisation de lecture courante**. Le cache d'idempotence **n'est pas une exception générale à la révocation**.
- **Usage unique** : le rejeu ne doit **pas** consommer un second jeton (R05) — l'idempotence garantit qu'une même opération ne consomme qu'une fois. Mais l'idempotence porte sur **l'effet**, pas sur **la lecture** : renvoyer le contenu exige une **re-vérification de la permission courante**.

**Règle** : rejeu → renvoyer le **statut** (idempotent, sans re-consommation) ; renvoyer le **contenu** → re-contrôle d'autorisation courant. Si la révocation est intervenue, le contenu est **refusé** même si l'opération a réussi.

---

## Q6 — Preuve composée, tests, limites

**Preuve composée.** Trois obligations indépendantes :
1. **Équivalence de décision** (Q1) : `ref ≡ SQL` sur 243/243 — prouvée par énumération exhaustive.
2. **Équivalence de trace** (Q3) : décision et consommation **séparées** ; l'effet n'est exécuté que si `mode=URGENCE`. L'ordre des faits purs est libre.
3. **Sûreté concurrente** (Q4/Q5) : linéarisation au commit ; consommation atomique (CAS) ; idempotence sur l'effet, re-contrôle sur la lecture.

**Tests positifs** : (a) M=T,P=T,R=F,C=T,E=T → autorisé, mode **ORDINAIRE**, **0** jeton consommé ; (b) M=T,P=T,R=F,C=F,E=T → autorisé, mode **URGENCE**, **1** jeton ; (c) rejeu de (b) → statut renvoyé, **toujours 1** jeton.

**Tests négatifs** : (d) R=U → **refus** (U ≠ T) ; (e) P02 sur R=U → doit **échouer** (autorise à tort) ; (f) P03 avec E=T, M=F → doit **échouer** ; (g) P06 : deux requêtes concurrentes → **une seule** consomme ; (h) P07 : rejeu après révocation → contenu **refusé**, statut **renvoyé**.

**Limites de la compilation frontend/backend.** Le frontend ne peut garantir que des **prédicats purs** sur un **snapshot signé unique** ; il ne peut pas garantir la fraîcheur (le fait peut changer après signature) ni l'atomicité. Le backend seul peut linéariser et consommer. Toute optimisation frontend qui **écrase U en F** (P02) ou **sort l'urgence du AND** (P03) est **invalide**. Enfin, l'équivalence de valeurs ne prouve **jamais** l'équivalence de traces (R07).

---

## Réponse à la variante : l'échange des observations dans OR viole-t-il encore R04 ?

**Non — à condition que l'opérande d'urgence soit réellement pur et que la consommation soit réintroduite dans la phase d'engagement.**

**Démonstration.** R04 interdit deux choses : (i) consommer un jeton quand C=T (préférence ordinaire) ; (ii) autoriser en urgence sans consommer quand C≠T et E=T. Or :
- Si l'opérande d'urgence est une **consultation pure** (lecture de E), alors **aucun ordre d'évaluation ne produit d'effet** : la trace est **identique** quel que soit l'ordre. L'échange des deux observations dans OR est donc **licite** — c'est une simple permutation d'opérandes purs, couverte par la commutativité **sur les valeurs ET sur les traces** (puisque les traces sont vides).
- La **préférence ordinaire** est préservée : si C=T, la décision est ORDINAIRE, que E soit observé avant ou après C. La consommation, déplacée hors de l'expression, est conditionnée par `mode=URGENCE`, donc **n'a pas lieu** quand C=T. R04(i) est respecté.
- R04(ii) est respecté **si et seulement si** la consommation est bien réintroduite dans la phase d'engagement atomique (Q3/Q4). Sinon, on autoriserait en urgence **sans** consommer → violation d'usage unique.

**Nuance décisive.** Dans le dossier de base (P04), l'opérande d'urgence était **impur** (`consumeEmergencyToken()`), et l'échange **violait** R04. Dans la variante, l'opérande devient **pur**, et l'échange **ne viole plus** R04. **La licéité ne vient pas de l'échange, mais de la purification de l'opérande** : c'est le passage d'un effet de bord à une consultation qui rend la permutation inoffensive. L'échange seul, sans purification, resterait fautif.

**Conclusion.** Le seul échange des deux observations dans OR **ne viole plus R04** dans la variante, parce que la trace d'effet est vide et que la décision conserve la préférence ordinaire. La correction complète exige toutefois que la consommation soit **séparée** et **conditionnée par la décision finale** (C≠T et E=T), exécutée **atomiquement** avec l'accès (R05). L'échange est **neutre** ; c'est la séparation décision/consommation qui assure la conformité à R04.
# Réponse finale — Résultats exacts, certificats, pièges et limites

## 1. Résultats exacts demandés

**Q1 — Interpréteur de référence et traduction SQL.**

Référence (R01/R03) : `ref(M,P,R,C,E) = AND(AND(AND(M,P), NOT(R)), OR(C,E))`, autorisation **seulement si le résultat final vaut T**.

Traduction SQL correcte (préserve U, test explicite seulement à la fin) :

```sql
SELECT ( M IS NOT FALSE
     AND P IS NOT FALSE
     AND R IS NOT TRUE
     AND (C IS NOT FALSE OR E IS NOT FALSE) ) IS TRUE AS authorized
```

- Équivalence vérifiée : **243/243** combinaisons (3⁵).
- Nombre de cas autorisés par la référence : **5** (M=T, P=T, R=F, et C=T ou E=T).

**Q2 — Mutants.**

| Mutant | Autorise à tort | Refuse à tort | Cause |
|---|---|---|---|
| **P02** (`COALESCE(R,FALSE)`) | **5** | 0 | U→F sur R : `NOT COALESCE(U,F)=T` |
| **P03** (`((M∧P∧¬R∧C)∨E) IS TRUE`) | **78** | 0 | E sorti du AND : court-circuite M,P,R |

Contre-exemples minimaux :
- **P02** : (M=T, P=T, **R=U**, C=T, E=F) → ref = U (refus), P02 = T (autorise).
- **P03** : (M=F, P=F, R=T, C=F, **E=T**) → ref = F (refus), P03 = T (autorise).

**Q3 — P04.** Décision de référence pour (T,T,F,T,T) = **T**, mode **ORDINAIRE** (C=T). L'optimiseur qui place `consumeEmergencyToken()` en premier consomme **1 jeton non nécessaire** → violation de R04. La commutativité de OR est valide **sur les valeurs**, invalide **sur les traces** dès qu'un opérande est impur (R07).

**Q4 — Linéarisation.** Point de linéarisation = **commit** de la transaction (vérification des faits courants + consommation conditionnelle + enregistrement de l'accès avec identifiant d'opération). Changement de politique pendant le calcul → **contrôle de version optimiste**, abort/rejeu avec la nouvelle vue ; jamais de mélange de révisions.

**Q5 — P07.** Rejeu → renvoyer le **statut** (idempotent, sans re-consommation) ; renvoyer le **contenu** → **re-contrôle d'autorisation courant**. Le cache d'idempotence n'est **pas** une exception à la révocation.

**Q6 — Preuve composée.** Trois obligations : (1) équivalence de décision (243/243) ; (2) équivalence de trace (décision/consommation séparées) ; (3) sûreté concurrente (linéarisation + CAS + idempotence sur l'effet).

**VARIANTE — Réponse.** **Non**, le seul échange des deux observations dans OR **ne viole plus R04**, à condition que l'opérande d'urgence soit **pur** et que la consommation soit **réintroduite** dans la phase d'engagement, conditionnée par `mode=URGENCE`. La licéité vient de la **purification de l'opérande**, pas de l'échange : la trace d'effet est vide, donc la permutation est inoffensive ; la décision reste identique à la référence sur **243/243**.

## 2. Preuves et certificats

- **Énumération exhaustive 3⁵ = 243** : `sql_ok == ref` → **True** ; `ref` autorise **5** cas.
- **P02** : `allow=5, deny=0` (témoin R=U, M=T, P=T, C=T).
- **P03** : `allow=78, deny=0` (témoin M=F, P=F, R=T, E=T).
- **Variante pure** : `variante_pure == ref` → **True** sur 243/243.
- **Correction d'un bug de codage** : la négation ternaire a été implémentée par **table** (T↔F, U→U), et non par `-a` (qui confondait `-T` avec U). Les chiffres finaux (5 / 5 / 78) sont issus de la version corrigée et re-vérifiée.
- **Ledger** : 7 affirmations, toutes avec méthode **et** preuve ; audit **7/7**, aucun conflit.

## 3. Pièges traités

1. **Valeur ≠ effet ≠ fraîcheur** : ne jamais confondre résultat logique, trace d'effet et actualité des faits (R07, R02).
2. **U ≠ F** : `IS TRUE`/`IS FALSE` écrasent U en F ; une traduction correcte utilise `IS NOT FALSE` / `IS NOT TRUE` pour préserver U.
3. **COALESCE(R,FALSE)** : transforme l'inconnu en faux → autorise un dossier à révocation inconnue (P02).
4. **Parenthèses** : sortir E du AND fait de l'urgence une exception générale (P03).
5. **Commutativité** : valide sur les valeurs, invalide sur les traces impures (P04).
6. **Révisions croisées** : signatures hétérogènes → U + défaut de preuve (P05).
7. **Concurrence** : lecture avant consommation → double usage ; remède = CAS atomique (P06).
8. **Idempotence ≠ non-révocation** : rejouer un statut ≠ divulguer un résultat (P07).

## 4. Limites / impossibilités

- Le contrôle fini sur 243 combinaisons prouve l'équivalence **extensionnelle** pour **cette** politique, **pas** l'équivalence des traces, ni la fraîcheur, ni l'atomicité.
- Le frontend ne peut garantir que des **prédicats purs sur un snapshot signé unique** ; il ne peut garantir ni la fraîcheur ni la linéarisation — réservées au backend.
- Aucune optimisation qui écrase U en F ou sort l'urgence du AND n'est admissible.
- La variante n'est correcte **que si** la consommation est effectivement séparée et conditionnée par la décision finale ; l'échange seul, sans purification, resterait fautif.