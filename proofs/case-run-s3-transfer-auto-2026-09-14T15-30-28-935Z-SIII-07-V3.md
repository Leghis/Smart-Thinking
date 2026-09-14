# SIII-07-V3 — SIII-07 → Réserve de soixante

Score: 100.0 % (certificats 0/0, juge 100/100)

Certificats manqués: aucun

# Réponse à la variante

## Ce qui change, et ce qui ne change pas

La variante ne modifie **qu'une seule hypothèse** : dans le scénario de réserve (P05), la réserve définitivement disponible passe de **30 → 60 CAD**. La dette initiale partenaire reste **80** (R01), la capture reste **100**, et l'objectif de liquidité stricte reste celui de **R06** : *le compte de règlement ne devient jamais négatif, même si le partenaire ne rembourse rien*.

Toutes les autres contraintes du dossier de base sont conservées telles quelles : R01 (répartition 80/20), R02 (effets immuables, pas de double effet), R03 (compte de règlement part de zéro, reprise possible jusqu'au total capturé, pas de réserve cachée), R06 (reprises futures non chevauchantes jusqu'à 100, aucun certificat de clôture), et l'histoire économique P01 (C=100, P=50, R=25, D perdu sur 40).

## Recalcul de la conclusion affectée (Q4, volet « avec réserve »)

**Modèle de pire cas.** La réserve est *définitivement disponible* : elle est sur le compte de règlement et **ne peut pas être reprise** par le prestataire de paiement. La seule reprise possible porte sur les fonds capturés, et R06 autorise une reprise allant **jusqu'à la totalité des 100 capturés**.

| Étape | Solde du compte de règlement |
|---|---|
| État initial (réserve) | **+60** |
| Après capture C = 100 | 60 + 100 = **160** |
| Après versement immédiat P | 160 − P |
| Après reprise maximale (100) | 160 − P − 100 = **60 − P** |

La contrainte de liquidité stricte s'écrit :

$$60 - P \ge 0 \quad\Longrightarrow\quad P \le 60$$

**Vérification numérique :** `60 + 100 − 100 = 60` ; au versement maximal `P = 60`, le solde au pire cas vaut `60 − 60 = 0` — **nul, jamais négatif**. Un versement de 61 donnerait `60 − 61 = −1`, donc un solde négatif réclamé à Relais : interdit.

**Contraintes secondaires (non actives) :** le versement ne peut pas non plus dépasser la dette partenaire (80). Comme 60 < 80, c'est bien la **contrainte de liquidité qui est active**, pas la contrainte de dette.

### Réponse

> **Le versement immédiat maximal respectant la liquidité stricte est de 60 CAD.**

C'est exactement la réserve définitivement disponible : dans ce modèle, la réserve est le seul coussin qui survit à une reprise totale, donc le versement sûr ne peut pas l'entamer. (Dans le dossier de base, avec une réserve de 30, la même formule donnait 30 — la variante se contente de décaler ce plafond à 60.)

## Points de contrôle conservés du dossier de base

- **Sans réserve (P01 pur) :** le versement sûr immédiat est **0**. Le solde après capture est 100 ; toute reprise jusqu'à 100 ramène le solde à `100 − P − 100 = −P`, négatif dès que P > 0. La réserve est donc la *seule* source de versement sûr avant clôture.
- **L'absence récente de notifications ne prouve pas la clôture** (R06) : il n'existe ni délai maximal de notification ni certificat de clôture. Le silence n'est pas une preuve ; le plafond reste 60 tant qu'aucune autorité ne certifie la fin du risque de reprise.
- **Ne pas mélanger les scénarios :** ces 60 CAD de réserve appartiennent à l'analyse séparée P05 et **ne doivent pas** être injectés dans le bilan de P01 (Q2), où le solde de règlement final reste négatif et où la créance partenaire n'est pas garantie (R03).

## Cohérence avec le reste du raisonnement

