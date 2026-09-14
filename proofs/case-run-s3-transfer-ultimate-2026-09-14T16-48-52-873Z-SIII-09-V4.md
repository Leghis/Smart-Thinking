# SIII-09-V4 — SIII-09 → Deux pannes physiques simultanées

Score: 100.0 % (certificats 0/0, juge 100/100)

Certificats manqués: aucun

Tous les certificats sont en place. Rédigeons la réponse finale.

## Réponse

**Question de la variante : la garantie de disponibilité reste-t-elle démontrée si l'on exige la survie à la perte simultanée de deux des trois domaines votants, quorum inchangé à 2, sans ajouter de sites ?**

**Non. La garantie de disponibilité est réfutée.** Elle ne peut pas être démontrée dans ces conditions : c'est une impossibilité structurelle, pas un défaut de configuration.

Résultats exacts :

| Quantité | Valeur |
|---|---|
| Réplicas survivants après perte de 2 domaines (placement 1/domaine) | **1** |
| Quorum requis | **2** |
| Verdict disponibilité | **1 < 2 → indisponible** |
| Réplicas nécessaires pour tenir (N−k·⌈N/d⌉ ≥ q) | **N ≥ 6** |
| Sûreté (safety) | **préservée** |

Contre-exemple explicite (témoin) : placement corrigé n1∈A, n2∈B, n3∈C. Perte simultanée de A et B → seul n3 survit → 1 réplica < quorum 2 → ni lecture ni écriture protégée. Idem pour (A,C) et (B,C).

## Preuves et certificats

**Théorème de comptage (certificat de la variante).** Pour N réplicas, quorum q, répartis sur d domaines, survivre à *toute* perte de k domaines exige que le minimum de survivants ≥ q. Le pire cas place les k domaines perdus sur les domaines les plus chargés ; avec un placement équilibré (⌈N/d⌉ par domaine) :

$$N - k\cdot\lceil N/d\rceil \ge q.$$

Application : N=3, q=2, k=2, d=3 → 3 − 2·1 = **1 < 2**. Échec. Énumération exhaustive des C(3,2)=3 paires confirme : survivants = 1 pour (A,B), (A,C), (B,C), `quorum_ok=false` dans les trois cas.

**Borne de faisabilité.** En balayant N : N=3→1, N=4→0, N=5→1, **N=6→2 (OK)**, N=7→1, N=8→2, N=9→3. Le premier N viable est **6 réplicas** (2 par domaine sur 3 domaines). La variante interdit à la fois d'ajouter des sites et de changer le quorum : les deux seules échappatoires sont fermées, donc la garantie est **impossible**, pas seulement non atteinte.

**Sûreté vs disponibilité (distinction décisive).** La sûreté tient : R02 impose qu'on n'écrive jamais sans quorum, et deux quorums majoritaires (2/3) s'intersectent toujours — aucune écriture validée n'est perdue, aucun client n'écrit sur une copie minoritaire. C'est uniquement la **liveness** qui casse : sous perte de 2 domaines, le service refuse/diffère au lieu de servir. R01 exige lecture **et** réservation : l'exigence n'est pas satisfaite.

**Rappel du dossier de base (conservé, non modifié par la variante).**

