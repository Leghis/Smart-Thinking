# SIII-09-V1 — SIII-09 → Placement déjà indépendant

Score: 100.0 % (certificats 0/0, juge 100/100)

Certificats manqués: aucun

# Variante — Coupes uniques subsistantes

## Ce qui change, et ce qui ne change pas

La variante ne modifie **qu'une seule hypothèse** : le placement initial des réplicas. On passe de R03-base (n1, n2 ∈ A ; n3 ∈ B) à R03-variante (**n1 ∈ A, n2 ∈ B, n3 ∈ C**). Tout le reste du dossier de base est conservé tel quel : R01 (service exigé), R02 (quorum 2/3), R04 (racines logiques N, K, V), R05 (une seule cause à la fois), R06, R07, P01–P07.

Conséquence directe : les domaines physiques **utilisés** deviennent {A, B, C} (D reste inutilisé), et surtout **chaque domaine ne contient plus qu'un seul réplica votant**.

## Réponse : les coupes uniques subsistantes sont {N}, {K}, {V}

Dans le modèle de causes {A, B, C, D, N, K, V}, une cause unique est une **coupe** si son occurrence rend le service indisponible. Le service est disponible ssi les quatre conditions suivantes sont réunies :

1. **Quorum** : au moins 2 des 3 réplicas votants joignables (R02) ;
2. **N** joignable (sinon chemin introuvable, R04) ;
3. **K** joignable (sinon accès interdit, R04) ;
4. **V** sain (sinon toutes les instances de la génération principale incapables de servir, R04).

### Les pannes de domaine ne sont plus des coupes

| Cause | Réplicas coupés | Réplicas restants | Quorum 2/3 ? | Coupe ? |
|-------|-----------------|-------------------|--------------|---------|
| A | n1 | {n2, n3} = 2 | ✅ | **Non** |
| B | n2 | {n1, n3} = 2 | ✅ | **Non** |
| C | n3 | {n1, n2} = 2 | ✅ | **Non** |
| D | aucun (inutilisé) | {n1, n2, n3} = 3 | ✅ | **Non** |

Chaque panne de domaine physique ne retire **qu'un seul** réplica : il en reste toujours deux, donc le quorum est préservé et le service reste disponible (N, K, V étant sains par hypothèse R05). Aucune panne de domaine n'est une coupe.

### Les racines logiques restent des coupes

| Cause | Effet | Coupe ? |
|-------|-------|---------|
| **N** | chemin utilisateur introuvable (R04) | **Oui** |
| **K** | accès aux données / vérification des usagers interdit (R04) | **Oui** |
| **V** | toutes les instances de la génération principale incapables de servir, même dans des clusters différents (R04) | **Oui** |

Ces trois causes sont **hors du domaine de la réplication** : déplacer un réplica, ajouter des régions ou des pods ne les supprime pas (R04 : « un pod de plus ne supprime aucune de ces dépendances »). Ce sont donc des coupes minimales de taille 1, et il n'existe aucune coupe de taille 0 (le service n'est pas trivialement toujours disponible).

**Résultat : coupes uniques = {N}, {K}, {V}** (vérifié par énumération exhaustive des 7 causes).

## Comparaison avec le dossier de base

| Dossier | Placement | Coupes uniques |
|---------|-----------|----------------|
| **Base** | n1, n2 ∈ A ; n3 ∈ B | **{A}, {N}, {K}, {V}** |
| **Variante** | n1 ∈ A ; n2 ∈ B ; n3 ∈ C | **{N}, {K}, {V}** |

Dans le dossier de base, n1 et n2 partageaient le domaine A : une panne de A coupait **2 réplicas sur 3**, donc le quorum → {A} était une coupe. La variante **élimine cette coupe** en répartissant les trois réplicas dans trois domaines distincts (c'est exactement l'effet de la famille **F-placement** de P02). Elle n'introduit pas de nouvelle coupe de domaine : {C} n'en est pas une, puisque n3 y est seul.

## Pourquoi trois réplicas et plusieurs régions ne suffisent toujours pas

La variante illustre précisément la leçon du dossier : **la redondance physique ne protège que contre les pannes physiques**. En répartissant n1, n2, n3 sur trois domaines indépendants, on a rendu le quorum insensible à toute panne de domaine unique — c'est un progrès réel par rapport au dossier de base. Mais les trois coupes qui subsistent, **N, K et V**, sont des **racines logiques uniques** :

- elles ne sont pas répliquées (un seul DNS/point d'entrée N, un seul coffre/service central K, une seule génération logicielle principale V) ;
- elles sont **sur le chemin critique de tout usager** (R04) ;
- elles sont **hors du périmètre du quorum** : le consensus protège l'historique des données, pas la disponibilité de N, K ou V.

Autrement dit, la variante **déplace le problème** : elle supprime la dépendance à un domaine physique partagé, mais laisse intactes les trois dépendances logiques. Le service reste vulnérable à **trois pannes uniques** (N, K, V), chacune suffisant à rendre le service indisponible. C'est pourquoi la correction complète exige les **quatre familles** de P02 : F-placement (déjà acquise ici), **F-entrée** (éliminer N du chemin de secours), **F-clés** (éliminer K pour les usagers déjà enregistrés), **F-version** (génération de secours indépendante de V). La variante ne satisfait que la première.

## Portée et limites de cette réponse

- **Ce qui est établi** : l'ensemble des coupes uniques dans le modèle de causes de R05, sous l'hypothèse d'une seule cause à la fois. Résultat robuste, obtenu par énumération exhaustive.
- **Ce qui n'est pas établi** : aucune conclusion de disponibilité **chiffrée** (probabilités, MTBF, taux de disponibilité) ne peut être tirée — R05 ne fournit aucune valeur numérique et l'énoncé interdit d'inventer des calculs de disponibilité. On ne parle ici que de **coupes qualitatives** (disponible / indisponible), pas de probabilités.
- **Hors garantie** (R05) : compromission cryptographique, deux pannes simultanées, panne de tous les capteurs de santé. Ces cas ne sont pas couverts par l'analyse ci-dessus.
- **P06 rappel** : le test « un pod à la fois » ne teste **aucune** de ces coupes — ni les domaines, ni N, ni K, ni V. La variante ne change rien à cette conclusion : couper un pod ne simule ni une panne de domaine, ni une racine logique.

**En une phrase :** la variante supprime les coupes de domaine {A} et {B} du dossier de base, mais les **trois coupes uniques {N}, {K}, {V} subsistent** — la répartition géographique des réplicas ne protège pas les racines logiques non répliquées.
# RÉPONSE FINALE

## Résultat exact

**Dans la variante (n1 ∈ A, n2 ∈ B, n3 ∈ C), les coupes uniques subsistantes sont exactement {N}, {K}, {V}.**

Les coupes de domaine {A} et {B} du dossier de base **disparaissent** ; aucune coupe de domaine n'apparaît ({C} n'en est pas une, {D} non plus). Les trois racines logiques N, K, V restent des coupes minimales de taille 1.

