# SIII-05-V4 — SIII-05 → Un writer ancien échappe au protocole

Score: 100.0 % (certificats 0/0, juge 100/100)

Certificats manqués: aucun

Tous les certificats sont couverts (6/6). Je rédige la réponse finale.

## Réponse

**Question de la variante : peut-on promouvoir la phase de compatibilité ?**

**Non, pas en l'état.** La correction de P07 (le backfill compare désormais correctement la version) élimine la course backfill/écriture, mais elle ne traite pas la cause résiduelle introduite par la variante : **un writer v1 qui écrit `shared` sans mettre `visibility` à jour**. Tant que ce writer reste actif, la phase de compatibilité ne peut pas être promue, car elle rendrait atteignables des états où les deux champs se contredisent, et **aucune règle de lecture du lecteur v2 ne peut alors préserver simultanément la sûreté et la vivacité**.

**Condition exacte de promotion (nécessaire et suffisante) :**
1. `shared` doit être **dérivé** de `visibility` (`shared := (visibility == PUBLIC)`) ou **synchronisé par trigger/contrainte** sur toute écriture, de sorte qu'aucun writer ne puisse modifier un champ seul ;
2. **TEAM ne doit pas encore être activée** (sinon l'état `(shared=false, visibility=TEAM)` est atteignable et incohérent).

Sous ces deux conditions, la phase de compatibilité est promouvable : le lecteur v2 est sûr et vif sur tous les états atteignables.

**Point de non-retour pour un rollback v1 exact :** la **première écriture TEAM committée** (ou la première copie TEAM délivrée à un client). Avant, le rollback v1 est exact ; après, il ne l'est plus, car `TEAM = {O,T}` n'est représentable par aucun état v1.

## Preuves et certificats

**Espace des états (2×3 = 6), énumération exhaustive.** Une ligne est décrite par `(shared, visibility)`. L'accès v1 ne dépend que de `shared` ; l'accès v2 que de `visibility` :

| shared | visibility | accès v1 | accès v2 | cohérent |
|---|---|---|---|---|
| false | PRIVATE | {O} | {O} | ✅ |
| false | TEAM | {O} | {O,T} | ❌ |
| false | PUBLIC | {O} | {O,T,X} | ❌ |
| true | PRIVATE | {O,T,X} | {O} | ❌ |
| true | TEAM | {O,T,X} | {O,T} | ❌ |
| true | PUBLIC | {O,T,X} | {O,T,X} | ✅ |

**Seuls 2 des 6 états sont cohérents** : `(false,PRIVATE)` et `(true,PUBLIC)`. (Certificat `claim-4353bff3`.)

**Q2 — Aucun mapping TEAM→v1 ne préserve O, T et X.** v1 ne peut produire que deux accès : `shared=false → {O}` et `shared=true → {O,T,X}`. Or `TEAM = {O,T}`. Donc :
- `TEAM→false` donne `{O}` : **T perd l'accès** (perte) ;
- `TEAM→true` donne `{O,T,X}` : **X obtient l'accès** (divulgation).

Aucun booléen n'a de troisième valeur cachée (R07), donc **aucun mapping n'est exact**. Les deux équipes de P06 ont tort : « TEAM→true » divulgue à X, « TEAM→false » perd T. (Certificats `claim-6acdbefa`, `claim-97c0aa65`.)

**Le produit ne peut pas satisfaire toutes ses exigences sans en modifier une.** L'exigence « visibilité TEAM exacte (O+T, pas X) » et l'exigence « fonctionnement inchangé des clients v1 hors ligne » sont **incompatibles** sur le même champ : v1 ne dispose que de 2 valeurs pour exprimer 3 niveaux. Il faut donc modifier une exigence : soit accepter que les clients v1 ne voient pas TEAM (fin de support v1, R06), soit renoncer à TEAM.

**Aucune règle de lecture ne réconcilie la divergence.** Test exhaustif des 4 règles naturelles du lecteur v2 sur les états atteignables :
- **visibilité prioritaire** : sûre et vive, mais **ignore silencieusement la mise à jour v1** (la modification `shared` est perdue) ;
- **shared prioritaire** : **viole la sûreté** (X divulgué pour PRIVATE/TEAM) ;
- **intersection (min)** : **viole la vivacité** (T perd l'accès pour TEAM) ;
- **union (max)** : **viole la sûreté** (X divulgué).

**0/4 règles valides.** (Certificat `claim-6acdbefa`.)

**Fermeture sous writers.** En partant des états cohérents et en appliquant les writers :
- writers v1 **et** v2 actifs → atteint `{(true,TEAM),(true,PRIVATE),(false,PUBLIC),(false,TEAM)}` : 4 états incohérents ;
- writer v2 seul (v1 gelé) → **crée aussi des incohérences** (v2 change `visibility` sans mettre `shared` à jour) ;
- writer v1 seul (v2 gelé) → crée `(true,PRIVATE)` et `(false,PUBLIC)`.

**Conclusion : geler v1 ne suffit pas.** Il faut que `shared` soit **dérivé/synchronisé** pour que tout état atteignable reste cohérent. (Certificats `claim-fedad70e`, `claim-e7811a67`, `claim-09c6fe80`.)

**Point de non-retour.** Accès représentables par v1 : `{{O}, {O,T,X}}`. `TEAM={O,T}` ∉ cet ensemble → non représentable. Donc dès la première écriture TEAM committée, un rollback v1 exact est impossible. (Certificat `claim-97c0aa65`.)

## Pièges traités

- **L'adversaire choisit le scénario (pire cas).** On n'optimise pas la moyenne : on exige la sûreté/vivacité sur **tous** les états atteignables, y compris ceux produits par le writer v1 résiduel. C'est précisément ce writer qui fait échouer la promotion.
- **Déterminisme et énumération exhaustive.** L'espace des décisions (2×3 états, 4 règles de lecture, 2 writers) est énuméré exhaustivement ; aucune règle de lecture ne passe le test conjoint sûreté+vivacité.
- **Fractions/optima exacts et preuve d'optimalité.** Ici les quantités sont des ensembles d'accès exacts (`{O}`, `{O,T}`, `{O,T,X}`) et des cardinaux (2/6 cohérents, 0/4 règles valides) — pas d'approximation.
- **Contrôle du budget et des contraintes de domaine.** On vérifie à chaque étape que les contraintes R05/R06/R07 sont respectées : pas de 3ᵉ valeur cachée, pas d'historique externe rendant v1 plus expressif, pas de reprise d'une copie déjà délivrée.
- **Distinction des trois preuves (R01/R03).** Provenance, correction fonctionnelle et compatibilité des données sont traitées séparément : la correction de P07 (course backfill) ne prouve **pas** la compatibilité des données (divergence de champs).
- **Le backfill correct ne suffit pas.** La variante déplace le risque : de la course temporelle (P07) vers la **divergence sémantique** entre deux champs maintenus par deux writers. Un backfill idempotent et versionné ne protège pas contre un writer qui écrit un champ seul.

## Limites / impossibilités

- **Impossibilité structurelle de TEAM en v1.** Aucun mapping TEAM→`shared` n'est exact (2 valeurs pour 3 niveaux). Ce n'est pas un défaut d'implémentation mais une limite du format v1.
- **La promotion de la phase de compatibilité n'est pas garantissable sans changement de schéma.** Tant que `shared` et `visibility` peuvent diverger, il n'existe **aucune** règle de lecture sûre et vive. La seule voie est de rendre `shared` dérivé/synchronisé **et** de ne pas activer TEAM pendant cette phase.
- **Le rollback v1 exact est borné dans le temps.** Il est possible jusqu'à la première écriture TEAM committée ; au-delà, seule une compensation applicative (restriction d'accès futur) est possible, jamais une reprise du contenu déjà divulgué (R08).
- **Ce qui n'est pas prouvable ici.** On ne peut pas garantir l'absence de tout défaut fonctionnel (R03 : H n'est pas une preuve universelle), ni qu'aucun autre writer non identifié n'écrive un champ seul. La sûreté repose sur l'hypothèse explicite que **tous** les writers respectent la synchronisation `shared`/`visibility` — hypothèse à vérifier par contrainte de base de données (trigger/CHECK), pas par convention.

**Recommandation opérationnelle :** ne pas promouvoir la phase de compatibilité tant que (a) `shared` n'est pas dérivé/synchronisé par une contrainte serveur, et (b) TEAM n'est pas gelée. Une fois ces deux conditions réunies, la promotion est sûre ; le point de non-retour (première écriture TEAM) doit être franchi **consciemment**, après décision explicite de fin de support v1.