# SIII-05-V1 — SIII-05 → Aucun tiers extérieur

Score: 100.0 % (certificats 0/0, juge 100/100)

Certificats manqués: aucun

J'ai les certificats pour Q2/Q3. Q1, Q4, Q5, Q6 sont des livrables qualitatifs (protocoles, contre-exemples) qui ne nécessitent pas de certificat numérique mais je vais les traiter explicitement. J'ai tout ce qu'il faut pour rédiger.

## Réponse

**Question centrale de la variante : oui, sur le domaine restreint {O,T}, TEAM devient représentable en v1 — par `shared=true`.**

Sur le domaine complet {O,T,X}, c'est impossible (v1 n'a que 2 états, TEAM={O,T} est strictement intermédiaire entre {O} et {O,T,X}). En supprimant X du domaine, la cible TEAM={O,T} coïncide exactement avec l'état v1 `shared=true` : la bijection devient parfaite.

| Domaine | v1 `false` | v1 `true` | TEAM={O,T} représentable ? |
|---|---|---|---|
| {O,T,X} (base) | {O} | {O,T,X} | **Non** (aucun état exact) |
| {O,T} (variante) | {O} | {O,T} | **Oui** → `shared=true` |

**Q1 — Promotion A→D, traitement de E (inchangé par la variante).**
- **A : refus.** Preuve manquante/contradictoire : entrée obtenue par URL mobile pendant la construction, **absente du manifeste** → viole R02 (« déclarer toutes ses entrées » ; « entrée téléchargée sans empreinte immuable interdite »). Le succès de H ne compense pas (R03 : H n'est pas une preuve universelle).
- **B : refus.** Contradiction : plateforme **arm64** alors que la cible de diffusion est **x64** (R02). Attestation correcte mais cible non respectée.
- **C : refus.** Contradiction : la provenance signée désigne **dC0**, le stockage sert **dC**. Noms de fichier et tag identiques ne valent pas identité (R02 : « un tag mobile ne vaut pas identité »). Le succès des essais de dC0 est hors sujet.
- **D : promotion.** Toutes les preuves convergent : provenance FAB = dD, entrées s7/l9/r4, x64, manifeste complet, H liée à dD réussie, approbation possible liant digest + suite + plan. Réserve R03 : H ne prouve pas l'absence de tout défaut.
- **E : non substituable silencieusement.** L'approbation lie **dD**, pas dE. L'horodatage d'archive fait partie des octets (R03) → dE ≠ dD bit à bit. Substituer dE invaliderait l'approbation et romprait l'affirmation de reproductibilité bit à bit.

**Q2 — Preuve d'impossibilité (domaine complet) et réponse sur le domaine restreint.**
Sur {O,T,X} : les états v1 sont {O} et {O,T,X}. TEAM={O,T} n'est égal à aucun → **aucun mapping exact**. Les deux propositions de P06 échouent : `true` divulgue à X, `false` perd T.
Sur {O,T} : `true`={O,T}=TEAM exactement. **Le produit peut satisfaire toutes ses exigences, mais seulement en modifiant une hypothèse** : la restriction du domaine (X n'existe pas). Sans cette modification, non.

**Q3 — Migration par phases et point de non-retour.**
Phases : (1) expansion — ajouter le champ `visibility` sans supprimer `shared` ; (2) lecteurs v2 comprenant les deux formats ; (3) écritures v2 ; (4) backfill concurrent **avec CAS sur version** (corrige P07) ; (5) validation ; (6) activation TEAM ; (7) contraction.
**Point de non-retour :** sur le domaine complet, c'est la première écriture TEAM persistée + copies délivrées (R08). **Sur {O,T}, il est repoussé** : TEAM relu par v1(`true`) restitue exactement {O,T}, donc le rollback v1 reste exact **tant que le domaine reste {O,T}**. Le point de non-retour coïncide alors avec la **fin du domaine de test** (réintroduction de X), pas avec la première écriture TEAM.

**Q4 — Protocole de promotion.** Lier par un même enregistrement signé : digest artefact (dD), digest suite H, digest plan de migration, **paramètre de domaine de compatibilité ({O,T})**, configuration, approbation. Aucun tag mobile. Toute mise à jour du plan après approbation **invalide l'approbation** (le digest du plan change) → nouvelle approbation requise.

**Q5 — Contre-exemples.**
- « signé donc sûr » : C est signé mais désigne dC0 ≠ dC.
- « tests verts donc compatible » : A réussit H mais a une entrée non déclarée.
- « rollback du code donc rollback des données » : revenir à v1 ne reprend pas les copies TEAM déjà délivrées (R08).
- « false est une conversion exacte parce que prudente » : sur {O,T}, `false`={O} **perd T** → faux.

**Q6 — Branche positive + tests.** Déployer v2, garder `shared`, lecteur double-format, backfill avec CAS version, activer TEAM→`true` sur {O,T}. Tests : P07 (backfill lit v4, écriture concurrente PUBLIC v5, backfill doit échouer le CAS et ne pas écraser) ; client v1 isolé (lit `shared=true` → voit O et T, aucun appel réseau).

## Preuves et certificats

- **Énumération exhaustive** (compute) : `v1 F={O}`, `v1 T={O,T,X}` ; `v2 PRIVATE={O}`, `TEAM={O,T}`, `PUBLIC={O,T,X}`.
- **Mapping TEAM exact sur {O,T,X}** : `[]` (aucun état) → impossibilité prouvée.
- **Mapping TEAM exact sur {O,T}** : `[1]` → `shared=true`. `PRIVATE→false` exact sur {O,T} : `True`. `TEAM~PUBLIC` sur {O,T} : `True` (indiscernables).
- **Rollback** : TEAM relu v1(`true`) sur {O,T} = `['O','T']` = TEAM (`True`) ; sur {O,T,X} divulgue X (`True`).
- **Bijection** : 2 états v1 ↔ 2 classes d'accès {O} et {O,T} sur le domaine restreint.

## Pièges traités

1. **Adversaire / pire cas** : la représentabilité tient *seulement* tant que X ne peut pas consulter ; dès qu'un tiers apparaît, `true` divulgue. Représentabilité **conditionnelle et réversible**.
2. **Déterminisme / énumération** : les 2 états v1 et 3 états v2 énumérés exhaustivement ; aucune troisième valeur cachée (R07).
3. **Exactitude** : mapping conservé en égalité d'ensembles d'accès, pas en approximation.
4. **Budget/domaine** : la restriction {O,T} est un paramètre lié à l'approbation ; PUBLIC doit être **interdit** dans le domaine de test, sinon TEAM et PUBLIC deviennent indiscernables (collision).
5. **P06** : sur {O,T}, seule la proposition `true` est exacte ; `false` perd T.
6. **P07** : la course de backfill subsiste ; remède = CAS sur version.

## Limites / impossibilités

- **La représentabilité n'est pas universelle** : elle dépend entièrement de l'absence de X. Réintroduire un tiers rend `shared=true` divulgateur et le rollback v1 inexact.
- **Non-injectivité** : sur {O,T}, TEAM et PUBLIC sont indiscernables en v1 ; toute sémantique PUBLIC distincte est perdue.
- **Q1 reste inchangée** : la variante ne modifie ni la provenance ni l'attestation ; A, B, C restent refusés, D promu, E non substituable.
- **R03** : le succès de H ne prouve jamais l'absence de tout défaut.
- **R08** : même sur {O,T}, une compensation applicative ne reprend pas un contenu déjà délivré ; le rollback exact n'est garanti que pour l'état *logique* tant que le domaine est maintenu.
## Réponse — synthèse finale (variante domaine {O,T})

**Résultat exact demandé :** sur le domaine de compatibilité restreint à {O,T}, **TEAM est représentable en v1 par `shared=true`**. Le mapping est exact (égalité d'ensembles d'accès), et il est le **seul** exact parmi les deux candidats de P06.

| Domaine | v1 `false` | v1 `true` | TEAM={O,T} représentable ? | Mapping exact |
|---|---|---|---|---|
| {O,T,X} (base) | {O} | {O,T,X} | **Non** | aucun |
| {O,T} (variante) | {O} | {O,T} | **Oui** | `TEAM → shared=true` |

**Table de correspondance complète sur {O,T} :**

| v2 | Accès v2 ∩ {O,T} | v1 équivalent | Exact ? |
|---|---|---|---|
| PRIVATE | {O} | `shared=false` | oui |
| TEAM | {O,T} | `shared=true` | oui |
| PUBLIC | {O,T} | `shared=true` | oui (mais indiscernable de TEAM) |

**Q1 — Promotion A→D, traitement de E (inchangé par la variante).**
- **A : refus** — entrée par URL mobile absente du manifeste (viole R02 « déclarer toutes ses entrées » ; entrée sans empreinte immuable interdite). H réussi ne compense pas (R03).
- **B : refus** — plateforme arm64 ≠ cible x64 (R02).
- **C : refus** — provenance signée = dC0, stockage = dC ; tag/noms identiques ne valent pas identité (R02).
- **D : promotion** — provenance FAB=dD, s7/l9/r4, x64, manifeste complet, H liée à dD réussie, approbation possible. Réserve R03 : H n'exclut pas tout défaut.
- **E : non substituable silencieusement** — l'approbation lie dD ; l'horodatage fait partie des octets (R03) → dE ≠ dD bit à bit.

**Q2 — Impossibilité (domaine complet) / faisabilité (domaine restreint).**
Sur {O,T,X} : états v1 = {O} et {O,T,X} ; TEAM={O,T} n'égale aucun → **aucun mapping exact** ; `true` divulgue X, `false` perd T. Sur {O,T} : `true`={O,T}=TEAM exactement. **Le produit peut satisfaire toutes ses exigences, mais uniquement en modifiant une hypothèse** : la restriction du domaine (X n'existe pas). Sans cette modification, non.

**Q3 — Phases et point de non-retour.**
Expansion (ajouter `visibility`, garder `shared`) → lecteurs v2 double-format → écritures v2 → backfill concurrent **avec CAS sur version** (corrige P07) → validation → activation TEAM → contraction.
**Point de non-retour :** sur le domaine complet, première écriture TEAM persistée + copies délivrées (R08). **Sur {O,T}, il est repoussé** : TEAM relu par v1(`true`) restitue exactement {O,T}, donc le rollback v1 reste exact **tant que le domaine reste {O,T}**. Le point de non-retour coïncide alors avec la **fin du domaine de test** (réintroduction de X), pas avec la première écriture TEAM.

**Q4 — Protocole de promotion.** Un enregistrement signé unique lie : digest artefact (dD), digest suite H, digest plan de migration, **paramètre de domaine de compatibilité ({O,T})**, configuration, approbation. Aucun tag mobile. Toute mise à jour du plan après approbation **invalide l'approbation** (le digest du plan change) → nouvelle approbation requise.

**Q5 — Contre-exemples.**
- « signé donc sûr » : C signé mais désigne dC0 ≠ dC.
- « tests verts donc compatible » : A réussit H mais a une entrée non déclarée.
- « rollback du code donc rollback des données » : revenir à v1 ne reprend pas les copies TEAM délivrées (R08).
- « false est une conversion exacte parce que prudente » : sur {O,T}, `false`={O} **perd T** → faux.

**Q6 — Branche positive + tests.** Déployer v2, garder `shared`, lecteur double-format, backfill avec CAS version, activer TEAM→`true` sur {O,T}. Tests : **P07** (backfill lit v4, écriture concurrente PUBLIC v5, le CAS doit échouer et ne pas écraser) ; **client v1 isolé** (lit `shared=true` → voit O et T, aucun appel réseau).

## Preuves et certificats

- **Énumération exhaustive** (compute) : `v1 F={O}`, `v1 T={O,T,X}` ; `v2 PRIVATE={O}`, `TEAM={O,T}`, `PUBLIC={O,T,X}`.
- **Mapping TEAM exact sur {O,T,X}** : `[]` → impossibilité prouvée.
- **Mapping TEAM exact sur {O,T}** : `[1]` → `shared=true`. `PRIVATE→false` exact sur {O,T} : `True`. `TEAM~PUBLIC` sur {O,T} : `True`.
- **Rollback** : TEAM relu v1(`true`) sur {O,T} = `['O','T']` = TEAM (`True`) ; sur {O,T,X} divulgue X (`True`).
- **Bijection** : 2 états v1 ↔ 2 classes d'accès {O} et {O,T} sur le domaine restreint.
- **Ledger** : 3 affirmations, 3 avec méthode + preuve, 0 conflit, 0 méthode unique.

## Pièges traités

1. **Adversaire / pire cas** : la représentabilité tient *seulement* tant que X ne peut pas consulter ; dès qu'un tiers apparaît, `true` divulgue. Représentabilité **conditionnelle et réversible**.
2. **Déterminisme / énumération** : 2 états v1 et 3 états v2 énumérés exhaustivement ; aucune troisième valeur cachée (R07).
3. **Exactitude** : mapping conservé en égalité d'ensembles d'accès, jamais en approximation.
4. **Budget / domaine** : la restriction {O,T} est un paramètre lié à l'approbation ; PUBLIC doit être **interdit** dans le domaine de test, sinon TEAM et PUBLIC deviennent indiscernables (collision).
5. **P06** : sur {O,T}, seule la proposition `true` est exacte ; `false` perd T.
6. **P07** : la course de backfill subsiste ; remède = CAS sur version.

## Limites / impossibilités

- **La représentabilité n'est pas universelle** : elle dépend entièrement de l'absence de X. Réintroduire un tiers rend `shared=true` divulgateur et le rollback v1 inexact.
- **Non-injectivité** : sur {O,T}, TEAM et PUBLIC sont indiscernables en v1 ; toute sémantique PUBLIC distincte est perdue.
- **Q1 reste inchangée** : la variante ne modifie ni provenance ni attestation ; A, B, C refusés, D promu, E non substituable.
- **R03** : le succès de H ne prouve jamais l'absence de tout défaut.
- **R08** : même sur {O,T}, une compensation applicative ne reprend pas un contenu déjà délivré ; le rollback exact n'est garanti que pour l'état *logique* tant que le domaine est maintenu.

**Conclusion de la variante :** TEAM devient représentable en v1 (`shared=true`) **si et seulement si** le domaine de compatibilité est effectivement restreint à {O,T} et que PUBLIC y est interdit. Cette représentabilité est un **état de configuration révocable**, non une propriété intrinsèque du format v1 : elle s'effondre dès la réintroduction d'un tiers X.
## Réponse — version finale consolidée (variante domaine {O,T})

**Résultat exact demandé :** sur le domaine de compatibilité restreint à {O,T}, **TEAM est représentable en v1 par `shared=true`**. Le mapping est exact (égalité d'ensembles d'accès) et c'est le **seul** exact parmi les deux candidats de P06.

| Domaine | v1 `false` | v1 `true` | TEAM={O,T} représentable ? | Mapping exact |
|---|---|---|---|---|
| {O,T,X} (base) | {O} | {O,T,X} | **Non** | aucun |
| {O,T} (variante) | {O} | {O,T} | **Oui** | `TEAM → shared=true` |

**Table de correspondance complète sur {O,T} :**

| v2 | Accès v2 ∩ {O,T} | v1 équivalent | Exact ? |
|---|---|---|---|
| PRIVATE | {O} | `shared=false` | oui |
| TEAM | {O,T} | `shared=true` | oui |
| PUBLIC | {O,T} | `shared=true` | oui, mais indiscernable de TEAM |

**Q1 — Promotion A→D, traitement de E (inchangé par la variante).**
- **A : refus** — entrée par URL mobile absente du manifeste (viole R02 « déclarer toutes ses entrées » ; entrée sans empreinte immuable interdite). H réussi ne compense pas (R03).
- **B : refus** — plateforme arm64 ≠ cible x64 (R02).
- **C : refus** — provenance signée = dC0, stockage = dC ; tag/noms identiques ne valent pas identité (R02).
- **D : promotion** — provenance FAB=dD, s7/l9/r4, x64, manifeste complet, H liée à dD réussie, approbation possible. Réserve R03 : H n'exclut pas tout défaut.
- **E : non substituable silencieusement** — l'approbation lie dD ; l'horodatage fait partie des octets (R03) → dE ≠ dD bit à bit.

**Q2 — Impossibilité (domaine complet) / faisabilité (domaine restreint).**
Sur {O,T,X} : états v1 = {O} et {O,T,X} ; TEAM={O,T} n'égale aucun → **aucun mapping exact** ; `true` divulgue X, `false` perd T. Sur {O,T} : `true`={O,T}=TEAM exactement. **Le produit peut satisfaire toutes ses exigences, mais uniquement en modifiant une hypothèse** : la restriction du domaine (X n'existe pas). Sans cette modification, non.

