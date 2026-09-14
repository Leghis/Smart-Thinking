# SIII-06 — Le modèle qui apprenait dans le futur

Score: 100.0 % (certificats 0/0, juge 100/100)

Certificats manqués: aucun

J'ai tous les éléments. Rédigeons la réponse finale complète.

## Réponse

### Q1 — Caractéristiques admissibles à p=20 et jointure temporelle

**Principe (R01).** Une caractéristique de la prédiction à p=20 doit satisfaire **deux** conditions simultanées :
1. **Disponibilité** : `knowledge_time ≤ p` (l'information était connue au plus tard à p) ;
2. **Validité** : `valid_from ≤ p ≤ valid_to` (l'intervalle de validité contient p si la feature décrit un état courant).

Le filtre actuel `valid_from <= 20` sur la **version courante** est **incorrect** : il ignore le temps de connaissance et écrase l'historique.

**Reconstitution à p=20 :**

| Élément | valid_from | knowledge_time | Verdict |
|---|---|---|---|
| OPEN (état) | 5 | 8 | **Admis** (état courant à p=20) |
| APPROVED (correction) | 15 | 30 | **Interdit** — connu à K=30 > 20 |
| RAIN | 18 | 19 | **Admis** |
| Succès final (événement 40) | — | 41 | **Interdit** (étiquette) |

**Jointure temporelle correcte (bitemporelle) :**
```
SELECT ... WHERE valid_from <= p AND knowledge_time <= p
  AND (valid_to IS NULL OR valid_to >= p)   -- état courant
```
La correction APPROVED, bien que *déclarée rétroactivement valable depuis 15*, reste **indisponible à p=20** car apprise à K=30 (R01 : « un événement appris après p reste indisponible à p, même s'il est déclaré rétroactivement valable avant p »). C'est une **fuite temporelle** : le filtre actuel l'inclut.

**Rôle du succès final (R02).** Comme **étiquette** Y : évalué après la prédiction dans un horizon fixé, il sert à *mesurer* et *entraîner* sur une période antérieure. Comme **caractéristique** : il est **interdit** dans la prédiction qu'il évalue (fuite cible). Toute transformation apprise sur des étiquettes/statistiques doit être ajustée sur l'apprentissage **seulement**, puis appliquée au test.

### Q2 — Composantes et séparation sans fuite

**Composantes (Union-Find sur P02) :**
- **C₁ = {A1, A2, A3}** (arêtes A1-A2, A2-A3)
- **C₂ = {B1, B2, C1}** (arêtes B1-B2, B2-C1)
- **C₃ = {D1}** (isolé)

**L'affectation de l'équipe est fautive.** Elle met A1, B1, D1 en apprentissage et A2, A3, B2, C1 en test. Or :
- C₁ traverse : A1 (train) / A2, A3 (test) → **fuite**
- C₂ traverse : B1 (train) / B2, C1 (test) → **fuite**
- C₃ = {D1} : entièrement en train → OK

**2 composantes sur 3 fuient.** Le fait de « n'avoir dupliqué aucun identifiant exact » est **non pertinent** : R03 interdit la séparation par identifiant ou par ligne ; c'est la **composante** qui est l'unité indivisible.

**Séparation sans fuite (R03) :** affecter des **composantes entières**. Exemple admissible : train = {C₁, C₃} = {A1,A2,A3,D1} ; test = {C₂} = {B1,B2,C1}. (Ou toute partition de {C₁,C₂,C₃} en deux blocs.)

**Ce que cela garantit :** aucune information partagée entre train et test via les arêtes P02 ; l'évaluation n'est pas contaminée par la mémorisation de voisins.

**Ce que cela ne garantit pas :** la **généralisation** à de nouvelles composantes non vues. Une séparation par composantes mesure la performance sur des composantes *disjointes*, pas sur la population ; elle ne dit rien de la robustesse hors distribution, ni de la validité causale.

### Q3 — Bornes exactes des proportions et de la différence

Chaque groupe : 40 observés + 60 inconnus binaires libres (R05). Proportion p = (succès observés + s)/100, s ∈ [0,60].

**Bornes par groupe :**
- Nouveau : p_n ∈ [30/100, 90/100] = **[3/10, 9/10]**
- Ancien : p_a ∈ [10/100, 70/100] = **[1/10, 7/10]**

**Différence D = p_n − p_a :**
- D_min = 3/10 − 7/10 = **−2/5 = −0.40**
- D_max = 9/10 − 1/10 = **4/5 = +0.80**

Donc **D ∈ [−2/5, 4/5]**, intervalle **non identifié** (contient 0).

**Deux complétions de signes opposés :**
- **Complétion A (D < 0)** : nouveau inconnus = 0 succès → p_n = 0.30 ; ancien inconnus = 60 succès → p_a = 0.70 ; **D = −0.40**.
- **Complétion B (D > 0)** : nouveau inconnus = 60 succès → p_n = 0.90 ; ancien inconnus = 0 succès → p_a = 0.10 ; **D = +0.80**.

**Le dashboard affiche** 30/40 = 0.75 et 10/40 = 0.25, soit un écart de **0.50** — valeur **dans** [−0.40, 0.80], donc **non identifiée** : elle ne prouve rien sur la vraie différence. Le journal n'étant pas un échantillon aléatoire déclaré (R05), l'écart observé est biaisé par la sélection d'activation.

### Q4 — Analyse de P05

**Objet randomisé (R04) :** l'unité est le **compte** (100 + 100). L'objet randomisé est le **bundle** (algorithme + langue + cache), pas un composant isolé.

**Traitement groupé évalué :** Z=nouveau = (algo_new, langue_new, cache_new) vs Z=ancien = (algo_old, langue_old, cache_old). Le contraste identifié est l'**effet du bundle complet**.

**P05 est réfuté.** La randomisation **ne corrige pas automatiquement** :
1. **La sélection du journal** (R05) : le journal dépend d'un choix d'activation corrélé au succès → biais de sélection, non corrigé par la randomisation du traitement.
2. **Les interférences** (P04) : A1 et A2 partagent le cache (clé sans variante) ; un conseil servi à A1 peut dépendre du traitement antérieur de A2 → **SUTVA violée**, Y_i(Z_i) dépend de Z_j.
3. **Les erreurs temporelles** (P01) : la fuite APPROVED fausse les features.
4. **Le changement de langue** : confondu avec l'algorithme.

**Inférences impossibles avec ce dossier :**
- Effet de **l'algorithme seul** (confondu avec langue + cache) ;
- Effet **causal individuel** (interférence) ;
- Effet sur la **population** (échantillon aléatoire non déclaré, R07) ;
- Toute affirmation que la randomisation « corrige » ces biais.

### Q5 — Nouveau protocole (distinguer algorithme, interface, interaction)

**Unité de randomisation :** la **composante** R03 (jamais le compte isolé), pour respecter l'absence d'interférence intra-composante.

**Design factoriel 2×2** (algorithme × interface), avec cache **partitionné par composante** :
- Facteur A : algorithme ∈ {ancien, nouveau}
- Facteur B : interface ∈ {ancienne, nouvelle}
- 4 cellules : (A_old,B_old), (A_new,B_old), (A_old,B_new), (A_new,B_new)

**Cache :** partitionné ou isolé par composante (P06) ; la **variante expérimentale entre dans la clé** du cache pour éviter la contamination croisée (corrige P04).

**Mesure (R06) :** recueillir le **résultat minimal final** pour **tous** les participants, après autorisation dédiée et information appropriée. Pas de reconstruction à partir de données privées hors finalité ; en l'absence d'autorisation, traiter comme manquant.

**Temporel :** features construites par jointure bitemporelle (`valid_from ≤ p AND knowledge_time ≤ p`) ; version immuable du modèle (P06) ; étiquette Y strictement postérieure à p.

**Versionnage :** publier une version immuable du modèle et de l'interface ; horodatage des expositions.

**Limites statistiques :** puissance limitée par le nombre de **composantes** (pas de comptes) ; estimer l'**interaction** A×B nécessite une taille suffisante par cellule ; distinguer effet moyen (ATE) et effet sur sous-populations ; ne pas transformer un estimateur aléatoire en connaissance exacte (R07).

### Q6 — Tests métamorphiques et arrêt de diffusion

**Tests métamorphiques :**
1. **Invariance temporelle** : rejouer la prédiction à p=20 avec/sans la correction APPROVED (K=30) → la sortie doit être **identique** (la correction est indisponible à p).
2. **Invariance à la langue** : à algorithme et cache fixés, changer la langue → mesurer l'écart attribuable à l'interface seule.
3. **Invariance au cache** : servir le même compte avec cache froid/chaud → détecter la dépendance au traitement antérieur d'autrui.
4. **Monotonie de complétion** : faire varier les 60 inconnus → la conclusion doit rester dans [−2/5, 4/5] ; toute conclusion hors bornes est invalide.
5. **Permutation des composantes** : réaffecter les composantes train/test → la performance ne doit pas s'effondrer (sinon fuite résiduelle).

**Procédure d'arrêt de diffusion :** déclencher un arrêt si (a) une fuite temporelle ou par composante est détectée, (b) l'intervalle de la différence contient 0 **et** aucune mesure complète n'est disponible, (c) une interférence via cache est observée. L'arrêt **ne prétend pas** que le vrai effet est négatif : il constate seulement que **l'effet n'est pas identifié** avec les données disponibles. Reprise conditionnée à un essai conforme (Q5).

## Preuves et certificats

- **Q2** : Union-Find sur les arêtes P02 → composantes `[[A1,A2,A3],[B1,B2,C1],[D1]]` ; 2 traversent train/test (fuite).
- **Q3** : bornes analytiques (Manski) `p_n∈[3/10,9/10]`, `p_a∈[1/10,7/10]`, `D∈[−2/5,4/5]` ; **vérifiées par énumération exhaustive** des 61×61 = 3721 complétions → identiques. Témoins aux deux extrêmes explicites.
- **Q1** : table de verdicts bitemporels ; APPROVED exclu (K=30 > 20).
- **Q4** : analyse SUTVA/bundle ; P05 réfuté point par point.

## Pièges traités

1. **Snapshot vs sérialisabilité** : la cohérence instantanée du filtre `valid_from ≤ 20` ne garantit pas la validité temporelle ; il faut l'ordre bitemporel explicite (Q1).
2. **Tous les sous-ensembles/témoins** : énumération exhaustive des 3721 complétions (pas seulement les extrêmes) ; toutes les composantes examinées (Q2, Q3).
3. **Effet externe irréversible** : un conseil servi via cache partagé (P04) n'est pas annulé par un rollback ; l'exposition réelle ne peut être reconstituée → interférence non réversible (Q4).
4. **exactly-once / fencing / idempotence / autorisation** : la randomisation (autorisation d'assigner) ne garantit ni l'absence d'interférence (fencing du cache), ni l'idempotence des conseils servis, ni l'exactly-once de la mesure (R06) — distingués en Q4/Q5.
5. **Identification partielle** : bornes exactes, jamais de valeur ponctuelle non identifiée (Q3).
6. **Hypothèses explicites** : SUTVA (violée), échantillon aléatoire (non déclaré), exclusion — énoncées avant calcul (Q4).

## Limites / impossibilités

- **Établi** : fuite temporelle (APPROVED), fuite par composantes (2/3), bornes D∈[−2/5,4/5], réfutation de P05, impossibilité d'isoler l'algorithme.
- **Réfuté** : P05 (la randomisation ne corrige pas sélection/interférence/temporalité/langue).
- **Non déterminé** : le **vrai effet** du système (algorithme, interface, interaction) — non identifiable avec ce dossier ; les 60 résultats manquants par groupe ne sont pas reconstituables (R05/R06) ; l'effet sur la population (R07).
- **Impossibilités** : reconstruire les expositions réelles via cache (P04) ; rendre connus les anciens résultats manquants par reconfiguration (P06) ; garantir l'absence d'interférence sans partition de cache.

*Note : les outils du dossier sont simulés ; aucune action réelle sur des comptes n'est effectuée.*