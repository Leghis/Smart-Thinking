# SIII-01-V1 — SIII-01 → La garde ne change plus

Score: 100.0 % (certificats 0/0, juge 100/100)

Certificats manqués: aucun

Le contre-exemple est couvert par le claim 1. Je rédige la réponse finale.

## Réponse

**Non. La preuve d'exclusion des admissions concurrentes ne reste pas valide.**

En remplaçant `UPDATE guard` par une **lecture verrouillée** (`SELECT ... FOR UPDATE`) d'une ligne `guard` **jamais modifiée**, on supprime le seul mécanisme qui, sous l'isolation par instantané de R02, sérialisait réellement les admissions : le **conflit d'écriture**. Le verrou de lecture sérialise l'*accès* à la section critique, mais — R02 le stipule explicitement — « un simple verrou sans modification ne renouvelle pas l'instantané ». La transaction qui acquiert le verrou en second continue donc de lire un **instantané figé** et ne voit pas les réservations committées par la première. Résultat : deux admissions peuvent valider, laissant **zéro** véhicule READY, ce qui viole R01.

**Contre-exemple exact (P01 modifié) :**

| Étape | TA | TB | État global |
|---|---|---|---|
| 0 | instantané S_A : B1=READY, B2=READY | instantané S_B : B1=READY, B2=READY | B1=READY, B2=READY |
| 1 | `SELECT guard FOR UPDATE` → acquiert le verrou | `SELECT guard FOR UPDATE` → **bloque** | inchangé |
| 2 | lit B1=READY (S_A), réserve B1, outbox `dispatch-MA`, **COMMIT**, relâche le verrou | — | B1=RESERVED, B2=READY |
| 3 | — | débloque, acquiert le verrou ; lit **S_B figé** → B1=READY, B2=READY (ne voit pas la réservation de TA) | inchangé |
| 4 | — | réserve **B2**, outbox `dispatch-MB`, **COMMIT** | **B1=RESERVED, B2=RESERVED** |

Les deux transactions modifient des lignes **distinctes** (TA : bus B1, mission MA, outbox MA ; TB : bus B2, mission MB, outbox MB) → aucun conflit d'écriture → les deux valident. La contrainte unique « une mission active par bus » passe (bus différents). **R01 est violé : aucun bus READY.**

## Preuves et certificats

**1. Énumération exhaustive des entrelacements** (outil `compute`). J'ai modélisé les deux modes sur les 2 permutations possibles de {TA, TB}, en supposant le pire cas où la seconde transaction choisit un bus *différent* de la première (ce qu'elle peut faire, ne voyant pas la réservation) :

```
nolock (conflit d'écriture, correctif de base) :
   (TA,TB) -> TA commit B1, TB abort_wc   -> {B1:RESERVED, B2:READY}  R01_ok=True
   (TB,TA) -> TB commit B1, TA abort_wc   -> {B1:RESERVED, B2:READY}  R01_ok=True
lock (variante, SELECT FOR UPDATE) :
   (TA,TB) -> TA commit B1, TB commit B2  -> {B1:RESERVED, B2:RESERVED} R01_ok=False
   (TB,TA) -> TB commit B2, TA commit B1  -> {B1:RESERVED, B2:RESERVED} R01_ok=False
```

Dans **toutes** les permutations, la variante viole R01 ; le correctif de base ne le viole jamais.

**2. Analyse sémantique (seconde méthode, indépendante du modèle).** Deux mécanismes d'exclusion sont à distinguer :

