# SIII-01-V4 — SIII-01 → Priorité reçue seulement

Score: 91.0 % (certificats 0/0, juge 91/100)

Certificats manqués: aucun

Toutes les affirmations sont certifiées. Je rédige maintenant la réponse finale complète.

---

# Mission Refuge — Variante P-local : réponse complète

**Réponse directe à la question de la variante : OUI.** Sous P-local, une demande ordinaire reçue **peut** être confirmée malgré l'existence d'un terminal isolé porteur d'une demande urgente. C'est précisément ce que la variante rend possible, et c'est aussi ce qui la distingue de P-global, qui est **impossible**. Je démontre les deux ci-dessous (Q5), après avoir reconstitué l'anomalie (Q1) et construit le protocole (Q2–Q4, Q6).

---

## Q1 — Graphe de dépendances de P01, absence d'ordre sériel, échec de P02

### Graphe des dépendances (P01)

| Transaction | Lit | Écrit | Outbox |
|---|---|---|---|
| **TA** | B1=READY, B2=READY | B1→RESERVED, mission MA | `dispatch-MA` |
| **TB** | B1=READY, B2=READY | B2→RESERVED, mission MB | `dispatch-MB` |

Dépendances :
- **TA → TB (rw-antidependance)** : TA lit B2=READY ; TB écrit B2. TA doit précéder TB dans tout ordre sériel.
- **TB → TA (rw-antidependance)** : TB lit B1=READY ; TA écrit B1. TB doit précéder TA.
- **Aucune dépendance ww** : les lignes écrites sont disjointes (B1 vs B2, MA vs MB, deux entrées d'outbox distinctes).

Le graphe contient le **cycle TA → TB → TA**. C'est la signature exacte du **write skew** : deux rw-antidépendances croisées, sans conflit d'écriture.

### Absence d'ordre sériel compatible

Il n'existe que deux ordres sériels : `[TA,TB]` et `[TB,TA]`. Vérification exhaustive (outil `compute`) :

```
('TA','TB') → {B1:RESERVED, B2:RESERVED} → READY=0 → VIOLATION
('TB','TA') → {B1:RESERVED, B2:RESERVED} → READY=0 → VIOLATION
SI final    → {B1:RESERVED, B2:RESERVED} → READY=0 → VIOLATION
```

**Aucun ordre sériel ne produit l'état final observé** : l'exécution P01 n'est donc pas sérialisable, et l'état final viole R01 (≥1 READY). L'isolation par instantané (R02) valide les deux transactions parce qu'elles touchent des lignes distinctes ; elle ne détecte pas le cycle rw.

### Pourquoi les contraintes uniques et P02 échouent

- **Contrainte unique (R03)** : elle interdit *deux missions actives sur un même bus*. Ici MA est sur B1 et MB sur B2 — **aucune collision**. La contrainte est une contrainte d'**unicité** (au plus un), alors que l'invariant métier est une contrainte de **cardinalité** (au moins un READY). Une contrainte d'unicité ne peut pas exprimer « au moins un ».
- **P02 (`SELECT ... FOR UPDATE` sur les missions actives)** : au début de P01, **il n'existe aucune mission active**. Le verrou ne porte donc sur **aucune ligne** ; aucune ligne de garde n'est effectivement modifiée. R02 précise qu'« un simple verrou sans modification ne renouvelle pas l'instantané » : les deux transactions restent sur des instantanés concurrents et valident. P02 ne crée aucun conflit d'écriture, donc ne casse pas le cycle.

**Diagnostic** : il faut **matérialiser le conflit** sur une ligne commune à toutes les admissions du secteur.

---

## Q2 — Schéma et pseudo-code d'une admission correcte

### Schéma (R03 étendu)

```sql
bus(id PK, state, generation)
mission(id PK, bus_id FK, state, request_id UNIQUE, generation)
outbox(command_id PK, payload, generation)
guard(sector PK, version)          -- ligne de garde, UNE par secteur
```

- `guard(sector, version)` est la **ligne de conflit matérialisée** : toute admission la modifie.
- `request_id` : **identité de la demande**, stable, fournie par le client (pas un horodatage terminal — R07/R04).
- `generation` : compteur monotone par bus, sert de **fencing token** (Q3).

### Pseudo-code transactionnel

```
ADMIT(request_id, sector):
  BEGIN TRANSACTION (isolation par instantané)
    -- 1. Idempotence : la demande a-t-elle déjà été admise ?
    IF EXISTS mission WHERE request_id = request_id THEN
        RETURN (ALREADY_ADMITTED, mission.id)   -- rejeu sûr

    -- 2. Ligne de garde : force le conflit d'écriture
    UPDATE guard SET version = version + 1 WHERE sector = sector
        -- si version lue ≠ version courante → conflit → ABORT (R02)

    -- 3. Choisir un bus READY, en réservant la réserve
    SELECT id FROM bus WHERE state = 'READY' ORDER BY id
    IF count(READY) < 2 THEN ABORT(INSUFFICIENT_RESERVE)  -- garde ≥1 READY
    bus := premier READY
    gen := bus.generation

    -- 4. Écritures locales
    UPDATE bus SET state='RESERVED', generation=gen WHERE id=bus
    INSERT mission(id, bus, 'RESERVED', request_id, gen)
    INSERT outbox(command_id=uuid(), payload=('DISPATCH', bus, gen))

  COMMIT   -- atomique : bus + mission + outbox + guard, ou rien
  RETURN (CONFIRMED, mission.id)
```

### Frontière de reprise après conflit

La frontière est **la transaction entière**. En cas de conflit sur `guard` (ou de contrainte), R02 annule **toutes** les écritures, **y compris l'outbox**. Le client **rejoue la transaction complète** avec le **même `request_id`** : l'étape 1 garantit qu'un rejeu après commit effectif ne crée pas de doublon. La reprise est donc **idempotente et bornée** : elle ne boucle éternellement que si des conflits surviennent sans fin, ce que R08 exclut (« des modifications concurrentes ne font pas échouer éternellement les tentatives »).

### Effets exclus de la transaction

- **Aucun effet externe** (envoi physique, notification) n'est dans la transaction : R02 rappelle qu'« aucun effet externe n'est annulé par ce mécanisme ». Le départ physique est déclenché **uniquement** par la passerelle, après lecture de l'outbox committée.
- **Aucune décision d'interface** (affichage « confirmé ») n'est prise dans la transaction : elle suit le commit (Q4).

---

## Q3 — Machine à états, réparation de P04, obligations de la passerelle

### Machine à états

**Bus** : `READY → RESERVED → DEPARTED → (retour physique) → READY`
- `RESERVED → CANCEL_PENDING → READY` **seulement** via preuve de retour physique **ou** barrière durable de la passerelle (R05).
- `RESERVED`, `DEPARTED`, `CANCEL_PENDING` ne sont **jamais** des disponibilités (R01).

**Mission** : `RESERVED → DISPATCHED → RETURNED` ; `RESERVED → CANCELLED` (logique) ; `CANCELLED` n'autorise **pas** le retour à READY sans preuve.

### Réparation de P04

P04 : MA est RESERVED, `dispatch-MA` en transit ; l'annulation valide ; l'application remet **immédiatement** B1 à READY ; l'ancien DISPATCH arrive ensuite → **départ fantôme** ; MC peut avoir réservé B1 entre-temps → **deux missions sur un bus**.

**Faute** : confondre *annulation logique* (un reçu) avec *état physique*. R05 est explicite : une demande d'annulation n'est ni un retour ni la preuve qu'il n'est jamais parti.

**Réparation** : B1 ne redevient READY qu'après :
1. **preuve de retour physique** (le véhicule est constaté revenu), **ou**
2. **barrière durable de la passerelle** attestant qu'aucun départ de la génération annulée n'a eu lieu **et** qu'aucun ne pourra encore avoir lieu.

La passerelle sérialise localement commandes et état physique (R05) : elle émet un **fencing token = génération**. Un `DISPATCH` portant une génération **inférieure** à la génération courante du bus est **rejeté** par la passerelle, même s'il arrive tard. C'est ce qui tue le départ fantôme de P04.

**Distinction des trois notions** :
- **Barrière logique** : marqueur durable côté passerelle (fencing) — suffit pour READY *si* elle atteste l'absence de départ possible.
- **Reçu** : accusé de réception d'une commande — **ne prouve rien** sur l'état physique.
- **État physique** : position réelle du véhicule — preuve directe.

### Obligations de la passerelle

1. **Sérialiser localement** les commandes et l'état physique (R05).
2. **Dédupliquer** par `command_id` (R04) **et** par `(bus, generation)` : un `DISPATCH` d'une génération périmée est rejeté.
3. **Émettre une barrière durable** avant tout retour à READY sans retour physique.
4. **Ne jamais** traiter un délai réseau comme un échec (R04).
5. **Exécuter au plus une fois** un départ par génération (P06).

---

## Q4 — États visibles et annoncés par l'interface

### États visibles

| État affiché | Condition serveur |
|---|---|
| **EN ATTENTE** | demande reçue, non committée |
| **CONFIRMÉ** | commit durable serveur (R06) |
| **INDISPONIBLE** | refus durable (réserve insuffisante) |
| **INDÉTERMINÉ** | résultat inconnu (annulation en cours, partition) |
| **ANNULÉ** | annulation durable **et** état physique cohérent |

**P03 est rejeté** : afficher « Transport confirmé » dès le clic est une **notification optimiste**, pas un engagement durable (R06). Le remplacement silencieux ultérieur ne répare rien : la notification sonore initiale reste en mémoire de l'usager. L'interface ne doit annoncer CONFIRMÉ **qu'après** le commit serveur.

### Changement de session pendant une réponse tardive

Une réponse tardive peut être **étrangère à la session d'affichage** (R06). L'application honnête **abandonne** cette réponse : elle ne l'applique pas à la session courante. Le lecteur d'écran n'annonce que les transitions **rattachées à la session active** ; une réponse orpheline est ignorée (ou journalisée), jamais affichée comme un changement d'état.

### Annulation au résultat inconnu

Tant que le sort de l'annulation n'est pas durablement connu, l'état reste **INDÉTERMINÉ** — **jamais CONFIRMÉ**, jamais « annulé ». L'interface peut afficher « annulation en cours, résultat inconnu » et **ne libère pas** la promesse de disponibilité. Le retour à READY n'est annoncé qu'après la preuve de Q3.

---

## Q5 — Priorités réalisables, preuve par mondes indiscernables, concession

### Décision

- **P-global : impossible.** Il exige de servir toute demande urgente créée ailleurs **avant** une ordinaire, **même inconnue du serveur**. Or le serveur ne peut pas ordonner ce qu'il ne connaît pas, les horloges terminal ne donnent pas d'ordre global fiable (R04), et R07 interdit d'utiliser une heure terminal comme preuve de priorité globale.
- **P-local : réalisable.** Priorité aux demandes **complètes déjà connues du serveur**, selon une **séquence attribuée par le serveur**. C'est un ordre total local, calculable.

### Preuve par mondes indiscernables (P05)

- **W-sans** : seul un terminal connecté a une demande ordinaire complète.
- **W-avec** : un terminal isolé a créé auparavant une demande urgente.
- **Hypothèse** : le serveur reçoit **exactement les mêmes messages** dans les deux mondes jusqu'à sa décision sur l'ordinaire ; aucune capacité n'est préattribuée à l'équipe isolée.

Toute fonction de décision **déterministe** du serveur produit donc la **même sortie** dans W-sans et W-avec. Si le serveur confirme l'ordinaire dans W-sans, il la confirme **aussi** dans W-avec. Mais P-global exige que l'urgente (présente dans W-avec) soit servie **avant** l'ordinaire — contradiction. **P-global est violé dans W-avec.** ∎

### Réponse à la question de la variante

**Oui, une demande ordinaire reçue peut être confirmée malgré un terminal isolé.** Sous P-local, la demande urgente isolée est **inconnue du serveur** et **sans capacité préattribuée** : elle ne peut donc pas bloquer la décision. Le serveur confirme l'ordinaire dès lors qu'il reste **≥1 bus READY** après admission. Vérification (2 bus) :

```
admissions=0 → READY restants=2 → réserve conservée
admissions=1 → READY restants=1 → réserve conservée   ← cas de la demande ordinaire
admissions=2 → READY restants=0 → VIOLATION (refus)
```

Confirmer **une** demande ordinaire consomme 1 bus et **laisse exactement 1 bus READY** : la réserve est conservée (R01). Une seconde admission simultanée est refusée par la garde.

### Concession produit

Puisque P-global est impossible, la concession honnête est : **P-local + réservation de réserve**. On garantit :
- priorité **locale** aux demandes connues, séquence serveur ;
- **conservation d'un véhicule de réserve** (jamais 0 READY) ;
- pour les terminaux isolés : **pas de promesse de priorité globale**, mais une **file d'attente** qui, à la reconnexion, traite les demandes urgentes selon la séquence serveur — sans jamais préempter une admission déjà committée.

---

## Q6 — Preuve de sûreté, exécution positive, tests, limites

### Preuve de sûreté (invariant R01)

**Théorème.** Sous le protocole Q2, après tout commit, au moins un bus reste READY.

**Preuve.** Toute admission (i) modifie `guard(sector,version)` — donc deux admissions concurrentes du même secteur entrent en conflit d'écriture et **au moins une est annulée** (R02) ; (ii) vérifie `count(READY) ≥ 2` **dans la même transaction** que la réservation. Par sérialisation des admissions via `guard`, les admissions s'exécutent en série ; chacune ne consomme un bus que s'il en reste ≥2, laissant ≥1 READY. Les annulations/retours ne peuvent **augmenter** le nombre de RESERVED ; le retour à READY exige une preuve physique/barrière (Q3), donc ne crée pas de départ fantôme. ∎

**Exactly-once effectif** : dédup `command_id` (R04) + fencing de génération (Q3) ⇒ au plus un départ par génération (P06).

### Exécution positive (P06)

B1, B2 READY ; seule MA connue ; passerelle OK ; pas d'annulation.
1. `ADMIT(MA)` : guard incrémenté, B1→RESERVED, mission MA, `dispatch-MA` en outbox. **Commit.**
2. Passerelle lit l'outbox, exécute `dispatch-MA` **une fois** (dédup + fencing).
3. État final : B1=DEPARTED, **B2=READY** (réserve conservée), MA confirmée, **un seul** départ pour la génération. ✔

### Tests couvrant les frontières base / passerelle / interface

| Frontière | Test | Attendu |
|---|---|---|
| Base (write skew) | TA/TB concurrents (P01) | une seule admission committée ; ≥1 READY |
| Base (rejeu) | même `request_id` rejoué | ALREADY_ADMITTED, pas de doublon |
| Base (réserve) | 2 admissions simultanées | 2ᵉ refusée (INSUFFICIENT_RESERVE) |
| Passerelle (P04) | annulation + ancien DISPATCH | DISPATCH rejeté (génération périmée) |
| Passerelle (désordre) | DISPATCH livré 2× / en désordre | un seul départ |
| Interface (P03) | clic puis rejet | jamais CONFIRMÉ avant commit |
| Interface (session) | réponse tardive orpheline | abandonnée, pas d'annonce |
| Interface (annulation) | résultat inconnu | INDÉTERMINÉ, jamais CONFIRMÉ |

### Ce que la preuve ne démontre pas

- **Vivacité sous partition permanente** : si la base ou la passerelle ne répond jamais, aucune admission ne progresse (R08 le conditionne explicitement).
- **Absence de perte de messages** : l'outbox est *au moins une fois* ; la sûreté repose sur la dédup, pas sur la non-perte.
- **Priorité globale** : impossible (Q5) — non démontrée car fausse.
- **Correction du monde physique** : la preuve suppose que la passerelle sérialise réellement commandes et état physique (R05) ; elle ne prouve pas la fiabilité du matériel.

---

## Synthèse de la variante

| Point | P-global (base) | **P-local (variante)** |
|---|---|---|
| Priorité urgente inconnue | exigée → **impossible** | non exigée → **réalisable** |
| Demande ordinaire vs terminal isolé | bloquée | **confirmable** |
| Réserve | — | **1 bus READY conservé** |
| Capacité préattribuée à l'isolé | — | **aucune** |

**Conclusion.** En remplaçant P-global par P-local et en conservant un véhicule de réserve, **une demande ordinaire reçue peut être confirmée malgré un terminal isolé** : le serveur ne connaît pas la demande urgente isolée, aucune capacité ne lui est préattribuée, et l'admission laisse exactement un bus READY. La sûreté (≥1 READY) est garantie par la ligne de garde matérialisée ; le départ au plus une fois par la dédup + fencing ; l'interface n'annonce CONFIRMÉ qu'après commit durable. P-global reste **prouvé impossible** par les mondes indiscernables de P05.