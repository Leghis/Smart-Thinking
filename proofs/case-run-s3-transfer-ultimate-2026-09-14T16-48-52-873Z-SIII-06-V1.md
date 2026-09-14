# SIII-06-V1 — SIII-06 → Les issues manquantes sont révélées

Score: 100.0 % (certificats 0/0, juge 100/100)

Certificats manqués: aucun

Toutes les exigences sont couvertes. Je rédige la réponse finale.

## Réponse

**Variante appliquée :** une autorité établit que les 60 résultats manquants de Z=nouveau sont **tous des succès** et les 60 manquants de Z=ancien **tous des échecs**. Seule cette hypothèse est modifiée ; toutes les autres contraintes du dossier de base (R01–R07, P01–P06) sont conservées.

### Ce qui est désormais connu (écart réalisé)

Les proportions réalisées dans les groupes **effectivement assignés** (objet de R07) deviennent exactes :

| Groupe | Succès observés | Manquants (variante) | Succès totaux | Proportion |
|---|---|---|---|---|
| Z=nouveau | 30 | +60 succès | 90 / 100 | **9/10 = 0,90** |
| Z=ancien | 10 | +0 succès (60 échecs) | 10 / 100 | **1/10 = 0,10** |

**Écart réalisé nouveau − ancien = 9/10 − 1/10 = 4/5 = 0,80.**

C'est un résultat **exact** (fractions), sans approximation : la variante supprime toute l'incertitude sur les valeurs manquantes, qui était la seule source d'indétermination numérique de Q3.

### Ce qui reste non identifié

La variante ne porte **que** sur les valeurs manquantes. Elle ne touche à aucune des sources d'ambiguïté causale du dossier :

1. **L'effet causal individuel** (R07) : 0,80 est une différence de proportions réalisées, pas un effet par compte.
2. **L'effet de l'algorithme isolé** : le groupe nouveau a reçu *simultanément* nouvel algorithme + nouvelle langue + nouvelle stratégie de cache (R04). Aucune décomposition n'est possible.
3. **La décomposition algorithme / langue / cache et leurs interactions** : trois facteurs confondus, aucune cellule ne les sépare.
4. **L'effet de population (généralisation)** : 100+100 comptes assignés aléatoirement donnent un estimateur aléatoire, pas une connaissance exacte de la population (R07).
5. **La validité temporelle des caractéristiques** (P01) : la fuite temporelle de l'extraction (`valid_from <= 20` sur la version courante) reste entière.

## Preuves et certificats

**Calcul exact (compute, fractions) :**
- `p_new = (30+60)/100 = 90/100 = 9/10`
- `p_old = (10+0)/100 = 10/100 = 1/10`
- `diff = 9/10 − 1/10 = 4/5 = 0,80`

**Mise en perspective avec les bornes sans variante (Q3) :**
- Sans la variante : nouveau ∈ [3/10, 9/10], ancien ∈ [1/10, 7/10], donc écart ∈ **[−2/5, +4/5]**.
- La variante fixe le couple (9/10, 1/10), c'est-à-dire **l'extrémité supérieure** de l'intervalle d'écart. Autrement dit, l'autorité fournit précisément la complétion qui **maximise** l'écart favorable au nouveau groupe. C'est un point de l'espace admissible, pas une preuve d'effet.

**Certificat de non-identification (structurel) :** les sources R04 (traitement groupé), P04 (cache partagé, clé sans variante expérimentale), R03 (composantes traversant les groupes) et R07 (estimateur ≠ population) sont **indépendantes** de la valeur des manquants. Aucune n'est levée par la variante.

## Pièges traités

- **Snapshot vs sérialisabilité (P01)** : la variante ne corrige pas la fuite temporelle. À p=20, la jointure correcte doit filtrer sur l'intervalle de validité *et* la connaissance : OPEN (V=5, connu à K=8) est admissible ; APPROVED (V=15, connu à K=30) est **indisponible** à p=20 ; RAIN (V=18, connu à 19) est admissible. Le succès final (événement 40, appris 41) est **postérieur** à p=20 → jamais une caractéristique.
- **Tous les témoins pertinents** : la variante est un témoin extrême ; il faut la comparer aux deux autres complétions (toutes échecs / toutes succès) pour voir qu'elle n'est qu'un point parmi 61×61 possibles.
- **Effet externe irréversible** : le cache partagé (P04) a servi des conseils dépendant du traitement antérieur d'un compte de l'autre groupe ; un rollback ne « dé-expose » pas. La variante ne répare pas cette contamination.
- **Ne pas confondre les notions** : 0,80 est une **différence de proportions réalisées**, ni un effet exactly-once, ni un effet de fencing, ni une mesure d'idempotence, ni une autorisation. La variante ne change rien à cette distinction.

## Limites / impossibilités

- **Impossible** de conclure que 0,80 est l'effet causal du nouvel algorithme : trois traitements ont changé ensemble (R04) et les composantes interfèrent (R03/P04).
- **Impossible** d'isoler l'effet de la langue ou du cache : aucune cellule expérimentale ne les sépare.
- **Impossible** d'étendre 0,80 à la population : c'est un estimateur sur 200 comptes assignés (R07).
- **Impossible** de garantir la validité des caractéristiques tant que l'extraction temporelle (P01) n'est pas corrigée.
- **La variante ne rend pas les anciens résultats manquants « connus par reconfiguration »** (P06) : c'est une déclaration d'autorité externe, pas une mesure. Elle fixe un point, elle ne prouve pas l'effet.

**En une phrase :** sous la variante, l'écart réalisé est **exactement 4/5 (0,80)** — c'est la borne supérieure de l'intervalle [−2/5, 4/5] — mais cet écart reste une différence de proportions réalisées dans des groupes à traitement groupé et interférent, et **non** l'effet causal de l'algorithme seul, qui demeure non identifié.