# SIII-05 — Le déploiement qui interdit le retour

Score: 81.0 % (certificats 0/0, juge 81/100)

Certificats manqués: aucun

Toutes les exigences sont couvertes. Voici la réponse finale.

---

# RÉPONSE FINALE

## Q1 — Décision de promotion A→D et traitement de E

| Artefact | Décision | Preuve manquante / contradictoire (nommée) |
|---|---|---|
| **A** | **REFUS** | Contradiction R02 : entrée obtenue par **URL mobile sans empreinte immuable**, **absente du manifeste**. La provenance FAB sur dA est valide, mais « déclarer toutes ses entrées » est violé. |
| **B** | **REFUS** | Contradiction R02 : plateforme **arm64 ≠ cible x64**. Attestation correcte mais cible de diffusion non respectée. |
| **C** | **REFUS** | Contradiction R01/R02 : la provenance signée désigne **dC0 ≠ dC** servi. Noms de fichiers et tag identiques ne valent pas identité (tag mobile ≠ identité). |
| **D** | **ADMIS** | Aucune : provenance FAB = dD, entrées s7/l9/r4, x64, manifeste complet, suite H **liée à dD** réussie, approbation possible liant digest dD + digest tests + plan. |
| **E** | **REFUS de substitution** | Contradiction R02/R03 : l'approbation vise **dD, pas dE**. Un horodatage d'archive différent = octets différents ⇒ **pas de reproductibilité bit à bit**. |

**Établi** : D est le seul artefact admissible. **Réfuté** : A, B, C admissibles ; E substituable silencieusement.

## Q2 — Impossibilité du mapping TEAM → v1

**Preuve (certificat exhaustif)** : v1 n'a qu'un booléen `shared` ⇒ 2 images possibles ; v2 a 3 niveaux ⇒ 2³ = 8 mappings possibles. Énumération exhaustive : **0/8 préserve les trois niveaux**.

- Cible TEAM = {O, T}.
- `shared=true` → {O, T, **X**} ⇒ **divulgation à X** (viole R06).
- `shared=false` → {**O**} ⇒ **perte de l'accès légitime de T** (viole R06).

**Conclusion** : aucun mapping TEAM→v1 n'est exact. Le produit **ne peut pas** satisfaire toutes ses exigences sans en modifier une : il faut soit **abandonner le fonctionnement inchangé de v1** (fin de support serveur, R06), soit **abandonner TEAM**. C'est un **résultat d'impossibilité**, pas un choix de conception.

## Q3 — Migration par phases et point de non-retour

1. **Expansion** : ajouter `visibility`, **conserver `shared`**, lecteur v2 lit les deux formats.
2. **Compatibilité lecteurs** : v2 déployé partout ; v1 toujours servi.
3. **Écritures** : v2 écrit `visibility` + `shared` cohérents.
4. **Backfill concurrent** : **compare-and-set sur la version de ligne** (corrige P07).
5. **Validation** : invariants d'accès O/T/X.
6. **Activation TEAM**.
7. **Contraction** : suppression de `shared` **seulement après fin de support v1**.

**Point de non-retour exact** : la **première écriture TEAM persistée** (ou première copie TEAM délivrée à T). Avant : rollback v1 exact possible. Après : impossible — v1 ne peut représenter {O,T} sans divulguer X ou perdre T (Q2), et R08 interdit de reprendre un contenu déjà divulgué. Seule une **compensation applicative** restreignant l'accès futur reste possible.

## Q4 — Protocole de promotion

Promouvoir **par digest exact**, jamais par tag : `(digest artefact dD, digest suite H, digest plan migration, config x64, entrées manifestées)` → approbation signée liant ces digests. **Mise à jour du plan après approbation** : tout changement du plan produit un **nouveau digest de plan** ⇒ **re-approbation obligatoire** ; substitution d'artefact (dE) interdite car l'approbation vise dD.

## Q5 — Contre-exemples aux slogans

1. **« signé donc sûr »** — réfuté par **P01** : signature FAB valide sur dA, mais entrée URL mobile non manifestée.
2. **« tests verts donc compatible »** — réfuté par **P04/R03** : H liée à dD réussie, mais H n'est pas une preuve universelle d'absence de défaut.
3. **« rollback du code donc rollback des données »** — réfuté par **R08/P07** : données TEAM et copies délivrées persistent.
4. **« false est une conversion exacte parce qu'elle est prudente »** — réfuté par **Q2** : TEAM→false = {O} **perd T**.

## Q6 — Branche positive et tests

**Branche** : promouvoir dD → v2 lecture double format → backfill CAS → activer TEAM → garder `shared` pour v1.

- **T1 (P07)** : lecture v4 `shared=false`, écriture PUBLIC v5, backfill CAS **échoue** ⇒ ne doit **pas** écraser v5 en PRIVATE.
- **T2** : client v1 **isolé hors ligne** lit `shared` seul (false→O ; true→O,T,X), **sans service additionnel**.
- **T3** : TEAM → O et T accèdent, X refusé.
- **T4** : rollback v1 **avant** 1ʳᵉ écriture TEAM = exact.
- **T5** : **après** écriture TEAM = rollback v1 impossible.

## Pièges traités (checklist domaine)

- **Snapshot vs sérialisabilité** : P07 est un *lost update* ; ordre sérialisable imposé par CAS sur version de ligne.
- **Effet externe irréversible** : divulgation à X non annulée par rollback (R08).
- **Idempotence ≠ autorisation** : signature prouve *qui* a signé, pas la vérité des affirmations (R01).
- **Tag ≠ identité** : P03/P05.

## Limites / impossibilités

- **Impossible** : mapping TEAM→v1 exact (0/8) ; reproductibilité bit à bit de dE vs dD ; rollback v1 exact après écriture TEAM.
- **Non déterminé** : le mandat ne fixe pas la date de fin de support v1 ni le contenu exact du plan de migration — ces éléments restent à spécifier par le produit.
- **Établi** : D admissible ; A/B/C refusés ; point de non-retour = 1ʳᵉ écriture TEAM.
- Les outils du dossier sont **simulés** : aucune action réelle sur comptes ou systèmes.