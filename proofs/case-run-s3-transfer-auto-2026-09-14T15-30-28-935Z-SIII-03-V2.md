# SIII-03-V2 — SIII-03 → Aucune arrivée d’eau

Score: 87.0 % (certificats 0/0, juge 87/100)

Certificats manqués: aucun

Tous les claims sont certifiés. Je peux maintenant rédiger la réponse finale.

---

# Variante r ∈ {0} — Recalcul du domaine gagnant

## Cadre du recalcul

**Hypothèse modifiée (unique) :** l'ensemble des perturbations passe de {0,1} à **{0}**. Tout le reste du dossier de base est conservé : ensemble sûr `S = {1,2,3} × {0,1,2}` (9 états), actions CHARGE/POMPE, dynamique R02, contrats R03–R07.

**Dynamique effective avec r = 0 :**

| Action | Condition | Transition |
|---|---|---|
| CHARGE | toujours | `h' = h`, `b' = min(2, b+1)` |
| POMPE | `b ≥ 1` | `h' = h − 2`, `b' = b − 1` |

Le point crucial : **r = 0 supprime le seul terme qui pouvait faire sortir h de l'intervalle sûr par le haut**. CHARGE ne modifie plus h du tout, et POMPE le fait baisser de 2 exactement.

---

## Q1 — Domaine gagnant (recalculé)

### Résultat

$$\boxed{W = S = \{(1,0),(1,1),(1,2),(2,0),(2,1),(2,2),(3,0),(3,1),(3,2)\}}$$

**Le domaine gagnant est l'ensemble sûr tout entier : 9 états sur 9.**

### Actions admissibles par état

| État | CHARGE | POMPE |
|---|---|---|
| (1,0) | ✔ → (1,1) | indisponible (b=0) |
| (1,1) | ✔ → (1,2) | ✘ → (−1,0) hors S |
| (1,2) | ✔ → (1,2) | ✘ → (−1,1) hors S |
| (2,0) | ✔ → (2,1) | indisponible |
| (2,1) | ✔ → (2,2) | ✘ → (0,0) hors S |
| (2,2) | ✔ → (2,2) | ✘ → (0,1) hors S |
| (3,0) | ✔ → (3,1) | indisponible |
| (3,1) | ✔ → (3,2) | ✔ → (1,0) |
| (3,2) | ✔ → (3,2) | ✔ → (1,1) |

**Règle de politique sûre :** CHARGE est admissible partout ; POMPE n'est admissible que depuis h = 3 (avec b ≥ 1).

### Preuve de maximalité

**1. W ⊆ S par construction** (on ne considère que des états sûrs).

**2. Tout état de S est gagnant.** Il suffit d'exhiber, pour chaque état, une action dont *tous* les successeurs restent dans S — ici un seul successeur puisque r = 0 est déterministe.

- **CHARGE est sûre depuis tout état de S.** En effet `h' = h ∈ {1,2,3}` (inchangé) et `b' = min(2, b+1) ∈ {0,1,2}`. Donc `(h', b') ∈ S` pour les 9 états. Vérification exhaustive : la liste des états d'où CHARGE est dangereuse est **vide**.
- La politique constante « CHARGE à chaque cycle » est donc sûre depuis n'importe quel état initial de S, pour toute suite de perturbations (ici la seule suite possible est 0,0,0,…).

**3. Aucun état hors de S n'est gagnant** (maximalité au sens strict). Les états hors S sont soit `h ≤ 0` (violation écologique), soit `h ≥ 4` (débordement), soit `b ∉ {0,1,2}`. Par R01, on ne sature pas artificiellement un niveau dangereux : un état hors S est déjà une violation, il n'est pas « récupérable ». Donc W ne peut pas dépasser S.

**Conclusion :** W = S, et c'est le plus grand ensemble possible. La maximalité est *triviale* ici parce que l'ensemble sûr est lui-même fermé sous CHARGE.

### Comparaison avec le dossier de base

| | Base (r ∈ {0,1}) | Variante (r = {0}) |
|---|---|---|
| Domaine gagnant | 8 états : S privé de **(3,0)** | **9 états : S entier** |
| CHARGE sûre depuis | h ∈ {1,2} seulement | **tout h** |
| État ajouté | — | **(3,0)** |

**Pourquoi (3,0) était exclu dans le dossier de base :** depuis (3,0), CHARGE mène à (3,1) ; l'adversaire choisit alors r = 1, donnant h' = 4 → débordement. POMPE est indisponible (b = 0). Aucune action ne protège contre r = 1. Avec r = 0, ce successeur devient (3,1) — sûr — et (3,0) entre dans le domaine gagnant.

