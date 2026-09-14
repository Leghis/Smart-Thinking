# SIII-07-V4 — SIII-07 → Deux remboursements distincts de même montant

Score: 100.0 % (certificats 0/0, juge 100/100)

Certificats manqués: aucun

# Variante — Faut-il dédupliquer R2 avec R1 ?

## Réponse directe

**Non.** R2 ne doit **pas** être dédupliqué avec R1. Ce sont deux opérations économiques **distinctes** qui se trouvent avoir le même montant (25). La déduplication par montant serait une faute de conception : elle confondrait deux effets légitimes et sous-estimerait la dette réelle de Relais.

---

## 1. Pourquoi la déduplication est ici une erreur

### 1.1 Ce que dit le dossier de base (R02, R04)

- **R02** : « Le même état final reçu plusieurs fois ne crée pas plusieurs effets. **Les numéros de livraison des notifications ne sont pas des identifiants d'opération économique.** »
- **R04** : chaque état possède un **identifiant**, une **version** et une **empreinte de contenu**.

La clé d'idempotence correcte est donc le couple **(identité d'opération économique, version/contenu)**, jamais le montant, jamais l'enveloppe de transport.

### 1.2 Application à R1 et R2

L'énoncé de la variante est explicite : R2 est « **réellement distinct** de R1=25, confirmé et non chevauchant avec D=40 ». Deux opérations distinctes, confirmées, non chevauchantes :

| Opération | Identité | Montant | Nature |
|---|---|---|---|
| R1 | `op-R1` | 25 | remboursement |
| R2 | `op-R2` | 25 | remboursement |
| D | `op-D` | 40 | litige perdu |

`op-R1 ≠ op-R2` ⇒ **deux écritures**, pas une. Le fait que 25 = 25 est une **coïncidence de montant**, pas une preuve de duplication. Dédupliquer sur `(type, montant)` fusionnerait à tort deux remboursements réels — exactement le genre de bug que P03 (réducteur naïf) produirait.

### 1.3 Ce qu'il faut dédupliquer (et ce qu'il ne faut pas)

- **À dédupliquer** : la **même** opération reçue plusieurs fois — même `operation_id`, même version, même empreinte (ex. `C SUCCEEDED v1` livré deux fois dans P02, ou `D LOST v2` livré deux fois). Ces redélivrances ont des **enveloppes différentes** mais la **même identité** : un seul effet.
- **À ne pas dédupliquer** : deux opérations distinctes de même montant (R1 vs R2). Chacune produit son effet.

> **Règle** : l'idempotence se joue sur l'**identité d'opération**, pas sur la valeur. Un dédoublonnage par montant est un anti-pattern.

---

## 2. Recalcul des conclusions affectées par la variante

Seules les conclusions touchant les **remboursements** changent. Les autres contraintes du dossier de base (R01, R02, R03, R06, P02, P03, P04, P06) sont conservées.

### 2.1 Répartition R01 (80 % partenaire / 20 % marge)

Réductions cumulées : R1 (25) + R2 (25) + D (40) = **90** (≤ 100, non chevauchantes).

| Position | Base (R1+D=65) | **Variante (R1+R2+D=90)** |
|---|---|---|
| Créance sur PSP | 100 − 65 = 35 | **100 − 90 = 10** |
| Dette partenaire | 80 − 0,8×65 = 28 | **80 − 0,8×90 = 8** |
| Marge | 20 − 0,2×65 = 7 | **20 − 0,2×90 = 2** |
| Contrôle | 28 + 7 = 35 ✓ | **8 + 2 = 10 ✓** |

### 2.2 Trésorerie / solde de règlement (R03)

| Flux | Montant |
|---|---|
| Capture C | +100 |
| Versement P | −50 |
| Remboursement R1 | −25 |
| **Remboursement R2** | **−25** |
| Litige perdu D | −40 |
| **Solde final** | **−40** |

Le dossier de base donnait **−15** ; la variante aggrave le découvert à **−40 CAD**. Le PSP réclame donc **40** à Relais (au lieu de 15). Le solde négatif n'est **pas** masqué (contrairement à P04).

### 2.3 Ce qui ne change PAS

- **Q4 / R06** : le versement maximal sûr reste **0** sans réserve et **30** avec la réserve P05. R06 borne le pire cas par « la totalité des 100 capturés », indépendamment du nombre de remboursements. La variante ne modifie donc pas cette borne.
- **P02 (ordre de réception)** : inchangé ; R2 s'ajoute comme une opération supplémentaire à réconcilier, avec sa propre identité.
- **P06 (WON v2 contradictoire)** : inchangé — toujours un conflit à trancher par l'autorité, sans inventer sa réponse.

