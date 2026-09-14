# SIII-07-V1 — SIII-07 → Versement initial réduit

Score: 100.0 % (certificats 0/0, juge 100/100)

Certificats manqués: aucun

# Variante P = 20 — Bilan réalisé et garantie prospective

**Périmètre de la variante.** Seule l'hypothèse P01 est modifiée : le versement au partenaire passe de **P = 50 à P = 20**. Toutes les autres données du dossier de base sont conservées : capture C = 100, remboursement R = 25, litige perdu D = 40 (sur 40 distincts des 25 déjà remboursés), ordre économique C → P → R → D, répartition 80/20 (R01), et les règles R02–R07. Je recalcule donc uniquement les conclusions affectées par P.

---

## 1. Écritures recalculées (R01)

La capture crée une créance de 100 sur le PSP, une dette de 80 envers le partenaire et une marge de 20. Chaque remboursement ou litige perdu réduit dette partenaire et marge dans la proportion 80 % / 20 %. Le versement P ne fait que **déplacer** de la trésorerie : il éteint une partie de la dette partenaire sans toucher la marge.

| Opération | Solde de règlement (PSP) | Dette partenaire | Marge |
|---|---|---|---|
| **C** capture 100 | +100 | +80 | +20 |
| **P** versement 20 | −20 | −20 | 0 |
| **R** remboursement 25 | −25 | −20 (=0,8×25) | −5 (=0,2×25) |
| **D** litige perdu 40 | −40 | −32 (=0,8×40) | −8 (=0,2×40) |
| **Total** | **15** | **8** | **7** |

Contrôles :
- Solde de règlement : 100 − 20 − 25 − 40 = **15**.
- Dette partenaire : 80 − 20 − 20 − 32 = **8**.
- Marge : 20 − 5 − 8 = **7**.

---

## 2. Bilan réalisé (final)

Le solde de règlement chez le PSP **est** la créance sur le PSP (R03 : le compte commence à zéro, aucun actif caché). Le bilan se lit donc :

| Actif | Montant | Passif + Capitaux propres | Montant |
|---|---|---|---|
| Solde de règlement PSP | 15 | Dette envers le partenaire | 8 |
| | | Marge (equity) | 7 |
| **Total actif** | **15** | **Total passif + equity** | **15** |

**Équilibre vérifié : 15 = 8 + 7.** Aucun montant négatif n'est masqué : ici le solde est positif (+15), mais la règle d'affichage reste « ne jamais écraser un négatif » (voir §4).

**Lecture économique :**
- **Solde de règlement = +15 CAD** : Relais détient encore 15 chez le PSP. C'est un actif réel, mais **récupérable seulement si le PSP le reverse**.
- **Dette partenaire = 8 CAD** : Relais doit encore 8 au partenaire. Ce n'est **pas** une créance de Relais — c'est un passif. (Dans le dossier de base avec P = 50, cette dette tombait à 0 et le partenaire devenait débiteur ; ici, avec un versement plus faible, Relais reste **débiteur net de 8** envers le partenaire.)
- **Marge = 7 CAD** : résultat économique cumulé, positif.

**Différence avec le dossier de base (P = 50) :** le solde PSP passe de 15 à 15 (inchangé, car P n'affecte pas le solde net final : +100 − P − 25 − 40 ; avec P = 50 on aurait 100−50−25−40 = −15, donc en réalité le solde **change**). Vérifions : avec P = 50, solde = −15 ; avec P = 20, solde = +15. La dette partenaire passe de 0 (P = 50) à 8 (P = 20). La marge reste 7 dans les deux cas (P n'affecte pas la marge). **Le versement plus faible améliore la trésorerie (+30) mais laisse subsister une dette partenaire de 8.**

---

## 3. Garantie prospective (R06) — versement maximal sûr

**Question :** juste après la capture, avant tout versement, quel versement P est compatible avec l'objectif de liquidité stricte « le solde de règlement ne devient jamais négatif, même si le partenaire ne rembourse rien » ?

