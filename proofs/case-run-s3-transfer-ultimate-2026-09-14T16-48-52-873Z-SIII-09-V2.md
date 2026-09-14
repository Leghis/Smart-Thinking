# SIII-09-V2 — SIII-09 → Charge connue faible

Score: 100.0 % (certificats 0/0, juge 100/100)

Certificats manqués: aucun

Les calculs sont confirmés. Je rédige la réponse complète.

## Réponse

**Sous la variante (charge connue = 50 travaux), le site qui minimise le bilan carbone admissible est D**, avec **36 000 gCO2e** contre **38 500 gCO2e** pour C (écart de 2 500 gCO2e en faveur de D).

| Site | Bilan variable / travail | Bilan total à n = 50 |
|---|---|---|
| **C** | 2×300 + 50 = **650 gCO2e** | 650×50 + 6 000 = **38 500 gCO2e** |
| **D** | 5×100 + 200 = **700 gCO2e** | 700×50 + 1 000 = **36 000 gCO2e** |

**Choix : D.** Le site E reste exclu (non admissible, cf. P03), donc l'ensemble admissible est {C, D} et D y est le minimum.

## Preuves et certificats

**Modélisation exacte (P04).** Bilan total d'un site = (kWh/travail × gCO2e/kWh + transfert/travail) × n + coût fixe. Tous les termes sont couverts par P04 (« aucun terme caché »).

- C : variable = 2×300 + 50 = 650 ; total(50) = 650×50 + 6 000 = 32 500 + 6 000 = **38 500**.
- D : variable = 5×100 + 200 = 700 ; total(50) = 700×50 + 1 000 = 35 000 + 1 000 = **36 000**.

**Certificat d'optimalité (énumération exhaustive + minorant).** L'espace de décision admissible est fini et de cardinal 2 : {C, D} (E interdit par R01/P03 ; le réplica votant contient des données personnelles, le chiffrement ne lève pas la contrainte de localisation). Énumération complète : 38 500 (C) et 36 000 (D). Le minimum est atteint en D, et tout autre choix admissible (C) est strictement supérieur → **D est l'optimum, prouvé par énumération exhaustive** (pas seulement par comparaison locale).

**Seuil d'égalité (pour situer le résultat).** C = D ⟺ 650n + 6 000 = 700n + 1 000 ⟺ 50n = 5 000 ⟺ **n\* = 100 travaux**. En dessous de 100, D est moins carboné ; au-dessus, C l'emporte. À n = 50 < 100, D gagne — cohérent avec le calcul direct.

**Vérification par seconde méthode.** Calcul direct (outil `calculate`) et calcul symbolique en fractions exactes (`compute`) donnent les mêmes valeurs entières : 38 500 et 36 000. Aucun écart.

**Contrainte de service d'abord.** Le choix n'est valide que parce que C et D satisfont tous deux les contraintes de service (R01–R07) après les corrections de sûreté (F-placement, F-entrée, F-clés, F-version). Le déplacement de n2 vers C ou D est le « seul choix restant » (P04) : la sûreté est déjà acquise, le carbone est le critère résiduel. D est donc admissible **et** minimal.

## Pièges traités

