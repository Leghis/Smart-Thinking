# SIII-03 — Le bassin aux deux souverains

Score: 100.0 % (certificats 0/0, juge 100/100)

Certificats manqués: aucun

Tous les certificats sont enregistrés. Je rédige maintenant la réponse finale complète.

## Réponse

### Q1 — Plus grand ensemble sûr contrôlable

**Résultat exact.** L'ensemble sûr est S = {1,2,3}×{0,1,2} (9 états). Le plus grand sous-ensemble depuis lequel une politique garde la sûreté pour **toute** suite de perturbations r∈{0,1} est :

**W = S \ {(3,0)} = {(1,0),(1,1),(1,2),(2,0),(2,1),(2,2),(3,1),(3,2)}**, de cardinal **8**.

**Actions admissibles (gardant les deux successeurs dans W) :**

| État | Action | Successeurs (r=0, r=1) |
|---|---|---|
| (1,0) | CHARGE | (1,1),(2,1) |
| (1,1) | CHARGE | (1,2),(2,2) |
| (1,2) | CHARGE | (1,2),(2,2) |
| (2,0) | CHARGE | (2,1),(3,1) |
| (2,1) | CHARGE | (2,2),(3,2) |
| (2,2) | CHARGE | (2,2),(3,2) |
| (3,1) | POMPE | (1,0),(2,0) |
| (3,2) | POMPE | (1,1),(2,1) |

**Politique statique témoin :** CHARGE si h≤2, POMPE si h=3 (b≥1). Elle est sûre sur tout W.

### Q2 — Analyse de P01, P03, P04, P05

**P01 (rejeu) — danger établi.** Depuis (3,2), POMPE avec r=0 donne (1,1). Après redémarrage, la même commande rejouée depuis (1,1) donne (−1,0) ou (0,0) : **hors de l'ensemble sûr** (h<1 viole la contrainte écologique). L'automate actuel (R05) ne compare ni mandat ni cycle et oublie sa mémoire au redémarrage → il **peut** appliquer ce rejeu. Le rejeu n'est pas idempotent ici : c'est un contre-exemple direct à « rejouer une commande est inoffensif ».

**P03 (observation ambiguë) — non résolvable en sûreté.** États possibles {(1,1),(3,1)}, une seule action, aucune information supplémentaire.
- CHARGE : (1,1)→(1,2),(2,2) sûrs ; mais (3,1)→(3,2),(4,2) — **(4,2) hors S** (débordement).
- POMPE : (3,1)→(1,0),(2,0) sûrs ; mais (1,1)→(−1,0),(0,0) — **hors S**.

**Aucune action unique n'est sûre pour les deux états.** Une politique sûre à observation complète (qui choisirait CHARGE sur (1,1) et POMPE sur (3,1)) **ne reste pas sûre** sous l'observation de P03 : la perte d'information détruit la contrôlabilité. Ce n'est pas un argument d'autorité : c'est l'échec explicite des deux seules actions sur les deux états, vérifié par énumération.

**P04 (« tout figer en coupant la pompe est toujours sûr ») — réfuté.** « Couper la pompe » = CHARGE (R02 : éteindre la pompe a les mêmes effets que CHARGE). Or CHARGE depuis (3,0) avec r=1 donne (4,1) : **débordement**. Plus généralement, CHARGE depuis (3,1) ou (3,2) avec r=1 sort de S. Donc figer n'est **pas** toujours sûr : c'est précisément pourquoi (3,0) est exclu de W. La proposition confond « ne pas pomper » et « rester sûr ».

**P05 (branche saine) — établi.** État initial (2,0) ∈ W, cloud isolé, politique locale préautorisée. La politique statique (CHARGE si h≤2, POMPE si h=3) est sûre sur tout W ; simulation exhaustive des 2⁶=64 suites r de longueur 6 depuis (2,0) : **0 suite dangereuse**. La sûreté est maintenue sans cloud, sans promesse d'optimalité de niveau.

### Q3 — Interface de commande cloud/automate

