# SIII-01-V1 — SIII-01 → La garde ne change plus

Score: 100.0 % (certificats 0/0, juge 100/100)

Certificats manqués: aucun

Tout est certifié. Je rédige la réponse finale.

---

# Réponse à la variante

## Réponse directe

**Non. La preuve d'exclusion des admissions concurrentes ne reste pas valide.**

Remplacer `UPDATE guard` par une **lecture verrouillée** (`SELECT ... FOR UPDATE`) de la ligne `guard`, **jamais modifiée**, tout en **conservant l'instantané fixe de R02**, détruit exactement le mécanisme sur lequel reposait l'exclusion. Le scénario P01 redevient un **write skew** : TA et TB valident toutes les deux, et l'invariant R01 (« au moins un véhicule READY après chaque transaction validée ») est violé.

C'est le piège central du dossier : **confondre cohérence d'instantané et sérialisabilité**. Un verrou qui sérialise *l'accès* ne sérialise pas *les lectures métier* tant qu'aucune écriture ne force l'annulation.

---

## 1. Pourquoi la preuve du dossier de base tenait (rappel)

Dans le correctif de référence, la transaction d'admission fait :

```
UPDATE guard SET version = version + 1 WHERE sector = :s;   -- écriture
```

Sous isolation par instantané (R02), cette écriture crée un **conflit write-write** : si une transaction concurrente a modifié `guard` depuis l'instantané de la nôtre, le moteur **annule** l'une des deux (R02 : « si elles modifient la même ligne depuis des instantanés concurrents, au moins une est annulée »). L'annulation supprime *toutes* les écritures, y compris l'outbox. La preuve d'exclusion reposait donc sur **trois piliers** :

1. **Un point de sérialisation écrit** (`guard`) que *toutes* les admissions touchent en écriture ;
2. **Un conflit détectable** (write-write) qui annule une transaction perdante ;
3. **L'invariant R01 testé dans la section critique**, sur des données cohérentes avec l'instantané qui a produit le conflit.

Le modèle exécutable le confirme :

```
A) UPDATE guard : ('COMMIT','B1') ('ABORT','conflit guard')  -> commits: 1
```

---

## 2. Ce que la variante change — et pourquoi elle casse

La variante remplace l'écriture par :

```
SELECT version FROM guard WHERE sector = :s FOR UPDATE;   -- lecture seule, guard jamais modifiée
```

### 2.1 Le verrou sérialise l'accès, mais ne crée aucun conflit

Sous isolation par instantané, `SELECT ... FOR UPDATE` **fait bien attendre** la transaction concurrente (documentation PostgreSQL 13.2 : *« the repeatable read transaction will wait for the first updating transaction to commit or roll back »*). Mais après l'attente, le moteur ne relit **que la ligne verrouillée** (EvalPlanQual). Or :

- `guard` **n'est jamais modifiée** → la relecture renvoie la même valeur, et surtout **aucun conflit write-write n'est levé** ;
- les tables métier (`bus`, `mission`) restent lues dans **l'instantané fixe** de chaque transaction (R02 conservé).

Résultat : TA entre dans la section critique, lit `B1=READY` dans son instantané, réserve B1, valide. TB attend le verrou, entre à son tour, mais **relit `B1` dans son propre instantané périmé** — il voit encore `B1=READY` et `B2=READY`. Comme TA et TB modifient des **lignes distinctes** (B1 vs B2), aucune contrainte unique ne bloque, et `guard` n'étant jamais écrite, **rien n'annule TB**.

```
B) FOR UPDATE   : ('COMMIT','B1') ('COMMIT','B2')  -> commits: 2
```

**Deux admissions valident → les deux bus sont RESERVED → zéro véhicule READY → R01 violé.**

### 2.2 La raison profonde : R01 est un invariant de cardinalité

Même en supposant une relecture fraîche des données métier, un verrou sur **une seule ligne** ne suffirait pas à lui seul : R01 est un **invariant d'ensemble** (« au moins un des deux bus reste READY »), pas une contrainte d'unicité sur une ligne. R03 le dit explicitement : *« une contrainte unique interdit deux missions actives sur un même bus, mais ne porte pas sur le nombre de bus READY »*. Un verrou de ligne ne peut garantir un invariant de comptage que si le protocole **teste cet invariant dans la section critique sur des données fraîches** — ce que l'instantané fixe interdit précisément.

### 2.3 Le point décisif : « un verrou sans modification ne renouvelle pas l'instantané »

R02 l'énonce noir sur blanc. C'est la clause qui condamne la variante : le verrou ne rafraîchit pas la vue métier, donc la sérialisation de l'accès est **inerte** du point de vue de la détection de conflit. La variante transforme un protocole correct en un protocole qui *sérialise l'ordre d'exécution sans sérialiser les décisions*.