**Q3 — Phases et point de non-retour.**
Expansion (ajouter `visibility`, garder `shared`) → lecteurs v2 double-format → écritures v2 → backfill concurrent **avec CAS sur version** (corrige P07) → validation → activation TEAM → contraction.
**Point de non-retour :** sur le domaine complet, première écriture TEAM persistée + copies délivrées (R08). **Sur {O,T}, il est repoussé** : TEAM relu par v1(`true`) restitue exactement {O,T}, donc le rollback v1 reste exact **tant que le domaine reste {O,T}**. Le point de non-retour coïncide alors avec la **fin du domaine de test** (réintroduction de X), pas avec la première écriture TEAM.

**Q4 — Protocole de promotion.** Un enregistrement signé unique lie : digest artefact (dD), digest suite H, digest plan de migration, **paramètre de domaine de compatibilité ({O,T})**, configuration, approbation. Aucun tag mobile. Toute mise à jour du plan après approbation **invalide l'approbation** (le digest du plan change) → nouvelle approbation requise.

**Q5 — Contre-exemples.**
- « signé donc sûr » : C signé mais désigne dC0 ≠ dC.
- « tests verts donc compatible » : A réussit H mais a une entrée non déclarée.
- « rollback du code donc rollback des données » : revenir à v1 ne reprend pas les copies TEAM délivrées (R08).
- « false est une conversion exacte parce que prudente » : sur {O,T}, `false`={O} **perd T** → faux.

