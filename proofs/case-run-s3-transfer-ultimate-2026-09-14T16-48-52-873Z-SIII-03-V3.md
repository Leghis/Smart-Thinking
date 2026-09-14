# SIII-03-V3 — SIII-03 → Barrière installée et reçu historique

Score: 84.0 % (certificats 0/0, juge 84/100)

Certificats manqués: aucun

The audit flags Q3/Q4/Q5/Q6 as design questions (no numeric certificate needed — they're architectural). I have all the computational results. Let me write the final answer.

## Réponse

**Q1 — Plus grand sous-ensemble sûr avec politique robuste.**

$$W = \{(1,0),(1,1),(1,2),(2,0),(2,1),(2,2),(3,1),(3,2)\},\quad |W|=8.$$

Seul l'état **(3,0)** est exclu. Actions admissibles (les deux successeurs r=0 et r=1 doivent être sûrs **et** rester dans W) :

| État | Action robuste unique | Successeurs (r=0 / r=1) |
|---|---|---|
| (1,0) | CHARGE | (1,1) / (2,1) |
| (1,1) | CHARGE | (1,2) / (2,2) |
| (1,2) | CHARGE | (1,2) / (2,2) |
| (2,0) | CHARGE | (2,1) / (3,1) |
| (2,1) | CHARGE | (2,2) / (3,2) |
| (2,2) | CHARGE | (2,2) / (3,2) |
| (3,1) | **POMPE** | (1,0) / (2,0) |
| (3,2) | **POMPE** | (1,1) / (2,1) |

La politique est **déterministe et unique** : CHARGE partout sauf en h=3 où POMPE est la seule action robuste. C'est une politique *statique sans mémoire* — l'état (h,b) suffit.

**Q2 — Analyse des pièces.**

- **P01 (rejeu).** (3,2) → POMPE, r=0 → (1,1). Le rejeu de la *même* commande au cycle suivant, appliqué depuis (1,1), donne (−1,0) ou (0,0) : **h<1, violation écologique**. Le rejeu n'est pas seulement une double écriture : il produit un état dangereux. L'automate actuel (R05) l'applique car il ne compare ni mandat ni cycle et a oublié son identifiant au redémarrage.
- **P03 (observation ambiguë).** Observation = {(1,1),(3,1)}. **Aucune action unique n'est robustement sûre** : CHARGE échoue sur (3,1) avec r=1 → (4,2) (débordement) ; POMPE échoue sur (1,1) avec r=0 → (−1,0) (assèchement). C'est une **impossibilité structurelle**, pas un défaut de politique.
- **P04 (tout figer).** **Faux.** « Couper la pompe » = CHARGE (R02). Depuis (3,1) ou (3,2), CHARGE avec r=1 mène à (4,·) : le débordement. Figer n'est pas sûr ; c'est même l'action qui *cause* le débordement en h=3. La sûreté exige au contraire d'**activer** POMPE en h=3.
- **P05 (branche saine).** Depuis (2,0), cloud isolé : la politique locale « CHARGE si h≤2, POMPE si h=3 » est **sûre pour toute suite de r** (BFS : aucune violation, tous les états atteints restent dans W). La politique préautorisée fonctionne sans cloud.

**Réponse à la question centrale de Q2 :** une politique sûre à observation complète **ne reste pas sûre** sous l'observation de P03. La raison n'est pas un théorème abstrait mais un **conflit d'action local** : les deux états candidats exigent des actions *opposées* (CHARGE pour h=1, POMPE pour h=3), et chaque action est fatale pour l'autre état sous une perturbation admissible. L'observation partielle détruit l'information nécessaire au choix.

**Q3 — Interface de commande cloud/automate.**

Champ de commande : `(mandat e, cycle seq, op_id, empreinte H(contenu), action, réponse)`. Règles :
1. **Registre durable de mandat** : l'automate n'accepte que `e ≥ e_installé` ; toute commande `e < e_installé` est rejetée.
2. **Journal d'opérations** : `op_id` déjà vu → rejet (déduplication, survit au redémarrage).
3. **Liaison cycle** : la commande doit cibler le cycle courant `seq` ; une commande d'un cycle passé est rejetée (R03).
4. **Empreinte de contenu** : `H` détecte toute altération ; la réponse signée renvoie `(op_id, e, seq, résultat)`.
5. **Redémarrage** : recharger registre + journal depuis le stockage durable *avant* d'accepter toute commande.

**Barrière** : l'instant où le mandat 12 est **durablement installé** dans le registre de l'automate. À partir de là, tout `e ≤ 11` est exclu par comparaison de mandat — indépendamment de la validité cryptographique du certificat 11.

**Q4 — P02 réalisable ?**

**Non, pas avec les seuls contrats R04/R05.** Trois niveaux à distinguer :
- **Révocation au coordinateur** : le cloud peut émettre 12 après 11 (R04), mais cela n'arrête pas l'ancien processus.
- **Installation à l'automate** : tant que 12 n'est pas *durablement installé*, l'automate ne peut pas comparer et accepte 11. Pendant la partition, l'installation est impossible.
- **Autorisation d'une action déjà engagée** : une commande 11 déjà reçue et en cours d'exécution ne peut pas être rétroactivement annulée.

Le cahier commercial (« aucune commande 11 dès l'élection de 12, même en partition ») est **irréalisable** sans le registre durable de R06. Avec R06 (registre durable + sérialisation aux frontières de cycle), la barrière devient effective : l'installation de 12 précède toute acceptation, et 11 est exclu. **La réalisabilité dépend donc entièrement de l'adoption de R06.**

**Q5 — P06 : authenticité ≠ fraîcheur ≠ sécurité.**

- **Authentique** : le certificat de mandat 12 est valide (vrai).
- **Frais** : la mesure (1,1) date du cycle 40 ; la commande vise le cycle 44. **Aucune preuve du niveau au cycle 44** → la mesure n'est pas fraîche.
- **Sûr** : POMPE depuis (1,1) est **dangereux** (P01 : → (−1,0)/(0,0)). La commande est donc **insécuritaire**, malgré un certificat authentique.

**Architecture utile** : le cloud fournit *intention* et *mandat* ; le **filtre local souverain** (R07) valide chaque action contre l'état physique local *courant* et les limites R02. Le cloud ne peut pas désactiver ce filtre. Une mesure ancienne ne peut jamais justifier une action : seule la lecture locale au cycle courant fait foi.

**Q6 — Preuve composée, tests exhaustifs, limites.**

- **Preuve composée** : (i) W est le plus grand point fixe du jeu de sûreté (calculé par itération) ; (ii) l'énumération exhaustive des 2⁹ politiques confirme que 8 états est le maximum couvrable ; (iii) la politique locale de P05 atteint exactement W.
- **Tests exhaustifs** : 9 états × 2 actions × 2 valeurs de r = 36 transitions vérifiées ; 512 politiques énumérées.
- **Limites** : le modèle est fictif (avertissement de périmètre) ; la sûreté *intra-cycle* n'est pas garantie (R03) ; sans R06, P02 est irréalisable ; P03 est une impossibilité, pas un défaut de conception.

---

## Preuves et certificats

**Q1 — maximalité.** Deux méthodes indépendantes :
1. *Point fixe* : W₀ = tous les états sûrs ; on retire tout état sans action dont les deux successeurs restent dans W. Convergence à W (8 états), (3,0) retiré.
2. *Énumération exhaustive* : les 2⁹ = 512 politiques sont testées par BFS ; le maximum d'états couverts par une politique sûre est **8**, et l'ensemble optimal est exactement W.

**Exclusion de (3,0)** : CHARGE avec r=1 → (4,1) ∉ sûr ; POMPE indisponible (b=0). Aucune action robuste → exclu. *(compute : `(3,0) CHARGE r=1 → (4,1) sûr? False`)*

**Q2/P03 — impossibilité.** Énumération complète :
- CHARGE : (1,1)→(1,2)/(2,2) ✓ ; (3,1)→(3,2)/(4,2) ✗ (r=1).
- POMPE : (1,1)→(−1,0)/(0,0) ✗ (r=0) ; (3,1)→(1,0)/(2,0) ✓.
Chaque action échoue sur un état → aucune action unique robuste.

**Q2/P05 — sûreté.** BFS sous la politique locale : aucune violation, états atteints = W entier.

**Q2/P01 — rejeu.** (1,1) POMPE r=0 → (−1,0) ; r=1 → (0,0). Les deux violent h≥1.

---

## Pièges traités

- **Identification partielle (P03)** : on ne produit pas une action « ponctuelle » ; on **prouve l'impossibilité** d'une action unique robuste. C'est une borne exacte (∅ d'actions admissibles), pas une valeur non identifiée.
- **Hypothèses explicitées** : exclusion (les deux successeurs doivent être sûrs), monotonie (r libre, sans obligation d'alterner), instrument (capteurs locaux fiables vs indisponibles). Énoncées avant tout calcul.
- **Indicateur imparfait vs variable réelle** : la mesure du cycle 40 (P06) est traitée séparément de l'état réel au cycle 44 ; authenticité ≠ fraîcheur ≠ sûreté.
- **Cohérence des probabilités / contraintes** : ici déterministe ; les contraintes de sûreté (h∈{1,2,3}, b∈{0,1,2}) sont vérifiées sur **chaque** transition, y compris les deux branches r=0 et r=1.
- **Piège « figer = sûr » (P04)** : explicitement réfuté — figer (CHARGE) en h=3 provoque le débordement.
- **Piège « certificat valide = action sûre » (P06)** : réfuté — POMPE depuis (1,1) est dangereux malgré un mandat authentique.

---

## Limites / impossibilités

1. **P03 est une impossibilité structurelle** : aucune action unique n'est robustement sûre pour {(1,1),(3,1)}. Il faut soit lever l'ambiguïté (information), soit disposer d'une action supplémentaire (interdite par R02/R07).
2. **P02 est irréalisable sans R06** : la révocation au coordinateur ne suffit pas ; seule l'installation durable du mandat à l'automate crée la barrière. Pendant une partition, l'ancien mandat reste accepté.
3. **Sûreté intra-cycle non garantie** (R03) : le modèle ne couvre que les frontières de cycle.
4. **Modèle fictif** : aucune valeur déployable sur une installation hydraulique réelle (avertissement de périmètre).

---

## VARIANTE — Distinguer les réponses permises

**Contexte** : mandat 12 **installé durablement** ; une **nouvelle** opération de mandat 11 arrive ; puis un **rejeu identique** d'une opération 11 **exécutée avant la barrière**.

Les deux commandes portent le mandat 11, mais elles sont **distinctes** et doivent être traitées par des mécanismes différents :

| Cas | Nature | Mécanisme de rejet | Réponse permise |
|---|---|---|---|
| **Nouvelle opération 11** (op_id inédit) | Mandat périmé | **Comparaison de mandat** : `11 < 12` installé | **REJET** — motif « mandat périmé » |
| **Rejeu d'une op 11 pré-barrière** (op_id déjà journalisé) | Duplicata | **Déduplication** : op_id déjà dans le journal | **REJET** — motif « opération déjà exécutée » |

**Distinction essentielle :**
- La **nouvelle** opération 11 est rejetée parce que son **mandat est inférieur** au mandat installé (12). Même si son op_id était neuf, elle échoue à la barrière de mandat.
- Le **rejeu** est rejeté parce que son **op_id a déjà été vu** — *indépendamment* du mandat. C'est le journal d'opérations qui le bloque, pas la comparaison de mandat.

**Pourquoi les deux mécanismes sont nécessaires :**
- Le **registre de mandat** seul ne suffit pas : il rejette bien la nouvelle op 11, mais un rejeu d'une op 11 *antérieure à la barrière* pourrait, dans un automate sans journal, être rejoué si l'id était oublié au redémarrage (R05). Le registre de mandat ne détecte pas la duplication.
- Le **journal d'opérations** seul ne suffit pas : il rejette le rejeu, mais une *nouvelle* op 11 (op_id inédit) passerait la déduplication et serait exécutée — violation de la barrière.

**Réponses permises (formellement) :**
1. **Nouvelle op 11** → `REJECT(mandat_périmé)` : `e=11 < e_installé=12`.
2. **Rejeu op 11 pré-barrière** → `REJECT(opération_déjà_exécutée)` : `op_id ∈ journal`.
3. **Cas limite** : une op 11 *jamais exécutée* mais dont l'op_id coïncide avec une op 11 pré-barrière → rejetée par déduplication (conservateur, sûr).
4. **Aucune** commande de mandat 11 n'est **acceptée** : la barrière (installation durable de 12) est franchie, donc tout `e ≤ 11` est exclu, que l'opération soit nouvelle ou rejouée.

**Conclusion de la variante** : les deux commandes sont rejetées, mais par **deux garde-fous orthogonaux** — la barrière de mandat (péremption) et le journal d'opérations (duplication). Un automate qui n'aurait que l'un des deux laisserait passer l'un des deux cas. La sûreté exige **les deux**, sérialisés aux frontières de cycle (R06), avec rechargement du registre et du journal avant toute acceptation après redémarrage.
## Réponse finale — synthèse

### Résultats exacts

**Q1 — Plus grand sous-ensemble sûr (politique robuste).**

$$W = \{(1,0),(1,1),(1,2),(2,0),(2,1),(2,2),(3,1),(3,2)\},\qquad |W| = 8,\qquad \text{exclu} = \{(3,0)\}.$$

Politique robuste **unique et sans mémoire** : `CHARGE` en tout état sauf `h=3`, où `POMPE` est la seule action admissible.

| État | Action | r=0 | r=1 |
|---|---|---|---|
| (1,0) | CHARGE | (1,1) | (2,1) |
| (1,1) | CHARGE | (1,2) | (2,2) |
| (1,2) | CHARGE | (1,2) | (2,2) |
| (2,0) | CHARGE | (2,1) | (3,1) |
| (2,1) | CHARGE | (2,2) | (3,2) |
| (2,2) | CHARGE | (2,2) | (3,2) |
| (3,1) | POMPE | (1,0) | (2,0) |
| (3,2) | POMPE | (1,1) | (2,1) |

**Q2 — Pièces.**
- **P01** : rejeu de POMPE depuis (1,1) → (−1,0) ou (0,0) : **dangereux** (h<1).
- **P03** : **aucune action unique robuste** pour {(1,1),(3,1)} — impossibilité structurelle.
- **P04** : « tout figer » = CHARGE → **faux**, provoque le débordement en h=3.
- **P05** : politique locale « CHARGE si h≤2, POMPE si h=3 » **sûre** depuis (2,0), cloud isolé.
- **Observation complète → partielle** : la sûreté **ne se conserve pas** (conflit d'action local, pas un théorème).

**Q3 — Interface.** Commande = `(mandat e, cycle seq, op_id, H(contenu), action, réponse)`. Barrière = **installation durable du mandat** dans le registre de l'automate ; au-delà, tout `e ≤ e_installé` est exclu.

**Q4 — P02.** **Irréalisable** avec R04/R05 seuls ; **réalisable** avec R06 (registre durable + sérialisation aux frontières de cycle). Distinguer : révocation (coordinateur) ≠ installation (automate) ≠ autorisation d'une action engagée.

**Q5 — P06.** Authentique ✓, frais ✗ (mesure cycle 40 pour cycle 44), sûr ✗ (POMPE depuis (1,1) dangereux). Le **filtre local souverain** (R07) tranche sur l'état courant ; le cloud ne peut pas le désactiver.

**Q6 — Preuve composée.** Point fixe + énumération exhaustive des 512 politiques → max = 8 états = W. 36 transitions vérifiées.

**Variante.** Nouvelle op 11 → `REJECT(mandat_périmé)` ; rejeu op 11 pré-barrière → `REJECT(opération_déjà_exécutée)`. Deux garde-fous **orthogonaux** (barrière de mandat + journal d'opérations), tous deux nécessaires.

### Certificats

| Résultat | Méthode | Preuve |
|---|---|---|
| W, \|W\|=8, exclu (3,0) | Point fixe du jeu de sûreté | Itération convergée |
| Maximalité de W | Énumération exhaustive 2⁹ politiques | Max couvert = 8 = W |
| (3,0) exclu | Énumération transitions | CHARGE r=1 → (4,1) ∉ sûr ; POMPE indispo |
| P03 impossibilité | 2 actions × 2 états × 2 r | CHARGE échoue (3,1) r=1 ; POMPE échoue (1,1) r=0 |
| P01 rejeu | R02 direct | (1,1) POMPE → (−1,0)/(0,0) |
| P05 sûreté | BFS états atteignables | 0 violation, atteints = W |

### Pièges traités

1. **Identification partielle (P03)** → borne exacte (∅ d'actions), pas de valeur ponctuelle inventée.
2. **Hypothèses explicitées** avant calcul : exclusion, r libre, fiabilité des capteurs.
3. **Indicateur imparfait vs variable réelle** : mesure cycle 40 ≠ état cycle 44.
4. **Cohérence des contraintes** : h∈{1,2,3}, b∈{0,1,2} vérifiées sur **chaque** branche r=0 et r=1.
5. **« Figer = sûr » (P04)** réfuté ; **« certificat valide = action sûre » (P06)** réfuté.

### Limites / impossibilités

1. **P03** : impossibilité structurelle — aucune action unique robuste ; il faut de l'information ou une action supplémentaire (interdite par R02/R07).
2. **P02** : irréalisable sans R06 ; la révocation au coordinateur ne crée pas la barrière.
3. **Sûreté intra-cycle non garantie** (R03) : le modèle ne couvre que les frontières de cycle.
4. **Modèle fictif** : aucune valeur déployable sur une installation hydraulique réelle.

**Conclusion.** La sûreté ne se réduit ni à empêcher deux écritures (P01 : le rejeu crée un état dangereux), ni à un certificat valide (P06 : authenticité ≠ fraîcheur ≠ sûreté), ni à figer la pompe (P04 : figer déborde). Elle exige : (i) une politique robuste sur W, (ii) un filtre local souverain sur l'état courant, (iii) une barrière de mandat **et** un journal d'opérations, sérialisés aux frontières de cycle.