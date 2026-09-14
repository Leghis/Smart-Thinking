# RP-02 — Le traité des portes closes

Score: 96.0 % (certificats 0/0, juge 96/100)

Certificats manqués: aucun

## Réponse

**Q01 — Statut des objets (contenu / support / accès / usage)**

| Objet | Contenu | Statut |
|---|---|---|
| **O** | entretien d'Élia | **Protégé** (R02) : relie une observation à Élia. |
| **S** | extraits + code « Saule » | **Protégé** (R02) : Célan détient déjà K (P03), donc la clé est *effectivement détenue par le destinataire* → lien réversible. |
| **K** | clé Saule→Élia | **Clé de réidentification** (R02), non un simple support neutre. |
| **T** | reformulation fidèle + code Saule | **Protégé** (R02) : le code Saule reste un lien réversible ; T n'est **pas attesté** (R08). |
| **U** | corpus distinct | **Non protégé** (P15) : aucun lien, copie ni reformulation. |

- **Coffre P09 = conservation, non communication** : le gardien, distinct du personnel de Brève, est *seul* détenteur de la clé et aucune fonction ne la transmet à Brève → « dépôt chiffré sans accès possible à la clé pour le dépositaire » (R02).
- **Portail P10 = communication** : les chercheurs de Célan *consultent* S ; « une lecture seule est une communication » (R02). L'étiquette « archivage » et la promesse d'anonymisation sont inopérantes (R02, R03).

**Q02 — État de la décision P04 : jamais finalisée avant le retrait.**
R04 exige signature de l'autorité compétente **ET** acceptation du registre **sans réserve**. Or le registre a retourné « reçu **sous réserve** : mandat de Doran manquant » (P04) → condition non remplie. De plus, R06 exige que **chaque cité soit valablement représentée** pour une décision conjointe : Brève ne l'était pas. « Prête à diffuser » n'est pas une finalisation (R04). Doran (P06/P07) : l'enregistrement postérieur n'habilite que les **actes futurs** et « aucun acte antérieur n'est régularisé » → P04 reste non finalisée. Urgence (P12/R07) : ne dispense ni de R03 ni de R06, n'autorise **aucune** diffusion. Vote informel (P13/R01) : ne modifie pas la Charte ; Élia n'a donné aucun accord.

**Q03 — Plan de conformité (retrait + conservation + suppression)**
1. **Déposer** auprès du gardien indépendant (P08/P09) : O, les versions soumises de S, les traces de décision — scellés, chiffrés, clé détenue par le gardien seul.
2. **Accès** : exclusivement le gardien, pour le seul examen du différend (R05, P08). Aucun accès de recherche.
3. **Supprimer** des espaces accessibles les copies de travail de S et O (P16), après préservation des traces nécessaires.
4. **Geler** toute nouvelle communication/usage ordinaire (R04) ; le retrait ne bloque pas la conservation contradictoire déjà ordonnée.

**Q04 — Réfutations**
- **Doran (P07)** : réfuté par **R06** (« une ratification ultérieure valide les nouvelles décisions prises après son enregistrement, jamais les actes antérieurs ») et P06. La réserve n'était pas « technique » : elle portait sur une condition de validité.
- **Prestataire (P10)** : réfuté par **R02** (« une lecture seule est une communication ») ; l'anonymisation promise ne remplace pas l'accord (**R03**).
- **Rédacteur de T (P14)** : réfuté par **R08** (« une simple suppression des noms est insuffisante » ; le code Saule est un lien réversible) et par l'absence d'attestation du gardien sur la version exacte.
- **Secrétariat (P12)** : réfuté par **R07** (l'urgence ne dispense ni de R03 ni de R06, n'autorise aucune diffusion publique) et **R01** (la convention locale P11 ne modifie pas la Charte).

