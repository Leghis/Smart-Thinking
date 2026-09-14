# SIII-09-V1 — SIII-09 → Placement déjà indépendant

Score: 100.0 % (certificats 0/0, juge 100/100)

Certificats manqués: aucun

Tous les résultats sont certifiés. Je rédige la réponse finale.

## Réponse

**Variante : n1 ∈ A, n2 ∈ B, n3 ∈ C ; N, K, V restent racines uniques.**

Les coupes uniques (single points of failure) qui subsistent sont **exactement trois** :

$$\boxed{\{N\},\ \{K\},\ \{V\}}$$

- **{N}** — panne du DNS/point d'entrée : le chemin devient introuvable pour tous les usagers.
- **{K}** — panne du coffre/service central : l'accès aux données et la vérification des usagers sont interdits.
- **{V}** — faute de la génération logicielle principale : toutes les instances de cette génération sont incapables de servir, même dans des clusters différents.

**Aucun domaine physique n'est plus une coupe unique.** Les domaines A, B et C ne sont pas des coupes ; le domaine D n'est pas utilisé initialement. C'est le seul changement par rapport au dossier de base, où **{A}** était une coupe unique (n1 et n2 partageaient A).

## Preuves et certificats

**Modèle exact.** Le service est disponible ssi : `N up ∧ K up ∧ V up ∧ (nombre de réplicas joignables ≥ 2)`. Une coupe unique est une cause unique dont la panne viole cette condition. R05 garantit qu'une seule cause survient à la fois parmi {domaine utilisé, N, K, V}, et que les autres domaines, canaux et horloges restent dans les bornes — donc une panne de domaine ne coupe que les réplicas de ce domaine.

**Énumération exhaustive** (sortie `compute`) :

```
Causes testées : ['A', 'B', 'C', 'N', 'K', 'V']
Coupes uniques (cardinal 1) : ['N', 'K', 'V']
Nombre de coupes uniques : 3
Dossier de base - coupes uniques : ['A', 'N', 'K', 'V']
Panne domaine A -> réplicas joignables ['n2', 'n3'] (quorum=OK)
Panne domaine B -> réplicas joignables ['n1', 'n3'] (quorum=OK)
Panne domaine C -> réplicas joignables ['n1', 'n2'] (quorum=OK)
```

**Lecture du certificat.** Les trois réplicas étant dans trois domaines distincts, toute panne de domaine laisse exactement 2 réplicas joignables → quorum (2/3) maintenu → service encore disponible. Donc A, B, C ne sont pas des coupes. En revanche N, K, V sont des dépendances logiques uniques : leur panne coupe le chemin indépendamment du nombre de réplicas ou de domaines. Le certificat est un **témoin de non-coupe** pour chaque domaine (les 2 réplicas survivants) et un **témoin de coupe** pour N, K, V (la condition `N∧K∧V` échoue).

**Contraste avec le dossier de base.** Avec n1, n2 ∈ A et n3 ∈ B, la panne de A coupait 2 réplicas → quorum perdu → {A} était une coupe unique. La variante élimine précisément cette coupe de domaine, sans toucher aux trois racines logiques.

## Pièges traités

- **Adversaire / pire cas** : on teste chaque cause *seule* (R05), pas une moyenne ; la coupe est évaluée sur le scénario le plus défavorable.
- **Énumération exhaustive** : les 6 causes uniques {A,B,C,N,K,V} sont toutes testées ; aucune n'est omise. Le domaine D n'est pas utilisé initialement, donc hors espace des causes.
- **Budget / contraintes de domaine** : le quorum exige 2 réplicas ; on vérifie à chaque étape le nombre de réplicas joignables (2 après toute panne de domaine).
- **Ne pas confondre répartition et redondance logique** : trois réplicas dans trois domaines protègent contre une panne de domaine, mais **ne suppriment aucune** des racines N, K, V. C'est le point central : la variante améliore la tolérance *physique* sans réduire le nombre de coupes *logiques*.
- **P06 (test trompeur)** : couper un pod à la fois ne teste ni une panne de domaine, ni N, ni K, ni V — ces quatre événements collectifs restent non injectés. La variante ne change rien à ce piège.
- **P03 (site interdit)** : E reste inadmissible pour le stockage personnel ; le réplica votant contient ces données, donc E ne peut pas héberger n2. Le chiffrement ne change pas la politique.

## Limites / impossibilités

- **Aucune quantification de disponibilité** : R05 ne fournit ni probabilités ni MTBF/MTTR. On ne peut donc affirmer que des *coupes* (cardinal 1), pas des taux de disponibilité. Le nombre de coupes uniques (3) est exact ; toute « disponibilité en 9 » serait inventée.
- **Portée de la garantie** : la compromission cryptographique, deux pannes simultanées et la panne de tous les capteurs de santé sont hors garantie. Une coupe *combinée* (ex. N + K) n'est pas couverte par R05 et n'est donc pas comptée ici.
- **La variante ne corrige pas les racines** : N, K, V restent des coupes uniques tant que les familles F-entrée (éliminer N), F-clés (éliminer K) et F-version (génération de secours indépendante de V) ne sont pas déployées. Le placement 1-réplica-par-domaine (F-placement) est ici déjà satisfait par la variante, mais il ne traite que la coupe de domaine.
- **P07 (reprise de version)** : la variante ne modifie pas ce point ; un lecteur de secours qui « ignore l'état inconnu » et considère un document WAITLISTED comme FREE viole R01 (interprétation exacte). Répondre 200 ne prouve pas une restauration correcte — engagement de compatibilité writers/schéma/lecteur requis avant activation de WAITLISTED.

**Synthèse** : la variante fait passer les coupes uniques de **{A, N, K, V}** (dossier de base) à **{N, K, V}**. Elle supprime la coupe de domaine A, mais laisse intactes les trois racines logiques — trois réplicas et plusieurs régions ne suffisent donc toujours pas à rendre l'architecture tolérante à toute panne unique.