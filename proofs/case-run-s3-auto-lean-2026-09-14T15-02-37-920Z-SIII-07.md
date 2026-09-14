# SIII-07 — Le bénéfice qui vide la caisse

Score: 97.0 % (certificats 0/0, juge 97/100)

Certificats manqués: aucun

Toutes les exigences sont couvertes. Voici la réponse finale.

---

# Réponse — Mission Relais

## Cadre et invariants globaux

**Invariants du dossier (valables partout) :**
- **I1 (partie double R01)** : toute capture de 100 crée créance PSP 100 = dette partenaire 80 + marge 20 ; tout remboursement/litige perdu de montant *m* réduit dette partenaire de 0,8·*m* et marge de 0,2·*m*. Donc **dette partenaire + marge = créance PSP** à tout instant.
- **I2 (immuabilité R02)** : un effet confirmé ne se rejoue pas ; un état final reçu *n* fois = 1 effet. Le numéro de livraison n'est **pas** un identifiant d'opération.
- **I3 (finalité R04)** : par opération, la version la plus haute gagne ; un état terminal n'est pas rouvert par une version inférieure ; deux contenus incompatibles **au même numéro de version** = conflit, non tranché par l'ordre d'arrivée.
- **I4 (trésorerie R03)** : le compte de règlement peut devenir négatif ; un solde partenaire négatif = créance Relais **non garantie** ; pas de réserve cachée.
- **I5 (R07)** : autorisation non capturée ≠ trésorerie ; USD ≠ CAD sans opération de change ; une réponse réseau perdue n'autorise pas une nouvelle identité de versement.

---

## Q1 — État final de P02, idempotence, dépendances, signature

**Clés d'idempotence.** La clé correcte est le couple **(operation_id, version)** complété par l'**empreinte de contenu (content_hash)**. Le `delivery_id`/numéro d'enveloppe est explicitement disqualifié (R02). Deux livraisons de `C SUCCEEDED v1` avec enveloppes différentes = **une** opération.

**Réduction d'état (par opération, version max gagne) :**

| Opération | Notifications reçues | État retenu |
|---|---|---|
| C | SUCCEEDED v1, SUCCEEDED v1 (dup) | **SUCCEEDED v1** |
| P | SUCCEEDED v2 | **SUCCEEDED v2** |
| R | SUCCEEDED v1 | **SUCCEEDED v1** |
| D | LOST v2, OPEN v1, LOST v2 (dup) | **LOST v2** |

`D OPEN v1` arrive **après** `D LOST v2` : version inférieure sur une opération déjà terminale → **ignorée** (I3). Le litige reste **LOST**.

**Dépendances manquantes.** L'ordre de réception commence par `D LOST v2`, or D (litige) dépend de C (capture), et R, P dépendent aussi de C. Ces événements doivent être **mis en attente** (parking) jusqu'à réception de C, puis réconciliés — jamais appliqués « à l'aveugle » ni rejetés définitivement (R05).

**Ce que prouve une signature de notification.** Elle prouve **l'authenticité et l'intégrité du message de transport** (émetteur légitime, contenu non altéré en transit). Elle **ne prouve pas** : la véracité économique, l'unicité de l'opération, l'ordre causal, ni la finalité. Une signature valide sur un contenu contradictoire (P06) reste un simple message de transport.

**Statut : établi** (état final unique, vérifié par énumération exhaustive des permutations).

---

## Q2 — Écritures et bilan final

Ordre économique réel : **C, P, R, D**.

| Événement | Débit | Crédit |
|---|---|---|
| **C** capture 100 | Créance PSP 100 | Dette partenaire 80 ; Marge 20 |
| **P** versement 50 | Dette partenaire 50 | Solde de règlement 50 |
| **R** remboursement 25 | Dette partenaire 20 ; Marge 5 | Solde de règlement 25 |
| **D** litige perdu 40 | Dette partenaire 32 ; Marge 8 | Solde de règlement 40 |

**Soldes après chaque étape :**

| | Créance PSP | Dette partenaire | Marge | Solde règlement |
|---|---|---|---|---|
| C | 100 | 80 | 20 | 100 |
| P | 100 | 30 | 20 | 50 |
| R | 75 | 10 | 15 | 25 |
| D | 35 | **−22** | **7** | **−15** |

