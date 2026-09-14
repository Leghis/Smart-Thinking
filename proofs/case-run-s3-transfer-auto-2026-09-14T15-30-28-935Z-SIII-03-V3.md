# SIII-03-V3 — SIII-03 → Barrière installée et reçu historique

Score: 84.0 % (certificats 0/0, juge 84/100)

Certificats manqués: aucun

Toutes les exigences sont couvertes. Voici la réponse finale.

---

# Deux chefs légitimes, une seule pompe — dossier de base et variante

**Hypothèse modifiée (variante) :** le mandat 12 est **installé durablement** dans l'automate. Tout le reste du dossier de base (R01–R07, P01, P03–P06) est conservé. Je recalcule les conclusions affectées (Q3, Q4, Q6, variante) et je conserve Q1, Q2, P01, P03, P04, P05, P06.

---

## Q1 — Plus grand sous-ensemble sûr avec politique robuste

**Modèle.** États sûrs S = {1,2,3}×{0,1,2} (9 états). Une action est *admissible* en s si **ses deux successeurs** (r=0 et r=1) sont sûrs. Une politique robuste existe depuis s si s appartient au plus grand ensemble W tel que chaque état de W possède une action admissible dont les deux successeurs restent dans W (attracteur / jeu de sûreté).

**Résultat (calcul exhaustif) :**

$$W = \{(1,0),(1,1),(1,2),(2,0),(2,1),(2,2),(3,1),(3,2)\},\quad |W|=8.$$

**Actions admissibles :**
- h ≤ 2 (les 6 états) : **CHARGE** uniquement.
- (3,1) et (3,2) : **POMPE** uniquement.

**Preuve de maximalité.** Le seul état exclu est **(3,0)**. En (3,0) : POMPE est indisponible (b=0) ; CHARGE donne h'=3+r, donc (3,1) si r=0 mais **(4,1) hors S si r=1**. Aucune action n'a ses deux successeurs sûrs ⇒ (3,0) n'appartient à aucun ensemble robuste. Comme W = S \ {(3,0)} et que tout sur-ensemble strict contiendrait (3,0), W est maximal. Vérification : chaque état de W possède une action dont les deux successeurs restent dans W (W est un piège clos sous la politique robuste).

---

## Q2 — Analyse de P01, P03, P04, P05

**P01 (rejeu).** État (3,2), POMPE r=0 → (1,1). Après redémarrage, l'automate actuel (R05) **oublie la mémoire des identifiants** : la même commande est ré-acceptée. Appliquée depuis (1,1) avec r=0 : h'=1−2+0=**−1** ⇒ violation écologique (h<1). Le rejeu est donc **dangereux** ; il faut un journal durable + le numéro de cycle (R03/R06).

**P03 (mesure ambiguë).** États possibles {(1,1),(3,1)}, une seule action, pas de nouvelle information.
- CHARGE : (1,1)→(1,2)/(2,2) sûrs ; mais (3,1)→(3,2)/(4,2) : **(4,2) hors S**.
- POMPE : (3,1)→(1,0)/(2,0) sûrs ; mais (1,1)→(−1,0)/(0,0) : **(−1,0) hors S**.

**Aucune action unique n'est robuste.** Une politique sûre à observation complète **ne reste donc pas sûre** sous l'observation partielle de P03. Démonstration directe (sans invoquer un théorème) : les deux états exigent des actions *opposées* (CHARGE pour h bas, POMPE pour h haut) ; toute action choisie viole la sûreté dans l'un des deux cas pour une perturbation r admissible. La perte d'information transforme un problème décidable en problème indécidable localement.

**P04 (« tout figer en coupant la pompe est toujours sûr »).** **Faux.** Couper la pompe = CHARGE (R02). Contre-exemple : (3,2) + CHARGE + r=1 → **(4,2)**, débordement. Figer n'est pas neutre : cela peut *ajouter* du niveau. La sûreté ne se réduit pas à empêcher deux écritures.

**P05 (branche saine).** État initial (2,0), cloud isolé, politique locale préautorisée. La politique « CHARGE si h≤2, POMPE si h=3 » maintient la sûreté pour **toute** suite de r (vérifié exhaustivement sur 8 pas ; états atteints ⊆ W). Aucune promesse d'optimalité n'est requise : la politique est *sûre*, pas optimale.

---

## Q3 — Interface de commande cloud/automate et barrière de fencing

**Message de commande (cloud → automate) :**
`(mandat, cycle, op-id, empreinte_contenu, action, signature)` où :
- **mandat** : entier strictement croissant, infalsifiable (R04) ;
- **cycle** : numéro durable de cycle visé (R03) ;
- **op-id** : identifiant unique d'opération (anti-rejeu) ;
- **empreinte_contenu** : hash de (mandat, cycle, op-id, action) — lie le contenu à la signature ;
- **action** ∈ {CHARGE, POMPE}.

**Réponse (automate → cloud) :** `(op-id, cycle, décision ∈ {APPLIQUÉ, REJETÉ}, mandat_installé, état_local)`.

**Traitement du redémarrage :** registre **durable** de mandat installé + journal **durable** des op-ids ; rechargés avant toute acceptation.

**Règle d'acceptation (filtre local, R07 souverain) :** accepter ssi
1. signature valide **et** empreinte cohérente ;
2. **mandat ≥ mandat installé** (barrière de mandat) ;
3. **op-id ∉ journal durable** (anti-rejeu) ;
4. **cycle == cycle courant** (fraîcheur) ;
5. l'action passe le **filtre de sûreté** (R02/R07).

