# SIII-01 — La réserve qui disparaît au commit

Score: 81.0 % (certificats 0/0, juge 81/100)

Certificats manqués: aucun

All claims are certified. Q2's schema/pseudo-code is a design deliverable (not a numeric claim), which I'll now write out. I have everything needed for the final answer.

---

# Mission Refuge — Reconstitution de l'anomalie et protocole correct

**Cadre.** Ce dossier est un modèle fermé. Les outils cités (base, passerelle, outbox) sont simulés : rien ici n'autorise une action sur des comptes ou des véhicules réels. Je distingue systématiquement **établi** (prouvé par les contrats ou par calcul), **réfuté** (contredit par les contrats) et **non déterminé** (le dossier ne tranche pas).

---

## Q1 — Graphe de dépendances de P01, absence d'ordre sériel, échec des contraintes uniques et de P02

### Graphe de sérialisation (arêtes rw / ww / wr)

Sous isolation par instantané (R02), chaque transaction lit un instantané fixe. Notons S₀ l'instantané commun à TA et TB.

| Transaction | Lit (S₀) | Écrit |
|---|---|---|
| TA | B1=READY, B2=READY | B1→RESERVED, mission MA, outbox `dispatch-MA` |
| TB | B1=READY, B2=READY | B2→RESERVED, mission MB, outbox `dispatch-MB` |

Arêtes de dépendance :
- **TA → TB (rw, anti-dépendance)** : TA lit B2=READY ; TB écrit B2. TA doit précéder TB.
- **TB → TA (rw, anti-dépendance)** : TB lit B1=READY ; TA écrit B1. TB doit précéder TA.
- Aucune arête **ww** : les deux transactions écrivent des lignes *distinctes* (B1 vs B2, MA vs MB, deux command_id différents).

Le graphe contient le **cycle TA → TB → TA**. Un cycle dans le graphe de sérialisation signifie qu'**aucun ordre sériel n'est compatible** avec l'exécution observée. C'est la signature exacte du **write skew** : chaque transaction, prise isolément, préserve l'invariant ; leur conjonction le viole.

**Vérification (calcul exhaustif).** Sur les 25 états conjoints (B1,B2) ∈ {READY, RESERVED, DEPARTED, CANCEL_PENDING, RETURNING}², **16 violent R01** (0 bus READY), dont (RESERVED, RESERVED). Simulation : TA seule → (RESERVED, READY) sûr ; TB seule → (READY, RESERVED) sûr ; **TA puis TB → (RESERVED, RESERVED), non sûr**. → **Établi.**

### Pourquoi les contraintes uniques ne suffisent pas

La contrainte unique de R03 porte sur `(bus_id, mission active)`. TA crée MA sur B1, TB crée MB sur B2 : **clés distinctes**, aucune collision. La contrainte unique est un invariant **par ligne** ; R01 (« ≥ 1 bus READY ») est un invariant **d'agrégat** (un comptage sur l'ensemble des bus). Une contrainte d'unicité ne peut pas exprimer « au moins un READY » : elle ne voit jamais l'ensemble, seulement les doublons. → **Réfuté** que les contraintes uniques protègent R01.

### Pourquoi P02 échoue

P02 propose `SELECT … FOR UPDATE` sur **les seules missions déjà actives**. Deux défauts cumulés :
1. **Au début de P01, aucune mission active n'existe** → l'ensemble verrouillé est vide → aucun verrou posé → aucun conflit créé.
2. Même si une ligne était verrouillée, **R02 précise qu'« un simple verrou sans modification ne renouvelle pas l'instantané »** : un verrou ne crée pas d'arête ww, donc ne force pas l'annulation d'une transaction concurrente sous SI.

P02 ne crée donc **aucune arête ww** : le cycle rw-rw subsiste, les deux transactions valident. → **Réfuté.**

---

## Q2 — Schéma et pseudo-code d'une admission correcte

### Principe : matérialiser le conflit

L'invariant R01 est un invariant d'agrégat. La technique correcte sous SI est de **matérialiser le conflit** : faire écrire à *toutes* les transactions qui touchent l'ensemble des bus une **même ligne** `guard(sector)`. Deux admissions concurrentes depuis le même instantané écrivent alors la même ligne → conflit ww → au moins une est annulée (R02). C'est le remède canonique aux write skews sous isolation par instantané.

### Schéma (R03, complété)