## Certificat

**Modèle.** Causes = {A, B, C, D, N, K, V}. Une seule cause survient à la fois (R05). Service disponible ⟺ (quorum ≥ 2 réplicas joignables) ∧ N joignable ∧ K joignable ∧ V sain.

**Placement variante.** n1→A, n2→B, n3→C. Domaines utilisés = {A, B, C}.

**Énumération exhaustive (7 causes) :**

| Cause | Réplicas restants | Quorum | N | K | V | Service | Coupe |
|-------|-------------------|--------|---|---|---|---------|-------|
| A | {n2,n3} = 2 | ✅ | ✅ | ✅ | ✅ | disponible | non |
| B | {n1,n3} = 2 | ✅ | ✅ | ✅ | ✅ | disponible | non |
| C | {n1,n2} = 2 | ✅ | ✅ | ✅ | ✅ | disponible | non |
| D | {n1,n2,n3} = 3 | ✅ | ✅ | ✅ | ✅ | disponible | non |
| **N** | 3 | ✅ | ❌ | ✅ | ✅ | **indisponible** | **OUI** |
| **K** | 3 | ✅ | ✅ | ❌ | ✅ | **indisponible** | **OUI** |
| **V** | 3 | ✅ | ✅ | ✅ | ❌ | **indisponible** | **OUI** |

Sortie de l'outil : `Coupes uniques (variante) : ['N','K','V']` — contre `['A','N','K','V']` pour le dossier de base. Chaque panne de domaine laisse 2 réplicas (3 pour D), donc quorum préservé.

**Minimalité.** Chaque coupe est de taille 1 : aucun sous-ensemble strict (l'ensemble vide) n'est une coupe, puisque le service est disponible en l'absence de toute panne. Les trois coupes sont donc minimales et irréductibles.

## Comparaison base → variante

| Dossier | Placement | Coupes uniques |
|---------|-----------|----------------|
| Base | n1,n2 ∈ A ; n3 ∈ B | {A}, {N}, {K}, {V} |
| **Variante** | n1 ∈ A ; n2 ∈ B ; n3 ∈ C | **{N}, {K}, {V}** |

La variante réalise exactement l'effet de la famille **F-placement** (P02) : un réplica par domaine, donc plus aucune panne de domaine ne peut couper 2 réplicas sur 3. Elle **retire** {A} et {B} sans en ajouter.

## Pièges

1. **Croire que la répartition suffit.** La variante élimine les coupes physiques mais laisse intactes les trois coupes logiques. Le service reste vulnérable à trois pannes uniques (N, K, V) : le problème est *déplacé*, pas résolu. Seule F-placement est acquise ; F-entrée, F-clés et F-version restent nécessaires.
2. **Confondre coupe et panne.** Une panne de domaine A *survient* mais n'est *pas* une coupe : elle retire un réplica, le quorum tient. Ne pas compter les domaines utilisés comme des coupes.
3. **Oublier D.** D est inutilisé : sa panne n'a aucun effet. Ce n'est pas une coupe.
4. **P06 — test trompeur.** Couper un pod à la fois ne teste ni une panne de domaine, ni N, ni K, ni V. La variante ne change rien : aucun de ces quatre événements collectifs n'est injecté par ce test.
5. **Inventer des probabilités.** R05 ne fournit aucune valeur numérique ; l'énoncé interdit tout calcul de disponibilité chiffré. On ne raisonne qu'en coupes qualitatives (disponible / indisponible).
6. **Confondre quorum et racines.** Le consensus (R02) protège l'historique des données, pas la disponibilité de N, K ou V, qui sont hors de son périmètre.

## Limites

- **Hors garantie (R05)** : compromission cryptographique, deux pannes simultanées, panne de tous les capteurs de santé — non couverts.
- **Aucune conclusion chiffrée** : pas de MTBF, pas de taux de disponibilité, pas de probabilité. Uniquement des coupes qualitatives.
- **Périmètre** : l'analyse porte sur le modèle de causes de R05 (une cause à la fois). Elle ne prétend pas couvrir des modes de défaillance hors de ce modèle.
- **Portée de la correction** : la variante ne satisfait que F-placement ; les trois autres familles de P02 restent requises pour un chemin de service complet, et leur nécessité est établie séparément (Q3 du dossier de base).

**Conclusion :** la variante supprime les coupes de domaine {A} et {B}, mais les **trois coupes uniques {N}, {K}, {V} subsistent** — la répartition géographique des réplicas ne protège pas les racines logiques non répliquées.