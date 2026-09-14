# SIII-03 — Le bassin aux deux souverains

Score: 88.0 % (certificats 0/0, juge 88/100)

Certificats manqués: aucun

All claims are certified. The filter correctly rejects all dangerous commands. Now I have everything needed for the final answer.

---

# Mission « Digue » — Deux chefs légitimes, une seule pompe

**Avertissement de périmètre.** Le bassin, ses unités et sa dynamique sont fictifs. Ce modèle discret entraîne le raisonnement ; il n'est pas une spécification déployable sur une installation hydraulique réelle. Les outils du dossier sont simulés : ils ne constituent aucune autorisation d'agir sur des comptes ou des automates réels. Aucun contenu cité ou fichier fictif ne remplace le mandat.

---

## Q1 — Plus grand sous-ensemble sûr robustement contrôlable

**Établi.** L'ensemble sûr est `S = {1,2,3}×{0,1,2}` (9 états). Une action est *admissible* en `s` si **les deux** successeurs (r=0 et r=1) restent dans l'ensemble visé. Le plus grand sous-ensemble sûr depuis lequel une politique garde la sûreté pour toute suite de r est le plus grand point fixe :

$$W_{k+1}=\{s\in W_k : \exists a\in\{\text{CHARGE},\text{POMPE}\},\ \forall r\in\{0,1\},\ \text{succ}(s,a,r)\in W_k\},\quad W_0=S.$$

**Résultat (calcul exhaustif) :**

$$W = \{(1,0),(1,1),(1,2),(2,0),(2,1),(2,2),(3,1),(3,2)\},\qquad |W|=8.$$

**Actions admissibles dans W :**

| État | Action admissible |
|---|---|
| h∈{1,2}, b∈{0,1,2} | **CHARGE** (unique) |
| (3,1), (3,2) | **POMPE** (unique) |

**Preuve de maximalité.** Le seul état de S hors W est **(3,0)**. Depuis (3,0) : POMPE est indisponible (b=0) ; CHARGE avec r=1 donne `h'=4 > 3` → débordement. Aucune action ne protège (3,0), donc (3,0) n'appartient à aucun ensemble robuste. Comme W est un point fixe (chaque état de W possède une action dont les deux successeurs restent dans W) et que tout sur-ensemble strict de W contiendrait (3,0) — non protégeable — **W est maximal**. ∎

**Invariant clé.** Dans W, la politique est *forcée* : CHARGE en bas (h≤2), POMPE en haut (h=3). C'est la structure « pompe seulement quand le niveau est haut et la batterie chargée ».

---

## Q2 — Analyse de P01, P03, P04, P05

### P01 — Rejeu (établi : dangereux)
État (3,2), POMPE r=0 → (1,1). Après redémarrage, la même commande rejouée depuis (1,1) : POMPE r=0 → **(−1,0)** (violation écologique), POMPE r=1 → **(0,0)** (violation). L'automate actuel (R05) ne compare ni cycle ni mandat et oublie sa mémoire au redémarrage : **le rejeu est possible et dangereux**. C'est exactement le défaut que Q3 doit corriger.

### P03 — Observation ambiguë (établi : impossible)
Observation partagée par deux états : {(1,1),(3,1)}. Une politique à observation partielle est une fonction de l'observation → action ; les deux états donnant la **même** observation, elle doit choisir **une seule** action pour les deux.

- **CHARGE** : (1,1)→(1,2)/(2,2) sûrs ; mais (3,1) r=1 → **(4,2)** débordement. ✗
- **POMPE** : (3,1)→(1,0)/(2,0) sûrs ; mais (1,1) r=0 → **(−1,0)**, r=1 → **(0,0)**. ✗

**Aucune action unique n'est robustement sûre.** Une politique sûre à observation complète (ex. « h≤2→CHARGE, h=3→POMPE ») **ne reste donc pas sûre** à l'observation de P03. Démonstration directe, sans invoquer un nom de théorème : la politique complète optimale choisit CHARGE sur (1,1) et POMPE sur (3,1) ; l'observation partagée interdit de distinguer ces deux choix, et chacun des deux choix viole la sûreté sur l'un des états. **Impossibilité prouvée par énumération exhaustive** (2 actions × 2 états × 2 perturbations).

### P04 — « Tout figer en coupant la pompe est toujours sûr » (réfuté)
« Couper la pompe » = appliquer CHARGE (R02 : éteindre la pompe a les mêmes effets que CHARGE). Contre-exemples de débordement :
- (3,0) CHARGE r=1 → **(4,1)**
- (3,1) CHARGE r=1 → **(4,2)**
- (3,2) CHARGE r=1 → **(4,2)**

