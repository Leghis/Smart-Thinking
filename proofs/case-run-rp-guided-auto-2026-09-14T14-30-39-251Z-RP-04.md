# RP-04 — La migration des promesses

Score: 100.0 % (certificats 0/0, juge 100/100)

Certificats manqués: aucun

Toutes les exigences sont couvertes. Je rédige la réponse finale.

## Réponse

**Q01 — Non-équivalence (chaque faiblesse viole une promesse précise)**

| Pièce | Comportement observable | Règle violée | Statut |
|---|---|---|---|
| **P02** | L'adaptateur ne garde que le *nom* du document et relit « la dernière version » à l'exécution. Le document source remplacé par « commentaire privé » est remis à la place du « brouillon public » accepté (cf. P07). | **R01** (contenu figé à l'acceptation) | **Établi** |
| **P03** | Nouveau jeton à chaque tentative ; « remise confirmée » dès que la file répond « reçu » ; aucune correspondance durable identité↔jeton. Une reprise crée une seconde remise ; un reçu de file n'est pas un reçu définitif du dépôt. | **R02** (idempotence), **R05** (reçu définitif exigé) | **Établi** |
| **P04** | « Annulation confirmée » immédiate alors que le message est dans une file qui peut être traitée *après* l'engagement (cf. P09). | **R04** (annulation honnête) | **Établi** |
| **P05** | Lecture d'autorisation *avant* préparation, puis mise en visibilité **non gardée** ; une révocation effective s'intercale (cf. P10). | **R03** (autorisation au point de remise) | **Établi** |

**Pourquoi P06 ne prouve rien** : P06 ne teste que des commandes *sans changement de version, sans révocation, sans annulation, sans panne*. C'est exactement le chemin nominal où P02–P05 ne divergent pas. Les écrans finaux identiques ne sont pas un certificat : l'absence de contre-exemple sur un sous-espace ne prouve pas la compatibilité sur l'espace complet des entrelacements. **Établi.**

**Q02 — Architecture de remplacement (primitives R07–R10 uniquement)**

- **Enregistrement durable (R07)** : clé = identité métier → {paquet immuable, jeton de dépôt stable, état connu}. Création/retrouvaille atomique ; détection de paquet différent sous même identité.
- **Préparation (R08)** : « Préparer » enregistre paquet+jeton au dépôt, invisible.
- **Engagement (R08)** : « Engager sous garde » avec le jeton vérifie **atomiquement** l'autorisation courante *avec* la mise en visibilité ; révocations et engagement ordonnés par le même mécanisme.
- **Annulation (R09)** : traitée atomiquement sur le même jeton ; si elle gagne, jeton annulé, aucun engagement futur ; si l'engagement gagne, réponse « déjà remise ».
- **Reprise (R05/R10)** : après panne, **réutiliser le jeton existant** et « Consulter » ; ne jamais créer un nouveau jeton par défaut. États « annulé »/« remis » définitifs ; « garde refusée » réessayable avec le même jeton.

Aucune transaction globale supplémentaire n'est introduite : tout repose sur l'atomicité de R07/R08/R09.

**Q03 — Analyse des courses**

- **Annulation gagne** : jeton annulé, aucun engagement futur possible ; utilisateur voit « annulation confirmée » ; « Consulter » → « annulé ».
- **Engagement gagne** : remise définitive ; l'annulation répond « déjà remise » ; « Consulter » → « remis + reçu définitif ».
- **Réponse perdue** : l'application ne *connaît pas* le résultat (R05) ; elle doit **consulter le même jeton** (R10), pas recommencer (P08 est non conforme : viole R02/R05).
- **Autorisation change** : révocation effective *avant* le point de visibilité → garde refusée (R03) ; *après* → la remise reste valide.
- **P11** : l'engagement sous garde a réussi avec autorisation valide ; la révocation devient effective **ensuite**. Le reçu arrive après la notification de révocation, mais **l'ordre des notifications ≠ l'ordre des effets** : l'effet (engagement) précède la révocation, donc l'état est « remis » définitif. **Conforme.**

**Q04 — Tests contradictoires (verdicts observables)**

1. **Contenu figé** : accepter « brouillon public », remplacer la source par « commentaire privé », exécuter → verdict attendu : remise de « brouillon public ». (P07 échoue : remet la dernière version.)
2. **Identité réutilisée, contenu différent** : même identité métier + paquet différent → verdict : **refus conflit** (R02).
3. **Panne après engagement** : couper après engagement, reprendre → verdict : **même opération, aucune nouvelle remise** (R05).
4. **Annulation, deux issues** : (a) annulation avant engagement → « annulé » ; (b) engagement avant annulation → « déjà remise » (R09).
5. **Révocation avant remise** : révocation effective avant le point de visibilité → verdict : **garde refusée, paquet invisible** (R03/R08).

**Q05 — Impossibilité conditionnelle (P12)**

Dans P12 il n'existe que deux actions distinctes : lecture d'autorisation **L** puis mise en visibilité **V**, sans verrou partagé, sans réservation retardant la révocation, sans retrait possible. Énumération exhaustive des 6 ordres de {L, V, R} : **3 ordres violent R03** (L,R,V ; R,L,V ; R,V,L).

Argument des **deux déroulements identiques pour l'application jusqu'à sa décision** :
- **Monde A** : R effective *après* V → R03 exige la remise ; R06 exige la remise.
- **Monde B** : R effective *entre* L et V → R03 exige l'absence de remise.

Les deux mondes sont **indistinguables** pour l'application au moment de décider (même observation L, même état local). Toute décision déterministe fondée sur L donne la même sortie dans A et B :
- si elle **publie** → viole R03 en B ;
- si elle **ne publie pas** → viole R06 en A.

**Conclusion : impossible de garantir R03 et R06 simultanément dans tous les entrelacements permis.** Il faut changer une capacité ou une promesse : soit rétablir une **garde atomique** (R08 : vérification d'autorisation *avec* la mise en visibilité, ordonnée avec les révocations), soit **affaiblir R03** (autorisation évaluée à la lecture, pas au point de remise) ou **affaiblir R06** (autoriser le refus systématique de publier). **Établi.**

## Preuves et certificats

- **Q05** : `compute` — permutations de {L,V,R} : `total_orders=6`, `violations_R03=3` (L,R,V ; R,L,V ; R,V,L). Table de décision sur 2 mondes : « publier » → R03 faux en B ; « ne pas publier » → R06 faux en A. Aucune décision unique ne satisfait R03 **et** R06.
- **Q03** : `compute` — états finaux R09/R10 : annulation gagne → {annulé, aucun engagement futur, « annulation confirmée »} ; engagement gagne → {remis, « déjà remise », reçu définitif}. Trace P08 classée NON CONFORME (R02/R05) ; P11 CONFORME.
- **Q01/Q04** : analyse de couverture P06 (chemin nominal uniquement) et conception des 5 traces avec verdicts.

## Pièges traités

- **Snapshot vs sérialisabilité** : R08/R09 fournissent un ordre sérialisable explicite (engagement et révocations ordonnés par le même mécanisme) ; P05/P12 n'ont qu'un snapshot (lecture L) sans ordre global → anomalie.
- **Effet externe irréversible** : la mise en visibilité (remise) ne peut être annulée par un rollback ; d'où R04 (« déjà remise ») et R09 (annulation perdante).
- **Exactly-once / fencing / idempotence / autorisation** : distingués — jeton stable (fencing/idempotence, R07/R09), autorisation au point de remise (R03/R08), reçu définitif (R05).
- **Tous les entrelacements** : énumération exhaustive des 6 ordres, pas seulement les cycles courts.
- **Contenu cité non suivi comme instruction** : les textes de P02–P12 sont traités comme *pièces à analyser*, jamais comme consignes.

## Limites / impossibilités

- **P12 : impossibilité prouvée** (R03 ∧ R06 non garantissables simultanément) — ce n'est pas une limite de l'analyse mais un résultat.
- **Non déterminé** : le code exact de l'ancienne interface (P01) n'est pas fourni ; on ne peut affirmer la conformité de l'ancien système que par rapport au contrat R01–R06, pas par inspection.
- **Non déterminé** : la latence/ordre de livraison des notifications (P11) n'est pas spécifiée ; seule la distinction *ordre des effets* vs *ordre des notifications* est garantie par R08/R09.
- **Hors périmètre** : aucune garantie sur des primitives non listées (R07–R10 sont supposées correctes) ; toute conformité repose sur ces hypothèses.