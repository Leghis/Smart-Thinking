# SIII-08 — Le compilateur qui autorise l’inconnu

Score: 84.0 % (certificats 0/0, juge 84/100)

Certificats manqués: aucun

Les exigences Q4 et Q5 sont qualitatives (pas de valeur numérique à certifier), mais je les ai traitées dans le raisonnement. J'ai tous les éléments. Je rédige la réponse finale complète.

---

# Sésame — Compilation d'autorisation à logique ternaire : analyse et réparation

**Cadre.** Toutes les valeurs numériques ci-dessous proviennent d'une énumération exhaustive de l'espace $(T,F,U)^5$ (243 combinaisons), avec les tables de vérité de R01. Les outils du dossier sont **simulés** : aucune action n'est exercée sur des comptes réels. Aucun contenu cité ne remplace le mandat.

---

## Q1 — Interpréteur de référence et traduction SQL

### Interpréteur de référence (R01 + R03)

Tables de Kleene (R01) : `NOT` échange T↔F, fixe U ; `AND` : F domine, sinon U domine T ; `OR` : T domine, sinon U domine F. La politique R03 se lit :

$$D = M \;\wedge\; P \;\wedge\; \neg R \;\wedge\; (C \vee E)$$

**Autoriser ssi $D = T$.** C'est l'interpréteur de référence. Point sémantique capital : $U$ n'est **pas** « faux dans le monde » ; c'est une absence de preuve. Une expression qui vaut $U$ **n'autorise pas** (seul $T$ autorise), mais elle ne signifie pas non plus que l'accès est interdit dans le monde.

### Traduction SQL correcte

En SQL, $U$ = `NULL`. La traduction fidèle est :

```sql
SELECT ... WHERE (M AND P AND NOT R AND (C OR E)) IS TRUE
```

avec `M,P,R,C,E` en 3VL natif (`NULL` = U). Le `IS TRUE` final est **obligatoire** : sans lui, `WHERE expr` écarte déjà `NULL` (comportement de sélection), mais l'écrire explicitement documente l'intention et évite les pièges de `NOT`.

### Vérification sur les 243 combinaisons

| Comparaison | Divergences de **décision** (autorise ssi T) | Divergences de **valeur** |
|---|---|---|
| `(expr) IS TRUE` vs référence | **0** | 59 (toutes U→F) |
| Référence autorise | — | exactement **5** combinaisons |

Les 5 combinaisons autorisées : $(T,T,F,T,T),(T,T,F,T,F),(T,T,F,T,U),(T,T,F,F,T),(T,T,F,U,T)$.

