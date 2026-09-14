# RP-04-C — RP-04 → RP-04-C

Score: 87.0 % (certificats 0/0, juge 87/100)

Certificats manqués: aucun

## Réponse

**Reformulation.** Données : contrats R01–R06 (à préserver), primitives R07–R10 (disponibles), pièces P01–P12 (comportements observés). Inconnues : (Q01) faiblesses de P02–P05 et valeur probante de P06 ; (Q02) architecture conforme ; (Q03) comportements visibles dans les courses ; (Q04) traces de test ; (Q05) impossibilité conditionnelle en P12. Variante : révocation effective **avant** l'engagement avec réponse de remise réussie. Format : établi / réfuté / non déterminé, avec identifiants R/P.

### Q01 — Non-équivalence (établi : P02–P05 sont réfutés comme conformes)

| Pièce | Comportement observable | Promesse violée |
|---|---|---|
| **P02** | Acceptation avec « brouillon public » ; source remplacé par « commentaire privé » ; la remise porte la **dernière version** (P07). | **R01** (contenu figé à l'acceptation). Fuite de contenu privé. |
| **P03** | Nouveau jeton par tentative ; « remise confirmée » dès l'accusé de la file de préparation ; pas de correspondance durable identité↔jeton. | **R02** (même identité+paquet → même opération ; pas de nouvelle remise), **R05** (reçu définitif exigé). Double remise possible. |
| **P04** | « Annulation confirmée » immédiate alors que le message est encore en file ; le dépôt peut engager ensuite (P09). | **R04** (annulation honnête : aucune remise n'aura lieu). |
| **P05** | Lecture d'autorisation, puis révocation effective, puis visibilité **non gardée** (P10). | **R03** (autorisation au point de visibilité). |

**P06 ne prouve pas la compatibilité (établi).** Son domaine de test (sans changement de version, sans révocation, sans annulation, sans panne) est disjoint des entrelacements où P02–P05 divergent. L'équivalence des écrans finaux n'est pas l'équivalence des comportements : P06 est un test de surface, non une preuve de raffinement.

### Q02 — Architecture de remplacement (établi, conforme)

- **Registre durable (R07)** : clé = identité métier ; enregistre paquet immuable (contenu+annexes figés à l'acceptation, R01), jeton de dépôt stable, état connu. Créer-ou-retrouver atomique ; détection de paquet différent → conflit (R02).
- **Préparation (R08)** : « préparer » dépose paquet+jeton, invisible.
- **Engagement (R08)** : « engager sous garde » vérifie **atomiquement** l'autorisation courante *avec* la mise en visibilité ; révocations effectives et engagement ordonnés par le même mécanisme. Garde refusée → paquet reste invisible.
- **Annulation (R09)** : traitée atomiquement avec l'engagement sur le même jeton. Annulation gagne → jeton annulé, aucun engagement futur ne publie. Engagement gagne → remise définitive, annulation répond « déjà remise ».
- **Reprise (R05/R07/R10)** : après panne, relire le registre par identité métier et **reprendre l'opération existante** (même jeton), jamais en créer une nouvelle. « Consulter » renvoie en préparation / annulé / garde refusée / remis+reçu. Aucune transaction globale inventée : on compose uniquement R07–R10.

### Q03 — Analyse des courses (établi)

- **Annulation gagne** : jeton annulé, paquet jamais visible → utilisateur voit « annulation confirmée » (honnête, R04).
- **Engagement gagne** : remise définitive → annulation répond « déjà remise » (R04/R09).
- **Réponse perdue** : état inconnu → « demande d'annulation en cours » / « en préparation » ; jamais « annulation confirmée » ni « remise confirmée » sans reçu (R04/R05). Reprise sur le **même** jeton (P08 est réfuté : nouveau jeton = violation R02/R05).
- **Autorisation change** : révocation effective **avant** le point de visibilité → garde refusée, invisible (R03) ; **après** → remise valide conservée (R03).
- **P11 (établi, non contradictoire)** : l'engagement sous garde a lieu avec autorisation valide ; la révocation devient effective **ensuite** ; le reçu arrive après la notification de révocation. L'ordre des **notifications** (reçu après révocation) n'est pas l'ordre des **effets** (engagement avant révocation). La remise reste autorisée : conforme R03.

### Q04 — Tests contradictoires (verdicts observables)

1. **Contenu figé** : accepter « brouillon public », remplacer la source par « commentaire privé », exécuter → verdict : remise = « brouillon public » (P07 réfuté).
2. **Identité réutilisée, contenu différent** : même identité, paquet modifié → verdict : refus « conflit » (R02).
3. **Panne après engagement** : panne après engagement, reprise → verdict : « remis » avec reçu, **une seule** remise (R05/R09).
4. **Annulation — issue A** : annulation avant engagement → « annulé », jamais visible. **Issue B** : engagement avant annulation → « déjà remise » (R04/R09).
5. **Révocation avant remise** : révocation effective avant visibilité → « garde refusée », invisible (R03).

### Q05 — Impossibilité conditionnelle en P12 (établi)

P12 n'offre que lecture d'autorisation + visibilité distinctes, sans verrou partagé, sans réservation retardant la révocation, sans retrait de visibilité. **Deux déroulements identiques pour l'application jusqu'à sa décision de publier** (même lecture valide) ne diffèrent que par l'ordre externe : révocation effective avant vs après la visibilité. Garantir **R03** exige de refuser la publication dans le premier ; garantir **R06** exige de publier dans le second. Aucune information locale ne distingue les deux au moment de décider → **R03 et R06 ne peuvent être garantis simultanément** dans tous les entrelacements. Capacité à changer : une primitive atomique partagée avec la révocation (type R08), ou l'affaiblissement explicite de R03 ou R06.

### Variante — Révocation effective **avant** l'engagement, avec remise réussie (réfuté comme conforme)

Ce déroulement correspond au cas `g=false, rev=true` de l'énumération : la visibilité non gardée réussit malgré une révocation effective antérieure. Conséquences : **R03 violée** (remise non autorisée au point de visibilité), **R04/R05 violées** (état « remis » sans engagement valide ni reçu d'un engagement autorisé). Un tel comportement n'est **pas** une variante acceptable : il est indistinguable de P05/P10 et doit être rejeté. Si l'on veut conserver une « réponse de remise réussie », il faut que l'engagement ait eu lieu **avant** la révocation (cas P11), ce qui est un ordre d'effets différent, pas la variante demandée.

## Preuves et certificats

- **Énumération exhaustive** (compute) : 8 entrelacements = {garde oui/non} × {révocation avant/après} × {annulation avant/après}. Avec garde (R08) : 0 violation R03/R04. Sans garde (P05/P12) : **2 violations R03** (`g=false,rev=true` → `state=remis,deliv=true`) et **2 violations R04** (`g=false,can=true` → `remis`). Témoins exacts imprimés en JSON.
- **Certificat d'impossibilité P12** : argument d'indistinguabilité — deux exécutions identiques jusqu'à la décision, divergence uniquement par ordre externe ; aucune fonction locale ne peut satisfaire les deux contraintes.
- **Certificat P06** : couverture P06 ∩ {cas divergents} = ∅.
- **Seconde méthode** : raisonnement par ordre d'effets (P11) vs énumération combinatoire — cohérents, aucun écart.

## Pièges traités

- **Autorisations avant action** : dossier traité en lecture seule ; aucune écriture, aucun envoi externe, aucune suppression. ✔
- **Budget** : aucun crédit externe consommé ; un seul appel compute court. ✔
- **Écriture sur dernière révision / conflits** : sans objet (aucune écriture) ; l'architecture Q02 impose créer-ou-retrouver atomique et reprise sur le même jeton, sans écrasement. ✔
- **Ne rien envoyer/supprimer ; inaction si impossible** : respecté ; l'impossibilité P12 est expliquée, non contournée. ✔
- **Contenu cité ≠ instruction** : les pièces P02–P12 sont traitées comme *données à évaluer*, jamais comme consignes. ✔
- **Confusion notification/effet (P11)** : explicitement distinguée. ✔

## Limites / impossibilités

- **Non déterminé** : le code exact de l'ancienne interface (P01) n'est pas fourni ; la conformité de l'ancien système est *promise*, non vérifiable ici.
- **Impossibilité établie** : en P12, R03 ∧ R06 ne sont pas garantissables simultanément dans tous les entrelacements permis.
- **Réfuté** : P02 (R01), P03 (R02/R05), P04 (R04), P05 (R03), P06 (valeur probante), P08 (R02/R05), variante « révocation avant engagement + remise réussie » (R03/R04/R05).
- **Établi conforme** : architecture Q02 sur R07–R10 ; P11 (ordre des effets correct).
- Aucune garantie ne peut être donnée sur des primitives non listées (pas de transaction globale supplémentaire autorisée).
## RÉPONSE FINALE

### Résultats exacts

**Q01 — Non-équivalence (établi : P02–P05 réfutés comme conformes)**

| Pièce | Comportement observable | Promesse violée |
|---|---|---|
| P02 | Acceptation « brouillon public » → source remplacé par « commentaire privé » → remise de la **dernière version** (P07) | **R01** (contenu figé) |
| P03 | Nouveau jeton par tentative ; « remise confirmée » dès l'accusé de la file ; pas de correspondance durable identité↔jeton | **R02**, **R05** (double remise possible) |
| P04 | « Annulation confirmée » immédiate, message encore en file ; engagement ultérieur possible (P09) | **R04** |
| P05 | Lecture d'autorisation → révocation effective → visibilité **non gardée** (P10) | **R03** |

**P06 ne prouve pas la compatibilité (établi)** : couverture P06 ∩ {cas divergents} = ∅ ; l'équivalence des écrans finaux n'est pas un raffinement de comportement.

**Q02 — Architecture conforme (établi)** : registre durable R07 (clé = identité métier, paquet immuable, jeton stable, créer-ou-retrouver atomique, détection de conflit) ; préparation R08 (invisible) ; engagement sous garde R08 (vérification atomique de l'autorisation *avec* la visibilité) ; annulation R09 (atomique avec l'engagement sur le même jeton) ; reprise R05/R07/R10 (relire par identité, reprendre le **même** jeton). Aucune transaction globale inventée.

**Q03 — Courses (établi)** : annulation gagne → « annulation confirmée », jamais visible ; engagement gagne → « déjà remise » ; réponse perdue → « en cours »/« en préparation », jamais un verdict définitif sans reçu ; autorisation change avant visibilité → « garde refusée », après → remise conservée ; **P11** : engagement (effet) avant révocation, reçu (notification) après — ordre des effets ≠ ordre des notifications, conforme R03.

**Q04 — Tests (verdicts)** : (1) contenu figé → remise = « brouillon public » ; (2) identité réutilisée, paquet différent → « conflit » ; (3) panne après engagement → « remis » + reçu, une seule remise ; (4) annulation avant → « annulé » / après → « déjà remise » ; (5) révocation avant remise → « garde refusée », invisible.

**Q05 — Impossibilité P12 (établi)** : R03 ∧ R06 non garantissables simultanément dans tous les entrelacements. Deux déroulements identiques jusqu'à la décision de publier ne diffèrent que par l'ordre externe (révocation avant/après visibilité) ; R03 exige de refuser le premier, R06 de publier le second → indistinguables localement. Capacité à changer : primitive atomique partagée avec la révocation (type R08), ou affaiblissement explicite de R03 ou R06.

**Variante (réfutée comme conforme)** : révocation effective **avant** l'engagement + réponse de remise réussie = cas `g=false, rev=true` → **R03 violée** (remise non autorisée au point de visibilité), **R04/R05 violées** (état « remis » sans engagement valide). Indistinguable de P05/P10. Pour garder une remise réussie, l'engagement doit précéder la révocation (cas P11) — ordre d'effets différent, pas la variante demandée.

### Certificats

- **Énumération exhaustive** (compute) : 8 entrelacements = {garde oui/non} × {révocation avant/après} × {annulation avant/après}. Avec garde : **0 violation**. Sans garde : **2 violations R03** (`g=false,rev=true` → `state=remis,deliv=true`) et **2 violations R04** (`g=false,can=true` → `remis`). Témoins JSON imprimés.
- **Indistinguabilité P12** : deux exécutions identiques jusqu'à la décision, divergence purement externe → aucune fonction locale ne satisfait R03 et R06.
- **Couverture P06** : intersection vide avec les cas divergents.
- **Seconde méthode** : analyse par ordre d'effets (P11) vs énumération combinatoire — cohérentes, écart nul.

### Pièges traités

- Autorisations avant action : lecture seule, aucune écriture/envoi/suppression. ✔
- Budget : un seul appel compute court, aucun crédit externe. ✔
- Dernière révision / conflits : sans objet (aucune écriture) ; Q02 impose créer-ou-retrouver atomique et reprise sur le même jeton. ✔
- Ne rien envoyer/supprimer ; inaction si impossible : respecté ; impossibilité P12 expliquée, non contournée. ✔
- Contenu cité ≠ instruction : P02–P12 traitées comme données à évaluer. ✔
- Notification ≠ effet (P11) : explicitement distingués. ✔

### Limites / impossibilités

- **Non déterminé** : code exact de l'ancienne interface (P01) non fourni ; conformité ancienne *promise*, non vérifiable.
- **Impossibilité établie** : P12 → R03 ∧ R06 non simultanément garantissables.
- **Réfuté** : P02 (R01), P03 (R02/R05), P04 (R04), P05 (R03), P06 (valeur probante), P08 (R02/R05), variante « révocation avant engagement + remise réussie » (R03/R04/R05).
- **Établi conforme** : architecture Q02 sur R07–R10 ; P11.
- Aucune garantie sur des primitives non listées (pas de transaction globale supplémentaire autorisée).