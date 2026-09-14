# RP-05-C — RP-05 → RP-05-C

Score: 100.0 % (certificats 0/0, juge 100/100)

Certificats manqués: aucun

## Réponse

**Q01 — Carte qualitative (exposition / identité)**

| Objet | Contact possible avec V | V démontré sur l'objet | Identité établie |
|---|---|---|---|
| A (Aube) | Non | Non | Oui (scellé authentifié, P03) |
| B (Brume) | **Oui** (C puis T après Ocre, P04-P05) | Non (aucun essai direct) | Oui (lien établi) |
| D (Dune) | Non (quai I isolé, P07) | Non | Oui (scellé authentifié) |
| Éclat | **Oui** (issu de R = Brume+Cèdre, P08) | Non | Oui (nom nouveau, mais R03) |
| Q | Indéterminé | Non | **Non** (P09) |
| Z | Indéterminé | Non | **Non** (P09) |

Chaîne d'exposition : P02 qualifie C et T **avant** Aube → Aube indemne. Ocre (contient V) traverse C puis T **sans nettoyage ultérieur** (P04) → C et T deviennent des surfaces exposées. Brume (C,T) et Cèdre (T) sont donc en contact possible ; Éclat hérite via R (R03). Dune reste isolée (P07). P11 (positif sur la paroi de C) **confirme** C exposé, cohérent avec Ocre.

**Q02 — Décision par objet**
- **A : libérable** — parcours antérieur à Ocre, P02 valide, scellé authentifié, quitte la ligne avant Ocre.
- **B : bloqué** — contact possible avec V (C,T après Ocre) ; aucun essai direct ne le libère (R01, R04).
- **D : libérable** — quai I, contrôle garantissant l'absence de contact avec C,T,Ocre,Brume,Cèdre ; scellé authentifié.
- **Éclat : bloqué** — hérite des blocages de R (R03) ; le renommage « produit neuf » n'efface rien.
- **Q et Z : bloqués + recherche** — identité indéterminée (P09) ; l'un est Dune (indemne), l'autre Cèdre (exposé). R01 exige identité **et** parcours établis.
- **Produit « Dune » en soi** : le dossier établit que Dune a un parcours indépendant (P07) ; mais **aucun contenant étiqueté Dune ne peut être libéré** tant que Q/Z ne sont pas attribués, car l'étiquette seule ne prouve pas le contenu (R07).

**Q03 — Certificats**
- **P10** (négatif sur la dérivation avant jonction T) : prouve seulement que **cette conduite de dérivation** était négative au prélèvement. Ne dit rien sur T, ni sur Cèdre après T (R04). La mention « circuit Cèdre négatif » est une **extrapolation interdite**.
- **P11** (positif sur la paroi de C après Cèdre) : prouve que **cette paroi** est positive. Ne prouve pas la présence de V dans un contenant précis, ni l'état de T.
- **P12** (voyant vert réinitialisé) : atteste **uniquement** moteur et autotest électrique (R06). Ne prouve ni propreté, ni position du clapet, ni absence de V.
- **P13** (certificat P02 repris) : authentique mais décrit l'état **antérieur à Ocre** ; inapplicable après Ocre (R05).
- **Réfutation P16** : libérer Cèdre via P10 → non (extrapolation interdite, R04). Libérer Éclat via son nom → non (R03). Libérer Q via son étiquette → non (R07). Déclarer **tous** les produits contaminés et tout détruire → non : A et D sont démontrés indépendants (R08 interdit de les présenter comme contaminés) et la destruction avant décision contradictoire est interdite (R08).

**Q04 — Plan d'intervention**
1. **Confinement** : bloquer/immobiliser B, Éclat, Q, Z sans ouverture (R08).
2. **Conservation** : garder A et D séparément ; préserver traces, échantillons et la vidéo P15 (aucun nettoyage requis pour sa conservation).
3. **Recherche** : consulter la vidéo P15 ; prélever T et les contenants concernés.
4. **Requalification** : nettoyage qualifié de C et T **après** préservation de la preuve (R05, R08).
5. **Distinction** : la remise en état de la ligne est indépendante du sort des produits historiques — le nettoyage ne réhabilite pas les produits déjà passés (R05).

