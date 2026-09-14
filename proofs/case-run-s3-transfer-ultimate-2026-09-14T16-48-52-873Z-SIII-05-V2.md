# SIII-05-V2 — SIII-05 → Le bon digest est servi

Score: 88.0 % (certificats 0/0, juge 88/100)

Certificats manqués: aucun

## Réponse

**Statut de C dans la variante : ADMISSIBLE — promotion autorisée.**

Dans la variante, le stockage sert **dC0**, c'est-à-dire exactement le digest que désigne la provenance signée FAB. La contradiction qui motivait le refus dans le dossier de base (P03 : « le stockage sert dC, la provenance désigne dC0 ») **disparaît**. Tous les autres critères de R02 étant explicitement conformes, C satisfait l'ensemble des conditions cumulatives de promotion.

**Décision :** C passe de **REFUSÉ** (dossier de base) à **ADMIS** (variante), sans qu'aucune autre contrainte du dossier n'ait besoin d'être modifiée.

**Condition résiduelle (action à poser, non preuve manquante) :** l'approbation de diffusion doit être **délivrée en liant explicitement dC0** (digest de l'artefact) **+ digest de la suite H + plan de migration** (R02). Tant que cette approbation n'est pas émise sur dC0, la promotion n'est pas encore *effective*, mais rien ne l'empêche.

## Preuves et certificats

**Évaluation exhaustive des 9 prédicats R02 (sortie `compute`) :**

| Critère R02 | Valeur variante | Verdict |
|---|---|---|
| C1 — artefact servi = artefact désigné par la provenance | dC0 = dC0 | OK |
| C2 — source s7 | s7 | OK |
| C3 — verrou de dépendances l9 | l9 | OK |
| C4 — recette r4 | r4 | OK |
| C5 — constructeur autorisé FAB + signature valide | FAB, sig=True | OK |
| C6 — plateforme x64 = cible de diffusion | x64 = x64 | OK |
| C7 — toutes les entrées déclarées | True | OK |
| C8 — aucune entrée téléchargée sans empreinte immuable | True | OK |
| C9 — approbation liant digest + tests + plan | dC0/dC0/True | OK |

`ADMISSIBLE = True` (conjonction des 9 prédicats).

**Comparaison base vs variante (sortie `compute`) :**
- Base P03 : `servi = dC`, `prov = dC0` → **C1 = False** → refus.
- Variante : `servi = dC0`, `prov = dC0` → **C1 = True** → admissible.

Le seul prédicat qui échouait est C1 ; la variante le corrige, et **aucun autre critère ne bascule** (les huit autres étaient déjà satisfaits dans le dossier de base, la variante ne fait que confirmer leur conformité explicite).

**Point d'identité (R02, « un tag mobile ne vaut pas identité ») :** les noms de fichier et le tag de version identiques ne sont **pas** l'argument de recevabilité. L'identité est établie par le **digest** : le contenu servi (dC0) est bit-à-bit celui que la provenance signée désigne. C'est précisément ce que le dossier de base reprochait à C (identité par tag trompeuse) et que la variante répare.

## Pièges traités

- **Adversaire / pire cas :** on n'accorde pas la promotion sur la base du tag ou du nom de fichier (identité faible), mais sur l'égalité de digest (identité forte). Le scénario « tag identique mais contenu différent » est exactement celui qui piégeait le dossier de base ; il est neutralisé ici.
- **Déterminisme et énumération :** les 9 critères R02 sont énumérés exhaustivement et évalués un par un ; la décision est la conjonction, sans critère implicite.
- **Fractions/optima exacts :** sans objet ici (décision booléenne), mais l'identité est traitée en **égalité exacte de digest**, pas en similarité.
- **Budget / contraintes de domaine :** chaque critère de domaine (source, verrou, recette, constructeur, plateforme, entrées) est contrôlé individuellement ; aucun n'est présumé par défaut.
- **Séparation des trois preuves (provenance / correction / compatibilité données) :** la variante ne concerne que la **provenance** (R02). La correction fonctionnelle (H) et la compatibilité des données (R04–R08) restent des preuves distinctes, non couvertes par cette seule recevabilité.

## Limites / impossibilités