```sql
bus(id PK, state, generation)          -- state ∈ {READY,RESERVED,DEPARTED,CANCEL_PENDING,RETURNING}
mission(id PK, bus_id, state, request_id UNIQUE, generation)
outbox(command_id PK, payload, created_at)
guard(sector PK, version)              -- ligne de sérialisation, version monotone
-- contrainte unique existante : (bus_id) pour mission active
-- NOUVELLE contrainte métier : au plus 1 bus non-READY par secteur (voir garde)
```

### Pseudo-code transactionnel (admission)

```
ADMIT(request_id, sector, mission_id):
  BEGIN;                                  -- instantané fixe
  -- 1. Idempotence : identité de la demande
  IF EXISTS(mission WHERE request_id = request_id) THEN
      COMMIT; RETURN ALREADY_KNOWN(mission)   -- rejeu : pas de nouvel effet
  -- 2. Sérialisation : lire ET écrire la garde
  v := SELECT version FROM guard WHERE sector = sector;   -- lecture
  -- 3. Lire l'état des bus DANS le même instantané
  ready := SELECT id FROM bus WHERE state = 'READY' ORDER BY id;
  -- 4. Vérifier le prédicat métier : après admission, ≥ 1 READY
  IF count(ready) < 2 THEN
      ROLLBACK; RETURN REJECTED_NO_RESERVE;   -- refus explicite, pas de blocage
  b := ready[0];                              -- choisir un bus
  -- 5. Écritures : bus + mission + outbox + GARDE (même ligne pour tous)
  UPDATE bus SET state='RESERVED', generation = generation+1 WHERE id = b;
  INSERT mission(id=mission_id, bus_id=b, state='RESERVED',
                 request_id=request_id, generation = gen(b));
  INSERT outbox(command_id = 'dispatch-'||mission_id,
                payload = {bus:b, gen:gen(b), mission:mission_id});
  UPDATE guard SET version = v+1 WHERE sector = sector;   -- ← conflit matérialisé
  COMMIT;                                     -- échec si guard.version a changé
```

### Frontière de reprise après conflit

La transaction est **atomique** : en cas de conflit sur `guard` (ou d'annulation), **toutes** ses écritures sont supprimées, y compris celles de l'outbox (R02). La frontière de reprise est donc **la transaction entière** : on **relance depuis le BEGIN**, avec un **nouvel instantané**, en relisant `guard.version` et l'état des bus. On ne « reprend » jamais au milieu : reprendre à mi-chemin réutiliserait un instantané périmé et réintroduirait le write skew. La relance est sûre car l'identité `request_id` rend l'opération idempotente.

### Identité d'une demande

- **`request_id`** : identité *métier* de la demande, unique, fournie par le client. Elle garantit l'idempotence des admissions (un rejeu ne crée pas de seconde mission).
- **`command_id`** : identité *de livraison* vers la passerelle, distincte. R04 : la passerelle déduplique par `command_id`. Ne pas confondre les deux : `request_id` protège la base, `command_id` protège la passerelle.
- **`generation`** : identité *de tentative physique* d'un bus, utilisée comme jeton de fencing (voir Q3).

### Effets exclus de la transaction

**L'envoi réseau vers la passerelle est exclu de la transaction.** Un effet externe n'est jamais annulé par un rollback (R02). On écrit donc la commande dans l'**outbox dans la transaction** (transactional outbox), et un **relais séparé** la livre ensuite, au moins une fois. La transaction ne fait que *promettre* la livraison ; elle ne l'exécute pas.

---

## Q3 — Machine à états, réparation de P04, obligations de la passerelle

### Machine à états

**Bus** (par bus, avec `generation`) :
```
READY ──admission──▶ RESERVED ──dispatch exécuté──▶ DEPARTED ──retour physique──▶ READY
  ▲                     │                                                              │
  │                     └──annulation──▶ CANCEL_PENDING ──barrière/preuve──▶ READY ◀────┘
  └───────────────────────────────────────────────────────────────────────────────────┘
```
**Mission** : `RESERVED → DISPATCHED → RETURNED` ; `RESERVED → CANCELLED` (via CANCEL_PENDING).

Règle R01 : à tout instant validé, **au plus un bus non-READY** par secteur (donc ≥ 1 READY).

### Réparation de P04

P04 : MA est RESERVED, son DISPATCH est **en transit**. L'annulation valide, l'application remet **immédiatement** B1 à READY, puis un **ancien DISPATCH arrive** à la passerelle. Aucun retour physique constaté. MC peut avoir réservé B1 entre-temps.

**Ce qui est faux** : remettre B1 à READY immédiatement. Une annulation n'est **ni un retour du véhicule ni la preuve qu'il n'est jamais parti** (R05). L'ancien DISPATCH peut encore faire partir B1 → départ non voulu, et B1 déjà ré-réservé par MC → deux missions sur un bus.

**Réparation correcte** : l'annulation place B1 en **CANCEL_PENDING** (jamais une disponibilité, R01). B1 ne redevient READY que sur **l'une** de ces deux preuves (R05) :
- **(a) preuve de retour physique** du véhicule, ou
- **(b) barrière durable de la passerelle** attestant qu'aucun départ de la génération annulée n'a eu lieu **et** qu'aucun ne pourra encore avoir lieu.

**Vérification (fencing par génération).** La passerelle tient `gen_courante[bus]` et n'exécute un DISPATCH que si `gen == gen_courante[bus]`. L'annulation incrémente la génération (barrière). Calcul : avant annulation, `DISPATCH gen=5` → **DEPART** ; après barrière (`gen→6`), l'ancien `DISPATCH gen=5` → **REJET** ; le nouveau `DISPATCH gen=6` (MC) → **DEPART**. Sans barrière, l'ancien DISPATCH passe → départ non voulu. → **Établi.**

**Ne pas confondre** : une **barrière logique** (incrément de génération côté passerelle) n'est pas un **reçu** (accusé de réception d'un message) ni un **état physique** (le bus est réellement revenu). Seule (a) ou (b) autorise le retour à READY.