- **Q2 (bilan P01)** : inchangé — solde de règlement négatif, dette/créance partenaire et marge distinctes, équilibre vérifié sans masquer les négatifs.
- **Q3** : un bilan équilibré ne prouve ni la liquidité ni la récupération de la créance ; P03 (« argent distribuable = marge positive ») et P04 (`max(solde,0)` + autorisation non capturée + simulation USD) restent réfutés — la variante ne les réhabilite pas.
- **Q5/Q6** : inbox idempotente, réduction d'état versionnée, réconciliation avec l'autorité (P06 non tranché sans sa réponse), tests par permutation/duplication — inchangés.

**Conclusion bornée :** la seule conclusion affectée par la variante est le plafond de versement sûr, qui passe de 30 à **60 CAD** ; toutes les autres conclusions du dossier de base sont conservées.
# RÉPONSE FINALE

## Résultat exact

**Versement immédiat maximal respectant la liquidité stricte (variante, réserve = 60) : 60 CAD.**

## Certificat

**Modèle de pire cas (R06 + R03).** La réserve est *définitivement disponible* sur le compte de règlement et **non reprenable** ; la seule reprise possible porte sur les fonds capturés, jusqu'à **100** (totalité capturée, R06).

| Étape | Solde de règlement |
|---|---|
| Initial (réserve) | +60 |
| Après capture C = 100 | 160 |
| Après versement P | 160 − P |
| Après reprise maximale (100) | **60 − P** |

Contrainte : `60 − P ≥ 0` ⟹ **P ≤ 60**.

**Vérifications déterministes :**
- `60 + 100 − 100 = 60` (solde au pire cas pour P = 60)
- `60 − 60 = 0` → **nul, jamais négatif** ✔
- Contre-exemple : P = 61 → `60 − 61 = −1` → solde négatif réclamé à Relais ✘

**Contrainte secondaire non active :** dette partenaire = 80 > 60, donc c'est bien la liquidité qui borne, pas la dette.

**Formule générale :** `P_max = réserve` (car la reprise peut annuler la totalité des 100 capturés). Base : 30 → 30 ; variante : 60 → **60**.

## Pièges

1. **Confondre réserve et capture.** La capture (100) n'est pas un coussin : elle est intégralement reprenable. Seule la réserve survit à une reprise totale. Répondre 100 ou 80 est faux.
2. **Oublier la reprise maximale.** Si on suppose la reprise limitée à la dette partenaire (80) au lieu des 100 capturés, on obtient un plafond erroné. R06 fixe explicitement la borne à **100**.
3. **Mélanger les scénarios.** Les 60 CAD de P05 ne doivent **pas** entrer dans le bilan de P01 (Q2), où le solde final reste négatif et la créance partenaire non garantie (R03).
4. **Croire que le silence clôt le risque.** L'absence récente de notifications ne prouve rien (R06 : ni délai maximal, ni certificat de clôture). Le plafond reste 60.
5. **Confondre versement sûr et versement autorisé.** Le contrat peut *permettre* plus ; la liquidité stricte ne l'*autorise* pas au-delà de 60.
6. **Réutiliser P03/P04.** « Argent distribuable = marge positive » et `max(solde,0)` restent réfutés ; la variante ne les réhabilite pas.

## Limites

- **Hypothèse de non-reprenabilité de la réserve** : si la réserve pouvait elle-même être reprise, le plafond tomberait à 0. Le dossier la qualifie de « définitivement disponible », donc non reprenable.
- **Reprise supposée simultanée/unique** : R06 parle de reprises « non chevauchantes » jusqu'à 100 ; le pire cas cumulé reste 100, donc le résultat est robuste.
- **Aucune clôture certifiée** : 60 est un plafond *avant* toute preuve de fin de risque ; il ne vaut que tant que R06 s'applique.
- **Périmètre fictif** : conventions données, hors conseil financier/comptable/fiscal ; montants CAD exacts, sans impôt ni frais.

**Conclusion bornée :** la seule conclusion affectée par la variante est le plafond de versement sûr, qui passe de **30 → 60 CAD** ; toutes les autres conclusions du dossier de base sont conservées.