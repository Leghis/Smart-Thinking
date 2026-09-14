# SIII-01-V2 — SIII-01 → Un troisième véhicule indépendant

Score: 90.0 % (certificats 0/0, juge 90/100)

Certificats manqués: aucun

Les calculs confirment la structure. Je rédige la réponse complète.

---

# Réponse — Variante « B3 » : séparer la sérialisabilité de la violation de réserve

## Ce que change la variante (et ce qu'elle ne change pas)

La variante ajoute **B3**, accessible, initialement READY, lu READY par TA et TB, **réservé par aucune des deux**. Elle ne modifie donc **aucune** des hypothèses R01–R08, P01–P06 : elle ajoute un véhicule au parc et une lecture supplémentaire. Je remplace uniquement ce qui est explicitement modifié (le parc passe de {B1,B2} à {B1,B2,B3}) et je recalcule les conclusions affectées (Q1, Q6, question finale) ; les autres contraintes du dossier de base sont conservées telles quelles.

Le résultat central, vérifié par énumération des conflits :

- **Graphe de conflits de P01 (avec B3)** : arêtes `TA→TB` (rw sur B2 : TA lit B2=READY avant que TB écrive B2) et `TB→TA` (rw sur B1 : TB lit B1=READY avant que TA écrive B1). **Cycle ⇒ non conflict-sérialisable.**
- **B3 n'apparaît dans aucun conflit** : lu par les deux, écrit par personne. Le graphe est **identique** avec et sans B3.
- **Réserve** : avec B3, après TA;TB il reste **1 READY** (B3) ⇒ R01 préservé ; sans B3, **0 READY** ⇒ R01 violé.

Autrement dit : **B3 change la violation de réserve sans changer la sérialisabilité.** C'est le témoin qui sépare les deux diagnostics. Je déroule maintenant Q1–Q6 puis la question finale.

---

## Q1 — Graphe de dépendances de P01, absence d'ordre sériel, échec des contraintes uniques et de P02

**Nœuds** : TA, TB. **Opérations** : TA lit B1,B2,B3 puis écrit B1 et `outbox(dispatch-MA)` ; TB lit B1,B2,B3 puis écrit B2 et `outbox(dispatch-MB)`.

**Arêtes de conflit** (au moins une écriture, même objet, ordres différents) :

| Arête | Cause | Type |
|---|---|---|
| TA → TB | TA lit B2=READY, puis TB écrit B2 | rw (anti-dépendance) |
| TB → TA | TB lit B1=READY, puis TA écrit B1 | rw (anti-dépendance) |

Les écritures `w(B1)`/`w(B2)` et `w(outbox_MA)`/`w(outbox_MB)` portent sur des **objets distincts** : aucun conflit ww. B3 ne crée aucun conflit. Le graphe est donc **{TA→TB, TB→TA} : un cycle**. Il n'existe **aucun ordre sériel** TA;TB ou TB;TA dont les dépendances reproduisent celles de l'historique : dans l'ordre TA;TB, TB devrait lire B1=RESERVED (écrit par TA), alors qu'il l'a lu READY. C'est le **write skew** canonique.

**Pourquoi les contraintes uniques ne détectent rien.** La contrainte unique porte sur « deux missions actives sur un même bus ». TA réserve B1, TB réserve B2 : **bus distincts**, la contrainte passe. Elle ne porte **pas** sur le nombre de bus READY (R03 le dit explicitement) : elle est structurellement aveugle à l'invariant métier R01, qui est un **agrégat** (« ≥1 READY »), pas une contrainte de ligne.

**Pourquoi P02 ne résout rien.** `SELECT … FOR UPDATE` sur les **missions déjà actives** ne verrouille rien : au début de P01, **aucune mission active n'existe**. Le verrou est vide, l'isolation n'est pas changée, aucune ligne de garde n'est effectivement modifiée. R02 précise qu'« un simple verrou sans modification ne renouvelle pas l'instantané » : TA et TB continuent de lire le même instantané et valident tous deux. P02 est un no-op sur cet historique.

