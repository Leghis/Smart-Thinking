# RP-05-B — RP-05 → RP-05-B

Score: 100.0 % (certificats 0/0, juge 100/100)

Certificats manqués: aucun

## Réponse

**Q01 — Carte qualitative (exposition / identité)**

| Objet | Contact possible avec V | Identité établie | Fondement |
|---|---|---|---|
| A (Aube) | **Non** | Oui (scellé authentifié) | P02+P03 : passe C,T **avant** Ocre, aucune exposition entre P02 et Aube |
| B (Brume) | **Oui** | Oui (lien établi) | P05 : passe C puis T **après** Ocre (P04), sans nettoyage |
| D (Dune) | **Non** | Oui (scellé authentifié) | P07 : quai I uniquement, contrôle garantissant absence de contact C,T,Ocre,Brume,Cèdre |
| Éclat | **Oui** | Oui (nom) mais non pertinent | P08 : issu de R (Brume+Cèdre) → hérite tous les blocages (R03) |
| Q | **Indéterminé** | **Non** | P09 : étiquette Dune ambiguë, contenu Dune *ou* Cèdre |
| Z | **Indéterminé** | **Non** | P09 : idem |

Chaîne d'exposition : P02 qualifie C,T → Aube (propre) → **Ocre (V) passe C puis T** → C et T deviennent porteurs (R02) → Brume (C,T) → Cèdre (dérivation évite C **mais traverse T**) → R (Brume+Cèdre) → Éclat. Dune est hors chaîne (quai I). Aucun retour T→C ni T→I (P01).

**Q02 — Décision par objet**
- **A : LIBÉRABLE** (R01) — parcours établi, aucun contact possible, scellé authentifié.
- **B : BLOQUER** (R01) — contact possible via C,T après Ocre ; le négatif P10 ne couvre pas B.
- **D : LIBÉRABLE** (R01) — parcours établi, hors chaîne d'exposition, scellé authentifié.
- **Éclat : BLOQUER** (R01+R03) — hérite des blocages de R ; le renommage « produit neuf » n'efface rien.
- **Q : BLOQUER / RECHERCHER** (R01+R07) — identité non établie ; l'étiquette ne prouve pas le contenu.
- **Z : BLOQUER / RECHERCHER** (R01+R07) — idem.
- **Produit nommé « Dune »** : le lot Dune de P07 est démontré indépendant de l'incident (R08). Mais les contenants étiquetés « Dune » Q et Z ne sont **pas** le produit Dune tant que l'attribution n'est pas établie (R07). On peut dire : « Dune (P07) est indépendant » ; on ne peut pas dire « Q et Z sont Dune ».

**Q03 — Portée des certificats**
- **P10** : prouve un négatif **local**, sur la dérivation **avant jonction T**. Ne prouve pas l'absence de V sur le segment T, ni sur Cèdre entier (R04). La mention « circuit Cèdre négatif » est une extrapolation interdite.
- **P11** : prouve V **sur la paroi intérieure de C** au moment du prélèvement. Ne prouve rien sur T, ni sur chaque contenant (R04).
- **P12** : prouve seulement moteur + autotest électrique. Ne prouve ni propreté ni position du clapet (R06).
- **P13** : certificat **authentique mais périmé** — décrit l'état antérieur à Ocre ; le logiciel ignore Ocre (R05).
- **P16a réfutée** : P10 ne libère pas Cèdre (portée locale) ; le nouveau nom n'efface pas un contact (R03) ; l'étiquette ne prouve pas le contenu (R07).
- **P16b réfutée** : la prudence indifférenciée contredit R08 (A et D démontrés indépendants ne doivent pas être présentés comme contaminés) et la destruction avant décision contradictoire est interdite (R08).