Le contrat permet encore des reprises futures non chevauchantes **jusqu'à la totalité des 100 capturés** (R06), sans délai maximal ni certificat de clôture. Le pire cas est donc une reprise totale de 100.

**Sans réserve (P01) :**
- Solde initial après capture = 100.
- Pire cas : 100 − P − 100 = −P.
- Condition −P ≥ 0 ⟹ **P ≤ 0**.

**Versement maximal sûr = 0 CAD.** Tout versement positif expose le compte à devenir négatif dans le pire cas. Le P = 20 de la variante (comme le P = 50 du dossier de base) **viole donc R06** : il n'est pas couvert par la garantie prospective.

**Avec la réserve P05 (30 CAD définitivement disponible) :**
- Solde initial = 100 + 30 = 130.
- Pire cas : 130 − P − 100 = 30 − P ≥ 0 ⟹ **P ≤ 30**.

**Versement maximal sûr = 30 CAD.** La réserve absorbe exactement le choc résiduel. Le P = 20 de la variante devient alors **sûr** (20 ≤ 30), avec 10 CAD de coussin restant.

**Distinction clé :**
- **Bilan réalisé** (P = 20 effectif) : solde +15, dette partenaire 8, marge 7 — c'est un constat *ex post*, après que les reprises ont eu lieu.
- **Garantie prospective** (R06) : elle borne ce qu'on *aurait pu* verser sans jamais risquer un solde négatif. Sans réserve, cette borne est 0 ; avec réserve, 30. Le fait que le bilan réalisé soit positif **ne prouve pas** que le versement était sûr *au moment où il a été décidé* : la sécurité dépendait de l'absence de reprises futures, non garantie.

**L'absence récente de notifications prouve-t-elle la clôture du risque ?** **Non.** R06 stipule qu'il n'existe ni délai maximal de notification ni certificat de clôture. L'absence de notification est un silence, pas une preuve : des reprises retardées (R05) peuvent encore arriver. La clôture du risque exige un **certificat de clôture** ou l'expiration d'un délai contractuel — aucun n'est fourni.

---

## 4. Réfutation de P03 et P04 dans la variante

**P03 (réducteur défectueux) :** il remplace le statut par celui de la dernière notification reçue et poste une écriture par identifiant d'enveloppe inédit. Dans P02, l'ordre de réception est `D LOST v2`, `R`, `C`, `D OPEN v1`, `C` (redélivré), `P`, `D LOST v2` (redélivré). Le réducteur :
1. **Rouvrirait** le litige en appliquant `D OPEN v1` reçu après `LOST v2` — violation de R04 (une notification OPEN 1 après LOST 2 ne rouvre pas).
2. **Double-compterait** C et D LOST (enveloppes distinctes, même opération) — violation de R02 (le même état final reçu plusieurs fois ne crée pas plusieurs effets).
3. Calculerait « argent distribuable » = marge comptable positive = **7**, alors que ce chiffre ne dit rien sur la liquidité.

**P04 (solde bancaire affiché) :** il additionne une autorisation non capturée de 200 CAD et une simulation de 15 USD, puis masque un négatif avec `max(solde, 0)`. Réfutations :
- L'autorisation non capturée n'est **pas** une rentrée de trésorerie (R07).
- La simulation USD ne compense **aucun** solde CAD sans opération de change (R07).
- `max(solde, 0)` **efface** un négatif, ce qui est précisément l'interdit : un solde négatif doit rester visible (R03).

Dans la variante, le solde réel est +15, donc P04 afficherait 15 + 200 + 15 = 230 CAD — un chiffre **faux** qui masque la vraie exposition.

---

## 5. Synthèse de la variante

| Grandeur | Dossier de base (P = 50) | **Variante (P = 20)** |
|---|---|---|
| Solde de règlement PSP | −15 | **+15** |
| Dette partenaire | 0 | **8** |
| Marge | 7 | **7** |
| Bilan équilibré | oui | **oui (15 = 8 + 7)** |
| Versement max sûr sans réserve (R06) | 0 | **0** |
| Versement max sûr avec réserve 30 (P05) | 30 | **30** |

