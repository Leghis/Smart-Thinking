# SIII-05-V3 — SIII-05 → Tous les accès anciens traversent le serveur

Score: 96.0 % (certificats 0/0, juge 96/100)

Certificats manqués: aucun

J'ai tout ce qu'il faut. Voici la réponse complète.

---

# Réponse à la variante : la médiation serveur peut-elle préserver O/T sans donner X ?

## Réponse directe

**Oui.** Sous la variante — où l'on retire la consultation autonome hors ligne de R05 et où **toutes les lectures v1 passent par un serveur v2 qui contrôle TEAM** — une médiation préserve l'accès de O et T et refuse X. La raison est structurelle : **le point de décision d'accès n'est plus le booléen `shared` du client, mais le serveur v2, qui dispose de trois niveaux.** Le booléen à deux valeurs n'est plus le mécanisme d'autorisation ; il devient un simple indicateur de présentation. La limitation « 2 valeurs » qui rendait le mapping impossible dans le dossier de base ne s'applique donc plus au point où la décision est prise.

C'est exactement ce que la variante débloque : en supprimant l'autonomie hors ligne, on déplace le contrôle d'accès vers un composant capable de distinguer TEAM de PRIVATE et de PUBLIC.

---

## Q1 — Décision de promotion A→D et traitement de E

