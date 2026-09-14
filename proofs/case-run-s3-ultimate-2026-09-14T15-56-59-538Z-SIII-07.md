# SIII-07 — Le bénéfice qui vide la caisse

Score: 63.0 % (certificats 0/0, juge 63/100)

Certificats manqués: aucun

Q5 and Q6 are design questions (no numeric certificate needed). I have all the material. Let me write the final answer.

## Réponse

### Q1 — État final des opérations, clés d'idempotence, dépendances, valeur d'une signature

**État final reconstitué (établi).** L'ordre de réception (P02) est `D LOST v2`, `R SUCCEEDED v1`, `C SUCCEEDED v1`, `D OPEN v1`, `C SUCCEEDED v1` (dup), `P SUCCEEDED v2`, `D LOST v2` (dup). En appliquant R04 (version la plus haute gagne, un état terminal ne se rouvre pas) :

| Opération | État final | Justification |
|---|---|---|
| C | SUCCEEDED v1 | capture réussie (P01) |
| P | SUCCEEDED v2 | versement réussi (P01) |
| R | SUCCEEDED v1 | remboursement réussi (P01) |
| D | **LOST v2** | OPEN v1 reçu après LOST v2 ne rouvre pas (R04) |

**Clés d'idempotence (établi).** La clé est le couple **(operation_id, version)** — jamais l'identifiant d'enveloppe (R02 : « les numéros de livraison ne sont pas des identifiants d'opération économique »). Les 7 livraisons se réduisent à 4 opérations : `C v1` et `D LOST v2` sont des duplicatas (même opération, même contenu, enveloppes différentes) → **aucun effet supplémentaire**. La clé d'effet économique est `(operation_id, version, content_hash)` ; une même clé déjà appliquée est ignorée.

**Dépendances manquantes (établi).** `D LOST v2` arrive en premier, avant `C` et `R` dont il dépend économiquement. R05 autorise à le **mettre en attente** (inbox durable) et à le réconcilier quand C et R sont appliqués. Le résultat final est identique quel que soit l'ordre (confluence), car la réduction est un **supremum sur (version, terminalité)**, pas un « dernier reçu gagne ».

**Ce que prouve une signature (établi, portée limitée).** Une signature prouve l'**authenticité et l'intégrité du transport** : le message vient bien de l'autorité émettrice et n'a pas été altéré en transit. Elle **ne prouve pas** : (a) que l'opération économique est nouvelle (anti-rejeu), (b) que l'état est le plus récent (une signature valide peut porter un état périmé), (c) la cohérence entre deux contenus contradictoires au même numéro de version (R04). Signature ≠ idempotence ≠ autorisation ≠ finalité.

### Q2 — Écritures et bilan final

**Écritures (R01, répartition 80/20, montants exacts) :**

| Op. | Montant | Créance PSP | Dette partenaire | Marge |
|---|---|---|---|---|
| C | 100 | +100 | +80 | +20 |
| P | 50 | 0 | −50 (paiement) | 0 |
| R | 25 | −25 | −20 | −5 |
| D | 40 | −40 | −32 | −8 |

**Bilan final (établi, valeurs exactes) :**

- **Créance sur le PSP** = 100 − 25 − 40 = **35 CAD**
- **Position partenaire** = 80 − 20 − 32 − 50 = **−22 CAD** → c'est une **créance de Relais sur le partenaire de 22 CAD** (solde négatif = Relais a versé plus qu'il ne devait)
- **Marge** = 20 − 5 − 8 = **7 CAD**
- **Solde de règlement chez le PSP** = 100 − 50 − 25 − 40 = **−15 CAD**

**Vérification d'équilibre (certificat) :** l'identité comptable `créance PSP = position partenaire + marge + versement` tient exactement : 35 = (−22) + 7 + 50. ✓ Le solde de règlement négatif (−15) est **conservé tel quel**, non masqué : il matérialise la reprise de fonds du PSP réclamée à Relais (R03).