**Enveloppe de commande (champs obligatoires) :**
- `mandat` : numéro de bail strictement croissant (R04).
- `cycle` : numéro durable de cycle visé (R03).
- `op_id` : identité d'opération unique (anti-rejeu).
- `empreinte` : hash du contenu (action + paramètres + cycle + mandat) — lie le contenu à l'identité.
- `signature` : authentifie l'émetteur et scelle les champs ci-dessus.
- `réponse` : accusé durable (reçu) renvoyé au coordinateur.

**Règles d'acceptation à l'automate (R06) :**
1. Signature valide **et** `mandat ≥ mandat_installé` (registre durable).
2. `cycle == cycle_courant` (rejet de tout cycle passé/futur).
3. `op_id` absent du journal durable (anti-rejeu persistant, survit au redémarrage).
4. Filtre de sûreté local exécuté à chaque cycle, **souverain** : il peut refuser une commande cloud qui violerait R02, mais ne peut pas inventer une troisième action (R07).

**Barrière d'exclusion d'un ancien mandat.** Un ancien mandat e est **réellement exclu** à partir de l'instant où le **registre durable de mandat** de l'automate a installé e' > e, **et** que cette installation est sérialisée à la frontière de cycle (R06). Tant que l'installation n'est pas durable, l'automate ne peut pas distinguer un chef légitime d'un ancien : la barrière est **l'installation durable**, pas l'émission du certificat.

### Q4 — P02 réalisable ?

**Non, pas avec les seuls contrats disponibles — et il faut distinguer trois niveaux :**

1. **Révocation au coordinateur** : le cloud peut émettre 12 après 11 sans arrêter l'ancien (R04). C'est fait, mais cela ne contraint pas l'automate.
2. **Installation à l'automate** : l'automate n'a reçu que 11. Une commande signée 11 arrive **avant** toute installation locale de 12. Avec R05 (pas de registre durable, pas de comparaison de mandat), l'automate **accepte** la commande 11 → **P02 est réalisable au sens dangereux** : une commande 11 agit après l'élection de 12.
3. **Autorisation d'une action déjà engagée** : une action 11 déjà acceptée et en cours d'effet physique ne peut pas être « dé-engagée » rétroactivement ; seule l'hypothèse d'atomicité effet+reçu (R06) permet de raisonner proprement.

