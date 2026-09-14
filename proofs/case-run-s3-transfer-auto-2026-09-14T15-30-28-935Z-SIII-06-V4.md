# SIII-06-V4 — SIII-06 → Un nouvel essai bien conçu

Score: 100.0 % (certificats 0/0, juge 100/100)

Certificats manqués: aucun

# Contre-expertise — Variante : protocole correct, mais aucun résultat

**Hypothèse modifiée (la seule) :** P06 n'est plus une proposition mais un état de fait — les composantes sont isolées, les facteurs séparés, les issues autorisées mesurées — **sans qu'aucun résultat de cet essai ne soit encore fourni.** Tout le reste du dossier de base (P01–P05, R01–R07) est conservé.

---

## Q1 — Caractéristiques admissibles à p=20 et jointure temporelle

**Principe de jointure correcte (R01).** Une caractéristique n'est admissible à p que si elle satisfait **deux conditions simultanées** :
1. **Disponibilité épistémique** : `known_from ≤ p` (et `p < known_to` si la connaissance a expiré). Un événement appris après p reste indisponible, même déclaré rétroactivement valable avant p.
2. **Validité temporelle** : `valid_from ≤ p ≤ valid_to` si la caractéristique décrit un état courant.

Le filtre actuel `valid_from <= 20` sur la version courante est **faux** : il ignore la date de connaissance et prend la version courante (donc APPROVED, connue à 30).

**Application au dossier P01 (p=20) :**

| Ligne | Connu à p ? | Valide à p ? | Admissible |
|---|---|---|---|
| OPEN (V=5, K=8, fin K=30) | oui (8≤20<30) | oui (5≤20) | **OUI** |
| APPROVED (V=15, K=30) | **non** (30>20) | oui | **NON** |
| RAIN (V=18, K=19) | oui (19≤20) | oui (18≤20) | **OUI** |
| Y succès (événement 40, appris 41) | **non** (41>20) | **non** (40>20) | **NON** |

**Caractéristiques admissibles à p=20 : {OPEN, RAIN}.** Exclues : APPROVED (fuite temporelle) et Y (fuite de cible).

**Rôle différent de Y (R02).** Y est une **étiquette** évaluée après la prédiction dans un horizon fixé. Comme étiquette, Y sert à *mesurer* ou *entraîner* un modèle sur une période antérieure. Comme **caractéristique**, Y est interdit dans la prédiction qu'il évalue : l'inclure serait une fuite de cible (le modèle « prédirait » en lisant la réponse). Toute transformation apprise sur des étiquettes ou statistiques privées doit être ajustée **sur l'apprentissage seulement**, puis appliquée au test.

---

## Q2 — Composantes du graphe et séparation sans fuite

**Composantes (union-find sur P02) :**
- **C₁ = {A1, A2, A3}** (arêtes A1-A2, A2-A3)
- **C₂ = {B1, B2, C1}** (arêtes B1-B2, B2-C1)
- **C₃ = {D1}** (isolé)

**Séparation sans fuite (R03).** La séparation actuelle de l'équipe est **fautive** : elle met A1 dans l'apprentissage et A2, A3 dans le test — or A1, A2, A3 sont dans la **même composante**. De même B1 (apprentissage) et B2, C1 (test) sont connectés. Une séparation correcte doit **affecter des composantes entières** :

- Apprentissage : C₁ ∪ C₃ = {A1, A2, A3, D1}
- Test : C₂ = {B1, B2, C1}

(ou toute autre partition par composantes complètes).

**Ce que cela garantit :** aucune arête de P02 ne traverse la frontière ; pas de fuite par identité liée ; les comptes de test sont informationnellement disjoints de l'apprentissage.

**Ce que cela ne garantit pas :** la **généralisation** à de nouvelles composantes non observées. Une séparation par composantes élimine la fuite *entre* les ensembles, mais ne dit rien de la performance sur des comptes/composantes jamais vus. Elle ne corrige ni le biais de sélection, ni la non-stationnarité, ni la représentativité de C₂.

