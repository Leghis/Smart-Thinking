# SIII-07-V2 — SIII-07 → Litige encore ouvert

Score: 100.0 % (certificats 0/0, juge 100/100)

Certificats manqués: aucun

Tous les calculs sont confirmés. Je rédige la réponse finale.

---

# Variante — D reste OPEN (40), aucune perte

**Ce qui change par rapport au dossier de base :** une seule hypothèse est retirée — la perte du litige D. Dans le dossier de base, D était **LOST 40** (perte finale, écriture définitive). Ici, la seule information sur D est **OPEN 40**. C, P et R restent confirmés et inchangés. Je conserve donc toutes les autres contraintes (R01–R07, P02–P06) et je recalcule uniquement les conclusions affectées.

---

## 1. Nature de D OPEN : pourquoi elle ne produit aucune écriture

Trois règles convergent :

- **R02** : « Un litige OPEN n'est pas encore une perte finale. » Un litige n'est une opération économique distincte qu'au moment où il devient une **perte** (LOST). OPEN est un état **non terminal**.
- **R04** : « OPEN version 1 peut être suivi de LOST version 2. » OPEN v1 est un état **provisoire** ; seul un état terminal (LOST) déclenche l'effet économique.
- **R01** : la réduction 80 %/20 % est déclenchée par « chaque remboursement **ou litige perdu** ». Un litige OPEN n'est pas « perdu ».

**Conclusion :** D OPEN 40 ne génère **aucune écriture économique**. Il ne réduit ni la dette partenaire, ni la marge, ni le solde de règlement. Il constitue seulement une **exposition conditionnelle** (risque futur), à tracer hors bilan, pas une écriture comptable définitive.

---

## 2. Écritures finales connues (les seules postables)

Rappel du modèle validé sur le dossier de base : le **solde de règlement chez le PSP** porte la créance/dette sur le prestataire de paiement (la capture y crédite 100). Chaque écriture est équilibrée.

### C — Capture 100 (confirmée)
| Compte | Débit | Crédit |
|---|---|---|
| Solde de règlement (PSP) | 100 | |
| Dette envers partenaire | | 80 |
| Marge (résultat) | | 20 |

*Équilibre : 100 = 80 + 20.* ✓

### P — Versement 50 au partenaire (confirmé)
| Compte | Débit | Crédit |
|---|---|---|
| Dette envers partenaire | 50 | |
| Solde de règlement (PSP) | | 50 |

*Équilibre : 50 = 50.* ✓

### R — Remboursement 25 (confirmé)
Répartition R01 : 80 % → dette partenaire = 0,8 × 25 = **20** ; 20 % → marge = 0,2 × 25 = **5**.

| Compte | Débit | Crédit |
|---|---|---|
| Dette envers partenaire | 20 | |
| Marge (résultat) | 5 | |
| Solde de règlement (PSP) | | 25 |

*Équilibre : 20 + 5 = 25.* ✓

### D — Litige OPEN 40
**Aucune écriture.** (Voir §1.)

---

## 3. Bilan final connu (variante)

| Poste | Montant | Nature |
|---|---|---|
| Solde de règlement (PSP) | **+25** | Actif (100 − 50 − 25) |
| Dette envers partenaire | **10** | Passif (80 − 50 − 20) |
| Marge | **15** | Capitaux propres (20 − 5) |

**Vérification de l'équilibre :** Actif − Passif = 25 − 10 = **15** = Marge. ✓

*Calculs confirmés : 100−50−25 = 25 ; 80−50−20 = 10 ; 20−5 = 15 ; 25−10 = 15.*

**Différence avec le dossier de base** (où D LOST 40 donnait : solde règlement −15, créance partenaire 22, marge 7) : ici, **le solde de règlement reste positif (+25)** et la dette partenaire reste **positive (10, dette de Relais envers le partenaire)** au lieu de basculer en créance. C'est le seul effet du retrait de la perte.

---

## 4. Ce que la variante ne prouve pas (et ce qu'il faut refuser)

- **Le solde +25 n'est pas un « argent distribuable ».** Il est **conditionné** par D OPEN 40. Si D devient LOST, l'écriture (dette partenaire −32, marge −8, solde règlement −40) ramènerait le solde à **−15** — exactement le scénario du dossier de base. Le réducteur P03 (« argent distribuable = marge comptable positive ») reste **faux** : il ignore l'exposition D et confond marge et trésorerie disponible.
- **P04 reste faux** : additionner une autorisation non capturée (200 CAD) et une simulation USD (15) au solde, puis masquer par `max(solde, 0)`, ne crée aucune trésorerie (R07). Ici le solde est déjà positif, mais la méthode reste invalide.
- **Une signature de notification** (P06) authentifie le **transport**, pas la **vérité économique** : elle ne transforme pas OPEN en LOST ni en WON, et ne crée aucune opération (R02, R04).

---

## 5. Traitement de D OPEN dans le pipeline (rappel des contraintes conservées)

- **Clé d'idempotence** : `(operation_id, version)` — pas le numéro de livraison (R02). D OPEN v1 est enregistré une seule fois, même reçu plusieurs fois.
- **Dépendances** : D OPEN 40 est conservé **en attente** (R05) ; il ne bloque pas C, P, R.
- **Réconciliation** : si l'autorité renvoie plus tard **LOST v2**, on poste alors l'écriture de perte (dette partenaire −32, marge −8, solde règlement −40). Si elle renvoie **WON v2**, aucune écriture de perte. **La réponse de l'autorité n'étant pas fournie (P06), on ne l'invente pas** : D reste OPEN, exposition tracée, aucune écriture terminale.

---

## Réponse synthétique à la question

**Écritures finales connues postables dans la variante :** uniquement **C (100), P (50) et R (25)** — soit trois écritures équilibrées. **D OPEN 40 ne produit aucune écriture** (état non terminal, R02/R04).

**Bilan final connu :** solde de règlement **+25**, dette partenaire **10**, marge **15** ; équilibre vérifié (25 − 10 = 15). Toute écriture liée à D est **suspendue** jusqu'à un état terminal (LOST/WON) fourni par l'autorité — sans jamais présumer sa réponse.