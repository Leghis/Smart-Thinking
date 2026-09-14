# SIII-01-V4 — SIII-01 → Priorité reçue seulement

Score: 100.0 % (certificats 0/0, juge 100/100)

Certificats manqués: aucun

J'ai tous les éléments. Je rédige la réponse finale.

## Réponse

**Question de la variante : OUI — sous P-local, une demande ordinaire reçue (donc connue du serveur) peut être confirmée malgré l'existence d'un terminal isolé détenant une demande urgente non livrée.**

C'est précisément le renversement que la variante opère : sous **P-global** (dossier de base), la réponse était **NON** (impossibilité) ; sous **P-local**, elle devient **OUI**, et c'est même la seule politique compatible avec R08 (interdiction de refuser toujours).

Résultats exacts :

| Quantité | Valeur |
|---|---|
| États du parc (B1,B2) ∈ {READY,RESERVED,DEPARTED,CANCEL_PENDING}² | 16 |
| États admissibles (≥1 READY, R01) | **7** |
| États interdits (0 READY) | 9 |
| Capacité d'admission simultanée depuis (READY,READY) | **1** mission active + **1** réserve inaliénable |
| Décision serveur W-sans (P-local) | confirmer O |
| Décision serveur W-avec (P-local) | confirmer O → **identiques** |
| Décision serveur W-sans (P-global) | confirmer O |
| Décision serveur W-avec (P-global) | refus (None) → **divergentes** |

## Preuves et certificats

**Q1 — Graphe de dépendances de P01 et absence d'ordre sériel.**
TA et TB lisent tous deux l'état initial (B1=READY, B2=READY) et écrivent des lignes **distinctes** (B1/MA/outbox-MA vs B2/MB/outbox-MB). Graphe : `{TA,TB} → lecture(B1,B2)` puis `TA → écriture(B1,MA)`, `TB → écriture(B2,MB)`. Aucune arête d'écriture partagée ⇒ sous isolation par instantané (R02), **les deux valident**. Or l'invariant métier R01 exige ≥1 READY après chaque commit. Énumération exhaustive des deux ordres sériels :
- TA→TB : état final (RESERVED,RESERVED) → **0 READY → violation R01**.
- TB→TA : état final (RESERVED,RESERVED) → **0 READY → violation R01**.

⇒ **Aucun ordre sériel n'est compatible avec R01** : le défaut n'est pas un défaut de sérialisabilité au sens classique, mais l'absence d'un **objet de conflit** matérialisant l'invariant métier. La contrainte unique (bus_id) ne porte que sur les missions actives d'un même bus, **pas sur le nombre de bus READY** : elle ne bloque rien. P02 (`SELECT … FOR UPDATE` sur missions actives) échoue car **0 mission active au début** ⇒ 0 verrou posé, 0 ligne de garde modifiée, snapshot non renouvelé ⇒ les deux transactions valident quand même.

**Q2 — Schéma et pseudo-code d'admission.** L'objet de conflit manquant est la ligne `guard(sector, version)`, **modifiée** par chaque admission (R03). Frontière de reprise = la transaction entière ; identité de demande = `(demand_id)` stable, jamais l'heure terminal.

```
BEGIN;  -- snapshot fixe
  SELECT version FROM guard WHERE sector=:s FOR UPDATE;   -- ligne réellement modifiée
  n_ready := SELECT count(*) FROM bus WHERE state='READY' AND sector=:s;
  IF n_ready - 1 < 1 THEN ROLLBACK; RETURN REJECT; END IF;  -- R01 : garder la réserve
  b := SELECT id FROM bus WHERE state='READY' AND sector=:s ORDER BY id LIMIT 1;
  UPDATE bus SET state='RESERVED', generation=generation+1 WHERE id=b.id;
  INSERT INTO mission(id,bus_id,state) VALUES(:demand_id,b.id,'RESERVED');
  INSERT INTO outbox(command_id,payload) VALUES(:cmd_id, 'DISPATCH:'||b.id||':'||gen);
  UPDATE guard SET version=version+1 WHERE sector=:s;      -- sérialise les admissions
COMMIT;  -- CONFIRMÉ émis seulement ici
```
**Effets exclus de la transaction** : l'émission du mot CONFIRMÉ à l'usager (post-commit), l'exécution physique du départ (passerelle), toute remise à READY (R05). La transaction ne fait que réserver durablement.

**Q3 — Machine à états et réparation de P04.**
`READY --admit--> RESERVED --dispatch(barrière)--> DEPARTED --retour physique--> READY`
`RESERVED --cancel--> CANCEL_PENDING --(barrière durable)--> READY`
P04 : l'annulation valide, l'app remet B1=READY **sans preuve**, puis un ancien DISPATCH arrive et la passerelle l'exécute (dédup par `command_id`, non encore exécuté) ⇒ B1 part alors qu'il est READY et peut avoir été réservé par MC ⇒ **double usage**. Réparation : B1 ne redevient READY **que** sur (a) preuve de retour physique, ou (b) **barrière durable** de la passerelle attestant qu'aucun départ de la génération annulée n'a eu lieu **et** qu'aucun ne pourra avoir lieu. Obligations passerelle : sérialiser localement les commandes, rejeter tout DISPATCH dont la génération < génération courante du bus, émettre un reçu de barrière persistant. **Ne pas confondre** : barrière logique (garantie d'ordre durable) ≠ reçu (accusé) ≠ état physique (retour constaté).