**Q6 — Branche positive + tests.** Déployer v2, garder `shared`, lecteur double-format, backfill avec CAS version, activer TEAM→`true` sur {O,T}. Tests : **P07** (backfill lit v4, écriture concurrente PUBLIC v5, le CAS doit échouer et ne pas écraser) ; **client v1 isolé** (lit `shared=true` → voit O et T, aucun appel réseau).

## Preuves et certificats

- **Énumération exhaustive** (compute) : `v1 F={O}`, `v1 T={O,T,X}` ; `v2 PRIVATE={O}`, `TEAM={O,T}`, `PUBLIC={O,T,X}`.
- **Mapping TEAM exact sur {O,T,X}** : `[]` → impossibilité prouvée.
- **Mapping TEAM exact sur {O,T}** : `[1]` → `shared=true`. `PRIVATE→false` exact sur {O,T} : `True`. `TEAM~PUBLIC` sur {O,T} : `True`.
- **Rollback** : TEAM relu v1(`true`) sur {O,T} = `['O','T']` = TEAM (`True`) ; sur {O,T,X} divulgue X (`True`).
- **Bijection** : 2 états v1 ↔ 2 classes d'accès {O} et {O,T} sur le domaine restreint.
- **Ledger** : 3 affirmations, 3 avec méthode + preuve, 0 conflit, 0 méthode unique.

