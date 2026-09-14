# SIII-03 — Le bassin aux deux souverains

Score: 87.0 % (certificats 0/0, juge 87/100)

Certificats manqués: aucun

Toutes les exigences sont couvertes. Rédigeons la réponse finale.

---

# RÉPONSE FINALE

## Résultats exacts demandés

### Q1 — Plus grand sous-ensemble sûr avec politique robuste

**W = SAFE \ {(3,0)}**, soit **8 états** :
```
W = {(1,0),(1,1),(1,2),(2,0),(2,1),(2,2),(3,1),(3,2)}
```
**Actions admissibles** (les deux successeurs r∈{0,1} doivent être sûrs) :

| État | Action admissible | Successeurs |
|---|---|---|
| (1,0) | CHARGE | (1,1),(2,1) |
| (1,1) | CHARGE | (1,2),(2,2) |
| (1,2) | CHARGE | (1,2),(2,2) |
| (2,0) | CHARGE | (2,1),(3,1) |
| (2,1) | CHARGE | (2,2),(3,2) |
| (2,2) | CHARGE | (2,2),(3,2) |
| (3,1) | POMPE | (1,0),(2,0) |
| (3,2) | POMPE | (1,1),(2,1) |
| **(3,0)** | **aucune** | — |

**Politique témoin** : CHARGE si h≤2, POMPE si h=3 (b≥1).

**Preuve de maximalité** (deux méthodes indépendantes) :
1. **Plus grand point fixe** : élimination itérative des états perdants (aucune action dont *tous* les successeurs survivent). Seul (3,0) est éliminé — il n'a aucune action admissible (b=0 interdit POMPE, et CHARGE depuis h=3 peut donner (4,2)).
2. **Énumération exhaustive** : recherche du sous-ensemble robuste de cardinal maximal sur les 2⁹ = 512 sous-ensembles de SAFE → maximum atteint à |W|=8, unique.

Vérification de fermeture : pour tout s∈W, la politique témoin mène à deux successeurs dans W (0 violation).

### Q2 — Analyse des pièces

**P01 (rejeu) — dangereux.** (3,2) —POMPE,r=0→ (1,1). Le rejeu de POMPE depuis (1,1) donne (−1,0) ou (0,0), tous deux hors SAFE (h<1). L'automate actuel (R05) ne compare pas le cycle → il peut appliquer la commande au cycle suivant. **Réfuté comme sûr.**

**P03 (observation ambiguë) — aucune action unique sûre.** Observation {(1,1),(3,1)} :
- CHARGE sur (3,1) avec r=1 → (4,2) : débordement.
- POMPE sur (1,1) → (−1,0)/(0,0) : violation écologique.
- Intersection des actions admissibles = **∅**.

**Réponse à la question posée** : *non*, une politique sûre à observation complète **ne reste pas sûre** sous l'observation de P03. Démonstration directe (sans nom de théorème) : les deux états exigent des actions *opposées* (CHARGE pour (1,1), POMPE pour (3,1)), et chacune des deux actions viole la sûreté sur l'état où elle n'est pas requise. Toute action unique échoue sur au moins un état possible → il faut soit attendre l'information, soit une action de repli sûre pour les deux (inexistante ici).

**P04 (figer en coupant la pompe) — réfuté.** Dans R02, arrêter la pompe = CHARGE. Contre-exemple : (3,2) —CHARGE,r=1→ (4,2) ∉ SAFE. Figer n'est pas « toujours sûr » : depuis h=3, CHARGE peut déborder. **Réfuté.**

**P05 (branche saine) — sûr.** (2,0), cloud isolé, politique locale préautorisée = politique témoin. Robuste pour toute suite de r (64/64 suites sur 6 pas vérifiées exhaustivement). CHARGE → (2,1)/(3,1), puis POMPE en h=3 → retour dans W. **Établi.**

### Q3 — Interface de commande cloud/automate

**Enveloppe de commande** (champs) :
```
{ mandate: e,            # mandat croissant, infalsifiable (R04)
  cycle: seq,            # numéro durable de cycle visé (R03)
  op_id: uuid,           # identité d'opération unique
  content_hash: H(action, e, seq, op_id),  # empreinte de contenu
  action: CHARGE|POMPE,
  signature: Sig_cloud(...) }
```
**Réponse de l'automate** : `{op_id, cycle, mandate_installed, accepted|rejected, reason}` — reçu durable.

**Traitement du redémarrage** : le registre durable de mandat et le journal d'opérations survivent au redémarrage (R06). Au boot, l'automate recharge `mandate_installed` et l'ensemble des `op_id` déjà vus.