**Q4 — États visibles interface.** États annoncés : `EN ATTENTE` (requête locale, non engagée), `CONFIRMÉ` (commit serveur durable uniquement), `INDISPONIBLE` (rejet), `ANNULATION EN COURS` (résultat inconnu), `ANNULÉ` (barrière/preuve obtenue). P03 est un anti-pattern : afficher « confirmé » au clic puis remplacer silencieusement viole R06 (le mot CONFIRMÉ = engagement durable serveur). Changement de session pendant réponse tardive : l'app abandonne la réponse devenue étrangère à sa session d'affichage (R06) et re-lit l'état serveur. Annulation à résultat inconnu : afficher `ANNULATION EN COURS`, jamais `ANNULÉ` avant barrière/preuve.

**Q5 — Priorités et promesses hors ligne (cœur de la variante).**
*Preuve par mondes indiscernables (P05)* : W-sans (seule O connue) et W-avec (O connue + U urgente créée sur terminal isolé, **non livrée**) présentent au serveur **exactement les mêmes messages** jusqu'à sa décision sur O. Sous P-local, la fonction de décision ne dépend que de l'état local (demandes connues + séquence serveur) : `dec_plocal(['O'],2,{O:1}) = O` dans **les deux** mondes ⇒ décisions **identiques** ⇒ **O est confirmée malgré le terminal isolé**. Sous P-global, la décision dépend de l'existence globale de U : `dec_pglobal` renvoie `O` en W-sans mais `None` en W-avec ⇒ **divergence** ⇒ O non confirmable de façon sûre sans capacité préattribuée (interdite par la variante). **Conclusion : P-local est réalisable, P-global ne l'est pas** dans ce cadre.

*Concession produit* : confirmer O (sûr, R01 préservé : 1 bus consommé, 1 reste READY), et placer U en **file d'attente servie au premier retour de bus**, avec affichage honnête `EN ATTENTE` (jamais `CONFIRMÉ`). Alternative : préattribuer explicitement une capacité à l'équipe isolée — mais la variante l'interdit.

**Q6 — Sûreté, exécution positive, tests.**
*Sûreté* : toute admission passe par la ligne `guard` modifiée ⇒ sérialisation ; la condition `n_ready-1 ≥ 1` garantit R01 après chaque commit ; la remise à READY est conditionnée à barrière/preuve (R05) ⇒ pas de double usage. *Exécution positive (P06)* : B1,B2 READY, seule MA connue, passerelle OK ⇒ MA confirmée, B2 reste READY (réserve), un seul départ par génération (dédup `command_id` + génération). *Tests de frontière* : base (deux admissions concurrentes → une seule valide), passerelle (DISPATCH ancien après annulation → rejeté par génération), interface (réponse tardive après changement de session → abandonnée ; annulation inconnue → `EN ATTENTE`).

## Pièges traités

- **Snapshot vs sérialisabilité** : P01 est cohérent en instantané mais **non sérialisable** vis-à-vis de R01 ; l'ordre sériel explicite TA→TB et TB→TA est produit et **les deux violent R01**.
- **Tous les témoins explorés** : énumération exhaustive des 16 états du parc (7 admissibles, 9 interdits), pas seulement les cycles courts ; les deux ordres sériels et les deux mondes W-sans/W-avec sont couverts.
- **Effet externe irréversible** : un DISPATCH exécuté par la passerelle **n'est pas annulé** par le rollback de la transaction d'annulation (R02) — d'où la barrière durable obligatoire (P04).
- **Exactly-once / fencing / idempotence / autorisation** : la dédup par `command_id` (idempotence) ne suffit pas ; il faut le **fencing par génération** (rejet des ordres périmés) et l'**autorisation** d'admission par la garde. Confondre ces notions reproduit P04.

## Limites / impossibilités

- **Sous P-local, on ne peut PAS garantir** que la demande urgente isolée U soit servie avant un délai borné : sans capacité préattribuée ni priorité globale, U attend le premier retour de bus. Ce n'est pas une violation (R08 n'exige le progrès que si un véhicule allouable existe **en plus** de la réserve — condition non remplie après confirmation de O).
- **P-global est irréalisable** dans ce cadre : la preuve par mondes indiscernables montre que le serveur ne peut pas distinguer W-sans de W-avec, donc ne peut pas garantir la priorité globale sans préattribution (interdite).
- **La confirmation de O consomme la marge** : après elle, il n'existe plus de véhicule allouable en plus de la réserve, donc tout progrès ultérieur est suspendu jusqu'à un retour physique.
- **Ce que la preuve ne démontre pas** : elle ne prouve pas la vivacité sous partition permanente (R08 l'exclut explicitement), ni l'absence de famine si les modifications concurrentes échouent éternellement (hypothèse de progrès requise), ni la correction de la passerelle physique elle-même (supposée sérialiser localement et émettre des barrières durables).