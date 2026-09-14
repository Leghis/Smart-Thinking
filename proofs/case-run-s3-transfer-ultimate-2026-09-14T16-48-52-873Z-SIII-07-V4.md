# SIII-07-V4 — SIII-07 → Deux remboursements distincts de même montant

Score: 100.0 % (certificats 0/0, juge 100/100)

Certificats manqués: aucun

Tous les calculs sont confirmés. Je rédige la réponse finale.

## Réponse

**Question centrale de la variante : faut-il dédupliquer R2 avec R1 ?**

**NON.** R2 et R1 sont deux **opérations économiques distinctes** (R02 : « une capture, un versement, un remboursement et une perte de litige sont des opérations économiques distinctes »). Le fait qu'elles partagent le montant 25 ne les rend pas identiques. La déduplication doit porter sur l'**identité d'opération** `(operation_id, version, content_hash)` (R04), jamais sur le montant. R2 possède un `operation_id` propre, une version propre et une empreinte propre : elle produit donc **un effet comptable de plein droit**.

**Bilan final de la variante** (C=100, P=50, R1=25, R2=25, D=40) :

| Position | Valeur exacte |
|---|---|
| Compte de règlement (chez le PSP) | **−40 CAD** |
| Dette partenaire | −42 → **créance de Relais sur le partenaire = 42 CAD** |
| Marge comptable | **+2 CAD** |
| Équilibre (actif − passif) | 42 − 40 = **2 = marge** ✓ |

**Versement maximal sûr sous R06** (inchangé par la variante, car R2 est postérieur à la capture) :
- **Sans réserve : 0 CAD.**
- **Avec la réserve de 30 CAD (P05) : 30 CAD.**

**Effet d'une déduplication erronée** (bug à éviter) : si l'on dédupliquait R2 par montant, on obtiendrait regl = −15, créance partenaire = 22, marge = 7 — soit une **marge surestimée de 5 CAD** et une **trésorerie surestimée de 25 CAD**. C'est exactement le type de faute qui masque le découvert réel.

## Preuves et certificats

**1. Répartition exacte (R01), sans arrondi.** Pour un remboursement/litige de montant *m* : partenaire = 0,8·m, marge = 0,2·m.
- R1 = 25 → partenaire 20, marge 5
- R2 = 25 → partenaire 20, marge 5
- D = 40 → partenaire 32, marge 8
Tous entiers : la clause « se répartissent sans arrondi » est respectée.

**2. Journal pas à pas (sortie `compute`, valeurs exactes en fractions) :**

| Étape | regl | dette part. | marge | créance part. | équilibre |
|---|---|---|---|---|---|
| C | 100 | 80 | 20 | 0 | 0 |
| P | 50 | 30 | 20 | 0 | 0 |
| R1 | 25 | 10 | 15 | 0 | 0 |
| R2 | 0 | −10 | 10 | 10 | 10 |
| D | **−40** | **−42** | **2** | **42** | **2** |

L'équilibre `(actif − passif) = marge` est vérifié à **chaque** étape, sans jamais effacer les montants négatifs.

**3. Contrôle de non-dépassement.** Total des réductions = R1 + R2 + D = 25 + 25 + 40 = **90 ≤ 100** (capture). Aucune réduction ne dépasse la créance initiale ; R2 « non chevauchant avec D » garantit l'absence de double comptage sur les mêmes 40.

**4. Versement maximal sûr (R06).** Après capture, regl = 100. Versement P puis reprises totales T ≤ 100 (reprises « non chevauchantes allant jusqu'à la totalité des 100 capturés ») :
- regl_min = 100 − P − 100 = **−P** ⇒ regl ≥ 0 ⟺ **P ≤ 0**.
- Avec réserve : regl_min = 30 + 100 − P − 100 = 30 − P ⇒ **P ≤ 30**.

**5. Clé d'idempotence.** `(operation_id, version, content_hash)`. Les numéros d'enveloppe de livraison ne sont **pas** des identifiants d'opération (R02) : deux enveloppes différentes peuvent porter la même opération (à dédupliquer), et deux opérations différentes peuvent porter le même montant (à **ne pas** dédupliquer).

## Pièges traités

- **Déduplication par montant (piège principal de la variante)** : refusée. R1 et R2, de même montant, sont deux opérations distinctes → deux effets. Dédupliquer par montant détruirait R2 et fausserait le bilan (marge 7 au lieu de 2, regl −15 au lieu de −40).
- **Déduplication par enveloppe (bug P03)** : P03 poste une écriture par identifiant d'enveloppe inédit. Correct pour les redélivrances (même opération, même contenu), mais il ne doit pas servir à fusionner deux opérations distinctes. La bonne clé reste l'identité d'opération.
- **Autorisations avant action** : lecture seule + écriture privée uniquement ; aucune écriture externe, aucune suppression. La variante n'autorise aucune opération nouvelle hors R2.
- **Budget de crédits** : aucune action non confirmée déclenchée.
- **Écriture sur la dernière révision** : R2 s'ajoute comme nouvelle opération ; on n'écrase pas R1. Gestion de conflit par identité d'opération, pas par ordre d'arrivée (R04).
- **Ne rien envoyer à l'extérieur / ne rien supprimer** : respecté ; en cas d'impossibilité (réponse d'autorité absente, cf. P06), on n'agit pas et on l'explique.
- **Écritures équilibrées ≠ liquidité** : le bilan équilibré (marge +2) coexiste avec un découvert de −40 ; l'équilibre comptable ne prouve ni la solvabilité ni la récupération de la créance partenaire de 42 (R03 : récupération non garantie).
- **P04 (solde bancaire affiché)** : additionner une autorisation non capturée (200) et une simulation USD (15) au solde de règlement, puis masquer par `max(solde,0)`, est doublement faux : une autorisation non capturée n'est pas une rentrée (R07), et une simulation USD ne compense pas un solde CAD sans opération de change (R07). Le vrai solde est **−40**.
- **P06 (WON v2 contradictoire)** : une signature authentifie le **transport**, pas la vérité économique. WON v2 au même numéro de version que LOST v2 est un **conflit** (R04) : l'ordre d'arrivée ne tranche pas ; il faut interroger l'autorité. Sa réponse n'étant pas fournie, on **ne conclut pas** et on maintient LOST v2 comme état appliqué en attendant.

## Limites / impossibilités

- **Versement sûr = 0 sans réserve** : conséquence directe de R06 (aucun délai maximal ni certificat de clôture). Tant qu'aucune clôture n'est prouvée, tout versement positif expose à un découvert. L'absence récente de notifications **ne prouve pas** la clôture du risque (pas de borne temporelle fournie).
- **Récupération de la créance partenaire (42 CAD)** : non garantie (R03). Elle ne peut pas être comptée comme liquidité.
- **P06** : la réponse de l'autorité de réconciliation n'étant pas dans la pièce, l'état final du litige reste **indéterminé** entre LOST v2 (appliqué) et WON v2 (conflit non résolu). On ne peut ni rouvrir ni compenser sans cette lecture.
- **Réserve de P05** : strictement séparée du bilan de P01 ; elle ne doit pas être mélangée aux positions de la variante. Elle ne sert qu'à relever le plafond de versement sûr de 0 à 30.
- **Hypothèses non modifiées** : toutes les autres contraintes du dossier de base (R01–R07, P01–P06) sont conservées ; seule l'addition de R2=25 distinct est introduite, et seules les conclusions qui en dépendent (bilan, marge, créance partenaire, solde de règlement) sont recalculées.