**Avec B3**, le diagnostic de sérialisabilité est **inchangé** (même cycle), mais l'état final diffère : `{B1:RESERVED, B2:RESERVED, B3:READY}`. La contrainte unique et P02 restent tout aussi impuissants.

---

## Q2 — Schéma et pseudo-code d'une admission correcte

**Schéma** (R03, complété d'une ligne de garde **effectivement modifiée**) :

```
bus(id PK, sector, state, generation)
mission(id PK, bus_id FK, state, demand_id UNIQUE, generation)
outbox(command_id PK, payload)
guard(sector PK, version)          -- ligne unique par secteur, MODIFIÉE à chaque admission
```

**Identité d'une demande** : `demand_id` **stable et fourni par le serveur** (séquence serveur), jamais l'heure du terminal (R07 interdit d'en faire une preuve de priorité). C'est cette identité qui rend l'admission idempotente sous duplication (R04).

**Pseudo-code transactionnel** :

```
BEGIN
  -- 1. Garde : sérialise toutes les admissions du secteur
  UPDATE guard SET version = version + 1 WHERE sector = :S   -- conflit ww garanti
  -- 2. Lecture de l'instantané APRÈS la garde
  SELECT count(*) INTO n FROM bus
     WHERE sector = :S AND state = 'READY'
  IF n < 2 THEN ROLLBACK; RETURN 'REFUS'   -- il faut garder ≥1 READY après
  -- 3. Réservation d'un bus précis, conditionnelle à son état
  UPDATE bus SET state='RESERVED', generation = generation + 1
     WHERE id = :B AND state = 'READY'
  IF rowcount = 0 THEN ROLLBACK; RETURN 'CONFLIT'
  INSERT INTO mission(id, bus_id, state, demand_id, generation) VALUES (...)
  INSERT INTO outbox(command_id, payload) VALUES (:cmd, 'DISPATCH ...')
  COMMIT
```

**Frontière de reprise après conflit** : la transaction est **atomique** ; en cas d'annulation (conflit ww sur `guard`, ou `rowcount=0`), **toutes** ses écritures disparaissent, y compris l'outbox (R02). La reprise consiste à **relire l'instantané et retenter** avec le même `demand_id` — jamais à rejouer un effet externe.

**Effets exclus de la transaction** : l'**envoi physique** (le DISPATCH n'est qu'une ligne d'outbox), toute notification, tout appel réseau. La transaction ne produit **aucun effet externe** ; c'est la passerelle qui les matérialise, sous sa propre barrière (Q3). C'est ce qui rend l'annulation transactionnelle sûre : rien d'irréversible n'est engagé avant le COMMIT.

---

## Q3 — Machine à états, réparation de P04, obligations de la passerelle

**Bus** : `READY → RESERVED → DEPARTED → (retour prouvé) READY`, plus `CANCEL_PENDING`. **Mission** : `PENDING → ACTIVE → {CANCELLED | COMPLETED}`. Règle d'or : **RESERVED, DEPARTED, CANCEL_PENDING ne sont jamais des disponibilités** (R01).

**P04 — la faute.** MA est RESERVED, son DISPATCH est en transit. L'annulation valide, l'application remet **immédiatement** B1 à READY, puis un **ancien DISPATCH** arrive et provoque un départ. Deux erreurs : (1) une **demande d'annulation** a été traitée comme un **retour** ; (2) un DISPATCH d'une **génération annulée** a été accepté.

**Réparation.** B1 ne redevient READY que sur **preuve de retour physique** *ou* **barrière durable de la passerelle** attestant qu'aucun départ de la génération annulée n'a eu lieu et qu'aucun ne pourra avoir lieu (R05). Trois notions à ne pas confondre :

- **Barrière logique** : engagement de la passerelle, sérialisant localement commandes et état physique, à rejeter tout DISPATCH d'une génération ≤ génération annulée. C'est un **fait durable côté passerelle**, pas un état du bus.
- **Reçu** : accusé d'exécution d'une commande précise ; il ne prouve **pas** à lui seul l'absence de départ futur.
- **État physique** : constat effectif du retour du véhicule.

**Obligations de la passerelle** : (a) **sérialiser localement** les commandes et l'état physique ; (b) **fencing par génération** : rejeter tout DISPATCH dont la génération est antérieure à la dernière annulation connue ; (c) **dédupliquer par `command_id`** *et* par génération (R04 : la dédup actuelle par `command_id` seul est insuffisante) ; (d) émettre une **barrière durable** avant que le bus ne soit remis READY ; (e) ne jamais traiter un **délai réseau** comme un échec.

---

## Q4 — États visibles et annoncés par l'interface

**États annoncés** (R06) : `EN VÉRIFICATION` (demande reçue, non engagée), `CONFIRMÉ` (**engagement durable du serveur** uniquement), `INDISPONIBLE`, `ANNULATION EN COURS — RÉSULTAT INCONNU`, `ANNULÉ` (seulement après confirmation durable).

**P03 est disqualifié** : afficher « Transport confirmé » **dès le clic** transforme une notification optimiste en promesse ; le lecteur d'écran annonce un engagement qui n'existe pas, et la notification sonore initiale **ne peut pas être retirée** de la mémoire de l'usager. Le mot CONFIRMÉ doit être réservé au COMMIT serveur.

**Changement de session pendant une réponse tardive** : une réponse devenue **étrangère à la session d'affichage** est **abandonnée** (R06) — on ne réécrit pas l'écran d'une session close ; on ne « remplace pas silencieusement » un texte (P03), on affiche l'état courant de la session active.

**Annulation à résultat inconnu** : tant qu'aucune confirmation durable n'est reçue, l'interface affiche `ANNULATION EN COURS — RÉSULTAT INCONNU` et **ne remet pas** le véhicule à READY côté affichage. Le retour à READY n'est annoncé qu'après la barrière de la passerelle (Q3).

---

## Q5 — Priorités et promesses hors ligne : ce qui est réalisable

**P-local est réalisable** : le serveur attribue une **séquence** aux demandes complètes qu'il connaît et sert dans cet ordre. C'est une propriété locale, vérifiable.

**P-global est irréalisable.** Preuve par **mondes indiscernables** (P05) : dans **W-sans**, seul un terminal connecté a une demande ordinaire complète ; dans **W-avec**, un terminal isolé a créé auparavant une demande urgente. Le serveur reçoit **exactement les mêmes messages** jusqu'à sa décision sur la demande ordinaire, et **aucune capacité n'est préattribuée** à l'équipe isolée. Le serveur prend donc la **même décision** dans les deux mondes : il sert la demande ordinaire. Dans W-avec, cela **viole P-global** (l'urgence non connue aurait dû passer avant). Comme les deux mondes sont indiscernables pour le serveur, **aucun protocole ne peut satisfaire P-global** sans information qu'il n'a pas. R07 interdit par ailleurs de convertir une heure de terminal en preuve de priorité globale.

