# SIII-07-V2 — SIII-07 → Litige encore ouvert

Score: 100.0 % (certificats 0/0, juge 100/100)

Certificats manqués: aucun

Les deux méthodes concordent. Je rédige la réponse finale.

## Réponse

**Variante traitée :** on retire toute perte D ; la seule information sur D est `OPEN 40`. C=100, P=50, R=25 restent confirmés. L'ordre économique réel devient **C, P, R** (D n'est plus un fait final).

**Écritures finales connues que l'on peut poster : uniquement C, P et R.** D (OPEN 40) ne donne lieu à **aucune écriture économique définitive** — seulement une exposition conditionnelle hors bilan.

**Bilan final (état connu) :**

| Position | Montant (CAD) |
|---|---|
| Créance sur le prestataire de paiement (compte de règlement) | **25** |
| Dette envers le partenaire | **10** |
| Marge (capitaux propres) | **15** |
| **Équilibre** | 25 = 10 + 15 ✓ |

**Écritures (partie double) :**

| Op. | Débit | Crédit |
|---|---|---|
| **C** (capture 100) | Créance PSP 100 | Dette partenaire 80 ; Marge 20 |
| **P** (versement 50) | Dette partenaire 50 | Créance PSP 50 |
| **R** (remboursement 25) | Dette partenaire 20 ; Marge 5 | Créance PSP 25 |
| **D** (OPEN 40) | — aucune écriture — | — (exposition conditionnelle) |

**Exposition conditionnelle (note, non comptabilisée) :** si D devenait LOST 40, cela réduirait la dette partenaire de 32 et la marge de 8 (proportion 80/20), sans toucher la créance PSP. Ce n'est **pas** une écriture finale connue.

## Preuves et certificats

**Modélisation exacte (R01, fractions).** Capture 100 → créance PSP 100 = dette partenaire 80 + marge 20. Le versement P éteint la dette partenaire à hauteur de 50 (paiement de la dette, pas une réduction proportionnelle). Le remboursement R réduit dette partenaire de 0,8×25 = 20 et marge de 0,2×25 = 5.

Sortie `compute` (méthode 1, soldes séquentiels) :
```
Apres C: 100 80 20 equilibre: True
Apres P: 50 30 20 equilibre: True
Apres R: 25 10 15 equilibre: True
D OPEN 40 -> aucune ecriture definitive
```

**Seconde méthode indépendante (journal en partie double, soldes de comptes) :**
```
CreancePSP 25  DettePart 10  Marge 15
Bilan: actif 25 = passif+CP 25 -> True
Solde reglement PSP 25
```
Les deux méthodes donnent **exactement** les mêmes valeurs (25 / 10 / 15) : aucun écart.

**Certificat d'équilibre.** Actif (créance PSP 25) = Passif (dette partenaire 10) + Capitaux propres (marge 15). L'équilibre est vérifié **sans effacer aucun montant négatif** (aucun n'apparaît ici, mais la méthode ne les masque pas).

**Pourquoi D n'entre pas au bilan.** R02 : « Un litige OPEN n'est pas encore une perte finale. » R04 : OPEN v1 peut précéder LOST v2, mais tant que l'état terminal n'est pas confirmé, aucune perte n'est acquise. Donc D reste une **exposition conditionnelle** (note), pas une écriture.

**Trésorerie (R03).** Le solde de règlement chez le PSP suit la même arithmétique : +100 (capture) − 50 (versement) − 25 (remboursement) = **25**, positif. Aucune reprise de fonds n'est survenue dans cette variante.

## Pièges traités

- **Autorisations avant action** : aucune action externe n'est requise ; analyse en lecture seule, écritures proposées (pas exécutées). ✓
- **Budget de crédits** : aucune action payante non confirmée. ✓
- **Écriture sur la dernière révision / conflits** : D est traité comme état **non terminal** ; on n'écrase pas un éventuel LOST futur. OPEN 40 ne rouvre ni ne clôt rien. ✓
- **Ne rien envoyer / supprimer** : aucune donnée transmise ni effacée ; les montants négatifs ne sont pas masqués. ✓
- **Piège R01 (proportion)** : le versement P n'est **pas** une réduction proportionnelle 80/20 — c'est le paiement de la dette partenaire (50 plein). Seuls remboursement et litige perdu suivent la règle 80/20. Confondre les deux fausserait le bilan. ✓
- **Piège R02 (OPEN ≠ perte)** : ne pas comptabiliser D comme perte. ✓
- **Piège P03/P04 (réducteur et solde affiché)** : le réducteur « dernière notification gagne » et le `max(solde,0)` sont réfutés dans le dossier de base ; ici ils ne doivent pas transformer OPEN 40 en perte ni masquer un solde. ✓
- **Piège P06 (WON v2 contradictoire)** : non fourni dans cette variante ; aucune écriture ne peut en découler sans réponse de l'autorité. ✓

## Limites / impossibilités

- **D reste indéterminé** : on ne peut pas poster d'écriture finale pour D tant que l'autorité n'a pas tranché OPEN vs LOST. Le bilan ci-dessus est l'**état connu**, susceptible d'évoluer si D devient LOST (alors dette partenaire → −22 et marge → 7, créance PSP inchangée à 25).
- **Récupération de la créance partenaire non garantie** : la dette partenaire de 10 (et l'exposition conditionnelle) suppose un partenaire solvable ; R03 rappelle qu'un solde négatif partenaire est une créance dont la récupération n'est pas garantie.
- **Liquidité ≠ équilibre comptable** : l'équilibre 25 = 10 + 15 ne prouve ni la liquidité ni la recouvrabilité (voir Q3 du dossier de base).
- **Aucune conclusion sur P06** : sans réponse de l'autorité de réconciliation, WON v2 ne peut ni créer ni annuler d'écriture.

**En une phrase :** dans cette variante, seules **C, P, R** sont postables ; le bilan connu est **créance PSP 25 / dette partenaire 10 / marge 15** (équilibré), et **D OPEN 40 reste une exposition conditionnelle hors bilan**, sans écriture finale tant que l'autorité n'a pas statué.