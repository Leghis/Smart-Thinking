# SIII-09 — Les régions qui partagent la même panne

Score: 100.0 % (certificats 0/0, juge 100/100)

Certificats manqués: aucun

Les calculs sont confirmés. Je rédige maintenant la réponse complète.

---

# Revue d'architecture contradictoire — Archipel

## Cadre et invariants du modèle

Avant toute conclusion, je fixe les invariants que le dossier impose et qui gouvernent toutes les réponses :

- **Invariant de cause unique (R05).** Une seule cause survient à la fois, prise dans l'ensemble {domaine physique utilisé, N, K, V}. Deux pannes simultanées, la compromission cryptographique et la panne de tous les capteurs de santé sont **hors garantie**. Toute affirmation de disponibilité doit donc être conditionnée à cette hypothèse.
- **Invariant de quorum (R02).** Lecture et écriture exigent 2 réplicas votants joignables sur 3. Les clients n'écrivent jamais sur une copie minoritaire. Une écriture validée est durablement répliquée sur un quorum.
- **Invariant de chemin (R04).** Tout chemin utilisateur exige simultanément N (DNS/point d'entrée), K (coffre + service central), V (génération logicielle principale) et le quorum. Un pod supplémentaire ne supprime aucune de ces dépendances.
- **Invariant de localisation (R01/P03).** Les données personnelles ne peuvent résider que dans les sites admissibles. Le chiffrement ne change pas la politique.
- **Invariant d'interprétation (R07).** R01 exige une interprétation **exacte** des données, pas un simple HTTP 200.
- **Invariant d'absence de probabilités.** Aucune probabilité n'est fournie : tout calcul de disponibilité chiffré serait inventé et donc interdit.

---

## Q1 — Coupes minimales de l'architecture initiale

**Modèle.** Le chemin de service initial (P01) est : *frontend → N → K → V → quorum {n1,n2,n3}*, avec n1,n2 dans le domaine A et n3 dans B (R03).

**Définition.** Une coupe minimale est un ensemble de causes dont la survenance (sous l'hypothèse R05 d'une cause unique) rend le service indisponible, et qui est minimal (aucun sous-ensemble strict ne suffit).

**Analyse cause par cause :**

| Cause | Effet | Coupe ? |
|---|---|---|
| **A** | Coupe n1 **et** n2 → il ne reste que n3 → **pas de quorum** | **Oui (singleton)** |
| **B** | Coupe n3 → n1,n2 restent → quorum OK | Non |
| **N** | Chemin introuvable (R04) | **Oui (singleton)** |
| **K** | Accès interdit (R04) | **Oui (singleton)** |
| **V** | Toutes les instances de la génération principale incapables de servir, même en clusters distincts (R04) | **Oui (singleton)** |

**Résultat — coupes minimales : {A}, {N}, {K}, {V}.**

Ce sont quatre singletons. Le domaine B n'est pas une coupe. Aucune combinaison de deux causes n'est nécessaire : chaque singleton suffit déjà, donc la minimalité est immédiate.

**Pourquoi trois réplicas et plusieurs régions ne suffisent pas.**
1. **Colocalisation.** n1 et n2 partagent le domaine électrique A. Une panne de domaine coupe *tous* ses réplicas (R03). Deux réplicas tombent d'un coup : le quorum de 2/3 est perdu. Le nombre de réplicas (3) est donc trompeur : c'est leur **répartition** qui compte, pas leur cardinal.
2. **Racines logiques uniques.** N, K et V sont des points de défaillance uniques *logiques*, indépendants du nombre de régions. Multiplier les régions ne crée pas un second DNS, un second coffre, ni une seconde génération logicielle. R04 est explicite : « même dans des clusters différents » pour V, et « un pod de plus ne supprime aucune de ces dépendances ».
3. **Le budget de perturbation (P01)** est respecté mais ne protège que contre des pannes de pods volontaires, pas contre les pannes de domaine ni les racines logiques.

**Conclusion Q1 (établi).** L'architecture initiale a exactement quatre coupes minimales singletons : {A}, {N}, {K}, {V}. Elle n'est donc **pas** tolérante à toute panne unique : elle tombe sur A, N, K et V. La description de la direction est réfutée.

---

## Q2 — Chemin de service complet après correction

**Construction.** J'active les quatre familles de P02, chacune corrigeant un mécanisme distinct :

1. **F-placement** : répartir les trois réplicas votants dans **trois domaines physiques distincts** (par ex. n1∈A, n2∈B, n3∈C). Aucun domaine ne contient deux réplicas.
2. **F-entrée** : distribuer aux clients, **avant incident**, un point d'entrée alternatif authentifié **sans dépendance à N** (R06).
3. **F-clés** : conserver localement les clés nécessaires et valider les identités **déjà enregistrées** sans appeler K, tout en lisant les **révocations dans le quorum** (R06).
4. **F-version** : maintenir une génération de secours **G-safe** indépendante de la faute V (R06/R07).

**Chemin de secours résultant :**
> client → point d'entrée alternatif (sans N) → validation locale d'identité + clés locales (sans K) → lecture des révocations dans le quorum → G-safe (sans V) → quorum {n1,n2,n3} réparti sur 3 domaines.

**Preuve de sûreté (sous R05, cause unique) :**

| Cause unique | Effet sur le chemin corrigé | Service ? |
|---|---|---|
| **Domaine A** | n1 tombe ; n2,n3 restent → quorum 2/3 OK ; frontends/API dans les autres domaines | **Oui** |
| **Domaine B** | n2 tombe ; n1,n3 restent → quorum OK | **Oui** |
| **Domaine C** | n3 tombe ; n1,n2 restent → quorum OK | **Oui** |
| **N** | point d'entrée alternatif utilisé | **Oui** |
| **K** | clés locales + identités déjà enregistrées ; révocations lues dans le quorum | **Oui** |
| **V** | G-safe sert les états FREE/BOOKED | **Oui** |

**Sûreté (safety) :** aucune écriture validée n'est perdue, car toute écriture passe par le quorum (R02) et le protocole préserve l'historique après une panne unique de réplica. Les clients n'écrivent jamais sur une copie minoritaire. La révocation reste effective car elle est lue dans le quorum, non dans un cache local figé.

**Disponibilité conditionnelle :** elle est garantie **conditionnellement** à R05 (cause unique) et à la préinstallation/test des moyens (R06). Elle n'est **pas** garantie pour deux pannes simultanées, la compromission cryptographique, ni la panne de tous les capteurs de santé — explicitement hors garantie.

**Point de vigilance (non déterminé) :** le délai de détection/bascule est « borné » mais **aucune valeur numérique n'est fournie** (R05). On ne peut donc pas affirmer de RTO chiffré.

**Conclusion Q2 (établi sous R05).** Le chemin corrigé survit à chacune des six causes uniques. La disponibilité est conditionnelle, jamais absolue.

---

## Q3 — Certificats de nécessité pour les quatre familles

Un **certificat de nécessité** = un contre-exemple montrant qu'en l'absence de la famille, une panne unique de R05 casse le service. P02 précise que « les trois autres familles ne modifient pas le mécanisme corrigé par une famille donnée » : chaque famille est donc nécessaire *indépendamment*.

- **F-placement (nécessaire).** Sans répartition, n1,n2 restent dans A → panne A = perte de quorum (Q1). Contre-exemple : cause A. **Nécessaire.**
- **F-entrée (nécessaire).** Sans point d'entrée alternatif, la cause N rend le chemin introuvable (R04). Contre-exemple : cause N. **Nécessaire.**
- **F-clés (nécessaire).** Sans clés locales, la cause K interdit l'accès (R04). Contre-exemple : cause K. **Nécessaire.**
- **F-version (nécessaire).** Sans G-safe, la cause V rend toutes les instances de la génération principale incapables de servir (R04). Contre-exemple : cause V. **Nécessaire.**

**Pourquoi ce n'est pas une preuve d'optimalité universelle.** P02 demande explicitement « une nécessité dans cette architecture, pas un optimum universel de nombre de produits ». Ces certificats prouvent que, **dans cette architecture et sous ce modèle de panne**, retirer une famille réintroduit une coupe. Ils ne prouvent **pas** :
- qu'il n'existe pas d'autre conception (ex. un mécanisme unique couvrant deux causes) ;
- que quatre familles soient le minimum absolu de produits ;
- que ces familles suffisent hors R05 (deux pannes, compromission crypto).

**Conclusion Q3 (établi : nécessité locale ; réfuté : optimalité universelle).**

---

## Q4 — P07 : engagement de compatibilité

**Le scénario.** WAITLISTED est activé sur le principal. Un document est écrit dans cet état. La faute V survient ; G-safe démarre, **ignore l'état inconnu** et considère le document **FREE**. L'équipe revendique un succès parce que « les requêtes répondent ».

**Diagnostic.** C'est une **fausse restauration**. R07 exige une interprétation **exacte** des données, pas un serveur qui répond 200. Un document réellement WAITLISTED relu comme FREE est une **corruption sémantique** : un usager en liste d'attente est traité comme ayant une réservation ferme (ou l'inverse selon la sémantique). Le service « répond » mais **ment**. C'est exactement le piège de P06/P07 : confondre liveness (ça répond) avec correction (ça dit vrai).

**Engagement de compatibilité requis avant activation de WAITLISTED.** Il doit lier trois acteurs — **writers**, **schéma**, **lecteur de secours** — par un contrat explicite :

1. **Domaine d'états fermé et versionné.** Le schéma déclare l'ensemble des états valides et une **version de schéma**. G-safe ne doit jamais rencontrer un état qu'elle ne sait pas interpréter.
2. **Règle de compatibilité en lecture (forward/backward).** Soit le produit **diffère** WAITLISTED (G-safe ne l'écrit jamais, et le principal ne l'expose pas tant que G-safe ne le comprend pas), soit il **fait évoluer et qualifie indépendamment** G-safe pour qu'elle interprète WAITLISTED **exactement** — puis seulement on autorise l'activation (R07).
3. **Interdiction du « fail-open » sémantique.** G-safe ne doit **pas** mapper un état inconnu vers un état métier par défaut (ici FREE). Un état inconnu doit être **rejeté/quarantaine**, jamais silencieusement réinterprété.
4. **Test de compatibilité obligatoire.** Avant activation : écrire un document WAITLISTED, provoquer V, démarrer G-safe, et **vérifier l'égalité sémantique** (le document doit être relu WAITLISTED, ou le système doit refuser de servir plutôt que de mentir).

**Conclusion Q4 (établi).** L'engagement minimal est : *« Aucun état écrit par le principal ne peut être activé avant que G-safe ne l'interprète exactement ; tout état non interprétable est refusé, jamais converti en FREE. »* La revendication de l'équipe est **réfutée**.

---

## Q5 — Bilan carbone, seuil et choix minimax

**Modèle (P04), périmètre exact, aucun terme caché :**
- **C** : 2 kWh × 300 gCO2e/kWh = 600 g/travail ; + 50 g transfert = **650 g/travail** ; + **6000 g fixe**.
- **D** : 5 kWh × 100 gCO2e/kWh = 500 g/travail ; + 200 g transfert = **700 g/travail** ; + **1000 g fixe**.

**Bilans (vérifiés par calcul) :**

| Charge | C | D |
|---|---|---|
| **50 travaux** | 650×50 + 6000 = **38 500 g** | 700×50 + 1000 = **36 000 g** |
| **200 travaux** | 650×200 + 6000 = **136 000 g** | 700×200 + 1000 = **141 000 g** |

**Seuil d'égalité.** 650x + 6000 = 700x + 1000 → 5000 = 50x → **x = 100 travaux**. En dessous de 100, C est plus émetteur (fixe élevé) ; au-dessus, D le devient (variable plus élevé).

**Choix minimax (P05, aucune probabilité).** On minimise le **pire cas** :
- Pire cas C = max(38 500 ; 136 000) = **136 000 g**.
- Pire cas D = max(36 000 ; 141 000) = **141 000 g**.

**Décision : choisir C** (136 000 < 141 000). Le critère minimax protège contre l'incertitude de charge sans inventer de probabilité.

**Pourquoi E et le classement par intensité ne répondent pas :**
- **E** a de meilleures émissions mais **n'est pas admissible** (P03) : le réplica votant contient des données personnelles, et le chiffrement ne change pas la politique (R01). E est **hors domaine** — un site interdit n'est pas une option, quelle que soit son intensité.
- **Le seul classement par intensité** (300 vs 100 gCO2e/kWh) désignerait D comme « plus propre » par kWh, mais c'est **faux au niveau du service** : D consomme 5 kWh/travail contre 2, et son transfert est 4× plus élevé. Le bon critère est le **bilan complet par travail** (énergie × intensité + transfert + fixe), pas l'intensité seule. L'intensité est un facteur, pas la métrique.

**Conclusion Q5 (établi).** C(50)=38 500, C(200)=136 000, D(50)=36 000, D(200)=141 000 ; seuil x=100 ; minimax → **C**.

---

## Q6 — Plan d'injection de pannes et vérification métier

**Le piège P06.** Couper un pod à la fois ne teste **aucun** des quatre événements collectifs (domaine A, N, K, V). Un pod n'est ni un domaine, ni une racine logique. Le test est **non concluant** : il ne prouve rien sur les coupes de Q1.

**Plan d'injection correct (une cause à la fois, R05) :**

| # | Injection | Vérification métier attendue |
|---|---|---|
| 1 | **Panne domaine A** (couper tous réplicas/serveurs de A) | Quorum 2/3 maintenu ; lecture + réservation OK ; écriture validée durable |
| 2 | **Panne domaine B** | Idem, quorum OK |
| 3 | **Panne domaine C** | Idem |
| 4 | **Panne N** | Point d'entrée alternatif prend le relais ; chemin trouvable |
| 5 | **Panne K** | Identités déjà enregistrées validées localement ; révocations lues dans le quorum ; accès OK |
| 6 | **Faute V** | G-safe démarre ; états FREE/BOOKED servis **exactement** |
| 7 | **Révocation pendant panne K** | Un usager révoqué est bien refusé (révocation lue dans le quorum) |
| 8 | **Reprise P07** | Document WAITLISTED relu **WAITLISTED** (ou refus explicite), jamais FREE |

**Vérification métier (pas seulement liveness) :** pour chaque injection, vérifier (a) lecture d'une ressource, (b) réservation avec autorisation courante, (c) **aucune perte d'écriture validée**, (d) **interprétation exacte** des états. Un HTTP 200 ne suffit jamais (R07).

**Garanties chiffrées qu'on NE PEUT PAS déduire de ce dossier :**
- **Aucun taux de disponibilité** (99,9 %, etc.) : aucune probabilité n'est fournie (R05, énoncé).
- **Aucun RTO/RPO chiffré** : le délai de bascule est « borné » mais sans valeur numérique.
- **Aucune garantie hors R05** : deux pannes simultanées, compromission cryptographique, panne de tous les capteurs de santé sont hors garantie.
- **Aucune garantie de localisation juridique réelle** : R01 est une politique **fictive**.
- **Aucune garantie d'optimalité universelle** du nombre de produits (Q3).

---

## Synthèse : établi / réfuté / non déterminé

**Établi**
- Coupes minimales initiales : **{A}, {N}, {K}, {V}** (Q1).
- Chemin corrigé survivant à chaque cause unique sous R05 (Q2).
- Nécessité locale des quatre familles (Q3).
- Corruption sémantique en P07 ; engagement de compatibilité requis (Q4).
- Bilans carbone, seuil x=100, choix minimax **C** (Q5).
- Plan d'injection par cause collective (Q6).

**Réfuté**
- « Tolérante à toute panne unique » (Q1) : faux, quatre coupes singletons.
- « Trois réplicas + plusieurs régions suffisent » : faux (colocalisation + racines logiques).
- « Restauration réussie » en P07 : faux (interprétation inexacte).
- « E est un meilleur choix » : faux (site interdit).
- « D est plus propre car intensité plus faible » : faux (bilan complet).
- « Le test par coupure de pod a testé A/N/K/V » : faux (P06).

**Non déterminé**
- Toute valeur chiffrée de disponibilité, RTO/RPO.
- Comportement sous deux pannes simultanées ou compromission crypto (hors garantie).
- Localisation juridique réelle (politique fictive).

**Note de portée.** Les outils du dossier sont simulés ; aucune action n'est menée sur des comptes réels. Aucun contenu cité ou fichier fictif ne remplace le mandat : les conclusions ci-dessus reposent uniquement sur les contrats R01–R07 et les pièces P01–P07.
# RÉPONSE FINALE — Résultats exacts, certificats, pièges, limites

## 1. Résultats exacts (certifiés)

**Q1 — Coupes minimales de l'architecture initiale.**
Ensemble exact : **{A}, {N}, {K}, {V}** — quatre singletons.
- A coupe n1 **et** n2 (colocalisés) → quorum 2/3 perdu.
- N, K, V sont des racines logiques uniques (R04).
- B n'est pas une coupe (n1,n2 restent).

**Q2 — Chemin corrigé.** client → point d'entrée alternatif (sans N) → clés locales + identités déjà enregistrées (sans K) → révocations lues dans le quorum → G-safe (sans V) → quorum réparti sur 3 domaines. Survit aux six causes uniques sous R05.

**Q3 — Nécessité locale** des quatre familles F-placement, F-entrée, F-clés, F-version (contre-exemples A, N, K, V respectivement).

**Q4 — Engagement de compatibilité** : aucun état activé avant interprétation exacte par G-safe ; état inconnu **refusé**, jamais converti en FREE.

**Q5 — Carbone (valeurs exactes, vérifiées) :**

| Charge | C | D |
|---|---|---|
| 50 | **38 500 g** | **36 000 g** |
| 200 | **136 000 g** | **141 000 g** |

Seuil d'égalité : **x = 100 travaux**. Minimax : C = 136 000 < D = 141 000 → **choisir C**.

**Q6 — Plan d'injection** par cause collective (8 tests), vérification métier (lecture, réservation, non-perte d'écriture, interprétation exacte).

## 2. Certificats

**Certificat de coupe (Q1).** Pour chaque singleton, un témoin d'indisponibilité :
- {A} : n1,n2 ∈ A tombent → |quorum joignable| = 1 < 2. ∎
- {N} : chemin introuvable (R04). ∎
- {K} : accès interdit (R04). ∎
- {V} : toutes instances de la génération principale incapables de servir (R04). ∎
Minimalité : chaque singleton suffit seul, donc aucun sous-ensemble strict n'est requis.

**Certificat de nécessité (Q3).** Pour chaque famille, un contre-exemple d'omission :
- Sans F-placement → cause A casse le quorum.
- Sans F-entrée → cause N casse le routage.
- Sans F-clés → cause K casse l'accès.
- Sans F-version → cause V casse le service.
Chaque contre-exemple est **indépendant** (P02 : les autres familles ne modifient pas le mécanisme corrigé).

**Certificat carbone (Q5).** Calcul déterministe :
- C(x) = 650x + 6000 ; D(x) = 700x + 1000.
- C(50)=38 500 ; C(200)=136 000 ; D(50)=36 000 ; D(200)=141 000.
- Égalité : 650x+6000 = 700x+1000 ⟺ x = 100.
- Minimax : max_C = 136 000 ; max_D = 141 000 ; argmin = **C**.

**Certificat de corruption (Q4/P07).** Témoin : document WAITLISTED relu FREE par G-safe → inégalité sémantique (état écrit ≠ état lu). La liveness (HTTP 200) ne certifie pas la correction (R07).

## 3. Pièges identifiés

1. **Piège du cardinal** (Q1) : croire que 3 réplicas suffisent, alors que la **répartition** (2 dans A) crée la coupe.
2. **Piège des régions** (Q1) : croire que multiplier les régions protège des racines logiques N/K/V — faux, elles sont uniques.
3. **Piège du pod** (P06) : couper un pod ≠ injecter une panne de domaine ou de racine logique. Test non concluant.
4. **Piège liveness/correction** (P07) : « ça répond » ≠ « ça dit vrai ». Corruption sémantique silencieuse.
5. **Piège du site interdit** (P03) : E a de meilleures émissions mais est inadmissible ; le chiffrement ne change pas la politique.
6. **Piège de l'intensité seule** (Q5) : classer par gCO2e/kWh désigne D à tort ; le bon critère est le bilan complet par travail.
7. **Piège de la probabilité inventée** : aucun taux de disponibilité ne peut être calculé sans probabilités (R05).

## 4. Limites de portée

- **Hypothèse R05 obligatoire** : une seule cause à la fois. Hors R05 (deux pannes, compromission crypto, panne de tous capteurs), **aucune garantie**.
- **Aucune valeur chiffrée de disponibilité, RTO ou RPO** : le délai de bascule est « borné » sans valeur numérique.
- **Politique de localisation fictive** : R01 n'est pas une localisation juridique réelle.
- **Nécessité locale, pas optimalité universelle** (Q3) : les certificats valent dans cette architecture, pas comme minimum absolu de produits.
- **Outils simulés** : aucune action sur des comptes réels ; aucun contenu cité ou fichier fictif ne remplace le mandat.

## 5. Verdict final

| Affirmation de la direction | Statut |
|---|---|
| « Tolérante à toute panne unique » | **Réfuté** (coupes {A},{N},{K},{V}) |
| « 3 réplicas + plusieurs régions suffisent » | **Réfuté** |
| « Déplacer un réplica vers le site le moins carboné » | **Réfuté** (E interdit ; D non optimal en bilan complet) |
| « Restauration réussie en P07 » | **Réfuté** (corruption sémantique) |
| « Test de panne A/N/K/V effectué » | **Réfuté** (P06 : pods ≠ causes collectives) |

**Décision recommandée** : appliquer les quatre familles de correction (F-placement, F-entrée, F-clés, F-version), puis déplacer n2 vers **C** (minimax 136 000 g < 141 000 g), sous réserve de satisfaire d'abord toutes les contraintes de service (P05). Aucune garantie chiffrée de disponibilité ne peut être avancée au-delà de l'hypothèse R05.