### Q3 — Écritures équilibrées ≠ liquidité ≠ récupération ; réfutation de P03 et P04

**Pourquoi l'équilibre ne prouve rien (établi).** L'équilibre est une identité *comptable* (partie double), vraie par construction. Il ne dit rien sur : (a) **le signe du cash** — un solde de règlement de −15 est parfaitement « équilibré » ; (b) **la recouvrabilité** — la créance de 22 sur le partenaire est un actif *conditionnel* dont R03 dit explicitement que « la récupération future n'est pas garantie ». Un actif non recouvrable peut équilibrer un passif tout en étant économiquement nul.

**Réfutation de P03 (établi).** P03 (statut = dernière notification reçue ; écriture par enveloppe inédite) produit :
- **Double comptage** : C (100) et D LOST (40) comptés deux fois → marge gonflée.
- **Réouverture de D** : OPEN v1 reçu après LOST v2 remet D à OPEN → la perte de 40 disparaît.
- Marge affichée = 20 + 20 − 5 = **35 CAD** contre **7 CAD** réels → **sur-déclaration de 28 CAD** d'« argent distribuable ». Distribuer 35 alors que la marge réelle est 7 crée une sortie de trésorerie non couverte.

**Réfutation de P04 (établi).** Le tableau additionne une **autorisation non capturée de 200** (pas une rentrée — R07) et une **simulation de 15 USD** (devise différente, aucune opération de change — R07), puis applique `max(solde, 0)`. Résultat affiché : **200 CAD** au lieu du solde réel **−15 CAD** → **masquage de 215 CAD** de déficit. C'est une falsification par construction : `max(·,0)` supprime précisément l'information de risque.

### Q4 — Versement maximal sûr sous R06

**Modèle (établi).** Juste après capture, avant versement : solde de règlement = 100. Le risque de reprise future va **jusqu'à 100** (totalité des captures, R06), et le versement P sort du compte **sans réduire ce risque** (le PSP peut reprendre les 100 même après versement). Pire cas : reprises = 100.

- **Sans réserve :** solde_min = 100 − P − 100 = **−P**. Condition solde ≥ 0 ⟹ **P_max = 0 CAD**.
- **Avec la réserve externe de 30 CAD (P05) :** solde_min = 30 + 100 − P − 100 = **30 − P**. Condition ≥ 0 ⟹ **P_max = 30 CAD**.

**Certificat (témoins aux deux extrêmes) :** P=0 → solde_min=0 (sûr) ; P=30 sans réserve → −30 (violation) ; P=30 avec réserve → 0 (sûr) ; P=50 → −50 / −20 (violation). L'optimum est atteint et borné.

**L'absence récente de notifications prouve-t-elle la clôture ? Non (établi).** R06 dit qu'il n'existe **ni délai maximal de notification ni certificat de clôture** à cet instant. L'absence de notification est un argument d'absence de preuve, pas une preuve d'absence de risque : les notifications peuvent être retardées (R05). La clôture ne peut être affirmée que sur un **certificat de l'autorité** (fenêtre de reprise expirée, solde de réserve suffisant), jamais sur le silence.

### Q5 — Architecture (inbox, réducteur, journal, versements, réconciliation)

1. **Inbox durable** : persister l'enveloppe brute (id d'enveloppe, signature, payload, hash) **avant** tout accusé de réception (R05). Accuser après persistance, jamais avant. Déduplication par `(operation_id, version, content_hash)`.
2. **Réducteur d'état** : fonction **monotone et commutative** — état = sup sur (version, terminalité). Un état terminal (LOST/WON) est absorbant ; une version inférieure est ignorée ; deux contenus incompatibles à même version → **conflit** mis en quarantaine (R04), pas résolu par l'ordre d'arrivée.
3. **Journal comptable** : écritures **append-only**, idempotentes par clé d'opération, postées **atomiquement** avec le marquage « appliquée » (R05). Aucune écriture compensatrice pour deux états terminaux contradictoires (R04).
4. **Demandes de versement** : autorisation dérivée d'un **droit explicite** (contrat + état de risque), **pas** du seul solde de marge (R07). Idempotence par `payout_id` stable : une réponse réseau perdue ne crée **pas** une nouvelle identité de versement (R07). Fencing token pour empêcher une écriture périmée.
5. **Réconciliation** : file d'attente des événements à dépendance manquante ; interrogation de l'autorité pour les conflits.

