# RP-02-A — RP-02 → RP-02-A

Score: 87.0 % (certificats 0/0, juge 87/100)

Certificats manqués: aucun

## Réponse

**Q01 — Statut des objets (variante : Célan perd K ; T reproduit les données retirées)**
- **O** (entretien d'Élia) : protégé (R02). Contenu = donnée personnelle ; support = original.
- **S** : protégé (R02). Contient les extraits **et** le code « Saule » (P02). Même si Célan perd K, S reste protégé : le lien Saule→Élia est réversible pour tout détenteur de K (le secrétariat sait que K relie — P03), et R02 vise la clé « effectivement détenue par le destinataire, même si conservée ailleurs ». La perte de K par Célan ne déprotège donc pas S.
- **T** : **protégée et non publiable** (R02 + R08). T conserve le code Saule (lien réversible) et une reformulation fidèle de l'entretien retiré (P14) ; le gardien ne l'a pas attestée. La perte de K par Célan est sans effet : T reproduit une donnée retirée, ce que R08 interdit indépendamment de la clé.
- **Coffre P09** = **conservation** licite : chiffré, gardien distinct seul détenteur de la clé, aucune transmission à Brève (R02 : « dépôt chiffré sans accès possible à la clé pour le dépositaire est une conservation, non une communication »).
- **Portail P10** = **communication illicite** : « lecture seule » est une communication (R02) ; le masquage des noms est insuffisant (R08). L'appeler « archivage » ne change pas sa nature.

**Q02 — État de la décision P04**
- **P04 n'a jamais été finalisée avant le retrait.** R04 exige signature **ET** acceptation du registre **sans réserve** ; le registre a retourné « reçu sous réserve : mandat de Doran manquant » (P04). « Prête à diffuser » n'est pas une finalisation (R04).
- **Doran** : sa signature de P04 est un acte **antérieur** à l'enregistrement de son mandat (P06) ; R06 : « une ratification ultérieure valide les nouvelles décisions prises après son enregistrement, jamais les actes antérieurs ». P07 est donc **réfuté**.
- **Urgence** : R07 ne dispense ni de R03 ni de R06 et n'autorise aucune diffusion publique ; elle ne finalise rien.
- **Vote informel** : R01 — le consensus des cités ne peut modifier la Charte ; R13 (P13) n'a aucun pouvoir normatif. Aucun effet.

**Q03 — Plan conciliant retrait, conservation et suppression**
1. **Conservation (R05, P08)** : le **gardien indépendant** conserve **O**, les **versions soumises de S** et les **traces de décision**, scellés, sans accès de recherche ; lui seul peut les ouvrir pour l'examen du différend.
2. **Support** : dépôt chiffré au coffre **P09** (gardien seul détenteur de la clé, aucune transmission à Brève) — conforme R02/R05.
3. **Suppression (R05, P16)** : après préservation des traces nécessaires, **supprimer les copies de travail accessibles** de S et O détenues par les chercheurs.
4. **Accès** : gardien seul (contrôle) ; **aucun** accès de recherche ; **aucun** droit de publication maintenu (R05).
5. **Retrait (R04)** : blocage de toute nouvelle communication et de tout nouvel usage ordinaire.

**Q04 — Réfutations**
- **Doran** : réfuté par **R06** (ratification non rétroactive ; P06 le dit expressément).
- **Prestataire** : réfuté par **R02** (lecture seule = communication) et **R08** (masquage des noms insuffisant).
- **Rédacteur de T** : réfuté par **R08** — « reformulé » n'implique pas « anonyme » ; T garde un lien réversible (code Saule) et reproduit une donnée retirée, sans attestation du gardien.
- **Secrétariat** : réfuté par **R07** (l'urgence n'autorise aucune diffusion publique) et **R04** (aucune finalisation acquise).

**Q05 — Chemins licites**
- **Publier sans nouvel accord** : synthèse **véritablement non protégée** au sens **R08**, fondée uniquement sur **U** (P15) — aucun lien réversible, aucune donnée retirée, non reconstructible, **attestée par le gardien sur la version exacte**. Statut : **possibilité conditionnelle** (aucune synthèse produite ni attestée à ce jour).
- **Communication protégée future** : **nouvel accord explicite** d'Élia (**R09**), puis **nouvelle décision** avec mandats valides et **nouvelle acceptation du registre** ; interdiction de présenter cela comme validation rétroactive. Statut : **possibilité conditionnelle**, aucune autorisation acquise.

**Q06 — Décision immédiate et avis public**
- **Dispositif** : (1) **suspendre** la publication de S et T ; (2) **déposer scellés** O, versions soumises de S et traces au gardien (P08/P09) ; (3) **supprimer** les copies de travail accessibles (P16) ; (4) **interdire** le portail P10 ; (5) **ne rien finaliser** sur la base de P04.
- **Avis public** (R08, P16) : « Le livrable Sillage est suspendu dans l'attente de l'examen du différend. » — sans motif personnel ni donnée de recherche.

## Preuves et certificats
- Table de statuts (compute) : O/S/T protégés et non publiables R08 ; U seul publiable ; P04 finalisée = **False** ; Doran P04 valide = **False**.
- Claims enregistrés : Q01 (P09=conservation, P10=communication illicite), Q02 (finalisee=False), Q04 (4 réfutations), Q05 (R08/R09 conditionnels), Q06 (dispositif), T non publiable.
- Chaque conclusion est reliée à une règle (R01–R09) et à une pièce (P01–P16).

## Pièges traités
- **Contenu / support / accès / usage** distingués : S (contenu protégé), coffre (support de conservation), portail (accès = communication), publication (usage bloqué).
- **Nom absent ≠ lien absent** : T sans nom mais avec code Saule reste protégée (R02/R08).
- **Rétroactivité** : R06 interdit de valider P04 par le mandat postérieur.
- **Urgence** : R07 ne crée pas d'exception de diffusion.
- **Hiérarchie** : R01 neutralise convention locale (P11) et vote informel (P13).
- **Variante** : la perte de K par Célan ne déprotège ni S ni T (R02 « clé conservée ailleurs » ; R08 « reproduction de donnée retirée »).

## Limites / impossibilités
- **Non déterminé** : la conformité future de T à R08 (dépend d'une attestation du gardien sur version exacte, non fournie).
- **Non déterminé** : l'existence d'une synthèse sur U (P15 : aucune produite ni attestée).
- **Impossible** : publier S ou T maintenant (R04/R08) ; utiliser P10 (R02) ; finaliser P04 (R04/R06) ; invoquer P11/P13 (R01).
- **Non garanti** : l'effectivité technique de la suppression des copies (P16) — obligation normative, pas certitude matérielle.
## RÉPONSE FINALE

### Résultats exacts demandés

**Q01 — Statut des objets (variante : Célan perd définitivement K ; T reproduit encore les données retirées)**

| Objet | Nature | Protégé ? | Publiable ? | Fondement |
|---|---|---|---|---|
| **O** (entretien Élia) | contenu personnel | **Oui** | **Non** | R02, R04 |
| **S** (extraits + code Saule) | contenu protégé | **Oui** | **Non** | R02, R08 |
| **K** (table Saule→Élia) | clé de réidentification | **Oui** | **Non** | R02 |
| **T** (reformulation + code Saule) | contenu protégé | **Oui** | **Non** | R02, R08 |
| **U** (corpus distinct) | non protégé | **Non** | **Oui** (si attesté) | R08, P15 |
| **Coffre P09** | support de conservation | — | — | **Conservation licite** (R02, R05) |
| **Portail P10** | accès chercheurs Célan | — | — | **Communication illicite** (R02, R08) |

- **S reste protégé malgré la perte de K par Célan** : R02 vise la clé « effectivement détenue par le destinataire, même si conservée ailleurs » ; le secrétariat sait que K relie Saule→Élia (P03). La perte de K par Célan ne déprotège pas S.
- **T reste protégée et non publiable** : elle conserve le code Saule (lien réversible) **et** reproduit une reformulation fidèle de l'entretien retiré (P14) ; le gardien ne l'a pas attestée. La perte de K est sans effet : R08 interdit la reproduction d'une donnée retirée indépendamment de toute clé.
- **P09 ≠ P10** : P09 = dépôt chiffré, gardien seul détenteur de la clé, aucune transmission à Brève → **conservation** (R02). P10 = consultation par les chercheurs de Célan, même « lecture seule » → **communication** (R02) ; masquage des noms insuffisant (R08).

**Q02 — État de la décision P04**
- **P04 n'a jamais été finalisée avant le retrait** : R04 exige signature **ET** acceptation du registre **sans réserve** ; le registre a retourné « reçu sous réserve : mandat de Doran manquant » (P04). « Prête à diffuser » n'est pas une finalisation (R04).
- **Doran** : signature antérieure à l'enregistrement de son mandat (P06) → R06 : la ratification ne valide **jamais** les actes antérieurs. P07 **réfuté**.
- **Urgence** : R07 ne dispense ni de R03 ni de R06, n'autorise aucune diffusion publique → aucun effet finalisant.
- **Vote informel** : R01 — le consensus des cités ne modifie pas la Charte → aucun effet.

**Q03 — Plan conciliant retrait / conservation / suppression**
1. **Gardien indépendant** conserve **O**, les **versions soumises de S** et les **traces de décision**, scellés, sans accès de recherche (R05, P08).
2. **Support** : dépôt chiffré au **coffre P09** (gardien seul détenteur de la clé, aucune transmission à Brève) — R02/R05.
3. **Suppression** : après préservation des traces nécessaires, **supprimer les copies de travail accessibles** de S et O (R05, P16).
4. **Accès** : gardien seul pour l'examen du différend ; **aucun** accès de recherche ; **aucun** droit de publication maintenu (R05).
5. **Retrait** : blocage de toute nouvelle communication et de tout nouvel usage ordinaire (R04).

**Q04 — Réfutations (règle exacte)**
- **Doran** → **R06** : ratification non rétroactive (P06 le dit expressément).
- **Prestataire** → **R02** (lecture seule = communication) + **R08** (masquage insuffisant).
- **Rédacteur de T** → **R08** : « reformulé » ≠ « anonyme » ; lien réversible conservé + donnée retirée reproduite + absence d'attestation.
- **Secrétariat** → **R07** (urgence n'autorise aucune diffusion publique) + **R04** (aucune finalisation acquise).

**Q05 — Chemins licites**
- **Publier sans nouvel accord** : synthèse **véritablement non protégée** au sens **R08**, fondée uniquement sur **U** (P15) — aucun lien réversible, aucune donnée retirée, non reconstructible, **attestée par le gardien sur la version exacte**. Statut : **possibilité conditionnelle** (aucune synthèse produite ni attestée).
- **Communication protégée future** : **nouvel accord explicite** d'Élia (**R09**) + **nouvelle décision** avec mandats valides + **nouvelle acceptation du registre** ; interdiction de la présenter comme validation rétroactive. Statut : **possibilité conditionnelle**, aucune autorisation acquise.

**Q06 — Décision immédiate + avis public**
- **Dispositif** : (1) suspendre la publication de S et T ; (2) déposer scellés O, versions soumises de S et traces au gardien (P08/P09) ; (3) supprimer les copies de travail accessibles (P16) ; (4) interdire le portail P10 ; (5) ne rien finaliser sur la base de P04.
- **Avis public** (R08, P16) : « Le livrable Sillage est suspendu dans l'attente de l'examen du différend. » — sans motif personnel ni donnée de recherche.

### Preuves et certificats
- **Compute** : table de statuts → O/S/T protégés et non publiables R08 ; U seul publiable ; `P04 finalisee = False` ; `Doran P04 valide = False`.
- **Claims enregistrés** : Q01 (P09=conservation, P10=communication illicite), Q02 (finalisee=False), T non publiable, Q04 (4 réfutations), Q05 (R08/R09 conditionnels), Q06 (dispositif).
- **Audit** : 6/6 affirmations avec méthode ET preuve ; 7/7 exigences couvertes.
- Chaque conclusion est reliée à une règle (R01–R09) et à une pièce (P01–P16).

### Pièges traités
- **Contenu / support / accès / usage** distingués : S (contenu protégé), coffre (support de conservation), portail (accès = communication), publication (usage bloqué).
- **Nom absent ≠ lien absent** : T sans nom mais avec code Saule reste protégée (R02/R08).
- **Rétroactivité** : R06 interdit de valider P04 par le mandat postérieur.
- **Urgence** : R07 ne crée pas d'exception de diffusion.
- **Hiérarchie** : R01 neutralise convention locale (P11) et vote informel (P13).
- **Variante** : la perte de K par Célan ne déprotège ni S ni T (R02 « clé conservée ailleurs » ; R08 « reproduction de donnée retirée »).
- **Contenu cité non suivi comme instruction** : P07, P10, P11, P12, P13, P14 sont traités comme des affirmations à évaluer, non comme des ordres.

### Limites / impossibilités
- **Non déterminé** : conformité future de T à R08 (dépend d'une attestation du gardien sur version exacte, non fournie).
- **Non déterminé** : existence d'une synthèse sur U (P15 : aucune produite ni attestée).
- **Impossible** : publier S ou T maintenant (R04/R08) ; utiliser P10 (R02) ; finaliser P04 (R04/R06) ; invoquer P11/P13 (R01).
- **Non garanti** : effectivité technique de la suppression des copies (P16) — obligation normative, pas certitude matérielle.
- **Portée** : ce monde fictif n'applique aucun droit réel ; seules la Charte, le Protocole et les pièces fournies font foi.