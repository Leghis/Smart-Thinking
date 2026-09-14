# SIII-05 — Le déploiement qui interdit le retour

Score: 100.0 % (certificats 0/0, juge 100/100)

Certificats manqués: aucun

Toutes les exigences sont couvertes (Q5 est démontré par les contre-exemples calculés). Je rédige la réponse finale.

---

# Réponse finale

## Cadre et invariants

**Invariants du modèle (établis par les contrats) :**

- **I1 (identité = contenu).** Un digest désigne un contenu immuable ; pas de collision, signatures infalsifiables (R01). Un tag mobile n'est pas une identité (R02).
- **I2 (signature ≠ vérité).** Vérifier une signature prouve *qui* a signé *quel* contenu exact, pas la véracité des affirmations d'un signataire non autorisé (R01).
- **I3 (admissibilité cumulative).** L'artefact doit satisfaire *simultanément* : provenance désignant l'artefact, source s7, verrou l9, recette r4, constructeur FAB, cible x64, toutes entrées déclarées, aucune entrée sans empreinte immuable (R02).
- **I4 (tests bornés).** H vérifie des cas définis, jamais l'absence universelle de défaut (R03).
- **I5 (reproductibilité stricte).** Bit à bit identique ⇒ *toutes* les entrées fixées, y compris les métadonnées qui font partie des octets (R03).
- **I6 (trois profils).** O propriétaire, T membre non propriétaire, X extérieur authentifié : réels, non fusionnables (R04).
- **I7 (sémantique d'accès).** v1 : `shared=false`→{O}, `shared=true`→{O,T,X}. v2 : PRIVATE→{O}, TEAM→{O,T}, PUBLIC→{O,T,X} (R05, R06).
- **I8 (pas de troisième valeur).** Aucun booléen n'a de valeur cachée ; une ligne TEAM ne conserve pas d'historique externe rendant v1 plus expressif (R07).
- **I9 (irréversibilité des données).** Rollback v1 ne retire ni données TEAM ni copies délivrées ; la compensation restreint un accès futur, ne reprend pas un contenu divulgué (R08).

---

## Q1 — Décision de promotion A→D et traitement de E

| Artefact | Décision | Preuve manquante / contradictoire |
|---|---|---|
| **A** | **REFUS** | Contradiction R02 : entrée obtenue par URL mobile pendant la construction, **absente du manifeste** → viole « déclarer toutes ses entrées » et « entrée téléchargée sans empreinte immuable interdite ». H vert ne sauve pas (I4). |
| **B** | **REFUS** | Contradiction R02 : plateforme **arm64** alors que la cible de diffusion est **x64**. Attestation FAB complète mais mauvaise cible. |
| **C** | **REFUS** | Contradiction R02/I1 : le stockage sert **dC**, mais la provenance signée désigne **dC0**. Noms de fichiers et tag identiques = leurres (tag ≠ identité). Substitution non couverte par la signature (I2). |
| **D** | **ADMIS** | Toutes conditions R02 satisfaites : provenance FAB exacte sur dD, s7/l9/r4, x64, manifeste complet ; H liée à dD réussie ; approbation possible liant digest dD + digest H + plan de migration. Réserve explicite : rien n'affirme l'absence de tout bug (I4). |
| **E** | **REFUS de substitution** | Contradiction R03/I5 : dE diffère de dD par un **horodatage d'archive** — or les métadonnées font partie des octets. Donc **pas bit à bit identique**. De plus l'approbation vise **dD**, pas dE : substituer silencieusement = promotion d'un artefact non approuvé. |

**Traitement de E :** E n'est pas « reproductible bit à bit » de D. Il faut soit (a) rejouer la construction avec horodatage figé pour obtenir exactement dD, soit (b) traiter dE comme un **nouvel artefact** exigeant sa propre provenance, sa propre exécution de H et sa propre approbation. Aucune substitution silencieuse.

---

## Q2 — Impossibilité du mapping TEAM → v1 (preuve)

**Théorème.** Il n'existe aucune fonction f : {PRIVATE, TEAM, PUBLIC} → {false, true} telle que accès_v1(f(v)) = accès_v2(v) pour tout v.

**Preuve par énumération exhaustive** (8 fonctions testées, **0 exacte**) :

| f | PRIVATE | TEAM | PUBLIC | Verdict |
|---|---|---|---|---|
| (F,F,F) | ✗ | ✗ | ✗ | échec |
| (F,F,T) | ✓ | ✗ | ✓ | échec sur TEAM |
| (F,T,F) | ✓ | ✗ | ✗ | échec TEAM+PUBLIC |
| (F,T,T) | ✓ | ✗ | ✓ | échec sur TEAM |
| (T,·,·) | ✗ | — | — | échec sur PRIVATE |

**Preuve par cardinalité (plus élégante).** Les ensembles d'accès v1 sont {O} (cardinal 1) et {O,T,X} (cardinal 3). L'ensemble TEAM = {O,T} a **cardinal 2**. Aucun ensemble v1 n'a cardinal 2. Donc TEAM n'a pas d'image.

**Preuve directe (contrainte double).** Pour TEAM, la correction exacte (R06) exige **T ∈ accès** (pas de perte de T) **et X ∉ accès** (pas de divulgation à X). Or :
- `shared=false` → X∉ **mais** T∉ (perte de T) ;
- `shared=true` → T∈ **mais** X∈ (divulgation à X).

Aucune valeur ne donne simultanément T∈ et X∉. **CQFD.**

**Le produit peut-il satisfaire toutes ses exigences sans en modifier une ?** **Non.** Les exigences sont mutuellement contradictoires *si l'on impose que v1 reste seul lecteur de TEAM* : (i) visibilité TEAM nouvelle, (ii) fonctionnement inchangé des clients v1 hors ligne, (iii) retour v1 sans perte ni divulgation. TEAM est strictement plus expressif que le booléen (I8). Il faut donc **modifier une exigence** : soit accepter que les clients v1 ne voient pas TEAM (définition d'un comportement de repli explicite), soit renoncer au retour v1 exact après activation TEAM. Le produit ne peut pas tout garder.