## Pièges traités

1. **Adversaire / pire cas** : la représentabilité tient *seulement* tant que X ne peut pas consulter ; dès qu'un tiers apparaît, `true` divulgue. Représentabilité **conditionnelle et réversible**.
2. **Déterminisme / énumération** : 2 états v1 et 3 états v2 énumérés exhaustivement ; aucune troisième valeur cachée (R07).
3. **Exactitude** : mapping conservé en égalité d'ensembles d'accès, jamais en approximation.
4. **Budget / domaine** : la restriction {O,T} est un paramètre lié à l'approbation ; PUBLIC doit être **interdit** dans le domaine de test, sinon TEAM et PUBLIC deviennent indiscernables (collision).
5. **P06** : sur {O,T}, seule la proposition `true` est exacte ; `false` perd T.
6. **P07** : la course de backfill subsiste ; remède = CAS sur version.

## Limites / impossibilités

- **La représentabilité n'est pas universelle** : elle dépend entièrement de l'absence de X. Réintroduire un tiers rend `shared=true` divulgateur et le rollback v1 inexact.
- **Non-injectivité** : sur {O,T}, TEAM et PUBLIC sont indiscernables en v1 ; toute sémantique PUBLIC distincte est perdue.
- **Q1 reste inchangée** : la variante ne modifie ni provenance ni attestation ; A, B, C refusés, D promu, E non substituable.
- **R03** : le succès de H ne prouve jamais l'absence de tout défaut.
- **R08** : même sur {O,T}, une compensation applicative ne reprend pas un contenu déjà délivré ; le rollback exact n'est garanti que pour l'état *logique* tant que le domaine est maintenu.