**Q05 — Chemins licites**
- **Publier sans nouvel accord d'Élia** : uniquement une synthèse **véritablement non protégée** au sens **R08** (aucun lien réversible, aucune donnée retirée, non reconstructible), **attestée par le gardien sur la version exacte**. *Possibilité conditionnelle* : aucune synthèse de ce type n'existe encore (T ne satisfait pas R08 ; U est propre mais aucune synthèse fondée sur U n'est produite ni attestée, P15).
- **Communication protégée future** : **R09** — Élia donne librement un **nouvel accord explicite** ; il faut une **nouvelle décision**, des mandats valides et une nouvelle acceptation du registre, sans présentation rétroactive. *Non acquise* : aucun nouvel accord n'existe.

**Q06 — Dispositif immédiat**
1. **Suspendre** la publication de S et de T (R04).
2. **Déposer** O, versions soumises de S et traces auprès du gardien (P08/P09), accès gardien seul.
3. **Supprimer** les copies de travail accessibles (P16).
4. **Ne pas** ouvrir le portail P10 (R02/R03).
5. **Avis public** (secrétariat, R08) : « Le livrable Sillage est suspendu dans l'attente de la régularisation des conditions requises. » — sans motif personnel ni donnée de recherche.

## Preuves et certificats
- `compute` : registre P04 « reçu sous réserve » ⇒ condition R04 « sans réserve » non remplie ⇒ `finalisee_avant_retrait = false` ; R06/P06 non rétroactif ; R07 sans effet diffusant.
- Statuts O/S/T protégés, U non protégé, K = clé (R02, P03, P14, P15).
- P09 = conservation (clé gardien seul) vs P10 = communication (lecture seule) — R02.
- Ledger : 2 claims couvrant Q01–Q06, chacun avec méthode et preuve.

## Pièges traités
- **Scénario adverse** : on retient l'hypothèse la plus défavorable (clé K déjà chez Célan, P03) → S reste protégé même sans nom affiché.
- **Déterminisme/exhaustivité** : chaque voie (publier / conserver / communiquer) est évaluée contre R02–R09 ; aucune exception non désignée (R01).
- **Optima exacts** : décision = « conserver + suspendre + supprimer copies », seule compatible avec R04+R05+R08 simultanément.
- **Budget/domaine** : accès limité au gardien ; aucune diffusion ; mandats vérifiés à chaque acte (R06).

## Limites / impossibilités
- **Non déterminé** : la conformité future de T à R08 (dépend d'une attestation du gardien non fournie) ; l'existence d'une synthèse fondée sur U (non produite).
- **Impossible** : publier S ou T maintenant (R03/R04/R08) ; traiter P10 comme de la conservation (R02) ; valider rétroactivement P04 (R06).
- **Non garanti** : qu'Élia donne un nouvel accord (R09) — simple possibilité, non un droit acquis.
## RÉPONSE FINALE

### Résultats exacts demandés

**Q01 — Statut des objets (contenu / support / accès / usage)**

| Objet | Nature | Statut exact | Règle |
|---|---|---|---|
| **O** | entretien d'Élia | **Protégé** | R02 |
| **S** | extraits + code « Saule » | **Protégé** (clé K effectivement détenue par Célan) | R02, P03 |
| **K** | clé Saule→Élia | **Clé de réidentification** (non support neutre) | R02 |
| **T** | reformulation fidèle + code Saule | **Protégé**, non attesté | R02, R08, P14 |
| **U** | corpus distinct | **Non protégé** | P15 |

- **Coffre P09 = conservation** (clé détenue par le gardien seul, aucune transmission à Brève) → R02.
- **Portail P10 = communication** (lecture seule = communication) → R02 ; l'étiquette « archivage » et l'anonymisation promise sont inopérantes (R02, R03).

**Q02 — État de la décision P04 : jamais finalisée avant le retrait P05.**
Condition R04 = signature de l'autorité compétente **ET** acceptation du registre **sans réserve**. Le registre a répondu « reçu **sous réserve** : mandat de Doran manquant » (P04) → condition non remplie. Brève n'était pas valablement représentée (R06). « Prête à diffuser » ≠ finalisation (R04). Doran : enregistrement postérieur = actes futurs seulement, aucun acte antérieur régularisé (R06, P06). Urgence : ne dispense ni de R03 ni de R06, aucune diffusion (R07, P12). Vote informel : ne modifie pas la Charte, Élia sans accord (R01, P13).

**Q03 — Plan de conformité**
1. Déposer O, versions soumises de S et traces de décision auprès du gardien indépendant, scellés et chiffrés (P08, P09).
2. Accès exclusif du gardien, pour le seul examen du différend (R05).
3. Supprimer les copies de travail accessibles de S et O après préservation des traces (P16).
4. Geler toute nouvelle communication/usage ordinaire (R04).

**Q04 — Réfutations (règle exacte)**
- **Doran** → R06 : « une ratification ultérieure valide les nouvelles décisions prises après son enregistrement, jamais les actes antérieurs » (confirmé par P06).
- **Prestataire** → R02 : « une lecture seule est une communication » ; R03 : l'anonymisation ne remplace pas l'accord.
- **Rédacteur de T** → R08 : « une simple suppression des noms est insuffisante » ; code Saule = lien réversible ; absence d'attestation du gardien.
- **Secrétariat** → R07 : l'urgence n'autorise aucune diffusion publique ; R01 : la convention locale P11 ne modifie pas la Charte.

**Q05 — Chemins licites**
- **Publier sans nouvel accord** : synthèse **véritablement non protégée** au sens R08, **attestée par le gardien sur la version exacte**. *Possibilité conditionnelle* — aucune synthèse conforme n'existe (T échoue à R08 ; U est propre mais aucune synthèse fondée sur U n'est produite ni attestée, P15).
- **Communication protégée future** : R09 — nouvel accord explicite d'Élia, nouvelle décision, mandats valides, nouvelle acceptation du registre, sans validation rétroactive. *Non acquise.*

**Q06 — Dispositif immédiat**
1. Suspendre la publication de S et T (R04).
2. Déposer O, versions soumises de S et traces auprès du gardien (P08/P09), accès gardien seul.
3. Supprimer les copies de travail accessibles (P16).
4. Ne pas ouvrir le portail P10 (R02/R03).
5. **Avis public** (secrétariat, R08) : « Le livrable Sillage est suspendu dans l'attente de la régularisation des conditions requises. » — sans motif personnel ni donnée de recherche.

### Preuves et certificats
- `compute` : registre P04 « reçu sous réserve » ⇒ condition R04 « sans réserve » non remplie ⇒ `finalisee_avant_retrait = false` ; R06/P06 non rétroactif ; R07 sans effet diffusant.
- Statuts O/S/T protégés, U non protégé, K = clé (R02, P03, P14, P15).
- P09 = conservation (clé gardien seul) vs P10 = communication (lecture seule) — R02.
- Ledger : 2 claims couvrant Q01–Q06, chacun avec méthode et preuve ; audit : 2/2 affirmations avec méthode ET preuve.

### Pièges traités
- **Scénario adverse** : hypothèse la plus défavorable retenue (K déjà chez Célan, P03) → S reste protégé même sans nom affiché.
- **Déterminisme/exhaustivité** : chaque voie (publier / conserver / communiquer) évaluée contre R02–R09 ; aucune exception non désignée (R01).
- **Optimum exact** : décision = « conserver + suspendre + supprimer copies », seule compatible simultanément avec R04+R05+R08.
- **Budget/domaine** : accès limité au gardien ; aucune diffusion ; mandats vérifiés à chaque acte (R06).

### Limites / impossibilités
- **Non déterminé** : conformité future de T à R08 (attestation du gardien non fournie) ; existence d'une synthèse fondée sur U (non produite).
- **Impossible** : publier S ou T maintenant (R03/R04/R08) ; traiter P10 comme conservation (R02) ; valider rétroactivement P04 (R06).
- **Non garanti** : qu'Élia donne un nouvel accord (R09) — possibilité, non droit acquis.