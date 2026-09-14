# SIII-09-V4 — SIII-09 → Deux pannes physiques simultanées

Score: 100.0 % (certificats 0/0, juge 100/100)

Certificats manqués: aucun

Tous les certificats sont en place. Voici la réponse finale.

---

# Variante : perte simultanée de deux domaines votants — la garantie tient-elle ?

## Réponse directe

**Non. La garantie de disponibilité n'est pas démontrée — elle est même réfutée.** Sous les contraintes imposées par la variante (quorum maintenu à 2, trois réplicas votants, aucun site supplémentaire), la perte simultanée de deux des trois domaines votants laisse **un seul réplica survivant**, strictement inférieur au quorum de 2. Aucune lecture ni écriture protégée n'est alors possible : R01 (« lire et réserver ») et R02 (« deux réplicas joignables ») sont violés. La variante est **structurellement infaisable** dans le dossier de base ; elle ne peut pas être « démontrée », seulement contredite.

---

## 1. Le raisonnement de base (rappel du dossier)

Le dossier de base établit :
- **R02** : trois réplicas votants `{n1, n2, n3}`, quorum **Q = 2** pour lire ou écrire.
- **F-placement** (P02) : après correction, un réplica par domaine physique, dans trois domaines distincts (par ex. A, B, C).
- **R05** : le modèle garanti ne couvre qu'**une seule cause à la fois** (un domaine, N, K ou V).

La correction F-placement rend le système tolérant à la perte d'**un** domaine : il reste alors 2 réplicas = quorum atteint. C'est exactement la garantie de base.

## 2. Ce que change la variante

La variante demande de tolérer la perte **simultanée de deux** des trois domaines votants, **sans changer le quorum (2)** et **sans ajouter de site**.

Or, avec un réplica par domaine dans trois domaines, perdre deux domaines revient à perdre deux réplicas. Il ne reste qu'**un** réplica. Comme `1 < Q = 2`, le quorum n'est pas atteint.

## 3. Preuve par énumération exhaustive

J'ai énuméré **tous** les sous-ensembles de domaines perdus (aucun cas omis) :

| Domaines perdus | Réplicas survivants | Quorum 2 atteint ? |
|---|---|---|
| A seul | {n2, n3} = 2 | ✅ |
| B seul | {n1, n3} = 2 | ✅ |
| C seul | {n1, n2} = 2 | ✅ |
| **A et B** | {n3} = **1** | ❌ |
| **A et C** | {n2} = **1** | ❌ |
| **B et C** | {n1} = **1** | ❌ |

**Toutes les paires sont non tolérées** (`toutes paires tolérées = False`). La défaillance n'est pas un cas limite isolé : elle est systématique.

## 4. Condition nécessaire (pourquoi c'est une impossibilité, pas un défaut de conception)

Pour qu'une perte de 2 domaines laisse au moins Q = 2 survivants, avec 1 réplica par domaine, il faut :

```
survivants = k − 2 ≥ 2  ⟹  k ≥ 4
```

- 3 domaines → 1 survivant → **échec**
- 4 domaines → 2 survivants → succès
- 5 domaines → 3 survivants → succès

**Conclusion :** tolérer deux pannes de domaine avec un quorum de 2 exige **au moins 4 domaines/réplicas**. La variante interdit précisément cela (« sans ajouter de sites »). Il y a donc **contradiction logique** entre les trois exigences simultanées : (i) quorum = 2, (ii) 3 réplicas, (iii) tolérance à 2 domaines perdus.

### Pourquoi « mettre 2 réplicas dans un domaine » n'aide pas

Une objection naturelle : concentrer deux réplicas dans un domaine pour « économiser » des domaines. C'est pire :
- Perdre ce domaine = perdre **2 réplicas d'un coup** → il reste 1 réplica < 2.
- Cela **détruit aussi** la tolérance à une panne unique de domaine (F-placement), donc régresse la garantie de base.

Aucun placement de 3 réplicas dans 3 domaines ne peut satisfaire la variante.

## 5. Conséquences sur les autres familles de correction

Les quatre familles de P02 sont **indépendantes** et chacune corrige un mécanisme distinct :
- **F-placement** → tolérance de domaine (le mécanisme visé par la variante).
- **F-entrée** → élimine N du chemin de secours.
- **F-clés** → élimine K pour les usagers déjà enregistrés.
- **F-version** → génération de secours indépendante de V.

La variante ne touche que **F-placement**. Les trois autres familles restent valides et inchangées : elles ne compensent **pas** le déficit de quorum, car elles ne modifient pas le mécanisme de consensus. Autrement dit, même avec F-entrée + F-clés + F-version parfaitement déployées, la perte de deux domaines votants bloque toujours le quorum. **Aucune combinaison des quatre familles ne restaure la garantie** sous les contraintes de la variante.

## 6. Ce que la variante ne peut pas être

- Ce n'est **pas** une garantie démontrable : c'est une exigence **contredite** par R02.
- Ce n'est **pas** un problème de « budget de perturbation » des pods (P01) : un pod de plus ne crée pas de réplica votant ni ne change le quorum (R04).
- Ce n'est **pas** couvert par R05 : le modèle garanti exclut explicitement **deux pannes simultanées**. La variante sort donc du domaine de validité du dossier — elle demande une garantie que le modèle de panne lui-même refuse de couvrir.

## 7. Options cohérentes (si l'on veut réellement cette garantie)

Pour rendre la variante démontrable, il faudrait **relâcher au moins une** des trois contraintes :

1. **Ajouter un 4ᵉ domaine/réplica** (k ≥ 4) : 2 survivants ≥ quorum 2. → viole « sans ajouter de sites ».
2. **Abaisser le quorum à 1** : mais alors on perd la garantie d'intersection lecture/écriture (R02 : « les clients n'écrivent jamais sur une copie minoritaire »), et la sûreté de consensus s'effondre. → viole R02.
3. **Étendre le modèle de panne** à deux causes simultanées : mais R05 l'exclut explicitement, et sans probabilités fournies, aucun calcul de disponibilité ne peut être inventé (interdit par l'énoncé).

Aucune de ces options n'est permise par la variante telle qu'énoncée.

---

## Limites / impossibilités

- **Impossibilité prouvée** : sous (quorum = 2, 3 réplicas, pas de nouveau site), la tolérance à 2 domaines perdus est **mathématiquement impossible**. Ce n'est pas une opinion d'architecture, c'est une conséquence arithmétique (`survivants = k − 2 < Q`).
- **Aucune valeur de disponibilité chiffrée** ne peut être produite : le dossier ne fournit aucune probabilité, et l'énoncé interdit d'en inventer. On ne peut donc parler que de **garantie structurelle** (oui/non), pas de taux de disponibilité.
- **Hors garantie R05** : la variante décrit un scénario à deux causes simultanées, explicitement exclu du modèle de panne garanti. La réponse correcte est donc un **refus de certification**, pas une démonstration.

**Verdict : la garantie de disponibilité ne reste pas démontrée ; elle est réfutée par énumération exhaustive, et la variante est infaisable sans ajouter un quatrième domaine ou modifier le quorum.**