### Obligations de la passerelle

1. **Sérialiser localement** les commandes et l'état physique (R05).
2. **Fencing** : rejeter tout DISPATCH dont la génération est inférieure à la génération courante du bus.
3. **Déduplication** par `command_id` (R04) — mais la dédup seule ne suffit pas : elle n'empêche pas un *ancien ordre* non encore exécuté de partir. D'où le fencing par génération, en plus.
4. **Émettre une barrière durable** (preuve (b)) quand une annulation doit libérer un bus sans retour physique.
5. **Attester le retour physique** (preuve (a)) quand le bus revient.

---

## Q4 — États visibles et annoncés par l'interface

### États visibles (R06)

| État affiché | Signification | Engagement durable ? |
|---|---|---|
| `DEMANDE_ENVOYÉE` | requête locale partie, pas de réponse serveur | **Non** |
| `CONFIRMÉ` | **engagement durable du serveur** (transaction validée) | **Oui** |
| `INDISPONIBLE` | refus explicite du serveur | — |
| `ANNULATION_EN_COURS` | annulation demandée, résultat inconnu | Non |
| `ANNULÉ` | annulation confirmée par le serveur | Oui |
| `RÉSULTAT_INCONNU` | réponse perdue / session changée | Non |

**Règle d'or** : le mot **CONFIRMÉ** ne s'affiche **que** sur un engagement durable du serveur. Un clic, une requête locale ou une notification optimiste **n'est pas** une confirmation. Le lecteur d'écran annonce les transitions ; il ne doit jamais annoncer « confirmé » sur un état local.

### Réfutation de P03

P03 (afficher « Transport confirmé » dès le clic, puis remplacer silencieusement par « Transport indisponible ») est **réfuté** : (i) il présente un état local comme un engagement durable, violant R06 ; (ii) le remplacement silencieux ne retire pas la notification sonore déjà mémorisée par l'usager — l'annonce initiale est irréversible côté usager. Une application honnête ne peut pas « dé-confirmer » un engagement qu'elle n'a jamais eu.

### Changement de session pendant une réponse tardive

Une réponse tardive porte le `request_id` (et l'identité de session d'affichage) de la demande. Si la session d'affichage courante ne correspond plus, l'application **abandonne** la réponse : elle est « étrangère à sa session d'affichage » (R06). Elle ne l'affiche pas dans la nouvelle session. L'engagement serveur, lui, reste valide côté serveur ; seule l'*affichage* est abandonné.

### Annulation à résultat inconnu

Si l'annulation n'a pas de réponse (délai réseau ≠ échec, R04), l'interface affiche **`ANNULATION_EN_COURS` / `RÉSULTAT_INCONNU`** — jamais « annulé ». Elle ne conclut pas à l'échec sur un simple délai. La réconciliation se fait par relecture de l'état serveur (idempotente via `request_id`).

---

## Q5 — Priorités et promesses hors ligne réalisables

### P-local : réalisable

P-local donne priorité aux demandes **complètes déjà connues du serveur**, selon une **séquence attribuée par le serveur**. Le serveur est la source de vérité de la séquence : il peut ordonner les demandes qu'il connaît. Aucune information distante n'est requise. → **Réalisable.**