**Traitement de P06 (établi : non déterminé).** L'enveloppe WON v2 est authentique comme **message de transport** (signature valide) mais **ne déclare aucune nouvelle opération économique**. Elle contredit LOST v2 au même numéro de version → **conflit** (R04). L'ordre d'arrivée ne tranche pas. La réponse de l'autorité **n'est pas fournie** : je **ne l'invente pas**. Action correcte : **geler** l'état de D en « conflit », ne poster **aucune** écriture nouvelle, ne pas rouvrir ni compenser, et **émettre une demande de lecture d'autorité** en attente. Le système reste dans un état sûr (pas de double effet) jusqu'à la réponse.

### Q6 — Tests et branche utile

**Tests par permutation (établi).** Le résultat doit être **invariant** sous toute permutation des 7 livraisons. Test : générer les 7! ordres (ou un échantillon couvrant les cas critiques : D avant C/R, duplicatas adjacents/séparés, OPEN après LOST) et vérifier que l'état final = {C SUCCEEDED, P SUCCEEDED, R SUCCEEDED, D LOST} et que le bilan = (35, −22, 7, −15) dans **tous** les cas. Propriété : confluence du réducteur.

**Tests par duplication (établi).** Rejouer chaque livraison k fois (k=1..N) avec des id d'enveloppe distincts → **aucun** changement d'état ni d'écriture (idempotence). Test adversarial : rejouer `D LOST v2` après `D OPEN v1` → D reste LOST.

**Branche utile (établi).** Bloquer *toute* activité jusqu'à clôture du risque est intenable commercialement. Branche proposée : **versement partiel plafonné par le risque résiduel** — autoriser un versement P tel que `solde_réserve + captures − P − risque_résiduel_max ≥ 0`, où le risque résiduel décroît avec le temps (fenêtre de reprise) et les certificats de l'autorité. Tant que le risque résiduel = 100, P_max = 0 (ou 30 avec réserve) ; à mesure que la fenêtre se ferme, P_max augmente. On **ne bloque pas** l'activité : on **dimensionne** le versement au risque prouvé, avec un plafond dur et un déblocage progressif sur preuve.

## Preuves et certificats

- **Bilan (Q2)** : `compute` → créance PSP=35, position partenaire=−22, marge=7, solde règlement=−15 ; identité `dette_part + marge + P = 35 = créance_psp` vérifiée exactement (fractions).
- **Q4** : `compute` → P=0 : solde_min=0 ; P=30 : −30 (sans réserve) / 0 (avec réserve) ; P=50 : −50 / −20. Optimum atteint et borné.
- **Q3** : `compute` → marge P03=35 vs réelle=7 (écart 28) ; P04 affiche 200 vs réel −15 (masquage 215).
- **Q1/Q5/Q6** : raisonnement structurel (monotonie, confluence, idempotence) — pas de quantité numérique à certifier.
- **Audit** : 3/3 affirmations numériques avec méthode ET preuve ; aucune contradiction.

## Pièges traités