**Concession produit** : réserver une **capacité de réserve** (quota de véhicules ou fenêtre de grâce) aux urgences, ou n'appliquer P-global qu'aux demandes **déjà connues** du serveur. On obtient un service utile et honnête : l'urgence est servie **dès qu'elle devient connue**, sans promettre une priorité globale impossible.

---

## Q6 — Preuve de sûreté, exécution positive, tests

**Preuve de sûreté (R01).** Toute admission passe par la **garde** : `UPDATE guard … WHERE sector=:S` crée un conflit ww sur une ligne unique par secteur. Deux admissions concurrentes du même secteur ne peuvent donc pas valider toutes deux (R02 : au moins une est annulée). L'admission vérifie `count(READY) ≥ 2` **dans l'instantané post-garde** et ne réserve qu'un bus READY. Par induction sur les transactions validées, **≥1 bus reste READY** après chaque COMMIT. Les annulations ne remettent un bus à READY que sous barrière (Q3), donc ne créent jamais de disponibilité fictive.

**Exécution positive (P06).** B1, B2 READY ; seule MA connue ; passerelle opérationnelle ; pas d'annulation. L'admission de MA : garde OK, `count(READY)=2 ≥ 2`, réserve B1, écrit `dispatch-MA`, COMMIT. La passerelle sérialise, déduplique, émet **un seul** départ pour la génération de MA. État final : B1=DEPARTED, **B2=READY (réserve conservée)**, un départ au plus une fois. ✔

