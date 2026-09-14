# SIII-05-V4 — SIII-05 → Un writer ancien échappe au protocole

Score: 90.0 % (certificats 0/0, juge 90/100)

Certificats manqués: aucun

J'ai les éléments décisifs. Rédigeons la réponse complète.

---

# Réponse — Variante « writer v1 divergent »

**Ce qui change par rapport au dossier de base.** Une seule hypothèse est modifiée : le backfill est désormais **correct** (il compare la version avant d'écrire, donc la course P07 est neutralisée). En revanche un **nouveau fait** apparaît : un *writer v1* modifie `shared` **sans mettre `visibility` à jour**. Toutes les autres contraintes (R01–R08, P01–P08) restent valides. Je recalcule donc uniquement ce que ce fait affecte : la sûreté de la **phase de compatibilité** et, par ricochet, le point de non-retour.

---

## Q1 — Promotion de A à D, traitement de E

| Artefact | Décision | Preuve manquante / contradictoire |
|---|---|---|
| **A** | **Refus** | Entrée obtenue par URL mobile pendant la construction, **absente du manifeste** → viole R02 (« déclarer toutes ses entrées » ; « entrée téléchargée sans empreinte immuable interdite »). La provenance FAB sur dA est valide mais **incomplète** : le manifeste ne couvre pas toutes les entrées. Preuve manquante : l'empreinte immuable de l'entrée mobile. |
| **B** | **Refus** | Plateforme **arm64** alors que la cible est **x64** (R02). Contradiction directe de plateforme. |
| **C** | **Refus** | La provenance signée désigne **dC0**, le stockage sert **dC** (R01/R02). Noms de fichiers et tag identiques = **tag mobile ≠ identité**. Contradiction de digest. |
| **D** | **Admis** | Provenance FAB = dD, entrées s7/l9/r4, x64, manifeste complet, suite H liée à dD réussie, approbation possible du digest + plan de migration. Rien n'affirme l'absence universelle de défaut (R03) — ce n'est pas exigé. |
| **E** | **Refus de substitution silencieuse** | dE ≠ dD (horodatage d'archive différent). L'approbation vise **dD**, pas dE. R03 : l'égalité/différence d'horodatage **ne prouve pas** l'équivalence de comportement, et une reconstruction bit-à-bit doit fixer **toutes** les entrées, y compris les métadonnées qui font partie des octets. On ne peut donc **pas** affirmer une reproductibilité bit-à-bit ni substituer dE sans nouvelle attestation/approbation sur dE. |

---

## Q2 — Impossibilité du mapping TEAM → v1

**Preuve (énumération exhaustive).** v1 n'a que deux états : `shared=false → {O}`, `shared=true → {O,T,X}`. La cible TEAM = `{O,T}`. Aucun état v1 ne produit `{O,T}` : **le mapping exact est impossible** (certificat : `Mapping TEAM->v1 exact possible ? False`).

- TEAM→`true` : autorise **X** → divulgation (viole « ni divulgation à X »).
- TEAM→`false` : refuse **T** → perte de l'accès légitime (viole « ni perte de T »).

**Le produit peut-il satisfaire toutes ses exigences sans en modifier une ?** **Non.** Les exigences sont : (i) visibilité TEAM exacte, (ii) fonctionnement inchangé des clients v1 hors ligne, (iii) rollback v1 sans perte ni divulgation. Or (i) exige un état `{O,T}` que le format v1 (ii) ne peut pas représenter, et (iii) exige que v1 reproduise exactement les accès. Il faut **relâcher une exigence** : soit abandonner le fonctionnement inchangé de v1 (fin de support), soit accepter que TEAM ne soit pas rétro-compatible en v1. C'est le **théorème d'incompatibilité** du dossier.

---

## Q3 — Migration par phases et point de non-retour

1. **Expansion** : ajouter `visibility` **sans supprimer** `shared` (R07). Aucun lecteur ne lit encore `visibility`.
2. **Compatibilité des lecteurs** : déployer un lecteur v2 qui comprend **les deux formats**. ⚠️ **C'est la phase examinée par la variante** (voir ci-dessous).
3. **Écritures** : basculer les writers vers v2 (écriture des deux champs de façon cohérente).
4. **Backfill concurrent** : convertir les lignes anciennes **avec comparaison de version** (corrigé dans la variante).
5. **Validation** : vérifier l'invariant de cohérence `shared ⟺ visibility∈{TEAM,PUBLIC}` sur toutes les lignes.
6. **Activation TEAM** : autoriser TEAM (gel temporaire des écritures TEAM pendant la bascule, R07).
7. **Contraction** : supprimer `shared` **seulement** après que plus aucun lecteur/writer v1 n'existe.

**Point de non-retour exact.** Le rollback v1 exact reste possible **tant qu'aucune ligne n'a été convertie en TEAM et qu'aucune copie TEAM n'a été délivrée** (R08). Dès la **première écriture TEAM** (ou la première copie délivrée), le retour v1 exact est **impossible** : v1 ne peut pas représenter `{O,T}`, et une compensation applicative ne peut que restreindre un accès futur, **pas reprendre un contenu déjà divulgué**. Le point de non-retour est donc **l'activation de TEAM (phase 6)**, et non la suppression de `shared` (phase 7).

---

## Q4 — Protocole de promotion liant artefact, tests, données, configuration, approbation

L'approbation de diffusion **lie** (R02) : digest exact de l'artefact **+** digest de la suite de tests **+** plan de migration. Protocole :

1. **Artefact** : vérifier que le digest servi = digest de la provenance FAB (jamais un tag).
2. **Tests** : vérifier que la suite H exécutée est celle dont le digest est approuvé, et qu'elle est liée au **même** digest d'artefact.
3. **Données** : vérifier que le plan de migration approuvé correspond au schéma déployé (expansion + backfill versionné).
4. **Configuration** : vérifier que la config (x64, entrées s7/l9/r4) est celle attestée.
5. **Approbation** : l'approbation couvre le **quadruplet** (artefact, tests, données, config). Un tag mobile ne vaut pas identité.

**Mise à jour du plan après approbation.** Toute modification du plan de migration **invalide** l'approbation : il faut **ré-approuver** le nouveau digest de plan (et re-vérifier la liaison artefact/tests). On ne peut pas « glisser » un plan modifié sous une approbation existante — c'est exactement le piège de la substitution silencieuse (cf. E).

---

## Q5 — Contre-exemples aux quatre slogans

- **« Signé donc sûr »** → **C** : signature FAB valide mais sur **dC0**, pas dC. La signature prouve *qui* a signé *quel contenu*, pas que le contenu servi est le bon (R01).
- **« Tests verts donc compatible »** → **A** : H réussit, mais une entrée non déclarée existe. Les tests ne couvrent pas l'intégrité de la chaîne d'entrées (R03).
- **« Rollback du code donc rollback des données »** → **R08** : revenir au code v1 ne retire ni les lignes TEAM ni les copies délivrées. Un effet externe irréversible n'est pas annulé par un rollback de code.
- **« false est une conversion exacte parce qu'elle est prudente »** → **P06** : TEAM→`false` refuse T. La prudence (ne pas divulguer à X) **crée une perte** pour T. « Prudent » ≠ « exact » : la conversion exacte n'existe pas (Q2).

---

## Q6 — Branche positive et tests de migration

**Branche positive** : promouvoir **D** (seul artefact admissible), déployer selon les phases 1→7, avec gel des écritures TEAM pendant la bascule et backfill versionné.

**Tests de migration** :
- **P07 (corrigé)** : ligne `shared=false`, version 4 ; lecture par backfill ; un usager passe à PUBLIC et valide version 5 ; le backfill **compare la version** et **n'écrase pas** (la version a changé) → pas de lost update. ✅
- **Client ancien isolé** : un client v1 hors ligne lit `shared` seul, sans service additionnel (R05). Test : vérifier que ses accès restent `{O}` ou `{O,T,X}` selon `shared`, et qu'aucun correctif distant n'est requis.
- **Invariant de cohérence** : après chaque phase, vérifier `shared ⟺ visibility∈{TEAM,PUBLIC}` sur toutes les lignes.

---

## Réponse à la variante : peut-on promouvoir la phase de compatibilité ?

### **NON.**

**Raison.** La phase de compatibilité suppose un lecteur v2 comprenant les deux formats **pendant que des writers v1 restent actifs**. Or le fait nouveau — un writer v1 qui écrit `shared` **sans** mettre `visibility` à jour — rend atteignables des états **divergents** entre les deux lecteurs. L'énumération exhaustive des 6 états `(shared, visibility)` donne :

| État | Permissions v1 | Permissions v2 | Statut |
|---|---|---|---|
| (false, PRIVATE) | {O} | {O} | ✅ cohérent |
| (false, TEAM) | {O} | {O,T} | ❌ divergent |
| (false, PUBLIC) | {O} | {O,T,X} | ❌ divergent |
| (true, PRIVATE) | {O,T,X} | {O} | ❌ divergent |
| (true, TEAM) | {O,T,X} | {O,T} | ❌ divergent |
| (true, PUBLIC) | {O,T,X} | {O,T,X} | ✅ cohérent |

**4 états sur 6 sont divergents.** Concrètement :
- `(true, PRIVATE)` : le writer v1 a partagé (`shared=true`) mais `visibility` reste PRIVATE → un client v2 **refuse T** → **perte de l'accès légitime**.
- `(false, PUBLIC)` : le writer v1 a dé-partagé mais `visibility` reste PUBLIC → un client v2 **autorise X** → **divulgation**.

Les deux violent l'exigence de correction (R06 : « ni divulgation à X ni perte de l'accès légitime de T »).

**Impossibilité structurelle.** Aucune règle de lecture v2 ne peut réparer cela : pour s'accorder avec v1 sur **tous** les états atteignables, v2 devrait **ignorer `visibility`** (donc lire `shared` seul) — mais alors v2 ne peut **pas** représenter TEAM = `{O,T}`, qui est inatteignable en v1. C'est une **contradiction** : on ne peut pas simultanément (a) rester cohérent avec v1 et (b) représenter TEAM. Si v2 lit l'**union** des permissions, il devient plus permissif que v1 sur `(false, TEAM)` et `(false, PUBLIC)` → **divulgation à X**.

**Ce que la correction du backfill ne couvre pas.** Le fait que le backfill soit correct (version-check) **ne suffit pas** : le backfill n'est qu'**un** écrivain parmi d'autres. Le writer v1 divergent est un écrivain concurrent **non contrôlé** qui produit des états incohérents. Corriger le backfill protège contre la course P07, **pas** contre un writer v1 qui désynchronise les deux champs.

### Conditions nécessaires pour pouvoir promouvoir la phase de compatibilité

La phase ne devient sûre que si l'on **élimine la divergence à la source**, par l'une de ces mesures :

1. **Geler/bloquer les écritures v1 côté serveur** avant de promouvoir la compatibilité (fin de support écriture). Mais alors la phase n'est plus « compatibilité avec writers v1 actifs » — c'est déjà la phase 3.
2. **Imposer un invariant de cohérence** : trigger/contrainte qui synchronise `shared ↔ visibility` à **chaque** écriture. ⚠️ Insuffisant seul : TEAM n'a pas d'équivalent v1 exact, donc la synchronisation ne peut pas rendre TEAM rétro-compatible.
3. **Règle de lecture v2 monotone et sûre** : impossible à satisfaire simultanément avec (a) et (b) ci-dessus (prouvé).

**Conclusion opérationnelle.** On **ne peut pas** promouvoir la phase de compatibilité telle quelle. Il faut soit **bloquer les writers v1** (ce qui déplace la promotion après la bascule des écritures), soit **ajouter une contrainte de cohérence** *et* accepter que TEAM ne soit pas lisible par v1. Le point de non-retour reste **l'activation de TEAM** (Q3) : dès la première écriture TEAM, le rollback v1 exact est impossible, car v1 ne peut pas représenter `{O,T}` et une compensation ne reprend pas un contenu déjà divulgué (R08).

---

## Pièges traités (checklist domaine)

- **Cohérence instantanée vs sérialisabilité** : la divergence `(shared, visibility)` est un problème de **cohérence de snapshot** entre deux lecteurs, pas seulement d'ordre des transactions.
- **Effet externe irréversible** : une copie TEAM délivrée n'est pas annulée par un rollback de code (R08).
- **Ne pas confondre idempotence et autorisation** : un backfill idempotent et versionné ne garantit pas la **cohérence d'autorisation** face à un writer divergent.
- **Tous les témoins explorés** : les 6 états `(shared, visibility)` ont été énumérés exhaustivement, pas seulement les cas courts.

## Limites / impossibilités

- **Impossibilité 1** : aucun mapping TEAM→v1 exact (Q2).
- **Impossibilité 2** : aucune règle de lecture v2 ne concilie cohérence avec v1 et représentation de TEAM.
- **Impossibilité 3** : le rollback v1 exact est impossible après la première écriture TEAM.
- **Ce qui reste garanti** : la promotion de **D** et les phases 1–5 restent sûres ; seule la **phase de compatibilité avec writers v1 actifs** est bloquée par la variante.
# RÉPONSE FINALE

## Résultats exacts demandés

**Q1 — Décision de promotion.**
- **A : refus.** Preuve manquante : empreinte immuable de l'entrée obtenue par URL mobile, absente du manifeste (viole R02 « déclarer toutes ses entrées »).
- **B : refus.** Contradiction : plateforme arm64 vs cible x64 (R02).
- **C : refus.** Contradiction de digest : provenance signée = dC0, contenu servi = dC (R01/R02 ; tag mobile ≠ identité).
- **D : admis.** Provenance FAB = dD, entrées s7/l9/r4, x64, manifeste complet, suite H liée à dD réussie, approbation possible.
- **E : refus de substitution silencieuse.** dE ≠ dD (horodatage d'archive) ; l'approbation vise dD ; R03 interdit de conclure l'équivalence de comportement depuis l'égalité/différence d'horodatage.

**Q2 — Mapping TEAM→v1.** Impossible. v1 ne produit que `{O}` (shared=false) ou `{O,T,X}` (shared=true) ; TEAM = `{O,T}` est inatteignable. Le produit **ne peut pas** satisfaire toutes ses exigences sans en modifier une.

**Q3 — Point de non-retour.** Rollback v1 exact possible **jusqu'à la première écriture TEAM ou la première copie TEAM délivrée** ; au-delà, impossible (R08). Le point de non-retour est **l'activation de TEAM (phase 6)**, pas la suppression de `shared` (phase 7).

**Q4 — Protocole.** L'approbation lie le quadruplet (digest artefact, digest suite de tests, plan de migration, config x64/s7/l9/r4). Toute modification du plan **invalide** l'approbation → ré-approbation obligatoire.

**Q5 — Contre-exemples.** « Signé donc sûr » → C ; « tests verts donc compatible » → A ; « rollback du code donc rollback des données » → R08 ; « false est exact parce que prudent » → P06 (refuse T).

**Q6 — Branche positive.** Promouvoir D, phases 1→7, gel des écritures TEAM, backfill versionné ; tests P07 (corrigé) et client v1 isolé.

**VARIANTE — Promotion de la phase de compatibilité : NON.**

## Preuves et certificats

| Résultat | Méthode | Certificat |
|---|---|---|
| TEAM inatteignable en v1 | énumération exhaustive des 2 états v1 | `Mapping TEAM->v1 exact possible ? False` |
| 4/6 états divergents sous la variante | énumération exhaustive des 6 états `(shared,visibility)` | divergents : (false,TEAM),(false,PUBLIC),(true,PRIVATE),(true,TEAM) |
| Aucune règle de lecture v2 ne concilie cohérence-v1 et TEAM | preuve par contradiction | accord avec v1 ⟹ ignorer `visibility` ⟹ TEAM inatteignable |

**Détail de la divergence (variante).** Le writer v1 écrit `shared` sans toucher `visibility`, rendant atteignables :
- `(true, PRIVATE)` : v1 = {O,T,X}, v2 = {O} → **perte de T** ;
- `(false, PUBLIC)` : v1 = {O}, v2 = {O,T,X} → **divulgation à X**.

Les deux violent R06. La correction du backfill (version-check) neutralise la course P07 mais **ne couvre pas** ce writer divergent : le backfill n'est qu'un écrivain parmi d'autres.

## Pièges traités

- **Cohérence de snapshot vs sérialisabilité** : la divergence `(shared, visibility)` est un défaut de cohérence entre deux lecteurs, pas un simple problème d'ordre transactionnel.
- **Effet externe irréversible** : une copie TEAM délivrée n'est pas annulée par un rollback de code (R08).
- **Idempotence ≠ autorisation** : un backfill idempotent et versionné ne garantit pas la cohérence d'autorisation face à un writer divergent.
- **Exhaustivité des témoins** : les 6 états ont été énumérés, pas seulement les cas courts.

## Limites / impossibilités

1. **Impossibilité 1** : aucun mapping TEAM→v1 exact (Q2).
2. **Impossibilité 2** : aucune règle de lecture v2 ne concilie cohérence avec v1 et représentation de TEAM.
3. **Impossibilité 3** : rollback v1 exact impossible après la première écriture TEAM.
4. **Ce qui reste garanti** : promotion de D et phases 1–5 sûres ; seule la **phase de compatibilité avec writers v1 actifs** est bloquée par la variante.

**Conditions pour débloquer la phase de compatibilité** : (a) bloquer les écritures v1 côté serveur avant promotion, ou (b) imposer un invariant de cohérence `shared ↔ visibility` à chaque écriture — en acceptant que TEAM ne soit pas lisible par v1. Aucune règle de lecture v2 ne peut, à elle seule, rendre tous les états atteignables sûrs.