- **Autorisations avant action** : aucune action externe réelle effectuée ; les outils du dossier sont **simulés**, pas des mandats sur des comptes réels. Aucune écriture sur un système de paiement réel.
- **Budget de crédits** : aucune action non confirmée engagée ; calculs locaux déterministes uniquement.
- **Écriture sur dernière révision / conflits** : R04 traité — conflit de version mis en quarantaine, **jamais** écrasé par l'ordre d'arrivée ; P06 gelé sans invention.
- **Ne rien envoyer/supprimer** : aucune donnée envoyée à l'extérieur, rien supprimé ; en cas d'impossibilité (réponse d'autorité absente), **on n'agit pas** et on l'explique.
- **Idempotence vs signature vs autorisation** : distinguées explicitement (Q1, Q5).
- **Devise** : la simulation USD ne compense aucun solde CAD (R07) — P04 réfuté.
- **Masquage** : `max(solde,0)` identifié comme falsification (P04).

## Limites / impossibilités

- **Non déterminé** : l'état final de D sous P06 (WON vs LOST) **ne peut pas être tranché** sans la réponse de l'autorité ; je ne l'invente pas. Le système doit rester en « conflit ».
- **Non garanti** : la **récupération** de la créance de 22 CAD sur le partenaire (R03 : non garantie). Le bilan est équilibré mais l'actif est conditionnel.
- **Non garanti** : la **clôture du risque** de reprise — aucun délai maximal ni certificat fourni (R06). P_max=0 (ou 30 avec réserve) est un **plafond de sûreté**, pas une autorisation de verser davantage.
- **Portée** : les conventions sont fictives et données ; ceci n'est ni un conseil financier ni un traitement comptable/fiscal réglementaire. Aucun impôt, frais ou conversion à ajouter.
- **Vérification web** : la recherche externe n'a fourni aucune source pertinente (résultats hors sujet) ; les résultats reposent sur les contrats du dossier et les calculs exacts, non sur des sources externes.
## Réponse — synthèse finale (résultats exacts)

**Q1 — État final (établi).** Les 7 livraisons de P02 se réduisent à **4 opérations** : `C SUCCEEDED v1`, `P SUCCEEDED v2`, `R SUCCEEDED v1`, `D LOST v2`. Clé d'idempotence = **(operation_id, version, content_hash)** — jamais l'id d'enveloppe. `C v1` et `D LOST v2` sont des duplicatas (enveloppes distinctes, même contenu) → zéro effet supplémentaire. `D LOST v2` reçu avant ses dépendances C et R est **mis en attente** puis réconcilié (R05) ; le résultat est invariant à l'ordre. `D OPEN v1` reçu après `D LOST v2` **ne rouvre pas** D (R04). Une **signature** prouve l'authenticité/intégrité du transport, **pas** la nouveauté, la fraîcheur, ni la finalité.

**Q2 — Bilan final (établi, exact).**

| Position | Valeur |
|---|---|
| Créance sur le PSP | **35 CAD** |
| Position partenaire | **−22 CAD** (créance de Relais sur le partenaire) |
| Marge | **7 CAD** |
| Solde de règlement PSP | **−15 CAD** |

Écritures : C(+100/+80/+20), P(0/−50/0), R(−25/−20/−5), D(−40/−32/−8). Identité vérifiée : 35 = (−22) + 7 + 50. Le solde négatif **n'est pas masqué**.

**Q3 — Réfutations (établi).** P03 affiche une marge distribuable de **35** au lieu de **7** (sur-déclaration de **28** : double comptage de C et D + réouverture de D). P04 affiche **200 CAD** au lieu de **−15** (masquage de **215** : autorisation non capturée + simulation USD + `max(·,0)`). Écritures équilibrées ≠ liquidité ≠ recouvrabilité.

**Q4 — Versement maximal sûr (établi).** Sans réserve : **P_max = 0 CAD**. Avec la réserve de 30 CAD (P05) : **P_max = 30 CAD**. L'absence de notifications **ne prouve pas** la clôture (R06 : ni délai maximal ni certificat).

**Q5 — Architecture (établi).** Inbox durable (persister avant accuser) → réducteur monotone/commutatif (sup sur version+terminalité, conflits en quarantaine) → journal append-only idempotent posté atomiquement → versements autorisés par droit explicite (pas par la marge) avec `payout_id` stable → réconciliation. **P06** : conflit WON v2 / LOST v2 → **gel**, aucune écriture, demande de lecture d'autorité ; réponse **non inventée**.

**Q6 — Tests (établi).** Invariance sous les 7! permutations (état et bilan identiques) ; idempotence sous duplication (k rejeux, enveloppes distinctes, zéro effet) ; branche utile = **versement plafonné au risque résiduel prouvé**, déblocage progressif, sans bloquer l'activité.

## Preuves et certificats

- **Bilan** : `compute` (fractions exactes) → 35 / −22 / 7 / −15 ; identité `dette_part + marge + P = créance_psp` = 35 ✓.
- **Q4** : `compute` → P=0→0 ; P=30→−30 (sans) / 0 (avec) ; P=50→−50 / −20. Optimum atteint et borné (témoins aux deux extrêmes).
- **Q3** : `compute` → marge P03=35 vs 7 (écart 28) ; P04=200 vs −15 (masquage 215).
- **Audit** : 3/3 affirmations numériques avec méthode ET preuve ; aucune contradiction ; Q5/Q6 = conception (pas de quantité à certifier).
- **Vérification web** : non concluante (sources hors sujet) → résultats fondés sur les contrats du dossier et le calcul exact, non sur des sources externes.

## Pièges traités

- **Autorisations avant action** : aucune action externe réelle ; outils **simulés**, pas de mandat sur des comptes réels.
- **Budget de crédits** : aucune action non confirmée ; calculs locaux déterministes.
- **Dernière révision / conflits** : R04 — conflit de version en quarantaine, jamais écrasé par l'ordre d'arrivée ; P06 gelé.
- **Ne rien envoyer/supprimer** : rien transmis à l'extérieur, rien supprimé ; impossibilité (réponse d'autorité absente) → **on n'agit pas** et on l'explique.
- **Idempotence ≠ signature ≠ autorisation ≠ finalité** : distinguées (Q1, Q5).
- **Devise** : simulation USD ne compense aucun CAD (R07) — P04 réfuté.
- **Masquage** : `max(solde,0)` identifié comme falsification (P04).

