# SIII-09 — Les régions qui partagent la même panne

Score: 93.0 % (certificats 0/0, juge 93/100)

Certificats manqués: aucun

Toutes les exigences sont couvertes. Je rédige la réponse finale.

## Réponse

### Q1 — Coupes minimales de l'architecture initiale

**Établi.** Dans le modèle de causes {A, B, N, K, V}, le chemin utilisateur initial exige simultanément : N (DNS/point d'entrée), K (coffre + vérification d'identité), V (génération principale), **et** un quorum de 2 réplicas sur 3. Les réplicas sont n1, n2 ∈ A et n3 ∈ B.

Énumération exhaustive (compute) : les coupes minimales sont exactement **4 singletons** :

| Coupe | Effet |
|---|---|
| **{A}** | n1 et n2 tombent → reste n3 seul → **pas de quorum** (2/3 requis) |
| **{N}** | chemin introuvable (R04) |
| **{K}** | accès interdit (R04) |
| **{V}** | toutes les instances de la génération principale incapables de servir (R04) |

**B n'est pas une coupe** : n3 seul tombe, n1+n2 restent → quorum conservé.

**Pourquoi 3 réplicas et plusieurs régions ne suffisent pas :** la tolérance à une panne de réplica (R02) est une propriété *locale au consensus*, mais le service dépend de **racines logiques partagées** (N, K, V) qui sont des points uniques non répliqués, et le placement physique met 2 réplicas dans le même domaine A. Trois réplicas ne protègent ni contre la perte de quorum par panne de domaine (A), ni contre les dépendances N/K/V. Un pod de plus ne supprime aucune de ces dépendances (R04).

### Q2 — Chemin de service complet après correction

**Établi (sûreté par cas).** Chemin corrigé combinant les 4 familles :

1. **Routage/entrée (F-entrée)** : point d'entrée alternatif authentifié préinstallé, sans dépendance à N.
2. **Identité/clés (F-clés)** : clés locales + validation des identités **déjà enregistrées** sans appel à K ; **révocations lues dans le quorum** (R06).
3. **Version (F-version)** : G-safe indépendant de la faute V.
4. **Placement (F-placement)** : un réplica par domaine sur 3 domaines physiques distincts (ex. A, B, C ou D) → quorum 2/3 survit à toute panne d'un domaine.
5. **Quorum** : requis pour toute opération protégée (lecture/écriture) ; les clients n'écrivent jamais sur une copie minoritaire (R02).

**Vérification par panne unique de R05 :**

| Cause unique | Chemin corrigé |
|---|---|
| Panne domaine A | réplicas en B + C/D → quorum OK ; entrée/clés/G-safe hors A |
| Panne domaine B | réplicas A + C/D → quorum OK |
| Panne N | entrée alternative (F-entrée) |
| Panne K | clés locales + identités enregistrées + révocations via quorum (F-clés) |
| Panne V | G-safe (F-version) |

**Disponibilité conditionnelle** : pour chaque cause unique de R05, un chemin complet subsiste. Ceci est une garantie **structurelle** (existence de chemin), pas probabiliste.

### Q3 — Certificats de nécessité des 4 familles

**Établi (nécessité locale, non optimalité universelle).** Chaque famille élimine une coupe singulière **distincte** ; l'omettre réintroduit cette coupe (témoin/contre-exemple) :

| Famille | Coupe éliminée | Contre-exemple si omise |
|---|---|---|
| F-placement | {A} | 2 réplicas en A → panne A casse le quorum |
| F-entrée | {N} | panne N → chemin introuvable |
| F-clés | {K} | panne K → accès interdit |
| F-version | {V} | faute V → génération principale HS |

**Pourquoi ce n'est pas une preuve d'optimalité universelle :** P02 précise qu'on demande une **nécessité dans cette architecture donnée**, pas un optimum universel de nombre de produits. Les 4 familles sont nécessaires *ici* parce que chacune correspond à une racine distincte du modèle {A,N,K,V}. Dans une autre architecture (racines fusionnées, autre placement), une famille pourrait devenir superflue ou une seule correction pourrait couvrir plusieurs coupes. La nécessité est donc **relative au modèle de causes fourni**.

### Q4 — P07 : engagement de compatibilité

**Établi.** Le scénario : WAITLISTED activé sur le principal → document écrit dans cet état → faute V → G-safe démarre, **ignore l'état inconnu et le considère FREE** → perte d'interprétation. L'équipe revendique un succès parce que « les requêtes répondent » — mais R01 exige une **interprétation exacte**, pas un simple 200.

**Engagement requis avant activation de WAITLISTED :**
- **Contrat de domaine** : `états émis par les writers ⊆ états interprétés par G-safe`. G-safe (FREE, BOOKED) doit soit connaître WAITLISTED, soit le produit doit **différer WAITLISTED** jusqu'à qualification.
- **Compatibilité forward/backward** : un writer ne peut émettre un état que le lecteur de secours sait interpréter ; sinon fail-closed (refus), jamais de relecture silencieuse en FREE.
- **Qualification indépendante** : faire évoluer et qualifier G-safe (ajout WAITLISTED) **avant** de l'autoriser, avec test de reprise sur document WAITLISTED.
- **Interdiction du « 200 = succès »** : la réponse HTTP ne prouve pas la sémantique.