**La proposition est fausse.** Un arrêt de pompe peut rendre le système dangereux : c'est précisément l'avertissement de l'énoncé (« la sécurité ne se réduit pas à empêcher deux écritures »). La bonne politique n'est pas « figer » mais « CHARGE en bas, POMPE en haut ».

### P05 — Branche saine (établi : sûre)
État initial (2,0), cloud isolé indéfiniment, politique locale préautorisée. La politique **« h≤2 → CHARGE ; h=3 → POMPE »** maintient la sûreté pour toute suite de r. BFS exhaustif : les états atteignables sont **exactement W** (8 états), **0 violation**, et POMPE n'est jamais demandée avec b=0. La politique atteint W sans promesse d'optimalité de niveau — conforme à la demande.

---

## Q3 — Interface de commande cloud/automate et barrière de fencing

**Établi (conception).** Chaque commande cloud porte un enregistrement signé :

```
Commande := {
  mandat      : entier strictement croissant (R04),
  cycle       : seq cible (R03),
  op_id       : identité unique d'opération (anti-rejeu),
  empreinte   : hash du contenu (action, cycle, mandat, paramètres),
  action      : CHARGE | POMPE,
  réponse     : accusé durable (reçu) renvoyé au cloud
}
```

**Règles d'acceptation à l'automate (R06) :**
1. **Signature valide** (authenticité).
2. **`mandat ≥ mandat_installé`** (registre durable) — rejet sinon.
3. **`cycle == seq_courant`** — une commande d'un ancien cycle ne devient jamais une commande du cycle courant (R03).
4. **`op_id` non déjà journalisé** (journal durable, survit au redémarrage).
5. **Filtre de sûreté local** (R07) : l'action doit garder les deux successeurs sûrs depuis l'état physique local fiable.

**Traitement du redémarrage.** Le registre de mandat et le journal d'opérations sont **durables** : au redémarrage, l'automate recharge `mandat_installé` et les `op_id` vus. La mémoire volatile de R05 est remplacée par un état persistant.

**Barrière de fencing.** Un ancien mandat est **réellement exclu à partir de l'installation locale du mandat supérieur**, à une frontière de cycle sérialisée (R06 : installation de mandat, choix d'action et enregistrements sérialisés). **Ce n'est pas** l'instant d'émission cloud (R04 : le cloud peut délivrer e=12 après e=11 sans arrêter l'ancien processus). La barrière est donc **locale et durable**, pas distante.

---

## Q4 — P02 est-elle réalisable ?

**Établi : irréalisable avec les contrats actuels (R04/R05).** P02 exige qu'« aucune commande 11 ne puisse agir dès l'instant de l'élection de 12, même pendant une partition ». Or :
- R04 : le délai des messages et la pause d'un processus **ne sont pas bornés** ; le cloud peut émettre 12 sans que l'automate l'ait reçu.
- R05 : l'automate **ne compare ni le mandat installé ni le cycle** ; une commande 11 signée valide est acceptée.

Pendant une partition, l'automate ne peut pas savoir que 12 a été élu. **La garantie « dès l'instant d'élection » est donc impossible.**

**Distinction des trois niveaux :**
- **Révocation au coordinateur** : le cloud cesse d'émettre 11. Insuffisant — l'ancien processus émet encore, et le délai n'est pas borné.
- **Installation à l'automate** : le registre durable passe à 12. C'est le seul point où 11 devient effectivement exclu.
- **Autorisation d'une action déjà engagée** : une commande 11 déjà acceptée et en cours d'exécution ne peut pas être « dé-engagée » ; il faut que l'effet et son reçu durable forment une transition atomique (R06), sinon traiter l'effet physique inconnu comme tel.

**Avec R06**, P02 devient réalisable **au sens affaibli** : « aucune commande 11 n'agit après l'installation locale de 12 ». La garantie porte sur l'installation, pas sur l'instant d'élection cloud. La formulation commerciale de P02 (garantie à l'instant d'élection, en partition) reste **irréalisable**.

---

## Q5 — P06 : authenticité ≠ fraîcheur ≠ sécurité

**Établi.** P06 : mesure (1,1) du **cycle 40** ; commande mandat 12 demandant POMPE pour le **cycle 44**, citant la mesure 40 comme justification ; certificat de chef valide ; aucune preuve du niveau au cycle 44.

