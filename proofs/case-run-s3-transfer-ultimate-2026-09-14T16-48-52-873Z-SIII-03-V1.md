# SIII-03-V1 — SIII-03 → La mesure devient exacte

Score: 100.0 % (certificats 0/0, juge 100/100)

Certificats manqués: aucun

Tout est vérifié par deux méthodes concordantes. Je rédige la réponse finale.

## Réponse

**Question centrale (variante) : l'absence d'action sûre persiste-t-elle ?**

**Non.** Avec une mesure locale **exacte (1,1) au cycle courant**, il existe une action sûre : **CHARGE**. L'absence d'action sûre observée dans P03 original était un artefact de l'**ambiguïté d'observation** {(1,1),(3,1)}, non une propriété intrinsèque de l'état (1,1).

| Cas | Observation | Action sûre ? |
|---|---|---|
| P03 original | {(1,1),(3,1)} (ambiguë) | **Aucune** |
| **P03 variante** | **(1,1) exacte** | **CHARGE** (POMPE interdite) |

**Résultats exacts (Q1).** Le plus grand sous-ensemble sûr robuste est
$$W = \{(1,0),(1,1),(1,2),(2,0),(2,1),(2,2),(3,1),(3,2)\},\quad |W|=8/9.$$
Seul **(3,0)** est exclu. Actions admissibles (celles gardant les **deux** successeurs dans W) :

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

## Preuves et certificats

**Q1 — Winning set (jeu à deux joueurs, point fixe maximal).** Le contrôleur choisit l'action, l'environnement choisit r∈{0,1} ; un état est gagnant s'il existe une action dont **les deux** successeurs sont sûrs **et** gagnants. Calcul par itération de suppression (méthode 1) et par attracteur du complément (méthode 2) : **les deux donnent W identique** (8 états).

*Maximalité (témoin de perte).* **(3,0)** est perdant : POMPE est indisponible (b=0) ; CHARGE donne (3,1) et (4,1) selon r, et **(4,1) ∉ S** (débordement). Aucune action ne garde les deux successeurs sûrs → (3,0) ∉ W. Comme W est le plus grand point fixe, aucun sur-ensemble n'est robustement sûr : maximalité prouvée.