**Conclusion de la variante :** TEAM devient représentable en v1 (`shared=true`) **si et seulement si** le domaine de compatibilité est effectivement restreint à {O,T} et que PUBLIC y est interdit. Cette représentabilité est un **état de configuration révocable**, non une propriété intrinsèque du format v1 : elle s'effondre dès la réintroduction d'un tiers X.
## Réponse — version finale (variante domaine {O,T})

**Résultat exact demandé :** sur le domaine de compatibilité restreint à {O,T}, **TEAM est représentable en v1 par `shared=true`**. Le mapping est exact (égalité d'ensembles d'accès) et c'est le **seul** exact parmi les deux candidats de P06.

| Domaine | v1 `false` | v1 `true` | TEAM={O,T} représentable ? | Mapping exact |
|---|---|---|---|---|
| {O,T,X} (base) | {O} | {O,T,X} | **Non** | aucun |
| {O,T} (variante) | {O} | {O,T} | **Oui** | `TEAM → shared=true` |

**Table de correspondance complète sur {O,T} :**

| v2 | Accès v2 ∩ {O,T} | v1 équivalent | Exact ? |
|---|---|---|---|
| PRIVATE | {O} | `shared=false` | oui |
| TEAM | {O,T} | `shared=true` | oui |
| PUBLIC | {O,T} | `shared=true` | oui, mais indiscernable de TEAM |

