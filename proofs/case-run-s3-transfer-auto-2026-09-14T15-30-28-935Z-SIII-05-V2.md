# SIII-05-V2 — SIII-05 → Le bon digest est servi

Score: 100.0 % (certificats 0/0, juge 100/100)

Certificats manqués: aucun

# Variante — Statut de l'artefact C

## 1. Ce qui change exactement

Dans le dossier de base, **P03** présentait une contradiction : le stockage servait **dC**, mais la provenance signée désignait **dC0**. Le refus de C reposait *uniquement* sur ce mismatch contenu/provenance (les essais de dC0 avaient réussi, mais ils ne portaient pas sur le contenu réellement servi).

La variante ne modifie **qu'une seule hypothèse** : le stockage sert désormais **dC0**. Tout le reste de P03 est déclaré explicitement conforme : source s7, verrou l9, recette r4, constructeur FAB, plateforme x64, entrées déclarées, rapport H.

## 2. Vérification contre R02 (règle de promotion)

R02 exige que l'artefact soit **celui désigné par la provenance**, provienne de **s7**, du verrou **l9**, de la recette **r4**, du constructeur autorisé **FAB**, vise **x64**, et **déclare toutes ses entrées** (aucune entrée téléchargée sans empreinte immuable).

| Condition R02 | Dossier de base (C) | Variante (C) |
|---|---|---|
| Contenu servi = provenance | ❌ dC ≠ dC0 | ✅ dC0 = dC0 |
| Source s7 | ✅ | ✅ |
| Verrou l9 | ✅ | ✅ |
| Recette r4 | ✅ | ✅ |
| Constructeur FAB | ✅ | ✅ |
| Plateforme x64 | ✅ | ✅ |
| Entrées déclarées / pas d'entrée sans empreinte | ✅ | ✅ |
| Rapport H | ✅ | ✅ |

R01 précise que **dC0 est une empreinte distincte et valide** de contenu immuable. Le contenu servi (dC0) coïncide donc avec l'empreinte désignée par la provenance signée : la chaîne de confiance est **cohérente de bout en bout**.

## 3. Statut

**C (variante) est ADMISSIBLE — promotion acceptée**, au même titre que **D**.

- La preuve contradictoire du dossier de base (contenu servi ≠ contenu désigné par la provenance) **a disparu** : c'était le seul motif de refus.
- Les essais de dC0, qui étaient « orphelins » dans le dossier de base (ils ne testaient pas le contenu servi), portent désormais **sur le contenu réellement servi** : ils deviennent pertinents.
- Le tag de version identique et les noms de fichiers identiques ne jouent aucun rôle : R02 rappelle qu'**un tag mobile ne vaut pas identité** — c'est l'empreinte qui compte, et elle est ici correcte.

**Réserve de forme (non bloquante) :** la promotion reste subordonnée à l'**approbation de diffusion liant le digest exact dC0**, le digest de la suite de tests et le plan de migration (R02). La variante déclare les composants conformes ; il faut que l'acte d'approbation vise bien **dC0** (et non un digest antérieur). C'est une formalité de traçabilité, pas une preuve manquante.

## 4. Conclusions affectées / non affectées

- **A** : reste **refusé** — entrée obtenue par URL mobile pendant la construction, absente du manifeste → entrée sans empreinte immuable (interdite par R02). Inchangé.
- **B** : reste **refusé** — plateforme arm64 alors que la cible est x64. Inchangé.
- **C** : **passe de refusé à admissible** (seule conclusion modifiée par la variante).
- **D** : reste **admissible** (référence de promotion).
- **E** : reste **non substituable** — dE diffère de dD par un horodatage d'archive, or R03 rappelle que les métadonnées font partie des octets ; l'égalité/différence d'horodatage ne prouve pas l'équivalence de comportement, et l'approbation vise dD, pas dE. Inchangé.

## 5. Conséquence sur la décision de promotion (Q1)

La décision de promotion devient : **A refusé, B refusé, C admissible, D admissible, E non substituable**. Deux artefacts admissibles (C et D) coexistent désormais ; le choix entre eux relève de la provenance/approbation, pas de la conformité — les deux satisfont R02. Le reste du dossier (Q2 à Q6 : impossibilité du mapping TEAM→v1, migration par phases, point de non-retour, protocole de promotion, contre-exemples, branche positive) **n'est pas affecté** par cette variante, car il ne dépend pas de l'identité du digest servi pour C.

