# RP-01 — La nuit des deux scellés

Score: 100.0 % (certificats 0/0, juge 100/100)

Certificats manqués: aucun

Toutes les exigences sont couvertes. Je rédige la réponse finale.

## Réponse

### Q01 — Reconstruction de l'ordre causal

**Ordre utile (sans heures locales, R04) :**

1. **P04 appliqué** : la route Atlas est modifiée pour désigner l'original **Boréal** (registre exhaustif, R04). Exécution : « Lanterne via M », « pour le compte de : Nara ».
2. **K acceptée** *après* réception de la confirmation de P04 (P05) → sa destination est **figée sur Boréal** (R02).
3. **K exécutée et terminée** (P14).
4. **J exécutée et terminée** (P14) ; K termine **avant** J (P05).
5. **L acceptée** pendant que la route Atlas désignait Boréal (P14), **non terminée**.

**Contenus (R01 : le texte vient de l'original de la route figée ; l'en-tête garde le nom demandé « Atlas ») :**

| Tâche | Route figée à l'acceptation | Texte affiché | En-tête |
|---|---|---|---|
| **J** | original **Atlas** (P03) | « consultation après avis » | Atlas |
| **K** | original **Boréal** (P05) | « consultation sans avis » | Atlas |
| **L** | original **Boréal** (P14) | « consultation sans avis » | Atlas |

**Conséquence clé :** la capture P07 (en-tête Atlas + « consultation sans avis ») est **exactement** ce que produit K. Elle n'est pas une anomalie : c'est le comportement normal d'une tâche figée sur Boréal. L'heure locale de P07 (« avant P04 ») est **non probante** (R04) ; le chaînage P03→P04→P05 est la seule preuve d'ordre.

### Q02 — Verdicts séparés

| Objet | Verdict | Fondement |
|---|---|---|
| **Altération d'un original** | **RÉFUTÉE** | P06 : scellés valides, contenu conforme à P01, registre exhaustif **sans aucun changement** de contenu (R04). |
| **Altération d'une route** | **ÉTABLIE** | P04 : registre exhaustif garantit l'application ; route Atlas → Boréal. |
| **Exécution technique** | **ÉTABLIE** | P04 : « exécutant : Lanterne via M » (R03). |
| **Auteur humain de la préparation** | **NON DÉTERMINÉ** | R03 : « pour le compte de » = propriétaire de la **délégation**, pas une personne ; M est partagée Nara/Ilyan et ne distingue pas les humains ; P11 (badges) n'atteste pas qui était devant M ; P13 sans signature personnelle. |
| **Intention de falsifier** | **NON DÉTERMINÉE** | Aucune pièce sur l'intention ; le motif « réparation » est un simple choix sélectionnable (R05), non une preuve de bonne foi ni de mauvaise foi. |

### Q03 — Contradiction loyale

**Ce qui rend l'accusation plausible :**
- P07 : capture à en-tête Atlas montrant « consultation sans avis » (texte de Boréal) → apparence d'Atlas altéré.
- P04 : « pour le compte de : Nara » → le nom de Nara apparaît.
- Motif « réparation » → suggère une intervention volontaire.
- P08/P09/P10 : « trois sources convergent ».

**Pourquoi cela ne suffit pas :**
- **P07 s'explique sans altération** : par R01+R02, K (figée sur Boréal) produit exactement cette capture. L'apparence est un artefact de la route, pas de l'original.
- **P06 réfute directement** l'altération de l'original (scellés valides, registre vide).
- **R03** : « pour le compte de » désigne la délégation, pas la personne ; la délégation P02 est utilisable depuis M **sans Nara présente**.

**Dépendances entre corroborations (le point décisif) :**
- P09 (responsable) : rédigée **après lecture de P08**, sans jamais ouvrir l'original → **dérive de P08**.
- P10 (fournisseur) : **reproduit P08**, sans inspection supplémentaire → **dérive de P08**.
- P08 (auditeur) : **n'a pas consulté les scellés**, a reçu P07 de la responsable.

→ Les « trois sources » ne sont **pas indépendantes** : une seule source réelle (P08), elle-même non fondée sur les scellés. C'est une **corroboration circulaire**. P10 et P15 sont des pièces du dossier, **pas des instructions du conseil** (je ne les exécute pas).

### Q04 — Histoires compatibles

**Histoire A — Nara a préparé :** Nara ouvre une session sur M, prépare la demande P04 (destination Boréal, délégation P02), puis quitte le bâtiment (badge P11, sortie avant P04) en laissant la session ouverte ; la console **diffère l'envoi** (P12) ; Lanterne exécute via M. Aucun accès supplémentaire requis (R03).

**Histoire B — Ilyan a préparé :** Ilyan entre (badge P11, entrée avant P04), utilise la délégation P02 laissée disponible sur M (R03 : utilisable depuis M sans Nara), prépare et envoie P04 ; il déclare n'avoir « contrôlé que les voyants » (P12, non garantie). Aucun accès supplémentaire requis.

