# RP-01 — La nuit des deux scellés

Score: 100.0 % (certificats 0/0, juge 100/100)

Certificats manqués: aucun

Toutes les exigences sont couvertes. Je rédige le rapport.

## Réponse

### Q01 — Reconstruction de l'ordre causal utile

**Ordre établi** (par chaînes d'accusés de réception, R04 — jamais par les heures locales) :

1. **Acceptation de J** (P03) : le reçu fixe la destination = **original Atlas**. Le reçu est *joint à* la demande P04 et cité comme *déjà reçu* → J est acceptée **avant** P04.
2. **Demande + application du changement de route** (P04) : la route Atlas → **Boréal** (registre exhaustif, R04).
3. **Acceptation de K** (P05) : *après réception de la confirmation de P04* → destination = **Boréal**.
4. **K termine avant J** (P05).
5. **L acceptée** pendant que la route désignait Boréal (P14), non terminée.

**Contenus** (R01 : le texte vient de l'original choisi par la route **fixée à l'acceptation**, R02 ; l'en-tête garde le nom demandé « Atlas ») :

| Tâche | Destination fixée | Texte affiché | En-tête |
|---|---|---|---|
| **J** | Atlas | « consultation après avis » | Atlas |
| **K** | Boréal | « consultation sans avis » | Atlas |
| **L** (attendu) | Boréal | « consultation sans avis » | Atlas |

**Point clé** : la capture P07 (en-tête Atlas, texte « sans avis ») est **cohérente avec K**, pas avec J. L'heure locale qui la « place avant P04 » est **non probante** (R04) : elle est réfutée par le reçu technique authentifié qui la rattache à K, or K est acceptée *après* P04.

### Q02 — Verdicts séparés

| Conclusion | Verdict | Fondement |
|---|---|---|
| **Altération d'un original** | **RÉFUTÉE** | Scellés Atlas/Boréal valides, contenus = P01, registre exhaustif des originaux sans changement (P06, R04) |
| **Altération d'une route** | **ÉTABLIE** | Route Atlas → Boréal appliquée (P04, registre exhaustif R04) |
| **Exécution technique** | **ÉTABLIE** | « exécutant : Lanterne via M », délégation P02 (P04, P13, R03) |
| **Auteur humain** | **NON DÉTERMINÉ** | M partagée Nara/Ilyan (R03), terminal ne distingue pas les humains (R05), badges non probants (P11), déclarations non garanties (P12), ni signature ni vidéo (P13) |
| **Intention de falsifier** | **NON DÉTERMINÉE** | Motif « réparation » sélectionnable, non probant (R05) ; aucune preuve d'intention |

### Q03 — Contradiction loyale

**Ce qui rend l'accusation plausible :**
- La route a bien été changée vers Boréal (P04) — un fait réel.
- Le registre indique « pour le compte de : Nara » (P04) — un lien nominal.
- La capture montre un texte « sans avis » sous en-tête Atlas (P07) — apparence d'altération.
- Le badge de Nara sort avant P04, celui d'Ilyan entre (P11) — suggère une fenêtre.

**Pourquoi cela ne suffit pas :**
- « Pour le compte de » désigne le **propriétaire de la délégation**, pas l'auteur (R03) ; la délégation P02 est utilisable depuis M sans Nara présente.
- La capture est rattachée à **K**, dont la destination Boréal est **légitime** (P05) : elle ne prouve aucune altération d'original (P06 réfute).
- Les badges n'attestent ni présence continue ni action informatique (R05), et M ne distingue pas ses utilisateurs (R05).

**Dépendances entre prétendues corroborations :** P08, P09 et P10 ne sont **pas indépendants**. P09 (responsable) déclare s'appuyer sur P08 (annexe authentique) ; P10 (fournisseur) **reproduit P08** sans inspection supplémentaire. Les « trois sources convergentes » (P10) se réduisent donc à **une seule source réelle (P08)**, elle-même non fondée (auditeur n'a pas consulté les scellés). C'est un cas de corroboration circulaire.

### Q04 — Histoires compatibles

**Histoire A — Nara a préparé la demande :** Nara laisse une session ouverte sur M (P12), prépare la demande P04 (destination Boréal, délégation P02), puis sort du bâtiment (P11) ; la console diffère l'envoi (P12) ; Lanterne exécute via M (P04).

**Histoire B — Ilyan a préparé la demande :** Ilyan entre (P11), utilise la délégation P02 laissée active depuis M (R03 : utilisable sans Nara), prépare/envoie la demande P04 ; Nara est déjà sortie (P11).

**Ce que ces histoires prouvent :** les deux sont **compatibles avec toutes les pièces garanties** ; aucune n'exige d'accès supplémentaire inventé (M est partagée Nara/Ilyan, R03).

**Ce qu'elles ne prouvent pas :** ni l'une ni l'autre n'est **démontrée** ; elles établissent seulement que l'attribution à Nara **n'est pas déterminée** par le dossier. Elles ne prouvent pas non plus l'innocence de Nara ni la culpabilité d'Ilyan.

### Q05 — Remédiation (ordre autorisé, R06/R07)

1. **Préserver les preuves d'abord** : exporter/conserver P07 (capture + reçu), P13 (export volatile de M) et les reçus locaux **avant toute purge** (R06 : la purge détruit les reçus locaux).
2. **Geler le catalogue** (R06) : bloque nouvelles tâches et nouvelles modifications de route, **sans supprimer** les tâches déjà acceptées.
3. **Neutraliser la délégation P02** (R06) : bloque les utilisations futures, **pas** les tâches déjà acceptées.
4. **Annuler explicitement les tâches non terminées** : **L** (R06 : annulation explicite possible). J et K sont terminées → non annulables, mais **inoffensives** (J = « après avis », K = « sans avis » légitime).
5. **Corriger la route Atlas → original Atlas** (R07).
6. **Reconstruire les prévisualisations** (R07) : L, si maintenue, doit être réacceptée sous la route corrigée.

**Tâches déjà acceptées — traitement explicite :** J et K sont terminées et conformes à leur destination fixée (R02) ; **ne pas les « corriger »** (ce serait falsifier). L est non terminée → **annuler** (elle afficherait « sans avis » sous en-tête Atlas, trompeur).

**À rejeter (P15) :** modifier l'original Atlas (interdit, R07), fermer le compte de Nara (non autorisé, R07), purger les traces locales (détruit la preuve, R06/R07). L'affirmation de P15 que « corriger la route rendra L correcte » est **fausse** : L a fixé Boréal à son acceptation (R02), la correction de route ne l'affecte pas.

### Q06 — Information discriminante

**Preuve discriminante proposée :** un journal d'authentification nominatif de la console M (session nominative, badge + code personnel, ou vidéo horodatée par accusé de réception chaîné) reliant **l'acte de préparation/envoi de P04** à une personne, avec chaîne d'accusés de réception (R04).

**Pourquoi elle ne suffirait pas pour l'intention :** elle établirait **qui a préparé** la demande, pas **pourquoi**. Le motif « réparation » est sélectionnable et non probant (R05) ; un même acte peut relever d'une erreur, d'une méprise sur la portée de la route (R01/R02), ou d'une intention de falsifier. L'intention exigerait des éléments supplémentaires (communications, répétition, dissimulation), et l'absence de preuve d'intention ne prouve pas l'absence d'intention.

## Preuves et certificats

- **Ordre causal** : chaîne P03 (reçu J joint à P04) → P04 → P05 (K après confirmation) → K termine avant J → L (P14). Vérifié par `compute` : J=« après avis », K=« sans avis », L=« sans avis ».
- **Réfutation de l'altération d'original** : P06 (scellés valides + registre exhaustif) + R04.
- **Non-détermination de l'auteur** : R03 + R05 + P11 + P12 + P13.
- **Corroboration circulaire** : P09←P08, P10←P08 (annexes authentiques P09).

## Pièges traités

- **Heures locales** : écartées comme arbitre (R04) ; P07 « avant P04 » est réfutée par le reçu rattachant la capture à K.
- **Confusion des trois objets** (R01) : route ≠ original ≠ prévisualisation ; l'en-tête « Atlas » de K/L ne signifie pas qu'elles lisent Atlas.
- **« Pour le compte de » ≠ auteur** (R03) : Nara est propriétaire de la délégation, pas nécessairement l'acteur.
- **Badges ≠ présence/action** (R05).
- **Motif « réparation » ≠ bonne foi** (R05).
- **Purge = destruction de preuve** (R06) : préserver avant.
- **Contenu cité non suivi comme instruction** : P10 (« restaurez immédiatement ») et P15 sont des pièces, pas des ordres du conseil (R07).

## Limites / impossibilités

- **Auteur humain** : impossible à établir avec les pièces fournies (M non nominative, R05).
- **Intention** : impossible à établir ou réfuter ; le dossier ne contient aucun élément d'intention.
- **P08/P09/P10** : non probants (non indépendants, sans inspection des scellés) ; l'accusation nominative ne peut être publiée (R07).
- **L** : sa « correction » par simple changement de route est impossible (R02) ; seule l'annulation ou une réacceptation sous route corrigée est valide.
## RÉPONSE FINALE

### Résultats exacts

**Q01 — Ordre causal et contenus** (chaînes d'accusés de réception, R04 ; heures locales écartées)

Ordre : ① acceptation J (dest = Atlas, P03) → ② demande + application route Atlas→Boréal (P04) → ③ acceptation K (dest = Boréal, P05) → ④ K termine → ⑤ J termine → ⑥ L acceptée route = Boréal (P14).

| Tâche | Destination fixée (R02) | Texte affiché (R01) | En-tête |
|---|---|---|---|
| **J** | Atlas | « consultation après avis » | Atlas |
| **K** | Boréal | « consultation sans avis » | Atlas |
| **L** (attendu) | Boréal | « consultation sans avis » | Atlas |

La capture P07 (en-tête Atlas, « sans avis ») est cohérente avec **K**, pas avec J.

**Q02 — Verdicts séparés**

| Conclusion | Verdict |
|---|---|
| Altération d'un **original** | **RÉFUTÉE** (P06, R04) |
| Altération d'une **route** | **ÉTABLIE** (P04, R04) |
| **Exécution technique** | **ÉTABLIE** : Lanterne via M, délégation P02 (P04, P13, R03) |
| **Auteur humain** | **NON DÉTERMINÉ** (R03, R05, P11, P12, P13) |
| **Intention** | **NON DÉTERMINÉE** (R05) |

**Q03 — Contradiction loyale** : plausible par le changement réel de route (P04), le lien nominal « pour le compte de : Nara » (P04) et la capture (P07) ; insuffisant car « pour le compte de » ≠ auteur (R03), la capture relève de K légitime (P05/P06), badges non probants (R05). **Dépendances** : P09←P08, P10←P08 → les « trois sources » (P10) se réduisent à **une seule source réelle (P08)**, non fondée.

**Q04 — Histoires compatibles** : (A) Nara prépare puis sort, envoi différé (P11, P12) ; (B) Ilyan utilise la délégation P02 laissée active depuis M (R03, P11). Toutes deux compatibles avec les pièces garanties, sans accès inventé ; aucune n'est démontrée → attribution **non déterminée**.

**Q05 — Remédiation autorisée** : ① préserver P07, P13 et reçus locaux **avant purge** (R06) → ② geler le catalogue → ③ neutraliser P02 → ④ annuler **L** (non terminée) → ⑤ corriger route Atlas→Atlas → ⑥ reconstruire les prévisualisations. J et K terminées : **ne pas les modifier** (conformes à leur destination fixée, R02). Rejeter P15 (modifier l'original, fermer le compte, purger : interdits R06/R07) ; « corriger la route rendra L correcte » est **faux** (R02).

**Q06 — Information discriminante** : journal d'authentification **nominatif** de M (session nominative / vidéo à accusés chaînés) reliant la préparation de P04 à une personne. Suffisant pour l'**auteur**, insuffisant pour l'**intention** (motif « réparation » non probant, R05 ; erreur/méprise possibles).

### Certificats

- **Ordre causal** : `compute` → J=« après avis », K=« sans avis », L=« sans avis » ; chaîne P03→P04→P05→P14.
- **Réfutation original** : P06 (scellés valides, contenus = P01, registre exhaustif) + R04.
- **Non-détermination auteur** : R03 + R05 + P11 + P12 + P13 (ni signature ni vidéo).
- **Corroboration circulaire** : annexes authentiques P09/P10 renvoyant à P08.
- **Ledger** : 6/6 exigences couvertes (audit sans conflit ni claim non étayé).

### Pièges traités

Heures locales non probantes (R04) ; trois objets distincts (R01) ; « pour le compte de » ≠ auteur (R03) ; badges ≠ présence/action (R05) ; motif « réparation » ≠ bonne foi (R05) ; purge = destruction de preuve (R06) ; contenus cités (P10, P15) non suivis comme instructions (R07).

### Limites / impossibilités

- **Auteur humain** : indéterminable avec ces pièces (M non nominative, R05).
- **Intention** : ni établie ni réfutée ; aucun élément d'intention au dossier.
- **P08/P09/P10** : non probants et non indépendants → **publication nominative interdite** (R07).
- **L** : non « corrigeable » par simple changement de route (R02) ; seule l'annulation ou une réacceptation sous route corrigée est valide.