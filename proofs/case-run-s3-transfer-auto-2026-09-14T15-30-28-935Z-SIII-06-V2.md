# SIII-06-V2 — SIII-06 → Une arête entre les familles

Score: 96.0 % (certificats 0/0, juge 96/100)

Certificats manqués: aucun

# Contre-expertise « Boussole » — Variante : ajout de l'arête A3–B1

**Hypothèse modifiée (unique) :** dans P02, on ajoute l'arête **A3–B1**. Toutes les autres pièces (P01, P03, P04, P05, P06) et tous les contrats (R01–R07) restent inchangés. Je recalcule donc uniquement ce que cette arête affecte : **la structure du graphe (Q2)** et, par ricochet, **la séparation apprentissage/test** et **l'interprétation de l'essai (Q4)**. Les calculs de bornes (Q3) sont indépendants du graphe et restent valides.

---

## Q1 — Caractéristiques admissibles à p = 20 et jointure temporelle

**Principe de jointure temporelle correcte (R01).** Une caractéristique n'est admissible à p=20 que si elle était **connue au plus tard à p=20** *et* si son **intervalle de validité contient p=20**. La règle « `valid_from <= 20` sur la version courante » est fausse sur deux plans : elle ignore la **borne de connaissance** (K) et elle ignore la **fin de validité** (V_fin). La jointure correcte est une jointure **bitemporelle** :

> retenir la ligne telle que `K ≤ 20` **et** `V ≤ 20 ≤ V_fin` (V_fin = +∞ si non close), en prenant la version courante *au sens de la connaissance à 20*, pas la dernière version écrite.

**Application à P01 :**

| Fait | V (validité) | K (connaissance) | Admissible à p=20 ? |
|---|---|---|---|
| OPEN | 5 | 8 | **Oui** : K=8 ≤ 20, 5 ≤ 20 ≤ 30 |
| APPROVED | 15 | 30 | **Non** : K=30 > 20 (appris après p) |
| RAIN | 18 | 19 | **Oui** : K=19 ≤ 20, 18 ≤ 20 |
| Succès final (événement 40, appris 41) | — | 41 | **Non** comme caractéristique |

À p=20, l'état admissible est donc **OPEN** (et non APPROVED), plus RAIN. La correction APPROVED, bien que déclarée « valable depuis 15 », est **indisponible à p=20** car apprise à K=30 : c'est exactement le cas visé par R01 (« un événement appris après p reste indisponible, même déclaré rétroactivement valable »). L'extraction actuelle, qui ne filtre que `valid_from ≤ 20` sur la version courante, **inclurait à tort APPROVED** → fuite temporelle démontrable.

**Rôle différent du succès final Y (R02).** Y est une **étiquette** évaluée après la prédiction dans un horizon fixé. Il peut :
- servir à **mesurer** la performance (comparer prédiction et Y) ;
- servir à **entraîner** un modèle sur une période antérieure.

Il ne peut **jamais** entrer dans les caractéristiques de la prédiction qu'il évalue. Toute transformation apprise sur des étiquettes ou statistiques privées doit être **ajustée sur l'apprentissage seul**, puis appliquée au test (pas de normalisation/calibration calculée sur le test). Ici, Y (appris à 41) est postérieur à p=20 : l'utiliser comme feature serait une fuite de cible.

---

## Q2 — Composantes du graphe et séparation sans fuite (recalculé)

**Arêtes effectives :** A1–A2, A2–A3, B1–B2, B2–C1, **A3–B1** (nouvelle). D1 isolé.

**Calcul (Union-Find) :**

- {A1, A2, A3} reliés par A1–A2, A2–A3.
- {B1, B2, C1} reliés par B1–B2, B2–C1.
- **A3–B1 fusionne ces deux blocs.**

**Résultat : deux composantes**
1. **C₁ = {A1, A2, A3, B1, B2, C1}** — une seule grande composante connexe.
2. **C₂ = {D1}** — isolé.

**Affectation de l'équipe :** apprentissage = {A1, B1, D1} ; test = {A2, A3, B2, C1}.

**Conséquence décisive :** la grande composante C₁ est **coupée en deux** par l'affectation — A1 et B1 vont en apprentissage, A2, A3, B2, C1 en test. Or R03 interdit toute séparation entre apprentissage et test à l'intérieur d'une composante. **La séparation de l'équipe est donc invalide** : elle est *pire* que dans le dossier de base, car l'arête A3–B1 relie désormais directement un nœud de test (A3) à un nœud d'apprentissage (B1), créant un pont explicite de fuite.