---

## 3. Écritures de la variante (Q2 adaptée)

| # | Débit | Crédit | Montant |
|---|---|---|---|
| C | Créance PSP | Marge (20) + Dette partenaire (80) | 100 |
| P | Dette partenaire | Compte de règlement | 50 |
| R1 | Dette partenaire (20) + Marge (5) | Compte de règlement | 25 |
| **R2** | **Dette partenaire (20) + Marge (5)** | **Compte de règlement** | **25** |
| D | Dette partenaire (32) + Marge (8) | Compte de règlement | 40 |

**Bilan final (variante)** : créance PSP **10** ; dette partenaire **8** ; marge **2** ; solde de règlement **−40**. Équilibre vérifié : 8 + 2 = 10, et le solde négatif est **conservé tel quel** (pas de `max(·,0)`).

---

## 4. Réfutation de P03 et P04 dans ce contexte

- **P03** (dédup par enveloppe + « argent distribuable = marge positive ») : il posterait une écriture par enveloppe inédite — donc **double compterait** les redélivrances de C et D, et **ne saurait pas** distinguer R1 de R2 (même montant). Il afficherait une marge positive (2) comme « distribuable » alors que la trésorerie est à **−40** : la marge comptable n'est **pas** de la liquidité.
- **P04** (`max(solde,0)` + ajout d'une autorisation non capturée et d'une simulation USD) : masquerait le **−40** en **0**, et mélangerait des flux non réalisés (R07 : une autorisation non capturée n'est pas une rentrée ; une simulation USD ne compense pas un solde CAD).

---

## 5. Traitement de R2 dans le pipeline (Q5 adaptée)

1. **Inbox** : persister chaque enveloppe (id d'enveloppe, signature, payload) **avant** accusé de réception (R05).
2. **Clé d'idempotence** : `(operation_id, version, empreinte)`. R1 et R2 ont des `operation_id` distincts ⇒ **deux entrées**, deux effets.
3. **Réduction d'état** : appliquer R1 puis R2 (ordre économique), chacun réduisant dette/marge de 80/20.
4. **Journal** : une écriture par opération appliquée, atomique avec le marquage « appliqué ».
5. **Réconciliation** : si une notification arrive sans `operation_id` exploitable, la mettre **en attente** et interroger l'autorité — ne jamais fusionner deux opérations sur la seule base du montant.

---

## 6. Tests (Q6 adaptés à la variante)

- **Permutation** : toutes les permutations de {C, P, R1, R2, D} doivent donner le **même état final** (dette 8, marge 2, créance 10, solde −40).
- **Duplication** : redélivrer R1 (même `operation_id`) ⇒ **aucun** effet supplémentaire ; redélivrer R2 ⇒ idem. En revanche, R1 **et** R2 (identités distinctes) ⇒ **deux** effets. C'est le test discriminant qui prouve que la dédup se fait sur l'identité, pas sur le montant.
- **Branche utile** : autoriser les versements **uniquement** dans la limite du solde de règlement **réel** (jamais la marge comptable), avec un plafond R06 ; ne pas bloquer toute activité — un versement sûr (≤ 0 sans réserve, ≤ 30 avec réserve) reste possible.

---

## Synthèse

| Question | Réponse |
|---|---|
| **Dédupliquer R2 avec R1 ?** | **Non** — identités distinctes, même montant. |
| Clé d'idempotence | `(operation_id, version, empreinte)` — jamais le montant ni l'enveloppe. |
| Solde de règlement (variante) | **−40 CAD** (base : −15). |
| Dette partenaire / marge / créance PSP | **8 / 2 / 10** (base : 28 / 7 / 35). |
| Versement max sûr (R06) | **0** sans réserve ; **30** avec réserve P05 (inchangé). |

**Le point clé** : la variante teste précisément la robustesse de la clé d'idempotence. Un système qui déduplique par montant fusionnerait R1 et R2, sous-estimerait la dette de 20 et la marge de 5, et afficherait un solde de règlement erroné (−15 au lieu de −40) — masquant 25 CAD de sortie réelle. La bonne conception déduplique **l'identité d'opération**, pas la valeur.
# RÉPONSE FINALE — Variante « R2 distinct de R1 »

## 1. Verdict sur la question posée

**Faut-il dédupliquer R2 avec R1 ? → NON.**

R2 est une opération économique **réellement distincte** de R1 (identité d'opération différente), simplement de **même montant** (25). La déduplication doit porter sur l'**identité d'opération** `(operation_id, version, empreinte)`, jamais sur le montant ni sur l'enveloppe de transport (R02, R04). Dédupliquer par montant fusionnerait deux effets légitimes et **sous-estimerait la dette réelle de Relais de 25 CAD**.

---

## 2. Résultats exacts (certifiés)

### 2.1 Répartition R01 (80 % partenaire / 20 % marge)

Réductions cumulées : R1 (25) + R2 (25) + D (40) = **90** ≤ 100, non chevauchantes.

| Position | Dossier de base (R1+D = 65) | **Variante (R1+R2+D = 90)** |
|---|---|---|
| Créance sur PSP | 100 − 65 = **35** | 100 − 90 = **10** |
| Dette partenaire | 80 − 0,8×65 = **28** | 80 − 0,8×90 = **8** |
| Marge | 20 − 0,2×65 = **7** | 20 − 0,2×90 = **2** |
| Contrôle d'équilibre | 28 + 7 = 35 ✓ | **8 + 2 = 10 ✓** |

### 2.2 Trésorerie / solde de règlement (R03)

| Flux | Montant |
|---|---|
| Capture C | +100 |
| Versement P | −50 |
| Remboursement R1 | −25 |
| **Remboursement R2** | **−25** |
| Litige perdu D | −40 |
| **Solde final** | **−40 CAD** |

Base : **−15 CAD**. La variante aggrave le découvert à **−40** ; le PSP réclame **40** à Relais. Le solde négatif est **conservé** (pas de `max(·,0)`).

### 2.3 Versement maximal sûr sous R06 (inchangé par la variante)

R06 borne le pire cas par « la totalité des 100 capturés », indépendamment du nombre de remboursements.

- **Sans réserve** : solde après capture = 100 ; reprises ≤ 100 ⇒ 100 − P − 100 ≥ 0 ⇒ **P ≤ 0**.
- **Avec réserve P05 (30)** : solde après capture = 130 ⇒ 130 − P − 100 ≥ 0 ⇒ **P ≤ 30**.

Le versement effectif de 50 **viole R06** dans les deux cas (déjà vrai dans le dossier de base).

---

## 3. Certificats (ledger)

| # | Affirmation | Valeur | Méthode | Preuve |
|---|---|---|---|---|
| 1 | Solde de règlement variante | **−40** | arithmétique | `100−50−25−25−40 = −40` ; base `−15` |
| 2 | Dette / marge / créance | **8 / 2 / 10** | répartition R01 | `80−0,8×90=8` ; `20−0,2×90=2` ; `100−90=10` ; `8+2=10` |
| 3 | Versement max sûr R06 | **0 ; 30** | pire cas | `100−P−100≥0` ; `130−P−100≥0` |
| 4 | Non-déduplication R2/R1 | **oui** | R02/R04 | identités distinctes, même montant |

Tous les calculs ont été vérifiés par outil déterministe (`calculate`) et enregistrés avec méthode + preuve. Aucune valeur n'est supportée par une seule méthode sans contrôle croisé.

---

## 4. Écritures de la variante

| # | Débit | Crédit | Montant |
|---|---|---|---|
| C | Créance PSP | Marge (20) + Dette partenaire (80) | 100 |
| P | Dette partenaire | Compte de règlement | 50 |
| R1 | Dette partenaire (20) + Marge (5) | Compte de règlement | 25 |
| **R2** | **Dette partenaire (20) + Marge (5)** | **Compte de règlement** | **25** |
| D | Dette partenaire (32) + Marge (8) | Compte de règlement | 40 |

**Bilan final** : créance PSP **10** ; dette partenaire **8** ; marge **2** ; solde de règlement **−40**. Équilibre : 8 + 2 = 10.

---

## 5. Pièges (checklist adversariale)

1. **Dédup par montant** — fusionner R1 et R2 (25 = 25) : erreur centrale de la variante. Sous-estime dette (−20) et marge (−5), affiche −15 au lieu de −40.
2. **Dédup par enveloppe** — P03 poste une écriture par enveloppe inédite : double compte les redélivrances de C et D (P02).
3. **Marge ≠ liquidité** — P03 traite la marge comptable positive (2) comme « argent distribuable » alors que la trésorerie est à −40.
4. **Masquage du négatif** — P04 (`max(solde,0)`) transforme −40 en 0 ; ajoute une autorisation non capturée (200) et une simulation USD (15) : flux non réalisés (R07).
5. **Signature ≠ autorité économique** — une signature prouve l'**authenticité du transport**, pas la validité économique ni l'unicité de l'opération (P06 : WON v2 signé mais contradictoire).
6. **Ordre d'arrivée ≠ ordre économique** — P02 livre D LOST avant C ; l'état final doit être reconstruit par identité/version, pas par ordre de réception.
7. **OPEN après LOST** — une notification OPEN v1 reçue après LOST v2 ne rouvre pas le litige (R04).
8. **Absence de notification ≠ clôture** — pas de délai maximal ni de certificat de clôture (R06) : le silence ne prouve pas la fin du risque.
9. **Créance partenaire non garantie** — un solde négatif du partenaire est une créance de Relais, dont la récupération n'est pas garantie (R03).
10. **Conflit de version** — deux contenus incompatibles au même numéro de version = conflit nécessitant l'autorité ; l'ordre d'arrivée ne tranche pas (R04, P06).

---

## 6. Traitement de R2 dans le pipeline (Q5)

1. **Inbox** : persister chaque enveloppe (id, signature, payload) **avant** accusé (R05).
2. **Clé d'idempotence** : `(operation_id, version, empreinte)`. R1 et R2 ont des `operation_id` distincts ⇒ **deux entrées, deux effets**.
3. **Réduction d'état** : appliquer R1 puis R2 (ordre économique), chacun réduisant dette/marge de 80/20.
4. **Journal** : une écriture par opération appliquée, atomique avec le marquage « appliqué ».
5. **Réconciliation** : notification sans `operation_id` exploitable ⇒ **mise en attente** + interrogation de l'autorité ; jamais de fusion sur la seule base du montant.
6. **P06** : WON v2 signé mais contradictoire ⇒ conflit signalé, **réponse de l'autorité non inventée**, opération gelée en attente.

---

## 7. Tests (Q6)

- **Permutation** : toutes les permutations de {C, P, R1, R2, D} ⇒ même état final (dette 8, marge 2, créance 10, solde −40).
- **Duplication** : redélivrer R1 (même `operation_id`) ⇒ **aucun** effet ; redélivrer R2 ⇒ idem. R1 **et** R2 (identités distinctes) ⇒ **deux** effets. **Test discriminant** prouvant que la dédup se fait sur l'identité, pas sur le montant.
- **Branche utile** : autoriser les versements **uniquement** dans la limite du solde de règlement **réel** (jamais la marge comptable), avec plafond R06 ; ne pas bloquer toute activité — un versement sûr (≤ 0 sans réserve, ≤ 30 avec réserve) reste possible.

---

## 8. Limites

- **Conventions fictives** : R01–R07 sont données ; aucun traitement comptable, fiscal ou réglementaire réel n'est visé.
- **Montants exacts en CAD** : aucun impôt, frais ni conversion ; la simulation USD de P04 est hors périmètre (R07).
- **Réserve P05** : analyse séparée, **non mélangée** au bilan de P01 (elle ne sert qu'à la borne R06).
- **P06** : la réponse de l'autorité n'est pas fournie ; le conflit reste **ouvert** par construction.
- **R06** : borne de pire cas (totalité des 100) ; en l'absence de délai maximal ou de certificat de clôture, aucune preuve de fin de risque n'est disponible.

---

## Synthèse finale

| Question | Réponse |
|---|---|
| **Dédupliquer R2 avec R1 ?** | **Non** — identités distinctes, même montant. |
| Clé d'idempotence | `(operation_id, version, empreinte)` — jamais le montant ni l'enveloppe. |
| Solde de règlement (variante) | **−40 CAD** (base : −15). |
| Dette partenaire / marge / créance PSP | **8 / 2 / 10** (base : 28 / 7 / 35). |
| Versement max sûr (R06) | **0** sans réserve ; **30** avec réserve P05 (inchangé). |

**Point clé** : la variante teste la robustesse de la clé d'idempotence. Un système dédupliquant par montant fusionnerait R1 et R2, sous-estimerait la dette de 20 et la marge de 5, et afficherait −15 au lieu de −40 — masquant 25 CAD de sortie réelle. La bonne conception déduplique **l'identité d'opération**, pas la valeur.