**Tests de frontière** :
- *Base* : deux admissions concurrentes même secteur → une seule valide ; rejeu avec même `demand_id` → idempotent ; annulation → outbox purgée.
- *Passerelle* : DISPATCH d'une génération annulée → rejeté ; doublon `command_id` → une seule exécution ; délai réseau → pas d'échec ; barrière émise avant READY.
- *Interface* : clic → `EN VÉRIFICATION` (jamais CONFIRMÉ) ; réponse tardive d'une session close → abandonnée ; annulation inconnue → `RÉSULTAT INCONNU`.

**Ce que la preuve ne démontre pas** : elle ne prouve **pas** la sérialisabilité globale (le write skew subsiste, Q1) ; elle ne prouve **pas** P-global (impossible, Q5) ; elle ne couvre **pas** les pannes de la passerelle elle-même (seulement l'absence de départ d'une génération annulée) ; elle suppose que la garde est **effectivement modifiée** (P02 ne le fait pas).

---

## Question finale — Séparer la sérialisabilité de la violation de réserve

**Deux propriétés orthogonales.**

1. **Sérialisabilité** = propriété de l'**historique** (ordonnancement des accès concurrents) : existe-t-il un ordre sériel équivalent ? Ici, **non** au sens conflict-sérialisable : le graphe `{TA→TB, TB→TA}` est **cyclique**. Sous l'isolation par instantané (R02), l'historique est néanmoins **accepté** (écritures sur lignes distinctes), et son **état final** est reproductible par un ordre sériel (TA;TB et TB;TA donnent le même `{B1:RESERVED, B2:RESERVED, B3:READY}`) — mais la **relation de lecture** diffère (TB lit B1=READY au lieu de RESERVED), donc ce n'est pas view-sérialisable au sens strict.

2. **Violation de réserve** = propriété de l'**état** (invariant métier R01, un **agrégat** : « ≥1 READY »). Elle ne dépend pas de l'ordonnancement mais du **nombre de véhicules engagés**.

**B3 est le témoin de l'indépendance.** B3 n'apparaît dans **aucun conflit** : le graphe — donc la (non-)sérialisabilité — est **strictement identique** avec et sans B3. En revanche, B3 **change l'état** : sans lui, `READY=0` (R01 violé) ; avec lui, `READY=1` (R01 préservé). On obtient donc :

- **Sans B3** : non-sérialisable **et** réserve violée.
- **Avec B3** : non-sérialisable **et** réserve préservée.

Le même diagnostic de sérialisabilité coexiste avec deux états opposés de la réserve : les deux propriétés sont **indépendantes**. Réciproquement, un historique **sérialisable** peut violer la réserve (write skew où chaque transaction préserve localement l'agrégat mais pas globalement), et un historique **non-sérialisable** peut la préserver (cas B3).

**Conséquence pratique.** On ne peut **pas** déduire la sûreté de la sérialisabilité (« c'est sérialisable donc c'est correct » est faux), ni l'insécurité de la non-sérialisabilit頻 (« c'est non-sérialisable donc la réserve est violée » est faux). La sérialisabilité est un **diagnostic de concurrence** ; la réserve est un **invariant métier** qui doit être **protégé explicitement** — par la garde de Q2, qui sérialise les admissions du secteur et vérifie l'agrégat. **B3 ne résout rien** : il **masque** la violation (il reste un véhicule READY) sans protéger l'invariant — une transaction ultérieure TC pourrait réserver B3 et ramener le parc à 0 READY. La correction doit porter sur l'**invariant**, pas sur la sérialisabilité.

