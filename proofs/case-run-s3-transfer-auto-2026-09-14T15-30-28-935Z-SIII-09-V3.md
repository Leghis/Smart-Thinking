# SIII-09-V3 — SIII-09 → Secours réellement compatible

Score: 81.0 % (certificats 0/0, juge 81/100)

Certificats manqués: aucun

J'ai tout ce qu'il faut. Voici la réponse complète, structurée question par question, en intégrant la variante (R07 modifié : G-safe comprend WAITLISTED avec transitions exactes et qualification indépendante fournie avant activation).

---

## Cadre de la variante

Une seule hypothèse est modifiée : **R07**. Dans le dossier de base, G-safe = {FREE, BOOKED} *exactement*, et G-new veut ajouter WAITLISTED. Dans la variante, **G-safe comprend WAITLISTED avec des transitions exactes**, et **sa qualification indépendante est fournie avant activation**. Toutes les autres contraintes (R01–R06, P01–P06) sont conservées. Je recalcule donc les conclusions affectées (Q4, et la branche F-version de Q2/Q3) et je conserve les autres.

---

## Q1 — Coupes minimales de l'architecture initiale

**Modèle de causes (R05) :** une seule cause parmi {A, B, N, K, V} survient à la fois.

**Chemin initial (P01) :** frontends A et B → N, K, génération principale (faute V), quorum {n1,n2,n3}. Placement (R03) : n1, n2 dans A ; n3 dans B. Quorum = 2 réplicas joignables (R02).

**Analyse cause par cause :**

| Cause | Effet | Service survit ? |
|---|---|---|
| **A** | coupe n1 et n2 → reste n3 seul → **pas de quorum** | **Non → coupe** |
| **B** | coupe n3 → reste n1, n2 → quorum OK ; N, K, V intacts | Oui → **pas une coupe** |
| **N** | chemin introuvable (R04) | **Non → coupe** |
| **K** | accès interdit (R04) | **Non → coupe** |
| **V** | génération principale incapable de servir, même en clusters différents (R04) | **Non → coupe** |

**Coupes minimales = {A}, {N}, {K}, {V}** (singletons). B n'en est pas une.

**Pourquoi trois réplicas et plusieurs régions ne suffisent pas :** le quorum protège contre la perte d'un réplica (et A est bien couvert par le placement, mais pas B). En revanche, **N, K et V sont des racines logiques uniques hors du quorum** : ce sont des dépendances *série* du chemin, pas des réplicas interchangeables. Un pod de plus ne supprime aucune de ces dépendances (R04). La redondance de données ne protège donc pas contre les coupes logiques : c'est le point que la direction confond avec la tolérance à toute panne unique.

---

## Q2 — Chemin de service complet après correction

**Chemin corrigé (familles F-placement + F-entrée + F-clés + F-version) :**

1. **Routage / entrée (F-entrée) :** point d'entrée alternatif authentifié, préinstallé, **sans dépendance à N** (R06). La panne N ne rend plus le chemin introuvable.
2. **Identité (F-clés) :** clés conservées localement ; validation des usagers **déjà enregistrés sans appeler K** ; les **révocations sont lues dans le quorum** (R06). La panne K n'interdit plus l'accès aux usagers enregistrés.
3. **Quorum (F-placement) :** un réplica dans chacun de trois domaines physiques distincts (A, B, C ou D). Toute panne d'un domaine laisse 2 réplicas joignables → quorum maintenu.
4. **Version (F-version) :** génération de secours G-safe **indépendante de V**, préinstallée et testée (R06). La faute V ne bloque plus le service.
5. **Opérations protégées :** le quorum reste requis (R06) ; les clients n'écrivent jamais sur une copie minoritaire (R02).

**Sûreté (invariants) :**
- *Pas de perte d'écriture validée :* chaque écriture validée est durablement répliquée sur un quorum (R02) ; le protocole préserve l'historique après une panne unique de réplica.
- *Pas d'écriture minoritaire :* les clients n'écrivent jamais sur une copie minoritaire (R02).
- *Autorisation courante :* révocations lues dans le quorum → une révocation reste effective même si K est indisponible.
- *Interprétation exacte :* G-safe interprète exactement les états (R01), condition renforcée par la variante.

**Disponibilité conditionnelle pour chaque panne unique de R05 :**

| Panne | Chemin de secours | Service ? |
|---|---|---|
| **A** | réplicas en B, C/D → quorum ; entrée alt. ; clés locales ; G-safe | **Oui** |
| **B** | réplicas en A, C/D → quorum ; reste intact | **Oui** |
| **N** | entrée alternative sans N | **Oui** |
| **K** | clés locales + révocations via quorum | **Oui** |
| **V** | G-safe indépendant de V | **Oui** |

