# SIII-03-V1 — SIII-03 → La mesure devient exacte

Score: 100.0 % (certificats 0/0, juge 100/100)

Certificats manqués: aucun

Tous les certificats sont en place. Je rédige la réponse finale.

---

# Réponse — Variante : mesure locale exacte (1,1) au cycle courant

**Réponse directe à la question posée : Non, l'absence d'action sûre ne persiste pas.** Avec une mesure locale exacte `(1,1)`, l'action **CHARGE** est sûre (ses deux successeurs `(1,2)` et `(2,2)` restent dans l'ensemble sûr), et `(1,1)` appartient au noyau robuste `W` : la sûreté peut donc être maintenue indéfiniment. Le blocage du dossier de base était un artefact d'**ambiguïté d'observation**, non une propriété intrinsèque de l'état.

---

## Q1 — Plus grand sous-ensemble sûr et actions admissibles

**Résultat exact.** Le plus grand sous-ensemble `W ⊆ {1,2,3}×{0,1,2}` depuis lequel une politique garde la sûreté pour **toute** suite de `r ∈ {0,1}` est :

$$W = \{(1,0),(1,1),(1,2),(2,0),(2,1),(2,2),(3,1),(3,2)\}, \qquad |W| = 8.$$

**Seul état exclu : `(3,0)`.**

**Actions admissibles (robustes, c.-à-d. dont les deux successeurs restent dans `W`) :**

| État | Action admissible |
|---|---|
| `(1,0),(1,1),(1,2)` | CHARGE |
| `(2,0),(2,1),(2,2)` | CHARGE |
| `(3,1),(3,2)` | POMPE |

**Preuve de maximalité.**
- *`(3,0)` est hors de `W`.* En `(3,0)`, `b=0` donc POMPE est indisponible (R02). La seule action est CHARGE, qui donne `(3+r, 1)`. Pour `r=1` : `(4,1)`, avec `h=4>3` → débordement. Aucune action n'a ses deux successeurs sûrs : `(3,0)` n'est pas robuste.
- *Les 8 autres états sont dans `W`.* Chacun possède une action dont les deux successeurs sont sûrs **et** restent dans `W` (vérifié par énumération) : CHARGE depuis `h∈{1,2}` donne `h'∈{1,2,3}` et `b'∈{1,2}` ; POMPE depuis `h=3, b∈{1,2}` donne `h'∈{1,2}` et `b'∈{0,1}`. Le point fixe du noyau converge donc exactement sur ces 8 états.
- *Maximalité.* Tout sur-ensemble strict contiendrait `(3,0)`, qui n'admet aucune action robuste ; toute politique y viole la sûreté pour une perturbation admissible. Donc `W` est le plus grand.

**Certificat :** énumération exhaustive des 9 états × 2 actions × 2 valeurs de `r` + itération du noyau (outil `compute`).

---

## Q2 — Analyse de P01, P03 (variante), P04, P05

### P01 — Rejeu
État `(3,2)`, POMPE avec `r=0` → `(1,1)`. Après redémarrage, la même commande rejouée au cycle suivant avec `r=0` donnerait `(1,1)→(-1,0)` : **violation écologique** (`h<1`). L'automate actuel (R05) ne compare ni mandat ni cycle et oublie sa mémoire d'identifiants au redémarrage : le rejeu est donc **effectivement dangereux**. Correctif : identité d'opération durable + numéro de cycle lié à la commande (Q3).

### P03 (variante) — Mesure exacte `(1,1)`
- Depuis `(1,1)` : **CHARGE** → `(1,2)` ou `(2,2)`, tous deux sûrs et dans `W`. **POMPE** → `(-1,0)` ou `(0,0)`, tous deux violant `h≥1`.
- **Il existe une action sûre : CHARGE.** Et comme `(1,1) ∈ W`, la politique robuste (CHARGE tant que `h≤2`) maintient la sûreté indéfiniment.

**Contraste avec le dossier de base.** Avec l'observation ambiguë `{(1,1),(3,1)}` : CHARGE est sûre pour `(1,1)` mais pas pour `(3,1)` (où `r=1` donne `(4,2)`) ; POMPE est sûre pour `(3,1)` mais pas pour `(1,1)`. Aucune action unique n'est sûre pour les deux états → **pas d'action sûre**. La variante lève précisément cette ambiguïté.

### P04 — « Tout figer en coupant la pompe est toujours sûr »
**Faux.** « Couper la pompe » = CHARGE (R02 : éteindre la pompe a les mêmes effets que CHARGE). Depuis `(3,1)` ou `(3,2)`, CHARGE avec `r=1` donne `h=4` → **débordement**. Donc figer n'est pas toujours sûr ; c'est même l'action *dangereuse* dans les états de niveau haut. La sûreté exige POMPE quand `h=3`, CHARGE quand `h≤2`.