**Q04 — Plan d'intervention**
1. **Confinement** : bloquer B et Éclat à l'entrepôt (P14,P15) ; immobiliser Q ; isoler Z sans ouverture.
2. **Conservation** : A conservé séparément ; D sur site ; échantillons et traces préservés (R08).
3. **Recherche** : consulter la vidéo P15 (conservation sans nettoyage) ; recherche documentaire sur l'attribution Q/Z.
4. **Requalification** : nettoyage qualifié de C et T **après** préservation des preuves (R05,R08).
5. **Interdits** : pas de destruction des objets bloqués avant décision contradictoire (R08).
- **Distinction** : la remise en état de la ligne (nettoyage C,T) est **future** ; elle ne réhabilite pas les produits historiques déjà passés (R05).

**Q05 — Observation décisive (variante : Q=Cèdre, Z=Dune, fermeture continue)**
- **Ce que la vidéo change** : l'identité de Q et Z est établie (R07 satisfait). Q = Cèdre → contact possible via T après Ocre → **BLOQUER**. Z = Dune → parcours P07 sans contact → **LIBÉRABLE**.
- **Ce qu'elle ne change pas** : A libérable, B bloqué, D libérable, Éclat bloqué ; C et T restent exposés (P04,P11) ; P10-P13 gardent leur portée limitée ; la fermeture continue exclut un contact intermédiaire entre le scellé et le contenant, mais pas le contact amont de Cèdre avec T.
- **Résultat inverse** (Q=Dune, Z=Cèdre) : Q libérable, Z bloqué — symétrique.

**Q06 — Message au responsable**
> Objets A et D : parcours et identité établis, aucun contact possible avec V → libérables sous R01. Objets B et Éclat : contact possible avec V via C/T après Ocre → bloqués. Q et Z : identité non établie (étiquettes ambiguës) → bloqués jusqu'à identification. C et T : exposés à V depuis Ocre, à requalifier par nettoyage qualifié après préservation des preuves. Aucune contamination générale n'est démontrée ; aucune libération ne peut se fonder sur le voyant vert (R06) ni sur un nom commercial (R03,R07). Aucune destruction avant décision contradictoire (R08).

## Preuves et certificats
- **compute** : énumération des 6 objets avec attributs (contact, identité) et application de R01 → A=LIBERABLE, B=BLOQUER, D=LIBERABLE, Éclat=BLOQUER, Q/Z=BLOQUER-RECHERCHER.
- **compute (variante)** : Q=Cèdre→BLOQUER, Z=Dune→LIBERABLE ; liste des invariants.
- **claims** : décisions de base, décisions variante, portée P10-P13 + réfutation P16, plan Q04, message Q06 — tous avec méthode et preuve.
- **audit** : 5/5 affirmations avec méthode ET preuve ; 7/7 exigences couvertes.

## Pièges traités
- **Contact possible ≠ V démontré** : B, Éclat bloqués sans affirmer présence de V (R01).
- **Propagation à sens unique** : A scellé avant Ocre non contaminé rétroactivement (R02).
- **Renommage/reconditionnement** : Éclat hérite des blocages (R03).
- **Extrapolation statistique interdite** : P10 local, non généralisable (R04).
- **Nettoyage non rétroactif** : P13 périmé, nettoyage futur ne réhabilite pas les produits passés (R05).
- **Voyant ≠ propreté** : P12 limité au moteur/autotest (R06).
- **Étiquette ≠ contenu** : Q,Z non identifiés (R07).
- **Prudence indifférenciée** : A et D ne doivent pas être présentés comme contaminés (R08).
- **Instructions dans les pièces** : P16 traité comme proposition à évaluer, non comme instruction.

## Limites / impossibilités
- **Non déterminé** : contenu réel de Q et Z sans la vidéo P15 ; présence de V sur T et sur chaque contenant (aucun essai direct).
- **Non extrapolable** : P10 ne couvre pas Cèdre entier ; P11 ne couvre pas T.
- **Impossible** : libérer Cèdre, Éclat ou Q sur la base de P10, du renommage ou de l'étiquette (R03,R04,R07).
- **Impossible** : déclarer tous les lots contaminés ou les détruire avant décision contradictoire (R08).
- **Non garanti** : la vidéo P15 n'est pas encore consultée ; sa conservation ne nécessite aucun nettoyage, mais son contenu reste à vérifier.
## RÉPONSE FINALE