Chaque panne unique est couverte par **exactement une famille** (P02 : les trois autres familles ne modifient pas le mécanisme corrigé par une famille donnée). La disponibilité est **conditionnelle** : elle suppose R05 (une seule cause, horloges dans les bornes, détection/bascule bornées) et **exclut** compromission cryptographique, pannes simultanées et panne de tous les capteurs de santé.

---

## Q3 — Certificats de nécessité des quatre familles

Un **certificat de nécessité** = montrer que sans la famille, une panne unique de R05 casse le service.

- **F-placement** — *nécessaire* : sans réplica dans trois domaines, la panne du domaine hébergeant deux réplicas (A initialement) laisse un seul réplica → pas de quorum. Témoin : panne A.
- **F-entrée** — *nécessaire* : sans entrée alternative, la panne N rend le chemin introuvable (R04). Témoin : panne N.
- **F-clés** — *nécessaire* : sans clés locales, la panne K interdit l'accès (R04). Témoin : panne K.
- **F-version** — *nécessaire* : sans génération de secours indépendante de V, la faute V rend toutes les instances de la génération principale incapables de servir (R04). Témoin : faute V.

**Pourquoi ce n'est pas une preuve d'optimalité universelle :** chaque certificat est un **témoin de nécessité dans *cette* architecture** (P02 le précise explicitement : « on demande une nécessité dans cette architecture, pas un optimum universel de nombre de produits »). Une autre architecture pourrait couvrir la même panne par un mécanisme différent (par ex. un quorum à 5 réplicas, ou un cache d'identité distribué autrement). Le certificat prouve qu'*ici*, retirer la famille casse le service — pas qu'aucune autre conception ne pourrait faire mieux.

---

## Q4 — Traitement de P07 et engagement de compatibilité (variante)

**Ce que montrait P07 (dossier de base) :** WAITLISTED activé sur le principal ; un document écrit dans cet état ; faute V ; G-safe démarre, **ignore l'état inconnu et considère le document FREE**. L'équipe revendique un succès parce que « les requêtes répondent ». C'est faux : R01 exige une **interprétation exacte**, pas un serveur qui répond 200. Relire WAITLISTED comme FREE **corrompt une écriture validée** → violation de R01.

**Diagnostic clé :** le défaut n'était **pas la présence de WAITLISTED**, mais **l'incompatibilité de traitement** — G-safe ne connaissait pas l'état et le dégradait silencieusement.

**Dans la variante :** G-safe **comprend WAITLISTED avec des transitions exactes**, et sa **qualification indépendante est fournie avant activation**. Cela satisfait exactement l'exigence de R07 (« faire évoluer et qualifier indépendamment la génération de secours avant de l'autoriser »).

**Engagement de compatibilité requis (writers ↔ schéma ↔ lecteur de secours) :**
1. **Contrat de schéma versionné :** tout état écrit par G-new doit être *connu* de G-safe, avec sémantique identique.
2. **Transitions exactes et complètes :** toutes les transitions entrantes/sortantes de WAITLISTED (FREE↔WAITLISTED, BOOKED↔WAITLISTED, etc.) définies, y compris l'idempotence et les cas limites.
3. **Pas de dégradation silencieuse :** un état inconnu doit être **rejeté explicitement**, jamais relu comme un autre état.
4. **Qualification indépendante *avant* activation :** tests de compatibilité exécutés et validés avant que WAITLISTED ne soit activé sur le principal.
5. **Indépendance vis-à-vis de V :** G-safe ne doit pas dépendre de la génération principale (R07 : la faute V est limitée à la génération principale identifiée).

**Réponse directe à la question de la variante :**

> **Non, la seule présence de WAITLISTED n'interdit pas la bascule.**

Trois arguments :
- **WAITLISTED n'est pas une cause de panne** dans le modèle R05 (vérifié : ce n'est ni A, B, N, K ni V). Il n'apparaît donc dans **aucune coupe minimale** et n'ajoute aucune condition d'indisponibilité.
- Ce qui interdisait la bascule dans le dossier de base était **l'incompatibilité sémantique** (relecture FREE), pas l'existence de l'état. La variante lève précisément cette incompatibilité.
- La **qualification indépendante fournie avant activation** satisfait la condition R07 ; la bascule devient donc **autorisée du point de vue de la version**.

**Nuances :** la présence de WAITLISTED est **neutre** — ni nécessaire ni suffisante. La bascule reste conditionnée aux **trois autres familles** (placement, entrée, clés) et au **quorum** (R06). Et la compatibilité n'est acquise que si les « transitions exactes » sont **complètes** : une transition manquante rouvrirait la faille de P07.

---

## Q5 — Bilans carbone, seuil et choix minimax

**Formule :** bilan(n) = kWh × intensité × n + transfert × n + fixe.

