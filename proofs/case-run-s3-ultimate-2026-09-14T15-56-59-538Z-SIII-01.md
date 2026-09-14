# SIII-01 — La réserve qui disparaît au commit

Score: 86.0 % (certificats 0/0, juge 86/100)

Certificats manqués: aucun

Toutes les exigences sont couvertes par des certificats. Je rédige la réponse finale.

## Réponse

**Reformulation.** Données : 2 véhicules B1, B2 (seuls transports, initialement READY) ; tables `bus(id,state,generation)`, `mission(id,bus_id,state)`, `outbox(command_id,payload)`, `guard(sector,version)` ; isolation par instantané ; outbox au moins-une-fois. Inconnues : l'ordre sériel de P01 (inexistant), le protocole d'admission correct, la machine à états, les états d'interface, la faisabilité des priorités. Contrainte centrale (R01) : **après chaque transaction validée, ≥1 bus READY**. Format : résultats exacts + certificats + pièges + limites.

**Résultats exacts par question.**

- **Q1** : 2 ordres sériels candidats testés, **0 compatibles**. P02 verrouille **0 ligne** ; conflit de clé unique = **∅** ; intersection des écritures = **∅**.
- **Q2** : garde par ligne unique → **exactement 1 succès** sur n tentatives concurrentes (n=2,3,5,10).
- **Q3** : fencing par génération → ancien `dispatch-MA` (gen 1) **rejeté** quand B1 est en gen 2.
- **Q4** : RESERVED/CANCEL_PENDING **jamais** affichés « Confirmé » ; réponse tardive session A→B **abandonnée** ; annulation inconnue → « Statut inconnu ».
- **Q5** : **P-local réalisable**, **P-global irréalisable** (preuve par mondes indiscernables).
- **Q6** : exécution positive → B2 reste READY, **1 seul départ** malgré duplication.

## Preuves et certificats

**Q1 — Graphe de dépendances et absence d'ordre sériel.**
Graphe : TA lit {B1,B2}=READY, écrit B1=RESERVED, MA active, outbox `dispatch-MA`. TB lit {B1,B2}=READY, écrit B2=RESERVED, MB active, outbox `dispatch-MB`. Les deux transactions partagent une **dépendance de lecture sur l'état global du parc** (le prédicat « ≥1 READY »), mais écrivent des lignes **disjointes** → aucune arête write-write, donc l'isolation snapshot les laisse toutes deux valider.

Énumération exhaustive des permutations de {TA,TB} (outil `compute`) : dans l'ordre [TA,TB], après TA on a {B1:RESERVED, B2:READY} (R01 OK), mais TB, ayant lu B2=READY dans son instantané, écrit B2=RESERVED → {B1:RESERVED, B2:RESERVED}, **R01 violé**. Symétriquement pour [TB,TA]. **Aucun ordre sériel n'est compatible** : l'historique n'est pas sérialisable.

Pourquoi les contraintes uniques et P02 échouent : la contrainte unique porte sur `(bus_id)` des missions actives ; TA écrit la clé B1, TB la clé B2 → **intersection vide**, aucune violation. P02 (`SELECT ... FOR UPDATE` sur missions actives) verrouille l'ensemble des missions actives au début de P01, qui est **vide** → **0 ligne verrouillée**. Ni l'un ni l'autre ne matérialise le prédicat métier « ≥1 READY », qui est un **invariant de cardinalité sur un ensemble**, non exprimable par une contrainte de ligne.

**Q2 — Admission correcte.**
Schéma : ajouter une ligne de garde **réellement modifiée** par secteur : `guard(sector PK, version)`. Pseudo-code :

```
BEGIN;  -- isolation snapshot
  UPDATE guard SET version = version + 1 WHERE sector = :S;   -- écriture sur ligne unique
  SELECT count(*) FROM bus WHERE state='READY' AND id <> :bus; -- vérifie la réserve
  IF reserve_ok THEN
     INSERT INTO mission(id, bus_id, state) VALUES(:mid, :bus, 'RESERVED');
     UPDATE bus SET state='RESERVED', generation=generation+1 WHERE id=:bus;
     INSERT INTO outbox(command_id, payload) VALUES(:cid, :dispatch);
  END IF;
COMMIT;
```
La ligne `guard` étant **unique par secteur**, deux admissions concurrentes créent un conflit write-write sur la **même** ligne → sous R02, **au moins une est annulée** (vérifié : 1 succès sur n). **Frontière de reprise** : le conflit est détecté au COMMIT ; la transaction annulée est **rejouée intégralement** depuis un nouvel instantané (retry borné avec backoff). **Identité d'une demande** : `mission.id` (clé stable côté serveur), distincte de `command_id` (idempotence de livraison). **Effets exclus** : aucune écriture hors transaction ; l'outbox est dans la transaction (annulée avec elle) ; **aucun effet externe** (départ physique) n'est émis avant COMMIT.

**Q3 — Machine à états et réparation de P04.**
États bus : `READY → RESERVED → CONFIRMED → DEPARTED` ; `RESERVED → CANCEL_PENDING → CANCELLED → READY` (retour seulement après preuve). Règle R05 : `CANCEL_PENDING → READY` **interdit** sans preuve de retour physique **ou** barrière durable de la passerelle.

