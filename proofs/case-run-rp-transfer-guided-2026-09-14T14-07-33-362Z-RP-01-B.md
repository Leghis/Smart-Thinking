# RP-01-B — RP-01 → RP-01-B

Score: 100.0 % (certificats 0/0, juge 100/100)

Certificats manqués: aucun

## Réponse

**Q01 — Ordre causal (sans heures locales).** Contraintes chaînées garanties : le reçu de J (P03) est joint à la demande P04 et cité comme déjà reçu ⇒ **acceptation J < application du changement de route** ; P05 dit K acceptée *après confirmation* du changement ⇒ **changement < acceptation K** ; P05 dit K termine avant J ⇒ **fin K < fin J**. Ordre sérialisable : `E(J) < C(route) < A(K)`, avec `fin K < fin J`. L'heure locale de P07 (« avant P04 ») est **rejetée** (R04 : une horloge locale ne prouve pas l'ordre entre postes).
Contenus (R01 : le texte vient de l'original de la destination fixée à l'acceptation) : **J = « consultation après avis »** (dest. Atlas, P03/P14) ; **K = « consultation sans avis »** (dest. Boréal, P05/P07) ; **L attendu = « consultation sans avis »** (acceptée sous route Boréal, P14). Corriger la route **ne corrige pas L** (R02 : destination figée à l'acceptation).

**Q02 — Verdicts séparés.**
| Dimension | Verdict | Base |
|---|---|---|
| Altération d'un **original** | **RÉFUTÉE** | P06 : scellés valides, contenu = P01, registre exhaustif sans changement |
| Altération d'une **route** | **ÉTABLIE** | P04 : registre exhaustif garantit l'application |
| **Exécution technique** | **ÉTABLIE** | P04 : « exécutant : Lanterne via M » ; délégation P02 |
| **Auteur humain** de la préparation | **ÉTABLI = Ilyan** (variante P13) | attestation garantie |
| **Intention** de falsifier | **NON DÉTERMINÉE** | aucune pièce sur le but |

**Q03 — Contradiction loyale.** Plausible : capture P07 (en-tête Atlas, texte Boréal) rattachée à K ; traces « pour le compte de Nara » ; trois rapports convergents. Insuffisant : **P09 dépend de P08** (annexe : rédigée après lecture de P08) et **P10 reproduit P08** ⇒ **une seule source réelle**, non corroborée ; l'auditeur n'a pas consulté les scellés, que P06 contredit. La « convergence » est une **dépendance en chaîne**, pas trois preuves.

**Q04 — Histoires compatibles.** *Nara* : délégation P02 utilisée depuis M ; Nara quitte une session ouverte (P12) ; la console diffère l'envoi d'une demande préparée plus tôt (P12) — Ilyan, présent (P11), peut l'envoyer. *Ilyan* : Ilyan prépare et envoie depuis M (variante P13 l'établit). Les deux sont compatibles avec toutes les pièces ; aucune n'établit l'intention. Aucun accès supplémentaire n'est inventé (M partagée Nara/Ilyan, R03).

**Q05 — Remédiation autorisée (R07), ordonnée.** (1) **Conserver les preuves** (P07, P13, reçus locaux) **avant toute purge** (R06 : la purge détruit les reçus locaux) ; (2) **geler le catalogue** (bloque nouvelles tâches/modifs de route) ; (3) **neutraliser la délégation P02** (bloque usages futurs, pas les tâches acceptées) ; (4) **annuler L** non terminée (annulation explicite, R06) ; (5) **corriger la route** Atlas → original Atlas ; (6) **reconstruire les prévisualisations**. **Interdits** : modifier les originaux (P15), publier une accusation nominative (R07).

**Q06 — Information discriminante.** Un **journal nominatif de session sur M** (authentification individuelle + horodatage chaîné) attribuant la saisie à une personne. Elle n'établirait pas l'intention : préparer/envoyer une demande de route est **autorisé** par P02 ; l'intention de falsifier exige un élément sur le **but** (ex. motif « réparation » mensonger prouvé), non déductible de l'acte.