### Q5 — Bilans carbone et choix minimax

**Établi (calcul exact).** Coût(n) = kWh×intensité×n + transfert×n + fixe.

| Charge | C | D |
|---|---|---|
| 50 | **38 500 g** | **36 000 g** |
| 200 | **136 000 g** | **141 000 g** |

**Seuil d'égalité** : 650n + 6000 = 700n + 1000 → **n = 100** (C(100) = D(100) = 71 000 g).

**Choix minimax** (minimiser le pire bilan, charges 50/200, sans probabilité) :
- max_C = 136 000 g ; max_D = 141 000 g → **choisir C**.

**Pourquoi E et le classement par intensité ne répondent pas :**
- **E** : meilleures émissions mais **non admissible** pour le stockage personnel (R01) ; le réplica votant contient ces données ; le chiffrement ne change pas la politique (P03). E est **hors domaine**.
- **Intensité seule** : C = 300 g/kWh > D = 100 g/kWh → classerait D gagnant, mais c'est **trompeur** : D consomme 5 kWh/travail (vs 2) et a un transfert de 200 g (vs 50). Le bilan complet (consommation × intensité + transfert + fixe) inverse le classement à forte charge. Le minimax sur le **bilan complet** donne C.

### Q6 — Plan d'injection et garanties non déductibles

**Plan d'injection (pannes collectives réelles, pas pods) :**
1. **Panne domaine A** : couper tout A (n1, n2, frontends/API de A) → vérifier quorum via B + C/D.
2. **Panne domaine B** : couper tout B → vérifier quorum via A + C/D.
3. **Panne N** : rendre N injoignable → vérifier bascule vers entrée alternative.
4. **Panne K** : rendre K injoignable → vérifier clés locales + identités enregistrées + révocations via quorum.
5. **Faute V** : injecter la faute sur la génération principale → vérifier démarrage G-safe.
6. **Vérification métier** (pas seulement 200) : usager enregistré lit + réserve ; écriture validée non perdue ; interprétation exacte des états (test WAITLISTED → G-safe).
7. **Test de reprise P07** : écrire WAITLISTED, injecter V, vérifier que G-safe ne relit pas FREE silencieusement.

**P06 — test trompeur** : couper un pod à la fois ne teste **aucun** des 4 événements collectifs (A, N, K, V). C'est un test de tolérance à une panne de réplica, pas de domaine/racine.

**Garanties chiffrées NON déductibles du dossier :**
- Taux de disponibilité, MTBF/MTTR, RTO/RPO numériques.
- Probabilité de double panne (hors garantie R05).
- Résistance à la compromission cryptographique (hors garantie R05).
- Toute valeur de délai de détection/bascule (R05 dit « borné » sans valeur).

## Preuves et certificats

- **Q1** : énumération exhaustive des 2⁵ sous-ensembles de causes + test de minimalité → `[[A],[N],[K],[V]]`, count=4 (compute).
- **Q5** : calcul exact des coûts linéaires → C(50)=38500, C(200)=136000, D(50)=36000, D(200)=141000, seuil n=100, max_C=136000 < max_D=141000 (compute).
- **Q2/Q3/Q4/Q6** : analyse par cas et témoins de nécessité (claims enregistrés).

## Pièges traités

- **Cohérence vs sérialisabilité** : le quorum 2/3 garantit la durabilité d'une écriture validée (R02) ; les clients n'écrivent jamais sur une copie minoritaire → pas de divergence.
- **Effet irréversible** : P07 — un document WAITLISTED relu en FREE est une **perte d'interprétation irréversible** ; un rollback ne restaure pas la sémantique. D'où l'engagement de compatibilité.
- **Exactly-once/fencing/idempotence ≠ autorisation** : la révocation doit être lue dans le quorum (F-clés), pas seulement l'authentification.
- **Test trompeur** : pods ≠ pannes collectives (P06).
- **Pas de probabilités** : aucune disponibilité chiffrée inventée.

## Limites / impossibilités

- **Non déterminé** : toute valeur numérique de disponibilité, MTBF, RTO/RPO — le dossier ne fournit aucune probabilité.
- **Hors garantie** : compromission cryptographique, deux pannes simultanées, panne de tous les capteurs de santé (R05).
- **E exclu** : non admissible pour le stockage personnel (R01/P03), malgré ses émissions.
- **Nécessité ≠ optimalité** : les 4 familles sont nécessaires dans *cette* architecture, pas un optimum universel (P02).
- **Outils simulés** : les moyens R06 sont préinstallés/testés dans le modèle ; aucune action réelle sur des comptes.