**Bilan final (montants négatifs conservés) :**
- **Actif** : créance sur le partenaire **22** (car dette partenaire = −22).
- **Passif** : dette envers le PSP **15** (solde de règlement négatif).
- **Capitaux propres / résultat** : marge **7**.
- **Équilibre** : 22 = 15 + 7 ✓ (vérifié par calcul).

**Lecture.** Le solde de règlement est **−15** : le PSP réclame 15 à Relais. La marge comptable est **+7**, mais elle est adossée à une créance de **22** sur le partenaire, **non garantie** (R03). Si cette créance n'est pas recouvrée, le résultat réel est 7 − 22 = **−15**, exactement le solde négatif.

**Statut : établi.**

---

## Q3 — Écritures équilibrées ≠ liquidité ≠ recouvrement ; réfutation de P03 et P04

**Pourquoi l'équilibre ne prouve rien sur la liquidité.** La partie double est une **identité comptable** (Actif = Passif + CP) qui reste vraie même quand le solde de règlement est négatif. L'équilibre ne dit rien sur *quand* et *si* les flux se réalisent : ici l'actif est une créance **illiquide et non garantie** (22), tandis que le passif (15) est une **dette exigible immédiatement** envers le PSP. Un bilan équilibré peut donc coexister avec une **insolvabilité de trésorerie**.

**Pourquoi l'équilibre ne prouve pas le recouvrement.** La créance partenaire de 22 est un droit, pas un encaissement. R03 précise que sa récupération **n'est pas garantie** ; aucune écriture ne peut transformer un droit douteux en cash.

**Réfutation de P03.** P03 calcule « argent distribuable = marge comptable positive » = 7. **Faux** : distribuer 7 reviendrait à distribuer un actif non liquide (créance 22) tout en laissant une dette exigible de 15. L'argent réellement distribuable est borné par la trésorerie disponible, ici **négative (−15)** → distribuable = **0**. P03 ignore aussi la finalité (il écrase le statut par la dernière notification reçue : sur l'ordre P02, il afficherait `D = OPEN`, ce qui est **faux** — vérifié par calcul).

**Réfutation de P04.** P04 additionne au solde de règlement (a) une **autorisation non capturée de 200** et (b) une **simulation de 15 USD**, puis masque le négatif par `max(solde, 0)`. **Faux sur trois chefs** (R07) : une autorisation non capturée n'est **pas** une rentrée de trésorerie ; 15 USD ne compense **aucun** solde CAD sans opération de change ; `max(solde, 0)` **efface** précisément l'information critique (−15). Le solde affiché est donc fictif.

**Statut : réfuté** (P03 et P04).

---

## Q4 — Versement maximal sûr sous R06

**Énoncé du risque (R06).** Juste après la capture et avant tout versement, le contrat autorise encore des **reprises futures non chevauchantes jusqu'à la totalité des 100 capturés**. Il n'existe **ni délai maximal de notification ni certificat de clôture**. Objectif : le solde de règlement ne devient **jamais** négatif, **même si le partenaire ne rembourse rien**.

**Sans réserve.** Solde après capture = 100. Pire cas : reprises cumulées = 100. Contrainte : 100 − V − 100 ≥ 0 ⟹ **V ≤ 0**. Donc **V_max = 0** : aucun versement n'est sûr.

**Avec la réserve P05 (30 CAD définitivement disponibles).** Solde après capture = 130. Contrainte : 130 − V − 100 ≥ 0 ⟹ **V ≤ 30**. Donc **V_max = 30**. La réserve est exactement le coussin ; elle ne doit **pas** être mélangée au bilan de P01 (analyse séparée).

**L'absence récente de notifications prouve-t-elle la clôture ?** **Non.** R06 stipule qu'il n'y a **ni délai maximal ni certificat de clôture** à cet instant. L'absence de notification est un argument d'ignorance, pas une preuve : des reprises peuvent encore arriver. La clôture ne serait établie que par un **certificat de clôture** ou l'expiration d'un **délai contractuel borné** — aucun n'est fourni.

**Statut : établi** (V_max = 0 sans réserve ; V_max = 30 avec réserve).

---

## Q5 — Conception : inbox, réduction, journal, versements, réconciliation

**1. Inbox durable (R05).** Table `inbox(delivery_id PK, operation_id, version, content_hash, payload, signature, received_at, status)`. Accusé de réception **après persistance**, jamais avant. Déduplication à l'entrée par `(operation_id, version, content_hash)`.