**Q2 — Analyse des pièces.**
- **P01 (rejeu).** (3,2) → POMPE, r=0 → (1,1). Après redémarrage, la mémoire d'identifiants est perdue (R05) : la même commande peut être réappliquée au cycle suivant. (1,1) est dans W, mais le rejeu **désynchronise cycle et état** : la commande « ancienne » devient une commande « courante ». C'est une violation de R03 (une commande d'un ancien cycle ne doit pas devenir courante), pas une sortie de W.
- **P03 (variante).** Voir ci-dessus : **CHARGE est sûre** depuis (1,1) exact. POMPE est interdite : elle donnerait (−1,0) ou (0,0), tous deux hors S (violation écologique h<1).
- **P04 (« tout figer en coupant la pompe est toujours sûr »).** **Faux.** « Couper la pompe » ≡ CHARGE (R02). Depuis (3,0), CHARGE avec r=1 → (4,1) : **débordement**. Depuis (3,1)/(3,2), figer la pompe (CHARGE) mène à (3,2)/(4,2) : (4,2) hors S. La sûreté exige au contraire **d'actionner** POMPE depuis h=3. Un arrêt n'est donc pas universellement sûr — c'est exactement l'avertissement de l'énoncé.
- **P05 (branche saine).** État initial (2,0) ∈ W, cloud isolé, politique locale préautorisée. La politique « CHARGE tant que h≤2, POMPE dès que h=3 » maintient W pour **toute** suite de r (chaque ligne du tableau ci-dessus a ses deux successeurs dans W). Sûreté garantie sans cloud, sans optimalité de niveau.

**Q2 — Observation complète vs P03.** Une politique sûre à observation complète (P05) **ne reste pas sûre** sous l'observation ambiguë {(1,1),(3,1)} : la politique optimale pour (1,1) est CHARGE, mais CHARGE sur (3,1) donne (4,2) ∉ S ; la politique optimale pour (3,1) est POMPE, mais POMPE sur (1,1) donne (−1,0) ∉ S. **Aucune action unique n'est sûre pour les deux états** → l'ambiguïté détruit la sûreté. En revanche, avec l'observation **exacte (1,1)**, la politique complète redevient applicable : **la perte de sûreté venait de l'ambiguïté, pas de l'état**.

**Q3 — Interface cloud/automate.** Champs : `mandat` (entier strictement croissant), `cycle` (seq durable), `op_id` (identité unique d'opération), `empreinte_contenu` (hash de l'action+cycle+état visé), `réponse` (accusé signé). Règles : (i) l'automate **rejette** toute commande dont `mandat < mandat_installé` (registre durable) ; (ii) rejette tout `op_id` déjà journalisé ; (iii) rejette tout `cycle` ≠ cycle courant ; (iv) vérifie `empreinte_contenu`. **Barrière d'exclusion** : un ancien mandat est réellement exclu **à partir de l'installation durable du nouveau mandat dans l'automate** (frontière de cycle, atomique avec le reçu — R06), **pas** à partir de l'élection cloud.

**Q4 — P02 réalisable ?** **Non, pas avec les seuls contrats disponibles.** Distinguer trois niveaux :
1. **Révocation au coordinateur** : le cloud délivre 12 après 11 (R04) — fait, mais sans effet sur l'automate.
2. **Installation à l'automate** : l'automate n'a que 11 ; pendant la partition, l'installation de 12 n'a pas eu lieu.
3. **Autorisation d'une action déjà engagée** : une commande 11 signée valide, non encore vue, est **acceptée** (R05 ne compare ni mandat ni cycle).

Le cahier commercial (« aucune commande 11 dès l'élection de 12 ») est **irréalisable** sans registre durable de mandat + sérialisation aux frontières de cycle (R06). Avec ces améliorations, la barrière devient l'installation durable de 12 ; avant elle, la commande 11 reste légitimement exécutable. **Impossibilité structurelle** : on ne peut pas exiger l'exclusion d'un mandat non encore installé.

**Q5 — P06 (authenticité ≠ fraîcheur ≠ sûreté).** Le certificat de mandat 12 est **authentique** (valide), mais la mesure (1,1) date du **cycle 40** et la commande vise le **cycle 44** : **fraîcheur non prouvée**. Authenticité ≠ fraîcheur ≠ sûreté. Architecture utile : le cloud émet des **préférences** (action souhaitée + justification), jamais des ordres contraignants ; l'automate applique le **filtre de sûreté local souverain** (R07) qui, à chaque cycle, vérifie que l'action proposée garde les deux successeurs dans W. Si la mesure est périmée, le filtre local décide sur l'**état physique local fiable** (R06) et **ignore** la préférence cloud non fraîche. Le cloud ne peut pas désactiver ce filtre.

**Q6 — Preuve composée.** (a) W est le plus grand point fixe (deux méthodes concordantes). (b) Toute politique restant dans W est sûre par construction (chaque action admissible a ses deux successeurs dans W). (c) Tests exhaustifs : 9 états × 2 actions × 2 valeurs de r = 36 transitions énumérées ; seul (3,0) est perdant. (d) Exécution utile : depuis (2,0), la politique locale maintient W indéfiniment.

## Pièges traités

- **Identification partielle** : sous observation ambiguë, on ne produit **pas** une action ponctuelle « sûre » — on constate l'**absence** d'action sûre (borne : aucune). Sous observation exacte, l'action est identifiée (CHARGE).
- **Hypothèses énoncées avant calcul** : r∈{0,1} libre sans alternance ; les **deux** successeurs doivent être sûrs ; pas de saturation artificielle ; « éteindre la pompe » ≡ CHARGE.
- **Indicateur imparfait vs variable réelle** : l'observation ambiguë {(1,1),(3,1)} est traitée séparément de l'état réel ; la variante (1,1) exacte change la conclusion.
- **Cohérence** : h∈{1,2,3}, b∈{0,1,2} ; POMPE exige b≥1 ; successeurs hors S rejetés (h<1 écologique, h>3 débordement).
- **Authenticité/fraîcheur/sûreté** (P06) : trois notions distinctes, non confondues.
- **Fencing** : barrière = installation durable du mandat, pas l'élection cloud.

## Limites / impossibilités

1. **P02 irréalisable** avec les seuls contrats R04/R05 : exiger l'exclusion d'un mandat non installé est structurellement impossible ; il faut R06 (registre durable + sérialisation atomique).
2. **P04 faux** : « tout figer » n'est pas universellement sûr — depuis h=3, figer (CHARGE) peut déborder ; la sûreté exige POMPE.
3. **Observation ambiguë** : aucune action unique n'est sûre pour {(1,1),(3,1)} ; seule une information supplémentaire (capteur local, ou attente) restaure la sûreté. La variante (1,1) exacte **lève** cette impossibilité.
4. **Modèle fictif** : dynamique discrète d'entraînement, non déployable sur une installation hydraulique réelle (avertissement de périmètre).
5. **Hypothèse atomique** (R06) : sans « effet + reçu durable » atomique, un effet physique inconnu doit être traité comme tel — la preuve de sûreté ne tient plus.

**Conclusion de la variante** : l'absence d'action sûre **ne persiste pas**. Avec la mesure exacte (1,1), **CHARGE** est sûre (successeurs (1,2),(2,2) ∈ W) ; POMPE est interdite (mènerait à h<1). L'impossibilité de P03 original était due à l'**ambiguïté d'observation**, non à l'état lui-même.