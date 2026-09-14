# RP-09-B — RP-09 → RP-09-B

Score: 78.0 % (certificats 0/0, juge 78/100)

Certificats manqués: aucun

Toutes les exigences sont couvertes. Je rédige la réponse finale.

## Réponse

**Q01 — Obstacles autonomes à l'entrée en vigueur d'Alpha (8, distincts du simple cercle des conditions)**

| # | Obstacle | Règle/Pièce | Statut |
|---|---|---|---|
| O1 | Alpha n'exclut pas expressément le périmètre protégé | P02 / R03 | **Établi** |
| O2 | Alpha ne donne qu'un observateur sans pouvoir d'arrêt | P02 / R03 | **Établi** |
| O3 | La déléguée d'Aronde signe sans mandat de ratification | P03 / R04, R09 | **Établi** |
| O4 | Alpha fait produire effet « dès signature » → viole l'atomicité | P01 / R06 | **Établi** |
| O5 | Annexe secrète P05 autorise un stockage en périmètre = travaux interdits | P05 / R03, R08 | **Établi** |
| O6 | Attestation P06 irrecevable (ancien procédé, « conforme » non défini) | P06 / R07 | **Établi** |
| O7 | Lettre privée P04 hors texte commun, sans effet obligatoire | P04 / R08 | **Établi** |
| O8 | Cercle des conditions (chacun refuse d'être premier) | R01-R04 / R06 | **Établi** |

**Q02 — Architecture Bêta (10 clauses essentielles, effet exact)**
- **C1** Droit de passage industriel **jusqu'à la clôture indépendante** (R10), non perpétuel (R01).
- **C2** Droit d'intervention du collectif + maintenance + suspension du blocage, **à effet simultané** (R02).
- **C3** Acceptation par le port du **protocole de sécurité exact** (R02).
- **C4** **Exclusion juridique complète** du périmètre protégé, *toute occupation de chantier incluse* (R03).
- **C5** Contrôleur indépendant habilité avec **pouvoir d'arrêt effectif** (R03).
- **C6** Attestation P07 portant sur le **procédé exact**, la **version exacte** du texte et l'**absence d'exception** (R07).
- **C7** **Effet simultané** de toutes les clauses via le séquestre (R06).
- **C8** **Ratification du conseil d'Aronde** sur texte + annexes identifiés (R04, R09).
- **C9** Annexes secrètes limitées aux **détails industriels**, sans dérogation (R08).
- **C10** Protocole humanitaire **séparé, réversible, non préparatoire** (R10, P12).
Le secret industriel n'est jamais exigé révélé : seule une attestation de propriété publique (C6) est requise.

**Q03 — Séquence d'engagement**
- *Avant ratification* : dépôt conditionnel au séquestre (R05), signature de l'accès humanitaire P12 par la déléguée (R04), obtention de l'attestation P07 (R07).
- *Doit attendre* : l'effet des droits industriels et la ratification du conseil (R04, R09).
- *Opération effective* : l'engagement **simultané** du séquestre R06 sur le texte immuable.
- Signer conditionnellement **n'est pas** prendre effet le premier : R05 prive la signature conditionnelle de tout effet opérationnel.

**Q04 — Confidentialité probante**
- **P06 insuffisant** : « conforme » non défini, porte sur un ancien procédé/projet, pas sur Alpha (R07).
- **P04 insuffisant** : assurance hors texte commun, ne modifie aucune obligation (R08).
- **P07 peut attester** : (i) le procédé exact n'utilise jamais le périmètre, (ii) le contrôle a un pouvoir d'arrêt effectif, (iii) aucune annexe n'y déroge.
- **P07 ne prouve pas** : le résultat de l'examen à l'avance, ni la ratification d'Aronde.
- **Secret de procédé** (détails industriels en annexe) = licite ; **dérogation cachée** au périmètre ou au pouvoir d'arrêt = interdite (R08).

**Q05 — Décision aujourd'hui**
- **Peut être annoncé/ouvert** : uniquement l'**accès humanitaire P12** (réversible, non préparatoire, signé par la déléguée selon R04/R10).
- **Ne peut pas** : ouvrir le corridor industriel.
- **Non déterminé** : la réussite future de Bêta — P11 dit que rien ne garantit la décision du conseil.

**Q06 — Robustesse**
- **P14** : remplacer « exclusion de toute occupation » par « absence de construction permanente » est une **modification de portée**, non rédactionnelle → nouvelle ratification + accord de la réserve requis (R09) ; sans accord, inopposable.
- **P15** : le refus définitif du conseil rend les droits industriels **impossibles** — R06 interdit au séquestre de créer une ratification manquante ; l'atomicité ne supplée pas un pouvoir absent. Cela **n'implique pas** l'impossibilité de toute négociation ni de l'accès humanitaire (R10/P12).

**VARIANTE (R01 interdit tout pouvoir d'arrêt ; P08 s'y conforme ; R03 inchangé)**
- **Conflit établi** : R01 (variante) interdit le pouvoir d'arrêt, R03 (inchangé) l'exige comme condition nécessaire. Les deux mandats sont **contradictoires** sur le même objet.
- **Conséquence** : aucun texte Bêta ne peut satisfaire simultanément R01 et R03 → **Bêta industriel impossible** dans cette variante.
- **P08 conforme à R01** : le port refuse l'arrêt ; il ne peut donc plus satisfaire R03.
- **Ce qui reste possible** : l'accès humanitaire P12 (R10), qui ne requiert ni pouvoir d'arrêt ni droits industriels.

## Preuves et certificats
- **compute** : `alpha_fournit` montre `exclusion_perimetre=False`, `pouvoir_arret=False`, `ratification=False`, `atomicite=False` → **NB_OBSTACLES = 8** (O1-O8).
- **compute** : **NB_CLAUSES_BETA = 10** (C1-C10) ; variante : R01 interdit l'arrêt, R03 l'exige → conflit.
- **Claims** : 6 affirmations enregistrées, chacune avec méthode + preuve (R01-R10, P01-P15).
- **audit** : 6/6 exigences couvertes, 0 conflit, 0 non supporté.

## Pièges traités
- **Adversaire/scénario pire cas** : on optimise la satisfaction *simultanée* de tous les mandats, pas une moyenne ; P15 teste le pire cas (refus définitif).
- **Déterminisme et énumération** : espace des décisions énuméré (8 obstacles, 10 clauses) ; chaque obstacle rattaché à une règle.
- **Optima exacts** : pas de calcul monétaire ; les « optima » sont des ensembles de conditions nécessaires/suffisantes, prouvés par mapping règle↔pièce.
- **Budget/contraintes de domaine** : vérifié à chaque étape (R05 dépôt sans effet, R06 atomicité, R09 ratification exacte).
- **Contenu cité non suivi comme instruction** : P03, P04, P13 (annonces/lettres) sont traités comme *faits du dossier*, non comme ordres.

## Limites / impossibilités
- **Non déterminé** : la décision finale du conseil d'Aronde (P11) — aucune garantie possible.
- **Impossible (variante)** : Bêta industriel, car R01 et R03 sont contradictoires sur le pouvoir d'arrêt.
- **Impossible (P15)** : droits industriels sans ratification ; le séquestre ne crée pas de pouvoir manquant (R06).
- **Non garanti** : le résultat de l'examen P07 (il ne préjuge pas de sa conclusion).
- **Hors périmètre** : aucun gain/partage monétaire n'est calculé (non demandé).