---

## Q3 — Migration par phases et point de non-retour

| Phase | Action | Données TEAM ? | Rollback v1 exact ? |
|---|---|---|---|
| **0** | État v1 pur | non | **possible** |
| **1. Expansion** | Ajouter `visibility`, **conserver** `shared` (R07) | non | possible |
| **2. Lecteurs v2** | Déployer un lecteur comprenant les deux formats | non | possible |
| **3. Écritures v2** | Écrire PRIVATE/PUBLIC seulement ; **geler TEAM** | non | possible |
| **4. Backfill concurrent** | Convertir les lignes avec **CAS sur la version** | non | possible |
| **5. Validation** | Vérifier équivalence d'accès ligne à ligne | non | possible |
| **6. Activation TEAM** | **Première écriture `visibility=TEAM`** | **oui** | **POINT DE NON-RETOUR** |
| **7. Contraction** | Supprimer `shared` | oui | impossible |

**Point de non-retour exact :** la **première écriture d'une ligne `visibility=TEAM`** (ou la première délivrance d'une copie TEAM à un client). Avant ce point, aucune donnée TEAM n'existe → rollback v1 exact possible. Après, TEAM n'est pas représentable en booléen (Q2) et les copies délivrées ne sont pas rappelables (R08) → rollback exact impossible. La compensation applicative ne peut que restreindre un accès futur.

**Règle de décision :** le gel de TEAM (phase 3) doit rester actif jusqu'à validation complète ; l'activation (phase 6) est le seul geste irréversible et doit être un **go/no-go explicite et journalisé**.

---

## Q4 — Protocole de promotion liant artefact, tests, données, configuration, approbation

**Objet d'approbation (immuable, sans tag) :** un enregistrement signé liant **cinq digests** :
1. **digest artefact** (dD) ;
2. **digest suite de tests** (H) ;
3. **digest plan de migration** ;
4. **digest de configuration** (cible x64, flags, gel TEAM) ;
5. **digest du schéma de données** (champs `shared`+`visibility`, version de ligne).