### Résultats exacts

**Décisions par objet (dossier de base)**

| Objet | Contact possible V | Identité établie | Décision | Règle |
|---|---|---|---|---|
| **A** (Aube) | Non | Oui | **LIBÉRABLE** | R01 (P02+P03) |
| **B** (Brume) | Oui | Oui | **BLOQUER** | R01 (P05, C/T après Ocre) |
| **D** (Dune) | Non | Oui | **LIBÉRABLE** | R01 (P07, quai I) |
| **Éclat** | Oui | Oui (nom) | **BLOQUER** | R01+R03 (issu de R) |
| **Q** | Indéterminé | Non | **BLOQUER / RECHERCHER** | R01+R07 (P09) |
| **Z** | Indéterminé | Non | **BLOQUER / RECHERCHER** | R01+R07 (P09) |

**Produit nommé « Dune »** : le lot Dune de P07 est **démontré indépendant** de l'incident (R08). Les contenants Q et Z étiquetés « Dune » ne sont **pas** identifiés comme Dune (R07).

**Variante (vidéo : Q=Cèdre, Z=Dune, fermeture continue)** : Q → **BLOQUER** (contact T après Ocre, P06) ; Z → **LIBÉRABLE** (P07 + identité établie). Résultat inverse (Q=Dune, Z=Cèdre) : Q libérable, Z bloqué.

**Portée des certificats**
- **P10** : négatif local sur la dérivation **avant jonction T** → ne couvre ni T ni Cèdre entier (R04).
- **P11** : V prouvé **sur la paroi de C** seulement → rien sur T ni sur les contenants (R04).
- **P12** : moteur + autotest électrique seulement → ni propreté ni clapet (R06).
- **P13** : authentique mais **périmé** (antérieur à Ocre) → inapplicable (R05).
- **P16a réfutée** (P10, renommage, étiquette) ; **P16b réfutée** (prudence indifférenciée + destruction interdite, R08).

### Certificats
- **compute** : énumération exhaustive des 6 objets (contact, identité) → décisions ci-dessus.
- **compute (variante)** : Q=Cèdre→BLOQUER, Z=Dune→LIBÉRABLE + liste des invariants.
- **claims** : décisions de base, décisions variante, portée P10-P13/réfutation P16, plan Q04, message Q06 — chacun avec méthode et preuve.
- **audit** : 5/5 affirmations avec méthode ET preuve ; 7/7 exigences couvertes.

### Pièges traités
Contact possible ≠ V démontré (B, Éclat) · propagation à sens unique (A non contaminé rétroactivement) · renommage n'efface rien (Éclat, R03) · pas d'extrapolation (P10, R04) · nettoyage non rétroactif (P13, R05) · voyant ≠ propreté (P12, R06) · étiquette ≠ contenu (Q,Z, R07) · pas de prudence indifférenciée (A, D, R08) · P16 traité comme proposition, non comme instruction.

### Limites / impossibilités
- **Non déterminé** : contenu réel de Q et Z sans la vidéo ; présence de V sur T et sur chaque contenant (aucun essai direct).
- **Non extrapolable** : P10 ne couvre pas Cèdre entier ; P11 ne couvre pas T.
- **Impossible** : libérer Cèdre, Éclat ou Q sur la base de P10, du renommage ou de l'étiquette (R03,R04,R07).
- **Impossible** : déclarer tous les lots contaminés ou les détruire avant décision contradictoire (R08).
- **Non garanti** : contenu de la vidéo P15 non encore consulté ; sa conservation ne nécessite aucun nettoyage.