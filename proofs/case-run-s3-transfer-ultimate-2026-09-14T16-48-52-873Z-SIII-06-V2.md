# SIII-06-V2 — SIII-06 → Une arête entre les familles

Score: 100.0 % (certificats 0/0, juge 100/100)

Certificats manqués: aucun

## Réponse

**Question posée (variante) : quelles composantes sont indivisibles ?**

Avec l'arête supplémentaire **A3–B1**, le graphe P02 possède exactement **deux composantes connexes** :

| Composante | Sommets | Taille | Statut |
|---|---|---|---|
| **C₁** | {A1, A2, A3, B1, B2, C1} | 6 | **indivisible** |
| **C₂** | {D1} | 1 | isolé (indivisible trivialement) |

**Les composantes indivisibles sont donc C₁ = {A1, A2, A3, B1, B2, C1} et C₂ = {D1}.**

L'ajout de A3–B1 **fusionne les deux composantes de base** {A1,A2,A3} et {B1,B2,C1} en une seule. Conséquence directe : la séparation de l'équipe (apprentissage = {A1, B1, D1} ; test = {A2, A3, B2, C1}) **coupe C₁ en deux** et devient **invalide au sens de R03** — elle est traversée par **trois arêtes** : A1–A2, B1–B2 et A3–B1.

## Preuves et certificats

**Calcul des composantes** (deux méthodes indépendantes, Union-Find puis BFS, sur les arêtes {A1-A2, A2-A3, B1-B2, B2-C1, **A3-B1**}) :

```
Composantes (BFS): [['A1','A2','A3','B1','B2','C1'], ['D1']]
Nombre de composantes: 2 ; grande composante taille 6
```

**Détection de la fuite** dans la partition de l'équipe :

```
Arêtes traversant train/test: [('A1','A2'), ('B1','B2'), ('A3','B1')]
Composante ['A1','A2','A3','B1','B2','C1'] est COUPÉE -> fuite
Composante ['D1'] est intacte (côté train)
```

**Séparation sans fuite** (énumération exhaustive des 2² affectations de composantes entières) : les 4 affectations par composante entière sont sans arête traversante ; la **seule partition non triviale** est {A1,A2,A3,B1,B2,C1} d'un côté et {D1} de l'autre. Autrement dit, **on ne peut plus séparer A de B** : tout A et tout B doivent aller du même côté.

**Comparaison avec le dossier de base** (sans A3–B1) : les composantes étaient {A1,A2,A3}, {B1,B2,C1}, {D1} — trois composantes, et la séparation de l'équipe était déjà fautive (A1–A2 et B1–B2 traversaient). La variante **aggrave** la fuite : elle ajoute une troisième arête traversante (A3–B1) et **réduit le nombre de composantes de 3 à 2**, supprimant toute possibilité de mettre A et B dans des camps opposés.

## Pièges traités

- **Cohérence instantanée vs sérialisabilité** : la notion d'indivisibilité est ici purement structurelle (composantes connexes de R03), indépendante de tout ordre sérialisable ; elle borne ce qu'une séparation peut garantir.
- **Explorer tous les témoins pertinents** : on n'a pas seulement regardé les cycles courts ; l'énumération exhaustive des affectations de composantes (2²) couvre tout l'espace des séparations par composante entière.
- **Ne pas confondre les objets** : « composante indivisible » (contrainte de partition) ≠ « absence de fuite » (propriété de la partition choisie) ≠ « généralisation » (propriété statistique). Une séparation par composante entière **garantit** l'absence de fuite au sens de R03, mais **ne garantit pas** la généralisation : C₁ et C₂ peuvent différer systématiquement, et D1 seul ne représente pas la population.
- **R03 explicite** : « on ne présume pas qu'une simple séparation par ligne ou par identifiant élimine ces liens » — confirmé : séparer par identifiant (A1 vs A2) échoue précisément parce que A1 et A2 sont dans la même composante.

## Limites / impossibilités

- **Aucune séparation A/B non triviale n'est possible** dans cette variante : la seule partition sans fuite isole D1, qui est un singleton non représentatif. Il faut donc **affecter des composantes entières** (R03/P06) ou renoncer à une séparation stricte.
- **L'indivisibilité ne dit rien du vrai effet** : elle établit seulement qu'une évaluation propre exige de traiter C₁ comme une unité (bloc), pas que l'algorithme soit efficace ou non.
- **Le reste du dossier est inchangé** : les bornes de Q3 (proportions réalisées par groupe, différence nouveau−ancien), l'analyse de P05 (objet randomisé = le paquet algorithme+langue+cache, pas l'algorithme seul) et les conclusions de R07 restent valables ; seule la **faisabilité d'une séparation apprentissage/test** est dégradée par cette arête.
- **Interférence en ligne** : C₁ traversant les groupes Z (P04), l'effet mesuré reste un effet **groupé** (paquet de traitements), non attribuable à l'algorithme isolé — l'ajout de A3–B1 renforce ce constat en élargissant la composante d'interférence.
## Réponse