### P-global : irréalisable (preuve par mondes indiscernables)

P-global exige que **toute demande urgente créée ailleurs** soit servie avant une demande ordinaire, **même si le serveur n'en a pas encore connaissance**.

**Preuve.** Soient W-sans (seul un terminal connecté a une demande ordinaire O complète) et W-avec (un terminal isolé a créé auparavant une urgence U). Par P05, le serveur S reçoit **exactement les mêmes messages** jusqu'à sa décision sur O. Donc S a le **même état interne** et le **même historique** dans les deux mondes. S étant une fonction déterministe de son historique, il prend la **même décision** `d` dans les deux mondes.

- Si `d = servir O` : dans W-avec, O est servie alors que U (urgente, distante) aurait dû passer avant → **viole P-global**.
- Si `d = ne pas servir O` : dans W-sans, aucune urgence n'existe, O est complète et connue, un véhicule est allouable → refuser **viole le progrès** (R08 interdit de refuser toujours).

**Vérification (calcul).** `d=True` → W-sans OK, W-avec KO ; `d=False` → W-sans KO, W-avec OK ; **jamais les deux OK**. Aucune décision unique ne satisfait les deux mondes. → **P-global irréalisable. Établi.**

**Racine** : P-global exige la connaissance d'un événement distant **non encore communiqué** — impossible sans communication préalable (argument d'indiscernabilité, de la famille du théorème FLP / des deux généraux). R07 interdit par ailleurs de transformer une heure de terminal en preuve de priorité globale : les horloges ne donnent pas d'ordre global fiable (R04).

### Concession produit permettant un service utile

Puisqu'aucune capacité de réserve n'a été préattribuée à l'équipe isolée (P05), on ne peut pas *garantir* la priorité globale. Concession réaliste :

1. **Priorité globale « best effort » à délai borné** : une urgence distante, une fois **reçue**, préempte toute mission ordinaire **non encore DISPATCHED** (état RESERVED), par annulation + re-réservation sous le même protocole de garde. La préemption est impossible une fois le bus DEPARTED (irréversible physiquement).
2. **Fenêtre de préemption explicite** : l'interface annonce « confirmé, préemptible jusqu'au départ » plutôt que « garanti ». L'usager sait que la confirmation est un engagement durable *sous réserve de préemption avant départ*.
3. **Réserve dédiée optionnelle** : si l'exploitation accepte de préattribuer un véhicule de réserve à la coordination humaine, P-global devient réalisable *pour cette réserve* — mais cela réduit la capacité ordinaire et doit être un choix explicite, pas un implicite.

Cette concession est **honnête** : elle ne promet pas ce qui est impossible, et elle offre un service utile (préemption avant départ) là où c'est physiquement possible.

---

## Q6 — Preuve de sûreté, exécution positive, tests, limites

### Preuve de sûreté (invariant R01)

**Théorème.** Si toute transaction qui modifie l'ensemble des bus READY écrit `guard(sector).version`, alors, sous l'isolation par instantané de R02, l'invariant I = « ≥ 1 bus READY » est préservé.

**Preuve.** Soit T₁, …, Tₙ les transactions validées qui modifient l'état des bus, dans l'ordre de leurs versions de `guard`. Deux transactions écrivant `guard` depuis des instantanés concurrents ne peuvent pas valider toutes deux (R02 : conflit ww sur la même ligne → au moins une annulée). Donc les versions de `guard` forment un **ordre total** : Tₖ lit l'état laissé par Tₖ₋₁. Chaque Tₖ, dans son instantané, lit l'état des bus et vérifie le prédicat P : « après mon écriture, ≥ 1 READY ». Comme Tₖ lit l'état de Tₖ₋₁ (sérialisation sur `guard`), P est vérifié **séquentiellement**. Par induction sur k, I est préservé après chaque transaction validée. ∎

**Vérification (calcul).** Avec la garde, les états finaux possibles de P01 sont (RESERVED, READY) **ou** (READY, RESERVED) — **jamais** (RESERVED, RESERVED). → **Établi.**

### Exécution positive (P06)