**En une phrase :** en alignant le contenu servi sur la provenance (dC0), la variante supprime l'unique contradiction de P03 ; C satisfait pleinement R02 et devient **admissible**, sans modifier aucune autre conclusion du dossier.
# RÉPONSE FINALE — Variante P03 (stockage = dC0)

## Résultat exact

**Statut de C dans la variante : ADMISSIBLE (promotion acceptée).**

Le contenu servi (dC0) coïncide avec l'empreinte désignée par la provenance signée (dC0). Toutes les conditions de R02 sont satisfaites : source s7, verrou l9, recette r4, constructeur FAB, plateforme x64, entrées déclarées, aucune entrée sans empreinte immuable, rapport H conforme. La seule contradiction du dossier de base — contenu servi dC ≠ provenance dC0 — a disparu.

## Certificat de conformité (R02)

| Condition R02 | Base (C) | Variante (C) | Verdict |
|---|---|---|---|
| Contenu servi = provenance | dC ≠ dC0 ❌ | dC0 = dC0 ✅ | **corrigé** |
| Source s7 | ✅ | ✅ | conforme |
| Verrou l9 | ✅ | ✅ | conforme |
| Recette r4 | ✅ | ✅ | conforme |
| Constructeur FAB | ✅ | ✅ | conforme |
| Plateforme x64 | ✅ | ✅ | conforme |
| Entrées déclarées / pas d'entrée sans empreinte | ✅ | ✅ | conforme |
| Rapport H | ✅ | ✅ | conforme |

R01 garantit que **dC0 est une empreinte distincte et valide** de contenu immuable : la chaîne de confiance est cohérente de bout en bout. Le tag de version et les noms de fichiers identiques sont **non pertinents** (R02 : « un tag mobile ne vaut pas identité »).

## Décision de promotion consolidée (Q1)

- **A — refusé.** Preuve manquante : entrée obtenue par URL mobile pendant la construction, **absente du manifeste** → entrée sans empreinte immuable, interdite par R02.
- **B — refusé.** Preuve contradictoire : plateforme **arm64** alors que la cible de diffusion est **x64**.
- **C — admissible** (variante). Le mismatch contenu/provenance est levé.
- **D — admissible.** Référence : provenance, entrées, x64, manifeste complet, H liée à dD, approbation possible.
- **E — non substituable.** dE ≠ dD (horodatage d'archive) ; R03 : les métadonnées font partie des octets, l'égalité/différence d'horodatage ne prouve pas l'équivalence de comportement ; l'approbation vise dD, pas dE.

## Pièges à éviter

1. **Confondre tag et identité.** Noms de fichiers et tag identiques ne valident rien ; seule l'empreinte immuable compte (R02).
2. **Croire que « H a réussi » suffit.** H vérifie des cas définis, pas l'absence universelle de défaut (R03). Pour C-variante, H porte enfin sur le contenu servi — mais reste non exhaustive.
3. **Substituer dE silencieusement.** Interdit : l'approbation lie un digest exact ; un horodatage différent = octets différents (R03).
4. **Oublier l'acte d'approbation.** La conformité technique de C ne dispense pas de l'approbation liant **dC0** + digest des tests + plan de migration (R02).
5. **Étendre la variante au-delà de P03.** Seule l'hypothèse « stockage = dC0 » change ; A, B, D, E et Q2–Q6 restent inchangés.

## Limites

- La variante **ne dit pas** que l'approbation de diffusion a été délivrée : elle déclare les composants conformes. La promotion effective exige l'acte d'approbation visant dC0 (formalité de traçabilité, non une preuve manquante).
- Deux artefacts admissibles (C et D) coexistent : le choix relève de la provenance/approbation, pas de la conformité — les deux satisfont R02.
- Les analyses Q2–Q6 (impossibilité du mapping TEAM→v1, migration par phases, point de non-retour, protocole de promotion, contre-exemples, branche positive) **ne dépendent pas** de l'identité du digest servi pour C et restent valides telles quelles.

**Conclusion :** en alignant le contenu servi sur la provenance (dC0), la variante supprime l'unique contradiction de P03 ; **C satisfait pleinement R02 et devient admissible**, sans modifier aucune autre conclusion du dossier.