**Limites.** Cette séparation est établie pour l'historique P01 ; elle ne prétend pas que *tout* historique non-sérialisable préserve la réserve, ni que la garde rend l'historique sérialisable (elle le rend **sûr** vis-à-vis de R01, pas sérialisable au sens conflictuel).
# RÉPONSE FINALE

## Résultats exacts

**R1 — Graphe de conflits de P01 (avec B3).** Arêtes : `TA→TB` (rw sur B2), `TB→TA` (rw sur B1). Aucun conflit ww (écritures sur objets distincts : B1 vs B2, `outbox_MA` vs `outbox_MB`). **B3 n'apparaît dans aucun conflit.** Graphe = `{TA→TB, TB→TA}` → **cycle**.

**R2 — Sérialisabilité.** **Non conflict-sérialisable** (cycle). **Accepté** par l'isolation par instantané (R02, écritures disjointes). **État final reproductible** par ordre sériel : TA;TB et TB;TA donnent tous deux `{B1:RESERVED, B2:RESERVED, B3:READY}`. **Non view-sérialisable** au sens strict (TB lit B1=READY dans l'historique, mais B1=RESERVED dans l'ordre sériel TA;TB).

**R3 — Réserve (R01).** Avec B3 : `READY=1` après TA;TB (B3) → **préservé**. Sans B3 : `READY=0` → **violé**. Après TA seule : `READY=2` ; après TB seule : `READY=2`.

**R4 — Séparation.** Le graphe de conflits est **identique** avec et sans B3 (B3 hors conflits) ; l'état de la réserve **diffère**. Donc sérialisabilité et violation de réserve sont **orthogonales**, et B3 en est le témoin.

**R5 — Admission correcte.** Garde `guard(sector, version)` **effectivement modifiée** (`UPDATE … SET version=version+1`) → conflit ww garanti → sérialisation des admissions du secteur ; vérification `count(READY) ≥ 2` dans l'instantané post-garde ; réservation conditionnelle `WHERE state='READY'`.

**R6 — P-global.** **Irréalisable** (preuve par mondes indiscernables W-sans / W-avec). **P-local** réalisable (séquence serveur).

## Preuves et certificats

**Certificat de non-sérialisabilité (R1–R2).** Énumération exhaustive des paires d'opérations conflictuelles sur l'historique entrelacé `TA:r(B1),r(B2),r(B3) ; TB:r(B1),r(B2),r(B3) ; TA:w(B1) ; TB:w(B2) ; TA:w(outbox_MA) ; TB:w(outbox_MB)` :

```
Arêtes de conflit : [('TA','TB'), ('TB','TA')]
Cycle TA<->TB : True
```

Le cycle est la preuve canonique d'absence d'ordre sériel compatible. B3, lu par les deux et écrit par personne, ne génère aucune arête : le graphe est invariant sous l'ajout de B3.

**Certificat de réserve (R3).** Simulation d'état :

```
Avec B3 -> READY apres TA;TB : 1
Avec B3 -> READY apres TA seule : 2
Avec B3 -> READY apres TB seule : 2
Etat final TA;TB : {'B1':'RESERVED','B2':'RESERVED','B3':'READY'}
Etat final TB;TA : {'B1':'RESERVED','B2':'RESERVED','B3':'READY'}
Meme etat final : True
Sans B3 -> READY apres TA;TB : 0
```

**Certificat de sûreté (Q6).** La garde crée un conflit ww sur une ligne unique par secteur : deux admissions concurrentes du même secteur ne peuvent valider toutes deux (R02). Induction sur les transactions validées : `count(READY) ≥ 2` avant réservation ⇒ `≥1 READY` après COMMIT. Les annulations ne remettent un bus à READY que sous barrière (Q3) ⇒ aucune disponibilité fictive.

