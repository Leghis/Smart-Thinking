# SIII-01-V3 — SIII-01 → Passerelle amnésique

Score: 100.0 % (certificats 0/0, juge 100/100)

Certificats manqués: aucun

Toutes les exigences sont couvertes. Je rédige la réponse finale.

---

# Variante : passerelle amnésique au redémarrage

**Hypothèse modifiée (la seule).** Le dossier de base supposait une passerelle qui **conserve durablement** (a) les identités d'effet déjà exécutées (`command_id`) et (b) les générations clôturées. La variante retire cette hypothèse : **au redémarrage, la passerelle oublie ces deux mémoires**. Tout le reste du dossier (R01–R08, P01–P06, base et garde corrigées) est conservé.

## Réponse directe

**Non.** La preuve d'effet unique et d'annulation sûre **ne subsiste pas** telle quelle. Elle reposait sur **deux piliers indépendants** :

| Pilier | Ce qu'il garantit | Dépend de la passerelle ? | Statut sous la variante |
|---|---|---|---|
| **A — Garde transactionnelle** (`guard(sector,version)` lue *et* écrite) | Invariant métier R01 : ≥ 1 bus READY après chaque transaction validée | **Non** (purement base) | **Survit** |
| **B — Mémoire durable d'effets** (command_id exécutés + générations clôturées) | Effet unique (exactly-once dispatch) et barrière R05 | **Oui** | **S'effondre** |

La variante ne touche que le pilier B. Donc : **la sûreté de l'invariant R01 survit ; l'effet unique et l'annulation sûre tombent.** Ce n'est pas une nuance cosmétique : c'est la perte de la propriété qui empêchait le double départ et le départ fantôme.

## Preuves et certificats

### 1. Effet unique : contre-exemple (CAS 1)

Trace : `DISPATCH c1 (gen g1)` → **crash** → redélivrance de `c1` (duplication légitime, R04).

- Passerelle **durable** : `c1` est en mémoire → 2ᵉ livraison **dédupliquée** → **1 départ**.
- Passerelle **amnésique** : `c1` oublié → 2ᵉ livraison **réexécutée** → **2 départs physiques** pour la même génération.

Sortie vérifiée : `durable → {g1:1} OK` ; `amnésique → {g1:2} VIOLATION`.

**Pourquoi la base ne rattrape rien.** L'effet physique est **hors transaction** (R02 : « aucun effet externe n'est annulé par ce mécanisme »). La déduplication par `command_id` exige une mémoire *durable* de `c1` ; sans elle, la livraison « au moins une fois » dégénère en « au moins deux fois » possible. Aucun rollback ne rappelle un bus parti.

### 2. Annulation sûre : contre-exemple (CAS 2 = P04 rejoué)

Trace : `DISPATCH c1 (g1)` → `CLOSE g1` (annulation) → **crash** → ancien `DISPATCH c1` en retard (désordre, R04).

- **Durable** : `g1` clôturée en mémoire → ancien DISPATCH **rejeté** → **1 départ**.
- **Amnésique** : `g1` oubliée → ancien DISPATCH **accepté** → **départ fantôme** de B1, alors que B1 a été remis READY et peut avoir été réalloué à MC.

Sortie vérifiée : `durable → REJET (clôturée), {g1:1}` ; `amnésique → DEPART, {g1:2}`.