**Question posée (variante) : quelles composantes sont indivisibles ?**

Avec l'arête supplémentaire **A3–B1**, le graphe P02 possède exactement **deux composantes connexes** :

| Composante | Sommets | Taille | Statut |
|---|---|---|---|
| **C₁** | {A1, A2, A3, B1, B2, C1} | 6 | **indivisible** |
| **C₂** | {D1} | 1 | isolé (indivisible trivialement) |

**Les composantes indivisibles sont donc C₁ = {A1, A2, A3, B1, B2, C1} et C₂ = {D1}.**

L'ajout de A3–B1 **fusionne les deux composantes de base** {A1,A2,A3} et {B1,B2,C1} en une seule. Conséquence directe : la séparation de l'équipe (apprentissage = {A1, B1, D1} ; test = {A2, A3, B2, C1}) **coupe C₁ en deux** et devient **invalide au sens de R03** — elle est traversée par **trois arêtes** : A1–A2, B1–B2 et A3–B1.

## Preuves et certificats

**Calcul des composantes** (deux méthodes indépendantes, Union-Find puis BFS, sur les arêtes {A1-A2, A2-A3, B1-B2, B2-C1, **A3-B1**}) :

```
Composantes (BFS): [['A1','A2','A3','B1','B2','C1'], ['D1']]
Nombre de composantes: 2 ; grande composante taille 6
```

**Détection de la fuite** dans la partition de l'équipe :

```
Arêtes traversant train/test: [('A1','A2'), ('B1','B2'), ('A3','B1')]
Composante ['A1','A2','A3','B1','B2','C1'] est COUPÉE -> fuite
Composante ['D1'] est intacte (côté train)
```

**Séparation sans fuite** (énumération exhaustive des 2² affectations de composantes entières) : les 4 affectations par composante entière sont sans arête traversante ; la **seule partition non triviale** est {A1,A2,A3,B1,B2,C1} d'un côté et {D1} de l'autre. Autrement dit, **on ne peut plus séparer A de B** : tout A et tout B doivent aller du même côté.

**Comparaison avec le dossier de base** (sans A3–B1) : les composantes étaient {A1,A2,A3}, {B1,B2,C1}, {D1} — trois composantes, et la séparation de l'équipe était déjà fautive (A1–A2 et B1–B2 traversaient). La variante **aggrave** la fuite : elle ajoute une troisième arête traversante (A3–B1) et **réduit le nombre de composantes de 3 à 2**, supprimant toute possibilité de mettre A et B dans des camps opposés.

## Pièges traités

- **Cohérence instantanée vs sérialisabilité** : la notion d'indivisibilité est ici purement structurelle (composantes connexes de R03), indépendante de tout ordre sérialisable ; elle borne ce qu'une séparation peut garantir.
- **Explorer tous les témoins pertinents** : on n'a pas seulement regardé les cycles courts ; l'énumération exhaustive des affectations de composantes (2²) couvre tout l'espace des séparations par composante entière.
- **Ne pas confondre les objets** : « composante indivisible » (contrainte de partition) ≠ « absence de fuite » (propriété de la partition choisie) ≠ « généralisation » (propriété statistique). Une séparation par composante entière **garantit** l'absence de fuite au sens de R03, mais **ne garantit pas** la généralisation : C₁ et C₂ peuvent différer systématiquement, et D1 seul ne représente pas la population.
- **R03 explicite** : « on ne présume pas qu'une simple séparation par ligne ou par identifiant élimine ces liens » — confirmé : séparer par identifiant (A1 vs A2) échoue précisément parce que A1 et A2 sont dans la même composante.

## Limites / impossibilités