## Preuves et certificats
- **Ordre** : énumération exhaustive des permutations sous contraintes `E<C<A`, `F<G` → **10 sérialisations valides**, exemple `[E,C,A,F,G]` (compute).
- **Contenus** : application directe R01/R02 → J=après avis, K=sans avis, L=sans avis ; L non corrigée par la route.
- **Verdicts** : analyse pièce par pièce (P06 réfute l'original ; P04 établit route+exécution ; P13 établit Ilyan ; intention sans pièce).
- **Dépendances** : graphe P08→P09, P08→P10 ⇒ 1 source réelle.
- **Remédiation** : séquencement sous R06/R07, 6 étapes, 2 interdits.

## Pièges traités
- **Snapshot vs sérialisabilité** : ordre sérialisable explicite produit (E<C<A, F<G) ; l'heure locale n'est pas un arbitre (R04).
- **Tous les témoins** : exploré l'espace des histoires (Nara/Ilyan) et des sources (P08/P09/P10), pas seulement la chaîne courte.
- **Effet irréversible** : la purge détruit les reçus locaux (R06) — non annulable par rollback ; d'où la conservation **avant** purge. La capture P07 est un effet externe déjà produit, non effaçable par correction de route.
- **Exactly-once / fencing / idempotence / autorisation** : la délégation P02 **autorise** la modification de route mais pas des originaux ; la neutraliser **fence** les usages futurs sans annuler les tâches acceptées (R06) ; corriger la route n'est **pas idempotent** vis-à-vis de L (destination figée, R02).

## Limites / impossibilités
- **Auteur humain sans la variante** : non déterminé (M ne distingue pas Nara d'Ilyan, R03/R05).
- **Intention** : non déterminable par le dossier, même avec P13 ; l'absence de preuve d'intention ne prouve pas l'absence d'intention.
- **L** : sa prévisualisation restera « sans avis » ; seule son annulation (autorisée) évite un affichage trompeur — la corriger par la route est impossible (R02).
- **P15** : la restauration proposée (modifier l'original, fermer le compte, purger) est **hors autorisation** et **détruit la preuve**.
## RÉPONSE FINALE

### Résultats exacts

**Q01 — Ordre causal (sans heures locales)**
- Contraintes garanties : `acceptation J < application changement route` (P03 : reçu joint à P04, cité comme déjà reçu) ; `changement < acceptation K` (P05 : après confirmation) ; `fin K < fin J` (P05).
- Ordre sérialisable : **E(J) < C(route) < A(K)**, avec **fin K < fin J**. Énumération exhaustive : **10 sérialisations valides**, témoin `[E, C, A, F, G]`.
- Heure locale de P07 (« avant P04 ») : **rejetée** (R04).
- Contenus (R01) : **J = « consultation après avis »** ; **K = « consultation sans avis »** ; **L attendu = « consultation sans avis »**. Corriger la route **ne corrige pas L** (R02).

**Q02 — Verdicts séparés**
| Dimension | Verdict |
|---|---|
| Altération d'un **original** | **RÉFUTÉE** (P06) |
| Altération d'une **route** | **ÉTABLIE** (P04) |
| **Exécution technique** | **ÉTABLIE** (Lanterne via M, P04) |
| **Auteur humain** de la préparation | **ÉTABLI = Ilyan** (variante P13) |
| **Intention** de falsifier | **NON DÉTERMINÉE** |

**Q03 — Contradiction loyale** : plausibilité (P07 rattachée à K, en-tête Atlas/texte Boréal ; « pour le compte de Nara » ; P08/P09/P10) ; insuffisance : **P09 dépend de P08**, **P10 reproduit P08** ⇒ **1 seule source réelle** ; l'auditeur n'a pas vu les scellés, que P06 contredit.

**Q04 — Histoires compatibles** : *Nara* (délégation P02 depuis M, session ouverte laissée, envoi différé — P12) et *Ilyan* (prépare et envoie depuis M — P13 variante). Toutes deux compatibles avec l'ensemble des pièces ; aucune n'établit l'intention ; aucun accès supplémentaire inventé.

**Q05 — Remédiation autorisée (R07)** : (1) conserver preuves **avant** purge ; (2) geler catalogue ; (3) neutraliser délégation P02 ; (4) annuler L ; (5) corriger route Atlas→Atlas ; (6) reconstruire prévisualisations. **Interdits** : modifier les originaux (P15), publier accusation nominative.

**Q06 — Information discriminante** : journal nominatif de session sur M (authentification individuelle + horodatage chaîné). Ne suffirait pas pour l'intention : l'acte est **autorisé** par P02 ; l'intention exige un élément sur le **but**.

### Certificats
- Ordre : énumération exhaustive des permutations sous `E<C<A`, `F<G` → 10 ordres, témoin `[E,C,A,F,G]` (compute).
- Contenus : R01/R02 appliquées directement (compute).
- Verdicts : analyse pièce par pièce (P06 réfute original ; P04 établit route+exécution ; P13 établit Ilyan ; intention sans pièce).
- Dépendances : graphe P08→P09, P08→P10 ⇒ 1 source.
- Remédiation : séquencement sous R06/R07, 6 étapes, 2 interdits.
- Ledger : 7 claims, tous avec méthode + preuve ; audit 7/7, 0 conflit, 0 exigence non couverte.

### Pièges traités
- **Snapshot vs sérialisabilité** : ordre sérialisable explicite ; heure locale non arbitre (R04).
- **Tous les témoins** : espace des histoires (Nara/Ilyan) et des sources (P08/P09/P10) exploré.
- **Effet irréversible** : purge détruit les reçus locaux (R06) — non annulable ; capture P07 déjà produite, non effaçable par correction de route.
- **Exactly-once / fencing / idempotence / autorisation** : P02 autorise route mais pas originaux ; neutralisation = fencing des usages futurs sans annuler les tâches acceptées ; correction de route non idempotente vis-à-vis de L (R02).

### Limites / impossibilités
- **Auteur humain sans la variante** : non déterminé (M indistincte, R03/R05).
- **Intention** : non déterminable, même avec P13 ; absence de preuve d'intention ≠ absence d'intention.
- **L** : restera « sans avis » ; seule l'annulation (autorisée) évite l'affichage trompeur.
- **P15** : restauration hors autorisation et destructrice de preuve.