**Interprétation :** la variante est *strictement plus permissive*. En supprimant la perturbation montante, on rend l'action CHARGE universellement sûre et on récupère l'état frontière (3,0). Le domaine gagnant coïncide désormais avec l'ensemble sûr.

---

## Q2 — Analyse des pièces (recalculée sous r = 0)

### P01 — Rejeu
État (3,2), POMPE avec r = 0 → (1,1). Après redémarrage, la même commande rejouée au cycle suivant avec r = 0 → (1,1) de nouveau. **Sous r = 0, le rejeu reste sûr en valeur** (les deux états sont dans S), mais il **corrompt la sémantique** : la pompe est actionnée deux fois pour un seul mandat. La sûreté de valeur ne dispense pas du fencing (Q3) : le rejeu viole R03 (« une commande pour un ancien cycle ne doit pas devenir une commande pour le cycle courant »). Le danger n'est plus le débordement mais l'**action fantôme** — un effet physique non désiré. Conclusion inchangée sur le fond : il faut un identifiant d'opération et un numéro de cycle.

### P03 — Mesure ambiguë
Observation : deux états possibles, **(1,1)** et **(3,1)**. Une seule action, sans nouvelle information.

- Depuis (1,1) : CHARGE → (1,2) ✔ ; POMPE → (−1,0) ✘.
- Depuis (3,1) : CHARGE → (3,2) ✔ ; POMPE → (1,0) ✔.

**Une politique sûre à observation complète reste-t-elle sûre sous l'observation partielle de P03 ?** **Non.**