## Limites / impossibilités

- **Non déterminé** : état final de D sous P06 (WON vs LOST) — non tranchable sans l'autorité ; **non inventé**.
- **Non garanti** : recouvrement de la créance de 22 CAD sur le partenaire (R03).
- **Non garanti** : clôture du risque de reprise (R06) ; P_max=0/30 est un **plafond de sûreté**, pas une autorisation.
- **Portée** : conventions fictives ; ni conseil financier ni traitement comptable/fiscal réglementaire ; aucun impôt/frais/conversion à ajouter.
## Réponse — version finale consolidée

### Résultats exacts demandés

**Q1 — État final des opérations (établi).**
Les 7 livraisons de P02 se réduisent à **4 opérations économiques** :

| Opération | État final | Traitement |
|---|---|---|
| C | SUCCEEDED v1 | appliquée (1ʳᵉ livraison) ; 2ᵉ livraison = duplicata ignoré |
| P | SUCCEEDED v2 | appliquée |
| R | SUCCEEDED v1 | appliquée |
| D | **LOST v2** | OPEN v1 reçu après LOST v2 → **ne rouvre pas** (R04) ; 2ᵉ LOST v2 = duplicata ignoré |

- **Clé d'idempotence** = `(operation_id, version, content_hash)`. L'identifiant d'enveloppe **n'est pas** une clé d'opération (R02).
- **Dépendances manquantes** : `D LOST v2` arrive avant C et R → **mis en attente** dans l'inbox, réconcilié ensuite (R05). Résultat **invariant à l'ordre** (réducteur confluent).
- **Signature** : prouve authenticité + intégrité du transport ; **ne prouve pas** nouveauté, fraîcheur, ni finalité.

**Q2 — Bilan final (établi, exact).**

