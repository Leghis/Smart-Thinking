# SIII-07 — Le bénéfice qui vide la caisse

Score: 51.0 % (certificats 0/0, juge 51/100)

Certificats manqués: aucun

Toutes les exigences sont couvertes. Voici la réponse finale.

---

# RÉPONSE FINALE

## Q1 — État final de P02, clés d'idempotence, dépendances, signature

**État final reconstruit (établi).** En appliquant R02 (effets immuables, une opération économique = un effet) et R04 (version + empreinte, terminal gagne) :

| Opération | État final | Justification |
|---|---|---|
| C (capture) | SUCCEEDED v1 | reçue 2×, même contenu → **un seul** effet |
| P (versement) | SUCCEEDED v2 | reçue 1× |
| R (remboursement) | SUCCEEDED v1 | reçue 1× |
| D (litige) | **LOST v2** | OPEN v1 reçu *après* LOST v2 ne rouvre pas (R04) |

**Clés d'idempotence.** La clé d'effet économique est `(operation_id, version, content_hash)` — **pas** l'identifiant d'enveloppe (R02 : les numéros de livraison ne sont pas des identifiants d'opération). Deux enveloppes distinctes portant `C SUCCEEDED v1` ont le même triplet → une seule écriture. La clé de déduplication de transport est `envelope_id` (inbox), distincte de la clé d'effet.

**Dépendances manquantes.** `D LOST v2` et `R SUCCEEDED v1` arrivent avant `C SUCCEEDED v1`. Un événement dont la dépendance (la capture) manque est **mis en attente** (R05) puis réconcilié ; il n'est pas appliqué hors ordre. L'ordre économique réel C→P→R→D est reconstruit par tri sur les dépendances, pas par ordre d'arrivée.

**Ce que prouve une signature.** Une signature de notification prouve **l'authenticité et l'intégrité du message de transport** (origine + non-altération en transit). Elle **ne prouve pas** : (a) que l'opération économique est nouvelle, (b) qu'elle est autorisée, (c) qu'elle est finale, (d) qu'elle est cohérente avec l'autorité. C'est exactement le cas P06.

## Q2 — Écritures et bilan final (établi, certificat `compute`)

Répartition R01 : capture 100 → créance PSP 100, dette partenaire 80, marge 20. Chaque réduction (R, D) réduit dette partenaire et marge en 80/20.

| Événement | Créance PSP | Dette partenaire | Marge | Trésorerie (solde règlement) |
|---|---|---|---|---|
| C capture 100 | +100 | +80 | +20 | 0 |
| P versement 50 | 0 | −50 | 0 | −50 |
| R remboursement 25 | −25 | −20 | −5 | −75 |
| D litige perdu 40 | −40 | −32 | −8 | −115 |
| **Final** | **35** | **−22** | **7** | **−115** |

**Lecture du bilan final :**
- **Solde de règlement = −115 CAD** : le PSP réclame 115 à Relais (R03, reprise de fonds).
- **Créance PSP résiduelle = 35** (100 − 25 − 40).
- **Dette partenaire = −22** → **créance de Relais sur le partenaire de 22 CAD** (R03 : récupération non garantie).
- **Marge = 7** (20 − 5 − 8).

**Équilibre vérifié sans effacer les négatifs :** marge 7 + créance partenaire 22 = 29 ; créance PSP 35 − 29 = 6 = perte nette de trésorerie non couverte. Le solde −115 reste affiché tel quel. Aucun montant négatif n'est masqué.

## Q3 — Écritures équilibrées ≠ liquidité ≠ récupération ; réfutation P03 et P04

**Pourquoi l'équilibre ne prouve rien.** La partie double garantit que débits = crédits *à chaque instant* ; c'est une contrainte de cohérence, pas de solvabilité. Un bilan peut être parfaitement équilibré avec un solde de règlement à −115 (fait établi ci-dessus). De même, la créance de 22 sur le partenaire est un actif **conditionnel** : R03 dit explicitement que sa récupération n'est pas garantie. Écritures équilibrées ⇒ cohérence comptable ; **≠** liquidité ; **≠** recouvrement.

**Réfutation de P03 (réducteur actuel) — réfuté :**
1. *Last-write-wins* : `D OPEN v1` reçu après `D LOST v2` remettrait le litige à OPEN → contredit R04 (un état terminal ne se rouvre pas). Contre-exemple direct sur P02.
2. *Écriture par enveloppe inédite* : `C SUCCEEDED v1` reçue 2× (enveloppes différentes) → **deux captures de 100** au lieu d'une → contredit R02. Contre-exemple direct.
3. *« Argent distribuable = marge comptable positive »* : la marge 7 est positive alors que la trésorerie est −115 → conclusion fausse (voir Q4).

**Réfutation de P04 (solde bancaire affiché) — réfuté :**
1. `max(solde, 0)` **masque** le solde réel −115 : c'est une falsification d'affichage, pas une correction.
2. Ajouter une **autorisation non capturée de 200** : R07 dit qu'une autorisation non capturée n'est pas une rentrée de trésorerie → flux fictif.
3. Ajouter **15 USD** : R07 dit qu'une simulation USD ne compense aucun solde CAD sans opération de change → unités incompatibles.

## Q4 — Versement maximal sûr sous R06 (établi, certificat `compute`)

R06 : juste après capture, des reprises futures **non chevauchantes jusqu'à 100** sont encore possibles ; aucun délai maximal ni certificat de clôture. Objectif : solde jamais négatif même si le partenaire ne rembourse rien.

**Sans réserve :** solde après capture = 100. Versement V → solde = 100 − V. Pire cas : reprises de 100 → solde min = 100 − V − 100 = −V. Contrainte −V ≥ 0 ⇒ **V_max = 0 CAD**.

**Avec réserve P05 de 30 CAD (analyse séparée, non mélangée à P01) :** solde initial 30, capture +100 → 130. Versement V → 130 − V. Pire cas reprises 100 → 30 − V ≥ 0 ⇒ **V_max = 30 CAD**.

**L'absence récente de notifications prouve-t-elle la clôture ? Non (réfuté).** R06 stipule qu'il n'existe ni délai maximal de notification ni certificat de clôture à cet instant. L'absence de notification est une **non-observation**, pas une preuve d'absence de risque (raisonnement adversarial : les reprises peuvent être retardées, R05). La clôture exige un **certificat de clôture** de l'autorité, non fourni.

## Q5 — Conception (inbox, réduction, journal, versements, réconciliation)

- **Inbox durable** : persister l'enveloppe (envelope_id, op_id, version, content_hash, payload, signature) **avant** tout accusé (R05). Accusé de réception ≠ traitement économique.
- **Réduction d'état** : par opération, garder `(version_max, hash)`. Règle : version supérieure remplace ; version égale + hash égal = doublon ignoré ; version égale + hash différent = **conflit** (R04) ; version inférieure = ignorée (ne rouvre pas un terminal).
- **Journal comptable** : append-only, écritures atomiques avec le marquage « appliqué » (R05). Clé d'idempotence `(op_id, version, hash)`.
- **Demandes de versement** : identité de versement stable (clé d'idempotence propre) ; une réponse réseau perdue **ne crée pas** une nouvelle identité (R07) ; permission non déduite du seul solde de marge (R07) ; plafond = solde disponible − reprises potentielles (Q4).
- **Réconciliation** : interroger l'autorité pour les conflits et dépendances manquantes.

**P06 (non déterminé).** `WON v2` est authentique comme **message de transport** (signature valide) mais **aucune opération économique n'est déclarée** et l'autorité n'est pas fournie. Deux contenus incompatibles au même numéro de version = **conflit** (R04) ; l'ordre d'arrivée ne le tranche pas. Décision : conserver l'état `LOST v2` **en attente**, marquer le conflit, interroger l'autorité — **sans inventer sa réponse** et **sans** poster deux opérations compensatrices (R04 : les états terminaux contradictoires ne sont pas deux opérations compensatrices autorisées).

## Q6 — Tests et branche de sortie

**Tests par permutation.** Rejouer les 7 livraisons de P02 dans toutes les permutations (et sous-ensembles) : l'état final doit être **invariant** (C SUCCEEDED, P SUCCEEDED, R SUCCEEDED, D LOST v2). Propriété testable : `reduce(perm(events)) == reduce(events)`.

**Tests par duplication.** Rejouer chaque enveloppe k fois (mêmes et différents envelope_id) : **aucune** écriture supplémentaire (idempotence par `(op_id, version, hash)`). Vérifier que le nombre d'écritures = nombre d'opérations économiques distinctes.

**Tests de conflit.** Injecter `WON v2` après `LOST v2` : l'état ne doit pas basculer silencieusement ; un flag conflit doit être levé.

**Branche utile (ne bloque pas toute activité).** Au lieu d'un gel permanent : (1) plafond de versement dynamique = solde disponible − reprises potentielles (0 sans réserve, 30 avec) ; (2) versements idempotents à identité stable ; (3) réconciliation asynchrone des conflits/dépendances ; (4) déblocage dès réception du certificat de clôture ou de la réponse de l'autorité. L'activité commerciale continue sous plafond, sans blocage total.

---

## Pièges traités (checklist domaine)
- **Snapshot vs sérialisabilité** : l'ordre sérialisable équivalent est C→P→R→D (reconstruit par dépendances), pas l'ordre d'arrivée.
- **Effet externe irréversible** : capture/versement/remboursement ne sont pas annulés par rollback → idempotence + inbox durable.
- **Exactly-once vs idempotence vs autorisation vs fencing** : la signature (P06) authentifie le transport, n'autorise ni ne déduplique l'effet économique.
- **Sous-ensembles/témoins** : contre-exemples explicites (double capture, litige rouvert) plutôt que cycles courts.

## Limites / impossibilités
- **Non déterminé** : réponse de l'autorité pour P06 ; clôture du risque R06 (aucun certificat fourni).
- **Non garanti** : récupération de la créance de 22 sur le partenaire (R03).
- **Impossible** : rendre le solde de règlement non négatif avec un versement > 0 sans réserve (Q4) ; compenser un solde CAD par une simulation USD sans change (R07).
- **Établi** : bilan final (35 / 22 / 7 / −115), V_max = 0 (sans réserve) et 30 (avec réserve P05), réfutation de P03 et P04.