- **C :** 2 kWh, 300 g/kWh, 50 g/travail, 6000 g fixe → 600n + 50n + 6000 = **650n + 6000**
- **D :** 5 kWh, 100 g/kWh, 200 g/travail, 1000 g fixe → 500n + 200n + 1000 = **700n + 1000**

| Charge | C | D |
|---|---|---|
| **50** | 650·50 + 6000 = **38 500** | 700·50 + 1000 = **36 000** |
| **200** | 650·200 + 6000 = **136 000** | 700·200 + 1000 = **141 000** |

**Seuil d'égalité :** 650n + 6000 = 700n + 1000 → 5000 = 50n → **n = 100**. En dessous de 100 travaux, D est meilleur ; au-dessus, C est meilleur.

**Choix minimax (pire cas, sans probabilité — P05) :**
- Pire cas C = max(38 500 ; 136 000) = **136 000**
- Pire cas D = max(36 000 ; 141 000) = **141 000**
- **136 000 < 141 000 → choisir C.**

**Pourquoi E et le classement par intensité ne répondent pas :**
- **E** a de meilleures émissions que C et D, mais **n'est pas admissible** pour le stockage personnel (R01, P03) : le réplica votant contient ces données, et le chiffrement ne change pas la politique de localisation. E est donc **hors domaine** — un meilleur chiffre ne rend pas un site éligible.
- **Le seul classement par intensité électrique** (300 vs 100 g/kWh) désignerait D, mais il **ignore** la consommation par travail (2 vs 5 kWh), le transfert (50 vs 200 g) et le coût fixe (6000 vs 1000). Le bilan complet **inverse** le classement selon la charge : D gagne à 50 travaux, C gagne à 200. Le critère pertinent est le **pire cas du bilan complet**, pas l'intensité seule.

---

## Q6 — Plan d'injection de pannes et limites

**P06 (test trompeur) :** couper un pod à la fois ne teste **aucun** des quatre événements collectifs (panne de domaine A, N, K, V). Il faut injecter les **causes réelles** de R05.

**Plan d'injection (une cause à la fois, R05) :**

| Injection | Vérification métier |
|---|---|
| **Panne domaine A** | quorum maintenu (réplicas en B, C/D) ; lecture + réservation d'un usager enregistré ; écriture validée durable |
| **Panne domaine B** | idem, quorum via A + C/D |
| **Panne N** | entrée alternative authentifiée ; chemin résolvable |
| **Panne K** | usager enregistré validé par clés locales ; révocation lue dans le quorum et effective |
| **Faute V** | G-safe démarre ; **interprétation exacte** des états (dont WAITLISTED) ; aucune écriture validée perdue |

**Vérifications métier transverses :** lecture ET réservation d'un usager déjà enregistré ; autorisation courante ; aucune perte d'écriture validée ; aucune écriture sur copie minoritaire ; suspension acceptable des inscriptions et analyses non essentielles.

**Garanties chiffrées qu'on ne peut PAS déduire de ce dossier :**
- **Aucun taux de disponibilité / SLA numérique** : R05 ne fournit aucune probabilité ; « aucun calcul de disponibilité ne peut être inventé en l'absence de probabilités ».
- **Aucune borne de temps chiffrée** pour détection et bascule (R05 : « délai borné mais aucune valeur numérique »).
- **Aucune garantie au-delà d'une panne unique** : pannes simultanées, compromission cryptographique et panne de tous les capteurs de santé sont **hors garantie** (R05).
- **Aucune garantie de compatibilité universelle** : la faute V est limitée à la génération principale identifiée (R07), pas à tout logiciel imaginable.

---

## Synthèse de la variante

**La seule présence de WAITLISTED n'interdit pas la bascule.** L'obstacle du dossier de base était l'**incompatibilité de traitement** (G-safe relisait WAITLISTED comme FREE, violant R01), non l'existence de l'état. La variante lève cet obstacle : G-safe comprend WAITLISTED avec transitions exactes et sa qualification indépendante est fournie avant activation, ce qui satisfait R07. La bascule reste néanmoins **conditionnée** aux trois autres familles (placement, entrée, clés) et au quorum, et **subordonnée** à la complétude des transitions — une transition manquante rouvrirait la faille de P07.
## RÉPONSE FINALE

### Résultats exacts

**Q1 — Coupes minimales (architecture initiale).** Dans le modèle de causes R05 {A, B, N, K, V}, une seule cause survient à la fois :

$$\text{Coupes minimales} = \{\{A\},\ \{N\},\ \{K\},\ \{V\}\}$$

- **{A}** : coupe n1 et n2 → reste n3 seul → quorum (2 requis) non atteint.
- **{N}** : chemin introuvable (R04).
- **{K}** : accès interdit (R04).
- **{V}** : génération principale incapable de servir, même en clusters distincts (R04).
- **{B} n'est pas une coupe** : n3 tombe, mais n1 et n2 suffisent au quorum, et N, K, V restent intacts.