### P05 — Branche saine, cloud isolé
État initial `(2,0) ∈ W`. Politique locale préautorisée : **CHARGE si `h≤2`, POMPE si `h=3`**. Test exhaustif : **0 violation sur les 256 suites** `r∈{0,1}^8`. La politique reste dans `W` pour toute perturbation, sans cloud, sans promesse d'optimalité. Conforme à R07 (autorité locale, pas de troisième action).

### La politique sûre à observation complète reste-t-elle sûre sous l'observation de P03 ?
**Dans le dossier de base : non.** Une politique à observation complète choisit l'action selon l'état réel. Sous l'observation ambiguë `{(1,1),(3,1)}`, le contrôleur doit émettre **une seule** action pour deux états possibles. Or les actions sûres y sont **disjointes** (CHARGE pour `(1,1)`, POMPE pour `(3,1)`). Toute action unique est donc dangereuse pour l'un des deux états : la sûreté à observation complète **ne se transporte pas** à l'observation partielle. Ce n'est pas un simple appel à un théorème : c'est le fait que l'intersection des ensembles d'actions sûres sur les états compatibles est **vide**.

**Dans la variante : oui.** L'observation exacte `(1,1)` rend l'ensemble des états compatibles un singleton ; l'intersection des actions sûres est `{CHARGE}`, non vide. La politique robuste s'applique directement.

---

## Q3 — Interface de commande cloud/automate

