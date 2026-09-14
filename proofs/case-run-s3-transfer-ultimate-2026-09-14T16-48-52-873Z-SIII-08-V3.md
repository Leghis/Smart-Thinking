# SIII-08-V3 — SIII-08 → Observation d’urgence pure

Score: 100.0 % (certificats 0/0, juge 100/100)

Certificats manqués: aucun

Tout est cohérent. Le cas C=U, E=T, M=T, P=T, R=F autorise (via urgence) et exige la consommation — conforme à R04a (« C n'est pas T »). Rédigeons la réponse finale.

## Réponse

**Question posée :** dans la variante où `consumeEmergencyToken()` est remplacé par une **consultation pure sans consommation**, et où la décision finale conserve la **préférence ORDINAIRE** quand C=T, le seul échange des deux observations dans le `OR` viole-t-il encore R04 ?

**Réponse : NON — l'échange ne viole plus R04**, sous deux conditions explicites. La violation de R04 dans le dossier de base (P04) était **entièrement portée par l'effet de bord** (la consommation du jeton), pas par l'ordre d'évaluation. En supprimant l'effet, on supprime la violation.

Résultats exacts (énumération exhaustive des 3⁵ = 243 combinaisons) :

| Quantité | Valeur exacte |
|---|---|
| Écart de **valeur** entre les deux ordres de `OR` | **0 / 243** |
| Écart de **décision** (autorise = T) entre les deux ordres | **0 / 243** |
| Consommations indues quand C=T (violations R04b) | **0 / 243** |
| Cas où C=T et la **trace de lecture** diffère (E lu en premier) | **81 / 243** |
| Cas C=T, E=T, accès=T (préférence ordinaire) | **1** : (M,P,R,C,E)=(T,T,F,T,T) |
| Cas C=U, E=T, accès=T (urgence, conso exigée) | **1** : (T,T,F,U,T) |
| Cas C=F, E=T, accès=T (urgence, conso exigée) | **1** : (T,T,F,F,T) |

**Distinction décisive :** R04 porte sur la **consommation** (un effet), pas sur l'**ordre de lecture**. La variante déplace la consommation hors de l'expression (R04 : « la consommation peut être séparée et exécutée atomiquement »). L'échange des observations devient alors une simple permutation d'opérations **pures**, et la commutativité de `OR` en logique de Kleene garantit l'équivalence.

## Preuves et certificats

**1. Commutativité de `OR` sur {T,F,U}** (certificat exact) : `OR(a,b) = OR(b,a)` pour les 9 paires — vérifié `True`. C'est le fondement algébrique qui rend l'échange licite **au niveau valeur**.

**2. Équivalence de décision** : `dec(·,'C') == dec(·,'E')` sur les 243 combinaisons — `True`. La décision d'autorisation est invariante par échange.

**3. Préférence ordinaire préservée** : pour tout (M,P,R,E), `dec(M,P,R,T,E,'C') == dec(M,P,R,T,E,'E')` — `True`. Quand C=T, la décision **ne dépend pas de E** : l'accès est ordinaire, l'urgence n'est jamais la source de l'autorisation. C'est exactement ce qu'exige R04(b).

**4. Aucune consommation indue** : la consommation est modélisée comme `accès=T ∧ C≠T ∧ E=T`. Sur les 243 cas, **0** vérifie `consommation ∧ C=T`. Le seul cas C=T,E=T,accès=T — (T,T,F,T,T) — ne consomme pas.

**5. Traduction SQL de référence (Q1)** : `(M IS TRUE) AND (P IS TRUE) AND (R IS FALSE) AND ((C IS TRUE) OR (E IS TRUE))` est équivalente en **décision** à l'interpréteur de référence sur 243/243 (0 écart), mais **pas en valeur** : 59 écarts, tous de la forme U→F. C'est le point R02/R07 : la traduction SQL écrase l'inconnu en faux, ce qui est correct pour *autoriser ou non* mais **perd le signal « défaut de preuve »**. Il faut donc, en plus du prédicat booléen, propager un indicateur de complétude (voir Q4).

**6. Mutants (Q2)** :
- **P02** (`NOT COALESCE(R,FALSE)`) autorise à tort **5** combinaisons, toutes avec **R=U** (ex. (T,T,U,F,T), (T,T,U,T,F)) : il traite « révocation inconnue » comme « non révoqué ». Refus à tort : 0.
- **P03** (`((M AND P AND NOT R AND C) OR E) IS TRUE`) autorise à tort **78** combinaisons (ex. (F,F,F,F,T) : E=T suffit à autoriser sans M ni P) : l'urgence devient une porte dérobée. Refus à tort : 0.

**7. P04 (dossier de base)** : l'échange y violait R04(b) **parce que** `consumeEmergencyToken()` était impur : dans le cas (T,T,F,T,T), l'ordre E-first consommait le jeton alors que C=T. La valeur booléenne était identique (T), mais la **trace** différait — illustration exacte de R07 (« l'équivalence booléenne de la valeur ne prouve pas l'équivalence de la trace »).

## Pièges traités

- **Valeur ≠ effet ≠ trace (R07)** : c'est le piège central. L'échange est neutre en valeur (0/243) mais modifie la trace de lecture dans 81 cas (C=T). La variante neutralise l'effet ; elle ne neutralise pas la trace. Si la « consultation pure » journalise un accès d'urgence, la violation réapparaît sous forme de trace.
- **U ≠ F (R01/R02)** : la traduction SQL correcte écrase U en F (59 cas). Acceptable pour la décision, **pas** pour signaler le défaut de preuve. Le mutant P02 exploite précisément cette confusion (5 autorisations indues sur R=U).
- **Préférence ordinaire (R04b)** : vérifiée au niveau décisionnel (indépendance à E quand C=T). Une lecture *stricte* de « préféré » comme contrainte de trace (ne pas lire E du tout) serait violée par l'échange — d'où la condition (i) ci-dessous.
- **C=U compte comme « pas T »** : le cas (T,T,F,U,T) autorise via urgence et **exige** la consommation — conforme à R04a. Ne pas confondre « C inconnu » avec « C=T ».
- **Adversaire / pire cas** : l'énumération couvre les 243 cas, y compris les pires (R=U, C=U, E=T avec M/P faux).

## Limites / impossibilités

1. **La réponse est conditionnelle.** L'échange ne viole plus R04 **si et seulement si** :
   - (i) la consultation de E est **réellement pure** — aucun effet, y compris **aucune journalisation d'un accès d'urgence** ni incrément de compteur ; sinon on retombe dans R07 et la violation réapparaît ;
   - (ii) la **consommation reste séparée** et conditionnée à `C≠T ∧ E=T ∧ accès=T`, exécutée atomiquement avec l'accès (R04/R05).
2. **La trace de lecture n'est pas préservée** : 81 cas où C=T voient E lu en premier. Si une exigence d'audit impose que l'urgence ne soit *jamais consultée* quand le consentement est présent, l'échange est interdit — non par R04 (consommation), mais par une exigence de traçabilité. Le dossier ne tranche pas ce point : **impossibilité de garantir** la conformité à une règle de trace non spécifiée.
3. **Le contrôle fini (243) ne prouve pas la conformité transactionnelle** : il valide la sémantique à trois valeurs sur un état figé. Il ne couvre ni la concurrence (P06), ni la fraîcheur/révisions croisées (P05), ni le rejeu (P07). Ces garanties exigent le point de linéarisation et l'atomicité décrits en Q4/Q5, hors du périmètre de cette variante.
4. **La variante ne répare pas P02/P03** : elle ne concerne que l'ordre dans `OR`. Les mutants de compilation (5 et 78 autorisations indues) restent à corriger indépendamment.

**En une phrase :** l'échange des observations dans `OR` ne viole plus R04 dès lors que la branche d'urgence est pure et que la consommation est séparée — la violation du dossier de base était un artefact d'effet de bord, non un défaut d'ordre ; mais la trace de lecture change (81 cas) et toute impureté résiduelle de la « consultation » réintroduit la violation.