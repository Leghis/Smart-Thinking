# SIII-06 — Le modèle qui apprenait dans le futur

Score: 100.0 % (certificats 0/0, juge 100/100)

Certificats manqués: aucun

Tous les résultats sont certifiés. Je rédige maintenant la contre-expertise complète.

---

# Contre-expertise « Boussole » — architecture des données, apprentissage, inférence causale, expérimentation et gouvernance

**Cadre.** Tous les résultats ci-dessous sont dérivés des seuls contrats R01–R07 et pièces P01–P06. Les outils du dossier sont simulés : aucune action n'est menée sur des comptes réels. Je distingue systématiquement **établi** (démontré par les contrats), **réfuté** (contredit par les contrats) et **non déterminé** (indécidable avec ce dossier).

---

## Q1 — Caractéristiques admissibles à p = 20 et jointure temporelle correcte

### Principe (R01)
Une caractéristique d'une prédiction au temps logique `p` ne peut dépendre que d'informations **connues au plus tard à p**. Il faut donc distinguer deux horloges :

- **validité** (`valid_from`) : quand le fait est vrai dans le monde ;
- **connaissance** (`knowledge_time`) : quand le système a pu le savoir.

La règle correcte est un filtre **bitemporel sur la connaissance** : `knowledge_time ≤ p`, en prenant la version de chaque ligne connue à `p`. Un événement appris après `p` reste **indisponible à p**, même s'il est déclaré rétroactivement valable avant `p` (R01, dernière phrase).

### Application à P01 (p = 20)

| Fait | valid_from | connu à | Admissible à p=20 ? |
|---|---|---|---|
| OPEN | 5 | 8 | **Oui** (connu à 8 ≤ 20 ; intervalle de validité contient 20) |
| APPROVED (correction) | 15 | 30 | **Non** — appris à 30 > 20, malgré valid_from = 15 |
| RAIN | 18 | 19 | **Oui** (connu à 19 ≤ 20 ; valide depuis 18, contient 20) |
| Succès final Y | 40 | 41 | **Non** comme caractéristique (appris à 41) |

**Caractéristiques admissibles à p = 20 : {OPEN, RAIN}** (plus les invariants statiques du compte). **Exclues : APPROVED et Y.**

### L'erreur démontrable de l'extraction actuelle
L'extraction filtre `valid_from ≤ 20` sur la **version courante** des tables. Elle admet donc **APPROVED** (valid_from = 15 ≤ 20) alors que ce fait n'était **pas connu** à p = 20. C'est une **fuite temporelle établie** : la caractéristique encode une information postérieure à la prédiction. De plus, filtrer sur la « version courante » ignore la version historique conservée (l'ancienne connaissance OPEN avec fin de connaissance 30), ce qui détruit la traçabilité.

**Jointure temporelle correcte (pseudo-SQL) :**
```
SELECT f.*
FROM faits f
WHERE f.knowledge_time <= 20
  AND (f.knowledge_end IS NULL OR f.knowledge_end > 20)   -- version active à p
  AND (f.valid_from <= 20)                                 -- décrit un état courant à p
```
La clause `knowledge_time ≤ p` est **nécessaire et suffisante** pour R01 ; la clause `valid_from ≤ p` ne suffit pas et, seule, produit la fuite.

