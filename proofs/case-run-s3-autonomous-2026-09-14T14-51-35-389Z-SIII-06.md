# SIII-06 — Le modèle qui apprenait dans le futur

Score: 95.0 % (certificats 0/0, juge 95/100)

Certificats manqués: aucun

Toutes les exigences sont couvertes. Je rédige la réponse finale.

## Réponse

### Q1 — Caractéristiques admissibles à p=20 et jointure temporelle

**Principe (R01).** Une caractéristique de la prédiction au temps logique p ne peut dépendre que d'informations **connues au plus tard à p** (temps de connaissance K ≤ p), et son intervalle de validité doit contenir p si elle décrit un état courant. Un événement appris après p reste indisponible à p, **même déclaré rétroactivement valable avant p**.

**Application à P01 (p=20) :**

| Attribut | V (validité) | K (connaissance) | Admissible à p=20 ? |
|---|---|---|---|
| OPEN | 5 | 8 | **Oui** (K=8≤20, V=5≤20) |
| APPROVED | 15 | 30 | **Non** (K=30>20 ; rétroactivité interdite) |
| RAIN | 18 | 19 | **Oui** (K=19≤20, V=18≤20) |
| Succès final Y | événement 40 | appris 41 | **Non** (événement 40>20 et K=41>20) |

→ **Caractéristiques admissibles = {statut OPEN, RAIN}**. L'ancienne connaissance OPEN est conservée avec fin de connaissance 30 : à p=20 elle est encore valide.

**Jointure temporelle correcte (bitemporelle).** Filtrer simultanément sur les deux axes :
`K ≤ p` **ET** `V ≤ p ≤ fin_validité`, sur la version courante des tables. L'extraction actuelle (`valid_from <= 20` seule) est **fausse** : elle admet APPROVED (V=15≤20) alors que K=30>20 → fuite temporelle démontrable.

**Rôle différent de Y (R02).** Y est une étiquette évaluée **après** la prédiction dans un horizon fixé. Comme **étiquette**, Y peut mesurer/entraîner un modèle sur une période antérieure. Comme **caractéristique**, Y ne peut jamais entrer dans la prédiction qu'il évalue (sinon fuite cible). De plus, toute transformation apprise sur des étiquettes/statistiques privées doit être ajustée **sur l'apprentissage seulement**, puis appliquée au test.

### Q2 — Composantes et séparation sans fuite

**Composantes (Union-Find sur P02) :** `{A1,A2,A3}`, `{B1,B2,C1}`, `{D1}`.

**Séparation de l'équipe :** train={A1,B1,D1}, test={A2,A3,B2,C1}. Elle **coupe 2 composantes** ({A1,A2,A3} et {B1,B2,C1}) → **fuite démontrable** au sens de R03. Le fait de « n'avoir dupliqué aucun identifiant exact » est sans pertinence : R03 interdit la séparation par arête, pas seulement par identité.