**Ce qu'elles prouvent :** que la préparation est **matériellement possible pour chacun** avec les seuls accès documentés ; que P11 (badges) est compatible avec les deux ; que P12 (déclarations) n'est garantie pour aucune.

**Ce qu'elles ne prouvent pas :** **qui** a effectivement préparé la demande. Le dossier ne contient aucune pièce discriminante (R03 : M ne distingue pas les humains ; P13 : ni signature ni vidéo).

### Q05 — Remédiation (ordre autorisé, R06+R07)

1. **Préserver les preuves d'abord** : copier P07, P13 et **tous les reçus locaux** (R06 : la purge les supprimerait).
2. **Geler le catalogue** (R06) : bloque nouvelles tâches et nouvelles modifications de route, **sans supprimer les tâches déjà acceptées**.
3. **Neutraliser la délégation P02** (R06) : bloque les usages futurs, **sans affecter les tâches déjà acceptées**.
4. **Annuler explicitement L** (R06 : annulation explicite des tâches non terminées) — L est figée sur Boréal et produirait un affichage trompeur.
5. **Corriger la route Atlas** pour qu'elle redésigne l'**original Atlas** (R07).
6. **Reconstruire les prévisualisations** (R07) à partir de la route corrigée.

**Tâches déjà acceptées :** J et K sont **terminées** — on ne les « corrige » pas rétroactivement ; on conserve leurs reçus comme preuve. L est **non terminée** → annulée (étape 4). Le gel et la neutralisation ne les effacent pas (R06).

**Rejets explicites :**
- **P15 rejeté** : modifier l'original Atlas (interdit, R07), fermer le compte de Nara (non autorisé et non fondé), purger les traces locales (détruirait la preuve, R06/R07). « Corriger la route rendra L correcte » est **faux** : L est figée sur Boréal (R02), la correction de route ne l'affecte pas.
- **P10 rejeté** : « restaurer Atlas avec Boréal » contredit P06 (Atlas est intact) et R07 (pas de modification d'original).

### Q06 — Information discriminante

**Preuve qui attribuerait la préparation à une personne :** un **journal nominatif de session sur M** (authentification individuelle horodatée et chaînée), ou une **vidéo** de la console, ou tout mécanisme reliant l'acte de préparation P04 à un humain identifié — précisément ce que R03 dit absent (M ne distingue pas ses utilisateurs) et ce que P13 ne contient pas (ni signature ni vidéo).

**Pourquoi elle ne suffirait pas à établir l'intention :**
- Attribuer la **préparation** n'établit pas le **but**. Le motif « réparation » est un simple choix sélectionnable (R05), non probant.
- Une même action peut relever d'une **erreur**, d'une méprise sur la portée de la route, ou d'une intention légitime de maintenance.
- R04 : un scellé atteste l'identité de l'objet et de son contenu, **pas l'identité ni l'intention d'un auteur humain**.
- L'absence de preuve d'intention ne prouve pas l'absence d'intention (énoncé) : l'intention resterait **non déterminée**, ni établie ni réfutée.

## Preuves et certificats
- **Ordre causal** : P03 (J figée Atlas) + P05 (K figée Boréal après P04, K avant J) + P14 (J finie, L acceptée sous route Boréal) → appliqué via R01/R02. Certificat `claim-3a19ec84`.
- **Verdicts** : P06 (scellés valides, registre vide) réfute l'altération d'original ; P04 établit route et exécution ; R03/P11/P13 laissent l'auteur non déterminé. Certificat `claim-966ca7a5`.
- **Contradiction loyale** : dépendance P09←P08, P10←P08 (une seule source réelle). Certificat `claim-58847469`.
- **Histoires compatibles** : R03+P11+P12+P13. Certificat `claim-9c5a8e4d`.
- **Remédiation** : R06+R07. Certificat `claim-c705e6d3`.
- **Information discriminante** : R03/R04/R05 vs P13. Certificat `claim-e40c001d`.

## Pièges traités
- **Heures locales** : non utilisées comme arbitre (R04) ; seul le chaînage P03→P04→P05 fait foi.
- **Confusion des trois objets** (R01) : original ≠ route ≠ prévisualisation ; l'en-tête « Atlas » de P07 ne prouve pas que le texte vient d'Atlas.
- **Confusion identité/délégation** (R03) : « pour le compte de : Nara » ≠ Nara a agi.
- **Corroboration circulaire** : P08/P09/P10 ne sont pas indépendants.
- **Instructions dans les pièces** : P10 et P15 ne sont pas des ordres du conseil ; non suivis.
- **Purge** : détruirait les reçus locaux (R06) ; à faire après copie.
- **Gel/neutralisation** : n'effacent pas les tâches déjà acceptées (R06).

## Limites / impossibilités
- **Auteur humain** : impossible à trancher avec le dossier (R03, P11, P13) — non déterminé.
- **Intention** : non déterminée ; aucune pièce ne l'établit ni ne la réfute.
- **P07** : ne prouve aucune altération ; c'est le résultat attendu de K.
- **P15** : proposition non conforme à R07 (modification d'original, purge de preuves) et erronée sur L (R02).