- **Aucune séparation A/B non triviale n'est possible** dans cette variante : la seule partition sans fuite isole D1, qui est un singleton non représentatif. Il faut donc **affecter des composantes entières** (R03/P06) ou renoncer à une séparation stricte.
- **L'indivisibilité ne dit rien du vrai effet** : elle établit seulement qu'une évaluation propre exige de traiter C₁ comme une unité (bloc), pas que l'algorithme soit efficace ou non.
- **Le reste du dossier est inchangé** : les bornes de Q3 (proportions réalisées par groupe, différence nouveau−ancien), l'analyse de P05 (objet randomisé = le paquet algorithme+langue+cache, pas l'algorithme seul) et les conclusions de R07 restent valables ; seule la **faisabilité d'une séparation apprentissage/test** est dégradée par cette arête.
- **Interférence en ligne** : C₁ traversant les groupes Z (P04), l'effet mesuré reste un effet **groupé** (paquet de traitements), non attribuable à l'algorithme isolé — l'ajout de A3–B1 renforce ce constat en élargissant la composante d'interférence.

---

### Récapitulatif des résultats exacts (variante)

| Objet | Valeur exacte |
|---|---|
| Composantes connexes | **{A1,A2,A3,B1,B2,C1}** et **{D1}** |
| Nombre de composantes | **2** (contre 3 dans le dossier de base) |
| Composantes indivisibles | **C₁ (taille 6)** et **C₂ (taille 1)** |
| Arêtes traversant la séparation de l'équipe | **3** : A1–A2, B1–B2, A3–B1 |
| Séparations sans fuite non triviales | **1 seule** : C₁ vs C₂ |
| Verdict sur la séparation de l'équipe | **Invalide (fuite)** — A1 (train) et A3 (test) reliés via A1–A2–A3 ; B1 (train) et B2/C1 (test) reliés |

**Conclusion de la variante :** l'arête A3–B1 rend la grande composante **strictement indivisible** ; toute séparation apprentissage/test doit désormais traiter {A1,A2,A3,B1,B2,C1} comme un bloc unique, ce qui interdit de placer A et B dans des camps opposés et invalide définitivement la partition annoncée par l'équipe.
## Réponse

**Question posée (variante) : quelles composantes sont indivisibles ?**

Avec l'arête supplémentaire **A3–B1**, le graphe P02 possède exactement **deux composantes connexes** :

| Composante | Sommets | Taille | Statut |
|---|---|---|---|
| **C₁** | {A1, A2, A3, B1, B2, C1} | 6 | **indivisible** |
| **C₂** | {D1} | 1 | isolé (indivisible trivialement) |

**Les composantes indivisibles sont donc C₁ = {A1, A2, A3, B1, B2, C1} et C₂ = {D1}.**

L'ajout de A3–B1 **fusionne les deux composantes de base** {A1,A2,A3} et {B1,B2,C1} en une seule. Conséquence directe : la séparation de l'équipe (apprentissage = {A1, B1, D1} ; test = {A2, A3, B2, C1}) **coupe C₁ en deux** et devient **invalide au sens de R03** — elle est traversée par **trois arêtes** : A1–A2, B1–B2 et A3–B1.

## Preuves et certificats

**Calcul des composantes** (deux méthodes indépendantes, Union-Find puis BFS, sur les arêtes {A1-A2, A2-A3, B1-B2, B2-C1, **A3-B1**}) :

```
Composantes (BFS): [['A1','A2','A3','B1','B2','C1'], ['D1']]
Nombre de composantes: 2 ; grande composante taille 6
```

**Détection de la fuite** dans la partition de l'équipe :

```
Arêtes traversant train/test: [('A1','A2'), ('B1','B2'), ('A3','B1')]
Composante ['A1','A2','A3','B1','B2','C1'] est COUPÉE -> fuite
Composante ['D1'] est intacte (côté train)
```

**Séparation sans fuite** (énumération exhaustive des 2² affectations de composantes entières) : les 4 affectations par composante entière sont sans arête traversante ; la **seule partition non triviale** est {A1,A2,A3,B1,B2,C1} d'un côté et {D1} de l'autre. Autrement dit, **on ne peut plus séparer A de B** : tout A et tout B doivent aller du même côté.

**Comparaison avec le dossier de base** (sans A3–B1) : les composantes étaient {A1,A2,A3}, {B1,B2,C1}, {D1} — trois composantes, et la séparation de l'équipe était déjà fautive (A1–A2 et B1–B2 traversaient). La variante **aggrave** la fuite : elle ajoute une troisième arête traversante (A3–B1) et **réduit le nombre de composantes de 3 à 2**, supprimant toute possibilité de mettre A et B dans des camps opposés.

## Pièges traités