**Séparation sans fuite au sens de R03.** Puisque C₁ est indivisible, la seule séparation admissible est **par composantes entières** :
- soit **C₁ → apprentissage** et **C₂ → test** ;
- soit **C₁ → test** et **C₂ → apprentissage**.

Avec seulement deux composantes (dont une singleton), cela donne une séparation **très déséquilibrée** : mettre D1 seul en test (ou en apprentissage) est statistiquement inexploitable. En pratique, la variante **détruit la possibilité d'une séparation train/test non fuyante et équilibrée** : il faudrait soit renoncer à D1 comme unique test, soit **casser l'arête A3–B1** (ce que la variante interdit), soit recourir à une validation par **composantes multiples** (grouped CV) qui exige davantage de composantes — ici il n'y en a que deux.

**Ce qu'une telle séparation garantit :** l'absence de fuite *par identité de composante* — aucun compte de test ne partage d'arête avec un compte d'apprentissage, donc pas de mémorisation directe via les liens de P02.

**Ce qu'elle ne garantit pas :**
- **La généralisation** : séparer par composantes ne prouve pas que le modèle généralise à de nouvelles composantes ; cela teste seulement la robustesse hors-composante, sans garantie de performance sur la population cible.
- **L'absence d'autres fuites** : fuites temporelles (Q1), fuites de cible (Y), fuites par statistiques calculées sur le test.
- **L'absence d'interférence en ligne** : R03 précise que ces mêmes composantes définissent une possibilité d'interférence pendant un essai (cf. P04, cache partagé). Une séparation offline propre ne neutralise pas l'interférence online.

---

## Q3 — Bornes exactes des proportions et de la différence (inchangé)

Les données P03 ne dépendent pas du graphe : les bornes restent celles du dossier de base.

**Groupe nouveau (Z=nouveau) :** 40 observés = 30 succès, 10 échecs ; 60 inconnus binaires.
- p_n = (30 + x)/100, x ∈ [0, 60] ⟹ **p_n ∈ [0,30 ; 0,90]**.

**Groupe ancien (Z=ancien) :** 40 observés = 10 succès, 30 échecs ; 60 inconnus.
- p_a = (10 + y)/100, y ∈ [0, 60] ⟹ **p_a ∈ [0,10 ; 0,70]**.

**Différence d = p_n − p_a = (20 + x − y)/100 :**
- minimum : x=0, y=60 ⟹ **d_min = −0,40** ;
- maximum : x=60, y=0 ⟹ **d_max = +0,80**.

**Deux complétions à signes opposés :**
- **Signe négatif :** x=0, y=60 ⟹ p_n = 0,30 ; p_a = 0,70 ; **d = −0,40**.
- **Signe positif :** x=60, y=0 ⟹ p_n = 0,90 ; p_a = 0,10 ; **d = +0,80**.

Aucune approximation : les bornes sont exactes (arithmétique rationnelle). Le dashboard affiche 30/40 = 0,75 vs 10/40 = 0,25, soit un écart apparent de +0,50 — **entièrement compatible avec un effet réel nul ou négatif** une fois les 60 issues inconnues par groupe intégrées. Le journal n'étant pas un échantillon aléatoire déclaré (R05), il ne borne rien.

---

## Q4 — Analyse de P05 (recalculée sous la variante)

**Objet randomisé (R04) :** le registre attribue aléatoirement **100 comptes à Z=nouveau et 100 à Z=ancien**. L'unité de randomisation est le **compte**, mais le **traitement est un paquet de trois changements simultanés** : nouvel algorithme **+** nouvelle interface linguistique **+** nouvelle stratégie de cache partagé. Le groupe ancien garde les trois anciennes versions.

**Traitement groupé éventuellement évalué :** on ne peut estimer, au mieux, que l'effet du **bundle** (algorithme + langue + cache) tel qu'assigné. C'est un effet **intention-de-traiter** sur le paquet, pas un effet de composant.