**Barrière d'exclusion d'un ancien mandat** : un ancien mandat e' est *réellement exclu* à partir de l'instant où l'automate a **durablement installé** un mandat e > e' (transition atomique, R06). Règle : rejeter toute commande dont `mandate < mandate_installed`. La barrière est **locale à l'automate**, pas au coordinateur.

### Q4 — P02 réalisable ?

**Réfuté avec les contrats disponibles (R04+R05).** Trois niveaux à distinguer :
1. **Révocation au coordinateur** : possible (émettre 12 après 11), mais R04 précise qu'un certificat authentique ne prouve pas que l'automate a installé le mandat.
2. **Installation à l'automate** : R05 → l'automate ne compare ni mandat ni cycle et oublie sa mémoire au redémarrage. Une commande 11 peut donc agir après l'élection de 12.
3. **Autorisation d'une action déjà engagée** : si l'effet physique et son reçu forment une transition atomique (R06), une action déjà engagée ne peut être annulée rétroactivement.

**Conclusion** : P02 est **irréalisable** sous R04+R05 ; il devient réalisable **seulement** en appliquant R06 (registre durable de mandat + rejet de tout mandat < installé, sérialisé aux frontières de cycle).

### Q5 — P06 : authenticité ≠ fraîcheur ≠ sûreté

- **Authenticité** : le certificat de mandat 12 est valide → la commande est authentique.
- **Fraîcheur** : la mesure (1,1) date du cycle 40, la commande vise le cycle 44 ; aucune preuve du niveau au cycle 44. La mesure est **périmée**.
- **Sûreté** : POMPE depuis (1,1) → (−1,0)/(0,0) ∉ SAFE. La commande est **dangereuse**.

**Décision** : rejeter la commande. L'authenticité du mandat ne confère ni fraîcheur ni sûreté.

**Architecture cloud utile, filtre local souverain** :
- Le cloud émet des *intentions* (mandat, cycle, action, justification) — jamais une autorisation de sûreté.
- Le **filtre de sûreté local** (R07) est exécuté à chaque cycle, souverain, non désactivable par le cloud : il vérifie (a) mandat installé ≥ mandat commande, (b) cycle courant = cycle visé, (c) action admissible depuis l'état physique local fiable, (d) les deux successeurs sûrs.
- Le cloud ne peut qu'*informer* ; il ne peut pas forcer une action dangereuse.

### Q6 — Preuve composée, tests exhaustifs, limites

**Preuve composée** :
1. Modèle fini : 9 états × 2 actions × 2 valeurs r, entièrement énuméré.
2. W = plus grand point fixe robuste, confirmé par énumération exhaustive des 512 sous-ensembles.
3. Politique témoin vérifiée fermée sur W (0 violation).
4. P05 : 64/64 suites r sûres depuis (2,0).
5. P03 : intersection vide → impossibilité d'action unique.
6. P04 : contre-exemple (3,2)→(4,2).

**Limites / impossibilités** :
- Le modèle est **fictif, discret**, sans dynamique intra-cycle (R03) : aucune garantie à l'intérieur d'un cycle.
- **(3,0) est irrécupérable** : aucune action admissible → hors W.
- **P03** : aucune action unique n'est sûre sous observation partielle → il faut attendre l'information ou disposer d'une action de repli (inexistante).
- **P02** : impossible sans R06 ; la barrière dépend de l'installation durable locale, pas de la révocation cloud.
- **P04** : « figer » n'est pas universellement sûr (débordement possible depuis h=3).
- Sans l'hypothèse d'atomicité effet/reçu (R06), un effet physique inconnu doit être traité comme tel (état possible supplémentaire).

## Pièges traités
- **Plus petit vs plus grand point fixe** : le jeu de sûreté exige le *plus grand* point fixe (coinduction) ; le plus petit donne W=∅ à tort.
- **Action admissible vs action définie** : une action dont un successeur sort de SAFE n'est pas admissible (piège du `all()` sur liste vide).
- **Arrêter ≠ neutre** : dans R02, couper la pompe = CHARGE, qui peut déborder.
- **Authenticité ≠ fraîcheur ≠ sûreté** : trois propriétés indépendantes (P06).
- **Observation partielle** : la sûreté à observation complète ne se transporte pas (P03).
- **Rejeu** : l'absence de comparaison de cycle (R05) rend le rejeu dangereux (P01).

## Distinction épistémique
- **Établi** : W (Q1), P05 sûr, P03 sans action unique, P04 réfuté, P01 dangereux, P06 rejet.
- **Réfuté** : P02 sous R04+R05 ; P04 comme invariant universel.
- **Non déterminé** : comportement intra-cycle (R03) ; effet physique si l'atomicité R06 n'est pas garantie.