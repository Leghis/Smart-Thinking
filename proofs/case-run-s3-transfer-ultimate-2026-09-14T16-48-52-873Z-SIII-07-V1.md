# SIII-07-V1 — SIII-07 → Versement initial réduit

Score: 84.0 % (certificats 0/0, juge 84/100)

Certificats manqués: aucun

Calculs confirmés par seconde méthode. Voici la réponse.

## Réponse

**Variante appliquée : P = 20 CAD (au lieu de 50).** Toutes les autres données de P01–P06 sont conservées. Ordre économique réel : C (100) → P (20) → R (25) → D (40).

### Bilan réalisé (ex post, après C, P, R, D)

| Poste | Montant (CAD) |
|---|---|
| Solde de règlement chez le PSP | **+15** |
| Dette envers le partenaire | **+8** (Relais doit 8 au partenaire) |
| Marge (capitaux propres) | **+7** |
| Créance sur le PSP (= solde de règlement) | **+15** |

**Équilibre :** Actif 15 = Passif 8 + Capitaux propres 7 → **15 = 15 ✓**

Détail des écritures :
- **C (capture 100)** : créance PSP +100 ; dette partenaire +80 ; marge +20.
- **P (versement 20)** : sortie de trésorerie −20 (solde PSP) ; dette partenaire −20.
- **R (remboursement 25)** : solde PSP −25 ; dette partenaire −0,8×25 = −20 ; marge −0,2×25 = −5.
- **D (litige perdu 40)** : solde PSP −40 ; dette partenaire −0,8×40 = −32 ; marge −0,2×40 = −8.

**Différence clé avec le dossier de base (P=50) :** le solde de règlement passe de **−15** (base) à **+15** (variante). Dans la variante, **le PSP ne réclame rien** : le compte de règlement n'est jamais devenu négatif. La dette partenaire reste **positive (8)** — Relais doit encore de l'argent au partenaire — au lieu d'être une créance (−22) dans le cas de base.

### Garantie prospective (ex ante, R06)

C'est une borne **avant** que les événements futurs ne se réalisent, à l'instant juste après la capture et avant tout versement :

| Scénario | Versement maximal sûr |
|---|---|
| Sans réserve (R06) | **100 CAD** |
| Avec réserve externe de 30 (P05) | **130 CAD** |

Le versement réalisé de **20 ≤ 100** : il est donc **sûr** au regard de R06.

## Preuves et certificats

**Certificat 1 — Bilan réalisé (compute, exact).**
```
solde = 100 − 20 − 25 − 40 = 15
dette = 80 − 20 − 0,8·25 − 0,8·40 = 80 − 20 − 20 − 32 = 8
marge = 20 − 0,2·25 − 0,2·40 = 20 − 5 − 8 = 7
équilibre : 15 = 8 + 7  → True
```
Tous les montants sont entiers : la répartition 80/20 de R01 s'applique sans arrondi (25 et 40 sont divisibles proprement : 0,8·25=20, 0,2·25=5, 0,8·40=32, 0,2·40=8).

**Certificat 2 — Seconde méthode indépendante (compute).** Recalcul en fractions exactes (`Fraction`) pour les deux cas :
```
base P=50 : solde −15, dette −22, marge 7, équilibre True
variante P=20 : solde 15, dette 8, marge 7, équilibre True
```
Aucun écart entre méthode entière et méthode fractionnaire.

**Certificat 3 — Borne prospective R06.** R06 stipule que, juste après capture et avant versement, le contrat autorise des reprises futures **non chevauchantes allant jusqu'à la totalité des 100 capturés**, sans délai maximal ni certificat de clôture. Pour que le solde ne devienne jamais négatif même si le partenaire ne rembourse rien, il faut que le versement V vérifie : `100 − V ≥ 0` → **V ≤ 100**. Avec la réserve P05 (30 disponibles), `100 + 30 − V ≥ 0` → **V ≤ 130**. Le versement réalisé (20) est bien dans l'intervalle sûr.

**Note sur la vérification automatique.** L'outil `verify` a signalé « 22+7 = −15 » comme erreur : c'est un artefact de parsing (il a lu « −22+7 » comme « 22+7 »). Le calcul correct, confirmé par `compute`, est **−22 + 7 = −15** (cas de base uniquement). Aucune incidence sur la variante.

## Pièges traités

- **Autorisations avant action** : aucune écriture externe, aucun envoi, aucune suppression. Analyse en lecture seule + calculs locaux uniquement. ✓
- **Budget de crédits** : aucune action payante non confirmée ; seuls des calculs déterministes locaux ont été exécutés. ✓
- **Écriture sur la dernière révision** : la variante ne modifie **que P=50 → P=20** ; toutes les autres contraintes (R01–R07, P02–P06) sont conservées. ✓
- **Idempotence (R02/R05)** : les livraisons répétées de C et D (P02) ne créent pas de doubles effets ; la clé d'idempotence est (opération, version, empreinte de contenu), pas l'identifiant d'enveloppe. Le bilan réalisé ne compte donc **qu'une fois** chaque opération. ✓
- **Litige OPEN vs LOST (R04)** : D est compté **une seule fois** comme perte (LOST v2), jamais rouvert par la livraison tardive de OPEN v1. ✓
- **Ne pas effacer les montants négatifs (Q2)** : dans la variante, aucun poste n'est négatif, mais la règle est respectée — on n'applique aucun `max(·,0)`. ✓
- **P03/P04 réfutés** : la « marge comptable positive » (7) n'est **pas** de l'argent distribuable (voir Q3) ; le solde bancaire affiché (P04) additionne à tort une autorisation non capturée (200) et une simulation USD (15) — non pertinents ici. ✓
- **P06 (WON v2 contradictoire)** : aucune nouvelle opération économique déclarée ; la réponse de l'autorité n'est pas inventée. ✓