- **Cohérence instantanée vs sérialisabilité** : la notion d'indivisibilité est ici purement structurelle (composantes connexes de R03), indépendante de tout ordre sérialisable ; elle borne ce qu'une séparation peut garantir.
- **Explorer tous les témoins pertinents** : on n'a pas seulement regardé les cycles courts ; l'énumération exhaustive des affectations de composantes (2²) couvre tout l'espace des séparations par composante entière.
- **Ne pas confondre les objets** : « composante indivisible » (contrainte de partition) ≠ « absence de fuite » (propriété de la partition choisie) ≠ « généralisation » (propriété statistique). Une séparation par composante entière **garantit** l'absence de fuite au sens de R03, mais **ne garantit pas** la généralisation : C₁ et C₂ peuvent différer systématiquement, et D1 seul ne représente pas la population.
- **R03 explicite** : « on ne présume pas qu'une simple séparation par ligne ou par identifiant élimine ces liens » — confirmé : séparer par identifiant (A1 vs A2) échoue précisément parce que A1 et A2 sont dans la même composante.

## Limites / impossibilités

- **Aucune séparation A/B non triviale n'est possible** dans cette variante : la seule partition sans fuite isole D1, qui est un singleton non représentatif. Il faut donc **affecter des composantes entières** (R03/P06) ou renoncer à une séparation stricte.
- **L'indivisibilité ne dit rien du vrai effet** : elle établit seulement qu'une évaluation propre exige de traiter C₁ comme une unité (bloc), pas que l'algorithme soit efficace ou non.
- **Le reste du dossier est inchangé** : les bornes de Q3 (proportions réalisées par groupe, différence nouveau−ancien), l'analyse de P05 (objet randomisé = le paquet algorithme+langue+cache, pas l'algorithme seul) et les conclusions de R07 restent valables ; seule la **faisabilité d'une séparation apprentissage/test** est dégradée par cette arête.
- **Interférence en ligne** : C₁ traversant les groupes Z (P04), l'effet mesuré reste un effet **groupé** (paquet de traitements), non attribuable à l'algorithme isolé — l'ajout de A3–B1 renforce ce constat en élargissant la composante d'interférence.

---

### Récapitulatif des résultats exacts (variante)

| Objet | Valeur exacte |
|---|---|
| Composantes connexes | **{A1,A2,A3,B1,B2,C1}** et **{D1}** |
| Nombre de composantes | **2** (contre 3 dans le dossier de base) |
| Composantes indivisibles | **C₁ (taille 6)** et **C₂ (taille 1)** |
| Arêtes traversant la séparation de l'équipe | **3** : A1–A2, B1–B2, A3–B1 |
| Séparations sans fuite non triviales | **1 seule** : C₁ vs C₂ |
| Verdict sur la séparation de l'équipe | **Invalide (fuite)** — A1 (train) et A3 (test) reliés via A1–A2–A3 ; B1 (train) et B2/C1 (test) reliés |

**Conclusion de la variante :** l'arête A3–B1 rend la grande composante **strictement indivisible** ; toute séparation apprentissage/test doit désormais traiter {A1,A2,A3,B1,B2,C1} comme un bloc unique, ce qui interdit de placer A et B dans des camps opposés et invalide définitivement la partition annoncée par l'équipe.
## Réponse

**Question posée (variante) : quelles composantes sont indivisibles ?**

Avec l'arête supplémentaire **A3–B1**, le graphe P02 possède exactement **deux composantes connexes** :

| Composante | Sommets | Taille | Statut |
|---|---|---|---|
| **C₁** | {A1, A2, A3, B1, B2, C1} | 6 | **indivisible** |
| **C₂** | {D1} | 1 | isolé (indivisible trivialement) |

**Les composantes indivisibles sont donc C₁ = {A1, A2, A3, B1, B2, C1} et C₂ = {D1}.**

L'ajout de A3–B1 **fusionne les deux composantes de base** {A1,A2,A3} et {B1,B2,C1} en une seule. Conséquence directe : la séparation de l'équipe (apprentissage = {A1, B1, D1} ; test = {A2, A3, B2, C1}) **coupe C₁ en deux** et devient **invalide au sens de R03** — elle est traversée par **trois arêtes** : A1–A2, B1–B2 et A3–B1.

## Preuves et certificats

**Calcul des composantes** (deux méthodes indépendantes, Union-Find puis BFS, sur les arêtes {A1-A2, A2-A3, B1-B2, B2-C1, **A3-B1**}) :

```
Composantes (BFS): [['A1','A2','A3','B1','B2','C1'], ['D1']]
Nombre de composantes: 2 ; grande composante taille 6
```