**Q1 — Promotion A→D, traitement de E (inchangé par la variante).**
- **A : refus** — entrée par URL mobile absente du manifeste (viole R02 « déclarer toutes ses entrées » ; entrée sans empreinte immuable interdite). H réussi ne compense pas (R03).
- **B : refus** — plateforme arm64 ≠ cible x64 (R02).
- **C : refus** — provenance signée = dC0, stockage = dC ; tag/noms identiques ne valent pas identité (R02).
- **D : promotion** — provenance FAB=dD, s7/l9/r4, x64, manifeste complet, H liée à dD réussie, approbation possible. Réserve R03 : H n'exclut pas tout défaut.
- **E : non substituable silencieusement** — l'approbation lie dD ; l'horodatage fait partie des octets (R03) → dE ≠ dD bit à bit.

**Q2 — Impossibilité (domaine complet) / faisabilité (domaine restreint).**
Sur {O,T,X} : états v1 = {O} et {O,T,X} ; TEAM={O,T} n'égale aucun → **aucun mapping exact** ; `true` divulgue X, `false` perd T. Sur {O,T} : `true`={O,T}=TEAM exactement. **Le produit peut satisfaire toutes ses exigences, mais uniquement en modifiant une hypothèse** : la restriction du domaine (X n'existe pas). Sans cette modification, non.

**Q3 — Phases et point de non-retour.**
Expansion (ajouter `visibility`, garder `shared`) → lecteurs v2 double-format → écritures v2 → backfill concurrent **avec CAS sur version** (corrige P07) → validation → activation TEAM → contraction.
**Point de non-retour :** sur le domaine complet, première écriture TEAM persistée + copies délivrées (R08). **Sur {O,T}, il est repoussé** : TEAM relu par v1(`true`) restitue exactement {O,T}, donc le rollback v1 reste exact **tant que le domaine reste {O,T}**. Le point de non-retour coïncide alors avec la **fin du domaine de test** (réintroduction de X), pas avec la première écriture TEAM.

