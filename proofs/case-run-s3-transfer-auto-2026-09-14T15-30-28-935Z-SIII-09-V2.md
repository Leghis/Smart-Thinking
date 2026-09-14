# SIII-09-V2 — SIII-09 → Charge connue faible

Score: 100.0 % (certificats 0/0, juge 100/100)

Certificats manqués: aucun

Tous les calculs sont confirmés. Je peux maintenant rédiger la réponse complète.

---

# Réponse à la variante — Charge connue de 50 travaux

## Cadrage : ce qui change, ce qui ne change pas

La variante ne modifie **qu'une seule hypothèse** : P05. L'incertitude « charge ∈ {50, 200}, sans probabilité » devient une **charge connue et certaine de 50 travaux**. Toutes les autres pièces et règles restent en vigueur : R01–R07, P01–P04, P06, P07, et notamment **P03 (site E interdit)** et **P04 (chiffres carbone)**.

Conséquence méthodologique immédiate : le critère **minimax** de P05 (« minimiser le pire bilan parmi les deux charges ») **dégénère**. Quand la charge est connue, il n'y a plus de « pire cas » à couvrir : le minimax se réduit à une **minimisation simple** du bilan de la charge unique. La question « quel site minimise le bilan admissible ? » se décompose donc en deux temps, dans cet ordre :

1. **Filtre d'admissibilité** (contraintes de service, R01) : quels sites sont *autorisés* ?
2. **Minimisation carbone** parmi les sites admissibles.

---

## Étape 1 — Filtre d'admissibilité : E est éliminé avant tout calcul

**P03** est explicite : le site E affiche de meilleures émissions que C et D, **mais n'est pas admissible pour le stockage de données personnelles selon R01**. Or le réplica votant contient précisément ces données. Le chiffrement ne change pas la politique de localisation.

Donc **E est exclu d'office**, quelle que soit sa performance carbone. C'est le point que la question souligne : « admissible » n'est pas un synonyme de « moins émetteur ». Un site non conforme à R01 ne peut pas être retenu, même s'il gagne sur le seul critère CO₂.

Il reste **C et D**, tous deux admissibles.

---

## Étape 2 — Bilans carbone pour 50 travaux (P04)

Rappel des formules, périmètre exact fourni par P04 (aucun terme caché) :

| Site | Variable | Transfert | Fixe |
|------|----------|-----------|------|
| **C** | 2 kWh × 300 g/kWh = **600 g/travail** | 50 g/travail | 6000 g |
| **D** | 5 kWh × 100 g/kWh = **500 g/travail** | 200 g/travail | 1000 g |

Coût marginal par travail : **C = 650 g**, **D = 700 g**.

**Pour n = 50 travaux :**

- **C** : 650 × 50 + 6000 = 32 500 + 6 000 = **38 500 gCO2e**
- **D** : 700 × 50 + 1000 = 35 000 + 1 000 = **36 000 gCO2e**

*(Vérifié par calcul déterministe : 38 500 et 36 000.)*

**D émet moins que C à 50 travaux : 36 000 g < 38 500 g.**

---

## Étape 3 — Seuil d'égalité et lecture du résultat

Le seuil où C et D s'égalisent :

650n + 6000 = 700n + 1000 ⟹ 5000 = 50n ⟹ **n = 100 travaux**.

- Pour **n < 100** : D est moins émetteur (son coût fixe plus faible domine).
- Pour **n > 100** : C devient moins émetteur (son coût marginal plus faible domine).
- À **n = 100** : égalité stricte (70 000 g chacun).

À **n = 50**, on est nettement dans la zone où **D gagne**.

**Contraste avec le dossier de base** (pour mémoire) : avec l'incertitude {50, 200}, le minimax comparait les pires cas — C pire cas = 136 000 g (à 200), D pire cas = 141 000 g (à 200) — et **C** l'emportait au titre du minimax. La variante **inverse le choix** : dès que la charge est connue à 50, c'est **D** qui minimise. C'est exactement le type de bascule que le seuil n = 100 rend prévisible.

