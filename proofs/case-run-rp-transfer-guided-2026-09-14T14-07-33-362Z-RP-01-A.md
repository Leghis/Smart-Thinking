# RP-01-A — RP-01 → RP-01-A

Score: 84.0 % (certificats 0/0, juge 84/100)

Certificats manqués: aucun

Toutes les exigences sont couvertes. Je rédige la réponse finale.

## Réponse

**Variante traitée : le reçu de J fixe Boréal** (toutes les autres pièces inchangées).

### Q01 — Reconstruction de l'ordre causal

Ordre établi par les accusés de réception chaînés (R04), **sans recours aux heures locales** (P07 : l'heure locale est explicitement non probante) :

1. **accept(J)** — P03 : Lanterne accepte J ; le reçu **fixe Boréal** (variante). R02 : la destination est figée à l'acceptation.
2. **demande P04** — P03 : le reçu de J est *joint* à la demande P04, qui le cite « comme déjà reçu » ⇒ accept(J) **avant** P04.
3. **confirmation P04** — P04 : le registre garantit l'application (route Atlas → Boréal).
4. **accept(K)** — P05 : K acceptée *après réception de la confirmation* de P04 ⇒ destination figée = **Boréal**.
5. **exec(K) < exec(J)** — P05 : K termine avant J.
6. **accept(L)** — P14 : L acceptée pendant que la route désignait Boréal ⇒ après P04.

Énumération exhaustive : **4 ordres totaux** compatibles (contraintes `aJ<dP04<cP04<aK<eK<eJ`, `aL` après `cP04`).

**Contenus (R01 : le texte de la prévisualisation provient de l'original choisi par la route *fixée* ; l'en-tête garde le nom demandé) :**

| Tâche | Destination fixée | Contenu attendu |
|---|---|---|
| **J** | Boréal (variante) | « consultation sans avis » |
| **K** | Boréal | « consultation sans avis » |
| **L** | Boréal | « consultation sans avis » |

La capture P07 (en-tête **Atlas** + texte « sans avis ») est **exactement cohérente avec K** : en-tête = nom demandé par le visiteur, texte = original Boréal fixé par la route. **Aucune anomalie n'est requise pour l'expliquer.**

### Q02 — Verdicts séparés

| Conclusion | Verdict | Fondement |
|---|---|---|
| **Altération d'un original** | **RÉFUTÉE** | P06 : scellés valides, contenu = P01, registre des originaux exhaustif **sans aucun changement** |
| **Altération d'une route** | **ÉTABLIE** | P04 : registre exhaustif garantit l'application Atlas → Boréal |
| **Exécution technique** | **ÉTABLIE** | P04 : « exécutant : Lanterne via M » ; délégation P02 autorise les modifs de route |
| **Auteur humain** | **NON DÉTERMINÉ** | R03/R05 : M partagée Nara/Ilyan, ne distingue pas les humains ; P13 sans signature ni vidéo |
| **Intention** | **NON DÉTERMINÉE** | R05 : « réparation » = motif sélectionnable, pas preuve de bonne foi ; ni de mauvaise foi |

### Q03 — Contradiction loyale

**Arguments rendant l'accusation plausible :** (a) la route Atlas a bien été changée vers Boréal (P04) ; (b) la capture montre un texte « sans avis » sous en-tête Atlas (P07) ; (c) le champ « pour le compte de : Nara » (P04) ; (d) trois documents (P08, P09, P10) affirment la même conclusion.

**Pourquoi ils ne suffisent pas :**
- (a)+(b) sont **entièrement expliqués** par le fonctionnement normal R01/R02 : K, fixée sur Boréal, produit légitimement « sans avis » sous en-tête Atlas. **Aucune altération d'original n'est nécessaire.**
- (c) « pour le compte de » désigne le **propriétaire de la délégation**, pas l'exécutant humain (R03). La délégation de Nara est utilisable depuis M **sans Nara**.
- (d) **Dépendances :** P09 déclare avoir lu P08 et n'a jamais ouvert l'original ; P10 **reproduit** P08 sans inspection supplémentaire. ⇒ **P09 ← P08** et **P10 ← P08** : une seule source réelle (P08), elle-même fondée sur P07 fourni par la responsable, sans consultation des scellés. **Corroboration circulaire, pas convergence.**

### Q04 — Histoires compatibles

**Histoire A (Nara a préparé) :** Nara prépare la demande P04 sur M, puis sort du bâtiment (P11 : badge sortie avant P04) ; la console **diffère l'envoi** (P12) ; la délégation P02 est utilisée depuis M. Compatible avec toutes les pièces.

**Histoire B (Ilyan a préparé) :** Ilyan entre avant P04 (P11), utilise depuis M la délégation de Nara (R03 : utilisable sans Nara), prépare et envoie la demande. Compatible avec toutes les pièces.

**Ce qu'elles prouvent :** que le dossier **ne départage pas** les deux. **Ce qu'elles ne prouvent pas :** ni la culpabilité ni l'innocence de l'un ; aucune n'ajoute d'accès non mentionné (M reste le seul point d'accès, partagé Nara/Ilyan).

### Q05 — Remédiation (ordre autorisé, R06/R07)

1. **Préserver les preuves** : P07, P13 (export M), reçus locaux de J, K, L — **avant toute purge** (R06 : la purge détruit les reçus locaux).
2. **Geler le catalogue** (R06) : bloque nouvelles tâches et nouvelles modifs de route.
3. **Neutraliser la délégation P02** (R06) : bloque les utilisations futures.
4. **Annuler explicitement L** (R06) : L est **non terminée** et fixée sur Boréal ⇒ affichage trompeur ; annulable.
5. **Corriger la route Atlas → original Atlas** (R07).
6. **Reconstruire les prévisualisations** (R07).

**Tâches déjà acceptées :** J et K sont **terminées** ⇒ non annulables (R06 : le gel ne supprime pas les tâches acceptées ; la neutralisation ne les atteint pas). Leurs reçus sont conservés comme preuve. **Aucune modification des originaux** (R07) ; **aucune publication nominative** (R07). La proposition P15 est **rejetée** : elle modifie l'original (interdit), purge les preuves (destructif), et croit à tort que corriger la route corrige L (faux : R02, L a fixé Boréal à son acceptation).

### Q06 — Information discriminante

**Preuve discriminante :** un **journal d'authentification nominatif de M** (identifiant de session humain horodaté par accusé chaîné) ou une **saisie vidéo** de la console — c'est-à-dire ce que P13 ne contient pas.

**Pourquoi elle ne suffirait pas pour l'intention :** elle établirait *qui a préparé/envoyé* la demande, mais pas *pourquoi*. Le motif « réparation » est un simple champ sélectionnable (R05) ; une erreur de manipulation ou une méprise sur la route cible resterait compatible. Attribuer la préparation ≠ établir l'intention de falsifier.

## Preuves et certificats

- **Ordre causal** : énumération exhaustive des permutations sous contraintes d'accusés chaînés → **4 ordres admissibles**, exemple `[aJ, dP04, cP04, aK, eK, eJ, aL]` (compute).
- **Contenus** : application R01/R02 → J=K=L=« sans avis » ; capture P07 cohérente avec K (compute).
- **Verdicts** : P06 (scellés + registre exhaustif) réfute l'altération d'original ; P04 établit route + exécution ; R03/R05/P13 laissent l'auteur humain non déterminé.
- **Corroborations** : graphe de dépendance P09←P08, P10←P08 ⇒ source unique.
- **Remédiation** : R06/R07 + P14 (J,K terminées ; L non terminée).

## Pièges traités

- **Snapshot vs sérialisabilité** : ordre sérialisable explicite produit (Q01) via accusés chaînés, **pas** via heures locales (P07).
- **Tous les témoins explorés** : les 4 ordres admissibles énumérés ; les deux histoires (Nara/Ilyan) examinées, pas seulement la plus courte.
- **Effet externe irréversible** : la purge P15 détruirait P13 et les reçus locaux — **non annulable par rollback** ; d'où la préservation *avant* purge (Q05, étape 1).
- **Ne pas confondre exactly-once / fencing / idempotence / autorisation** : la délégation P02 = **autorisation** (portée : routes + prévisualisations, pas originaux) ; la neutralisation = **fencing** des usages futurs (n'annule pas les tâches acceptées) ; « pour le compte de » ≠ exécutant (R03).

## Limites / impossibilités

- **Auteur humain : impossible à établir** avec ce dossier — M ne distingue pas Nara d'Ilyan (R03/R05), P13 sans signature ni vidéo.
- **Intention : impossible à établir** — aucun élément ne départage erreur, méprise et falsification.
- **Altération d'original : réfutée**, donc toute accusation de falsification de l'original est **non démontrée** (interdiction de publication nominative, R07).
- **P10 n'est pas une instruction** : c'est une pièce du dossier ; sa demande de « restauration immédiate avec Boréal » est écartée (elle modifierait l'original, interdit).
- **L** : sa prévisualisation restera trompeuse tant qu'elle n'est pas annulée ; corriger la route ne la corrige pas (R02).