- **Q1 — coupes minimales initiales : {N}, {K}, {V}, {A}.** Le chemin exige N (routage), K (accès/vérification), V (génération principale) et un quorum 2/3. Initialement n1,n2∈A, n3∈B : la perte de **A** suffit (2 réplicas perdus → quorum cassé). B seul n'est **pas** une coupe (reste n1,n2). Trois réplicas et plusieurs régions ne suffisent pas car la redondance est **corrélée** (n1,n2 partagent le domaine A) et parce que N, K, V sont des **racines logiques uniques** que la réplication ne duplique pas.
- **Q2 — chemin corrigé :** F-placement (1 réplica/domaine) + F-entrée (point d'entrée alternatif sans N) + F-clés (clés locales, identités déjà enregistrées validées sans K, révocations lues dans le quorum) + F-version (G-safe indépendante de V). Sûreté : quorum intersectant, jamais d'écriture minoritaire. Disponibilité conditionnelle : chaque panne **unique** de R05 (un domaine, N, K ou V) laisse ≥2 réplicas et un chemin complet.
- **Q3 — nécessité des 4 familles :** chacune élimine une coupe singleton distincte ({A}→F-placement, {N}→F-entrée, {K}→F-clés, {V}→F-version). Ce sont des certificats de **nécessité locale** (retirer une famille réintroduit sa coupe), **pas** une preuve d'optimalité universelle du nombre de produits.
- **Q4 — P07 :** WAITLISTED écrit par G-new, lu par G-safe qui l'ignore et le voit FREE → **corruption sémantique** (violation R01 : interprétation exacte, pas un 200). Engagement requis : contrat de compatibilité **writers ↔ schéma ↔ lecteur de secours** — soit G-safe connaît WAITLISTED, soit le produit diffère WAITLISTED, soit on qualifie G-safe avant activation. Un état inconnu ne doit **jamais** être silencieusement dégradé.
- **Q5 — minimax carbone (recalculé) :**

| Charge | C | D |
|---|---|---|
| 50 | 38 500 | 36 000 |
| 200 | 136 000 | 141 000 |
| **Pire cas** | **136 000** | **141 000** |

Seuil d'égalité : 650n + 6000 = 700n + 1000 → **n = 100** (C = D = 71 000). **Choix minimax = C** (136 000 < 141 000). E est écarté (non admissible R01, P03) ; le seul classement par intensité (C=300 > D=100) désignerait D à tort, car il ignore consommation, transfert et coût fixe.

## Pièges traités

- **Adversaire choisit le scénario (pire cas) :** la variante est exactement un raisonnement minimax sur les pannes — on optimise la survie au pire cas (2 domaines perdus), pas la moyenne. Résultat : échec.
- **Déterminisme / énumération exhaustive :** les C(3,2)=3 paires de domaines sont énumérées ; aucune n'atteint le quorum.
- **Fractions/entiers exacts et optimalité :** seuil n=100 exact ; borne N≥6 prouvée par balayage exhaustif.
- **Budget et contraintes de domaine :** la variante interdit d'ajouter des sites et de changer le quorum — ces contraintes sont respectées et **c'est précisément ce qui rend la garantie impossible**.
- **Cohérence instantanée vs sérialisabilité :** la sûreté (ordre sérialisable via quorum intersectant) est préservée ; ne pas la confondre avec la disponibilité.
- **Effet irréversible :** une écriture validée reste durable (pas de rollback) ; le problème de la variante est l'**indisponibilité**, pas la perte.
- **P06 (test trompeur) :** couper un pod ≠ injecter une panne de domaine/N/K/V. Le test revendiqué n'a jamais injecté les événements collectifs — il ne prouve rien sur la variante.

## Limites / impossibilités

- **Impossibilité démontrée :** avec 3 réplicas, quorum 2, 3 domaines et sans nouveau site, la survie à 2 domaines perdus est **arithmétiquement impossible** (1 < 2). Aucune configuration ne peut la garantir.
- **Ce qui rétablirait la garantie (hors variante) :** N ≥ 6 réplicas (2/domaine), ou quorum abaissé à 1 (mais alors la sûreté tombe : plus d'intersection de quorums), ou ajout de domaines/sites. Les trois sont exclus par l'énoncé.
- **Aucune probabilité fournie :** on ne peut énoncer ni MTTR, ni taux de disponibilité chiffré, ni RTO/RPO — seulement des garanties **structurelles** (survie à une panne unique : oui ; à deux domaines : non).
- **Portée de la faute V :** limitée à la génération principale identifiée ; G-safe doit être qualifiée indépendamment (Q4), sinon la coupe {V} persiste.
- **Conclusion de la variante :** la garantie de disponibilité **ne reste pas démontrée** ; elle est réfutée par contre-exemple et par borne de comptage. La sûreté, elle, reste intacte.