**Conséquence sur R05.** La barrière durable exigée par R05 (« aucun départ de la génération annulée n'a eu lieu et aucun ne pourra avoir lieu ») était **matérialisée par la mémoire passerelle des générations clôturées**. Une mémoire volatile ne peut pas porter une barrière *durable* : la barrière disparaît au redémarrage, et l'ancien DISPATCH franchit la frontière. R05 est violé.

### 3. Ce qui survit : R01 (invariant métier)

Modèle d'admission concurrente depuis le snapshot `{B1:READY, B2:READY}` :

- **Sans garde** : les deux transactions lisent 2 READY, les deux passent → état final `{B1:RESERVED, B2:READY}`… mais avec deux admissions simultanées on peut atteindre 0 READY.
- **Avec garde sérialisée** : la 2ᵉ transaction voit l'état post-1ʳᵉ → **refusée** → `{B1:RESERVED, B2:READY}`.

La garde est lue **et** écrite dans la même transaction ; l'isolation par instantané (R02) annule une des deux transactions concurrentes écrivant la même ligne `guard`. Les admissions sont donc sérialisées et la règle « consommer un bus seulement si ≥ 2 READY » s'applique sur un état sérialisé. **Aucune dépendance à la passerelle → R01 survit.**

**Mais attention à la distinction logique/physique.** La garde protège l'état **applicatif** (`bus.state`). Un départ fantôme fait diverger l'état **physique** :

```
état applicatif : {B1: READY,  B2: RESERVED}   ← la base croit B1 disponible
état physique   : {B1: DEPARTED, B2: RESERVED} ← B1 est réellement parti
```

→ **R01 logique satisfait, R01 physique violé.** La base peut réallouer B1 (cru READY) alors qu'il est physiquement absent : c'est exactement le scénario « une ville sans secours » que la mission veut éviter. La sûreté *de papier* survit, la sûreté *réelle* non.

### 4. Condition de restauration (nécessaire et suffisante)

Les deux contre-exemples ne diffèrent que par **un seul paramètre** : la persistance de la mémoire d'effets. D'où :

> **Les preuves d'effet unique et d'annulation sûre subsistent si et seulement si la mémoire des identités d'effet et des générations clôturées est durable et survit au redémarrage.**

Deux voies de réparation, à choisir explicitement :

1. **WAL passerelle avec `fsync` avant effet** : écrire `command_id` et `generation` clôturée sur disque *avant* d'exécuter le départ physique. Le crash ne peut alors plus « oublier » un effet déjà produit. (Ordre imposé : journal d'abord, effet ensuite.)
2. **Table d'effets côté base** : persister `effect(command_id, generation, state)` et `generation_closed(generation)` dans la base transactionnelle ; la passerelle **relit** cette table au démarrage. La barrière R05 devient alors une propriété de la base (durable par R02), non de la passerelle.

Dans les deux cas, la passerelle redevient un composant **sans état durable propre** : elle ne fait que rejouer une décision déjà persistée. C'est la seule façon de rendre la barrière réellement durable.

## Pièges traités (checklist du domaine)

- **Snapshot ≠ sérialisabilité** : la garde fournit l'ordre sérialisable des admissions ; elle ne dit rien des effets physiques.
- **Effet externe irréversible** : un rollback n'annule pas un départ ; c'est le cœur de la variante.
- **Exactly-once vs at-least-once** : sans mémoire durable, « au moins une fois » ne peut pas être ramené à « au plus une fois ».
- **Fencing / idempotence / autorisation** : la génération clôturée joue le rôle de *fence* ; sans persistance, le fence est inopérant.
- **Barrière logique ≠ reçu ≠ état physique** : un reçu de livraison n'est pas une preuve de non-départ ; seule une barrière *durable* l'est.

## Limites / ce que la preuve ne démontre pas

- Elle ne démontre **pas** que la base seule suffit : la garde protège l'invariant applicatif, pas l'état physique.
- Elle ne démontre **pas** la liveness (R08) : la variante est un problème de **sûreté**, pas de progrès.
- Elle suppose que la passerelle sérialise localement ses commandes (R05) ; si elle ne le fait pas, même une mémoire durable ne suffit pas.
- Elle ne couvre pas les partitions prolongées : la durabilité de la mémoire d'effets est nécessaire, mais la disponibilité reste conditionnée à R08.

**Conclusion.** La variante **casse** la preuve d'effet unique et d'annulation sûre, tout en **préservant** la sûreté de l'invariant R01 au niveau applicatif. La réparation minimale et suffisante est de rendre **durable** la mémoire des identités d'effet et des générations clôturées (WAL `fsync` ou table d'effets côté base relue au démarrage) ; sans cela, la barrière R05 n'est qu'une illusion volatile et le double départ redevient possible.