Preuve directe (sans invoquer un nom de théorème) : considérons la politique à observation complète « POMPE si h = 3, sinon CHARGE ». Elle est sûre sur tout S (c'est la politique de Q1). Mais sous l'observation { (1,1), (3,1) }, l'agent ne sait pas dans lequel des deux états il se trouve. S'il choisit POMPE (correct pour (3,1)), il applique POMPE à (1,1) → (−1,0), **violation écologique**. S'il choisit CHARGE (correct pour (1,1)), il applique CHARGE à (3,1) → (3,2), qui est sûr — mais alors il n'exploite pas la possibilité de POMPE, et surtout **il ne peut pas garantir la sûreté pour l'état (1,1) s'il avait choisi POMPE**. 

Plus rigoureusement : l'action unique doit être sûre pour **tous** les états de l'ensemble d'information. CHARGE est sûre pour les deux états de P03 → **CHARGE est la seule action admissible**. POMPE est sûre pour (3,1) mais dangereuse pour (1,1) → interdite. Donc la politique sûre existe (CHARGE), mais elle **diffère** de la politique à observation complète, qui aurait pu choisir POMPE. La sûreté est préservée *parce que* CHARGE est universellement sûre sous r = 0 ; mais la politique optimale à observation complète n'est pas directement transposable. **Réponse : la politique à observation complète n'est pas sûre telle quelle sous l'observation partielle ; il faut la restreindre à l'intersection des actions sûres sur l'ensemble d'information.**

**Nuance importante liée à la variante :** sous r = 0, CHARGE étant sûre partout, l'ensemble d'information de P03 admet toujours une action sûre (CHARGE). Sous r ∈ {0,1}, CHARGE depuis (3,1) pouvait mener à (4,1) si r = 1 → l'ensemble d'information { (1,1), (3,1) } aurait été **perdant** (aucune action sûre pour les deux états simultanément). La variante **rend P03 soluble** là où le dossier de base le rendait insoluble.

### P04 — « Tout figer en coupant la pompe est toujours sûr »
**Faux, et la variante ne le corrige pas.** « Couper la pompe » = ne pas actionner POMPE. Mais R02 impose qu'**une et une seule action** est appliquée par cycle : ne pas pomper revient à CHARGE, qui **augmente b** (`b' = min(2, b+1)`). Sous r = 0, CHARGE ne fait pas monter h, donc elle est sûre — mais l'affirmation « figer = couper la pompe = toujours sûr » reste **conceptuellement fausse** : il n'existe pas d'action « ne rien faire ». La seule façon de « figer » est CHARGE, qui n'est pas neutre (elle charge la batterie). De plus, dans le dossier de base, CHARGE depuis h = 3 avec r = 1 provoquait un débordement : « figer » n'était donc **pas** toujours sûr. La variante rend CHARGE sûre partout, ce qui **masque** le contre-exemple sans valider le principe. **Verdict : proposition rejetée** — elle confond « absence d'action » et « action CHARGE », et elle est fausse en général (base).

### P05 — Branche saine
État initial (2,0), capteurs locaux fiables, cloud isolé indéfiniment, politique locale préautorisée (R07). Objectif : sûreté pour toute suite de r, sans optimalité.

Sous r = 0 : la politique locale « CHARGE à chaque cycle » maintient (2,0) → (2,1) → (2,2) → (2,2) → … **sûre indéfiniment**, sans cloud. C'est conforme à R07 (autorité locale, pas de troisième action). Sous r ∈ {0,1}, la même politique restait sûre depuis (2,0) car h = 2 et h+1 = 3 ∈ S. **P05 est sûr dans les deux cas** ; la variante ne change pas la conclusion mais simplifie la preuve (CHARGE universellement sûre).

---

## Q3 — Interface de commande cloud/automate

**Message de commande (signé) :**
```
{ mandate_id, cycle_seq, op_id, content_hash, action, signature }
```
- `mandate_id` : certificat de mandat (R04), strictement croissant.
- `cycle_seq` : numéro durable de cycle (R03) — la commande ne vaut que pour ce cycle.
- `op_id` : identifiant unique d'opération (anti-rejeu, P01).
- `content_hash` : empreinte du contenu (action + paramètres) — lie la signature au contenu exact.
- `action` : CHARGE ou POMPE uniquement.

**Réponse de l'automate :** `{ op_id, cycle_seq, mandate_id, status, receipt }` où `receipt` est le reçu durable de l'effet (R06 : effet + reçu = transition atomique).

**Traitement du redémarrage :** l'automate persiste (a) le mandat installé, (b) le journal des `op_id` vus, (c) l'état physique local. Au redémarrage, il recharge ces trois éléments ; un `op_id` déjà journalisé est rejeté (anti-rejeu), et le mandat installé est comparé au mandat de la commande.

**Barrière d'exclusion d'un ancien mandat :** un ancien mandat `m_old` est **réellement exclu** à partir du moment où l'automate a **durablement installé** un mandat `m_new > m_old` (registre durable, R06) **et** que toute commande est rejetée si `mandate_id < installed_mandate`. La barrière est donc **l'installation locale durable**, pas l'émission cloud. Tant que l'installation n'a pas eu lieu, l'automate ne peut pas distinguer un mandat périmé d'un mandat courant — c'est exactement le trou de P02.

---

## Q4 — P02 est-il réalisable ?

**Énoncé :** mandat 12 émis, automate n'a que 11, commande signée 11 arrive avant installation de 12. Le cahier exige qu'aucune commande 11 n'agisse dès l'élection de 12, même en partition.

**Décision : NON réalisable avec les contrats disponibles (R04, R05).**

Distinguons les trois niveaux :

1. **Révocation au coordinateur :** le cloud peut cesser d'émettre des commandes 11 et émettre 12. Mais R04 dit explicitement qu'il « peut délivrer e=12 après e=11 **sans arrêter le processus ancien** » et que « le délai des messages et la pause d'un processus ne sont pas bornés ». La révocation au coordinateur **n'atteint pas** l'automate pendant une partition.

2. **Installation à l'automate :** l'automate actuel (R05) « ne compare ni le mandat installé ni le cycle ». Il accepte toute commande à signature valide dont l'`id` n'a pas été vu. Une commande 11 signée valide est donc **acceptée**. L'installation de 12 n'a pas eu lieu → aucune barrière locale.

3. **Autorisation d'une action déjà engagée :** même si 12 était installé, une commande 11 déjà en vol et déjà « engagée » (reçue, en cours d'application) ne peut pas être rétroactivement annulée sans l'atomicité effet+reçu (R06). Sans cette hypothèse, il faut traiter l'effet physique comme inconnu.

**Conclusion :** l'exigence « aucune commande 11 dès l'élection de 12, même en partition » est **impossible** avec R04+R05 seuls. Elle devient réalisable **seulement** si l'on ajoute le registre durable de mandat (R06) **et** que l'installation de 12 précède toute commande 11 — ce que la partition interdit de garantir. La seule garantie possible est **locale** : le filtre de sûreté (R07) rejette toute action dangereuse indépendamment du mandat. Autrement dit, on ne peut pas garantir l'*exclusion du mandat*, mais on peut garantir la *sûreté de l'action*.

---

## Q5 — P06 : authenticité ≠ fraîcheur ≠ sécurité

**Situation :** mesure (1,1) du cycle 40 ; commande mandat 12 demande POMPE pour le cycle 44, citant la mesure 40 ; certificat valide ; aucune preuve du niveau au cycle 44.

**Trois notions à ne pas confondre :**
- **Authenticité :** le certificat de mandat 12 est valide → la commande est bien émise par un chef légitime. ✔
- **Fraîcheur :** la mesure date du cycle 40, la commande vise le cycle 44 → **4 cycles d'écart**, aucune preuve de l'état à 44. ✘
- **Sécurité :** POMPE depuis (1,1) → (−1,0), **violation écologique**. ✘

**Décision :** la commande doit être **rejetée par le filtre local**, non parce que le certificat est faux, mais parce que l'action POMPE est dangereuse pour l'état local courant. Le filtre local (R07) est **souverain** : il ne fait pas confiance à la justification cloud, il évalue l'action contre l'état physique local fiable (R06).

**Architecture cloud utile :**
- Le cloud émet des **préférences** (action souhaitée) avec mandat, cycle, op_id, hash — jamais une autorisation de sûreté.
- L'automate applique : (1) vérification de signature et de mandat installé, (2) vérification du cycle courant, (3) **filtre de sûreté local** qui rejette toute action dont un successeur sort de S.
- Le cloud ne peut **pas** désactiver le filtre (R07).
- La mesure 40 est traitée comme une **observation périmée** : elle ne peut pas justifier une action au cycle 44 sans preuve de l'état à 44.

---

## Q6 — Preuve composée, tests exhaustifs, exécution, limites

### Preuve composée
1. **Sûreté locale (Q1) :** W = S, CHARGE universellement sûre sous r = 0 → politique constante CHARGE sûre depuis tout S.
2. **Fencing (Q3) :** op_id + cycle_seq + registre durable excluent le rejeu (P01) et l'ancien mandat *après installation*.
3. **Souveraineté locale (Q5) :** le filtre local rejette toute action dangereuse, indépendamment du mandat.
4. **Composition :** la sûreté globale = (sûreté locale du filtre) ∧ (exclusion des commandes périmées par fencing). Le filtre garantit la sûreté même si le fencing échoue (partition, P02).

### Tests exhaustifs (modèle fini, 9 états)
- Itération de point fixe : W = 9 états (r = 0) vs 8 états (r ∈ {0,1}).
- CHARGE dangereuse depuis : **aucun** état (r = 0).
- POMPE sûre uniquement depuis h = 3.
- Aucun état sans action sûre.

### Exécution utile
Politique déployable : **CHARGE par défaut ; POMPE seulement si h = 3 et b ≥ 1 et mandat/cycle/op_id valides et filtre local OK.**

### Limites
- Modèle **fictif** (avertissement de périmètre) : non déployable sur une installation hydraulique réelle.
- L'atomicité effet+reçu (R06) est **supposée** ; sans elle, un effet physique inconnu doit être traité comme tel.
- La variante r = 0 est **plus permissive** : elle masque des dangers du dossier de base (débordement par CHARGE depuis h = 3). Ne pas conclure que le système réel est plus sûr — seule la perturbation modélisée a changé.
- P02 reste **irréalisable** au niveau de l'exclusion du mandat ; seule la sûreté locale est garantissable.

---

## Synthèse de la variante

| Question | Dossier de base (r ∈ {0,1}) | Variante (r = {0}) |
|---|---|---|
| **Q1 Domaine gagnant** | 8 états (S \ {(3,0)}) | **9 états (S entier)** |
| **Q2 P03** | ensemble d'information perdant | **soluble (CHARGE)** |
| **Q2 P04** | faux (CHARGE dangereuse en h=3) | faux en principe, masqué |
| **Q2 P05** | sûr | sûr (preuve simplifiée) |
| **Q4 P02** | irréalisable | irréalisable |

**Réponse à la question posée :** sous la variante r ∈ {0}, le domaine gagnant est **l'ensemble sûr tout entier**, soit les **9 états** `{1,2,3} × {0,1,2}`, avec CHARGE admissible partout et POMPE admissible seulement depuis h = 3 (b ≥ 1). La maximalité est immédiate : l'ensemble sûr est fermé sous CHARGE, et aucun état hors S n'est récupérable (R01).