**Conclusion :** le cahier commercial (« aucune commande 11 ne peut agir dès l'élection de 12, même en partition ») est **irréalisable** avec R04+R05 seuls. Il devient réalisable **seulement** avec le registre durable de mandat (R06) : l'automate rejette toute commande dont `mandat < mandat_installé`. Mais en partition, si 12 n'est pas encore installé, l'automate ne peut pas savoir que 12 existe → **impossibilité fondamentale** : sans borne sur le délai (R04), on ne peut pas garantir l'exclusion d'un mandat non encore installé. La seule garantie possible est **locale et monotone** : une fois 12 installé durablement, 11 est exclu pour toujours.

### Q5 — P06 : authenticité ≠ fraîcheur ≠ sécurité

**Diagnostic.** La mesure (1,1) date du cycle 40 ; la commande 12 demande POMPE pour le cycle 44 en citant la mesure 40. Le certificat de chef est **authentique** (valide), mais :
- **Authenticité** : prouve seulement qui a émis, pas quand ni sur quel état.
- **Fraîcheur** : non prouvée — la mesure 40 peut être périmée au cycle 44 (R04 : un certificat ne prouve pas la fraîcheur).
- **Sécurité** : POMPE depuis (1,1) donne (−1,0)/(0,0) → **dangereux** (cf. P01). La justification par la mesure 40 est donc **invalide** : elle applique une action sûre pour un état périmé à un état courant inconnu.

**Architecture cloud utile, filtre local souverain :**
- Le cloud émet des **préférences** (objectifs de niveau), jamais des ordres de sûreté.
- Chaque commande porte `cycle` + `empreinte` + `mandat` ; l'automate **rejette** toute commande dont le cycle ne correspond pas au cycle courant (R03).
- Le **filtre local** (R07) reste souverain : il valide l'action contre l'état physique local fiable (R06) et refuse toute action violant R02, indépendamment du cloud.
- La mesure cloud est traitée comme **indice**, jamais comme autorisation : elle ne peut pas lever une contrainte de sûreté locale.

### Q6 — Preuve composée, tests exhaustifs, limites

**Preuve composée (sûreté en présence de deux chefs).** Soit W l'ensemble de Q1. Hypothèses : (H1) registre durable de mandat installé et sérialisé aux frontières de cycle ; (H2) atomicité effet+reçu (R06) ; (H3) filtre local souverain exécuté chaque cycle. Alors :
1. **Invariant local** : si l'état ∈ W au début d'un cycle, le filtre local choisit une action admissible (Q1) → les deux successeurs ∈ W. Donc l'état reste dans W quel que soit r.
2. **Exclusion des anciens chefs** : par (H1), toute commande de mandat < mandat_installé est rejetée ; par (H2), aucun effet physique orphelin ne subsiste.
3. **Composition** : le filtre local étant souverain (H3), même une commande cloud authentique mais dangereuse (P06) est refusée. La sûreté ne dépend donc **pas** de la coordination cloud.

**Tests exhaustifs (modèle fini) :** énumération des 9 états × 2 actions × 2 valeurs de r ; point fixe de pré-image contrôlée ; énumération exhaustive de **tous** les sous-ensembles invariants (k=1..9) confirmant qu'aucun ne contient (3,0) ; simulation des 64 suites r de longueur 6 depuis (2,0) → 0 danger.

**Exécution utile :** politique statique CHARGE/POMPE, sûre sur W, déployable localement sans cloud.

**Limites / impossibilités :**
- **P03** : non résolvable en sûreté (information insuffisante) — impossibilité établie.
- **P02** : exclusion d'un mandat non encore installé impossible sans borne de délai (R04) — impossibilité établie.
- **P04** : « figer = sûr » réfuté par contre-exemple (3,0)+CHARGE+r=1.
- Le modèle est **fictif** (avertissement de périmètre) ; les outils sont simulés, aucune action réelle.

## Preuves et certificats

- **Q1** : point fixe `W invariant=True` ; énumération exhaustive de tous les sous-ensembles invariants → aucun ne contient (3,0). Preuve directe : depuis (3,0), seule CHARGE est possible (b=0), et r=1 donne (4,1)∉S. Donc (3,0) n'appartient à aucun ensemble invariant → W est **maximal** (unique plus grand).
- **P01** : (3,2)·POMPE·r=0 → (1,1) ; (1,1)·POMPE → (−1,0)/(0,0) ∉ S.
- **P03** : (3,1)·CHARGE → (3,2),(4,2) ; (1,1)·POMPE → (−1,0),(0,0). Échec des deux actions.
- **P05** : politique statique sûre sur W ; 0/64 suites dangereuses.
- **P06** : POMPE depuis (1,1) dangereux (même calcul que P01).

## Pièges traités

- **Identification partielle** : P03 ne donne **pas** de valeur ponctuelle mais une **impossibilité** (aucune action sûre) — borne exacte, pas de choix arbitraire.
- **Hypothèses explicitées** : exclusion (mandat monotone), monotonie (registre durable), instrument (capteurs locaux fiables en P05, indisponibles en P03) — posées avant tout calcul.
- **Indicateur imparfait vs variable réelle** : la mesure cloud (P06) est traitée comme indice, distincte de l'état physique local ; authenticité ≠ fraîcheur ≠ sécurité.
- **Cohérence des probabilités/contraintes** : r∈{0,1} libre, les **deux** successeurs doivent être sûrs (pas de moyenne) ; b∈{0,1,2} respecté ; pas de saturation artificielle (R01).
- **Rejeu** : non idempotent (P01) → nécessite `op_id` durable + `cycle`.
- **Fencing** : barrière = installation durable, pas émission du certificat.

## Limites / impossibilités

- **Établi** : W (cardinal 8), politique statique sûre, danger du rejeu, échec de P03, réfutation de P04, sûreté de P05.
- **Réfuté** : P04 (« figer toujours sûr »), P02 réalisable avec R04+R05 seuls.
- **Non déterminé / impossible** : P03 (sûreté impossible), P02 (exclusion d'un mandat non installé impossible sans borne de délai), fraîcheur de la mesure 40 au cycle 44 (non prouvable).
- **Hors périmètre** : modèle fictif, outils simulés — aucune garantie pour une installation hydraulique réelle.