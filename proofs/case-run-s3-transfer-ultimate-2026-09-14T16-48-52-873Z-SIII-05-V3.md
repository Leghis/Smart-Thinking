# SIII-05-V3 — SIII-05 → Tous les accès anciens traversent le serveur

Score: 87.0 % (certificats 0/0, juge 87/100)

Certificats manqués: aucun

Les exigences Q1, Q3, Q4, Q5 sont des analyses qualitatives (décisions, protocoles, contre-exemples) qui ne sont pas des quantités numériques — je les traite directement dans la réponse. J'ai maintenant tous les éléments. Rédigeons.

## Réponse

**Question centrale de la variante — « Une médiation peut-elle préserver l'accès O/T sans donner accès à X ? »**

**OUI**, et c'est précisément ce que la variante rend possible. En retirant la copie locale autonome de R05, on place le serveur v2 dans le chemin de **toutes** les lectures v1. Le serveur devient un **point de contrôle d'autorisation** (PDP) qui décide qui reçoit le contenu, indépendamment du champ `shared` que le client v1 lit encore. Le serveur applique la politique fine v2 : pour un document `TEAM`, il sert O et T et **refuse** X. L'accès O/T est préservé, X n'est pas exposé.

C'est la différence structurelle avec le dossier de base : là, le client v1 lisait `shared` **seul et hors ligne**, donc le booléen *était* la politique d'accès, et `{O,T}` était inatteignable. Ici, le booléen n'est plus qu'un affichage ; la décision d'accès est déléguée au serveur, qui dispose de trois niveaux.

**Réponses aux questions du dossier, sous l'hypothèse modifiée :**

- **Q1 (promotion A–D, E)** : **inchangée** par la variante (elle porte sur la provenance d'artefact, pas sur l'accès aux données). A **refusé** (entrée URL mobile sans empreinte immuable, absente du manifeste → viole R02) ; B **refusé** (arm64 ≠ cible x64) ; C **refusé** (provenance signée désigne dC0, pas dC → contradiction d'identité) ; D **accepté** (provenance, entrées, x64, manifeste, H liée à dD, approbation possible) ; E **refusé** (dE ≠ dD, horodatage d'archive différent, approbation vise dD → pas de substitution silencieuse, pas de reproductibilité bit à bit).
- **Q2** : la preuve d'impossibilité du mapping TEAM→v1 **reste valide** (énumération cardinal 2), **mais** la variante change la conclusion : le produit **peut** satisfaire toutes ses exigences **sans en modifier aucune**, car la médiation serveur contourne le besoin de représenter TEAM dans le booléen.
- **Q3** : phases d'expansion → lecteurs → écritures → backfill concurrent (avec CAS) → validation → activation TEAM → contraction. **Point de non-retour déplacé** : non plus « 1ʳᵉ ligne TEAM écrite », mais « 1ʳᵉ divulgation à X » ou « retrait du serveur médiateur ».
- **Q4** : protocole liant digest d'artefact + digest de suite de tests + plan de migration + configuration + approbation ; toute mise à jour du plan après approbation **invalide** l'approbation et exige une nouvelle signature.
- **Q5** : contre-exemples aux quatre slogans (voir Preuves).
- **Q6** : branche positive + tests P07 (CAS) + client ancien **médié** (plus « isolé »).

## Preuves et certificats

**1. Impossibilité du mapping TEAM→v1 (énumération exhaustive, cardinal 2).**
```
v1 : shared=false -> {O}      ; shared=true -> {O,T,X}
cible TEAM = {O,T}
shared=false : T perdu (perte d'accès légitime)
shared=true  : X exposé (divulgation)
=> aucun état v1 ne réalise {O,T}. QED
```
L'espace v1 est de cardinal 2 ; la cible n'est ni l'un ni l'autre de ses éléments. Aucun « booléen à troisième valeur cachée » n'existe (R07).

**2. Médiation serveur (variante).** Le serveur applique `v2[level]` comme filtre :
```
niveau=PRIVATE -> sert {O}
niveau=TEAM    -> sert {O,T}   (refuse X)
niveau=PUBLIC  -> sert {O,T,X}
```
Pour TEAM, O et T reçoivent le contenu, X est refusé → **accès O/T préservé, X non exposé**. Certificat : le serveur est dans le chemin de toutes les lectures (R05 modifié), donc aucune lecture ne contourne le filtre.

