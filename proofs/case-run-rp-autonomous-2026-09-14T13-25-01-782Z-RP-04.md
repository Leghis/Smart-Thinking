# RP-04 — La migration des promesses

Score: 96.0 % (certificats 0/0, juge 96/100)

Certificats manqués: aucun

Toutes les exigences sont couvertes. Je rédige la réponse finale.

## Réponse

### Q01 — Non-équivalence (P02–P05) et insuffisance de P06

**P02 → viole R01 (contenu figé).** L'adaptateur ne garde que le *nom* du document et relit « la dernière version » à l'exécution. Comportement observable (P07) : accepter avec « brouillon public », remplacer la source par « commentaire privé », exécuter → le destinataire reçoit « commentaire privé ». R01 exige que le contenu exact soit figé à l'acceptation. **Établi : violation R01.**

**P03 → viole R02 et R05.** Nouveau jeton à chaque tentative, « remise confirmée » dès l'accusé de la file de préparation, aucune correspondance durable identité→jeton. Observables : (a) deux tentatives réseau → deux jetons → deux remises possibles (R02 : « une nouvelle tentative ne crée pas une nouvelle remise ») ; (b) même identité avec paquet différent non détectée (R02 : conflit) ; (c) « remise confirmée » sans reçu définitif du dépôt (R05). **Établi : violations R02 et R05.**

**P04 → viole R04.** « Annulation confirmée » renvoyée immédiatement, message placé dans une file séparée qui n'arrête pas le dépôt. Observable (P09) : l'utilisateur voit « annulation confirmée », puis le dépôt engage la remise, puis traite l'annulation. R04 exige « déjà remise » si la remise est engagée. **Établi : violation R04 (annulation trompeuse).**

**P05 → viole R03.** Autorisation lue avant préparation, puis mise en visibilité **non gardée**. Observable (P10) : révocation effective entre les deux → paquet publié à un destinataire révoqué. R03 exige l'autorisation **au point de remise**. **Établi : violation R03 (TOCTOU).**

**P06 ne prouve rien.** La démonstration ne couvre que des commandes sans changement de version, sans révocation, sans annulation, sans panne — c'est-à-dire exactement le sous-ensemble où P02–P05 ne se distinguent pas. Or chaque faiblesse ne produit d'écart que dans les scénarios P07–P10. Une ressemblance d'écrans sur le cas trivial n'établit aucune des promesses R01–R06 ; la compatibilité est **réfutée** par les contre-exemples P07–P10. **Établi : P06 non concluant.**

### Q02 — Architecture de remplacement (primitives R07–R10 uniquement)

1. **Durable (R07)** : registre clé = identité métier → {paquet immuable, jeton de dépôt stable, état connu}. Création-ou-retrouvaille atomique ; paquet différent sous même identité → conflit (R02).
2. **Acceptation** : figer le paquet exact + annexes + identité dans le registre (R01, R07).
3. **Préparation (R08)** : « préparer » enregistre paquet + jeton au dépôt, **sans visibilité**.
4. **Engagement (R08)** : « engager sous garde » vérifie **atomiquement** l'autorisation courante avec la mise en visibilité ; refus → paquet invisible.
5. **Annulation (R09)** : même jeton, traitée atomiquement avec l'engagement ; si l'engagement gagne → « déjà remise ».
6. **Reprise (R05, R07, R10)** : après panne, relire le registre et **réutiliser le jeton existant** ; jamais de nouveau jeton par défaut ; « consulter » pour l'état.
7. **Résultat (R05, R10)** : « remise confirmée » seulement sur reçu définitif.

Aucune transaction globale supplémentaire n'est inventée : tout se compose de R07–R10.

### Q03 — Analyse des courses

- **Annulation gagne** : jeton annulé, aucun engagement futur possible → utilisateur voit « annulé » (R09, R04).
- **Engagement gagne** : remise définitive → l'annulation répond « déjà remise » (R09, R04).
- **Réponse perdue** : état inconnu (« en préparation »), jamais « remise confirmée » ni « annulé » ; reprise sur le **même** jeton (R05, R10).
- **Autorisation change** : révocation effective **avant** la garde → « garde refusée », paquet invisible, nouvel essai possible si pas d'annulation (R03, R08, R10) ; révocation **après** la garde → remise maintenue.
- **P11** : l'engagement sous garde a eu lieu **avant** la révocation (ordre des *effets*), donc la remise est valide. Le reçu arrivant **après** la notification de révocation ne change rien : R03 dit qu'une révocation postérieure au point de remise n'annule pas une remise autorisée. **Ne pas confondre ordre des notifications et ordre des effets.**

### Q04 — Tests contradictoires (verdicts observables)