B1, B2 READY ; seule MA connue ; passerelle opérationnelle ; aucune annulation.
1. `ADMIT(MA)` : lit `guard.version = v`, lit {B1, B2} READY (count = 2 ≥ 2), choisit B1, écrit B1→RESERVED, mission MA, outbox `dispatch-MA`, `guard.version = v+1`. **COMMIT.**
2. Relais outbox livre `dispatch-MA` (au moins une fois). Passerelle : `gen == gen_courante[B1]` → **DEPART B1** (une seule fois, dédup `command_id` + fencing).
3. État final : B1 = DEPARTED, **B2 = READY** (réserve conservée). MA confirmée. **Un seul départ** pour cette génération.

→ Satisfait P06 : MA confirmée, un véhicule de réserve conservé, départ au plus une fois.

### Tests aux frontières base / passerelle / interface

| # | Frontière | Test | Attendu |
|---|---|---|---|
| T1 | base | TA et TB concurrentes (P01) | une seule valide ; jamais (RESERVED,RESERVED) |
| T2 | base | rejeu de `ADMIT` avec même `request_id` | idempotent, pas de 2ᵉ mission |
| T3 | base | conflit sur `guard` | rollback total, y compris outbox |
| T4 | passerelle | ancien DISPATCH après annulation (P04) | **REJET** par fencing de génération |
| T5 | passerelle | DISPATCH dupliqué (même `command_id`) | exécuté **une seule fois** |
| T6 | passerelle | DISPATCH désordonné (gen ancienne) | rejeté |
| T7 | interface | clic sans réponse serveur | affiche `DEMANDE_ENVOYÉE`, **pas** CONFIRMÉ |
| T8 | interface | réponse tardive, session changée | réponse **abandonnée** |
| T9 | interface | annulation sans réponse | `RÉSULTAT_INCONNU`, **pas** ANNULÉ |
| T10 | bout-en-bout | P06 | MA confirmée, B2 READY, 1 départ |
| T11 | bout-en-bout | W-sans vs W-avec (P05) | décisions identiques → P-global non garantie |

### Ce que la preuve ne démontre pas (limites explicites)

1. **Progrès / liveness** : la preuve de sûreté ne garantit pas qu'une admission finit par réussir, seulement qu'aucune n'aboutit à un état dangereux. Le progrès dépend des hypothèses de R08 (base et passerelle répondent, livraison finie, véhicule allouable, pas de famine sous conflits répétés).
2. **Unicité du départ (exactly-once)** : non démontrée par la base seule ; elle repose sur la **passerelle** (dédup `command_id` + fencing de génération). La base garantit *at-least-once* via l'outbox.
3. **Correction si le parc est modifié hors protocole** : la preuve suppose que **toutes** les voies de modification (admissions, annulations, retours, modifications du parc) passent par `guard`. R03 le *permet* mais ne l'*impose* pas : une écriture directe sur `bus` contournerait la preuve.
4. **Priorité globale** : non garantie (Q5) — impossible sans information distante.
5. **Horloges** : aucun ordre global fiable (R04) ; la preuve n'en utilise aucun.

---

## Synthèse : établi / réfuté / non déterminé