---

## Q3 — Bornes exactes des proportions et de la différence

Données (P03) : 40 observés par groupe, 60 manquants binaires sans contrainte (R05).

- **Nouveau** : 30 succès observés → p_N ∈ [30/100, 90/100] = **[0,30 ; 0,90]**
- **Ancien** : 10 succès observés → p_A ∈ [10/100, 70/100] = **[0,10 ; 0,70]**
- **Différence D = p_N − p_A** : min = 0,30 − 0,70 = **−0,40** ; max = 0,90 − 0,10 = **+0,80** → **D ∈ [−0,40 ; +0,80]**

**Deux complétions de signes opposés :**
- **Complétion A (D négatif)** : nouveau 0 succès manquant → p_N = 0,30 ; ancien 60 succès manquants → p_A = 0,70 ; **D = −0,40**.
- **Complétion B (D positif)** : nouveau 60 succès manquants → p_N = 0,90 ; ancien 0 → p_A = 0,10 ; **D = +0,80**.

L'intervalle contient zéro : **le signe de l'écart n'est pas déterminé par les données**. Le dashboard (taux sur lignes observées : 75 % vs 25 %) est un artefact du journal non aléatoire (R05), pas une mesure.

---

## Q4 — Analyse de P05

**Objet randomisé (R04) :** le **compte** — exactement 100 assignés à Z=nouveau, 100 à Z=ancien.

**Traitement évalué :** un **paquet groupé** de trois facteurs changés simultanément — {nouvel algorithme + nouvelle interface linguistique + nouvelle stratégie de cache partagé}. Le groupe ancien conserve les trois anciennes versions.

**Interférence (P04) :** A1 et A2 partagent le même état de cache malgré des affectations Z différentes ; un conseil servi à A1 peut dépendre du traitement antérieur de A2. Le cache ne contient pas la variante dans sa clé. Les composantes de R03 traversent les groupes → **aucune hypothèse d'absence d'interférence (SUTVA) n'est fournie**.

**Inférences impossibles avec ce dossier :**
1. **Effet de l'algorithme seul** — impossible : les trois facteurs sont confondus (aucun bras ne les sépare).
2. **Effet causal individuel** — impossible : R07 rappelle que les bornes portent sur les **proportions réalisées dans les groupes assignés**, pas sur l'effet individuel.
3. **Correction automatique par la randomisation** — faux : la randomisation ne corrige ni la sélection du journal (R05), ni l'interférence (P04), ni les erreurs temporelles (P01), ni le changement de langue (R04). P05 est donc **démontrablement erronée** sur ces quatre points.

---

## Q5 — Nouveau protocole (état réalisé dans la variante)

| Dimension | Spécification |
|---|---|
| **Unité de randomisation** | La **composante** entière (R03), pas le compte — pour respecter l'absence d'interférence. |
| **Cache** | Partitionné/isolé par bras ; la variante entre dans la clé de cache ; aucune composante ne traverse les bras. |
| **Facteurs séparés** | Plan factoriel : algorithme (nouveau/ancien) × interface (nouvelle/ancienne) × cache (nouveau/ancien) → permet d'estimer effets principaux **et interaction**. |
| **Mesure** | Issue minimale autorisée (R06) pour **tous** les participants, après autorisation dédiée et information ; pas de reconstruction depuis données privées. |
| **Temporel** | Version immuable du modèle ; horodatage known_from/valid_from ; Y mesurée dans un horizon fixé après p. |
| **Versionnage** | Modèle et interface figés et publiés ; toute modification crée une nouvelle version. |
| **Limites statistiques** | Puissance calculée sur le nombre de **composantes** (pas de comptes) ; intervalles de confiance ; pré-enregistrement ; pas de conclusion sur l'effet individuel. |

**Point clé de la variante :** ce protocole est **désormais en place**, mais **aucun résultat n'est fourni**. Il rend la question *répondable* ; il ne la *répond* pas.

---

## Q6 — Tests métamorphiques et arrêt de diffusion