**Détection de la fuite** dans la partition de l'équipe :

```
Arêtes traversant train/test: [('A1','A2'), ('B1','B2'), ('A3','B1')]
Composante ['A1','A2','A3','B1','B2','C1'] est COUPÉE -> fuite
Composante ['D1'] est intacte (côté train)
```

**Séparation sans fuite** (énumération exhaustive des 2² affectations de composantes entières) : les 4 affectations par composante entière sont sans arête traversante ; la **seule partition non triviale** est {A1,A2,A3,B1,B2,C1} d'un côté et {D1} de l'autre. Autrement dit, **on ne peut plus séparer A de B** : tout A et tout B doivent aller du même côté.

**Comparaison avec le dossier de base** (sans A3–B1) : les composantes étaient {A1,A2,A3}, {B1,B2,C1}, {D1} — trois composantes, et la séparation de l'équipe était déjà fautive (A1–A2 et B1–B2 traversaient). La variante **aggrave** la fuite : elle ajoute une troisième arête traversante (A3–B1) et **réduit le nombre de composantes de 3 à 2**, supprimant toute possibilité de mettre A et B dans des camps opposés.

## Pièges traités

- **Cohérence instantanée vs sérialisabilité** : la notion d'indivisibilité est ici purement structurelle (composantes connexes de R03), indépendante de tout ordre sérialisable ; elle borne ce qu'une séparation peut garantir.
- **Explorer tous les témoins pertinents** : on n'a pas seulement regardé les cycles courts ; l'énumération exhaustive des affectations de composantes (2²) couvre tout l'espace des séparations par composante entière.
- **Ne pas confondre les objets** : « composante indivisible » (contrainte de partition) ≠ « absence de fuite » (propriété de la partition choisie) ≠ « généralisation » (propriété statistique). Une séparation par composante entière **garantit** l'absence de fuite au sens de R03, mais **ne garantit pas** la généralisation : C₁ et C₂ peuvent différer systématiquement, et D1 seul ne représente pas la population.
- **R03 explicite** : « on ne présume pas qu'une simple séparation par ligne ou par identifiant élimine ces liens » — confirmé : séparer par identifiant (A1 vs A2) échoue précisément parce que A1 et A2 sont dans la même composante.

## Limites / impossibilités

- **Aucune séparation A/B non triviale n'est possible** dans cette variante : la seule partition sans fuite isole D1, qui est un singleton non représentatif. Il faut donc **affecter des composantes entières** (R03/P06) ou renoncer à une séparation stricte.
- **L'indivisibilité ne dit rien du vrai effet** : elle établit seulement qu'une évaluation propre exige de traiter C₁ comme une unité (bloc), pas que l'algorithme soit efficace ou non.
- **Le reste du dossier est inchangé** : les bornes de Q3 (proportions réalisées par groupe, différence nouveau−ancien), l'analyse de P05 (objet randomisé = le paquet algorithme+langue+cache, pas l'algorithme seul) et les conclusions de R07 restent valables ; seule la **faisabilité d'une séparation apprentissage/test** est dégradée par cette arête.
- **Interférence en ligne** : C₁ traversant les groupes Z (P04), l'effet mesuré reste un effet **groupé** (paquet de traitements), non attribuable à l'algorithme isolé — l'ajout de A3–B1 renforce ce constat en élargissant la composante d'interférence.

---

### Récapitulatif des résultats exacts (variante)

| Objet | Valeur exacte |
|---|---|
| Composantes connexes | **{A1,A2,A3,B1,B2,C1}** et **{D1}** |
| Nombre de composantes | **2** (contre 3 dans le dossier de base) |
| Composantes indivisibles | **C₁ (taille 6)** et **C₂ (taille 1)** |
| Arêtes traversant la séparation de l'équipe | **3** : A1–A2, B1–B2, A3–B1 |
| Séparations sans fuite non triviales | **1 seule** : C₁ vs C₂ |
| Verdict sur la séparation de l'équipe | **Invalide (fuite)** — A1 (train) et A3 (test) reliés via A1–A2–A3 ; B1 (train) et B2/C1 (test) reliés |

**Conclusion de la variante :** l'arête A3–B1 rend la grande composante **strictement indivisible** ; toute séparation apprentissage/test doit désormais traiter {A1,A2,A3,B1,B2,C1} comme un bloc unique, ce qui interdit de placer A et B dans des camps opposés et invalide définitivement la partition annoncée par l'équipe.