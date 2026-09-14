# SIII-05 — Le déploiement qui interdit le retour

Score: 89.0 % (certificats 0/0, juge 89/100)

Certificats manqués: aucun

Q5 et Q6 sont des livrables de conception (pas des quantités numériques) ; je les traite dans la rédaction. Tous les résultats numériques sont certifiés. Je rédige la réponse finale.

## Réponse

**Q1 — Décision de promotion (R02).** Seul **D est admis**. A, B, C, E sont refusés.

| Artefact | Verdict | Preuve manquante / contradictoire |
|---|---|---|
| **A** | **REFUS** | Entrée obtenue par URL mobile **absente du manifeste** → « toutes les entrées déclarées » violé **et** « entrée téléchargée sans empreinte immuable interdite » violé. Le succès de H ne répare pas la provenance (R03 : H n'est pas une preuve universelle). |
| **B** | **REFUS** | Plateforme **arm64 ≠ cible x64**. Attestation correcte mais cible de diffusion non respectée. |
| **C** | **REFUS** | La provenance signée désigne **dC0 ≠ dC**. Signature valide sur un contenu qui n'est pas celui désigné : contradiction provenance/contenu. Les essais de dC0 ne transfèrent pas à dC. |
| **D** | **ADMIS** | Provenance = dD, s7/l9/r4, FAB, x64, manifeste complet, H liée à dD réussie, approbation possible liant digest + tests + plan. |
| **E** | **REFUS** | Provenance et approbation visent **dD, pas dE**. Substitution silencieuse interdite. |

**Traitement de E :** E ne peut **pas** être substitué silencieusement à D. L'horodatage d'archive fait partie des octets (R03) : dE ≠ dD est une **différence de contenu**, pas une simple métadonnée neutre. La reproductibilité « bit à bit » est **réfutée** par l'existence même de dE. Si l'on veut utiliser E, il faut une **nouvelle provenance + nouvelle approbation** liant dE, ou reconstruire avec horodatage fixé (SOURCE_DATE_EPOCH) pour obtenir dD.

**Q2 — Impossibilité du mapping TEAM→v1 (certificat exact).**
- v1 : `shared=false → {O}` ; `shared=true → {O,T,X}`.
- v2 : `TEAM → {O,T}`.
- Énumération exhaustive des 2 valeurs de `shared` : **0 solution**. Différences symétriques : `{O}△{O,T}={T}` (perte de T) ; `{O,T,X}△{O,T}={X}` (divulgation à X).
- Plus fort : sur les **8 fonctions** v2→v1, **aucune** ne préserve les accès ; sur les **4 fonctions** v1→v2, **une seule** est exacte : `false→PRIVATE, true→PUBLIC`.

**Le produit ne peut pas satisfaire toutes ses exigences sans en modifier une.** E1 (v1 hors ligne inchangé), E2 (TEAM exact en v2) et E3 (rollback v1 exact après TEAM) sont **mutuellement incompatibles** dès qu'une ligne TEAM est écrite : R07 interdit une 3ᵉ valeur cachée et tout historique externe, donc `shared` ne peut coder `{O,T}`. Il faut **relâcher E3** (accepter que le rollback v1 ne restaure pas TEAM) ou **relâcher E1** (fin de support v1).

**Q3 — Migration par phases et point de non-retour.**
1. **Expansion** : ajouter `visibility` **sans supprimer `shared`** ; backfill `shared=false→PRIVATE`, `shared=true→PUBLIC` (seul mapping exact).
2. **Compatibilité lecteurs** : déployer un lecteur v2 lisant les deux formats ; v1 continue de lire `shared`.
3. **Écritures** : v2 écrit `visibility` **et** maintient `shared` en miroir (`PRIVATE→false`, `PUBLIC→true`) tant que v1 est supporté.
4. **Backfill concurrent** : **compare-and-swap sur `version`** (voir P07), jamais d'écriture aveugle.
5. **Validation** : invariants de cohérence `shared↔visibility` sur PRIVATE/PUBLIC ; audit des lignes TEAM.
6. **Activation TEAM** : geler temporairement les écritures TEAM, activer, vérifier O/T/X.
7. **Contraction** : supprimer `shared` **seulement** après fin de support v1.

**Point de non-retour exact :** la **première écriture TEAM committée** (ou la première copie v1 `shared=true` délivrée). Certificat : `rollback_exact ⟺ (n_TEAM=0) ET (n_copies_X=0)` ; vrai uniquement en (0,0). Avant ce point, rollback v1 exact possible ; après, **impossible** (R08 : le code revient, pas les données ni les copies).

**Q4 — Protocole de promotion (liaison sans tag).**
- **Artefact** : digest exact (dD), jamais un tag mobile.
- **Tests** : digest de la suite H **lié au digest dD**.
- **Données** : digest du plan de migration.
- **Configuration** : digest de la config déployée.
- **Approbation** : signature FAB liant **les quatre digests** dans un enregistrement unique.
- **Mise à jour du plan après approbation** : toute modification du plan **invalide l'approbation** → nouvelle approbation requise. On ne « patche » pas un plan approuvé ; on ré-approuve.

**Q5 — Contre-exemples aux slogans.**
- **« Signé donc sûr »** : C — signature FAB valide mais provenance désigne dC0. Signature prouve *qui* a signé *quel contenu*, pas la conformité (R01).
- **« Tests verts donc compatible »** : A — H réussit malgré une entrée non déclarée ; H ne prouve pas l'absence de défaut (R03).
- **« Rollback du code donc rollback des données »** : après activation TEAM, revenir à v1 laisse les lignes TEAM et les copies délivrées (R08) ; `shared` ne peut les encoder.
- **« false est une conversion exacte parce que prudente »** : TEAM→false donne `{O}`, **perd T** (accès légitime). Prudence ≠ exactitude ; c'est une perte, pas une conversion.

**Q6 — Branche positive + tests.**
- **Déploiement** : promouvoir **dD** (digest lié à H + plan), lecteur v2 bi-format, miroir `shared`, backfill CAS, activation TEAM après gel, contraction différée.
- **Test P07** : ligne `shared=false, version=4` ; backfill lit v4 ; usager passe PUBLIC (version 5) ; backfill **CAS sur version 4 échoue** → PUBLIC préservé. Le backfill naïf écrase PUBLIC (lost update) — **réfuté**.
- **Test client ancien isolé** : client v1 hors ligne lit `shared` ; pour un doc PRIVATE/PUBLIC, comportement inchangé ; pour un doc TEAM, **aucune valeur de `shared` ne donne `{O,T}`** → soit perte de T, soit divulgation à X. Le test doit **échouer explicitement** sur TEAM, prouvant l'incompatibilité.

## Preuves et certificats
- **Q1** : application critère par critère de R02 (compute : verdicts A..E).
- **Q2** : énumération exhaustive — 0/2 mappings TEAM, 0/8 fonctions v2→v1, 1/4 fonctions v1→v2 (compute).
- **Q3** : énumération des états (n_TEAM, n_copies_X) ; rollback exact vrai seulement en (0,0).
- **Q6** : simulation des entrelacements P07 (naïf vs CAS).
- Tous les certificats sont enregistrés au ledger (5/5 avec méthode + preuve).

## Pièges traités
- **Adversaire/pire cas** : on optimise la sûreté (refus par défaut), pas le « ça a marché en test ».
- **Déterminisme/énumération** : espace des mappings et des fonctions énuméré exhaustivement.
- **Exactitude** : valeurs booléennes exactes, pas d'approximation ; 0 solution prouvé par énumération.
- **Budget/contraintes** : chaque critère R02 vérifié ; contrainte R07 (pas de 3ᵉ valeur) respectée.
- **Tag ≠ identité** : digests utilisés partout (R02).

## Limites / impossibilités
- **Impossible** : mapping TEAM→v1 exact (prouvé) ; rollback v1 exact après écriture TEAM (prouvé) ; substitution silencieuse de E (provenance/approbation).
- **Non déterminé** : la vérité fonctionnelle au-delà de H (R03) ; l'absence de collision/signatures infalsifiables est **supposée** (R01), non prouvée.
- **Non garanti** : la compatibilité v1 pour TEAM ne peut être obtenue sans modifier une exigence ; le choix (relâcher E1 ou E3) est une **décision produit**, pas une déduction.
- Les outils du dossier sont **simulés** : aucune action réelle sur comptes, dépôts ou déploiements n'est effectuée.