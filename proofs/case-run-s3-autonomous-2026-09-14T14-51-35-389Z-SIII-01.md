# SIII-01 — La réserve qui disparaît au commit

Score: 85.0 % (certificats 0/0, juge 85/100)

Certificats manqués: aucun

Toutes les exigences sont couvertes (9/9). Je rédige la réponse finale.

## Réponse

### Q1 — Graphe de dépendances de P01, absence d'ordre sériel

**Graphe de conflits (lecture-écriture) :**
- TA lit B1, B2 ; TB écrit B2 → conflit **TA → TB** (rw sur B2)
- TB lit B1, B2 ; TA écrit B1 → conflit **TB → TA** (rw sur B1)

Le graphe contient le cycle **TA ⇄ TB** : il n'existe **aucun ordre sériel** équivalent.

**Vérification exhaustive** (compute) : les deux ordres sériels échouent.
- `TA→TB` : TB lit B1=RESERVED, ne peut réserver B2 sans violer R01 → échec.
- `TB→TA` : symétrique → échec.

**État final de P01** : B1=RESERVED, B2=RESERVED → **0 bus READY** ⇒ **R01 violé** (il faut ≥1 READY après chaque commit).

**Pourquoi les contraintes uniques et P02 ne suffisent pas :**
- La contrainte unique porte sur `bus_id` des missions **actives** (MA sur B1, MB sur B2 : distincts) — elle **passe**, et ne porte pas sur `count(READY)`.
- P02 (`SELECT … FOR UPDATE` sur les missions actives) ne pose **aucun verrou** : aucune mission active n'existe au début de P01. Les deux transactions valident encore.
- Il faut une **ligne de garde effectivement modifiée** (`guard.version`) pour créer un conflit réel.

### Q2 — Schéma et admission correcte

**Schéma** : `bus(id,state,generation)`, `mission(id,bus_id,state)`, `outbox(command_id,payload)`, `guard(sector,version)`.

**Pseudo-code transactionnel :**
```
BEGIN
  UPDATE guard SET version = version + 1 WHERE sector = :s   -- ligne de garde MODIFIÉE
  SELECT count(*) FROM bus WHERE state='READY' AND sector=:s
  IF count < 2 THEN ROLLBACK; RETURN INDISPONIBLE            -- réserve préservée
  SELECT id FROM bus WHERE state='READY' AND sector=:s LIMIT 1
  UPDATE bus SET state='RESERVED', generation=generation+1 WHERE id=:b
  INSERT INTO mission(id,bus_id,state) VALUES(:m,:b,'ACTIVE')  -- idempotent sur mission.id
  INSERT INTO outbox(command_id,payload) VALUES(:c,'DISPATCH') -- effet externe HORS transaction
COMMIT
```
- **Identité de demande** = `mission.id` (idempotence de l'admission) ; **identité d'effet** = `command_id`.
- **Effets exclus de la transaction** : envoi physique, notification, tout effet externe (via outbox).
- **Frontière de reprise après conflit** : conflit sur `guard.version` → relire la version, re-tester `count(READY)≥2`, rejouer ; `mission.id` rend le rejeu idempotent.

### Q3 — Machine à états et réparation de P04

États bus : `READY → RESERVED → DEPARTED`, plus `CANCEL_PENDING`, `RETURNING`.

**Faute de P04** (simulée) : annulation logique → l'app remet B1 `READY` **sans preuve de retour ni barrière** ; un ancien DISPATCH (gen=1) arrive ensuite → **départ fantôme**, puis MC (gen=2) part aussi ⇒ **2 départs sur B1**.

**Réparation** : B1 reste `CANCEL_PENDING` jusqu'à **preuve de retour physique** OU **barrière durable de la passerelle** (fencing par génération) attestant qu'aucun départ de la génération annulée n'a eu lieu et qu'aucun ne pourra avoir lieu. Ne jamais confondre : barrière logique (durable, côté passerelle) ≠ reçu (accusé) ≠ état physique (retour constaté).

**Obligations de la passerelle** : (1) sérialiser localement commandes et état physique ; (2) dédupliquer par `command_id` **et** refuser tout DISPATCH dont `(bus_id,generation)` est périmé ; (3) émettre un reçu durable/barrière ; (4) ne jamais déduire un retour de l'absence de départ.

### Q4 — États visibles et annoncés

`PROPOSÉ` (requête locale, non engageant) → `CONFIRMÉ` (commit durable serveur **uniquement**) → `INDISPONIBLE` (rejet) ; `ANNULATION_EN_COURS` (résultat inconnu, jamais présenté comme retour) ; `TERMINÉ`. Le lecteur d'écran annonce chaque transition.
- **Réponse tardive après changement de session** : abandonnée car étrangère à la session d'affichage (R06).
- **Annulation de résultat inconnu** : afficher `ANNULATION_EN_COURS`, réconcilier par relecture serveur ; jamais « annulé » sans preuve.

### Q5 — Priorités : P-global irréalisable

**Preuve par mondes indiscernables** : W-sans et W-avec produisent **exactement les mêmes messages** jusqu'à la décision sur la demande ordinaire. Toute fonction déterministe des messages donne donc la **même décision**, or P-global exige des décisions **différentes** :

| Décision | W-sans | W-avec |
|---|---|---|
| ADMET | correct | **viole P-global** |
| REFUSE | refus inutile (**viole R08**) | correct |

⇒ **P-global est irréalisable** ; il est interdit d'utiliser une heure de terminal comme preuve de priorité globale. **P-local est réalisable** (séquence attribuée par le serveur).

**Concession produit** : P-local + **canal d'urgence hors-bande** (réservation pré-attribuée) ou **quarantaine bornée** laissant remonter l'urgence.

### Q6 — Preuve de sûreté, exécution positive, tests

**Sûreté (énumération exhaustive)** : sur 16 états à 2 bus, 9 violent R01, 7 sont admissibles. L'admission correcte (R→S seulement si l'autre bus reste R, sous garde `guard(sector,version)` modifiée) préserve l'invariant depuis tout état admissible : **0 contre-exemple**. La garde sérialise les admissions concurrentes (conflit sur la même ligne).