**Interférences (R04 + P04) :** des composantes de R03 traversent les groupes ; A1 et A2 partagent le même état de cache malgré des Z différents ; le cache ne contient pas la variante dans sa clé. Donc le traitement servi à un compte peut dépendre du traitement antérieur d'un autre compte d'un **autre** groupe. **Aucune hypothèse d'absence d'interférence (SUTVA) n'est fournie** — elle est même explicitement violée.

**Ce que P05 affirme à tort :**
1. « L'écart du dashboard est l'effet causal du nouvel algorithme » → faux : (a) l'écart est calculé sur un journal non aléatoire (R05) ; (b) le traitement est un bundle de trois facteurs (R04) ; (c) il y a interférence (P04).
2. « La randomisation corrige automatiquement la sélection du journal » → faux : la randomisation porte sur l'**assignation**, pas sur la **consignation** ; le journal dépend d'un choix d'activation pouvant dépendre du succès (R05).
3. « … les interférences » → faux : la randomisation ne neutralise pas les interférences par cache partagé (P04).
4. « … les erreurs temporelles » → faux : la randomisation ne corrige pas la fuite bitemporelle de P01.
5. « … le changement de langue » → faux : la langue est **confondue** avec l'algorithme dans le bundle ; la randomisation ne sépare pas des facteurs assignés ensemble.

**Inférences impossibles sur l'algorithme seul :** avec ce dossier, on **ne peut pas** isoler l'effet de l'algorithme, ni celui de l'interface, ni celui du cache, ni leurs interactions. On ne peut pas non plus produire une borne de l'**effet causal individuel** (R07) : les bornes de Q3 portent sur les **proportions réalisées dans les groupes effectivement assignés**, pas sur l'effet individuel ni sur l'algorithme isolé. Enfin, un estimateur aléatoire ne doit pas être converti en connaissance exacte d'une population (R07).

**Effet de la variante sur Q4 :** l'arête A3–B1 **aggrave** l'interférence. Dans le dossier de base, les ponts inter-groupes passaient par A2–A3 (test) et B1–B2 (train) sans lien direct A↔B ; ici A3 (test) et B1 (train) sont **directement reliés**, donc le canal d'interférence entre groupes est plus court et plus dense. L'argument « pas d'interférence » devient encore plus intenable.

---

## Q5 — Nouveau protocole (distinguer algorithme, interface, interaction)

**Unité de randomisation :** la **composante** de R03 (jamais le compte isolé), pour respecter l'indivisibilité. Avec la variante, il n'existe que **deux** composantes : il faut donc **d'abord reconstruire un graphe plus riche** (recruter/segmenter davantage de composantes indépendantes) avant tout essai factoriel.

**Plan factoriel 2×2 (algorithme × interface) :**
- Facteur A : algorithme {nouveau, ancien}.
- Facteur B : interface {nouvelle langue, ancienne langue}.
- 4 cellules ; randomiser les **composantes** dans les cellules.
- Le **cache** est traité comme facteur contrôlé : **partitionner/isolier les caches par composante** (P06) et **inclure la variante dans la clé de cache** pour supprimer le couplage de P04.

**Cache :** isolation par composante ; clé = (composante, variante, version modèle) ; journalisation des expositions réellement servies.

**Mesure (R06) :** recueillir la **mesure minimale du résultat final** pour **tous** les participants, après autorisation dédiée et information appropriée. Pas de texte libre, notes privées ni journaux complets nécessaires. En l'absence d'autorisation, traiter comme manquant **sans reconstruction** à partir de données privées hors finalité.

**Temporel :** figer p, K, V ; jointure bitemporelle correcte (Q1) ; Y strictement postérieur à p et hors features.

**Versionnage :** publier une **version immuable du modèle** (P06) ; conserver l'ancienne interface pour certains groupes ; horodater chaque version.

**Limites statistiques :** avec peu de composantes, la puissance est faible ; prévoir un nombre suffisant de composantes par cellule ; analyser en **effets mixtes** (composante en effet aléatoire) ; rapporter intervalles de confiance et non un point unique ; pré-spécifier l'analyse ; ne pas transformer l'estimateur en vérité de population (R07).

---

## Q6 — Tests métamorphiques et arrêt de diffusion