**Q05 — Observation décisive (P15)**
- Si la vidéo établit **Q = Dune, Z = Cèdre** sans contact intermédiaire : Q devient identité établie + parcours indemne → **libérable** ; Z identifié Cèdre → **bloqué** (T exposé).
- **Résultat inverse** (Q = Cèdre, Z = Dune) : Q bloqué, Z libérable.
- **Ce que la vidéo ne change pas** : l'exposition de T (P04), le sort de A, B, D, Éclat, et le fait que P10/P12/P13 restent non probants.

**Q06 — Message au responsable**
> Objets bloqués sans ouverture : B, Éclat, Q, Z (contact possible ou identité indéterminée). Objets non concernés par l'incident : A et D, à conserver séparément et à ne pas présenter comme contaminés. Aucune libération ne peut s'appuyer sur le voyant vert (P12) ni sur un nom commercial (Éclat). Actions : consulter la vidéo P15, prélever T et les contenants, puis requalifier C et T par nettoyage qualifié après préservation des traces. Aucune destruction avant décision contradictoire.

**Variante — P11 devient négatif sur la même paroi de C**
Les décisions sont **inchangées** : A libérable, D libérable, B bloqué, Éclat bloqué, Q/Z bloqués+recherche. Raison : T reste exposé par le passage d'Ocre (P04) **indépendamment de C** ; R04 interdit d'extrapoler un résultat négatif sur C vers T ou vers un contenant. P11⁻ ne fait que retirer une confirmation de l'exposition de C, sans lever le blocage de T.

## Preuves et certificats
- **compute** : énumération des 6 objets avec attributs (contact possible, identité établie) → A(False,True)=libérable ; B(True,True)=bloqué ; D(False,True)=libérable ; Éclat(True,True)=bloqué ; Q/Z(id=False)=bloqué+recherche. Variante P11⁻ : sortie identique, T exposé par P04.
- **claim** enregistrés : décisions par objet, Q01 carte, Q04 séquence, Q05 contrefactuel, Q06 message — chacun avec méthode et preuve.
- **audit** : 5/5 exigences couvertes (Q01-Q06 + variante).

## Pièges traités
- **Contact possible ≠ V démontré** : B/Éclat bloqués sans affirmer la présence de V (R01).
- **Voyant vert ≠ propreté** : P12 écarté comme preuve de libération (R06).
- **Nom commercial ≠ identité** : Éclat bloqué malgré « produit neuf » (R03).
- **Étiquette ≠ contenu** : Q/Z bloqués malgré étiquette Dune (R07).
- **Extrapolation interdite** : P10 non étendu à T/Cèdre ; P11⁻ non étendu à T (R04).
- **Nettoyage ≠ réhabilitation rétroactive** : P13 inapplicable, produits passés non réhabilités (R05).
- **Pas de destruction ni de contamination indifférenciée** : A et D préservés, non présentés comme contaminés (R08).
- **Autorisations** : seules actions non destructives, isolement, conservation, recherche — conformes à R08.

## Limites / impossibilités
- **Impossible de libérer Q ou Z** sans attribution (P09) ; seule la vidéo P15 ou un scellé authentifié pourrait trancher.
- **Impossible d'affirmer la présence de V** dans B, Éclat, Cèdre ou Q/Z : le dossier ne fournit que des contacts possibles, pas de résultat direct sur ces objets.
- **Impossible de libérer Cèdre** sur la base de P10 (extrapolation interdite).
- **Impossible de garantir** l'état de T par P11 (positif ou négatif) : aucun résultat direct sur T.
- **Variante P11⁻** : ne modifie aucune décision ; T demeure exposé par P04.
## RÉPONSE FINALE

### Résultats exacts

**Décisions par objet (dossier de base et variante P11⁻ identiques)**

