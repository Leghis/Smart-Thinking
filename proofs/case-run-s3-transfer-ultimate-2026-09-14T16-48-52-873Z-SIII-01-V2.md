# SIII-01-V2 — SIII-01 → Un troisième véhicule indépendant

Score: 100.0 % (certificats 0/0, juge 100/100)

Certificats manqués: aucun

Tous les certificats sont en place. Je rédige la réponse finale.

## Réponse

**Reformulation de la variante.** On ajoute un troisième véhicule **B3**, accessible, initialement READY, lu READY par TA et TB, et **non réservé** par l'une ou l'autre. P01 devient : TA lit {B1,B2,B3}=READY, réserve B1 pour MA, écrit `dispatch-MA` ; TB lit {B1,B2,B3}=READY, réserve B2 pour MB, écrit `dispatch-MB` ; TA puis TB valident. La question demande de **séparer deux propriétés logiquement distinctes** : (i) la sérialisabilité de cet historique, (ii) la violation de l'invariant de réserve R01 dans cette exécution.

**Résultats exacts.**

| Propriété | Valeur dans la variante B3 | Justification |
|---|---|---|
| Cohérence instantanée (snapshot) | **OUI** | Chaque transaction lit un instantané fixe cohérent (R02) |
| Sérialisabilité **stricte** (MVSG / one-copy) | **NON** | Cycle TA→TB→TA par anti-dépendances croisées |
| Sérialisabilité **faible** (état final / commutativité) | **OUI** | État final identique à TA;TB et TB;TA |
| Violation de R01 (≥1 READY après chaque commit) | **NON violée** (1 READY reste) | B3 reste READY |
| Orthogonalité des deux axes | **OUI** | Cas B = (non-sérialisable, R01 OK) |

État final exact : `{B1:RESERVED, B2:RESERVED, B3:READY}`, soit **count(READY)=1**.

## Preuves et certificats

**1. Sérialisabilité stricte : NON (cycle MVSG).** Les deux transactions lisent **le même prédicat** {B1,B2,B3} et écrivent des lignes **distinctes**. Le graphe de sérialisation multi-version (MVSG) contient deux anti-dépendances croisées :
- TA lit B2@v0, que TB écrase → arête **TA→TB** ;
- TB lit B1@v0, que TA écrase → arête **TB→TA**.

Sortie de l'outil : `Aretes MVSG: [('TA','TB','rw'),('TB','TA','rw')] ; Cycle MVSG: True`. Aucun ordre sériel one-copy n'est compatible : dans l'ordre TA,TB, TB devrait lire B1@v1 (écrit par TA) et non B1@v0 ; dans l'ordre TB,TA, TA devrait lire B2@v1. **C'est un write skew pur** : deux transactions lisent un prédicat commun et écrivent des lignes disjointes.

**2. Sérialisabilité faible : OUI.** L'énumération exhaustive des ordres sériels donne `(TA,TB)` et `(TB,TA)` tous deux égaux à l'état final concurrent `{B1:RESERVED,B2:RESERVED,B3:READY}`. Les transactions **commutent** (écritures sur lignes distinctes). C'est exactement ce que P01 constate (« lignes modifiées distinctes ; contraintes uniques passent ») — mais c'est une propriété d'**état final**, pas de sérialisabilité stricte.

**3. Violation de R01 : NON dans la variante.** Trace : après TA, count(READY)=2 ; après TB, count(READY)=**1** ≥ 1. R01 est respecté. Contraste : **sans B3**, l'état final est `{B1:RESERVED,B2:RESERVED}`, count(READY)=**0** → violation.

**4. Rôle de B3 (masquage, non correction).** B3 ne corrige pas la classe d'anomalie : il **décale le seuil** du prédicat `count(READY)≥1`. Avec une 3ᵉ transaction TC réservant B3, l'état final redevient `{B1:RESERVED,B2:RESERVED,B3:RESERVED}`, count(READY)=**0** → la violation réapparaît. L'anomalie est un write skew sur un **invariant de prédicat**, non sur une ligne.

**5. Orthogonalité (tabulation croisée).**

| Cas | Sérialisable strict | R01 |
|---|---|---|
| A — sans B3, TA/TB | NON | **violé** (0 READY) |
| B — avec B3, TA/TB | NON | **OK** (1 READY) |
| C — avec B3 + TC | NON | **violé** (0 READY) |
| D — TA seule | OUI | OK |

Le cas B prouve que **non-sérialisable n'implique pas violation de réserve** ; le cas D prouve qu'un historique sérialisable peut respecter R01. Les deux axes varient indépendamment.

## Pièges traités

- **Cohérence instantanée ≠ sérialisabilité.** P01 est cohérent par instantané (chaque transaction voit un snapshot fixe) et **faiblement** sérialisable (état final), mais **non strictement** sérialisable : le cycle d'anti-dépendances l'interdit. C'est le piège central de la variante.
- **Explorer tous les témoins, pas seulement les cycles courts.** J'ai énuméré les deux ordres sériels, les deux anti-dépendances, et les 4 configurations de parc (avec/sans B3, avec/sans TC) — pas seulement le cycle TA↔TB.
- **Effet externe irréversible.** `dispatch-MA`/`dispatch-MB` dans l'outbox : un rollback supprime l'écriture outbox mais **pas** un départ déjà émis vers la passerelle (R02, R05). La sérialisabilité ne protège pas contre cela.
- **Ne pas confondre exactly-once, fencing, idempotence, autorisation.** La sérialisabilité stricte (ordre global) est distincte de l'idempotence (dédup par `command_id`, R04) et du fencing (génération, R05). Ici, même un historique sérialisable laisserait le problème de l'ancien DISPATCH (P04).
- **Invariant de ligne vs invariant de prédicat.** R03 (contrainte unique sur missions actives) porte sur des **lignes** ; R01 porte sur un **prédicat** (`count(READY)≥1`). Snapshot isolation ne détecte que les conflits de ligne (R02) : elle laisse donc passer la violation de prédicat. C'est pourquoi P02 (`SELECT ... FOR UPDATE` sur missions actives, aucune ligne active au départ) ne résout rien.

## Limites / impossibilités

- **B3 ne rend pas le système sûr.** Il masque la violation dans *cette* exécution ; toute vague ultérieure (TC, ou une 3ᵉ demande) rétablit l'anomalie. La variante **ne change pas la classe de bug**, elle change seulement le seuil.
- **La sérialisabilité stricte n'est pas obtenue par l'isolation par instantané** (R02) : elle exige soit une **ligne de garde effectivement modifiée** (matérialiser le prédicat `guard(sector, version)` et la lire/écrire dans chaque admission), soit une sérialisation explicite. Sans cela, aucun ordre sériel one-copy n'existe pour P01.
- **Ce que la preuve ne démontre pas :** elle ne prouve pas la sûreté sous partitions, ni l'absence de double départ (P04), ni la justesse des priorités (P05). Elle établit uniquement que **sérialisabilité et respect de R01 sont deux propriétés indépendantes**, et que B3 ne corrige que la seconde — localement et temporairement.
- **Impossibilité structurelle :** on ne peut pas garantir R01 par une contrainte unique (R03) ni par un verrou sur lignes inexistantes (P02), car l'invariant est un **prédicat d'ensemble**. Il faut une garde matérialisée ou un protocole de comptage sérialisé.