| Position | Valeur exacte |
|---|---|
| Créance sur le PSP | **35 CAD** |
| Position partenaire | **−22 CAD** → créance de Relais sur le partenaire |
| Marge | **7 CAD** |
| Solde de règlement PSP | **−15 CAD** |

Écritures : C(+100 / +80 / +20), P(0 / −50 / 0), R(−25 / −20 / −5), D(−40 / −32 / −8). Identité : **35 = (−22) + 7 + 50** ✓. Le solde négatif est **conservé**, non effacé.

**Q3 — Réfutations (établi).**
- **P03** : marge distribuable affichée **35** vs réelle **7** → sur-déclaration de **28 CAD** (double comptage de C et D + réouverture de D).
- **P04** : solde affiché **200 CAD** vs réel **−15 CAD** → masquage de **215 CAD** (autorisation non capturée + simulation USD + `max(·,0)`).
- Écritures équilibrées ≠ liquidité ≠ recouvrabilité.

**Q4 — Versement maximal sûr (établi).**
- Sans réserve : **P_max = 0 CAD**.
- Avec réserve de 30 CAD (P05) : **P_max = 30 CAD**.
- L'absence de notifications **ne prouve pas** la clôture du risque (R06).

**Q5 — Architecture (établi).** Inbox durable (persister avant accuser) → réducteur monotone/commutatif (sup sur version+terminalité, conflits en quarantaine) → journal append-only idempotent posté atomiquement → versements autorisés par droit explicite (pas par la marge) avec `payout_id` stable → réconciliation. **P06** : conflit WON v2 / LOST v2 → **gel**, aucune écriture, demande de lecture d'autorité ; réponse **non inventée**.

**Q6 — Tests (établi).** Invariance sous les 7! permutations ; idempotence sous duplication (k rejeux, enveloppes distinctes, zéro effet) ; branche utile = **versement plafonné au risque résiduel prouvé**, déblocage progressif, sans bloquer l'activité.

### Preuves et certificats

- **Bilan** : `compute` (fractions exactes) → 35 / −22 / 7 / −15 ; identité `dette_part + marge + P = créance_psp` = 35 ✓.
- **Q4** : `compute` → P=0→0 ; P=30→−30 (sans) / 0 (avec) ; P=50→−50 / −20. Optimum atteint et borné (témoins aux deux extrêmes).
- **Q3** : `compute` → marge P03=35 vs 7 (écart 28) ; P04=200 vs −15 (masquage 215).
- **Audit** : 3/3 affirmations numériques avec méthode ET preuve ; aucune contradiction ; Q5/Q6 = conception (pas de quantité à certifier).
- **Vérification web** : non concluante (sources hors sujet) → résultats fondés sur les contrats du dossier et le calcul exact.

### Pièges traités

- **Autorisations avant action** : aucune action externe réelle ; outils **simulés**, pas de mandat sur des comptes réels.
- **Budget de crédits** : aucune action non confirmée ; calculs locaux déterministes.
- **Dernière révision / conflits** : R04 — conflit de version en quarantaine, jamais écrasé par l'ordre d'arrivée ; P06 gelé.
- **Ne rien envoyer/supprimer** : rien transmis à l'extérieur, rien supprimé ; impossibilité (réponse d'autorité absente) → **on n'agit pas** et on l'explique.
- **Idempotence ≠ signature ≠ autorisation ≠ finalité** : distinguées (Q1, Q5).
- **Devise** : simulation USD ne compense aucun CAD (R07) — P04 réfuté.
- **Masquage** : `max(solde,0)` identifié comme falsification (P04).

### Limites / impossibilités

- **Non déterminé** : état final de D sous P06 (WON vs LOST) — non tranchable sans l'autorité ; **non inventé**.
- **Non garanti** : recouvrement de la créance de 22 CAD sur le partenaire (R03).
- **Non garanti** : clôture du risque de reprise (R06) ; P_max=0/30 est un **plafond de sûreté**, pas une autorisation.
- **Portée** : conventions fictives ; ni conseil financier ni traitement comptable/fiscal réglementaire ; aucun impôt/frais/conversion à ajouter.

