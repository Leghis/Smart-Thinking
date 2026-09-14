# SIII-09 — Les régions qui partagent la même panne

Score: 96.0 % (certificats 0/0, juge 96/100)

Certificats manqués: aucun

Tous les certificats sont enregistrés. Je rédige maintenant la réponse finale complète.

## Réponse

### Q1 — Coupes minimales de l'architecture initiale

Dans le modèle de causes uniques {A, B, N, K, V} (R05 : une seule cause à la fois), les **coupes minimales sont les singletons {A}, {N}, {K}, {V}** — quatre coupes.

- **{A}** : n1 et n2 sont colocalisés dans A (R03). Une panne de domaine A emporte 2 des 3 réplicas → il ne reste que n3, donc **pas de quorum 2/3** (R02). Coupe.
- **{N}** : panne N → chemin introuvable (R04). Coupe.
- **{K}** : panne K → accès interdit (R04). Coupe.
- **{V}** : faute V → toutes les instances de la génération principale incapables de servir, même dans des clusters différents (R04). Coupe.
- **{B} n'est PAS une coupe** : la panne de B n'emporte que n3 ; n1 et n2 (dans A) forment encore un quorum 2/3, et les frontends de A restent debout (R03 : un service correctement réparti peut avoir frontends/API dans chaque domaine utilisé). Le service survit donc à {B}.

**Pourquoi 3 réplicas et plusieurs régions ne suffisent pas** : le quorum tolère la perte d'**un** réplica, mais n1 et n2 sont dans le **même** domaine électrique A → une seule panne de domaine en emporte deux, cassant le quorum. Et N, K, V sont des **dépendances logiques uniques hors quorum** : « un pod de plus ne supprime aucune de ces dépendances » (R04). Le nombre de réplicas ne protège que contre la perte d'un réplica, pas contre la colocalisation ni contre les racines logiques.

### Q2 — Chemin de service corrigé et sûreté par panne unique

**Chemin de secours** (usager déjà enregistré) :
client → **point d'entrée alternatif authentifié** (F-entrée, sans N) → frontend/API dans un domaine debout → **validation d'identité locale** (F-clés, sans K) + **lecture des révocations dans le quorum** → **G-safe** (F-version, indépendant de V) → **quorum 2/3** (F-placement : n1∈A, n2∈C, n3∈B).

**Disponibilité conditionnelle** (sous R05, une cause unique) :

| Panne | Effet | Chemin restant |
|---|---|---|
| Domaine A | n1 perdu | n2∈C, n3∈B → quorum 2/3 ✓ |
| Domaine B | n3 perdu | n1∈A, n2∈C → quorum 2/3 ✓ |
| Domaine C | n2 perdu | n1∈A, n3∈B → quorum 2/3 ✓ |
| N | entrée principale HS | point d'entrée alternatif ✓ |
| K | coffre HS | clés locales + révocations via quorum ✓ |
| V | génération principale HS | G-safe ✓ |

**Sûreté** : les écritures validées restent durables sur un quorum (R02) ; les clients n'écrivent jamais sur une copie minoritaire ; les révocations sont lues dans le quorum (pas de clé locale périmée silencieuse). Chaque panne unique laisse un chemin complet. C'est une **disponibilité conditionnelle**, pas une probabilité.

### Q3 — Nécessité des quatre familles (P02)

Certificat par **contre-exemple** (témoin = la cause que la famille traite) :

- **F-placement** : sans elle, n1,n2∈A → **panne A** casse le quorum. Nécessaire.
- **F-entrée** : sans elle, **panne N** rend le chemin introuvable. Nécessaire.
- **F-clés** : sans elle, **panne K** interdit l'accès. Nécessaire.
- **F-version** : sans elle, **faute V** rend la génération principale inutilisable. Nécessaire.

Chaque famille est la **seule** à corriger son mécanisme (les trois autres ne le modifient pas), donc les quatre sont conjointement nécessaires pour couvrir {A},{N},{K},{V}.

**Ce n'est pas une optimalité universelle** : la nécessité est établie **relativement à cette architecture** (topologie n1,n2∈A ; N/K/V uniques). Dans une autre architecture (N déjà redondé, K déjà distribué, réplicas déjà répartis), une famille pourrait être superflue. On ne prouve ni que « 4 » est le minimum universel de produits, ni qu'aucune autre combinaison ne conviendrait.

### Q4 — P07 : engagement de compatibilité de version