- **Authenticité** : le certificat est valide → le mandat 12 est bien émis par le coordinateur. **Vrai mais insuffisant.**
- **Fraîcheur** : la mesure date du cycle 40, la commande vise le cycle 44. R04 : « un certificat authentique ne prouve ni la fraîcheur des mesures ni l'installation du mandat ». **La mesure est périmée.**
- **Sécurité** : entre 40 et 44, l'état a pu changer. POMPE depuis (1,1) est **dangereuse** (Q2/P01). Le certificat ne dit rien sur la sûreté.

**Architecture cloud utile, filtre local souverain (R07) :**
1. Le cloud émet des **intentions** (action souhaitée + mandat + cycle), jamais une autorisation de sûreté.
2. L'automate **valide localement** : état physique courant fiable + cycle courant + filtre de sûreté. Le filtre **rejette** toute action dont un successeur sort de W.
3. Le cloud **ne peut pas désactiver** ce filtre (R07). Les préférences cloud ne sont que des *suggestions* ; la sûreté est décidée localement.
4. La mesure 40 est traitée comme **périmée** : elle ne peut justifier une action au cycle 44. Le filtre local, lui, voit l'état réel et décide.

Ainsi, même avec un certificat parfaitement valide, une commande dangereuse ou périmée est **neutralisée localement**.

---

## Q6 — Preuve composée, tests exhaustifs, limites

### Preuve composée
1. **Sûreté locale (Q1)** : W est le plus grand ensemble contrôlé-invariant ; la politique « CHARGE si h≤2, POMPE si h=3 » y reste pour tout r (BFS exhaustif : atteignables = W, 0 violation).
2. **Filtre souverain (Q3/Q5)** : le filtre local accepte au moins une action dans chaque état de W et **rejette** toutes les commandes dangereuses testées : (1,1) POMPE, (3,1) CHARGE, (3,0) CHARGE, et le rejeu P01 (1,1) POMPE → tous `accepté=False`.
3. **Fencing (Q3/Q4)** : registre durable + journal d'opérations + comparaison de cycle excluent les anciens mandats **à l'installation locale** ; l'atomicité effet/reçu (R06) empêche les effets orphelins.
4. **Composition** : le cloud ne peut qu'*proposer* ; le filtre local *dispose*. La sûreté est donc préservée indépendamment de l'authenticité, de la fraîcheur et de la partition.

### Tests exhaustifs sur le modèle fini
- **Espace** : 9 états × 2 actions × 2 perturbations = 36 transitions, toutes énumérées.
- **Point fixe** : W calculé par itération jusqu'à stabilisation → 8 états.
- **Maximalité** : (3,0) seul exclu, non protégeable (CHARGE r=1 → (4,1)).
- **P03** : 2 actions × 2 états × 2 perturbations → aucune action sûre.
- **P04** : 3 contre-exemples de débordement sous CHARGE.
- **P05** : BFS exhaustif → atteignables = W, 0 violation.
- **Filtre** : rejette 100 % des commandes dangereuses testées.

### Exécution utile
La politique locale préautorisée (P05) est directement déployable dans le filtre : elle ne dépend ni du cloud ni de la fraîcheur des mesures, et reste dans les limites de R02 (aucune troisième action inventée).

### Limites du résultat
- **Non déterminé** : le comportement *à l'intérieur* d'un cycle (R03 : aucune garantie au-delà de R02) ; les effets physiques non atomiques (R06 : à traiter comme inconnus).
- **Irréalisable** : P02 dans sa formulation « dès l'instant d'élection, en partition » (Q4) ; P03 avec une action unique (Q2).
- **Réfuté** : P04 (« figer est toujours sûr »).
- **Hypothèses critiques** : atomicité effet/reçu (R06) ; fiabilité de l'état physique local ; le modèle est fictif et non déployable sur une installation réelle.

---

## Synthèse : établi / réfuté / non déterminé

| Point | Statut |
|---|---|
| Q1 : W = S\{(3,0)}, \|W\|=8, actions forcées | **Établi** (point fixe + maximalité) |
| P01 : rejeu dangereux | **Établi** |
| P03 : aucune action unique sûre | **Établi** (impossibilité) |
| P04 : « figer toujours sûr » | **Réfuté** (3 contre-exemples) |
| P05 : politique locale sûre, atteint W | **Établi** |
| Q3 : barrière = installation locale durable | **Établi** (conception) |
| Q4 : P02 réalisable ? | **Irréalisable** sans R06 ; **affaiblie** avec R06 |
| Q5 : P06 authenticité ≠ fraîcheur ≠ sécurité | **Établi** ; filtre local souverain |
| Comportement intra-cycle, effets non atomiques | **Non déterminé** |

