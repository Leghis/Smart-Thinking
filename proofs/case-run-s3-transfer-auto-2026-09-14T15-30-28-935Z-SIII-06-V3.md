# SIII-06-V3 — SIII-06 → La correction était déjà connue

Score: 100.0 % (certificats 0/0, juge 100/100)

Certificats manqués: aucun

# Réponse à la variante

## Ce qui change, ce qui ne change pas

La variante ne modifie **qu'une seule hypothèse** de P01 : la correction **APPROVED** est désormais **connue à K=19** (au lieu de 30), et corrélativement la connaissance ancienne **OPEN** a une **fin de connaissance à 19** (au lieu de 30). La prédiction reste à **p=20**. Toutes les autres pièces (P02–P06, R01–R07) sont inchangées et restent valides.

## Question posée : quel statut est admissible à p=20 ?

**Réponse : APPROVED.**

### Justification (principe de jointure temporelle, R01)

Une caractéristique d'une prédiction à p ne peut dépendre que d'informations **connues au plus tard à p**, et son **intervalle de validité doit contenir p** si elle décrit un état courant. On applique donc trois conditions simultanées :

1. `known_from ≤ p` (l'information est connue à temps) ;
2. `valid_from ≤ p` (l'état a commencé avant p) ;
3. `known_to ≥ p` (la connaissance de cet état n'est pas déjà close à p).

Application à p=20 :

| Attribut | valid_from | known_from | known_to | Admissible à p=20 ? |
|---|---|---|---|---|
| OPEN | 5 | 8 | **19** | **Non** — connaissance close à 19 < 20 |
| APPROVED | 15 | **19** | — | **Oui** — connu à 19 ≤ 20, valide depuis 15 ≤ 20 |
| RAIN | 18 | 19 | — | Oui (inchangé) |
| Y (succès final) | événement 40 | 41 | — | Non — connu à 41 > 20 |

**Le statut admissible est donc APPROVED**, valable depuis V=15 et connu depuis K=19, ce qui contient bien p=20.

### Pourquoi le filtre naïf est trompeur

L'extraction actuelle ne filtre que `valid_from <= 20` sur la version courante des tables. Or **OPEN (valid_from=5) et APPROVED (valid_from=15) satisfont tous deux ce filtre** : le filtre naïf renvoie **deux lignes contradictoires** et laisse une ambiguïté sur l'état courant. C'est précisément l'erreur temporelle que R01 interdit. La jointure correcte doit ajouter la dimension **connaissance** (`known_from ≤ p`) et la **clôture** (`known_to ≥ p`), ce qui élimine OPEN (clos à 19) et ne retient qu'APPROVED.

### Point de vigilance (différence avec le dossier de base)

Dans le dossier de base (APPROVED connu à 30), à p=20 **ni OPEN ni APPROVED n'étaient admissibles comme état courant** : OPEN était encore ouvert (known_to=30 ≥ 20) mais APPROVED n'était pas encore connu (30 > 20). La variante **change la conclusion** : en ramenant la connaissance de la correction à 19, l'état courant admissible à p=20 devient **APPROVED**, et OPEN est rétroactivement clos à 19.

### Rappel R01 (événement appris après p)

Le succès final Y (événement à 40, appris à 41) reste **indisponible à p=20**, même s'il est déclaré rétroactivement valable avant p : il ne peut servir que d'**étiquette** (mesure/entraînement sur période antérieure), jamais de caractéristique de la prédiction qu'il évalue (R02). La variante ne touche pas ce point.

---

## Rappel des conclusions non affectées (dossier de base conservé)

Les autres résultats du dossier de base restent valides, la variante ne les modifiant pas :

- **Q2 — Composantes (P02)** : {A1,A2,A3}, {B1,B2,C1}, {D1}. Séparation sans fuite : mettre des **composantes entières** d'un même côté (ex. apprentissage = {A1,A2,A3} ∪ {D1}, test = {B1,B2,C1}). Cela garantit l'absence de fuite par arête, **pas** la généralisation à des comptes non reliés.
- **Q3 — Bornes exactes (P03)** : nouveau ∈ [30/100, 90/100], ancien ∈ [10/100, 70/100], différence ∈ [−40/100, +80/100]. Deux complétions opposées : (nouveau 30/100, ancien 70/100 → −0,40) et (nouveau 90/100, ancien 10/100 → +0,80).
- **Q4 — P05** : l'objet randomisé est le **compte** (100/100), mais le traitement est **groupé** (algorithme + langue + cache ensemble) ; l'effet de l'algorithme **seul** est inidentifiable.
- **Q5/Q6** : protocole factoriel (randomisation par composante, caches isolés, interface contrôlée, version immuable, mesure minimale autorisée) et tests métamorphiques + arrêt de diffusion prudent.

**Conclusion de la variante : le statut admissible à p=20 est APPROVED** (connu à 19, valide depuis 15), OPEN étant exclu car sa connaissance est close à 19.
# RÉPONSE FINALE — Contre-expertise « Boussole » (variante)

## 0. Cadre de la variante

**Hypothèse modifiée (unique)** : dans P01, la correction **APPROVED** est connue à **K=19** (au lieu de 30) ; la connaissance ancienne **OPEN** a une **fin de connaissance à 19** (au lieu de 30). La prédiction reste à **p=20**. Toutes les autres pièces (P02–P06, R01–R07) sont conservées à l'identique.

---

## Q1 — Caractéristiques admissibles à p=20 et jointure temporelle

**Principe de jointure temporelle correcte (R01)** — une caractéristique n'est admissible à p que si les trois conditions tiennent **simultanément** :

1. `known_from ≤ p` — l'information est connue à temps ;
2. `valid_from ≤ p` — l'état a commencé au plus tard à p ;
3. `known_to ≥ p` (ou `known_to` absent) — la connaissance de cet état n'est pas déjà close à p.

**Application à p=20 :**

| Attribut | valid_from | known_from | known_to | Admissible à p=20 ? |
|---|---|---|---|---|
| OPEN | 5 | 8 | **19** | **Non** — connaissance close à 19 < 20 |
| APPROVED | 15 | **19** | — | **Oui** — connu à 19 ≤ 20, valide depuis 15 ≤ 20 |
| RAIN | 18 | 19 | — | Oui |
| Y (succès final) | événement 40 | 41 | — | Non — connu à 41 > 20 |

**Statut admissible à p=20 : APPROVED** (valable depuis V=15, connu depuis K=19).

**Piège du filtre naïf** : `valid_from <= 20` sur la version courante renvoie **OPEN ET APPROVED** (5 ≤ 20 et 15 ≤ 20) → **deux états contradictoires**, ambiguïté interdite par R01. La jointure correcte ajoute la dimension *connaissance* et la *clôture*, éliminant OPEN (clos à 19) et ne retenant qu'APPROVED.

**Rôle différent du succès final Y (R02)** :
- **Comme étiquette** : Y (événement à 40, appris à 41) sert à *mesurer* ou *entraîner* un modèle sur une période antérieure — usage légitime.
- **Comme caractéristique** : Y ne peut **jamais** entrer dans les caractéristiques de la prédiction qu'il évalue (connu à 41 > p=20). Toute transformation apprise sur des étiquettes/statistiques privées doit être ajustée **sur l'apprentissage seulement**, puis appliquée au test.

---

## Q2 — Composantes du graphe et séparation sans fuite

**Arêtes (P02)** : A1-A2, A2-A3, B1-B2, B2-C1. D1 isolé.

**Composantes connexes** :
- **C₁ = {A1, A2, A3}**
- **C₂ = {B1, B2, C1}**
- **C₃ = {D1}**

**Séparation sans fuite (R03)** : affecter des **composantes entières** d'un même côté. Exemple valide :
- **Apprentissage** = C₁ ∪ C₃ = {A1, A2, A3, D1}
- **Test** = C₂ = {B1, B2, C1}

La séparation proposée par l'équipe (A1, B1, D1 en apprentissage ; A2, A3, B2, C1 en test) **coupe les arêtes A1-A2 et B1-B2** → **fuite** : A1 et A2 partagent de l'information, B1 et B2 aussi. Le fait de « n'avoir dupliqué aucun identifiant exact » est **non pertinent** : R03 interdit la séparation par ligne/identifiant, pas seulement la duplication.

**Ce que garantit** une séparation par composantes : l'absence de fuite d'information par arête entre apprentissage et test.
**Ce qu'elle ne garantit pas** : la **généralisation** à des comptes non reliés (C₃ isolé, ou population hors graphe). L'absence de fuite est une condition *nécessaire*, non *suffisante*, de validité externe.

---

## Q3 — Bornes exactes des proportions et de la différence

**Données (P03)** : nouveau = 30 succès / 40 observés ; ancien = 10 succès / 40 observés ; 60 issues inconnues par groupe (binaires, sans contrainte).

**Bornes par groupe** (succès réalisés / 100) :
- **Nouveau** : min = 30/100, max = (30+60)/100 = **90/100** → **[0,30 ; 0,90]**
- **Ancien** : min = 10/100, max = (10+60)/100 = **70/100** → **[0,10 ; 0,70]**

**Différence (nouveau − ancien)** : bornes par combinaison extrême indépendante :
- min = 30/100 − 70/100 = **−0,40**
- max = 90/100 − 10/100 = **+0,80**
- → **Δ ∈ [−0,40 ; +0,80]**

**Deux complétions à signes opposés** :
- **Δ négatif** : nouveau = 30/100, ancien = 70/100 → Δ = **−0,40**
- **Δ positif** : nouveau = 90/100, ancien = 10/100 → Δ = **+0,80**

Aucune approximation : les bornes sont **exactes** (arithmétique rationnelle). Le dashboard (taux sur lignes observées : 75 % vs 25 %) est **trompeur** car le journal n'est pas un échantillon aléatoire déclaré (R05).

---

## Q4 — Analyse de P05

**Objet randomisé** : le **compte** (100 assignés à Z=nouveau, 100 à Z=ancien) — R04.

**Traitement effectivement évalué** : un **traitement groupé** = {nouvel algorithme **+** nouvelle interface linguistique **+** nouvelle stratégie de cache}, changés **ensemble**. On ne peut donc attribuer l'écart à un seul composant.

**Interférences (R03/R04/P04)** : des composantes traversent les groupes ; A1 et A2 partagent le même cache (clé **sans** la variante expérimentale), donc un conseil servi à A1 peut dépendre du traitement antérieur de A2. **Aucune hypothèse d'absence d'interférence (SUTVA) n'est fournie.**

**Inférences impossibles avec ce dossier** :
- l'effet **causal de l'algorithme seul** ;
- l'effet de l'**interface** seule ou de la **langue** ;
- l'**interaction** algorithme × interface ;
- toute inférence **individuelle** (R07 : les bornes portent sur les proportions réalisées dans les groupes assignés, pas sur l'effet causal individuel).

**P05 est donc fausse** : « la randomisation corrige automatiquement la sélection du journal, les interférences, les erreurs temporelles et le changement de langue » — non. La randomisation ne corrige **ni** le biais de sélection du journal (R05), **ni** les interférences (R03/R04), **ni** les erreurs temporelles (R01), **ni** la confusion algorithme/langue/cache.

---

## Q5 — Nouveau protocole (distinguer algorithme, interface, interaction)

- **Unité de randomisation** : la **composante** de R03 (jamais le compte isolé), pour respecter l'absence d'interférence.
- **Cache** : **partitionné/isolé** par unité ; la **variante expérimentale entre dans la clé** du cache (P06).
- **Design factoriel** : algorithme (nouveau/ancien) × interface (nouvelle/ancienne), avec **langue contrôlée** (garder l'ancienne interface pour certains groupes) → identifie les effets principaux **et l'interaction**.
- **Mesure** : recueil du **résultat minimal autorisé** pour **tous** les participants (R06), après autorisation dédiée et information ; pas de reconstruction depuis données privées hors finalité.
- **Temporel** : version **immuable** du modèle publiée ; jointure temporelle correcte (known_from/valid_from/known_to) ; étiquettes Y hors caractéristiques.
- **Versionnage** : modèle, interface, cache versionnés et horodatés.
- **Limites statistiques** : puissance calculée sur le nombre de **composantes** (pas de comptes) ; intervalles de confiance ; pré-enregistrement de l'analyse ; les anciens résultats manquants **ne peuvent pas** être rendus connus par reconfiguration (P06).

---

## Q6 — Tests métamorphiques et arrêt de diffusion

**Tests métamorphiques** (invariance attendue) :
- **Invariance à la langue** : même algorithme, interface traduite → prédictions identiques.
- **Invariance au cache** : cache isolé vs partagé → pas de dépendance à l'ordre d'exposition.
- **Invariance temporelle** : rejouer la prédiction à p avec les seules informations connues à p → résultat stable (pas de fuite du futur).
- **Invariance à la permutation des comptes** : réordonner les comptes d'une composante → mêmes sorties.
- **Monotonie/robustesse** : petites perturbations des entrées → sorties bornées.

**Procédure d'arrêt de diffusion** : déclencher sur **signaux de sûreté** (fuite temporelle détectée, interférence avérée, dégradation sur composantes isolées), **sans prétendre que le vrai effet est nécessairement négatif**. L'arrêt est une mesure de **prudence** (incertitude non résolue), pas une conclusion causale. Reprise conditionnée à un essai conforme (Q5).

---

## Certificats et pièges

**Certificats** :
- Statut admissible à p=20 = **APPROVED** (jointure temporelle : known_from=19 ≤ 20, valid_from=15 ≤ 20 ; OPEN exclu car known_to=19 < 20). *Vérifié par calcul déterministe.*
- Composantes : {A1,A2,A3}, {B1,B2,C1}, {D1}. *Vérifié par parcours du graphe.*
- Bornes : nouveau [0,30 ; 0,90], ancien [0,10 ; 0,70], Δ ∈ [−0,40 ; +0,80]. *Arithmétique rationnelle exacte.*

**Pièges évités** :
1. Filtre naïf `valid_from <= 20` → ambiguïté OPEN/APPROVED.
2. Séparation par identifiant ≠ séparation sans fuite (R03).
3. Dashboard sur lignes observées ≠ proportion réalisée (R05).
4. Randomisation ≠ correction des interférences/sélection/temporalité (P05 fausse).
5. Bornes de groupe ≠ effet causal individuel ou de l'algorithme seul (R07).

**Limites** : les 60 issues manquantes par groupe restent **inconnues** (non reconstructibles) ; l'effet de l'algorithme seul est **inidentifiable** dans le dossier existant ; la variante ne modifie **que** le statut temporel, pas les conclusions Q2–Q6.