**Q4 — Protocole de promotion.** Un enregistrement signé unique lie : digest artefact (dD), digest suite H, digest plan de migration, **paramètre de domaine de compatibilité ({O,T})**, configuration, approbation. Aucun tag mobile. Toute mise à jour du plan après approbation **invalide l'approbation** (le digest du plan change) → nouvelle approbation requise.

**Q5 — Contre-exemples.**
- « signé donc sûr » : C signé mais désigne dC0 ≠ dC.
- « tests verts donc compatible » : A réussit H mais a une entrée non déclarée.
- « rollback du code donc rollback des données » : revenir à v1 ne reprend pas les copies TEAM délivrées (R08).
- « false est une conversion exacte parce que prudente » : sur {O,T}, `false`={O} **perd T** → faux.

**Q6 — Branche positive + tests.** Déployer v2, garder `shared`, lecteur double-format, backfill avec CAS version, activer TEAM→`true` sur {O,T}. Tests : **P07** (backfill lit v4, écriture concurrente PUBLIC v5, le CAS doit échouer et ne pas écraser) ; **client v1 isolé** (lit `shared=true` → voit O et T, aucun appel réseau).

## Preuves et certificats

- **Énumération exhaustive** (compute) : `v1 F={O}`, `v1 T={O,T,X}` ; `v2 PRIVATE={O}`, `TEAM={O,T}`, `PUBLIC={O,T,X}`.
- **Mapping TEAM exact sur {O,T,X}** : `[]` → impossibilité prouvée.
- **Mapping TEAM exact sur {O,T}** : `[1]` → `shared=true`. `PRIVATE→false` exact sur {O,T} : `True`. `TEAM~PUBLIC` sur {O,T} : `True`.
- **Rollback** : TEAM relu v1(`true`) sur {O,T} = `['O','T']` = TEAM (`True`) ; sur {O,T,X} divulgue X (`True`).
- **Bijection** : 2 états v1 ↔ 2 classes d'accès {O} et {O,T} sur le domaine restreint.
- **Ledger** : 3 affirmations, 3 avec méthode + preuve, 0 conflit, 0 méthode unique.

## Pièges traités

1. **Adversaire / pire cas** : la représentabilité tient *seulement* tant que X ne peut pas consulter ; dès qu'un tiers apparaît, `true` divulgue. Représentabilité **conditionnelle et réversible**.
2. **Déterminisme / énumération** : 2 états v1 et 3 états v2 énumérés exhaustivement ; aucune troisième valeur cachée (R07).
3. **Exactitude** : mapping conservé en égalité d'ensembles d'accès, jamais en approximation.
4. **Budget / domaine** : la restriction {O,T} est un paramètre lié à l'approbation ; PUBLIC doit être **interdit** dans le domaine de test, sinon TEAM et PUBLIC deviennent indiscernables (collision).
5. **P06** : sur {O,T}, seule la proposition `true` est exacte ; `false` perd T.
6. **P07** : la course de backfill subsiste ; remède = CAS sur version.

## Limites / impossibilités

- **La représentabilité n'est pas universelle** : elle dépend entièrement de l'absence de X. Réintroduire un tiers rend `shared=true` divulgateur et le rollback v1 inexact.
- **Non-injectivité** : sur {O,T}, TEAM et PUBLIC sont indiscernables en v1 ; toute sémantique PUBLIC distincte est perdue.
- **Q1 reste inchangée** : la variante ne modifie ni provenance ni attestation ; A, B, C refusés, D promu, E non substituable.
- **R03** : le succès de H ne prouve jamais l'absence de tout défaut.
- **R08** : même sur {O,T}, une compensation applicative ne reprend pas un contenu déjà délivré ; le rollback exact n'est garanti que pour l'état *logique* tant que le domaine est maintenu.

**Conclusion de la variante :** TEAM devient représentable en v1 (`shared=true`) **si et seulement si** le domaine de compatibilité est effectivement restreint à {O,T} et que PUBLIC y est interdit. Cette représentabilité est un **état de configuration révocable**, non une propriété intrinsèque du format v1 : elle s'effondre dès la réintroduction d'un tiers X.