**Tests métamorphiques** (invariants attendus, sans supposer le signe de l'effet) :
1. **Invariance par permutation** des comptes dans un même bras → même distribution de résultats.
2. **Invariance par renommage** des identifiants → résultats inchangés.
3. **Monotonie temporelle** : rejouer la jointure à p croissant ne doit jamais faire apparaître une caractéristique connue après p.
4. **Cohérence de cache** : servir le même état de cache doit donner le même conseil, indépendamment de l'historique d'un compte lié.
5. **Équivalence de bras** : sous traitement identique, les distributions doivent coïncider (test placebo/A-A).

**Procédure d'arrêt de diffusion** (pré-enregistrée, sans présumer un effet négatif) :
- Critères d'arrêt **symétriques** : arrêt si borne inférieure de l'IC de l'effet < seuil de non-infériorité **ou** si borne supérieure < seuil de supériorité (arrêt pour futilité).
- **Ne pas** conclure que le vrai effet est négatif : un arrêt pour futilité signifie seulement que la supériorité n'est pas démontrée dans les limites de puissance fixées.
- Journalisation immuable des décisions ; réexamen périodique ; aucune extrapolation au-delà des composantes étudiées.

---

## Réponse à la question de la variante

> **Peut-on annoncer une supériorité du nouvel algorithme ?**

**Non.** Le nouveau protocole corrige les défauts démontrables du dossier de base (isolation des composantes, séparation des facteurs, mesure autorisée), mais **aucun résultat n'est encore fourni**. Un protocole correct sans données ne produit **aucune estimation** : il établit seulement la **capacité de mesurer**, pas une mesure.

Trois raisons bornent la réponse :
1. **Absence de données** : sans résultats, il n'existe ni proportion, ni différence, ni intervalle — donc aucune base pour affirmer une supériorité.
2. **Distinction R07** : même avec des résultats, on obtiendrait un **estimateur aléatoire** sur les proportions réalisées, non une connaissance exacte de la population ni de l'effet individuel.
3. **Objet mesuré** : le protocole sépare algorithme, interface et cache ; une supériorité ne pourrait être attribuée à l'**algorithme seul** qu'après estimation de son effet principal et de l'interaction, ce qui exige des données.

**Formulation admissible aujourd'hui :** « Le dispositif permet désormais de mesurer séparément l'effet de l'algorithme, de l'interface et du cache, et leurs interactions. Aucune supériorité n'est établie tant que les résultats de cet essai ne sont pas disponibles et analysés selon le plan pré-enregistré. »

Toute annonce de supériorité en l'état serait une **conclusion non soutenue par les données** — exactement l'erreur que la contre-expertise doit interdire.
# RÉPONSE FINALE — Résultats exacts, certificats, pièges et limites

## 1. Résultats exacts (certifiés)

**Q1 — Caractéristiques admissibles à p=20.**
Filtre correct = double condition `known_from ≤ p` **et** `valid_from ≤ p ≤ valid_to`.
- Admissibles : **{OPEN, RAIN}** — OPEN (V=5, K=8, fin K=30), RAIN (V=18, K=19).
- Exclues : **APPROVED** (connue à K=30 > 20 → fuite temporelle) et **Y** (événement 40, apprise 41 → fuite de cible).
- Le filtre actuel `valid_from <= 20` sur la version courante est **incorrect** : il retient APPROVED à tort.

**Q2 — Composantes et séparation.**
- Composantes : **C₁={A1,A2,A3}**, **C₂={B1,B2,C1}**, **C₃={D1}**.
- Séparation sans fuite : apprentissage = C₁∪C₃ = {A1,A2,A3,D1} ; test = C₂ = {B1,B2,C1}.
- La séparation de l'équipe (A1 app / A2,A3 test ; B1 app / B2,C1 test) **coupe des composantes** → fuite interdite par R03.

**Q3 — Bornes exactes.**
- p_N ∈ **[0,30 ; 0,90]** ; p_A ∈ **[0,10 ; 0,70]** ; D = p_N − p_A ∈ **[−0,40 ; +0,80]**.
- Complétion A : D = **−0,40** (p_N=0,30 ; p_A=0,70). Complétion B : D = **+0,80** (p_N=0,90 ; p_A=0,10).
- L'intervalle contient 0 → **signe indéterminé**.

**Q4 — Objet randomisé.** Unité = **le compte** (100/100). Traitement = **paquet groupé** {algorithme + interface + cache}. Algorithme seul **non identifiable** (confusion + interférence P04).

**Q5 — Protocole.** Randomisation par **composante**, cache partitionné, plan factoriel 2×2×2, mesure autorisée pour tous, versionnage immuable, puissance sur composantes.

**Q6 — Métamorphique/arrêt.** Invariants de permutation, renommage, monotonie temporelle, cohérence de cache, placebo A-A ; arrêt symétrique pré-enregistré, sans conclure à un effet négatif.

**Variante — Réponse : NON.** Protocole correct **sans données** ⇒ aucune estimation ; seule la **capacité de mesurer** est établie.

## 2. Certificats (registre)

| # | Affirmation | Méthode | Preuve |
|---|---|---|---|
| 1 | Composantes {A1,A2,A3},{B1,B2,C1},{D1} | union-find sur P02 | compute |
| 2 | p_N∈[0,30;0,90], p_A∈[0,10;0,70], D∈[−0,40;0,80] | complétion extrémale des 60 manquants | compute |
| 3 | Complétions opposées D=−0,40 et D=+0,80 | deux complétions | compute |
| 4 | Admissibles p=20 = {OPEN,RAIN} | filtre temporel double | compute |
| 5 | Unité=compte ; traitement=paquet 3 facteurs | analyse randomisation/interférence | P04,R04,R07 |
| 6 | Supériorité non annonçable | capacité de mesure ≠ mesure | variante,R07 |

Audit : **6/6 affirmations avec méthode ET preuve**, aucune contradiction, aucune exigence non couverte.

## 3. Pièges du dossier (à ne pas commettre)

1. **Fuite temporelle** : prendre la version courante (APPROVED) au lieu de la version connue à p.
2. **Fuite de cible** : introduire Y dans les caractéristiques qu'elle évalue.
3. **Fuite par identité liée** : croire qu'une séparation par ligne/compte suffit alors que les composantes traversent (R03).
4. **Biais de journal** : lire le dashboard (75 % vs 25 %) comme un effet, alors que le journal dépend de l'activation (R05).
5. **Confusion des facteurs** : attribuer au seul algorithme un paquet de trois changements (R04).
6. **Interférence ignorée** : supposer SUTVA alors que le cache partagé (P04) la viole.
7. **Estimateur ≠ vérité** : transformer une borne sur proportions réalisées en effet individuel (R07).
8. **Piège de la variante** : confondre « protocole correct » et « résultat obtenu ».

## 4. Limites

- Les bornes Q3 sont **exactes mais larges** : elles reflètent l'ignorance totale sur les 60 manquants, non une imprécision de calcul.
- La séparation par composantes garantit l'absence de fuite **entre ensembles**, pas la **généralisation** à des composantes nouvelles.
- Le nouveau protocole rend la question **répondable** ; il ne fournit **aucune** estimation tant que les résultats manquent.
- Aucune conclusion sur l'**effet individuel** ni sur la **population** n'est accessible, même avec des résultats, sans hypothèses supplémentaires explicites.

## 5. Conclusion

La contre-expertise établit des **erreurs démontrables** (filtre temporel, séparation coupant les composantes, journal non aléatoire, facteurs confondus, interférence par cache) **sans inventer le vrai effet**. Dans la variante, le dispositif est désormais correct mais **vide de résultats** : **on ne peut pas annoncer une supériorité du nouvel algorithme.** La seule affirmation soutenable est que le système est *capable* de la mesurer — la mesure reste à produire et à analyser selon le plan pré-enregistré.