**2. Réduction d'état (R04).** Par `operation_id`, conserver la **version maximale** ; rejeter les versions inférieures ; détecter les **conflits** (même version, `content_hash` différent) → file de réconciliation, **jamais** tranchés par l'ordre d'arrivée.

**3. Journal comptable (R01/R02).** Écritures **append-only**, idempotentes par `(operation_id, version)`. L'application d'une opération et ses écritures sont **atomiques** (R05). Aucune écriture n'est postée deux fois pour la même opération.

**4. Demandes de versement (R07).** Une demande de versement porte une **identité propre** (idempotency key) ; une réponse réseau perdue **ne crée pas** une nouvelle identité (retry avec la même clé). La permission de verser **ne se déduit pas** du seul solde de marge : elle exige un contrôle de **trésorerie disponible** et de **risque de reprise** (cf. Q4).

**5. Réconciliation.** Interroger l'**autorité** pour les conflits et les dépendances manquantes ; conserver les événements en attente jusqu'à résolution.

**Traitement de P06 (WON v2 vs LOST v2).** Même litige, **même numéro de version (v2)**, contenus **incompatibles** → **conflit** au sens de R04. L'ordre d'arrivée **ne tranche pas**. La signature prouve seulement l'authenticité du transport. La réponse de l'autorité **n'est pas fournie** dans la pièce : on **ne l'invente pas**. L'état du litige reste **NON DÉTERMINÉ** jusqu'à lecture de l'autorité ; en attendant, l'opération est **gelée** (ni LOST ni WON appliqué), et le risque associé reste provisionné.

**Statut : conception établie ; P06 = non déterminé.**

---

## Q6 — Tests par permutation et duplication, et branche utile

**Test par permutation.** Rejouer **toutes** les permutations de l'ordre de réception (P02 et variantes) et vérifier que l'état final est **identique**. Résultat vérifié : **1 seul état final** sur toutes les permutations → `C=SUCCEEDED/1, P=SUCCEEDED/2, R=SUCCEEDED/1, D=LOST/2`. Le réducteur naïf (P03) échoue ce test (il produit `D=OPEN`).

**Test par duplication.** Répéter chaque événement *k* fois (k = 2, 3, …) avec des `delivery_id` distincts : l'état final doit être **inchangé**. Vérifié : duplication ×3 → état identique. Cela valide l'idempotence par `(operation_id, version, content_hash)`.

**Test de dépendance.** Livrer D/R/P **avant** C : ils doivent être **mis en attente**, puis appliqués correctement à l'arrivée de C — sans double comptage.

**Test de conflit.** Injecter deux contenus au même numéro de version → doit déclencher la **file de réconciliation**, pas une application arbitraire.

**Branche utile (ne pas bloquer toute activité).** Un **circuit breaker de risque** : au lieu d'arrêter toute activité commerciale, on **suspend uniquement les versements** au-delà du coussin sûr (V_max de Q4), on **provisionne** les reprises potentielles, et on **continue** les captures et les ventes. Le seuil se recalcule à chaque événement ; dès qu'un certificat de clôture ou un délai borné réduit le risque, les versements reprennent. C'est une **dégradation graduée** (limiter le débit de sortie) plutôt qu'un arrêt total.

**Statut : établi.**

---

## Synthèse : établi / réfuté / non déterminé

| Point | Statut |
|---|---|
| État final P02 (C/P/R/D) | **Établi** |
| Bilan : actif 22 = passif 15 + marge 7 ; solde −15 | **Établi** |
| Marge comptable +7 ≠ argent distribuable | **Établi** |
| P03 (« distribuable = marge positive ») | **Réfuté** |
| P04 (200 non capturé + 15 USD, `max(solde,0)`) | **Réfuté** |
| V_max = 0 sans réserve ; 30 avec réserve | **Établi** |
| Absence de notifications ⇒ clôture | **Réfuté** (pas de délai/certificat) |
| P06 (WON v2 vs LOST v2) | **Non déterminé** (conflit, autorité non fournie) |

## Limites / impossibilités
- La **récupération** de la créance partenaire de 22 ne peut être garantie (R03) : le résultat réel dépend d'un recouvrement futur non certain.
- La **clôture du risque** de reprise ne peut être prouvée sans certificat ou délai borné (R06).
- Le **litige P06** ne peut être résolu sans la réponse de l'autorité : toute conclusion serait une invention.
- Les outils du dossier sont **simulés** : aucune action réelle sur des comptes n'est autorisée ni effectuée.