- **Adversaire / pire cas (checklist).** Dans le dossier de base, l'incertitude {50, 200} imposait un choix **minimax** : C (pire cas 136 000) bat D (pire cas 141 000). **La variante supprime cette incertitude** : la charge est connue (50), donc le critère minimax disparaît et l'on optimise directement. C'est le point clé du changement d'hypothèse — le choix s'inverse (base → C, variante → D).
- **Fractions exactes et optimalité prouvée.** Tous les bilans sont des entiers exacts ; l'optimum est certifié par énumération exhaustive de l'espace admissible (cardinal 2), pas par une heuristique.
- **Budget / contraintes de domaine.** E est écarté par la politique de localisation (R01/P03) : le classement carbone brut ne suffit pas, l'admissibilité prime. Le budget de perturbation des pods (P01) n'est pas affecté par le choix C/D.
- **Ne pas confondre intensité et bilan.** Le seul classement par intensité électrique (C : 300 g/kWh < D : 100 g/kWh… attention, ici D a l'intensité la plus faible) est trompeur : il ignore le volume (kWh/travail), le transfert et le coût fixe. C'est précisément pourquoi le calcul complet est requis (voir Limites).
- **Test trompeur (P06) et reprise de version (P07).** Sans effet sur le calcul carbone, mais rappelés : ils invalident les revendications de disponibilité/restauration et ne changent pas l'admissibilité de C ou D.

## Limites / impossibilités

- **Aucune garantie chiffrée de disponibilité.** R05 ne fournit aucune probabilité ni durée de bascule ; on ne peut donc pas produire de MTBF, de taux de disponibilité (n « 9 ») ni de RTO/RPO chiffrés. Le résultat est un **choix déterministe sous contraintes**, pas une mesure de fiabilité.
- **Le résultat dépend de la charge.** D n'est optimal **que** pour n = 50 (et plus généralement n < 100). Si la charge réelle dépassait 100 travaux, C redeviendrait préférable ; la conclusion est donc conditionnelle à l'hypothèse « charge connue = 50 ».
- **Périmètre carbone borné à P04.** Les chiffres fictifs couvrent « exactement le périmètre comparé » ; toute émission hors de ce périmètre (fabrication, réseau, etc.) est hors modèle et ne peut être ajoutée sans invalider la comparaison.
- **E non évaluable.** E est exclu par politique, non par son bilan : on ne peut pas affirmer qu'il serait « meilleur » ou « pire » dans un cadre admissible, seulement qu'il est interdit ici.
- **Optimalité locale, pas universelle.** Comme pour les familles de correction (P02), il s'agit d'une nécessité/optimalité **dans cette architecture et ce jeu de données**, pas d'un optimum universel de conception.
## Réponse finale

**Question posée (variante) : quel site minimise le bilan admissible, la charge étant connue et égale à 50 travaux ?**

**Réponse : le site D**, avec un bilan total de **36 000 gCO2e**, contre **38 500 gCO2e** pour le site C. L'ensemble admissible étant {C, D} (E exclu par R01/P03), D est l'optimum, certifié par énumération exhaustive.

### Résultats exacts

| Site | Variable / travail | Total à n = 50 | Total à n = 200 (rappel) |
|---|---|---|---|
| **C** | 2×300 + 50 = **650 gCO2e** | 650×50 + 6 000 = **38 500 gCO2e** | 136 000 gCO2e |
| **D** | 5×100 + 200 = **700 gCO2e** | 700×50 + 1 000 = **36 000 gCO2e** | 141 000 gCO2e |

- **Seuil d'égalité : n\* = 100 travaux** (650n + 6 000 = 700n + 1 000 ⟺ 50n = 5 000).
- **Écart à n = 50 : D − C = −2 500 gCO2e** (D moins carboné).
- **Choix : D** (n = 50 < n\* = 100).

### Certificats

1. **Modélisation exacte (P04).** Bilan = (kWh/travail × gCO2e/kWh + transfert/travail) × n + coût fixe. Aucun terme caché (P04 le stipule explicitement).
2. **Énumération exhaustive.** Espace admissible fini, cardinal 2 : {C, D}. E est interdit (P03 : le réplica votant contient des données personnelles ; le chiffrement ne lève pas la politique de localisation). Valeurs énumérées : 38 500 (C), 36 000 (D) → minimum atteint en D, tout autre admissible strictement supérieur.
3. **Double méthode.** Calcul direct (`calculate`) et calcul symbolique en fractions exactes (`compute`) donnent les mêmes entiers : 38 500 et 36 000. Aucun écart.
4. **Contrainte de service satisfaite d'abord.** C et D sont tous deux admissibles après les corrections de sûreté (F-placement, F-entrée, F-clés, F-version) ; le déplacement de n2 vers C ou D est le « seul choix restant » (P04). D est donc admissible **et** minimal.

### Pièges traités

- **Adversaire / pire cas.** Dans le dossier de base, l'incertitude {50, 200} imposait un **minimax** → C (pire cas 136 000 < 141 000). **La variante supprime l'incertitude** : charge connue = 50, donc le critère minimax disparaît et l'on optimise directement → **le choix s'inverse en faveur de D**. C'est le seul point d'hypothèse modifié ; toutes les autres contraintes du dossier de base sont conservées.
- **Fractions exactes + optimalité prouvée.** Bilans entiers exacts ; optimum certifié par énumération exhaustive (cardinal 2), pas par heuristique.
- **Budget / contraintes de domaine.** E écarté par la politique de localisation (R01/P03) : l'admissibilité prime sur le classement carbone brut. Le budget de perturbation des pods (P01) n'est pas affecté par le choix C/D.
- **Ne pas confondre intensité et bilan.** Le classement par seule intensité électrique est trompeur : il ignore le volume (kWh/travail), le transfert et le coût fixe. Ici D a la plus faible intensité (100 < 300 g/kWh) **et** gagne à n = 50, mais ce n'est pas la raison du résultat — c'est le bilan complet qui décide (à n = 200, C l'emporte malgré son intensité plus élevée).
- **Test trompeur (P06) / reprise de version (P07).** Sans effet sur le calcul carbone, mais rappelés : ils invalident les revendications de disponibilité et de restauration et ne modifient pas l'admissibilité de C ou D.

### Limites / impossibilités

- **Aucune garantie chiffrée de disponibilité.** R05 ne fournit ni probabilité ni durée de bascule : impossible de produire MTBF, taux de disponibilité (« n 9 ») ou RTO/RPO chiffrés. Le résultat est un **choix déterministe sous contraintes**, pas une mesure de fiabilité.
- **Résultat conditionnel à la charge.** D n'est optimal que pour n = 50 (plus généralement n < 100). Au-delà de 100 travaux, C redeviendrait préférable ; la conclusion dépend donc de l'hypothèse « charge connue = 50 ».
- **Périmètre carbone borné à P04.** Les chiffres fictifs couvrent « exactement le périmètre comparé » ; toute émission hors périmètre (fabrication, réseau, etc.) est hors modèle et ne peut être ajoutée sans invalider la comparaison.
- **E non évaluable.** E est exclu par politique, non par son bilan : on ne peut affirmer ni qu'il serait meilleur ni pire dans un cadre admissible, seulement qu'il est interdit ici.
- **Optimalité locale, pas universelle.** Comme pour les familles de correction (P02), il s'agit d'une optimalité **dans cette architecture et ce jeu de données**, pas d'un optimum universel de conception.

**Synthèse :** sous la variante (charge connue = 50), le site **D** minimise le bilan admissible à **36 000 gCO2e** (vs 38 500 pour C), l'optimum étant certifié par énumération exhaustive de l'espace admissible {C, D} et vérifié par deux méthodes indépendantes.