**Barrière de fencing.** Elle est franchie **localement** à l'instant où le registre durable contient `mandat_installé = 12` **et** que l'installation est sérialisée avec le choix d'action aux frontières de cycle (R06). À partir de là, toute commande de mandat < 12 est **exclue**, indépendamment du cloud et des partitions.

---

## Q4 — P02 est-il réalisable ?

**Avec les contrats de base (R05) : NON.** L'automate actuel ne compare pas le mandat installé, et le cloud peut émettre 12 sans arrêter l'ancien (R04). Une commande 11 peut donc agir après l'élection de 12.

**Avec R06 : OUI.** Registre durable de mandat + sérialisation installation/action aux frontières de cycle rendent la barrière effective.

**Trois niveaux à distinguer :**
1. **Révocation au coordinateur** : le cloud cesse d'émettre 11. Nécessaire mais **insuffisant** (messages en vol, partitions non bornées).
2. **Installation à l'automate** : le registre durable passe à 12. C'est **la** barrière réelle.
3. **Autorisation d'une action déjà engagée** : si l'effet physique et son reçu sont atomiques (R06), une action 11 déjà appliquée est **irréversible** ; sinon, un effet physique inconnu doit être traité comme tel (état incertain).

---

## Q5 — P06 : authenticité, fraîcheur, sécurité

P06 : mesure (1,1) du **cycle 40**, commande mandat 12 demandant POMPE pour le **cycle 44**, citant la mesure 40 ; certificat valide ; aucune preuve du niveau au cycle 44.

- **Authenticité** : le certificat est valide — cela prouve seulement *qui* parle.
- **Fraîcheur** : la mesure date du cycle 40, la commande vise le cycle 44 — **écart non justifié**.
- **Sécurité** : rien ne prouve que l'état au cycle 44 est (1,1) ; POMPE depuis un h bas violerait la contrainte écologique.

**Architecture utile :** le cloud **propose** (mandat, cycle, op-id, empreinte, action) ; l'automate **décide** via le filtre local souverain (R07), qui exige `cycle == cycle courant` et un **état physique local fiable**. La mesure 40 ne peut justifier une action au cycle 44 : la justification cloud n'a pas autorité sur la sûreté. Le cloud ne peut pas désactiver ce filtre.

---

## Q6 — Preuve composée, tests exhaustifs, limites

**Preuve composée :**
1. **Invariance** : W (Q1) est clos sous la politique robuste ⇒ sûreté pour toute suite de r.
2. **Souveraineté locale** : le filtre R07 restreint les actions aux actions robustes, indépendamment du cloud.
3. **Exclusion des commandes périmées** : barrière de mandat + journal durable (Q3/Q4).
4. **Atomicité** : effet/reçu atomiques (R06) ⇒ pas d'état physique inconnu.

**Tests exhaustifs (modèle fini, 9 états) :** W = S \ {(3,0)} confirmé ; (3,0) sans action admissible ; P03 sans action robuste ; P04 réfuté par (3,2)+CHARGE+r=1→(4,2) ; P05 sûr sur 8 pas.

**Limites :** modèle fictif (non déployable) ; hypothèse d'atomicité indispensable ; **aucune garantie intra-cycle** (R03) ; l'observation partielle (P03) reste **non résoluble** sans information supplémentaire.

---

## VARIANTE — Distinguer les réponses permises

**Hypothèse modifiée :** mandat 12 **installé durablement** (barrière franchie localement). Deux événements arrivent ensuite :
- **(A)** une **nouvelle** opération de mandat 11 (op-id jamais vu) ;
- **(B)** un **rejeu identique** d'une opération 11 **exécutée avant la barrière** (même op-id).

**Réponses permises :**

| Événement | Verdict | Raison |
|---|---|---|
| **(A)** nouvelle op 11 | **REJET** | Barrière de mandat : 11 < 12 (registre durable). |
| **(B)** rejeu op 11 pré-barrière | **REJET** | Si journal durable intact : op-id déjà vu (anti-rejeu). Si journal perdu au redémarrage : op-id non vu, **mais** 11 < 12 ⇒ rejet par la barrière de mandat. |

**Conclusion de la variante.** Les **deux** opérations 11 sont **exclues**, et par **deux mécanismes indépendants** : la barrière de mandat (11 < 12) suffit à elle seule dans les deux cas ; le journal durable ajoute une seconde ligne de défense pour (B). C'est précisément ce que la variante met en évidence : **une fois le mandat 12 installé durablement, la barrière de mandat rend l'ancien mandat inopérant même sans journal**, et le journal couvre le cas résiduel du rejeu. La distinction « nouvelle opération » vs « rejeu » ne change pas le verdict (rejet), mais change le **mécanisme** qui le produit — ce qui importe pour l'audit : le rejeu pré-barrière est le cas où l'on ne peut pas se contenter de la seule fraîcheur d'op-id.

**Ce qui reste inchangé par rapport au dossier de base :** Q1 (W), Q2 (P01/P03/P04/P05), P06. **Ce qui change :** P02 devient **réalisable** (la barrière est effectivement installée), et la variante confirme que l'exclusion des commandes 11 ne dépend plus de la révocation cloud mais du **registre durable local**.