**Tests métamorphiques (invariance/équivariance attendue) :**
1. **Invariance temporelle :** rejouer la prédiction à p=20 avec et sans la correction APPROVED (K=30) → la sortie doit être **identique** (la correction est indisponible à p). Toute différence révèle une fuite temporelle.
2. **Invariance à la cible :** permuter/retarder Y ne doit pas changer la prédiction à p (Y hors features).
3. **Invariance à l'ordre des lignes / à l'identifiant :** renommer les comptes ne doit pas changer les prédictions (pas de mémorisation d'ID).
4. **Équivariance de composante :** déplacer une composante entière entre train et test ne doit pas changer les prédictions sur les autres composantes (pas de fuite inter-composantes).
5. **Invariance au cache :** servir une prédiction avec cache froid vs chaud, à variante fixée, doit donner le même résultat (le cache ne doit pas injecter le traitement d'autrui).
6. **Monotonie de mesure :** ajouter des issues manquantes ne doit pas changer les taux *observés* affichés, mais doit changer les **bornes** — vérifier que le dashboard ne présente pas un point comme certitude.

**Procédure d'arrêt de diffusion (sans prétendre que le vrai effet est négatif) :**
- Déclencher l'arrêt sur des **critères pré-spécifiés** : violation d'un test métamorphique (fuite), ou borne inférieure de l'intervalle de l'effet du bundle **sous un seuil de non-infériorité** — pas sur le seul écart du dashboard.
- Formuler l'arrêt comme **prudence**, non comme preuve : « les données disponibles ne permettent pas d'exclure un effet délétère ; on suspend par précaution », et non « le nouvel algorithme est nuisible ».
- Conserver la possibilité que le vrai effet soit **positif** : les bornes de Q3 vont de −0,40 à +0,80 ; l'arrêt ne doit pas nier cette fourchette.
- Réversible : suspension temporaire, reprise après essai factoriel propre (Q5).

---

## Synthèse de la variante

**Réponse directe à la question :** avec l'arête **A3–B1** ajoutée, le graphe P02 a **deux composantes indivisibles** :

1. **{A1, A2, A3, B1, B2, C1}** — la grande composante, qui **traverse apprentissage et test** (A1, B1 en train ; A2, A3, B2, C1 en test) ;
2. **{D1}** — singleton isolé.

**Conséquences :**
- La séparation de l'équipe est **invalide** (fuite directe A3↔B1) ; la seule séparation sans fuite est **par composantes entières**, ce qui est ici **inexploitable** (une seule grande composante + un singleton).
- L'**interférence** (P04) est **aggravée** : canal direct entre groupes.
- Les **bornes de Q3 sont inchangées** (indépendantes du graphe) : p_n ∈ [0,30 ; 0,90], p_a ∈ [0,10 ; 0,70], d ∈ [−0,40 ; +0,80], avec deux complétions à signes opposés.
- **P05 reste faux** et l'est encore plus : ni l'effet de l'algorithme seul, ni l'absence d'interférence ne sont établis.

**Erreurs démontrables (sans inventer le vrai effet) :** fuite temporelle (P01), fuite de composante (P02 variante), journal non aléatoire (P03/R05), interférence par cache (P04), confusion algorithme/langue/cache (R04), surinterprétation causale (P05/R07). Le vrai effet du système **n'est pas déterminé** par ce dossier.
# RÉPONSE FINALE — Variante « arête A3–B1 »

## 1. Résultat exact demandé

**Question : quelles composantes sont indivisibles ?**

Avec l'arête **A3–B1** ajoutée à P02, le graphe a **exactement deux composantes connexes**, chacune indivisible au sens de R03 :

| Composante | Nœuds | Rôle |
|---|---|---|
| **C₁** | **{A1, A2, A3, B1, B2, C1}** | indivisible, **traverse train/test** |
| **C₂** | **{D1}** | indivisible, isolé |

**Certificat (Union-Find) :** arêtes = A1–A2, A2–A3, B1–B2, B2–C1, **A3–B1**. A1–A2–A3 forment un bloc ; B1–B2–C1 un second ; **A3–B1 les fusionne** → une seule grande composante. D1 sans arête → singleton. Sortie outil : `[['A1','A2','A3','B1','B2','C1'], ['D1']]`.

**Affectation de l'équipe :** train = {A1, B1, D1} ; test = {A2, A3, B2, C1}. La grande composante est **coupée** : A1, B1 en train ; A2, A3, B2, C1 en test. **Séparation invalide** (fuite directe A3↔B1).

**Séparation sans fuite possible :** uniquement **par composantes entières** → soit C₁→train et C₂→test, soit l'inverse. Avec une seule grande composante + un singleton, c'est **statistiquement inexploitable** : la variante **détruit** la possibilité d'une séparation train/test non fuyante et équilibrée.

---

## 2. Certificats et résultats exacts (arithmétique rationnelle)

**Q1 — Admissibilité à p=20 (bitemporel) :** règle correcte = `K ≤ 20` **et** `V ≤ 20 ≤ V_fin`.
- OPEN (V=5, K=8) : **admissible**.
- APPROVED (V=15, K=30) : **exclu** (K=30 > 20).
- RAIN (V=18, K=19) : **admissible**.
- Y (événement 40, appris 41) : **jamais** une caractéristique.
- L'extraction `valid_from ≤ 20` sur version courante **inclut à tort APPROVED** → fuite temporelle démontrable.

**Q3 — Bornes exactes (indépendantes du graphe) :**

| Quantité | Expression | Borne |
|---|---|---|
| p_nouveau | (30+x)/100, x∈[0,60] | **[3/10 ; 9/10]** |
| p_ancien | (10+y)/100, y∈[0,60] | **[1/10 ; 7/10]** |
| d = p_n − p_a | (20+x−y)/100 | **[−2/5 ; +4/5]** |

**Deux complétions à signes opposés :**
- **Négatif :** x=0, y=60 → p_n=3/10, p_a=7/10, **d = −2/5**.
- **Positif :** x=60, y=0 → p_n=9/10, p_a=1/10, **d = +4/5**.

Dashboard : 30/40=0,75 vs 10/40=0,25 → écart apparent **+0,50**, compatible avec un effet réel nul ou négatif. Aucune approximation.

**Q4 — Objet randomisé :** le **compte** (100 vs 100), mais traitement = **bundle** {algorithme + langue + cache}. Interférence par cache partagé (P04), **aggravée** par A3–B1 (canal direct train↔test). Aucune SUTVA fournie.

---

## 3. Pièges (checklist)

1. **Confondre validité et connaissance** : APPROVED « valable depuis 15 » n'est pas *connu* à p=20 (K=30). Piège central de P01.
2. **Croire que la randomisation répare tout** : elle porte sur l'assignation, pas sur la consignation (R05), l'interférence (P04), la temporalité (P01) ni la confusion de facteurs (R04).
3. **Prendre le journal pour un échantillon** : 40/100 par groupe, activation dépendant du succès → non aléatoire.
4. **Séparer par identifiant** : R03 l'interdit ; la variante rend la faute **directe** (A3–B1).
5. **Isoler l'algorithme** : impossible, il est confondu avec langue et cache.
6. **Transformer un estimateur en vérité de population** (R07) : les bornes portent sur les proportions réalisées dans les groupes assignés, pas sur l'effet individuel.
7. **Reconstruire les manquants** depuis des données privées hors finalité (R06) : interdit.
8. **Oublier que la variante ne change pas Q3** : les bornes sont structurelles, pas graphiques.

---

## 4. Limites

- **Le vrai effet du système n'est pas déterminé** : le dossier établit des **erreurs démontrables**, pas la valeur de l'effet. La fourchette [−0,40 ; +0,80] interdit toute conclusion de signe.
- **Deux composantes seulement** : aucune séparation train/test non fuyante et équilibrée n'est possible ; il faut **reconstruire un graphe plus riche** avant tout essai factoriel (Q5).
- **Interférence non mesurable** : P04 indique qu'on ne peut pas reconstituer toutes les expositions servies → l'effet du bundle n'est même pas identifiable proprement.
- **Puissance statistique** : peu de composantes ⇒ faible puissance ; analyse en effets mixtes, IC, pré-spécification.
- **Arrêt de diffusion** : doit être formulé comme **prudence réversible**, jamais comme preuve que l'effet est négatif (Q6).

**Conclusion :** la variante **fusionne** les deux blocs de comptes en une **unique composante indivisible {A1,A2,A3,B1,B2,C1}** (plus le singleton {D1}), **invalide** la séparation de l'équipe, **aggrave** l'interférence, et **laisse inchangées** les bornes exactes de Q3. Les erreurs démontrables (fuite temporelle, fuite de composante, journal non aléatoire, interférence, confusion de facteurs, surinterprétation causale) subsistent ; le vrai effet reste **indéterminé**.