**Établi**
- P01 est un write skew : cycle rw-rw, aucun ordre sériel, (RESERVED,RESERVED) viole R01 (16/25 états conjoints dangereux).
- Les contraintes uniques ne protègent pas R01 (invariant d'agrégat, pas de ligne).
- P02 échoue (aucune mission active au départ ; verrou sans modification ne crée pas d'arête ww).
- La garde `guard(sector).version` matérialise le conflit et préserve R01 par sérialisation.
- P04 : remettre READY immédiatement est faux ; CANCEL_PENDING + fencing de génération est correct.
- P-global est irréalisable (preuve par mondes indiscernables, vérifiée par calcul).
- P-local est réalisable.

**Réfuté**
- P02 (correctif base) : ne résout pas l'invariant métier.
- P03 (correctif interface) : présente un état local comme un engagement durable ; la notification sonore est irréversible.

**Non déterminé**
- Le choix exact de la concession produit (préemption avant départ vs réserve dédiée) : dépend d'un arbitrage d'exploitation non fourni.
- La politique de priorité fine entre plusieurs urgences distantes reçues simultanément : le dossier ne la spécifie pas.
- Le comportement si un opérateur modifie le parc hors protocole : hors du modèle fermé.

**Invariant central conservé** : après chaque transaction validée, **au moins un des deux véhicules reste READY** — la ville n'est jamais sans secours.
# RÉPONSE FINALE — Mission Refuge

## Résultats exacts

**Anomalie P01 (établie).** TA et TB lisent toutes deux l'instantané S₀ = (B1=READY, B2=READY), écrivent des lignes **distinctes** (B1 vs B2, MA vs MB, deux `command_id`), donc valident toutes deux → état final **(RESERVED, RESERVED)** = **0 bus READY**. C'est un **write skew** : cycle rw-rw `TA → TB → TA` dans le graphe de sérialisation, **aucun ordre sériel compatible**.

**Comptage exact.** Sur 25 états conjoints (B1,B2) ∈ {READY, RESERVED, DEPARTED, CANCEL_PENDING, RETURNING}², **16 violent R01** (0 READY), **9 sont sûrs**. États finaux de P01 : TA seule → (RESERVED, READY) sûr ; TB seule → (READY, RESERVED) sûr ; **TA puis TB → (RESERVED, RESERVED) non sûr**.

**Correctif (établi).** Matérialiser le conflit sur `guard(sector).version` : toutes les transactions touchant l'ensemble des bus écrivent cette même ligne → conflit ww → au moins une annulée (R02). États finaux possibles avec garde : (RESERVED, READY) **ou** (READY, RESERVED), **jamais** (RESERVED, RESERVED).

**P04 (établi).** Remettre B1 à READY immédiatement est **faux**. Correct : B1 → **CANCEL_PENDING**, retour à READY seulement après (a) preuve de retour physique **ou** (b) barrière durable de la passerelle. Fencing par génération : avant annulation `DISPATCH gen=5` → DEPART ; après barrière (`gen→6`), ancien `DISPATCH gen=5` → **REJET** ; nouveau `DISPATCH gen=6` → DEPART.

**P-global (établi irréalisable).** Preuve par mondes indiscernables : `d=True` → W-sans OK / W-avec KO ; `d=False` → W-sans KO / W-avec OK ; **jamais les deux OK**. Aucune décision unique ne satisfait les deux mondes.

**P-local (établi réalisable).** Séquence attribuée par le serveur, aucune information distante requise.

## Certificats

| Résultat | Méthode | Preuve |
|---|---|---|
| P01 write skew | Énumération exhaustive + simulation | TA seule sûre, TB seule sûre, TA+TB non sûre ; 16/25 états dangereux |
| P-global impossible | Indiscernabilité (type FLP) + énumération | Aucune décision `d` ne satisfait W-sans **et** W-avec |
| P04 réparation | Simulation fencing par génération | Ancien DISPATCH rejeté après barrière ; sans barrière, départ non voulu |
| Sûreté R01 | Induction sur l'ordre total des versions de `guard` | Sérialisation sur `guard` ⇒ prédicat vérifié séquentiellement |

## Pièges traités

1. **Cohérence instantanée ≠ sérialisabilité** : SI autorise le write skew ; il faut un ordre sériel explicite (via `guard`).
2. **Effet externe non annulable** : l'envoi réseau est **exclu** de la transaction ; l'outbox ne fait que *promettre* la livraison.
3. **Verrou ≠ conflit** : `SELECT FOR UPDATE` sans modification ne renouvelle pas l'instantané (R02) → P02 échoue.
4. **Annulation ≠ retour ≠ preuve de non-départ** (R05) : d'où CANCEL_PENDING + barrière.
5. **Délai ≠ échec** (R04) : l'interface affiche RÉSULTAT_INCONNU, jamais ANNULÉ.
6. **CONFIRMÉ = engagement durable serveur** (R06) : un clic ou une notification optimiste n'en est pas un → P03 réfuté.
7. **Identités distinctes** : `request_id` (base, idempotence) ≠ `command_id` (passerelle, dédup) ≠ `generation` (fencing).
8. **Horloge ≠ ordre global** (R04, R07) : aucune preuve de priorité globale par heure de terminal.
9. **Dédup ≠ fencing** : la dédup par `command_id` n'empêche pas un *ancien ordre* non exécuté de partir ; il faut le fencing par génération.

## Limites / impossibilités

- **Progrès non démontré** : la sûreté n'implique pas la liveness ; celle-ci dépend des hypothèses de R08.
- **Exactly-once non démontré par la base seule** : repose sur la passerelle (dédup + fencing) ; la base garantit at-least-once.
- **Preuve conditionnée à `guard`** : toute écriture directe sur `bus` hors protocole contourne la preuve (R03 le permet, ne l'impose pas).
- **P-global impossible** : exige une connaissance distante non communiquée.
- **Non déterminé** : choix exact de la concession produit ; politique entre urgences distantes simultanées ; comportement hors modèle fermé.

**Invariant central conservé** : après chaque transaction validée, **au moins un des deux véhicules reste READY** — la ville n'est jamais sans secours.