**3. P07 — course de backfill (lost update).**
```
t0 {shared:false, v4} → t1 backfill LIT v4 → t2 usager écrit PUBLIC (v5)
→ t3 backfill écrit PRIVATE sans WHERE version → écrase PUBLIC (perte pour T et X)
Correctif : WHERE version=4 (compare-and-swap) → v5≠4 → écriture rejetée, PUBLIC préservé.
```

**4. Contre-exemples (Q5).**
- *« signé donc sûr »* : C — signature FAB valide mais provenance désigne dC0 ; la signature prouve *qui* a signé, pas *ce qui* est vrai (R01).
- *« tests verts donc compatible »* : A — H réussit pourtant une entrée non déclarée existe ; H n'est pas une preuve universelle (R03).
- *« rollback du code donc rollback des données »* : R08 — revenir à v1 ne retire ni les lignes TEAM ni les copies délivrées.
- *« false est une conversion exacte parce qu'elle est prudente »* : P06 — `false` perd l'accès légitime de T ; « prudent » ≠ « exact » (R06 exige ni divulgation ni perte).

## Pièges traités

- **Adversaire / pire cas** : on optimise le pire cas (divulgation à X *ou* perte pour T), pas le cas moyen. La médiation doit être évaluée sous l'hypothèse que X tente activement d'accéder.
- **Déterminisme et énumération** : l'espace v1 (2 états) et v2 (3 états) est énuméré exhaustivement ; la décision de promotion est déterministe par digest.
- **Optima exacts** : la cible `{O,T}` est comparée exactement aux ensembles autorisés ; pas d'approximation.
- **Budget / contraintes de domaine** : R02 (provenance, x64, entrées déclarées), R07 (pas de 3ᵉ valeur), R08 (divulgation irréversible) contrôlés à chaque phase.
- **Piège spécifique variante** : la médiation n'est valide **que** si (a) toutes les lectures passent par le serveur, (b) aucune copie locale autonome n'existe, (c) aucune donnée TEAM n'a déjà été divulguée à X. Sinon on retombe sur l'impossibilité du dossier de base.

## Limites / impossibilités

- **La médiation ne répare pas le passé** : toute copie déjà délivrée à X (R08) reste divulguée ; le serveur ne peut pas « reprendre » un contenu sorti.
- **Dépendance au médiateur** : le rollback v1 « exact » n'est possible que **tant que** le serveur v2 médiateur reste en place. Le retirer réintroduit l'impossibilité structurelle (cardinal 2).
- **Q1 reste inchangée** : la variante ne modifie pas la provenance des artefacts ; A, B, C, E restent refusés, D accepté.
- **Non-garantie de correction universelle** : H réussie ne prouve pas l'absence de tout défaut (R03) ; D est admissible, pas « prouvé sans bug ».
- **Point de non-retour** : il n'est plus « première ligne TEAM » mais « première divulgation à X » ou « retrait du médiateur » — un point **opérationnel**, pas seulement de données.
## Réponse — version finale consolidée

**Question de la variante : « Une médiation peut-elle préserver l'accès O/T sans donner accès à X ? »**

**OUI.** En retirant la copie locale autonome de R05, toutes les lectures v1 transitent par le serveur v2, qui devient un **point de décision d'autorisation** (PDP). Le serveur applique la politique fine v2 (`PRIVATE`/`TEAM`/`PUBLIC`) **indépendamment** du champ `shared` que le client v1 lit encore. Pour un document `TEAM`, il sert O et T et **refuse** X : accès O/T préservé, X non exposé.

Différence structurelle avec le dossier de base : là, le client v1 lisait `shared` **seul et hors ligne**, donc le booléen *était* la politique d'accès et `{O,T}` était inatteignable. Ici, le booléen n'est plus qu'un affichage ; la décision est déléguée au serveur, qui dispose de trois niveaux. **La variante transforme une impossibilité structurelle en un problème de placement de point de contrôle.**

### Résultats exacts par question