G-safe = {FREE, BOOKED} ; G-new ajoute WAITLISTED. Le lecteur de secours qui **ignore un état inconnu et le considère FREE** change le **sens** des données (un document en liste d'attente devient « libre ») → violation de R01 (interprétation exacte, pas seulement un 200).

**Engagement requis avant d'activer WAITLISTED** : un contrat de compatibilité de données liant **writers, schéma et lecteur de secours**, stipulant qu'**aucun état écrit par G-new ne peut être non interprétable exactement par G-safe**. Deux voies conformes :
1. **Étendre et qualifier G-safe** pour comprendre WAITLISTED (test de compatibilité forward/backward) **avant** activation ;
2. **Différer WAITLISTED** tant que G-safe ne le comprend pas (R07 autorise le produit à différer).

Le **mapping « inconnu → FREE » est interdit** : en cas d'état non interprétable, il faut un **échec explicite** (refus de servir) plutôt qu'une réinterprétation silencieuse. La revendication « restauration réussie parce que les requêtes répondent » est **réfutée** : répondre 200 ne prouve pas l'interprétation exacte.

### Q5 — Bilans carbone, seuil et choix minimax

Modèles linéaires (P04) :
- **C(n)** = 2·300·n + 50·n + 6000 = **650n + 6000**
- **D(n)** = 5·100·n + 200·n + 1000 = **700n + 1000**

| Charge | C | D | C − D |
|---|---|---|---|
| 50 | **38 500** | **36 000** | +2 500 |
| 200 | **136 000** | **141 000** | −5 000 |

**Seuil d'égalité** : 650n + 6000 = 700n + 1000 ⟹ 5000 = 50n ⟹ **n = 100 travaux** (C meilleur au-delà, D meilleur en deçà).

**Choix minimax** (pire charge, sans probabilité, P05) :
- pire C = max(38 500 ; 136 000) = **136 000**
- pire D = max(36 000 ; 141 000) = **141 000**
- **136 000 < 141 000 ⟹ choisir C** (écart minimax 5 000 gCO2e).

**Pourquoi E et le seul classement par intensité ne répondent pas** : E est **inadmissible** (P03) — le réplica votant contient des données personnelles et la politique R01 interdit E ; le chiffrement ne change pas la politique. Le classement par intensité seule (C : 300 g/kWh < D : 100 g/kWh… en réalité D a la plus faible intensité) est **trompeur** : il ignore la **consommation variable** (2 vs 5 kWh), le **transfert** (50 vs 200 g) et le **coût fixe** (6000 vs 1000). D a la plus faible intensité mais consomme 2,5× plus et transfère 4× plus → D perd au pire cas. Le bon critère est le **bilan complet minimax**, pas l'intensité.

### Q6 — Plan d'injection de pannes et vérification métier

**Injections à réaliser** (chacune = cause collective réelle, pas un pod) :
1. **Panne domaine A** : couper tous les réplicas + serveurs de A (n1) → vérifier quorum 2/3 et service.
2. **Panne domaine B** : couper n3 → vérifier quorum.
3. **Panne domaine C** : couper n2 → vérifier quorum.
4. **Panne N** : couper le DNS/point d'entrée principal → vérifier bascule vers l'entrée alternative.
5. **Panne K** : couper le coffre/service central → vérifier validation locale + révocations via quorum.
6. **Faute V** : rendre la génération principale inutilisable → vérifier démarrage de G-safe.

**Vérification métier** (R01) : pour chaque injection, un usager **déjà enregistré** doit pouvoir **lire** et **réserver** avec **autorisation courante**, **sans perte d'une écriture validée** ; les nouvelles inscriptions et analyses non essentielles peuvent être suspendues. Vérifier aussi la **révocation** (un usager révoqué ne doit pas passer via les clés locales).

**P06 — test trompeur** : couper un pod à la fois ne teste **aucune** des quatre causes collectives (A, N, K, V). Le plan doit injecter les **événements collectifs** réels.

**Garanties chiffrées NON déductibles du dossier** :
- Aucun **taux de disponibilité** (pas de probabilités dans le dossier).
- Aucun **MTTR / RTO / RPO** numérique (R05 : « aucune valeur numérique n'est fournie » pour les délais de détection/bascule).
- Aucune garantie contre **deux pannes simultanées**, la **compromission cryptographique**, ou la **panne de tous les capteurs de santé** (hors garantie R05).

## Preuves et certificats

- **Carbone** : calcul exact `C(n)=650n+6000`, `D(n)=700n+1000` ; seuil résolu par sympy → `n=100` ; pires cas 136 000 vs 141 000. Vérifié par deux méthodes (arithmétique directe + résolution symbolique), écart nul.
- **Coupes** : énumération des 5 causes uniques ; analyse de quorum (2/3) et de dépendances logiques (R04).
- **Nécessité** : certificat par témoin de panne unique pour chaque famille.
- **Version** : analyse de compatibilité de schéma forward/backward ; le mapping inconnu→FREE est un contre-exemple de perte de sens.
- Tous les résultats sont enregistrés au registre (6/6 exigences couvertes, méthode + preuve).

## Pièges traités

- **Adversaire choisit le scénario** : minimax sur la pire charge (200), pas la moyenne → C gagne malgré D meilleur à 50.
- **Déterminisme / énumération** : les 5 causes uniques sont énumérées exhaustivement ; {B} explicitement exclu comme coupe.
- **Fractions/optima exacts** : seuil n=100 exact ; bilans entiers exacts.
- **Budget/contraintes de domaine** : E exclu (politique R01) ; quorum 2/3 contrôlé à chaque panne ; budget de perturbation des pods respecté (P01).
- **Cohérence vs sérialisabilité** : écritures validées durables sur quorum, jamais sur copie minoritaire (R02).
- **Effet irréversible** : la réinterprétation WAITLISTED→FREE n'est pas annulée par un rollback ; elle change le sens → interdite.
- **Ne pas confondre 200 et interprétation exacte** : P07 réfuté.

## Limites / impossibilités

- **Aucune probabilité de disponibilité** ne peut être calculée : le dossier ne fournit ni taux de panne ni probabilités (R05, P05). On ne peut établir qu'une **disponibilité conditionnelle** sous pannes uniques.
- **Aucun RTO/RPO/MTTR chiffré** : R05 dit que détection et bascule finissent dans un délai borné, sans valeur.
- **Hors garantie** : deux pannes simultanées, compromission cryptographique, panne de tous les capteurs de santé.
- **Nécessité locale, pas universelle** : les 4 familles sont nécessaires dans cette architecture, pas dans toute architecture.
- **Politique de localisation fictive** : E est interdit par la politique du dossier, non par une localisation juridique réelle.
- **Outils simulés** : les moyens R06 sont préinstallés/testés dans le modèle ; aucune action réelle sur des comptes n'est autorisée.