**Champs de la commande (signée) :**
1. `mandat` (entier strictement croissant, R04) ;
2. `cycle` (`seq` cible, R03) ;
3. `op_id` (identité d'opération unique, durable) ;
4. `empreinte` (hash du contenu : action + paramètres + `cycle` + `mandat`) ;
5. `action` ∈ {CHARGE, POMPE} ;
6. `signature` (infalsifiable).

**Réponse de l'automate :** `{op_id, cycle, mandat_installé, statut ∈ {APPLIQUÉ, REJETÉ_PÉRIMÉ, REJETÉ_REJEU, REJETÉ_FILTRE}, reçu_durable}`.

**Règles d'acceptation (R05→R06) :**
- signature valide **et** `empreinte` cohérente ;
- `mandat ≥ mandat_installé` (registre durable) ;
- `cycle == seq` courant (une commande d'un ancien cycle ne devient jamais une commande du cycle courant) ;
- `op_id` non déjà journalisé (journal durable, survit au redémarrage) ;
- **filtre de sûreté local** (R07) exécuté à chaque cycle, souverain.

**Barrière d'exclusion d'un ancien mandat.** L'ancien mandat est *réellement* exclu à partir du moment où le **registre durable de mandat** de l'automate a installé le nouveau mandat, **sérialisé aux frontières de cycle** (R06). Tant que l'installation n'a pas eu lieu, une commande d'ancien mandat peut encore être acceptée : la révocation au coordinateur (émission de 12) ne suffit pas. La barrière est donc **l'installation locale durable**, pas l'élection cloud.

**Redémarrage.** Le registre de mandat et le journal d'opérations sont durables ; au redémarrage, l'automate recharge `mandat_installé` et les `op_id` vus. Sous l'hypothèse R06 (effet + reçu = transition atomique), un effet physique sans reçu est traité comme **inconnu** et bloque l'action jusqu'à réconciliation.

---

## Q4 — P02 est-il réalisable ?

**Non, pas tel quel.** Le cahier commercial exige qu'aucune commande 11 ne puisse agir **dès l'instant de l'élection de 12**, même pendant une partition. Or R04 dit qu'un certificat authentique ne prouve ni la fraîcheur ni l'installation locale, et que les délais/pauses ne sont pas bornés. Trois niveaux à distinguer :

1. **Révocation au coordinateur** : le cloud cesse d'émettre du 11 et émet 12. *Fait, mais insuffisant* : le processus ancien vit encore et ses commandes retardées circulent.
2. **Installation à l'automate** : l'automate n'accepte que `mandat ≥ mandat_installé`. *C'est la seule barrière effective*, mais elle n'est franchie qu'à l'installation durable — qui peut être retardée par la partition.
3. **Autorisation d'une action déjà engagée** : une commande 11 signée avant l'élection, en vol, peut atteindre l'automate avant l'installation de 12. Elle est alors acceptée.

**Conclusion.** L'exigence « dès l'instant de l'élection » est **irréalisable** avec les seuls contrats R04–R05 : il existe une fenêtre non bornée entre l'élection cloud et l'installation locale. Pour la fermer, il faudrait soit borner le délai (interdit par R04), soit que l'automate **rejette toute commande dont le mandat n'est pas le plus récent connu localement** — ce qui n'est possible qu'après installation. La garantie atteignable est : *aucune commande 11 n'agit après l'installation de 12*, pas *dès l'élection de 12*.

---

## Q5 — P06 : authenticité ≠ fraîcheur ≠ sécurité

**Faits.** Mesure `(1,1)` du cycle 40 ; commande mandat 12 demandant POMPE pour le cycle 44, citant la mesure 40 ; certificat valide ; aucune preuve du niveau au cycle 44.

**Décomposition :**
- **Authenticité** : le certificat de mandat 12 est valide → le *mandat* est authentique. Cela ne dit rien sur la mesure.
- **Fraîcheur** : la mesure date du cycle 40, la commande vise le cycle 44 → **4 cycles d'écart**. La mesure est périmée ; rien ne prouve que le niveau au cycle 44 soit encore `(1,1)`.
- **Sécurité** : POMPE depuis `(1,1)` est **dangereuse** (→ `h<1`). Si l'état réel au cycle 44 est `(1,1)`, appliquer POMPE viole la contrainte écologique. La justification par une mesure périmée est **invalide**.

**Architecture cloud utile, filtre local souverain :**
- Le cloud émet des **intentions** (préférences), jamais des ordres contraignants sur la sûreté.
- Chaque commande porte `cycle` cible + `empreinte` de la mesure utilisée ; l'automate **rejette** toute commande dont la mesure justificative n'est pas du cycle courant (fraîcheur vérifiée localement).
- Le **filtre de sûreté local** (R07) reste souverain : il peut **refuser** POMPE même si le mandat 12 est valide et authentique. Les préférences cloud ne peuvent pas le désactiver.
- En cas de mesure périmée ou absente : l'automate applique la politique robuste locale (`CHARGE si h≤2, POMPE si h=3`) sur son état physique fiable (R06), ou, si l'état est inconnu, traite l'effet comme inconnu et bloque.

Ainsi, authenticité (mandat), fraîcheur (cycle) et sûreté (filtre local) sont **trois contrôles indépendants** ; aucun ne se substitue aux autres.

---

## Q6 — Preuve composée, tests exhaustifs, exécution, limites

**Preuve composée.**
1. *Noyau (Q1)* : point fixe `W` = 8 états, `(3,0)` exclu (aucune action robuste). Maximalité par argument de sur-ensemble.
2. *Robustesse* : pour chaque état de `W`, l'action admissible a ses deux successeurs dans `W` → invariant inductif : si l'état est dans `W`, il y reste pour tout `r`.
3. *Variante P03* : `(1,1) ∈ W` et CHARGE y est robuste → existence d'une action sûre **et** maintien indéfini.
4. *P05* : politique locale = point 2 restreint à `(2,0)`.

**Tests exhaustifs (modèle fini).**
- 9 états × 2 actions × 2 valeurs de `r` : énumération complète des transitions.
- Noyau : itération jusqu'à point fixe.
- P05 : **256 suites** `r∈{0,1}^8` depuis `(2,0)` → **0 violation**.
- P03 variante : successeurs de `(1,1)` et `(3,1)` énumérés → CHARGE sûre en `(1,1)`, POMPE sûre en `(3,1)`.

**Exécution utile.** La politique robuste `CHARGE si h≤2, POMPE si h=3` est directement déployable comme filtre local préautorisé (R07), fonctionnant sans cloud, dans les limites de R02.

**Limites.**
- Le modèle est **fictif** (avertissement de périmètre) : aucune valeur déployable sur une installation réelle.
- La sûreté est garantie **aux frontières de cycle** seulement ; R03 ne garantit rien à l'intérieur d'un cycle.
- L'atomicité effet+reçu (R06) est une **hypothèse** ; sans elle, un effet physique inconnu doit être traité comme tel (blocage).
- P02 : la garantie « dès l'élection » est **irréalisable** ; seule « après installation locale » est atteignable.
- La variante suppose la mesure locale **exacte et fraîche** ; si elle redevient ambiguë ou périmée, on retombe sur le cas P03 de base (pas d'action sûre) ou sur P06 (mesure périmée).

---

## Synthèse de la variante

| | Dossier de base (P03 ambigu) | Variante (P03 exact `(1,1)`) |
|---|---|---|
| États compatibles | `{(1,1),(3,1)}` | `{(1,1)}` |
| Action sûre unique | **aucune** | **CHARGE** |
| `(1,1) ∈ W` ? | oui | oui |
| Sûreté maintenable ? | non (blocage) | **oui** (CHARGE → `W`) |

**L'absence d'action sûre ne persiste pas** : elle était causée par l'ambiguïté d'observation, non par l'état lui-même. Dès que la mesure locale est exacte, CHARGE restaure une action sûre et la politique robuste garantit la sûreté pour toute suite de perturbations.