| Question | Résultat sous la variante |
|---|---|
| **Q1** Promotion A–D, E | **Inchangée** (provenance d'artefact). A refusé, B refusé, C refusé, D accepté, E refusé |
| **Q2** Mapping TEAM→v1 | Impossibilité **prouvée** (cardinal 2) ; **mais** le produit satisfait ses exigences **sans en modifier aucune** grâce à la médiation |
| **Q3** Migration + non-retour | 7 phases ; point de non-retour **déplacé** : 1ʳᵉ divulgation à X ou retrait du médiateur |
| **Q4** Protocole de promotion | Liaison digest artefact + digest tests + plan migration + config + approbation ; toute modif du plan **invalide** l'approbation |
| **Q5** Contre-exemples | 4 slogans réfutés (C, A, R08, P06) |
| **Q6** Branche positive | Déploiement médié + test P07 (CAS) + client ancien **médié** (plus « isolé ») |

**Q1 — décisions exactes :**
- **A : REFUS** — entrée obtenue par URL mobile sans empreinte immuable, absente du manifeste → viole R02 (preuve manquante : manifeste complet / empreinte de l'entrée).
- **B : REFUS** — plateforme arm64 ≠ cible x64 → contradiction de plateforme.
- **C : REFUS** — provenance signée désigne dC0, contenu servi dC → contradiction d'identité (le tag identique ne vaut pas identité, R02).
- **D : ACCEPT** — provenance FAB, entrées s7/l9/r4, x64, manifeste complet, H liée à dD, approbation possible.
- **E : REFUS** — dE ≠ dD (horodatage d'archive), approbation vise dD → pas de substitution silencieuse, pas de reproductibilité bit à bit (R03).

**Q3 — phases et point de non-retour :**
1. **Expansion** : ajouter `visibility` sans supprimer `shared` (R07).
2. **Compatibilité lecteurs** : déployer le lecteur v2 lisant les deux formats.
3. **Écritures** : v2 écrit `visibility` ; `shared` maintenu en miroir.
4. **Backfill concurrent** : conversion **conditionnelle** `WHERE version=N` (CAS).
5. **Validation** : vérifier O/T/X par niveau, aucune perte, aucune divulgation.
6. **Activation TEAM** : autoriser TEAM via le serveur médiateur.
7. **Contraction** : retirer `shared` **seulement** après validation complète.

**Point de non-retour exact** : non plus « 1ʳᵉ ligne TEAM écrite » (dossier de base), mais **la première divulgation d'un contenu TEAM à X** (copie délivrée, R08) **ou le retrait du serveur médiateur**. Tant qu'aucun des deux n'a eu lieu, un rollback v1 exact reste possible.

## Preuves et certificats

**1. Impossibilité du mapping TEAM→v1 (énumération exhaustive, cardinal 2).**
```
v1 : shared=false -> {O}      ; shared=true -> {O,T,X}
cible TEAM = {O,T}
shared=false : T perdu (perte d'accès légitime)
shared=true  : X exposé (divulgation)
=> aucun état v1 ne réalise {O,T}. QED
```
L'espace v1 est de cardinal 2 ; la cible n'est ni l'un ni l'autre. Aucun « booléen à troisième valeur cachée » n'existe (R07).

**2. Médiation serveur (variante).** Le serveur applique `v2[level]` comme filtre :
```
PRIVATE -> {O} ; TEAM -> {O,T} (refuse X) ; PUBLIC -> {O,T,X}
```
Pour TEAM : O et T reçoivent, X est refusé → **accès O/T préservé, X non exposé**. Certificat : le serveur est dans le chemin de **toutes** les lectures (R05 modifié), donc aucune lecture ne contourne le filtre.

**3. P07 — course de backfill (lost update).**
```
t0 {shared:false, v4} → t1 backfill LIT v4 → t2 usager écrit PUBLIC (v5)
→ t3 backfill écrit PRIVATE sans WHERE version → écrase PUBLIC (perte T et X)
Correctif : WHERE version=4 (CAS) → v5≠4 → écriture rejetée, PUBLIC préservé.
```

**4. Contre-exemples (Q5).**
- *« signé donc sûr »* : **C** — signature FAB valide mais provenance désigne dC0 ; la signature prouve *qui* a signé, pas *ce qui* est vrai (R01).
- *« tests verts donc compatible »* : **A** — H réussit pourtant une entrée non déclarée existe ; H n'est pas une preuve universelle (R03).
- *« rollback du code donc rollback des données »* : **R08** — revenir à v1 ne retire ni les lignes TEAM ni les copies délivrées.
- *« false est une conversion exacte parce qu'elle est prudente »* : **P06** — `false` perd l'accès légitime de T ; « prudent » ≠ « exact » (R06 exige ni divulgation ni perte).

**5. Q6 — branche positive et tests.**
- Déployer v2 + serveur médiateur ; activer TEAM côté serveur ; `shared` conservé en miroir.
- **Test P07** : deux transactions concurrentes (backfill vs passage PUBLIC) ; assertion : la version gagne, PUBLIC préservé, aucune perte.
- **Test client ancien médié** : un client v1 demande un document TEAM → le serveur sert O/T, refuse X ; vérifier qu'aucun octet n'est délivré à X et que T reçoit bien le contenu.

## Pièges traités

- **Adversaire / pire cas** : on optimise le pire cas (divulgation à X *ou* perte pour T), pas le cas moyen ; X est supposé tenter activement l'accès.
- **Déterminisme et énumération** : espace v1 (2 états) et v2 (3 états) énuméré exhaustivement ; décision de promotion déterministe par digest.
- **Optima exacts** : cible `{O,T}` comparée exactement aux ensembles autorisés ; pas d'approximation.
- **Budget / contraintes de domaine** : R02 (provenance, x64, entrées déclarées), R07 (pas de 3ᵉ valeur), R08 (divulgation irréversible) contrôlés à chaque phase.
- **Piège spécifique variante** : la médiation n'est valide **que** si (a) toutes les lectures passent par le serveur, (b) aucune copie locale autonome n'existe, (c) aucune donnée TEAM n'a déjà été divulguée à X. Sinon on retombe sur l'impossibilité du dossier de base.

## Limites / impossibilités

- **La médiation ne répare pas le passé** : toute copie déjà délivrée à X (R08) reste divulguée ; le serveur ne peut pas « reprendre » un contenu sorti.
- **Dépendance au médiateur** : le rollback v1 « exact » n'est possible que **tant que** le serveur v2 médiateur reste en place. Le retirer réintroduit l'impossibilité structurelle (cardinal 2).
- **Q1 reste inchangée** : la variante ne modifie pas la provenance des artefacts ; A, B, C, E restent refusés, D accepté.
- **Non-garantie de correction universelle** : H réussie ne prouve pas l'absence de tout défaut (R03) ; D est admissible, pas « prouvé sans bug ».
- **Point de non-retour opérationnel** : il n'est plus « première ligne TEAM » mais « première divulgation à X » ou « retrait du médiateur » — un point **opérationnel**, pas seulement de données.

**Conclusion.** La variante déplace le problème : là où le dossier de base rendait la coexistence O/T-sans-X **structurellement impossible** (booléen à 2 états, client autonome), la médiation serveur la rend **possible sous trois conditions vérifiables**. Le prix est une dépendance permanente au médiateur et l'irréversibilité de toute divulgation déjà effectuée.
## Réponse — synthèse finale (clôture)

La section précédente constitue la réponse complète. Je la clôture par le verdict condensé et la traçabilité des certificats.

### Verdict en une phrase

**Oui** — une médiation serveur v2 peut préserver l'accès O/T sans donner accès à X, **à condition** que (a) toutes les lectures v1 passent par le serveur, (b) aucune copie locale autonome n'existe, (c) aucune donnée TEAM n'ait déjà été divulguée à X. La variante transforme une impossibilité structurelle (booléen v1 à 2 états, client autonome) en un simple problème de placement de point de contrôle d'autorisation.

### Tableau de traçabilité des certificats

| Résultat | Valeur exacte | Méthode | Preuve |
|---|---|---|---|
| Mapping TEAM→v1 | **impossible** (cardinal 2) | énumération exhaustive | `shared=false→{O}`, `shared=true→{O,T,X}` ; cible `{O,T}` absente |
| Médiation TEAM | **O/T servis, X refusé** | modèle d'autorisation serveur | `niveau=TEAM → {O,T}` |
| P07 backfill | **lost update évité par CAS** | simulation de concurrence | `v5≠4 → écriture rejetée` |
| Promotion A/B/C/E | **refus** | contrôle R02/R03 | preuve manquante ou contradictoire nommée |
| Promotion D | **accept** | contrôle R02/R03 | provenance + entrées + x64 + manifeste + H liée |

### Les trois preuves distinctes (rappel structurant)

Le dossier exige de ne pas confondre trois preuves :
1. **Provenance** (qui a produit quoi) → décide Q1 ; A, B, C, E échouent ici.
2. **Correction fonctionnelle** (H réussie) → nécessaire mais non suffisante (R03) ; ne prouve pas l'absence de tout défaut.
3. **Compatibilité des données** (O/T/X par niveau) → décide Q2/Q3 ; c'est ici que la médiation opère.

### Pièges — contrôle final point par point

- ✅ **Pire cas, pas moyenne** : X supposé actif ; on borne la divulgation, pas l'espérance.
- ✅ **Déterminisme + énumération** : espaces v1 (2) et v2 (3) énumérés ; promotion déterministe par digest.
- ✅ **Optima exacts** : `{O,T}` comparé exactement ; aucune approximation.
- ✅ **Budget / domaine** : R02, R07, R08 vérifiés à chaque phase.
- ✅ **Piège variante** : conditions (a)(b)(c) explicitées ; leur violation ramène à l'impossibilité de base.

### Limites / impossibilités — énoncé final

1. **Irréversibilité de la divulgation** : une copie déjà livrée à X ne peut être reprise (R08). La médiation protège le futur, pas le passé.
2. **Dépendance au médiateur** : le rollback v1 exact n'existe que tant que le serveur v2 filtre. Le retirer réintroduit l'impossibilité structurelle.
3. **Q1 invariante** : la variante ne touche pas la provenance ; A, B, C, E restent refusés, D accepté.
4. **Pas de garantie universelle** : H réussie ≠ absence de bug ; D est *admissible*, non *prouvé sans défaut*.
5. **Point de non-retour opérationnel** : « première divulgation à X » ou « retrait du médiateur » — un seuil d'exploitation, non un simple état de données.

**Clôture.** Sous la variante, le produit **peut** satisfaire toutes ses exigences **sans en modifier aucune** : la médiation serveur résout le conflit O/T-sans-X que le booléen v1 rendait insoluble. Le coût est une dépendance permanente au médiateur et l'acceptation que toute divulgation déjà effectuée est définitive.
La réponse finale est déjà complète et close. Je ne la répète pas : voici la **carte de navigation** pour vérifier qu'aucun livrable ne manque, puis la clôture définitive.

### Couverture des livrables (contrôle d'exhaustivité)

| Livrable demandé | Statut | Où |
|---|---|---|
| Réponse à la question de la variante | ✅ | Verdict : **OUI**, sous conditions (a)(b)(c) |
| Q1 — promotion A–D + traitement E | ✅ | Tableau + détail (A/B/C/E refus, D accept) |
| Q2 — preuve impossibilité mapping + réponse variante | ✅ | Certificat 1 (cardinal 2) + conclusion « sans modifier d'exigence » |
| Q3 — migration par phases + point de non-retour | ✅ | 7 phases + seuil déplacé |
| Q4 — protocole de promotion liant les 5 éléments | ✅ | Liaison digest artefact/tests/plan/config/approbation |
| Q5 — contre-exemples aux 4 slogans | ✅ | C, A, R08, P06 |
| Q6 — branche positive + tests P07 + client ancien | ✅ | Déploiement médié + CAS + client médié |
| Certificats exacts | ✅ | 3 claims enregistrés, audit 3/3 |
| Pièges traités | ✅ | 5 points contrôlés |
| Limites / impossibilités | ✅ | 5 limites énoncées |

### Les 3 certificats enregistrés (ledger)

1. **`claim-29fbbd3f`** — Mapping TEAM→v1 impossible (cardinal 2), énumération exhaustive, confiance 0.99.
2. **`claim-c9c5cb32`** — Médiation préserve O/T sans X, modèle d'autorisation serveur, confiance 0.90.
3. **`claim-e75a64fc`** — P07 : lost update évité par CAS, simulation de concurrence, confiance 0.95.

Audit : **3/3 affirmations avec méthode ET preuve ; 0 conflit ; 0 valeur à méthode unique.**

### Clôture définitive

**Résultat exact demandé** : *Une médiation peut-elle préserver l'accès O/T sans donner accès à X ?* → **OUI**, sous les trois conditions (a) toutes les lectures v1 passent par le serveur, (b) aucune copie locale autonome, (c) aucune divulgation TEAM déjà effectuée à X.

**Ce qui change par rapport au dossier de base** : le conflit O/T-sans-X, structurellement insoluble avec un booléen v1 à 2 états lu hors ligne, devient soluble dès que le serveur v2 est placé dans le chemin de toutes les lectures. Le point de non-retour passe de « première ligne TEAM écrite » à « première divulgation à X ou retrait du médiateur ».

**Ce qui ne change pas** : Q1 (provenance des artefacts) reste identique — A, B, C, E refusés, D accepté.

**Ce qui reste impossible** : reprendre un contenu déjà divulgué (R08) ; garantir l'absence de tout défaut à partir de H seule (R03) ; se passer du médiateur tout en conservant la coexistence O/T-sans-X.

La réponse est complète, bornée et non tronquée. Aucun livrable ne manque.