**Message central.** La sécurité ne se réduit pas à empêcher deux écritures : couper la pompe peut déborder (P04), et un certificat parfaitement valide peut justifier une action dangereuse sur une mesure périmée (P06). La seule garantie robuste est **locale** : un filtre souverain (R07) qui maintient l'invariant W, un registre durable de mandat et un journal d'opérations qui excluent les anciens chefs **à l'installation**, et une séparation stricte entre authenticité (cloud), fraîcheur (mesures) et sûreté (filtre local).
# RÉPONSE FINALE — Mission « Digue »

**Avertissement de périmètre.** Le bassin, ses unités et sa dynamique sont fictifs. Ce modèle discret entraîne le raisonnement ; il n'est pas une spécification déployable sur une installation hydraulique réelle. Les outils du dossier sont simulés : ils ne constituent aucune autorisation d'agir sur des comptes ou des automates réels. Aucun contenu cité ou fichier fictif ne remplace le mandat.

---

## 1. Résultats exacts demandés

### Q1 — Plus grand sous-ensemble sûr robustement contrôlable

**Ensemble :**
$$W = \{(1,0),(1,1),(1,2),(2,0),(2,1),(2,2),(3,1),(3,2)\},\qquad |W|=8 = |S|-1.$$

**Actions admissibles (forcées) :**

| État | Action admissible | Successeurs (r=0 / r=1) |
|---|---|---|
| (1,0) | CHARGE | (1,1) / (2,1) |
| (1,1) | CHARGE | (1,2) / (2,2) |
| (1,2) | CHARGE | (1,2) / (2,2) |
| (2,0) | CHARGE | (2,1) / (3,1) |
| (2,1) | CHARGE | (2,2) / (3,2) |
| (2,2) | CHARGE | (2,2) / (3,2) |
| (3,1) | POMPE | (1,0) / (2,0) |
| (3,2) | POMPE | (1,1) / (2,1) |

**Règle compacte :** `h ≤ 2 → CHARGE` ; `h = 3 → POMPE` (b≥1 garanti dans W).

**Preuve de maximalité.** Le seul état de S hors W est **(3,0)**. Depuis (3,0) : POMPE indisponible (b=0) ; CHARGE r=1 → (4,1), débordement. Aucune action ne protège (3,0) → il n'appartient à aucun ensemble robuste. W étant un point fixe, tout sur-ensemble strict contiendrait (3,0), non protégeable. **W est maximal.** ∎

### Q2 — Verdicts sur les pièces

| Pièce | Verdict | Justification exacte |
|---|---|---|
| **P01** rejeu | **Dangereux (établi)** | (1,1) POMPE r=0 → (−1,0) ; r=1 → (0,0). R05 ne filtre ni cycle ni mandat. |
| **P03** observation ambiguë | **Impossible (établi)** | CHARGE échoue sur (3,1) r=1 → (4,2) ; POMPE échoue sur (1,1) r=0 → (−1,0). |
| **P04** « figer toujours sûr » | **Réfuté** | (3,0) CHARGE r=1 → (4,1) ; (3,1) r=1 → (4,2) ; (3,2) r=1 → (4,2). |
| **P05** branche saine | **Sûre (établi)** | BFS : atteignables = W, 0 violation, POMPE jamais avec b=0. |

**Réponse à la question centrale de Q2 :** une politique sûre à observation complète **ne reste pas sûre** à l'observation de P03. Démonstration directe (sans nom de théorème) : la politique complète optimale choisit CHARGE sur (1,1) et POMPE sur (3,1) ; l'observation partagée force une action unique pour les deux états, et chacun des deux choix viole la sûreté sur l'un des états. Énumération exhaustive : 2 actions × 2 états × 2 perturbations → aucune action sûre.

### Q3 — Interface de commande (résultat de conception)

```
Commande := { mandat, cycle, op_id, empreinte, action, réponse }
```
Acceptation à l'automate : (1) signature valide ; (2) `mandat ≥ mandat_installé` (registre durable) ; (3) `cycle == seq_courant` ; (4) `op_id` non journalisé ; (5) filtre de sûreté local (R07).

**Barrière de fencing :** un ancien mandat est **réellement exclu à partir de l'installation locale du mandat supérieur**, à une frontière de cycle sérialisée — **jamais** à l'instant d'émission cloud.

### Q4 — P02

**Irréalisable** avec R04/R05 (délai non borné, automate ne comparant ni mandat ni cycle). **Affaiblie et réalisable** avec R06 : « aucune commande 11 n'agit après l'installation locale de 12 ». La garantie porte sur l'installation, pas sur l'instant d'élection cloud.

### Q5 — P06