---

## 3. Preuve formelle de l'échec (contre-exemple P01)

| Étape | TA | TB |
|---|---|---|
| Début | instantané S₀ : B1=READY, B2=READY | instantané S₀ : B1=READY, B2=READY |
| Verrou | `FOR UPDATE guard` (acquiert) | `FOR UPDATE guard` (attend) |
| Lecture métier | B1=READY (S₀) | — |
| Écriture | B1←RESERVED, mission MA, outbox dispatch-MA | — |
| Commit | ✅ (guard non écrite → pas de conflit) | — |
| Verrou libéré | — | acquiert, **relit guard (inchangée)** |
| Lecture métier | — | B2=READY (**S₀ périmé**) |
| Écriture | — | B2←RESERVED, mission MB, outbox dispatch-MB |
| Commit | — | ✅ (lignes distinctes, guard non écrite) |

**Ordre sériel compatible : aucun.** Un ordre TA→TB exigerait que TB voie B1=RESERVED ; un ordre TB→TA exigerait que TA voie B2=RESERVED. Aucun des deux n'est satisfait. C'est un **cycle de dépendances rw** (TA lit B1, TB écrit B1 ; TB lit B2, TA écrit B2) que l'isolation par instantané **ne détecte pas** sans SSI. La preuve d'exclusion est donc **fausse** dans la variante.

---

## 4. Conditions de restauration de la preuve

Pour que l'exclusion redevienne valide, il faut **au moins une** des trois conditions suivantes :

| Option | Mécanisme | Compatible avec la variante ? |
|---|---|---|
| **(a) Écrire sur `guard`** | `UPDATE guard SET version=version+1` → conflit write-write → annulation d'une transaction | ❌ C'est précisément ce que la variante supprime |
| **(b) Passer en SERIALIZABLE (SSI)** | Détection de la dépendance rw (TA lit bus, TB écrit bus) → annulation | ✅ Mais change le niveau d'isolation (R02 parle d'instantané) |
| **(c) Relecture fraîche + test de cardinalité** | Relire `bus` dans un instantané neuf après le verrou, tester « ≥1 READY » dans la section critique | ❌ Interdit : la variante **conserve l'instantané fixe** |

**Conclusion :** la variante, telle que spécifiée (lecture verrouillée + instantané fixe conservé), **n'active aucune** de ces conditions. Elle est donc **incorrecte**. La seule façon de garder une lecture verrouillée *et* l'exclusion serait de renoncer à l'instantané fixe (option c) ou de changer de niveau d'isolation (option b) — deux modifications que l'énoncé exclut.

---

## 5. Conséquences sur le reste du dossier

- **Q2 (admission correcte)** : le pseudo-code doit conserver l'**écriture** sur `guard` (ou SSI). La frontière de reprise après conflit reste : *relire l'état métier dans un instantané frais, réévaluer l'invariant R01, réémettre avec la même identité de demande* (idempotence via `command_id`).
- **Q3–Q6** : inchangés dans leur logique, mais la preuve de sûreté de Q6 **ne peut plus invoquer le verrou de `guard`** comme point de sérialisation ; elle doit invoquer le conflit write-write (ou SSI). La variante **affaiblit** la preuve de sûreté sans rien apporter en échange.
- **R08 (progrès)** : la variante ne bloque pas le progrès (les deux admissions réussissent), mais elle **viole la sûreté** — le pire des deux mondes, car elle donne l'illusion d'une sérialisation.

---

## Pièges traités

- **Snapshot ≠ sérialisable** : un verrou de ligne sans écriture ne crée pas de dépendance détectable ; l'instantané fixe empêche la relecture métier. *(piège central)*
- **Invariant de cardinalité vs contrainte de ligne** : R01 n'est pas couvert par la contrainte unique de R03.
- **Verrou ≠ autorisation** : sérialiser l'accès n'autorise pas la décision si les données lues sont périmées.
- **Effet externe non annulé** : même si une transaction était annulée, l'outbox déjà livrée ne serait pas rappelée (R02/R04) — la variante aggrave ce risque en n'annulant rien.

## Limites / ce que la preuve ne démontre pas

- Le contre-exemple suppose le comportement standard de l'isolation par instantané (MVCC) décrit en R02 ; un moteur à verrous stricts (2PL) se comporterait différemment, mais R02 fixe le modèle.
- La démonstration porte sur l'**exclusion des admissions** ; elle ne rejuge pas les autres propriétés (retour, idempotence de la passerelle), qui restent régies par R04–R05.
- Elle ne prouve pas qu'aucune variante à lecture verrouillée ne peut fonctionner : elle prouve que **celle-ci**, avec instantané fixe conservé, échoue.