---

## Étape 4 — Pourquoi E et le seul classement par intensité ne répondent pas

- **E** : meilleures émissions mais **non admissible** (P03). Le problème demande le bilan *admissible* ; E est hors-jeu par contrainte de service, pas par performance. Le retenir violerait R01.
- **Le seul classement par intensité électrique** (gCO2e/kWh) est également trompeur : C a une intensité de 300 g/kWh, D de 100 g/kWh — un classement « intensité seule » désignerait D comme trois fois plus propre, ce qui est vrai *par kWh* mais **ne détermine pas le bilan total**. Le bilan dépend aussi de la **consommation** (2 vs 5 kWh), du **transfert** (50 vs 200 g) et du **coût fixe** (6000 vs 1000 g). C'est précisément parce que ces termes se compensent que le seuil existe à n = 100. Un raisonnement « intensité seule » ignorerait la consommation et le fixe, et ne pourrait ni calculer le seuil ni justifier le choix.

---

## Conclusion

**Le site qui minimise le bilan admissible est D.**

- E est éliminé par R01/P03 (non admissible pour les données personnelles).
- Entre C et D, à la charge connue de 50 travaux : **D = 36 000 gCO2e < C = 38 500 gCO2e**.
- Le seuil de bascule est n = 100 ; à 50 travaux, D gagne.
- Le critère minimax de P05 se réduit ici à une minimisation simple, puisque la charge n'est plus incertaine.

**Réponse : D.**

---

### Note de rigueur (ce que ce dossier ne permet pas de conclure)

Conformément à R05 et à l'esprit du dossier, ce résultat est un **choix carbone conditionnel**, pas une garantie de disponibilité chiffrée : aucune probabilité n'est fournie, donc **aucun calcul de disponibilité (SLA, MTBF, taux de perte) ne peut être déduit**. Le choix de D suppose que les corrections de sûreté (F-placement, F-entrée, F-clés, F-version) sont déjà en place — P04 le précise : « après les corrections de sûreté, le seul choix restant est de déplacer n2 vers C ou D ». Le déplacement de n2 vers D doit donc respecter F-placement (un réplica par domaine physique distinct) et l'admissibilité R01, ce que D satisfait.
# RÉPONSE FINALE

## Résultat exact

**Le site qui minimise le bilan carbone admissible est D.**

| Site | Admissible (R01/P03) | Bilan à 50 travaux | Verdict |
|------|:---:|---:|---|
| **E** | ❌ Non | (meilleures émissions, mais hors-jeu) | Éliminé par contrainte |
| **C** | ✅ Oui | **38 500 gCO2e** | Battu |
| **D** | ✅ Oui | **36 000 gCO2e** | **Retenu** |

**D = 36 000 gCO2e < C = 38 500 gCO2e.** Écart : 2 500 gCO2e en faveur de D.

---

## Certificats

**1. Bilans carbone (P04, périmètre exact, aucun terme caché)**

- Coût marginal : C = 2 kWh × 300 g/kWh + 50 g = **650 g/travail** ; D = 5 kWh × 100 g/kWh + 200 g = **700 g/travail**.
- C(50) = 650 × 50 + 6000 = 32 500 + 6 000 = **38 500 gCO2e** *(calcul déterministe : 38500)*.
- D(50) = 700 × 50 + 1000 = 35 000 + 1 000 = **36 000 gCO2e** *(calcul déterministe : 36000)*.

**2. Seuil d'égalité**

650n + 6000 = 700n + 1000 ⟹ 50n = 5000 ⟹ **n = 100** *(calcul déterministe : (6000−1000)/(700−650) = 100)*.
- n < 100 → D gagne ; n > 100 → C gagne ; n = 100 → égalité (70 000 g chacun).
- À n = 50 : **D gagne**.

**3. Réduction du critère (effet de la variante)**