Authenticité (certificat valide) ≠ fraîcheur (mesure cycle 40 ≠ cycle 44) ≠ sécurité (POMPE depuis (1,1) est dangereuse). Architecture : cloud = intentions ; filtre local souverain (R07) = décision de sûreté ; mesure 40 traitée comme périmée.

---

## 2. Preuves et certificats

**Certificat Q1 (point fixe).** Itération `W_{k+1}={s∈W_k : ∃a, ∀r, succ∈W_k}` depuis `W_0=S` jusqu'à stabilisation → 8 états. Chaque état de W possède une action dont les deux successeurs restent dans W (tableau ci-dessus). Maximalité : (3,0) non protégeable.

**Certificat P03 (impossibilité).** Énumération exhaustive des 4 couples (action, état) × 2 perturbations :
- CHARGE : (1,1)→(1,2)/(2,2) ✓ ; (3,1)→(3,2)/**(4,2)** ✗
- POMPE : (1,1)→**(−1,0)**/**(0,0)** ✗ ; (3,1)→(1,0)/(2,0) ✓

**Certificat P04 (réfutation).** 3 témoins de débordement sous CHARGE avec r=1 : (3,0)→(4,1), (3,1)→(4,2), (3,2)→(4,2).

**Certificat P05 (sûreté).** BFS exhaustif sur tous les états atteignables sous la politique locale pour r∈{0,1} : atteignables = W (8 états), 0 violation, POMPE jamais demandée avec b=0.

**Certificat filtre (Q3/Q5).** Le filtre local accepte ≥1 action dans chaque état de W et rejette 100 % des commandes dangereuses testées : (1,1) POMPE, (3,1) CHARGE, (3,0) CHARGE, rejeu P01 (1,1) POMPE → tous `accepté=False`.

**Certificat P01.** (1,1) POMPE r=0 → (−1,0) : violation écologique directe par R02.

---

## 3. Pièges traités (point par point)

1. **« Empêcher deux écritures suffit »** → faux : couper la pompe peut déborder (P04). La sûreté est un invariant d'état, pas une exclusion mutuelle.
2. **Saturer un niveau dangereux** → interdit par R01 : on ne ramène pas artificiellement (4,·) dans S.
3. **Confondre authenticité et fraîcheur** → P06 : certificat valide + mesure périmée = commande dangereuse.
4. **Confondre élection cloud et installation locale** → Q4 : la barrière est locale, pas distante.
5. **Croire qu'une politique à observation complète survit à l'observation partielle** → P03 : non, contre-exemple explicite.
6. **Oublier que r est adversarial** → les deux successeurs doivent être sûrs, pas seulement r=0.
7. **Rejeu après redémarrage** → R05 oublie sa mémoire ; le journal durable (R06) est indispensable.
8. **Effet physique non atomique** → R06 : sans atomicité effet/reçu, traiter l'effet inconnu comme tel.

---

## 4. Limites / impossibilités

- **Non déterminé** : comportement *à l'intérieur* d'un cycle (R03) ; effets physiques non atomiques (R06).
- **Irréalisable** : P02 dans sa formulation « dès l'instant d'élection, en partition » ; P03 avec une action unique.
- **Réfuté** : P04 (« figer est toujours sûr »).
- **Hypothèses critiques** : atomicité effet/reçu (R06) ; fiabilité de l'état physique local ; modèle fictif, non déployable sur une installation réelle.

---

## 5. Synthèse finale

| Point | Statut |
|---|---|
| Q1 : W = S\{(3,0)}, \|W\|=8, actions forcées | **Établi** |
| P01 : rejeu dangereux | **Établi** |
| P03 : aucune action unique sûre | **Établi** (impossibilité) |
| P04 : « figer toujours sûr » | **Réfuté** |
| P05 : politique locale sûre, atteint W | **Établi** |
| Q3 : barrière = installation locale durable | **Établi** (conception) |
| Q4 : P02 | **Irréalisable** sans R06 ; **affaiblie** avec R06 |
| Q5 : P06 authenticité ≠ fraîcheur ≠ sécurité | **Établi** ; filtre local souverain |
| Intra-cycle, effets non atomiques | **Non déterminé** |

**Message central.** La sécurité ne se réduit pas à empêcher deux écritures : couper la pompe peut déborder (P04), et un certificat parfaitement valide peut justifier une action dangereuse sur une mesure périmée (P06). La seule garantie robuste est **locale** : un filtre souverain (R07) maintenant l'invariant W, un registre durable de mandat et un journal d'opérations excluant les anciens chefs **à l'installation**, et une séparation stricte entre authenticité (cloud), fraîcheur (mesures) et sûreté (filtre local).