## Limites / impossibilités

- **La garantie prospective n'est pas une garantie de solvabilité du partenaire.** R06 borne le versement sûr *sous l'hypothèse que le partenaire ne rembourse rien* ; elle ne dit rien de la **récupération effective** de la dette partenaire (8 CAD ici). Cette récupération reste non garantie (R03).
- **Le bilan réalisé dépend de l'exhaustivité de P01.** Si un mouvement non déclaré existait, les chiffres changeraient ; P01 garantit qu'il n'y en a pas.
- **La borne 100/130 suppose l'absence de reprises chevauchantes** et l'absence de délai de clôture fourni (R06). Si un certificat de clôture ou un délai maximal existait, la borne pourrait être relevée — mais ces éléments ne sont pas fournis.
- **P06 reste indécidable en l'état** : sans la réponse de l'autorité de réconciliation, on ne peut pas trancher entre LOST v2 et WON v2 ; la seule action correcte est de **mettre en attente** et d'interroger l'autorité, sans inventer de résultat.
- **Aucune conversion USD/CAD** n'est possible (R07) : la simulation de 15 USD ne compense aucun solde CAD.
## Réponse finale (synthèse complète)

### Résultats exacts demandés

**Variante : P = 20 CAD.** Ordre économique C → P → R → D conservé.

**Bilan réalisé (ex post) :**

| Poste | Montant exact (CAD) |
|---|---|
| Solde de règlement chez le PSP | **+15** |
| Dette envers le partenaire | **+8** |
| Marge (capitaux propres) | **+7** |
| Créance sur le PSP | **+15** |

**Équilibre :** 15 = 8 + 7 ✓ (Actif = Passif + Capitaux propres).

**Garantie prospective (ex ante, R06) :** versement maximal sûr = **100 CAD** sans réserve ; **130 CAD** avec la réserve externe de 30 (P05). Le versement réalisé (20) est sûr car 20 ≤ 100.

**Écritures détaillées :**

| Opération | Solde PSP | Dette partenaire | Marge |
|---|---|---|---|
| C (capture 100) | +100 | +80 | +20 |
| P (versement 20) | −20 | −20 | 0 |
| R (remboursement 25) | −25 | −20 (0,8·25) | −5 (0,2·25) |
| D (litige perdu 40) | −40 | −32 (0,8·40) | −8 (0,2·40) |
| **Total** | **+15** | **+8** | **+7** |

### Certificats

1. **Bilan (compute, exact)** : `100−20−25−40 = 15` ; `80−20−0,8·25−0,8·40 = 8` ; `20−0,2·25−0,2·40 = 7` ; équilibre `15 = 8+7 → True`.
2. **Seconde méthode (fractions exactes)** : base P=50 → (−15, −22, 7) ; variante P=20 → (15, 8, 7) ; équilibre True dans les deux cas. Aucun écart.
3. **Borne R06** : `100 − V ≥ 0 → V ≤ 100` ; avec réserve `100 + 30 − V ≥ 0 → V ≤ 130`.
4. **Idempotence** : clé = (opération, version, empreinte de contenu) ; les livraisons répétées de C et D ne comptent qu'une fois.
5. **Litige** : D compté une seule fois (LOST v2), jamais rouvert par OPEN v1 tardif.

### Pièges traités

- Lecture seule + calculs locaux uniquement ; aucun envoi, aucune suppression, aucun crédit dépensé sans confirmation. ✓
- Seule P=50 → P=20 modifiée ; toutes les autres contraintes (R01–R07, P02–P06) conservées. ✓
- Aucun `max(·,0)` appliqué : les montants négatifs ne sont jamais masqués (ici aucun n'est négatif, mais la règle est respectée). ✓
- P03 (marge comptable ≠ argent distribuable) et P04 (autorisation non capturée + simulation USD) réfutés. ✓
- P06 : aucune opération économique inventée ; mise en attente + interrogation de l'autorité. ✓

### Limites / impossibilités

- La garantie prospective borne le versement sûr **sous hypothèse de non-remboursement du partenaire** ; elle ne garantit **pas** la récupération effective de la dette partenaire (8 CAD), non garantie par R03.
- Le bilan dépend de l'exhaustivité de P01 (garantie : aucun autre mouvement).
- La borne 100/130 suppose l'absence de reprises chevauchantes et l'absence de délai/certificat de clôture (R06).
- P06 reste **indécidable** sans la réponse de l'autorité : LOST v2 vs WON v2 ne peut être tranché ; seule la mise en attente est correcte.
- Aucune conversion USD/CAD possible (R07) : la simulation de 15 USD ne compense aucun solde CAD.

**Différence essentielle avec le dossier de base :** avec P=50, le solde de règlement était **−15** (le PSP réclamait 15 à Relais) et la dette partenaire devenait une **créance de −22**. Avec P=20, le solde est **+15** (aucune réclamation du PSP) et Relais **doit encore 8** au partenaire. La marge (7) est identique dans les deux cas, car elle ne dépend que de R et D.