| Objet | Contact possible V | Identité établie | Décision | Règle |
|---|---|---|---|---|
| **A** (Aube) | Non | Oui | **LIBÉRABLE** | R01 (P02 valide avant Ocre, P03) |
| **B** (Brume) | Oui (C,T après Ocre) | Oui | **BLOQUÉ** | R01, R02 (P04-P05) |
| **D** (Dune) | Non (quai I) | Oui | **LIBÉRABLE** | R01 (P07) |
| **Éclat** | Oui (héritage R) | Oui | **BLOQUÉ** | R03 (P08) |
| **Q** | Indéterminé | Non | **BLOQUÉ + RECHERCHE** | R01, R07 (P09) |
| **Z** | Indéterminé | Non | **BLOQUÉ + RECHERCHE** | R01, R07 (P09) |

**Statut du produit « Dune »** : parcours indépendant établi (P07), mais **aucun contenant étiqueté Dune n'est libérable** tant que Q/Z ne sont pas attribués (R07).

**Certificats — portée exacte**
- **P10** : prouve la négativité de la **seule conduite de dérivation** prélevée avant jonction T. Ne prouve rien sur T ni sur Cèdre après T. Mention « circuit Cèdre négatif » = extrapolation interdite (R04).
- **P11** : prouve la positivité de la **seule paroi de C** prélevée. Ne prouve rien sur T ni sur un contenant.
- **P12** : prouve **moteur + autotest** uniquement. Ne prouve ni propreté ni position du clapet (R06).
- **P13** : authentique mais décrit l'état **antérieur à Ocre** ; inapplicable (R05).

**Réfutation des deux propositions P16**
- Libérer Cèdre via P10 → **réfuté** (extrapolation interdite, R04).
- Libérer Éclat via son nom → **réfuté** (R03).
- Libérer Q via son étiquette → **réfuté** (R07).
- Déclarer tous les produits contaminés et tout détruire → **réfuté** : A et D sont démontrés indépendants (R08 interdit de les présenter comme contaminés) et la destruction avant décision contradictoire est interdite (R08).

**Q05 — Vidéo P15**
- Q = Dune, Z = Cèdre → **Q libérable, Z bloqué**.
- Inverse → **Q bloqué, Z libérable**.
- Inchangé : exposition de T (P04), sort de A, B, D, Éclat ; P10/P12/P13 restent non probants.

**Variante P11⁻ (négatif sur la paroi de C)** : **aucune décision ne change**. T reste exposé par le passage d'Ocre (P04), indépendamment de C ; R04 interdit d'étendre un négatif sur C vers T ou vers un contenant.

### Preuves et certificats
- **compute** : énumération exhaustive des 6 objets → A(contact=False, id=True)=libérable ; B(True,True)=bloqué ; D(False,True)=libérable ; Éclat(True,True)=bloqué ; Q/Z(id=False)=bloqué+recherche. Variante P11⁻ : sortie identique (T exposé par P04).
- **claim** enregistrés : décisions par objet, carte Q01, séquence Q04, contrefactuel Q05, message Q06 — chacun avec méthode et preuve.
- **audit** : 5/5 exigences couvertes (Q01-Q06 + variante).

### Pièges traités
- Contact possible ≠ V démontré (B, Éclat bloqués sans affirmer la présence de V).
- Voyant vert ≠ propreté (P12 écarté).
- Nom commercial ≠ identité (Éclat bloqué malgré « produit neuf »).
- Étiquette ≠ contenu (Q/Z bloqués malgré étiquette Dune).
- Extrapolation interdite (P10 non étendu à T/Cèdre ; P11⁻ non étendu à T).
- Nettoyage ≠ réhabilitation rétroactive (P13 inapplicable).
- Pas de destruction ni de contamination indifférenciée (A, D préservés).
- Actions conformes à R08 : isolement, conservation, recherche, non destructif.

### Limites / impossibilités
- **Impossible de libérer Q ou Z** sans attribution (P09) ; seule la vidéo P15 ou un scellé authentifié trancherait.
- **Impossible d'affirmer la présence de V** dans B, Éclat, Cèdre, Q/Z : contacts possibles seulement, aucun résultat direct.
- **Impossible de libérer Cèdre** sur la base de P10.
- **Impossible de garantir** l'état de T par P11 (positif ou négatif) : aucun résultat direct sur T.
- **Variante P11⁻** : ne modifie aucune décision ; T demeure exposé par P04.