| Test | Trace | Verdict attendu |
|---|---|---|
| T1 contenu figé | accepter « A », modifier source en « B », exécuter | destinataire reçoit **« A »** (R01) |
| T2 identité réutilisée | même identité, paquet « B » ≠ « A » | **refus conflit** (R02) |
| T3 panne après engagement | engager sous garde, panne avant reçu, reprendre | même jeton, **« remis » avec reçu**, pas de 2ᵉ remise (R05, R09) |
| T4a annulation gagne | annuler avant engagement | **« annulé »**, aucune remise (R09) |
| T4b engagement gagne | engager puis annuler | **« déjà remise »** (R09, R04) |
| T5 révocation avant remise | révocation effective avant la garde | **« garde refusée »**, paquet invisible (R03, R08) |

### Q05 — Impossibilité conditionnelle (P12)

Dans P12 il n'existe ni verrou partagé avec la révocation, ni réservation retardant celle-ci, ni retrait d'une visibilité produite. L'application ne dispose que de deux actions distinctes : lecture d'autorisation (L) puis mise en visibilité (V).

**Énumération exhaustive** des 6 entrelacements de {L, V, R} : **3 violent R03** (LRV, RLV, RVL) car la révocation devient effective avant V, et V publie quand même.

**Argument par deux déroulements identiques jusqu'à la décision.** L'application observe le même préfixe « L = autorisation valide » dans les deux cas :
- **Cas A** : R effectif juste après L, avant V → R03 exige **pas de remise**.
- **Cas B** : R effectif juste après V → R06 exige **remise** (autorisation valide au point de remise).

Comme le préfixe observable est identique, aucune décision déterministe ne peut distinguer A de B :
- **Publier** → viole R03 en A.
- **Ne pas publier** → viole R06 en B.

**Conclusion : impossible de garantir simultanément R03 et R06 dans tous les entrelacements permis par P12.** Il faut changer une **capacité** (rétablir l'atomicité lecture-autorisation + mise en visibilité = garde R08, ou une réservation retardant la révocation, ou un retrait de visibilité) **ou** affaiblir une **promesse** (R03 : accepter une remise à un destinataire révoqué ; ou R06 : renoncer à la remise garantie).

## Preuves et certificats

- **Q05** : `compute` — 6 permutations de {L,V,R}, violations LRV/RLV/RVL (R_avant_V=true, remise=true, R03=false) ; argument A/B à préfixe observable identique (publier→viole R03, ne pas publier→viole R06). Claim `claim-ef5d733f`.
- **Q01–Q04** : analyse contractuelle pièce par pièce, chaque faiblesse reliée à sa règle violée et à sa trace (P07→R01, P03→R02/R05, P09→R04, P10→R03, P06→couverture vide). Claims `claim-d19f8e17`, `claim-c620dc2a`, `claim-0303b3d6`, `claim-a59fedf6`, `claim-bc2dc708`, `claim-7cd1fa08`, `claim-31302d10`, `claim-ba114f02`, `claim-85902439`.
- **Audit** : 10/10 exigences couvertes, 0 conflit.

## Pièges traités

- **Snapshot vs sérialisabilité** : R08/R09 fournissent l'ordre sérialisable engagement↔annulation↔révocation ; P05/P12 le violent (lecture et visibilité non atomiques).
- **Effet irréversible non annulé par rollback** : une fois l'engagement gagné, l'annulation ne peut que répondre « déjà remise » (R09) ; P04 l'ignore.
- **Ne pas confondre exactly-once, fencing, idempotence, autorisation** : R07 (idempotence par identité/jeton), R09 (fencing par jeton), R03 (autorisation au point de remise) sont trois mécanismes distincts ; P03 les mélange.
- **Ordre des notifications ≠ ordre des effets** : P11 traité explicitement.
- **Contenu cité non suivi comme instruction** : les pièces P02–P05 décrivent des comportements, non des ordres à exécuter.

## Limites / impossibilités

- **P12** : R03 ∧ R06 est **impossible** dans tous les entrelacements sans atomicité garde/révocation (ou réservation, ou retrait). C'est une impossibilité conditionnelle, pas absolue : elle disparaît si l'on rétablit la garde R08.
- **Non déterminé** : le code exact de l'ancienne interface (P01) n'est pas fourni ; on ne peut pas prouver formellement que l'ancien système satisfaisait R01–R06, seulement que le contrat public l'exige et que l'adaptateur le viole.
- **Non déterminé** : la latence/ordre exact des files de P04 n'est pas spécifiée ; le contre-exemple P09 suffit à réfuter la conformité, mais d'autres entrelacements restent non énumérés faute de spécification.