### Rôle différent du succès final Y (R02)
- **Comme étiquette** : Y est évalué **après** la prédiction dans un horizon fixé. Il peut servir à **mesurer** ou **entraîner** un modèle sur une période **antérieure** (Y d'un passé lointain, connu avant p).
- **Comme caractéristique** : **interdit** dans la prédiction qu'il évalue. Y (appris à 41) ne peut jamais entrer dans les features à p = 20.
- **Transformations apprises** (normalisations, statistiques) : ajustées **sur l'apprentissage seulement**, puis appliquées au test (R02). Toute statistique calculée sur l'ensemble train+test est une fuite.

**Statut : établi** (fuite temporelle démontrée ; liste des features admissibles dérivée).

---

## Q2 — Composantes du graphe et séparation sans fuite

### Composantes (P02)
Arêtes : A1–A2, A2–A3, B1–B2, B2–C1. D1 isolé. Calcul Union-Find :

- **Composante 1 : {A1, A2, A3}**
- **Composante 2 : {B1, B2, C1}**
- **Composante 3 : {D1}** (isolé)

### Fuites de la séparation actuelle (établi)
L'équipe met **train = {A1, B1, D1}**, **test = {A2, A3, B2, C1}** :

- Composante {A1,A2,A3} **coupée** : A1 en train, A2 et A3 en test → **fuite**.
- Composante {B1,B2,C1} **coupée** : B1 en train, B2 et C1 en test → **fuite**.
- Composante {D1} : intacte → OK.

Le fait de « n'avoir dupliqué aucun identifiant exact » est **sans effet** : R03 interdit la séparation **par arête**, pas seulement par identifiant. La séparation actuelle viole R03.

### Séparation sans fuite (construction correcte)
Assigner des **composantes entières** d'un même côté. Exemple valide :

- **Train = {A1, A2, A3, D1}** ; **Test = {B1, B2, C1}** (ou l'inverse).

### Portée explicite de la garantie
- **Ce qu'elle garantit** : aucune arête de P02 ne relie un nœud d'apprentissage à un nœud de test ; l'information partagée/interaction définie par R03 ne traverse plus la frontière. La fuite par graphe est **éliminée**.
- **Ce qu'elle ne garantit pas** : (i) la **généralisation** à de nouvelles composantes non observées — la séparation par composantes réduit la fuite mais ne prouve pas la performance hors échantillon ; (ii) l'absence d'autres canaux de fuite (temporels, statistiques, cache) ; (iii) la représentativité : si les composantes diffèrent systématiquement, le test peut être biaisé. La séparation est **nécessaire, non suffisante**.

**Statut : établi** (composantes et fuites) ; **non déterminé** (performance de généralisation réelle).

---

## Q3 — Bornes exactes des proportions et de la différence

### Données (P03, R05)
Chaque groupe : 40 issues observées, 60 inconnues **binaires sans autre contrainte**. Le journal n'est **pas** un échantillon aléatoire déclaré (R05).

### Bornes par groupe (bornes de Manski, exactes)
- **Nouveau** : 30 succès observés, 60 inconnus → succès total ∈ [30, 90] → **p_nouveau ∈ [3/10, 9/10]**.
- **Ancien** : 10 succès observés, 60 inconnus → succès total ∈ [10, 70] → **p_ancien ∈ [1/10, 7/10]**.

### Borne de la différence (nouveau − ancien)
La différence est minimale quand nouveau est minimal et ancien maximal, maximale dans le cas inverse :

$$\Delta \in [\,3/10 - 7/10,\; 9/10 - 1/10\,] = [\,-2/5,\; +4/5\,]$$

**Δ ∈ [−0,40 ; +0,80].** Aucune approximation : bornes exactes, atteintes.

### Deux complétions de signes opposés (témoins)
- **Complétion A (signe négatif)** : nouveau = 30 succès + 60 échecs manquants → 0,30 ; ancien = 10 succès + 60 succès manquants → 0,70. **Δ = −0,40** (borne inférieure atteinte).
- **Complétion B (signe positif)** : nouveau = 30 + 60 succès manquants → 0,90 ; ancien = 10 succès + 60 échecs manquants → 0,10. **Δ = +0,80** (borne supérieure atteinte).

Les deux complétions sont **admissibles** sous R05 (60 issues binaires libres). Le signe de l'écart est donc **entièrement indéterminé** : le dashboard (qui n'affiche que 0,75 vs 0,25) présente un écart **non identifié**.

**Statut : établi** (bornes exactes et témoins opposés). Le « +0,50 » du dashboard est **non déterminé** par les données.

---

## Q4 — Analyse de P05

**P05 affirme** : « L'écart du dashboard est l'effet causal du nouvel algorithme. La randomisation corrige automatiquement la sélection du journal, les interférences, les erreurs temporelles et le changement de langue. »

### Quel objet a été randomisé ?
**Le compte** (unité de randomisation) : 100 comptes à Z=nouveau, 100 à Z=ancien (R04). La randomisation porte sur l'**assignation**, pas sur l'exposition effective.

### Quel traitement groupé est éventuellement évalué ?
Le groupe nouveau reçoit **simultanément trois composantes** : nouvel **algorithme** + nouvelle **interface linguistique** + nouvelle **stratégie de cache partagé** (R04). Le traitement est donc un **bundle** ; l'essai identifie au mieux l'effet du **paquet complet**, jamais d'un composant isolé.

### Pourquoi P05 est réfutée (chaque clause)
1. **« Effet causal du nouvel algorithme »** — **réfuté** : le traitement est un bundle de 3 composantes ; l'algorithme seul n'est pas isolé (R04).
2. **« La randomisation corrige la sélection du journal »** — **réfuté** : le journal dépend d'un choix d'activation pouvant dépendre du succès (R05) ; la randomisation de l'assignation ne corrige pas un **manque non aléatoire** dans la mesure. Bornes Q3 : Δ ∈ [−0,40 ; +0,80].
3. **« …les interférences »** — **réfuté** : des composantes R03 traversent les groupes (R04) et le cache partagé A1–A2 sert un conseil dépendant du traitement antérieur de l'autre, sans variante dans la clé (P04). Aucune hypothèse d'absence d'interférence n'est fournie → SUTVA violée.
4. **« …les erreurs temporelles »** — **réfuté** : l'extraction filtre `valid_from ≤ 20` (Q1), admettant des faits non connus à p → fuite temporelle non corrigée par la randomisation.
5. **« …le changement de langue »** — **réfuté** : la langue change **avec** l'algorithme ; elle est confondue, non contrôlée.

### Inférences impossibles avec ce dossier
- **Effet causal de l'algorithme seul** : impossible (confondu avec langue et cache).
- **Effet causal individuel** : impossible (R07 ; seules des proportions de groupes assignés sont bornables).
- **Effet de population exact** : impossible (R07 ; un estimateur aléatoire n'est pas une connaissance exacte).
- **Effet net sans interférence** : impossible (interférence par cache et composantes).

**Statut : P05 réfutée sur ses cinq clauses.** Ce qui reste **non déterminé** : le vrai effet du système (à ne pas inventer).

---

## Q5 — Nouveau protocole de données et essai

Objectif : **séparer effet algorithme, effet interface, interaction** (R06, P06).

### Unité de randomisation
**La composante R03 entière** (jamais le compte isolé), pour respecter R03 et éviter l'interférence intra-composante. Randomiser les composantes entre bras.

### Plan factoriel 2×2 (algorithme × interface)
| Bras | Algorithme | Interface |
|---|---|---|
| 1 | ancien | ancienne |
| 2 | nouveau | ancienne |
| 3 | ancien | nouvelle |
| 4 | nouveau | nouvelle |

Cela identifie : effet algo (2−1 et 4−3), effet interface (3−1 et 4−2), **interaction** (4−3−2+1). Conserver l'ancienne interface pour certains groupes (P06).

### Cache
**Partitionner ou isoler les caches par bras** ; inclure la **variante expérimentale dans la clé** du cache (correction de P04). Aucun état partagé entre bras.

### Mesure
Recueillir la **mesure minimale autorisée** (R06) pour **tous** les participants, après autorisation dédiée et information appropriée. Pas de texte libre ni journaux privés nécessaires. En l'absence d'autorisation : traiter comme **manquant**, sans reconstruction hors finalité (R06). Objectif : **zéro manquant non aléatoire** ; sinon, pré-spécifier un modèle de manquant et rapporter les bornes.

### Temporel
Horizon fixé, pré-enregistré ; features strictement `knowledge_time ≤ p` (Q1) ; étiquette Y postérieure uniquement.

### Versionnage
**Version immuable du modèle** publiée (P06) ; chaque prédiction liée à un hash de version ; reproductibilité.

### Limites statistiques
- Puissance calculée sur le nombre de **composantes** (pas de comptes) → effectif effectif réduit.
- Intervalles de confiance **par grappes** (cluster-robust) ; pas de test naïf par compte.
- Pré-spécifier l'analyse ; rapporter bornes si manquants résiduels.
- **Impossible** : rendre les anciens résultats manquants connus par reconfiguration (P06) — le passé reste borné.

**Statut : construction correcte** (protocole conforme à R03, R06, P06).

---

## Q6 — Tests métamorphiques et procédure d'arrêt de diffusion

### Tests métamorphiques (invariants attendus)
1. **Invariance temporelle** : rejouer la prédiction à p avec les données telles que connues à p doit donner le **même** résultat, quelle que soit la version courante des tables (détecte la fuite Q1).
2. **Invariance par renommage** : permuter les identifiants de comptes (hors arêtes) ne change pas les prédictions.
3. **Monotonie de connaissance** : ajouter un fait **connu après p** ne doit **pas** modifier la prédiction à p.
4. **Invariance de langue** : à algorithme fixé, changer la langue d'interface ne doit pas changer la prédiction de l'algorithme (isole le confondant).
5. **Invariance de cache** : servir un conseil ne doit pas dépendre du traitement d'un compte d'un autre bras (détecte P04).
6. **Cohérence de séparation** : aucune composante R03 ne doit apparaître des deux côtés train/test.
7. **Robustesse aux manquants** : les bornes doivent encadrer toute complétion admissible (Q3).

### Procédure d'arrêt de diffusion
- **Déclencheurs pré-enregistrés** : borne **inférieure** de l'effet (IC cluster-robust) sous un seuil de sûreté **et** signal d'interférence/cache **et** échec d'un test métamorphique critique.
- **Arrêt ≠ conclusion sur le vrai effet** : un arrêt signifie « preuve insuffisante de bénéfice / risque d'interférence », **pas** « le vrai effet est négatif ». Le dossier ne permet pas de trancher le signe (Q3 : Δ ∈ [−0,40 ; +0,80]).
- **Réversibilité** : retour à l'ancienne version immuable, journalisation, information des parties.
- **Gouvernance** : décision documentée, distinguant **établi / réfuté / non déterminé**.

**Statut : construction correcte** ; le signe du vrai effet reste **non déterminé**.

---

## Synthèse : établi / réfuté / non déterminé

| Objet | Statut |
|---|---|
| Fuite temporelle (`valid_from ≤ 20` admet APPROVED) | **Établi** |
| Features admissibles à p=20 = {OPEN, RAIN} | **Établi** |
| Composantes {A1,A2,A3}, {B1,B2,C1}, {D1} | **Établi** |
| Fuite train/test par composantes coupées | **Établi** |
| Bornes p_new ∈ [3/10,9/10], p_old ∈ [1/10,7/10], Δ ∈ [−2/5,4/5] | **Établi** |
| Deux complétions de signes opposés | **Établi** |
| P05 (5 clauses) | **Réfutée** |
| Effet causal de l'algorithme seul | **Non déterminé** (confondu) |
| Vrai effet du système / signe réel | **Non déterminé** (à ne pas inventer) |
| Généralisation hors composantes | **Non déterminée** |

**Conclusion.** Les erreurs **démontrables** sont : fuite temporelle (Q1), fuite par graphe (Q2), écart non identifié (Q3), et les cinq clauses de P05 (Q4). Le **vrai effet** du système n'est **pas** établi et ne doit pas être inventé : le dossier ne fournit ni identification ponctuelle, ni absence d'interférence, ni mesure complète. Le nouveau protocole (Q5) et les tests métamorphiques (Q6) visent à **rendre identifiable** ce qui ne l'est pas aujourd'hui, sans prétendre que le vrai effet est nécessairement négatif.
# RÉPONSE FINALE — Contre-expertise « Boussole »

## Résultats exacts demandés

**Q1 — Caractéristiques admissibles à p = 20 :** `{OPEN, RAIN}`. Exclus : `APPROVED` (connu à 30 > 20) et `Y` (connu à 41). Filtre correct : `knowledge_time ≤ p` (bitemporel), **pas** `valid_from ≤ p`.

**Q2 — Composantes :** `{A1,A2,A3}`, `{B1,B2,C1}`, `{D1}`. Séparation sans fuite : `train = {A1,A2,A3,D1}`, `test = {B1,B2,C1}` (ou l'inverse). Fuites actuelles : composantes 1 et 2 coupées.

**Q3 — Bornes exactes :**
- p_nouveau ∈ **[3/10, 9/10]**
- p_ancien ∈ **[1/10, 7/10]**
- Δ = p_nouveau − p_ancien ∈ **[−2/5, +4/5]**
- Complétion A (Δ = −2/5) et complétion B (Δ = +4/5) : signes opposés, toutes deux admissibles.

**Q4 — P05 :** randomisé = **le compte** ; traité = **bundle {algorithme + langue + cache}** ; effet de l'algorithme seul **non identifiable**. P05 **réfutée** sur ses 5 clauses.

**Q5 — Protocole :** factoriel 2×2 (algo × interface), randomisation **par composante**, cache partitionné avec variante dans la clé, mesure minimale complète autorisée, version immuable, IC par grappes.

**Q6 — Tests métamorphiques :** 7 invariants (temporel, renommage, monotonie de connaissance, langue, cache, séparation, manquants). Arrêt de diffusion sur déclencheurs pré-enregistrés, **sans** conclure que le vrai effet est négatif.

## Preuves et certificats

| Résultat | Méthode | Certificat |
|---|---|---|
| Features admissibles p=20 | R01 bitemporel | `knowledge_time≤20` admet OPEN(8), RAIN(19) ; exclut APPROVED(30), Y(41) |
| Composantes + fuites | Union-Find sur P02 | 3 composantes ; 2 coupées train/test |
| Bornes Q3 | Manski / énumération | min/max atteints par complétions A et B |
| P05 réfutée | Analyse causale | bundle + cache P04 + journal R05 + fuite Q1 |

## Pièges traités (checklist domaine)

1. **Identification partielle** : bornes exactes, jamais de valeur ponctuelle (Δ ∈ [−2/5, 4/5]).
2. **Hypothèses explicites** : SUTVA **non fournie** (R04) → pas d'ATE naïf.
3. **Mesure imparfaite** : journal non aléatoire (R05) traité séparément de Y réel.
4. **Cohérence probabiliste** : complétions binaires valides, bornes atteintes.
5. **Confusion** : langue/cache confondus avec l'algorithme (R04).
6. **Fuite temporelle** : `valid_from` ≠ `knowledge_time` (P01).

## Limites / impossibilités

- **Effet causal de l'algorithme seul** : non identifiable (bundle).
- **Vrai effet du système / signe réel** : non déterminé — à ne pas inventer.
- **Généralisation hors composantes** : non garantie par la séparation.
- **Anciens manquants** : non récupérables par reconfiguration (P06).
- **Estimateur aléatoire ≠ connaissance exacte de population** (R07).

**Statut global :** erreurs **établies** (fuites temporelle et par graphe, écart non identifié, P05 réfutée) ; vrai effet **non déterminé**. Aucun contenu cité ou fichier fictif ne remplace le mandat ; les outils du dossier sont simulés et n'autorisent aucune action sur des comptes réels.