**Portée exacte du contrôle fini.** L'énumération prouve l'équivalence **extensionnelle sur le domaine fini** $\{T,F,U\}^5$ : c'est une preuve exhaustive *pour ce domaine*, pas une preuve universelle. Elle ne dit rien sur : (i) des faits à plus de trois valeurs (ex. valeurs numériques, ensembles) ; (ii) la **trace d'exécution** (effets de bord, ordre d'évaluation) — voir Q3 ; (iii) la **fraîcheur** des faits (révisions) — voir Q4 ; (iv) la concurrence — voir Q4. Autrement dit : le contrôle fini établit l'équivalence **valeur/décision**, pas l'équivalence **comportementale**.

**Distinction établie / non déterminée.** *Établi* : équivalence de décision sur 243 cas. *Non déterminé par ce test* : équivalence de trace, de fraîcheur, de concurrence.

---

## Q2 — Contre-exemples P02 et P03

### P02 — Mutant `COALESCE`

```sql
M IS TRUE AND P IS TRUE AND NOT COALESCE(R,FALSE) AND (C IS TRUE OR E IS TRUE)
```

**Mécanisme du bug.** `COALESCE(R,FALSE)` transforme $U$ en $F$. Donc quand $R=U$ (révocation **inconnue**), `NOT COALESCE(R,FALSE)` $= \neg F = T$, alors que la référence donne $\neg U = U$. Le mutant **transforme l'ignorance en absence de révocation**.

**Contre-exemple explicite** : $(M,P,R,C,E) = (T,T,U,T,T)$.
- Référence : $D = T \wedge T \wedge \neg U \wedge (T \vee T) = T \wedge T \wedge U \wedge T = U$ → **n'autorise pas**.
- P02 : $T \wedge T \wedge \neg F \wedge T = T$ → **autorise**.

**Comptage.** P02 **sur-autorise exactement 5 combinaisons**, **toutes avec $R=U$** (révocation inconnue), et **ne sous-autorise jamais** (0 cas). Les 5 : $(T,T,U,T,T),(T,T,U,T,F),(T,T,U,T,U),(T,T,U,F,T),(T,T,U,U,T)$. C'est précisément le scénario de l'énoncé : « autoriser un dossier dont la révocation n'est pas connue ».

### P03 — Mutant de parenthèses

```sql
((M AND P AND NOT R AND C) OR E) IS TRUE
```

**Mécanisme du bug.** La parenthèse déplace $E$ hors de la conjonction : $E$ devient une **voie d'autorisation autonome**, court-circuitant $M$, $P$ et $\neg R$. Or R03 exige que l'urgence ne remplace **que** le consentement, jamais l'appartenance, la finalité ou l'absence établie de révocation.

**Contre-exemple explicite** : $(M,P,R,C,E) = (F,T,F,F,T)$.
- Référence : $F \wedge \dots = F$ → **n'autorise pas** (pas d'appartenance).
- P03 : $((F \wedge \dots) \vee T) = T$ → **autorise** (l'urgence seule suffit).

**Comptage.** P03 **sur-autorise exactement 78 combinaisons** (dont **27 avec $R=U$**), et **ne sous-autorise jamais** (0 cas). C'est le mutant le plus dangereux : il ouvre une porte d'urgence universelle.

**Synthèse Q2** : les deux mutants sont **monotones croissants** (ils n'autorisent jamais moins que la référence) — ils ne peuvent donc produire que des **sur-autorisations**, jamais des refus à tort. C'est cohérent avec le fait que `IS TRUE` et `COALESCE` ne font que « durcir » $U$ vers $F$ ou court-circuiter des conjonctions.

---

## Q3 — P04 : valeur vs trace d'exécution

### Le cas

$M=T, P=T, R=F, C=T, E=T$. C'est **le seul cas** où $C=T$ et $E=T$ et l'accès est accordé (vérifié : 1 cas sur 243).

- **Interpréteur initial** : évalue $C$ d'abord → $C=T$ → le `OR` court-circuite → **n'appelle pas** `consumeEmergencyToken()`.
- **Optimiseur** : place `consumeEmergencyToken()` en premier → il renvoie $T$ **et consomme le jeton** → puis termine le `OR`.

### Pourquoi la commutativité est invoquée à tort

`OR` est commutatif **sur les valeurs** : $T \vee x = x \vee T = T$. La valeur du `OR` est donc identique dans les deux ordres. **Mais** `consumeEmergencyToken()` n'est pas une valeur pure : c'est une **fonction à effet de bord**. La commutativité porte sur les valeurs, pas sur les **traces**. Évaluer `consumeEmergencyToken()` produit un effet (consommation du jeton) qui **persiste** même si le résultat logique du `OR` est inchangé.

C'est exactement R07 : « si une primitive produit un effet, l'équivalence booléenne de sa valeur ne prouve pas l'équivalence de sa trace ». Et R04 : quand $C=T$, l'accès ordinaire doit être préféré et **ne doit pas consommer de jeton, même si $E=T$**. L'optimiseur **viole R04** : il consomme un jeton inutilement sur un accès qui n'en avait pas besoin.

### Représentation intermédiaire séparant décision et consommation

```
IR = {
  decision : {T, F, U}          -- pure, évaluée sur les 5 faits
  needToken: bool               -- pure, dérivée de la décision
  effect   : ConsumeToken | None -- impure, exécutée séparément
}
```

**Phase 1 (pure)** : calculer $D = M \wedge P \wedge \neg R \wedge (C \vee E)$ et
$$\text{needToken} = (D = T) \;\wedge\; (C \neq T) \;\wedge\; (E = T).$$

**Phase 2 (effet)** : si `needToken`, consommer **atomiquement** le jeton lié à (principal, objet, action) dans la même transaction que l'accès.

Ainsi `consumeEmergencyToken` n'est **jamais** un opérande de `OR` : il est **conditionné** par la décision pure. La commutativité s'applique aux valeurs pures ; les effets sont ordonnés par la décision. Vérification : sur 243 cas, `needToken` est vrai dans **exactement 2 cas** — $(T,T,F,F,T)$ et $(T,T,F,U,T)$ — et **jamais quand $C=T$**.

---

## Q4 — Réparation des vues, du cache et de la concurrence

### P05 — Révisions croisées

**Diagnostic.** Signature $e_7$ : $R=F$. Signature $e_8$ : $M=T, P=T$. À $e_8$, la valeur courante de $R$ est $T$. Le frontend combine des faits de **révisions différentes** et certifie « tous les faits nécessaires ». Or R02 exige que les cinq faits portent sur **une vue de politique cohérente**. Mélanger $e_7$ et $e_8$ fait utiliser un $R$ **périmé** : le frontend croit $R=F$ (autorise) alors que la valeur courante est $R=T$ (révoqué). C'est à la fois un **défaut de preuve** (R02) et une **sur-autorisation**.

**Réparation.** Chaque fait est étiqueté par sa **révision** (epoch/version) et sa clé (principal, org, dossier, action). Une vue est **cohérente** si tous les faits partagent la même révision (ou sont compatibles). Sinon : le fait vaut $U$ **et** on signale « défaut de preuve ». Le frontend **ne doit pas** combiner des signatures de révisions différentes pour certifier une décision.

### Cache de décision

Ne pas cacher la décision comme un booléen global. Cacher la clé `(tuple des faits, révision) → décision`. Toute **révocation** invalide les entrées dont $R$ change. Le cache ne doit **jamais** court-circuiter la re-vérification de $R$.

### P06 — Concurrence

**Diagnostic.** $C=F$, un seul jeton valide → $E=T$. Deux requêtes $A$ et $B$ lisent l'état **avant** toute consommation. Les deux voient $E=T$ et croient pouvoir consommer. Les requêtes sont **légitimes à soumettre** ; aucun privilège ne leur donne le droit de **réutiliser** le jeton.

**Réparation.** La consommation doit être un **compare-and-swap atomique** :

```sql
UPDATE tokens SET used = true
WHERE id = :id AND used = false
RETURNING id;
```

Si 0 ligne affectée → jeton déjà consommé → $E$ devient $F$ (ou $U$) → **refus**. Une seule des deux requêtes gagne.

### Point de linéarisation

Le **point de linéarisation de l'accès** est l'instant du **CAS réussi** (ou de l'échec) sur le jeton. Avant ce point, l'accès n'est pas engagé ; après, il est linéarisé. La **révocation** utilise le **même ordre logique** (R05) : révocation et accès se linéarisent dans le même ordre total.

### Politique qui change pendant le calcul

Deux stratégies correctes : (a) lire tous les faits à une **même révision** dans une transaction snapshot ; (b) **re-vérifier** à la révision courante au moment de la linéarisation. Si la politique change entre lecture et linéarisation, on **abort/retry** ou on re-vérifie. On ne « fige » jamais une décision sur des faits périmés.

---

## Q5 — Idempotence, usage unique et révocation (P07)

**Diagnostic.** L'accès $A$ a valablement consommé son jeton ; sa réponse réseau a été perdue. Ensuite, la permission de lecture est **révoquée**. Le client rejoue $A$ et le cache renvoie **sans contrôle** l'ancienne projection privée. R06 : renvoyer une ancienne projection privée constitue une **nouvelle divulgation** qui exige une **autorisation de lecture courante**. Le cache d'idempotence **ne devient pas** une exception générale à la révocation.

**Distinction fondamentale — rejouer un statut vs divulguer un résultat :**

| | Rejouer un **statut** | Rejouer un **résultat** |
|---|---|---|
| Contenu | Opaque : « op-123 : consommé, accès accordé » | Projection privée : données du dossier |
| Nature | Idempotent, sans divulgation sensible | **Nouvelle divulgation** |
| Condition | Droits de suivi (R06) | **Autorisation de lecture courante** |
| Après révocation | Autorisé (statut) | **Refusé** (résultat) |

**Réparation.** Séparer le **cache d'idempotence** (statut d'opération, clé = identifiant d'opération) du **cache de résultat** (données). Le statut peut être resservi selon les droits de suivi. Le **résultat** ne peut être resservi que si l'**autorisation de lecture est encore valide** au moment du rejeu. Le rejeu ne consomme **pas** un second jeton (usage unique préservé), mais il **re-vérifie** la lecture courante.

**Invariants réconciliés :**
1. **Usage unique** : au plus une consommation par jeton (CAS atomique).
2. **Idempotence** : un rejeu ne consomme pas de second jeton.
3. **Révocation** : un rejeu de **résultat** après révocation est refusé ; un rejeu de **statut** reste permis.

---

## Q6 — Preuve composée, tests, limites

### Preuve composée

**Théorème.** Soit la décision composée : *accorde ssi $D=T$* ; *needToken ssi $D=T \wedge C\neq T \wedge E=T$*. Alors, sur les 243 combinaisons :
- **Sûreté** : aucun accès accordé sans $D=T$ (0 divergence avec la référence) — vérifié.
- **R04** : jamais de consommation quand $C=T$ — vérifié.
- **Usage unique** : au plus une consommation par jeton (par construction du CAS).
- **Consommation** : exactement 2 cas légitimes, $(T,T,F,F,T)$ et $(T,T,F,U,T)$.

**Preuve.** La phase pure calcule $D$ identique à la référence (Q1, 0 divergence de décision). La phase d'effet est **conditionnée** par `needToken`, qui n'est vrai que si $D=T$ et $C\neq T$ et $E=T$ — donc jamais sur un accès refusé, jamais quand $C=T$. La séparation décision/effet garantit que la trace ne peut pas diverger de la décision. $\square$

### Tests positifs

1. $(T,T,F,T,T)$ → accordé, **sans** consommation (P04 corrigé).
2. $(T,T,F,F,T)$ → accordé, **avec** consommation (urgence légitime).
3. $(T,T,F,U,T)$ → accordé, avec consommation.
4. Rejeu de $A$ (statut) → renvoie le statut, pas de 2ᵉ consommation.
5. $C=T, E=T$ → accès ordinaire préféré, jeton intact.

### Tests négatifs

1. $(T,T,U,T,T)$ → **refusé** (P02 doit échouer ici).
2. $(F,T,F,F,T)$ → **refusé** (P03 doit échouer ici).
3. $R=U$ → jamais d'autorisation (U ≠ T).
4. P06 : deux requêtes concurrentes → une seule consomme ; l'autre refusée.
5. P07 : rejeu de **résultat** après révocation → **refusé**.
6. P05 : faits de révisions différentes → $U$ + défaut de preuve signalé.

### Limites de la compilation frontend/backend

- **Le contrôle fini (243 cas) ne prouve pas l'équivalence de trace** : il faut la séparation décision/effet (Q3).
- **Le frontend ne peut pas certifier seul** : il dépend de la fraîcheur des faits (Q4) ; une signature valide sur une révision périmée reste dangereuse.
- **Le cache n'est pas une autorisation** : il ne peut pas court-circuiter la révocation (Q5).
- **La concurrence exige un point de linéarisation** côté backend (CAS) ; le frontend ne peut pas garantir l'usage unique.
- **Non déterminé** : le comportement sur des domaines de faits plus riches que $\{T,F,U\}$, et la latence/cohérence du snapshot sous charge réelle.

---

## Synthèse : établi / réfuté / non déterminé

| Affirmation | Statut |
|---|---|
| Référence autorise 5/243 combinaisons | **Établi** (énumération) |
| `(expr) IS TRUE` préserve la décision (0 divergence) | **Établi** |
| P02 sur-autorise 5 cas (tous $R=U$) | **Établi** |
| P03 sur-autorise 78 cas (dont 27 $R=U$) | **Établi** |
| P04 : commutativité de `OR` invalide sur les traces | **Établi** (R07) |
| Séparation décision/consommation préserve la sûreté | **Établi** (invariants vérifiés) |
| Équivalence de **trace** par le test fini | **Réfuté** |
| Cache d'idempotence = exception à la révocation | **Réfuté** (R06) |
| Comportement hors domaine $\{T,F,U\}$ | **Non déterminé** |

**Conclusion.** Le compilateur ne doit jamais transformer $U$ en $F$ (P02), ni sortir $E$ de la conjonction (P03), ni évaluer un effet comme opérande d'un `OR` (P04). La correction repose sur trois invariants : **décision pure sur une vue cohérente**, **consommation atomique conditionnée**, **re-vérification de lecture au rejeu**. Le contrôle fini sur 243 cas est nécessaire mais **non suffisant** : il valide la valeur, pas la trace, la fraîcheur ni la concurrence.