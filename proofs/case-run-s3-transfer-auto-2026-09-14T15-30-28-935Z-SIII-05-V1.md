# SIII-05-V1 — SIII-05 → Aucun tiers extérieur

Score: 96.0 % (certificats 0/0, juge 96/100)

Certificats manqués: aucun

La vérification web n'apporte rien de pertinent (recherche générique sur le partage de domaines) ; je m'appuie sur le raisonnement ensembliste déterministe, qui est concluant. Je rédige la réponse finale.

---

# Variante : domaine de compatibilité restreint à {O, T}

## 0. Ce qui change, ce qui ne change pas

**Hypothèse explicitement modifiée.** Le domaine de compatibilité passe de `{O, T, X}` (R04) à `{O, T}` : X n'existe pas et aucun tiers extérieur ne consulte pendant le domaine de test.

**Contraintes conservées telles quelles.** R05 (v1 = un seul booléen `shared` : `false→{O}`, `true→{O,T,X}`), R06 (v2 : `PRIVATE→{O}`, `TEAM→{O,T}`, `PUBLIC→{O,T,X}`), R07 (pas de troisième valeur cachée ; pas d'historique externe rendant v1 plus expressive), R08 (rollback code ≠ rollback données). Toute la partie fabrication/attestation (R01–R03, P01–P05) est **inchangée** : la variante ne touche que le domaine de données.

**Point de méthode.** « Représentable » a deux sens qu'il faut séparer, sinon la réponse est ambiguë :
- **Représentation sémantique exacte** : le champ encode *exactement* l'ensemble d'autorisation visé.
- **Représentation observationnelle** : sur le domaine effectivement peuplé, l'accès résultant coïncide avec l'ensemble visé.

## 1. Réponse directe : oui, mais seulement au sens observationnel

Calcul ensembliste (déterministe) :

| Valeur `shared` | Sémantique (domaine complet) | Accès effectif sur {O,T} |
|---|---|---|
| `false` | {O} | {O} |
| `true` | {O, T, X} | **{O, T}** |

- Sur le **domaine complet**, `TEAM = {O,T}` n'est l'image d'aucune valeur de `shared` : les images de v1 sont `{O}` et `{O,T,X}`. C'est l'impossibilité de Q2 du dossier de base.
- Sur le **domaine restreint {O,T}**, `shared=true` donne un accès effectif `{O,T,X} ∩ {O,T} = {O,T} = TEAM`.

**Conclusion.** Oui, TEAM devient représentable en v1 sur ce domaine, **via `shared=true`**, mais uniquement comme **équivalence observationnelle conditionnée à l'absence effective de X**. Ce n'est **pas** une conversion exacte au sens sémantique : le champ continue d'encoder X. La représentation est correcte *tant que et seulement tant que* le domaine reste fermé à X.

## 2. Recalcul des conclusions affectées

### Q2 (dossier de base) — la preuve d'impossibilité tombe sur le domaine restreint
La preuve d'impossibilité reposait sur : « les deux images de `shared` sont `{O}` et `{O,T,X}` ; `{O,T}` n'est ni l'une ni l'autre ». En restreignant le domaine à `{O,T}`, l'image `{O,T,X}` se projette sur `{O,T}`, donc `TEAM` **devient atteignable**. L'impossibilité n'est plus valide *sur ce domaine*.

**Mais** : « le produit peut-il satisfaire toutes ses exigences sans en modifier une ? » → **Non.** Satisfaire TEAM en v1 exige de **modifier une hypothèse** : exclure X du domaine (R04/R06 supposent X existant et non fusionnable). On ne contourne pas l'impossibilité, on **rétrécit le domaine** pour qu'elle disparaisse. C'est une modification d'exigence, pas une solution technique.

### P06 — les deux mappings
- **M1 : TEAM → `shared=true`.** Sur le domaine complet : sur-ensemble `{O,T,X}`, **divulgue X** → faux. Sur le domaine restreint : accès effectif `{O,T}` → **correct observationnellement**. C'est le seul mapping admissible *dans le domaine restreint*.
- **M2 : TEAM → `shared=false`.** `{O}` : **perd T** dans tous les cas, y compris sur le domaine restreint → **faux partout**. La prudence ne le sauve pas (voir Q5).

### Q5 — le slogan « false est une conversion exacte parce qu'elle est prudente »
Reste **faux même sur le domaine restreint** : `false` donne `{O}`, donc perd l'accès légitime de T. La prudence (ne pas divulguer) n'est pas l'exactitude (préserver O *et* T). Un mapping « sûr » peut être fonctionnellement faux.

### Q3 / R08 — point de non-retour
Le domaine restreint **ne supprime pas** le point de non-retour, il le **conditionne**. Dès qu'une ligne TEAM est écrite en `shared=true` **et** qu'une copie locale v1 est délivrée (R05 : copie autonome, aucun correctif à distance possible), cette copie autorise X *par construction*. Le rollback v1 exact devient impossible **au moment où X peut réapparaître** — c'est-à-dire dès la sortie du domaine de test. Le point de non-retour exact reste : **écriture de la première ligne TEAM en `shared=true` + livraison d'une copie v1**. La restriction du domaine ne fait que **repousser** ce point tant que X est exclu ; elle ne le déplace pas dans la structure de données.

## 3. Impacts sur la branche positive (Q6) et le protocole (Q4)

- **Q4 (promotion)** : inchangé. La variante ne touche pas la chaîne d'attestation. L'artefact admissible reste **D** (P04) ; A refusé (entrée URL mobile hors manifeste, R02), B refusé (arm64 ≠ x64), C refusé (provenance désigne dC0 ≠ dC), E non substituable (horodatage d'archive ≠ dD, approbation liée à dD, R03).
- **Q6 (tests de migration)** : le test « client ancien isolé » doit être **reformulé** pour ce domaine : on ne teste plus « X ne voit rien » (X absent), mais « O et T voient exactement ce qu'ils doivent voir ». Le test P07 (course de backfill) reste **inchangé** : la version de ligne doit être vérifiée en condition (`WHERE version=4`) pour éviter d'écraser l'écriture PUBLIC concurrente.

## 4. Garde-fous obligatoires (sinon la représentation casse)

1. **Fermeture effective du domaine** : X doit être *techniquement* impossible à authentifier comme tiers pendant toute la durée où des lignes TEAM sont en `shared=true`. Une simple convention ne suffit pas (R01 : un signataire non autorisé ne prouve rien).
2. **Marquage de provenance** : conserver un champ v2 (`visibility`) en parallèle de `shared` (R07 l'autorise : on ajoute sans supprimer). Ainsi, à la réouverture du domaine, on peut **recalculer** `shared` correctement au lieu de subir la valeur héritée.
3. **Interdiction de contraction** : ne **pas** supprimer `shared` (contrairement à P08) tant que des clients v1 isolés existent, sinon on perd la seule voie de lecture v1.
4. **Documentation du caractère conditionnel** : la compatibilité TEAM↔v1 doit être déclarée « valide sous domaine {O,T} », jamais « conversion exacte ».

## 5. Synthèse

| Question | Réponse sur le domaine restreint {O,T} |
|---|---|
| TEAM représentable en v1 ? | **Oui, observationnellement** via `shared=true` |
| Conversion exacte (sémantique) ? | **Non** — le champ encode toujours X |
| Impossibilité de Q2 ? | **Levée** sur ce domaine, mais au prix d'une **modification d'hypothèse** (exclusion de X) |
| Mapping correct ? | **M1 (`true`)** ; M2 (`false`) reste faux (perd T) |
| Point de non-retour ? | **Inchangé** : 1ʳᵉ ligne TEAM en `shared=true` + copie v1 livrée ; seulement **repoussé** tant que X est exclu |
| Slogan « false = exact car prudent » ? | **Faux** même ici |

**Verdict.** La restriction du domaine rend TEAM *représentable* en v1, mais cette représentabilité est **observationnelle et conditionnelle**, non sémantique. Elle ne résout pas le problème de fond : elle déplace la contrainte de « impossible à encoder » vers « interdit de rouvrir le domaine à X ». Le produit ne satisfait donc pas ses exigences **sans en modifier une** : il en modifie une (le domaine), et cette modification est **réversible seulement tant que X reste exclu**. Dès que X revient, la représentation `shared=true` devient une divulgation, et le rollback v1 exact est définitivement perdu.