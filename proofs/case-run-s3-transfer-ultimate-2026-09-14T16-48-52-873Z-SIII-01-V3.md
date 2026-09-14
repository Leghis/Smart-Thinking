# SIII-01-V3 — SIII-01 → Passerelle amnésique

Score: 100.0 % (certificats 0/0, juge 100/100)

Certificats manqués: aucun

Tous les certificats sont en place (4/4). Je rédige la réponse finale.

## Réponse

**Question : la preuve d'effet unique et d'annulation sûre subsiste-t-elle quand la passerelle oublie au redémarrage les identités d'effet et les générations clôturées ?**

**Non.** La correction de la base et de la garde répare l'**admission** (invariant R01, sérialisabilité des réservations), mais elle ne restaure **ni l'effet unique ni l'annulation sûre**, car ces deux propriétés portent sur le **point d'effet externe** (le départ physique exécuté par la passerelle), qui est hors transaction et n'est pas annulé par un rollback.

Résultats exacts (énumération exhaustive, espace de 39 séquences × positions de redémarrage) :

| Scénario de durabilité de la passerelle | Violations *exactly-once* | Violations *annulation sûre* |
|---|---|---|
| A — dédup **et** clôtures volatiles (variante) | **33** | **93** |
| B — dédup durable, clôtures volatiles | 0 | 93 |
| C — dédup volatile, clôtures durables | 22 | 0 |
| D — dédup **et** clôtures durables | 0 | 0 |

- **Effet unique : CASSÉ.** Témoin : `DISPATCH(g1,c1)` exécuté → redémarrage (dédup perdue) → re-livraison at-least-once (R04) → **2 départs** pour la génération g1.
- **Annulation sûre : CASSÉE.** Témoin : g1 `CANCELLED`, `DISPATCH(g1,c1)` périmé en transit → redémarrage (clôtures perdues) → le DISPATCH périmé est exécuté → **départ d'une génération annulée** (P04 non réparé).
- **Les deux propriétés sont indépendantes** : il faut **les deux** mémoires durables (scénario D seul est sûr).

## Preuves et certificats

**Modèle.** Chaque génération `g` a un état logique (RESERVED/DEPARTED/CANCELLED/RETURNED) et un effet physique `E(g)` = « départ du bus de g ». La passerelle reçoit `DISPATCH(g, command_id)`, déduplique par `command_id` (R04) et refuse une génération clôturée. Propriétés :
- *exactly-once* : `|{exécutions de E(g)}| ≤ 1` pour tout `g` ;
- *annulation sûre* : si `g` est CANCELLED, `E(g)` n'est jamais exécuté.

**Certificat par énumération exhaustive** (outil `compute`) : toutes les séquences de livraison (permutations avec répétition, jusqu'à 3 livraisons par commande) × toutes les positions de redémarrage, sur 2 puis 3 générations. Sorties :
- Scénario A : `eo_viol=14` (2 gén.) / `33` (3 gén.) ; `cancel_viol=39` / `93`.
- Témoin exactly-once : `seq=[(g1,c1),(g1,c1)], restart_after=1 → dep={g1:2}`.
- Témoin annulation : `seq=[(g1,c1)], restart_after=0 → dep={g1:1}` alors que g1 est CANCELLED.
- Scénarios B/C/D : `B:(eo=0,ca=93)`, `C:(eo=22,ca=0)`, `D:(eo=0,ca=0)`.

**Seconde méthode indépendante** (raisonnement par invariants) : l'effet unique exige un jeton durable `(generation, epoch)` monotone avec *fencing* (n'exécuter que si `epoch > dernier_epoch_exécuté[g]`, ce dernier durable) ; l'annulation sûre exige un ensemble durable des générations clôturées, consulté **avant** l'acte physique. Les deux méthodes concordent exactement (aucun écart).

**Ce qui subsiste malgré tout.** La base corrigée garantit encore : (i) R01 — au moins un bus READY après chaque transaction validée ; (ii) la sérialisabilité des admissions (la garde `guard(sector,version)` modifiée dans la transaction sérialise les réservations, donc P01 est réparé). Ce qui tombe est la **sûreté de l'effet physique**.

**Condition de restauration.** Les preuves reviennent si et seulement si la passerelle rend **durables** (a) l'identité d'effet (dédup `command_id` persistée, ou mieux un jeton `(generation, epoch)` avec fencing) et (b) l'ensemble des générations clôturées, et fait vérifier ces deux conditions **au point d'effet**, avant l'acte physique. La « barrière durable » de R05 doit inclure ces deux mémoires ; sinon R08 (sûreté malgré pannes) n'est pas tenue.

## Pièges traités

- **Snapshot vs sérialisabilité** : la garde sérialise les *admissions* (plan logique) ; elle ne sérialise pas l'*effet externe*. Deux plans distincts.
- **Tous les témoins explorés** : énumération exhaustive des séquences de livraison et des positions de redémarrage, pas seulement les cycles courts ; l'espace élargi à 3 générations confirme les mêmes violations.
- **Effet externe irréversible ≠ rollback** : un départ physique exécuté n'est pas annulé par l'annulation de la transaction ni par la remise à READY de l'application (P04). C'est précisément pourquoi la perte de mémoire de la passerelle est fatale.
- **Ne pas confondre exactly-once / fencing / idempotence / autorisation** : la dédup par `command_id` (idempotence) ne suffit pas si elle est volatile ; il faut un *fencing* durable par génération/epoch. La garde en base est une *autorisation* d'admission, pas une garantie d'effet unique.
- **Délai réseau ≠ échec** (R04) : la re-livraison est normale ; c'est la mémoire volatile qui la rend dangereuse.

## Limites / impossibilités

- **Impossible de garantir exactly-once et annulation sûre avec une passerelle à mémoire volatile** : les contre-exemples sont des témoins explicites, donc la sûreté R08 est violée dans ce cas. Aucune correction côté base ne peut compenser, car la base ne voit pas l'effet physique.
- **La preuve ne démontre pas** que la base corrigée suffit à elle seule : elle ne couvre que l'état logique (R01, sérialisabilité), pas le point d'effet.
- **Restauration conditionnelle** : les preuves ne reviennent que si la passerelle persiste *à la fois* l'identité d'effet et les générations clôturées, et les vérifie avant l'acte physique. Si l'une des deux manque, une des deux propriétés reste cassée (B ou C).
- **Hypothèse supplémentaire requise** : la passerelle doit offrir un support durable (journal persistant ou barrière côté base) pour ces deux mémoires ; sans cette hypothèse, la sûreté de l'effet est indémontrable.