P05 passe d'une incertitude {50, 200} sans probabilité à une charge **connue = 50**. Le **minimax dégénère en minimisation simple** : il n'existe plus de « pire cas » à couvrir. Le choix n'est donc plus dicté par la robustesse au pire cas, mais par le bilan de la charge unique.

**4. Contraste avec le dossier de base (contrôle de cohérence)**

- Base (minimax sur {50, 200}) : C pire cas = 136 000 g (à 200) ; D pire cas = 141 000 g (à 200) → **C** retenu.
- Variante (charge = 50) : **D** retenu.
- La bascule est **prévisible et cohérente** : elle se produit exactement au franchissement du seuil n = 100. Aucune contradiction avec le dossier de base — seule l'hypothèse P05 a été substituée, comme demandé.

---

## Pièges identifiés

1. **« Admissible » ≠ « moins émetteur ».** E a les meilleures émissions mais viole R01/P03 (données personnelles interdites). Le chiffrement ne change pas la politique de localisation. E est éliminé **avant** tout calcul carbone.
2. **Classement par intensité seule trompeur.** C (300 g/kWh) paraît « sale » face à D (100 g/kWh), mais le bilan total dépend aussi de la **consommation** (2 vs 5 kWh), du **transfert** (50 vs 200 g) et du **coût fixe** (6000 vs 1000 g). Ces termes se compensent et créent le seuil à n = 100. L'intensité seule ne détermine pas le choix.
3. **Confondre minimax et minimisation.** Avec la charge connue, appliquer encore un raisonnement « pire cas » serait une erreur de méthode : le minimax n'a de sens que sous incertitude. Ici il se réduit à une comparaison directe.
4. **Oublier le filtre de service.** P04 rappelle que le déplacement de n2 vers C ou D n'intervient **qu'après** les corrections de sûreté (F-placement, F-entrée, F-clés, F-version). Le choix carbone est conditionné à la conformité de service, pas l'inverse.
5. **Extrapoler hors périmètre.** P04 précise que les chiffres couvrent « exactement le périmètre comparé ; aucun terme caché n'est à ajouter ». Ajouter un terme (embodied carbon, PUE, etc.) serait une invention non autorisée.

---

## Limites (ce que ce dossier ne permet pas de conclure)

- **Aucune garantie de disponibilité chiffrée.** R05 ne fournit aucune probabilité ; « aucun calcul de disponibilité ne peut être inventé en l'absence de probabilités ». On ne peut donc produire ni SLA, ni MTBF, ni taux de perte attendu. Le résultat est un **choix carbone conditionnel**, pas une preuve de disponibilité.
- **Le choix de D suppose les corrections de sûreté déjà en place.** Sans F-placement/F-entrée/F-clés/F-version, déplacer n2 ne suffit pas à rendre le service tolérant à une panne unique (Q1 : les coupes minimales A, B, N, K, V subsistent).
- **Le résultat est borné à la charge = 50.** Il ne vaut pas pour n > 100, où C redevient préférable. La conclusion est donc **spécifique à l'hypothèse substituée**, conformément à la consigne « remplacer uniquement les hypothèses explicitement modifiées ».
- **P07 (reprise de version) reste un risque non résolu par ce calcul.** Le choix de site ne traite pas l'incompatibilité G-safe/G-new : un document WAITLISTED relu comme FREE par G-safe est une **corruption sémantique**, pas une restauration réussie. Cela relève d'un engagement de compatibilité (writers/schéma/lecteur de secours) indépendant du choix C/D.
- **P06 (test trompeur) invalide toute revendication de test.** Couper un pod ne teste ni une panne de domaine A, ni N, ni K, ni V. Aucune conclusion de robustesse ne peut être tirée de ces essais.

---

## Synthèse en une ligne

Sous la variante (charge connue = 50), le filtre d'admissibilité élimine E, et la minimisation simple donne **D (36 000 gCO2e) < C (38 500 gCO2e)** : **le site D minimise le bilan admissible**, le seuil de bascule étant n = 100 — résultat conditionnel aux corrections de sûreté et sans aucune garantie de disponibilité chiffrable.