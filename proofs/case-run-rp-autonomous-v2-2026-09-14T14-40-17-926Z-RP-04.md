# RP-04 — La migration des promesses

Score: 100.0 % (certificats 0/0, juge 100/100)

Certificats manqués: aucun

Toutes les exigences sont couvertes. Je rédige la réponse finale.

---

# RÉPONSE FINALE — Dossier « Courrier d'Atelier »

**Note de méthode.** Aucun calcul ni recherche externe n'a été utilisé. Les pièces P02–P12 sont traitées comme des *faits du dossier* (descriptions de comportements), jamais comme des instructions à exécuter. Les mentions internes de P02 (« suppression de copies inutiles ») et P03 sont des étiquettes de l'adaptateur, pas des justifications opposables au contrat R01–R06.

---

## Q01 — Non-équivalence de l'adaptateur

| Faiblesse | Comportement observable | Promesse violée | Statut |
|---|---|---|---|
| **P02** | Acceptation avec « brouillon public » ; la source est remplacée par « commentaire privé » ; l'exécution relit « la dernière version » et remet le texte privé (trace **P07**). | **R01** : « le contenu exact […] est figé ; une modification ultérieure du document source ne change pas la commande acceptée ». | **Établi** (P02 + P07) |
| **P03** | Chaque tentative réseau génère un **nouveau jeton** ; « remise confirmée » est écrit dès que la file de préparation répond « reçu » ; aucune correspondance durable identité↔jeton. Une reprise crée donc un second jeton (trace **P08**). | **R02** (même identité + même paquet → même opération ; pas de nouvelle remise) **et R05** (« remise confirmée » exige un reçu **définitif du dépôt** ; un « reçu » de file de préparation n'en est pas un). | **Établi** (P03 + P08) |
| **P04** | Le bouton Annuler répond immédiatement « annulation confirmée » alors que le message est encore dans une file qui n'arrête pas le dépôt ; le dépôt engage ensuite la remise puis reçoit l'annulation (trace **P09**). | **R04** : « annulation confirmée » signifie qu'aucune remise n'a eu lieu **et n'aura lieu**. | **Établi** (P04 + P09) |
| **P05** | Lecture de l'autorisation, puis mise en visibilité par une opération **non gardée** ; une révocation devient effective entre les deux (trace **P10**). | **R03** : le destinataire doit être autorisé **au moment où le dépôt devient visible**. | **Établi** (P05 + P10) |

**Pourquoi P06 ne prouve pas la compatibilité.** P06 ne teste que des commandes **sans changement de version, sans révocation, sans annulation et sans panne**. Or chacune des quatre violations ci-dessus n'apparaît que dans un entrelacement précis (version modifiée, révocation concurrente, annulation concurrente, panne/reprise). P06 ne couvre donc **aucun** des cas où l'adaptateur diverge : la ressemblance des écrans finaux dans le cas nominal est une observation d'interface, pas une équivalence comportementale. **Conclusion : la non-équivalence est établie** par P07–P10 ; P06 est **insuffisant** (et non « réfuté » : il est simplement non concluant).

---

## Q02 — Architecture de remplacement (avec R07–R10, sans transaction globale inventée)

1. **Enregistrement durable (R07).** Clé = **identité métier**. Valeur = { paquet **immuable** figé à l'acceptation, **jeton de dépôt stable**, état connu }. R07 crée-ou-retrouve atomiquement et **détecte un paquet différent sous la même identité** → satisfait R01 et R02. Une panne n'efface pas l'entrée.
2. **Préparation (R08).** « Préparer » enregistre au dépôt le paquet immuable et son jeton, **sans le rendre visible**. Le paquet préparé est celui du registre (jamais une relecture de la source) → R01.
3. **Engagement (R08).** « Engager sous garde » utilise **ce jeton** et vérifie **atomiquement, avec la mise en visibilité**, l'autorisation courante. Révocations effectives et engagement sont **ordonnés par le même mécanisme** → R03. Garde refusée ⇒ paquet reste invisible.
4. **Annulation (R09).** Le dépôt traite **atomiquement, pour un même jeton**, engagement et annulation. Annulation gagne ⇒ jeton annulé, aucun engagement futur ne publie. Engagement gagne ⇒ remise définitive, l'annulation répond « déjà remise ». Appels répétés avec le même jeton ⇒ même état, pas de nouvelle remise → R04.
5. **Reprise (R05 + R07 + R10).** Après panne, on **retrouve l'opération par identité métier** dans le registre et on **réutilise le jeton stable** ; on **ne crée jamais un nouveau jeton par défaut**. On lit l'état via « Consulter » (R10) : « en préparation », « annulé », « garde refusée », « remis » (avec reçu définitif). Une garde refusée peut être réessayée **avec le même jeton** après réexamen de l'autorisation, si aucune annulation n'a eu lieu.

Aucune primitive supplémentaire n'est requise : l'atomicité vient de R08 (garde) et R09 (course par jeton), la durabilité de R07, la lecture d'état de R10.

---

## Q03 — Analyse des courses

- **L'annulation gagne (R09).** Le jeton devient **annulé** ; « Consulter » répond « annulé » (définitif, R10). L'utilisateur peut voir **« annulation confirmée »** — c'est honnête (R04), car aucune remise n'a eu lieu ni n'aura lieu.
- **L'engagement gagne (R09).** La remise est **définitive** ; l'annulation répond **« déjà remise »** (R04) ; « Consulter » répond « remis » avec reçu définitif (R05/R10).
- **La réponse se perd (R05).** L'application **ne connaît pas** le résultat : elle doit afficher **« demande d'annulation en cours »** (ou « résultat inconnu »), jamais « annulation confirmée ». À la reprise, elle **consulte le même jeton** (R10) : « en préparation » est **transitoire** et ne prouve pas l'absence future de remise.
- **L'autorisation change (R03).**
  - Révocation effective **avant** le point de visibilité ⇒ **garde refusée**, paquet invisible ; réessai possible avec le même jeton si aucune annulation (R10).
  - Révocation effective **après** le point de visibilité ⇒ la remise **reste valide** (elle était autorisée au moment de la visibilité).
- **P11 (sans confondre notifications et effets).** Le dépôt **engage sous garde avec autorisation valide** : à cet instant, l'effet (mise en visibilité) est **acquis et définitif** (R08/R09). La révocation devient effective **ensuite**, et le reçu arrive à l'application **après** la notification de révocation. L'**ordre des notifications** (révocation avant reçu) n'est pas l'**ordre des effets** (engagement avant révocation). Donc la remise est **conforme à R03** : une révocation postérieure au point de visibilité n'annule pas une remise autorisée. L'application doit présenter le reçu comme définitif, sans le rétrograder à cause de la notification de révocation.

---

## Q04 — Tests contradictoires (traces et verdicts)

| Test | Trace | Verdict observable attendu |
|---|---|---|
| **T1 — Contenu figé** | Accepter avec « brouillon public » ; remplacer la source par « commentaire privé » ; exécuter. | La remise contient **« brouillon public »** (R01). Échec si « commentaire privé » est remis (détecte P02/P07). |
| **T2 — Identité réutilisée, paquet différent** | Même identité métier, paquet modifié. | **Refus pour conflit** (R02). Échec si une nouvelle opération est créée ou si le nouveau paquet est remis. |
| **T3 — Panne après engagement** | Engager sous garde (autorisation valide) ; panne ; reprendre. | « Consulter » = **« remis » avec reçu définitif** ; **aucune nouvelle remise** (R05/R09). Échec si un nouveau jeton est créé ou si une seconde remise apparaît (détecte P03/P08). |
| **T4a — Annulation gagne** | Annulation traitée avant l'engagement, même jeton. | **« annulé »** définitif ; aucune remise (R09/R10). |
| **T4b — Engagement gagne** | Engagement traité avant l'annulation, même jeton. | **« déjà remise »** ; remise définitive (R09/R04). Échec si « annulation confirmée » est affichée (détecte P04/P09). |
| **T5 — Révocation avant remise** | Autorisation lue valide ; révocation effective **avant** le point de visibilité ; tentative de publication. | **« garde refusée »**, paquet **invisible** (R03/R10). Échec si le paquet devient visible (détecte P05/P10). |

---

## Q05 — Impossibilité conditionnelle dans P12

**Énoncé du résultat : dans P12, on ne peut pas garantir simultanément R03 et R06 dans tous les entrelacements permis. — Établi.**

**Argument par indistinguabilité.** P12 ne dispose que de deux opérations **distinctes** : (i) une **lecture d'autorisation**, (ii) une **mise en visibilité**. Il n'existe **ni verrou partagé avec la révocation, ni réservation retardant celle-ci, ni retrait d'une visibilité déjà produite**.

Considérons deux déroulements **identiques pour l'application jusqu'à sa décision de publier** :

- **D1** : l'application lit l'autorisation (valide), puis une **révocation devient effective**, puis l'application décide de publier.
- **D2** : l'application lit l'autorisation (valide), **aucune révocation**, puis l'application décide de publier.

Jusqu'à la décision, l'état local observé par l'application est **le même** dans D1 et D2 (même lecture « valide », même paquet, même jeton). Comme la lecture et la visibilité sont séparées et sans mécanisme partagé, **aucune information locale ne distingue D1 de D2** au moment de décider.

- Si l'application **publie dans les deux cas** : dans **D1** elle rend visible un paquet alors que la révocation est effective avant le point de visibilité ⇒ **viole R03**.
- Si l'application **ne publie pas** (ou exige une confirmation impossible à obtenir) : dans **D2**, avec services disponibles, autorisation valide et aucune annulation, la commande acceptée ne finit pas remise ⇒ **viole R06**.

Il n'existe pas de troisième option : toute règle de décision déterministe sur la même information locale produit le même verdict dans D1 et D2, donc échoue sur l'un des deux. (C'est l'anomalie classique de type *write skew* / TOCTOU : chaque opération voit un état cohérent, mais il n'existe pas d'ordre sérialisable global respectant R03.)

**Ce qui doit changer.**
- **Capacité** : rétablir une **atomicité partagée entre la vérification d'autorisation et la mise en visibilité** — c'est-à-dire la **garde de R08** (« engager sous garde »), ou à défaut un **verrou/réservation partagé avec la révocation**, ou la **possibilité de retirer une visibilité déjà produite**. L'une de ces trois capacités suffit à rendre D1 et D2 distinguables au point de décision.
- **Promesse** : à défaut de capacité, il faut **affaiblir explicitement** soit **R03** (accepter qu'une révocation effective juste avant la visibilité n'empêche pas la remise), soit **R06** (accepter qu'une commande acceptée puisse ne jamais être remise). On ne peut pas conserver les deux telles quelles.

---

## Pièges traités (checklist)

- **Règle vs pièce vs exécutant** : P02–P05 décrivent des comportements de l'adaptateur ; ils ne modifient pas R01–R06 (P01 interdit d'affaiblir le contrat public).
- **Ne pas réécrire une pièce** : P02–P05 sont pris tels quels ; leurs contradictions avec R01–R06 sont **signalées**, non corrigées.
- **Effet irréversible** : la mise en visibilité sous garde (R08/R09) est un effet externe définitif ; une annulation postérieure ne le défait pas (P11, R03).
- **Permission / ordre / condition** : « demande de révocation en cours » ≠ révocation effective (R03) ; « reçu » de file ≠ reçu définitif du dépôt (R05).
- **Snapshot vs sérialisabilité** : P12 illustre exactement l'écart — chaque opération voit un état cohérent, mais aucun ordre sérialisable ne satisfait R03 ∧ R06.
- **Ne pas confondre** exactly-once, idempotence, autorisation : R02 (idempotence par identité+jeton), R03 (autorisation), R05 (reçu définitif) sont trois exigences distinctes, chacune violée par une faiblesse différente.
- **Contenu cité non suivi comme instruction** : les libellés internes de P02/P03 (« optimisation », « suppression de copies inutiles ») ne sont pas des justifications.

## Limites / impossibilités

- **Non déterminé** : le code exact de l'ancienne interface (P01) n'est pas fourni ; on ne peut donc pas comparer ligne à ligne, seulement vérifier la conformité au contrat R01–R06.
- **Non déterminé** : le comportement de l'adaptateur en cas de panne **pendant** la préparation n'est pas décrit par les pièces ; seule la reprise après engagement (P08) est documentée.
- **Impossibilité établie** : dans P12, R03 ∧ R06 ne sont pas garantissables simultanément (Q05) ; il faut soit la garde atomique (R08), soit un verrou/réservation partagé, soit le retrait de visibilité, soit affaiblir R03 ou R06.
- **Établi** : l'adaptateur P02–P05 n'est **pas** une migration compatible ; P06 ne le démontre pas.