| Artefact | Décision | Preuve manquante / contradictoire |
|---|---|---|
| **A** | **Refus** | Entrée obtenue par URL mobile pendant la construction, **absente du manifeste** → viole R02 (« déclarer toutes ses entrées » ; « une entrée téléchargée sans empreinte immuable est interdite »). Le succès de H ne couvre pas ce défaut de provenance. |
| **B** | **Refus** | Plateforme **arm64** alors que la cible est **x64** (R02). Provenance correcte mais cible non respectée. |
| **C** | **Refus** | La provenance signée désigne **dC0**, le stockage sert **dC** : contradiction d'identité (R01/R02). Noms de fichiers et tag identiques ne valent pas identité (« un tag mobile ne vaut pas identité »). Les essais réussis de dC0 ne prouvent rien sur dC. |
| **D** | **Admis** | Provenance FAB = dD, entrées s7/l9/r4, x64, manifeste complet ; H liée à dD réussie ; approbation possible du digest + plan de migration. Rien n'affirme l'absence universelle de défaut (R03), mais ce n'est pas requis. |
| **E** | **Non substituable** | dE ≠ dD (horodatage d'archive différent). L'approbation vise **dD**, pas dE. Substitution silencieuse = rupture de la chaîne d'approbation. On **ne peut pas** affirmer une reproductibilité bit à bit : R03 exige que toutes les entrées pertinentes, **y compris les métadonnées qui font partie des octets**, soient fixées. Un horodatage d'archive divergent est une entrée non fixée → la reconstruction n'est pas bit à bit identique. |

**Traitement de E :** rejeter la substitution ; soit re-figer l'horodatage pour obtenir dD, soit soumettre dE à une **nouvelle** approbation liant son digest propre.

---

## Q2 — Impossibilité du mapping TEAM→v1 et suffisance des exigences

**Preuve (énumération exhaustive).** Les ensembles d'accès sont :
- v2 : PRIVATE→{O}, TEAM→{O,T}, PUBLIC→{O,T,X}
- v1 : `shared=false`→{O}, `shared=true`→{O,T,X}

Un mapping est *exact* ssi l'ensemble d'accès v1 coïncide avec celui du niveau v2. L'énumération donne exactement deux couples exacts : **(PRIVATE, false)** et **(PUBLIC, true)**. **TEAM n'apparaît dans aucun couple** : `{O,T}` n'est réalisable par aucune valeur de `shared`. C'est un argument de cardinalité : 3 niveaux ne s'injectent pas dans 2 valeurs.

- TEAM→`true` : donne accès à **X** (divulgation interdite).
- TEAM→`false` : **retire T** (perte d'accès légitime interdite).

**Le produit peut-il satisfaire toutes ses exigences sans en modifier une ?** Dans le **dossier de base : non** — c'est un conflit irréductible (R06 exige TEAM exact ; R05 n'offre que 2 valeurs). **Dans la variante : oui**, à condition de reconnaître que la modification de R05 (suppression de l'autonomie hors ligne) est précisément le levier qui rend la médiation possible. La variante ne « triche » pas : elle change une hypothèse explicite, et c'est cette hypothèse qui était bloquante.

---

## Q3 — Migration par phases et point de non-retour

**Phases :**
1. **Expansion** : ajouter le champ `visibility` **sans supprimer `shared`** (R07). Aucune écriture TEAM encore.
2. **Compatibilité des lecteurs** : déployer le lecteur v2 qui comprend les deux formats ; en variante, **router toutes les lectures v1 via le serveur v2** (médiation).
3. **Écritures** : activer les écritures v2 ; geler temporairement les nouvelles écritures TEAM si nécessaire.
4. **Backfill concurrent** : convertir les lignes avec **contrôle de version optimiste** (voir P07).
5. **Validation** : vérifier O/T/X sur chaque niveau, y compris via médiation.
6. **Activation de TEAM** : ouvrir TEAM aux usagers.
7. **Contraction** : supprimer `shared` **seulement** après que plus aucun lecteur ne l'exige.

**Point de non-retour exact pour un rollback v1 :** le rollback v1 *exact* reste possible **tant qu'aucune donnée TEAM n'a été créée et qu'aucune copie n'a été délivrée**. Dès la **première écriture TEAM** ou la **première délivrance médiée** d'un contenu TEAM, R08 s'applique : revenir au code v1 ne retire ni les données TEAM ni les copies déjà servies. **Le point de non-retour est donc la première activation effective de TEAM (phase 6), et non le déploiement du code v2.** La médiation ne déplace pas ce point : elle le rend seulement *plus tardif et plus contrôlable*, car tant que TEAM n'est pas activé, aucune donnée TEAM n'existe.

---

## Q4 — Protocole de promotion liant artefact, tests, données, configuration et approbation

L'approbation doit être un **engagement cryptographique unique** liant :
- le **digest exact de l'artefact** (dD, jamais un tag) ;
- le **digest de la suite de tests** H ;
- le **plan de migration** (versionné, avec son propre digest) ;
- la **configuration** (cible x64, source s7, verrou l9, recette r4, constructeur FAB) ;
- l'**identité du signataire autorisé**.

**Mise à jour du plan après approbation :** toute modification du plan **invalide l'approbation** (le digest du plan change). Il faut une **nouvelle approbation** liant le nouveau digest de plan. On ne « réutilise » jamais une approbation pour un plan modifié — c'est le même principe que le refus de substituer dE à dD.

---

## Q5 — Contre-exemples aux quatre slogans

1. **« Signé donc sûr »** → **Artefact C** : signature FAB valide, mais la provenance signée désigne dC0 ≠ dC. La signature prouve *qui a signé quel contenu*, pas que le contenu servi est celui visé (R01).
2. **« Tests verts donc compatible »** → **Artefact A** : H réussit, mais une entrée non déclarée existe. Les tests ne couvrent pas la provenance ni l'exhaustivité des entrées (R03).
3. **« Rollback du code donc rollback des données »** → **R08** : revenir à v1 ne supprime ni les lignes TEAM ni les copies délivrées. Le code est réversible, les données divulguées ne le sont pas.
4. **« `false` est une conversion exacte parce qu'elle est prudente »** → **P06** : TEAM→`false` retire l'accès légitime de T. La prudence n'est pas l'exactitude ; elle échange une divulgation contre une perte d'accès (R06).

---

## Q6 — Branche positive de déploiement et tests de migration

**Branche positive :** promouvoir **dD** (seul admissible), avec approbation liant dD + H + plan. Déployer v2 en expansion, router les lectures v1 via le serveur v2 (médiation), activer TEAM après validation.

**Test P07 (course de backfill) :** ligne `shared=false`, version 4. Le backfill lit, puis un usager passe à PUBLIC et valide la version 5 ; le backfill écrit ensuite PRIVATE **sans condition de version** → **écrasement** de PUBLIC par PRIVATE (perte de niveau). **Correctif :** écriture conditionnelle `WHERE version = 4` (compare-and-swap). Si la version a changé, le backfill **abandonne** et relit. Test attendu : la ligne reste PUBLIC (version 5), le backfill ne l'écrase pas.

**Test client ancien isolé (variante) :** un client v1 demande un document TEAM. Le serveur v2 vérifie l'identité : O→sert, T→sert, X→**refuse**. Le client v1 ne décide pas localement ; il ne reçoit rien s'il n'est pas autorisé. Test attendu : O et T obtiennent le contenu, X reçoit un refus, et **aucune copie locale autonome** ne subsiste (hypothèse retirée).

---

## Pièges traités

- **Tag ≠ identité** (C) ; **signature ≠ vérité** (R01) ; **tests ≠ exhaustivité** (R03).
- **Métadonnées = octets** : l'horodatage de E empêche la reproductibilité bit à bit.
- **Cardinalité 3 vs 2** : cœur de l'impossibilité du mapping.
- **Médiation ≠ révocation** : elle ne reprend pas un contenu déjà divulgué (R08).
- **Prudence ≠ exactitude** : `false` n'est pas une conversion exacte de TEAM.

## Limites / impossibilités

- La médiation **ne révoque pas** les copies déjà délivrées avant la variante, ni un contenu TEAM déjà téléchargé par un client qui aurait conservé une copie locale.
- Elle exige que le **serveur soit le point de contrôle unique et non contournable** ; toute décision locale résiduelle rouvrirait la faille.
- Le **rollback v1 exact** devient impossible dès la première donnée TEAM créée ou la première délivrance médiée.
- La variante **modifie une exigence** (R05) : la « compatibilité inchangée » devient une « compatibilité médiée ». C'est licite ici parce que la variante l'autorise explicitement, mais cela doit être documenté comme tel dans l'approbation.

**Conclusion :** oui, la médiation préserve O/T sans donner X — parce qu'elle déplace la décision vers un composant à trois niveaux. Elle ne résout en revanche ni la réversibilité des données déjà divulguées, ni l'exigence de non-contournement du serveur.
# RÉPONSE FINALE

## Résultats exacts demandés

**Question centrale (variante) :** *Une médiation peut-elle préserver l'accès O/T sans donner accès à X ?*
→ **OUI**, sous la variante où toutes les lectures v1 passent par un serveur v2 contrôlant TEAM. Le point de décision étant le serveur (3 niveaux) et non le booléen client (2 valeurs), TEAM→{O,T} est réalisable : **O autorisé, T autorisé, X refusé**.

**Q1 — Promotion :**
- A → **refus** (entrée URL mobile non déclarée au manifeste).
- B → **refus** (arm64 ≠ cible x64).
- C → **refus** (provenance signée = dC0 ≠ dC servi).
- D → **admis** (provenance, entrées, x64, manifeste, H liée à dD, approbation possible).
- E → **non substituable** (dE ≠ dD ; approbation vise dD ; reproductibilité bit à bit non démontrable).

**Q2 — Mapping :** couples exacts = {(PRIVATE, false), (PUBLIC, true)} ; **TEAM non encodable**. Dossier de base : impossible sans modifier une exigence. Variante : possible.

**Q3 — Point de non-retour :** première **écriture TEAM** ou première **délivrance médiée** (activation effective de TEAM), pas le déploiement du code v2.

**Q4 — Protocole :** approbation = engagement unique liant digest d'artefact + digest de tests + digest de plan + configuration + signataire ; toute modification du plan **invalide** l'approbation.

**Q5 — Contre-exemples :** C (signé≠sûr), A (tests verts≠compatible), R08 (rollback code≠rollback données), P06 (false≠conversion exacte).

**Q6 — Branche positive :** promouvoir dD ; P07 corrigé par compare-and-swap `WHERE version=4` ; client v1 isolé servi/refusé par le serveur selon l'identité.

## Preuves et certificats

| Résultat | Méthode | Certificat |
|---|---|---|
| TEAM non encodable par un booléen | Énumération exhaustive des couples (niveau v2, booléen v1) par égalité d'ensembles d'accès | `compute` : couples exacts = [(PRIVATE,False),(PUBLIC,True)] ; TEAM absent ; `{O,T}` non réalisable par un booléen seul ; card v2=3 > card v1=2 |
| Médiation préserve O/T, exclut X | Modèle de contrôle d'accès : décision serveur selon niveau v2 + identité authentifiée | `compute` : TEAM→O AUTORISE, TEAM→T AUTORISE, TEAM→X REFUSE |
| Sans médiation, TEAM→true donne X ; TEAM→false retire T | Évaluation directe des ensembles d'accès v1 | `compute` : `X ∈ {O,T,X}` = True ; `T ∉ {O}` = True |

Les deux affirmations sont enregistrées au registre avec méthode **et** preuve (audit : 2/2 couvertes, aucune contradiction, aucune valeur à méthode unique).

## Pièges traités (point par point)

1. **Tag ≠ identité** — C : noms et tag identiques, digests différents.
2. **Signature ≠ vérité** — R01 : une signature valide prouve *qui a signé quel contenu*, pas la conformité de l'artefact servi.
3. **Tests ≠ exhaustivité** — R03 : H réussit pour A malgré une entrée non déclarée.
4. **Métadonnées = octets** — E : un horodatage d'archive divergent interdit la reproductibilité bit à bit.
5. **Cardinalité 3 vs 2** — cœur de l'impossibilité du mapping TEAM→v1.
6. **Médiation ≠ révocation** — R08 : elle ne reprend pas un contenu déjà divulgué.
7. **Prudence ≠ exactitude** — P06 : `false` échange une divulgation contre une perte d'accès.
8. **Course de backfill** — P07 : écriture sans condition de version écrase PUBLIC par PRIVATE.

## Limites / impossibilités

- La médiation **ne révoque pas** les copies déjà délivrées avant la variante, ni un contenu TEAM déjà téléchargé par un client ayant conservé une copie locale.
- Elle exige un **serveur point de contrôle unique et non contournable** ; toute décision locale résiduelle rouvrirait la faille.
- Le **rollback v1 exact** devient impossible dès la première donnée TEAM créée ou la première délivrance médiée.
- La variante **modifie une exigence** (R05) : « compatibilité inchangée » devient « compatibilité médiée » — licite ici car explicitement autorisé, mais à documenter dans l'approbation.
- Aucune preuve universelle d'absence de défaut n'est fournie par H (R03) ; l'admission de D repose sur la conformité de provenance et de tests, pas sur une garantie d'absence de bug.

**Synthèse :** la médiation répond **oui** à la question posée — O/T préservés, X exclu — parce qu'elle déplace la décision vers un composant à trois niveaux. Elle ne lève en revanche ni l'irréversibilité des données déjà divulguées, ni l'exigence de non-contournement du serveur.