**Trois réplicas et plusieurs régions ne suffisent pas** parce que N, K et V sont des **racines logiques uniques hors quorum** : dépendances *série* du chemin, non interchangeables. La redondance de données ne couvre pas les coupes logiques.

**Q2 — Chemin corrigé.** Entrée alternative sans N (F-entrée) → clés locales + identités sans K + révocations via quorum (F-clés) → réplica dans trois domaines (F-placement) → G-safe indépendant de V (F-version) → quorum requis pour les opérations protégées. Disponibilité conditionnelle vérifiée pour chacune des cinq pannes uniques (A, B, N, K, V) : **oui** dans les cinq cas.

**Q3 — Nécessité des quatre familles.** Chaque famille est nécessaire *dans cette architecture* (témoin : A, N, K, V respectivement). Ce n'est **pas** une preuve d'optimalité universelle (P02).

**Q4 — Variante.** **Non, la seule présence de WAITLISTED n'interdit pas la bascule.** L'obstacle était l'incompatibilité de traitement (relecture FREE), levée par les transitions exactes + qualification indépendante avant activation.

**Q5 — Carbone.**

| Charge | C | D |
|---|---|---|
| 50 | **38 500** | **36 000** |
| 200 | **136 000** | **141 000** |

Seuil d'égalité : **n = 100**. Minimax : pire C = 136 000 < pire D = 141 000 → **choisir C**.

**Q6 —** Plan d'injection par cause réelle ; aucune garantie chiffrée de disponibilité, de délai ou au-delà d'une panne unique.

---

### Preuves et certificats

- **Coupes (Q1)** — énumération exhaustive des cinq causes uniques R05 ; sortie outil : `{A},{N},{K},{V}`, `B est-il une coupe ? False`, `WAITLISTED est une cause de panne ? False`.
- **Carbone (Q5)** — calcul exact des bilans linéaires : `C50=38500, C200=136000, D50=36000, D200=141000` ; `pire C=136000 < pire D=141000` ; `seuil n=100`.
- **Variante (Q4)** — WAITLISTED n'appartient pas à l'ensemble des causes de panne R05 ; il n'apparaît donc dans aucune coupe minimale. La condition R07 (qualification indépendante avant activation) est satisfaite par hypothèse de la variante.
- **Ledger** : 3 affirmations, toutes avec méthode ET preuve (audit : « Tout est couvert »).

---

### Pièges traités

1. **Confondre redondance de données et tolérance aux pannes logiques** — trois réplicas ne couvrent pas N, K, V (Q1).
2. **Croire que B est une coupe** — non : le quorum survit à la perte de n3.
3. **Test trompeur (P06)** — couper un pod ne teste aucun événement collectif ; il faut injecter A, N, K, V.
4. **« 200 OK » ≠ interprétation exacte (P07)** — R01 exige la sémantique correcte, pas une réponse HTTP.
5. **Confondre présence d'un état et incompatibilité de traitement** — c'est le cœur de la variante : WAITLISTED n'interdit rien *en soi*.
6. **Classer les sites par intensité seule** — D (100 g/kWh) semble meilleur que C (300 g/kWh), mais le bilan complet inverse le classement selon la charge.
7. **Choisir E** — meilleur en émissions mais non admissible (R01, P03) ; le chiffrement ne change pas la politique de localisation.
8. **Inventer des probabilités** — P05 : aucune probabilité connue → minimax, pas d'espérance.
9. **Dégrader silencieusement un état inconnu** — interdit ; rejet explicite requis.

---

### Limites / impossibilités

- **Aucun taux de disponibilité ni SLA numérique** : R05 ne fournit aucune probabilité ; tout chiffre serait inventé.
- **Aucune borne de temps chiffrée** pour détection et bascule (R05 : « délai borné mais aucune valeur numérique »).
- **Aucune garantie au-delà d'une panne unique** : pannes simultanées, compromission cryptographique et panne de tous les capteurs de santé sont hors garantie (R05).
- **Aucune compatibilité universelle** : la faute V est limitée à la génération principale identifiée (R07).
- **La bascule reste conditionnée** : la variante lève l'obstacle de version, mais la bascule dépend toujours des trois autres familles et du quorum ; et la compatibilité n'est acquise que si les transitions exactes sont **complètes** — une transition manquante rouvrirait la faille de P07.

**Conclusion de la variante :** la présence de WAITLISTED est **neutre** vis-à-vis de la bascule — ni nécessaire, ni suffisante. Ce qui autorise ou interdit la bascule, c'est la **compatibilité effective** (transitions exactes + qualification indépendante avant activation), désormais établie.