**Séparation correcte (par composantes entières) :** train = {A1,A2,A3,D1}, test = {B1,B2,C1} (ou l'inverse).

**Portée explicite :**
- **Garantit** : aucun compte relié ne traverse train/test ; l'évaluation porte sur des composantes disjointes.
- **Ne garantit pas** : la généralisation à de nouvelles composantes non observées (OOD), l'absence de fuite **temporelle** (R01) ni de fuite par **étiquettes** (R02), ni la validité hors distribution. Ce sont des sources de fuite indépendantes.

### Q3 — Bornes exactes (Manski) et complétions opposées

Chaque groupe : 40 lignes observées, 60 issues binaires inconnues.

- **Nouveau** : succès total ∈ [30, 90] → **p_N ∈ [3/10, 9/10]**
- **Ancien** : succès total ∈ [10, 70] → **p_A ∈ [1/10, 7/10]**
- **Différence p_N − p_A ∈ [3/10 − 7/10, 9/10 − 1/10] = [−2/5, +4/5]**

**Dashboard (lignes observées seules) :** 30/40 = 3/4 vs 10/40 = 1/4, écart affiché **+1/2**.

**Deux complétions de signes opposés (témoins aux bornes) :**
- **A** : nouveau 30 succès manquants → 60/100 ; ancien 60 succès manquants → 70/100 ⇒ **diff = −1/10** (négatif).
- **B** : nouveau 60 succès manquants → 90/100 ; ancien 0 → 10/100 ⇒ **diff = +4/5** (positif).

Les deux respectent exactement les 40 lignes observées. **Le signe de l'écart réel n'est pas déterminé** par ce dossier. Aucune approximation n'est nécessaire.

### Q4 — Analyse de P05

- **Objet randomisé** : le **compte** (100 vs 100), par un registre fiable (R04).
- **Traitement effectivement évalué** : un **paquet groupé** de trois composantes (algorithme + langue d'interface + stratégie de cache partagé), changées **ensemble**.
- **SUTVA violée** : P04 montre que A1 et A2 partagent le cache, que la clé ne contient pas la variante, et qu'un conseil servi à A1 peut dépendre du traitement antérieur de A2. Des composantes de R03 traversent les groupes. L'exposition réelle n'est pas reconstituable.
- **Sélection du journal** : R05/P03 — le journal dépend d'un choix d'activation pouvant dépendre du succès ; ce n'est pas un échantillon aléatoire déclaré. La randomisation **ne corrige pas** cette sélection.

**P05 est réfutée** sur chacun de ses quatre points : (i) l'écart du dashboard n'est pas l'effet causal de l'algorithme (c'est un écart sur lignes observées, non aléatoires) ; (ii) la randomisation ne corrige pas la sélection du journal ; (iii) elle ne corrige pas les interférences ; (iv) elle ne corrige ni les erreurs temporelles ni le changement de langue.

**Inférences impossibles avec ce dossier** : effet de l'algorithme **seul**, effet de la langue **seule**, effet du cache **seul**, et **interaction** entre ces composantes. Seul l'effet du **paquet assigné** est en principe visé, et même celui-ci n'est pas identifié ponctuellement (bornes seulement, R07).

### Q5 — Nouveau protocole

- **Unité de randomisation** : la **composante de cache** (cluster), pas le compte — pour respecter R03 et éviter l'interférence.
- **Design** : factoriel **2×2** (algorithme {nouveau, ancien} × langue {nouvelle, ancienne}), avec **caches isolés par bras** (P06) pour éliminer le partage.
- **Cache** : partitionné/isolé ; la variante expérimentale **dans la clé** ; journalisation des expositions réellement servies.
- **Mesure** : résultat final minimal recueilli pour **100 %** des participants après autorisation dédiée et information appropriée (R06) ; pas de reconstruction depuis des données privées hors finalité.
- **Temporel** : point-in-time strict (K≤p et V≤p≤fin_validité) ; étiquettes Y réservées à l'évaluation.
- **Versionnage** : version immuable et horodatée du modèle et de l'interface (P06).
- **Limites statistiques** : analyse au niveau **cluster** avec IC ; puissance calculée sur le nombre de composantes ; pré-enregistrement du plan d'analyse ; distinction explicite entre proportions assignées et effet causal (R07).

### Q6 — Tests métamorphiques et arrêt de diffusion

**Tests métamorphiques :**
1. **Invariance langue** : même sémantique, autre langue → même décision (à tolérance).
2. **Invariance ordre des requêtes** : permuter l'ordre ne change pas la décision.
3. **Invariance au partitionnement de cache** : isoler vs partager ne doit pas changer la décision servie.
4. **Monotonie de version** : v_{n+1} ne dégrade pas un sous-ensemble protégé.
5. **Équivariance à la permutation des identifiants**.

**Procédure d'arrêt :** déclencher si la **borne supérieure de l'IC** de l'effet du paquet dépasse un seuil de nuisance **pré-enregistré**. L'arrêt signifie « preuve insuffisante de bénéfice / risque non exclu », **pas** « le vrai effet est négatif ».

## Preuves et certificats

- **Q2** : Union-Find → `comps=[['A1','A2','A3'],['B1','B2','C1'],['D1']]` ; composantes coupées = les deux premières (fuite).
- **Q3** : bornes exactes `pN∈[3/10,9/10]`, `pA∈[1/10,7/10]`, `diff∈[−2/5,4/5]` ; dashboard `3/4, 1/4, 1/2` ; témoins A (−1/10) et B (+4/5).
- **Q1** : application directe de R01/R02 à P01 (tableau ci-dessus).
- **Q4/Q5/Q6** : dérivation depuis R03, R04, R05, R06, R07, P04, P06.

## Pièges traités (checklist)

- **Identification partielle** : bornes exactes, jamais de valeur ponctuelle (Q3).
- **Hypothèses énoncées avant calcul** : SUTVA explicitement **non fournie** (R04) ; pas d'absence d'interférence présumée.
- **Mesure imparfaite** : journal non aléatoire traité séparément de la variable réelle (R05).
- **Cohérence des probabilités** : complétions binaires respectant 0≤succès≤100 et les 40 lignes observées.
- **Rétroactivité** : APPROVED exclue malgré V=15≤20 (piège central de R01).

## Limites / impossibilités

- **Non déterminé** : le signe et l'amplitude de l'écart réel (Q3) ; l'effet de l'algorithme seul, de la langue seule, du cache seul, et l'interaction (Q4).
- **Réfuté** : la séparation de l'équipe (fuite par composantes) ; P05 dans ses quatre affirmations.
- **Établi** : composantes du graphe ; bornes exactes ; inadmissibilité d'APPROVED et de Y à p=20 ; violation de SUTVA.
- **Impossible** : rendre connus les résultats manquants par simple reconfiguration (P06) ; transformer un estimateur aléatoire en connaissance exacte d'une population (R07).