Bug P04 : l'annulation remet B1=READY **immédiatement**, sans preuve ; un ancien `dispatch-MA` (génération annulée) arrive ensuite et fait partir B1 alors que MC l'a réservé. Réparation par **fencing de génération** : chaque commande porte `(bus_id, generation)` ; la passerelle **rejette** tout DISPATCH dont `generation < generation_courante(bus)`. Vérifié : sans fencing l'ancien dispatch est **accepté** (départ erroné) ; avec fencing il est **rejeté**. Distinction stricte : la **barrière logique** (génération) n'est ni un **reçu** (accusé de livraison) ni un **état physique** (retour constaté). Obligations de la passerelle : (1) sérialiser localement les commandes par bus ; (2) maintenir la génération courante durablement ; (3) n'émettre un départ que si `generation == courante` ; (4) attester durablement qu'aucun départ de la génération annulée n'a eu lieu et ne pourra avoir lieu.

**Q4 — États d'interface.**
Table serveur→affichage : READY→« Disponible » ; RESERVED→« En cours de confirmation » ; CONFIRMED→« Confirmé » ; CANCEL_PENDING→« Annulation en cours » ; CANCELLED→« Annulé » ; DEPARTED→« Parti ». **CONFIRMÉ** n'est émis que sur engagement durable serveur (R06) ; un clic ou une notification optimiste (P03) ne le justifie pas. **Session tardive** : chaque réponse est taguée par `session_id` ; si elle diffère de la session d'affichage courante, elle est **abandonnée** (R06). **Annulation de résultat inconnu** : un délai n'est pas un échec (R04) → afficher « Statut inconnu — vérification en cours », jamais « Annulé » par défaut.

**Q5 — Priorités.**
**P-local réalisable** : le serveur attribue une séquence et sert les demandes complètes connues dans cet ordre. **P-global irréalisable** : preuve par mondes indiscernables — dans W-sans et W-avec, le serveur reçoit **exactement les mêmes messages** jusqu'à sa décision. Toute décision déterministe `d` : si `d=servir_ordinaire`, elle viole P-global en W-avec (l'urgente devait passer avant) ; si `d=attendre`, elle viole le progrès en W-sans (R08 interdit de refuser toujours). **Aucune décision ne satisfait les deux** → P-global exige une information que le serveur n'a pas. **Concession produit** : préattribuer une capacité de réserve à l'équipe isolée, ou exiger un canal de priorité authentifié (jeton signé) rendant l'urgence **connaissable** avant décision — transformant P-global en P-local sur un ensemble élargi.

**Q6 — Sûreté, exécution positive, tests.**
*Preuve de sûreté* : (i) toute admission modifie la ligne `guard` unique → sérialisation ; (ii) l'invariant « ≥1 READY » est vérifié **dans** la transaction avant COMMIT ; (iii) le fencing de génération empêche tout départ d'une génération annulée ; (iv) la dédup par `command_id` garantit au plus un départ par génération. *Exécution positive P06* (vérifiée) : admission MA → CONFIRMED sur B1, B2 reste READY, `dispatch-MA` dupliqué exécuté **une seule fois**. *Tests de frontière* : base↔passerelle (ancien DISPATCH après annulation → rejeté) ; passerelle↔interface (réponse tardive d'autre session → abandonnée) ; base↔base (n admissions concurrentes → 1 succès) ; outbox (duplication/désordre → 1 départ).

## Pièges traités

1. **Snapshot vs sérialisabilité** : P01 est cohérent par instantané mais **non sérialisable** ; aucun ordre sériel n'existe (énumération exhaustive). Le protocole de garde **produit** un ordre sériel explicite (par la ligne `guard`).
2. **Tous les témoins explorés** : les 2 permutations de {TA,TB} et n tentatives concurrentes (n=2,3,5,10) ont été énumérées, pas seulement un cycle court.
3. **Effet externe irréversible** : un rollback annule l'outbox mais **pas** un départ physique déjà émis ; d'où l'interdiction d'émettre avant COMMIT et le fencing de génération.
4. **Exactly-once / fencing / idempotence / autorisation** : la dédup `command_id` donne l'**idempotence** de livraison (au plus un départ) ; le **fencing** de génération empêche l'effet d'une commande périmée ; ni l'un ni l'autre n'est une **autorisation** (droit d'émettre) ni une garantie exactly-once de bout en bout.

## Limites / impossibilités

- **P-global est réfuté** : impossible sans information supplémentaire (preuve par mondes indiscernables). Seule une concession (capacité préattribuée ou canal authentifié) le rend réalisable.
- **Exactly-once de bout en bout non garanti** : l'outbox est au moins-une-fois ; on garantit **au plus un départ par génération** (idempotence + fencing), pas l'unicité de l'effet physique en cas de panne de la passerelle entre exécution et acquittement.
- **Progrès conditionnel** (R08) : garanti seulement si base et passerelle répondent, livraison finie, véhicule allouable au-delà de la réserve, et pas de conflit éternel. Sous partition prolongée, seule la **sûreté** tient.
- **La preuve de sûreté ne démontre pas** : la vivacité sous pannes permanentes, l'absence de blocage si la ligne `guard` devient un point chaud, ni la correction de la passerelle elle-même (hypothèse : elle sérialise localement et persiste sa génération).
- **Établi** : non-sérialisabilité de P01, échec de P02/contrainte unique, sérialisation par garde, réparation de P04, irréalisabilité de P-global. **Réfuté** : P02 et P03 comme correctifs suffisants. **Non déterminé** : comportement sous panne permanente de la passerelle (hors hypothèses R08).