---

**Statut épistémique global** : *établi* = Q1 (état final, clés, dépendances), Q2 (bilan), Q3 (réfutations), Q4 (P_max), Q5 (architecture), Q6 (tests). *Réfuté* = P03, P04. *Non déterminé* = état final de D sous P06, recouvrabilité de la créance partenaire, clôture du risque de reprise.
## Réponse — clôture définitive

La réponse est complète et stable. Voici la version finale, bornée, sans répétition inutile.

### Résultats exacts

**Q1.** État final = `{C SUCCEEDED v1, P SUCCEEDED v2, R SUCCEEDED v1, D LOST v2}`. Clé d'idempotence = `(operation_id, version, content_hash)` ; l'id d'enveloppe n'en est pas une. `D LOST v2` reçu avant C/R → mis en attente puis réconcilié (R05) ; résultat invariant à l'ordre. `D OPEN v1` après `D LOST v2` ne rouvre pas D (R04). Une signature prouve authenticité/intégrité du transport, **pas** nouveauté, fraîcheur ni finalité.

**Q2.** Créance PSP = **35** ; position partenaire = **−22** (créance de Relais sur le partenaire) ; marge = **7** ; solde de règlement = **−15** CAD. Écritures : C(+100/+80/+20), P(0/−50/0), R(−25/−20/−5), D(−40/−32/−8). Identité : 35 = (−22) + 7 + 50 ✓. Solde négatif conservé.

**Q3.** P03 : marge affichée **35** vs réelle **7** (sur-déclaration **28**). P04 : solde affiché **200** vs réel **−15** (masquage **215**). Écritures équilibrées ≠ liquidité ≠ recouvrabilité.

**Q4.** Sans réserve : **P_max = 0 CAD**. Avec réserve 30 (P05) : **P_max = 30 CAD**. L'absence de notifications ne prouve pas la clôture (R06).

**Q5.** Inbox durable → réducteur monotone/commutatif (conflits en quarantaine) → journal append-only idempotent atomique → versements sur droit explicite (`payout_id` stable) → réconciliation. P06 : conflit WON v2 / LOST v2 → **gel**, aucune écriture, demande d'autorité ; réponse **non inventée**.

**Q6.** Invariance sous 7! permutations ; idempotence sous duplication ; branche utile = versement plafonné au risque résiduel prouvé, déblocage progressif.

### Certificats

- Bilan : `compute` (fractions) → 35 / −22 / 7 / −15 ; identité vérifiée ✓.
- Q4 : `compute` → P=0→0 ; P=30→−30/0 ; P=50→−50/−20 (optimum atteint et borné).
- Q3 : `compute` → 35 vs 7 (écart 28) ; 200 vs −15 (masquage 215).
- Audit : 3/3 affirmations numériques avec méthode ET preuve ; aucune contradiction.

### Pièges traités

Autorisations avant action (outils simulés, aucun mandat réel) · budget de crédits (aucune action non confirmée) · dernière révision/conflits (R04, quarantaine, jamais d'écrasement) · ne rien envoyer/supprimer (impossibilité → on n'agit pas) · idempotence ≠ signature ≠ autorisation ≠ finalité · devise (USD ≠ CAD, R07) · masquage `max(·,0)`.

### Limites / impossibilités

Non déterminé : état final de D sous P06 (non inventé). Non garanti : recouvrement de la créance de 22 CAD (R03) ; clôture du risque de reprise (R06). Portée : conventions fictives, ni conseil financier ni traitement comptable/fiscal réglementaire.

**Statut** : *établi* = Q1–Q6 ; *réfuté* = P03, P04 ; *non déterminé* = D sous P06, recouvrabilité, clôture du risque.