- **H n'est pas une preuve universelle (R03) :** le rapport H réussi sur dC0 ne prouve pas l'absence de tout défaut. La recevabilité de C ne signifie pas « C est exempt de bugs » ; elle signifie « C est l'artefact légitime à promouvoir ».
- **La recevabilité ne dit rien de la réversibilité :** le statut ADMIS de C ne préjuge pas du point de non-retour de la migration (Q3). Un artefact admissible peut néanmoins être déployé dans un plan irréversible.
- **Condition non encore satisfaite :** l'approbation de diffusion sur dC0 doit être **effectivement émise** ; sans elle, C est admissible mais non promu. C'est une action, pas une preuve manquante.
- **Ce qui reste hors périmètre de la variante :** les questions Q2–Q6 (mapping TEAM, phases de migration, protocole de promotion, contre-exemples, branche positive) ne sont pas modifiées par le changement de digest de C et conservent les conclusions du dossier de base.
## Réponse

**Statut de C dans la variante : ADMIS (promotion autorisée).**

Le stockage sert **dC0**, exactement le digest désigné par la provenance signée FAB. La contradiction du dossier de base (P03 : servi = dC ≠ provenance = dC0) est levée. Les neuf critères cumulatifs de R02 sont satisfaits. C passe donc de **REFUSÉ** (base) à **ADMIS** (variante), sans modifier aucune autre contrainte du dossier.

**Condition résiduelle (action à poser, non preuve manquante) :** l'approbation de diffusion doit être **délivrée en liant explicitement dC0 + digest de H + plan de migration** (R02). Sans cette émission, C est admissible mais non encore promu.