**Conclusion.** En réduisant P de 50 à 20, le bilan réalisé reste équilibré mais change de structure : le solde de règlement redevient **positif (+15)** au lieu de négatif (−15), et Relais reste **débiteur de 8** envers le partenaire au lieu d'être quitte. La marge (7) est inchangée car P n'affecte pas la répartition 80/20. La **garantie prospective** est indépendante du P réalisé : sous R06, le versement maximal sûr est **0 sans réserve** et **30 avec la réserve P05** — le P = 20 effectif n'était donc couvert que dans le scénario avec réserve, et jamais garanti par le seul bilan réalisé.
# RÉPONSE FINALE — Variante P = 20

## Résultats exacts (certifiés)

**Écritures (R01, répartition 80/20) :**

| Opération | Solde PSP | Dette partenaire | Marge |
|---|---|---|---|
| C capture 100 | +100 | +80 | +20 |
| P versement 20 | −20 | −20 | 0 |
| R remboursement 25 | −25 | −20 | −5 |
| D litige perdu 40 | −40 | −32 | −8 |
| **Total** | **15** | **8** | **7** |

**Bilan réalisé final :**

| Actif | Montant | Passif + Equity | Montant |
|---|---|---|---|
| Solde de règlement PSP | 15 | Dette envers partenaire | 8 |
| | | Marge | 7 |
| **Total** | **15** | **Total** | **15** |

**Équilibre : 15 = 8 + 7 ✓** (aucun négatif masqué).

**Garantie prospective (R06) :**
- Sans réserve : **P_max = 0** (pire cas 100 − P − 100 ≥ 0 ⟹ P ≤ 0).
- Avec réserve P05 = 30 : **P_max = 30** (130 − P − 100 ≥ 0 ⟹ P ≤ 30).

## Certificats

- `claim-42a9fa3d` : bilan P=20 → solde 15, dette 8, marge 7 ; équilibre 15 = 8 + 7. Méthode : écritures R01. Preuve : `100−20−25−40=15`, `80−20−20−32=8`, `20−5−8=7`.
- `claim-d0931646` : P_max = 0 (sans réserve), 30 (avec réserve). Méthode : pire cas reprise totale 100. Preuve : `100−P−100≥0 ⟹ P≤0` ; `130−P−100≥0 ⟹ P≤30`.

## Pièges évités

1. **Confondre dette partenaire et créance.** Avec P = 20, Relais reste **débiteur de 8** envers le partenaire (passif), pas créancier. Le dossier de base (P = 50) inversait ce signe.
2. **Croire que P affecte la marge.** Faux : P ne touche que trésorerie et dette partenaire ; la marge (7) est identique dans les deux variantes.
3. **Confondre bilan réalisé et garantie prospective.** Le solde +15 est un constat *ex post* ; il ne prouve pas que le versement était sûr *ex ante* sous R06.
4. **Prendre le silence pour une clôture.** L'absence de notifications ne prouve rien (R06 : ni délai maximal ni certificat).
5. **Rouvrir le litige** sur `D OPEN v1` reçu après `LOST v2` (violation R04) ou **double-compter** C et D LOST (violation R02).
6. **Masquer un négatif** avec `max(solde, 0)` (P04) ou additionner autorisation non capturée et simulation USD (R07).

## Limites

- La variante ne modifie **que** P01 (P = 50 → 20) ; toutes les autres hypothèses du dossier de base sont conservées.
- La réserve P05 est une **analyse séparée** : elle ne doit pas être mélangée au bilan de P01 (R03 : pas de réserve cachée dans le scénario de base).
- La réponse de l'autorité de réconciliation pour P06 (WON v2 contradictoire) **n'est pas fournie** : on ne peut que la mettre en attente, sans trancher.
- Les montants sont en CAD exacts, sans impôt, frais ni conversion.