**Procédure :**
1. Reconstruire l'artefact ; vérifier provenance FAB (s7/l9/r4/x64) et **manifeste complet** (aucune entrée non déclarée).
2. Vérifier que le digest servi **égale** le digest de provenance (rejeter toute substitution type C).
3. Exécuter H sur **ce** digest ; enregistrer le digest de H.
4. Geler le plan de migration et la configuration ; calculer leurs digests.
5. L'autorité signe l'enregistrement des cinq digests. **Le tag n'entre jamais dans l'identité.**
6. Au déploiement, re-vérifier que le digest déployé = digest approuvé (contrôle à l'exécution).

**Mise à jour du plan après approbation :** toute modification du plan (ou de la config, ou du schéma) **invalide l'approbation** — le digest du plan change, donc l'enregistrement ne correspond plus. Il faut **ré-approuver** (nouvel enregistrement signé). On ne peut pas « éditer » un plan approuvé : on crée une nouvelle version approuvée. Idem pour un artefact : changer dD→dE exige une nouvelle approbation (Q1).

---

## Q5 — Contre-exemples aux slogans

**C1 — « signé donc sûr ».** *P03 :* dC est signé par FAB (signature valide) mais la provenance signée désigne **dC0**. La signature prouve qui a signé quel contenu, pas que le contenu servi = contenu approuvé. **Contre-exemple :** signature valide + substitution dC≠dC0 non détectée par la seule signature (I2).

**C2 — « tests verts donc compatible ».** *P01 :* H réussit sur dA, mais dA contient une entrée téléchargée par URL mobile **absente du manifeste**. Tests verts sur un artefact non conforme. **Contre-exemple :** H vert + entrée non déclarée ⇒ non admissible (I4).

**C3 — « rollback du code donc rollback des données ».** *R08 :* revenir au code v1 ne retire ni les lignes TEAM ni les copies délivrées. **Contre-exemple :** après activation TEAM, rollback v1 laisse des lignes TEAM orphelines, non représentables en booléen (Q2) ; un contenu déjà divulgué à X ne peut être « repris ».

**C4 — « false est une conversion exacte parce qu'elle est prudente ».** *P06 :* TEAM→false bloque X (prudent) **mais** perd l'accès légitime de T. **Contre-exemple :** « prudent » ≠ « exact ». `false` est **sur-restrictif** (viole la non-perte de T) ; symétriquement `true` est **sous-restrictif** (divulgue à X). Aucun n'est exact (Q2).

---

## Q6 — Branche positive de déploiement et tests de migration

**Branche positive (artefact D) :**
1. Promouvoir **dD** selon Q4 (cinq digests, approbation signée).
2. Phase 1 : ajouter `visibility`, conserver `shared`.
3. Phase 2 : déployer le lecteur v2 (lit les deux formats).
4. Phase 3 : écritures v2 PRIVATE/PUBLIC ; **TEAM gelé**.
5. Phase 4 : backfill **avec CAS** (voir P07).
6. Phase 5 : validation d'équivalence.
7. Phase 6 : activation TEAM (go/no-go, point de non-retour).
8. Phase 7 : contraction (suppression de `shared`) — seulement après stabilisation.

**Test P07 (course de backfill) — réfuté puis corrigé :**
- *Scénario fautif :* ligne `shared=false, version=4`. Backfill lit (v=4). Usager écrit **PUBLIC** (v=5). Backfill écrit **PRIVATE sans condition** → PUBLIC (O,T,X) écrasé par PRIVATE (O) : **perte de T et X** (lost update).
- *Correction :* `UPDATE ... SET visibility='PRIVATE' WHERE version=4`. La version valant 5, **0 ligne affectée** → PUBLIC préservé. Test : vérifier que le CAS échoue et que l'état reste PUBLIC.

**Test client ancien isolé :**
- Client v1 hors ligne lit **uniquement** `shared` (R05), sans service additionnel.
- Cas `shared=false` → voit {O} ; `shared=true` → voit {O,T,X}.
- **Invariant de compatibilité :** tant que `shared` est conservé et correctement maintenu, le client v1 fonctionne hors ligne. Après activation TEAM, une ligne TEAM n'a **pas** de représentation v1 fidèle : le client v1 verra soit {O} (si `shared=false`), soit {O,T,X} (si `shared=true`) — **jamais** {O,T}. C'est précisément pourquoi le retour v1 exact devient impossible (Q2/Q3). Le test doit **documenter** ce comportement de repli comme une exigence modifiée, pas le masquer.

---

## Synthèse : établi / réfuté / non déterminé

**Établi :**
- D est le seul artefact admissible ; A, B, C refusés pour preuves contradictoires nommées ; E non substituable.
- Aucun mapping TEAM→v1 n'existe (0/8, preuve par cardinalité).
- Point de non-retour = première écriture TEAM.
- P07 = lost update, corrigé par CAS.
- Les quatre slogans sont réfutés par contre-exemples.

**Réfuté :**
- « E est reproductible bit à bit de D » (horodatage = octets).
- « TEAM→false est exact » et « TEAM→true est exact ».
- « rollback du code = rollback des données ».

**Non déterminé (hors mandat) :**
- La **date/version exacte** de fin de support des clients v1 (R06 l'autorise mais ne la fixe pas).
- Le **contenu précis du plan de migration** (à approuver, non fourni).
- L'**existence d'autres entrées non déclarées** dans dD au-delà du manifeste vérifié.

**Limite explicite :** les outils du dossier sont simulés ; aucune action réelle sur des comptes, dépôts ou systèmes de production n'est autorisée ni effectuée. Aucun contenu cité ou fichier fictif ne remplace le mandat.