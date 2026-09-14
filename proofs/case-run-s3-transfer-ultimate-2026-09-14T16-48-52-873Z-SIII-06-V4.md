# SIII-06-V4 — SIII-06 → Un nouvel essai bien conçu

Score: 100.0 % (certificats 0/0, juge 100/100)

Certificats manqués: aucun

Tous les certificats sont en place. Je rédige la réponse finale.

## Réponse

**Question de la variante : « Peut-on annoncer une supériorité du nouvel algorithme ? »**

**Non.** Un protocole correct — composantes isolées, facteurs séparés, issues autorisées mesurées — est une **condition nécessaire** de l'inférence causale, mais **pas une preuve**. La variante précise explicitement qu'**aucun résultat de cet essai n'est encore fourni**. Sans données, il n'existe :

- aucune estimation ponctuelle de l'effet,
- aucun intervalle de confiance,
- aucune statistique de test, donc aucune p-valeur,
- aucune base pour un ordre de grandeur, même qualitatif.

Annoncer une supériorité reviendrait à transformer la **validité du design** en **connaissance du résultat**. C'est exactement le sophisme que le dossier de base dénonce (P05) : confondre un dispositif et une conclusion. La réponse est donc un **non catégorique**, et non un « non faute de puissance » : il n'y a rien à tester.

**Ce que la variante change par rapport au dossier de base.** Les conclusions numériques de Q3 (essai **existant**, P03) restent valables et sont rappelées ci-dessous ; elles ne concernent **pas** le nouvel essai. Le nouveau protocole ne fournit aucune quantité nouvelle. Les autres contraintes (R01–R07, P01–P06) sont conservées.

**Résultats exacts disponibles (essai existant, seuls chiffres du dossier) :**

| Quantité | Borne inférieure | Borne supérieure |
|---|---|---|
| p_N (nouveau) | 3/10 | 9/10 |
| p_A (ancien) | 1/10 | 7/10 |
| p_N − p_A | −2/5 | +4/5 |

Dashboard (observé seul) : p_N = 3/4, p_A = 1/4, écart affiché = **+1/2** — non identifiable.

## Preuves et certificats

**Q3 — Bornes exactes (Fréchet sur comptages partiels).** Chaque groupe a n = 100 ; 40 issues observées, 60 inconnues binaires. Le nombre de succès du groupe nouveau est compris entre 30 et 30+60 = 90, d'où p_N ∈ [30/100, 90/100] = [3/10, 9/10]. Idem p_A ∈ [10/100, 70/100] = [1/10, 7/10]. La différence est minimale quand p_N est minimal et p_A maximal : 3/10 − 7/10 = **−2/5** ; maximale quand p_N est maximal et p_A minimal : 9/10 − 1/10 = **+4/5**. Bornes atteignables, donc exactes (pas d'approximation).

**Deux complétions à signes opposés (témoins aux extrêmes) :**
- Complétion 1 : nouveau 30 succès (0 des 60 manquants), ancien 70 succès (40 des 60) → p_N = 3/10, p_A = 7/10, **diff = −2/5** (nouveau inférieur).
- Complétion 2 : nouveau 90 succès (60 des 60), ancien 10 succès (0 des 60) → p_N = 9/10, p_A = 1/10, **diff = +4/5** (nouveau supérieur).

Les deux complétions respectent R05 (tailles garanties, répartition libre). Le signe de l'écart est donc **entièrement indéterminé** par les données observées.

**Q2 — Composantes (Union-Find).** Arêtes A1-A2, A2-A3, B1-B2, B2-C1 ; D1 isolé. Composantes : **{A1,A2,A3}**, **{B1,B2,C1}**, **{D1}**. L'affectation de l'équipe (apprentissage {A1,B1,D1}, test {A2,A3,B2,C1}) **fait fuiter deux composantes entières** : {A1,A2,A3} (A1 en app, A2/A3 en test) et {B1,B2,C1} (B1 en app, B2/C1 en test). Séparation sans fuite au sens de R03 : affecter **des composantes entières** — par ex. app = {A1,A2,A3, D1}, test = {B1,B2,C1} (ou l'inverse). Cela garantit l'absence de fuite d'information par arête ; cela **ne garantit pas** la généralisation à des composantes non vues (pas d'échangeabilité entre composantes, pas de couverture de la population).

**Q4 — Objet randomisé (R04).** L'unité randomisée est le **compte** (100 vs 100). Le traitement est un **bundle** : {nouvel algorithme + nouvelle langue + nouvelle stratégie de cache}. L'effet identifié est celui du bundle (intention-to-treat), **pas** celui de l'algorithme seul. De plus, des composantes de R03 traversent les groupes et le cache partagé (P04) crée une interférence : l'effet « algorithme isolé » est **non identifiable** avec ce dossier.

## Pièges traités

- **Snapshot vs sérialisabilité (R01/P01).** À p = 20, l'extraction ne filtre que `valid_from <= 20` sur la version courante : elle retient OPEN (V=5) mais **manque** la correction APPROVED (V=15, connue à K=30) et **inclut à tort** RAIN (valide depuis 18, connue depuis 19 — ici admissible car connue ≤ 20). Jointure temporelle correcte : filtrer sur `valid_from <= p` **ET** `known_from <= p`, en conservant les versions historiques (bitemporel). Le succès final (événement à 40, appris à 41) est **indisponible** à p = 20.
- **Étiquette vs caractéristique (R02).** Y peut entraîner/mesurer sur une période antérieure, mais ne peut jamais entrer dans les caractéristiques de la prédiction qu'il évalue ; toute transformation apprise sur étiquettes doit être ajustée sur l'apprentissage seul.
- **Tous les témoins, pas seulement les cycles courts.** Les deux complétions extrêmes couvrent tout l'espace admissible ; aucune hypothèse de « cycle court » n'est utilisée.
- **Effet externe irréversible.** Un rollback ne restaure pas un conseil déjà servi via le cache partagé (P04) : l'exposition réelle n'est pas reconstituable.
- **Ne pas confondre exactly-once, fencing, idempotence, autorisation.** Le cache sans variante dans la clé (P04) n'est ni fencé ni idempotent par variante : il mélange les traitements.
- **Design ≠ résultat (cœur de la variante).** Un protocole valide ne prouve rien sans données ; c'est le piège central ici.

## Limites / impossibilités

1. **Aucune supériorité annonçable** : sans résultats du nouvel essai, l'effet est inconnu — ni positif, ni négatif, ni nul ne peut être affirmé.
2. **Effet de l'algorithme seul non identifiable** dans l'essai existant (bundle + interférence de cache + composantes traversantes).
3. **Signe de l'écart indéterminé** : [−2/5, +4/5] contient 0 ; le dashboard (+1/2) est un artefact de sélection du journal (R05), non un effet.
4. **Les anciens résultats manquants ne deviennent pas connus** par reconfiguration (P06) : seule une nouvelle collecte autorisée (R06) les produirait.
5. **Limites statistiques du futur essai** : la puissance dépendra de la taille des composantes, de la variance inter-composantes et du nombre de facteurs ; un design correct ne garantit ni significativité ni généralisation hors échantillon.

**Conclusion.** La variante ne modifie pas la réponse de fond : **on ne peut pas annoncer une supériorité du nouvel algorithme**. Le nouveau protocole rend l'annonce *possible à terme* (il lève les confusions), mais tant qu'aucun résultat n'est fourni, la seule affirmation correcte est : **« l'effet reste à mesurer »**.