- **Correctif de base — `UPDATE guard SET version=version+1`** : la sérialisation repose sur le **conflit d'écriture**. R02 : « si elles modifient la même ligne depuis des instantanés concurrents, au moins une est annulée ». Toute paire d'admissions concurrentes écrit `guard` → write-write conflict → **au plus une valide**. Preuve valide, indépendante de l'ordre d'arrivée.
- **Variante — `SELECT ... FOR UPDATE` sur `guard` non modifiée** : aucun conflit d'écriture n'est créé (la ligne n'est jamais écrite). Le moteur d'isolation par instantané n'a donc **aucun signal** pour annuler l'une des deux transactions. La seule barrière serait le verrou lui-même, mais R02 précise qu'il **ne renouvelle pas l'instantané** : la section critique est mutuellement exclusive *dans le temps*, mais opère sur un **état périmé**. L'exclusion temporelle ne suffit pas ; il faudrait que la relecture de l'état des bus soit à jour, ce que R02 interdit.

Les deux méthodes convergent : **la barrière d'isolation a disparu**.

**3. Certificats enregistrés** (ledger) : claim-291d88b9 (contre-exemple, confiance 0.95) et claim-035f3f59 (comparaison UPDATE vs verrou, confiance 0.95). Audit : 2/2 affirmations avec méthode et preuve, aucune contradiction.

## Pièges traités

- **Cohérence instantanée vs sérialisabilité.** Le verrou donne une *exclusion temporelle* (les sections critiques ne se chevauchent pas), mais **pas** un ordre sérialisable : l'ordre d'exécution TA→TB n'est pas équivalent à une exécution sérielle, car TB lit un état antérieur à TA. C'est précisément la distinction que la variante confond. Un ordre sérialisable explicite exigerait que TB observe l'écriture de TA — impossible avec l'instantané figé.
- **Explorer tous les témoins, pas seulement les cycles courts.** J'ai énuméré les **deux** permutations et le pire cas de choix de bus (B2 au lieu de B1), pas seulement le cas où les deux visent le même bus (qui, lui, produirait un conflit d'écriture et masquerait le défaut).
- **Effet externe irréversible.** Le `dispatch-MA`/`dispatch-MB` écrit dans l'outbox est livré au moins une fois (R04) ; un rollback ultérieur ne rappelle pas un bus déjà parti. Ici, les deux commits sont durables : les deux départs sont engagés, aucun rollback ne les annule.
- **Ne pas confondre exactly-once, fencing, idempotence, autorisation.** Le verrou de lecture n'est ni un *fencing token* (il n'invalide pas les écritures d'une génération antérieure), ni une *autorisation* durable. Il ne garantit pas non plus l'exactly-once du départ. La variante ne fournit aucune de ces propriétés.

## Limites / impossibilités

- **Ce qui est démontré :** sous R02 tel que spécifié (instantané fixe, verrou sans modification ne rafraîchissant pas l'instantané), la variante **ne garantit pas** l'exclusion mutuelle des admissions ; le contre-exemple est un témoin valide et R01 est violé.
- **Ce qui n'est pas démontré / dépend du moteur :** si un moteur particulier implémentait `SELECT ... FOR UPDATE` de façon à *forcer une relecture à jour* (read committed au niveau de la ligne verrouillée), l'exclusion pourrait être rétablie — mais cela **contredirait R02**, qui pose l'instantané fixe et l'absence de rafraîchissement par simple verrou. La conclusion vaut donc **sous les hypothèses de R02**, pas pour tout SGBD réel.
- **Correctif minimal préservant la preuve :** conserver une **écriture** sur `guard` (incrément de `version`, ou écriture d'un jeton de génération) afin de recréer le conflit d'écriture détectable par l'isolation. Une lecture verrouillée seule est insuffisante. Alternativement, une contrainte d'exclusion ou un verrou consultatif *transactionnel* couplé à une relecture à jour de l'état des bus serait nécessaire — mais cela modifie R02 et doit être explicité comme hypothèse supplémentaire.
- **Non couvert :** la variante ne traite ni P04 (course d'annulation), ni P05 (mondes hors ligne), ni les priorités R07 ; ces points restent régis par le dossier de base et ne sont pas affectés par ce changement, mais ils ne sont pas re-démontrés ici.