**Exécution positive P06** : READY après chaque étape = **[2,1,1,1]** (≥1 toujours), MA confirmée, réserve B2 conservée, **1 seul départ** malgré rejeu (dédup `command_id`).

**Tests frontières** : (base) deux admissions concurrentes → 1 seule valide ; rollback annule l'outbox mais pas l'effet externe ; (passerelle) rejeu → 1 départ ; DISPATCH périmé refusé ; barrière avant READY ; (interface) réponse tardive après changement de session abandonnée ; annulation inconnue → `ANNULATION_EN_COURS` puis réconciliation.

## Preuves et certificats
- Q1 : énumération des 2 ordres sériels (tous échec), cycle TA⇄TB, `p01_ready=0`.
- Q3/P04 : trace simulée → 2 départs sur B1.
- Q5 : table de décision des 2 mondes → contradiction.
- Q6 : 16 états énumérés, 0 contre-exemple ; trace P06 READY=[2,1,1,1].

## Pièges traités
- **Snapshot ≠ sérialisable** : ordre sériel explicite impossible (cycle rw).
- **Effet externe non annulé par rollback** : outbox transactionnelle + idempotence.
- **Fencing ≠ idempotence ≠ autorisation** : la barrière par génération empêche l'écriture périmée ; la dédup empêche le double effet.
- **Annulation ≠ retour** : READY seulement après preuve physique ou barrière durable.
- **Heure terminal ≠ priorité globale** : P-global réfuté.

## Limites / impossibilités
- **P-global est impossible** (preuve par mondes indiscernables) — non déterminé : aucune architecture ne peut le garantir sans canal hors-bande.
- La preuve de sûreté suppose la garde effectivement modifiée et la passerelle sérialisant localement ; elle **ne démontre pas** le progrès sous partition ni l'absence de départ fantôme si la passerelle ne respecte pas le fencing par génération.
- Le progrès n'est exigible que sous les conditions de R08 (base et passerelle répondantes, livraison éventuelle, véhicule allouable, pas de conflit éternel).
- Ce dossier est un **modèle fermé** ; les outils sont simulés, sans action sur des comptes réels.