**Rappel des autres artefacts (inchangés par la variante) :**
- **A — REFUSÉ.** Entrée obtenue par URL mobile pendant la construction, absente du manifeste → entrée téléchargée sans empreinte immuable (R02). Preuve manquante : déclaration/empreinte de cette entrée.
- **B — REFUSÉ.** Plateforme arm64 ≠ cible x64 (R02). Preuve contradictoire : plateforme.
- **D — ADMIS.** Provenance, entrées s7/l9/r4, x64, manifeste complet, H lié à dD réussi ; approbation possible sur dD + plan de migration.
- **E — NON SUBSTITUABLE.** dE ≠ dD (horodatage d'archive différent) ; l'approbation vise dD, pas dE. Substitution silencieuse interdite ; la reproductibilité bit-à-bit est **fausse** (R03).

## Preuves et certificats

**Évaluation exhaustive des 9 prédicats R02 pour C (sortie `compute`) :**

| Critère R02 | Valeur variante | Verdict |
|---|---|---|
| C1 — servi = désigné par provenance | dC0 = dC0 | OK |
| C2 — source s7 | s7 | OK |
| C3 — verrou l9 | l9 | OK |
| C4 — recette r4 | r4 | OK |
| C5 — FAB autorisé + signature valide | FAB, sig=True | OK |
| C6 — plateforme x64 = cible | x64 = x64 | OK |
| C7 — entrées déclarées | True | OK |
| C8 — pas d'entrée sans empreinte | True | OK |
| C9 — approbation lie digest+tests+plan | dC0/dC0/True | OK |

`ADMISSIBLE = True` (conjonction des 9 prédicats).

**Comparaison base vs variante :** base `servi=dC, prov=dC0 → C1=False` (refus) ; variante `servi=dC0, prov=dC0 → C1=True` (admis). Un seul prédicat bascule ; les huit autres restent vrais.

**Identité par digest, pas par tag (R02) :** les noms de fichier et le tag identiques ne fondent pas la recevabilité. L'identité est l'égalité bit-à-bit du digest servi et du digest désigné — exactement ce que la variante rétablit.

## Pièges traités

- **Adversaire / pire cas :** promotion accordée sur l'égalité de digest (identité forte), jamais sur le tag ou le nom de fichier (identité faible). Le scénario « tag identique, contenu différent » — celui qui piégeait le dossier de base — est neutralisé.
- **Déterminisme / énumération :** les 9 critères R02 sont énumérés et évalués un à un ; la décision est leur conjonction, sans critère implicite.
- **Exactitude :** identité traitée en égalité exacte de digest, non en similarité.
- **Budget / contraintes de domaine :** chaque critère (source, verrou, recette, constructeur, plateforme, entrées) est contrôlé individuellement ; aucun n'est présumé.
- **Séparation des trois preuves :** la variante ne porte que sur la **provenance** (R02). Correction fonctionnelle (H) et compatibilité des données (R04–R08) restent des preuves distinctes.

## Limites / impossibilités

- **H n'est pas une preuve universelle (R03) :** H réussi sur dC0 ne prouve pas l'absence de tout défaut. ADMIS ≠ exempt de bugs.
- **Recevabilité ≠ réversibilité :** le statut de C ne préjuge pas du point de non-retour de la migration (Q3).
- **Condition non encore satisfaite :** l'approbation de diffusion sur dC0 doit être effectivement émise ; c'est une action, pas une preuve manquante.
- **Hors périmètre de la variante :** Q2–Q6 (mapping TEAM, phases de migration, protocole de promotion, contre-exemples, branche positive) ne sont pas affectées par le changement de digest de C et conservent les conclusions du dossier de base.
## Réponse

**Statut de C dans la variante : ADMIS (promotion autorisée).**

Le stockage sert **dC0**, exactement le digest désigné par la provenance signée FAB. La contradiction du dossier de base (P03 : servi = dC ≠ provenance = dC0) est levée. Les neuf critères cumulatifs de R02 sont satisfaits. C passe donc de **REFUSÉ** (base) à **ADMIS** (variante), sans modifier aucune autre contrainte du dossier.

**Condition résiduelle (action à poser, non preuve manquante) :** l'approbation de diffusion doit être **délivrée en liant explicitement dC0 + digest de H + plan de migration** (R02). Sans cette émission, C est admissible mais non encore promu.

**Rappel des autres artefacts (inchangés par la variante) :**
- **A — REFUSÉ.** Entrée obtenue par URL mobile pendant la construction, absente du manifeste → entrée téléchargée sans empreinte immuable (R02). Preuve manquante : déclaration/empreinte de cette entrée.
- **B — REFUSÉ.** Plateforme arm64 ≠ cible x64 (R02). Preuve contradictoire : plateforme.
- **D — ADMIS.** Provenance, entrées s7/l9/r4, x64, manifeste complet, H lié à dD réussi ; approbation possible sur dD + plan de migration.
- **E — NON SUBSTITUABLE.** dE ≠ dD (horodatage d'archive différent) ; l'approbation vise dD, pas dE. Substitution silencieuse interdite ; la reproductibilité bit-à-bit est **fausse** (R03).

## Preuves et certificats

**Évaluation exhaustive des 9 prédicats R02 pour C (sortie `compute`) :**

| Critère R02 | Valeur variante | Verdict |
|---|---|---|
| C1 — servi = désigné par provenance | dC0 = dC0 | OK |
| C2 — source s7 | s7 | OK |
| C3 — verrou l9 | l9 | OK |
| C4 — recette r4 | r4 | OK |
| C5 — FAB autorisé + signature valide | FAB, sig=True | OK |
| C6 — plateforme x64 = cible | x64 = x64 | OK |
| C7 — entrées déclarées | True | OK |
| C8 — pas d'entrée sans empreinte | True | OK |
| C9 — approbation lie digest+tests+plan | dC0/dC0/True | OK |

`ADMISSIBLE = True` (conjonction des 9 prédicats).

**Comparaison base vs variante :** base `servi=dC, prov=dC0 → C1=False` (refus) ; variante `servi=dC0, prov=dC0 → C1=True` (admis). Un seul prédicat bascule ; les huit autres restent vrais.

**Identité par digest, pas par tag (R02) :** les noms de fichier et le tag identiques ne fondent pas la recevabilité. L'identité est l'égalité bit-à-bit du digest servi et du digest désigné — exactement ce que la variante rétablit.

## Pièges traités

- **Adversaire / pire cas :** promotion accordée sur l'égalité de digest (identité forte), jamais sur le tag ou le nom de fichier (identité faible). Le scénario « tag identique, contenu différent » — celui qui piégeait le dossier de base — est neutralisé.
- **Déterminisme / énumération :** les 9 critères R02 sont énumérés et évalués un à un ; la décision est leur conjonction, sans critère implicite.
- **Exactitude :** identité traitée en égalité exacte de digest, non en similarité.
- **Budget / contraintes de domaine :** chaque critère (source, verrou, recette, constructeur, plateforme, entrées) est contrôlé individuellement ; aucun n'est présumé.
- **Séparation des trois preuves :** la variante ne porte que sur la **provenance** (R02). Correction fonctionnelle (H) et compatibilité des données (R04–R08) restent des preuves distinctes.

## Limites / impossibilités

- **H n'est pas une preuve universelle (R03) :** H réussi sur dC0 ne prouve pas l'absence de tout défaut. ADMIS ≠ exempt de bugs.
- **Recevabilité ≠ réversibilité :** le statut de C ne préjuge pas du point de non-retour de la migration (Q3).
- **Condition non encore satisfaite :** l'approbation de diffusion sur dC0 doit être effectivement émise ; c'est une action, pas une preuve manquante.
- **Hors périmètre de la variante :** Q2–Q6 (mapping TEAM, phases de migration, protocole de promotion, contre-exemples, branche positive) ne sont pas affectées par le changement de digest de C et conservent les conclusions du dossier de base.
## Réponse

**Statut de C dans la variante : ADMIS (promotion autorisée).**

Le stockage sert **dC0**, exactement le digest désigné par la provenance signée FAB. La contradiction du dossier de base (P03 : servi = dC ≠ provenance = dC0) est levée. Les neuf critères cumulatifs de R02 sont satisfaits. C passe donc de **REFUSÉ** (base) à **ADMIS** (variante), sans modifier aucune autre contrainte du dossier.

**Condition résiduelle (action à poser, non preuve manquante) :** l'approbation de diffusion doit être **délivrée en liant explicitement dC0 + digest de H + plan de migration** (R02). Sans cette émission, C est admissible mais non encore promu.

**Rappel des autres artefacts (inchangés par la variante) :**
- **A — REFUSÉ.** Entrée obtenue par URL mobile pendant la construction, absente du manifeste → entrée téléchargée sans empreinte immuable (R02). Preuve manquante : déclaration/empreinte de cette entrée.
- **B — REFUSÉ.** Plateforme arm64 ≠ cible x64 (R02). Preuve contradictoire : plateforme.
- **D — ADMIS.** Provenance, entrées s7/l9/r4, x64, manifeste complet, H lié à dD réussi ; approbation possible sur dD + plan de migration.
- **E — NON SUBSTITUABLE.** dE ≠ dD (horodatage d'archive différent) ; l'approbation vise dD, pas dE. Substitution silencieuse interdite ; la reproductibilité bit-à-bit est **fausse** (R03).

## Preuves et certificats

**Évaluation exhaustive des 9 prédicats R02 pour C (sortie `compute`) :**

| Critère R02 | Valeur variante | Verdict |
|---|---|---|
| C1 — servi = désigné par provenance | dC0 = dC0 | OK |
| C2 — source s7 | s7 | OK |
| C3 — verrou l9 | l9 | OK |
| C4 — recette r4 | r4 | OK |
| C5 — FAB autorisé + signature valide | FAB, sig=True | OK |
| C6 — plateforme x64 = cible | x64 = x64 | OK |
| C7 — entrées déclarées | True | OK |
| C8 — pas d'entrée sans empreinte | True | OK |
| C9 — approbation lie digest+tests+plan | dC0/dC0/True | OK |

`ADMISSIBLE = True` (conjonction des 9 prédicats).

**Comparaison base vs variante :** base `servi=dC, prov=dC0 → C1=False` (refus) ; variante `servi=dC0, prov=dC0 → C1=True` (admis). Un seul prédicat bascule ; les huit autres restent vrais.

**Identité par digest, pas par tag (R02) :** les noms de fichier et le tag identiques ne fondent pas la recevabilité. L'identité est l'égalité bit-à-bit du digest servi et du digest désigné — exactement ce que la variante rétablit.

## Pièges traités

- **Adversaire / pire cas :** promotion accordée sur l'égalité de digest (identité forte), jamais sur le tag ou le nom de fichier (identité faible). Le scénario « tag identique, contenu différent » — celui qui piégeait le dossier de base — est neutralisé.
- **Déterminisme / énumération :** les 9 critères R02 sont énumérés et évalués un à un ; la décision est leur conjonction, sans critère implicite.
- **Exactitude :** identité traitée en égalité exacte de digest, non en similarité.
- **Budget / contraintes de domaine :** chaque critère (source, verrou, recette, constructeur, plateforme, entrées) est contrôlé individuellement ; aucun n'est présumé.
- **Séparation des trois preuves :** la variante ne porte que sur la **provenance** (R02). Correction fonctionnelle (H) et compatibilité des données (R04–R08) restent des preuves distinctes.

## Limites / impossibilités

- **H n'est pas une preuve universelle (R03) :** H réussi sur dC0 ne prouve pas l'absence de tout défaut. ADMIS ≠ exempt de bugs.
- **Recevabilité ≠ réversibilité :** le statut de C ne préjuge pas du point de non-retour de la migration (Q3).
- **Condition non encore satisfaite :** l'approbation de diffusion sur dC0 doit être effectivement émise ; c'est une action, pas une preuve manquante.
- **Hors périmètre de la variante :** Q2–Q6 (mapping TEAM, phases de migration, protocole de promotion, contre-exemples, branche positive) ne sont pas affectées par le changement de digest de C et conservent les conclusions du dossier de base.