**Certificat d'exécution positive (P06).** B1,B2 READY, seule MA connue : garde OK, `count(READY)=2 ≥ 2`, réserve B1, écrit `dispatch-MA`, COMMIT ; la passerelle émet **un seul** départ pour la génération de MA ; état final `{B1:DEPARTED, B2:READY}` — réserve conservée, départ au plus une fois.

**Certificat d'impossibilité de P-global (Q5).** W-sans et W-avec envoient au serveur **exactement les mêmes messages** jusqu'à la décision sur la demande ordinaire, et aucune capacité n'est préattribuée à l'équipe isolée. Le serveur prend donc la même décision dans les deux mondes ; dans W-avec, il sert l'ordinaire alors qu'une urgence existe ⇒ P-global violé. Les deux mondes étant indiscernables pour le serveur, aucun protocole ne peut satisfaire P-global.

## Pièges traités

1. **Snapshot ≠ sérialisabilité.** L'historique est accepté par l'isolation par instantané (R02) tout en étant non conflict-sérialisable : c'est le write skew. Ne pas conclure « accepté donc sérialisable ».
2. **Sérialisabilité ≠ sûreté.** Un historique sérialisable peut violer R01 ; un historique non-sérialisable peut la préserver (cas B3). Les deux diagnostics sont orthogonaux.
3. **B3 masque, ne résout pas.** B3 laisse un véhicule READY sans protéger l'invariant : une transaction ultérieure TC pourrait réserver B3 et ramener le parc à 0 READY. La correction doit porter sur l'invariant (garde), pas sur la sérialisabilité.
4. **Contrainte unique ≠ invariant d'agrégat.** La contrainte « deux missions actives par bus » est aveugle au nombre de READY (R03).
5. **P02 est un no-op.** `SELECT … FOR UPDATE` sur des missions inexistantes ne verrouille rien ; un verrou sans modification ne renouvelle pas l'instantané (R02).
6. **Effet externe irréversible.** Un rollback n'annule pas un effet externe (R02) : l'envoi physique est exclu de la transaction, matérialisé par la passerelle sous barrière.
7. **Annulation ≠ retour.** Une demande d'annulation n'est ni un retour ni la preuve d'un non-départ (R05) ; P04 confond les deux.
8. **Fencing ≠ idempotence ≠ autorisation.** La dédup par `command_id` seul (R04) ne suffit pas : il faut un fencing par génération pour rejeter les DISPATCH périmés.
9. **CONFIRMÉ ≠ optimiste.** Le mot CONFIRMÉ exige un engagement durable serveur ; P03 le dégrade en notification optimiste irréversible (R06).
10. **Heure de terminal ≠ priorité globale.** R07 interdit d'en faire une preuve ; P-global reste irréalisable.

## Limites / impossibilités

- **Non-sérialisabilité non corrigée par la garde.** La garde rend l'historique **sûr vis-à-vis de R01**, pas sérialisable au sens conflictuel : le cycle rw subsiste. La séparation établie pour P01 ne prétend pas que *tout* historique non-sérialisable préserve la réserve.
- **P-global impossible.** Aucun protocole ne peut servir une urgence que le serveur ne connaît pas avant une demande ordinaire (mondes indiscernables). Seule une concession (quota de réserve, fenêtre de grâce, P-global restreint aux demandes connues) offre un service utile.
- **Pannes de la passerelle non couvertes.** La preuve garantit l'absence de départ d'une génération annulée, pas la disponibilité de la passerelle elle-même.
- **Hypothèse de la garde.** La sûreté suppose que la ligne `guard` est **effectivement modifiée** à chaque admission ; P02 ne le fait pas et ne protège donc rien.
- **Progrès conditionnel.** R08 : le progrès n'est exigible que si base et passerelle répondent, les échanges finissent par être livrés, un véhicule est allouable en plus de la réserve, et les conflits ne font pas échouer éternellement les tentatives. Hors de ces conditions, seule la sûreté est garantie.