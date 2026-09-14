# SIII-08-V4 — SIII-08 → Permission historique ajoutée

Score: 100.0 % (certificats 0/0, juge 100/100)

Certificats manqués: aucun

Le test formel confirme l'analyse. Je rédige la réponse finale.

---

# Réponse

## Cadrage de la variante

La variante ajoute **une seule hypothèse modifiée** : une exception explicite autorisant la redélivrance du résultat historique après révocation. Toutes les autres contraintes du dossier de base (R01–R07, P01–P07) sont conservées, **y compris R06** qui interdit toute nouvelle divulgation sans droit courant. La question posée est donc une question de **cohérence normative** : ces deux exigences peuvent-elles coexister pour une **projection privée** ?

**Réponse courte : non, pas telles quelles.** Elles ne deviennent compatibles que si l'exception est *bornée par le droit courant* (ou restreinte au statut opaque). Je démontre cela ci-dessous, après avoir recalculé les conclusions affectées (Q1–Q3) et conservé les autres.

---

## Q1 — Interpréteur de référence et traduction SQL

**Interpréteur de référence (R01/R03).** Les cinq faits M, P, R, C, E prennent leurs valeurs dans {T, F, U} avec la logique de Kleene : `NOT` échange T↔F et fixe U ; `AND` : F domine, sinon U domine T ; `OR` : T domine, sinon U domine F. L'autorisation n'est accordée que si le résultat final vaut **exactement T** (U ≠ « faux dans le monde »).

La politique R03 s'écrit :

```
autorise  ⟺  (M AND P AND NOT R AND (C OR E)) IS TRUE
```

**Traduction SQL correcte.** La seule traduction fidèle utilise les tests explicites `IS TRUE` / `IS FALSE` (primitives pures autorisées par R07), et **jamais** `COALESCE` :

```sql
SELECT (M IS TRUE
        AND P IS TRUE
        AND R IS FALSE          -- NOT R IS TRUE  ⟺  R IS FALSE
        AND (C IS TRUE OR E IS TRUE)) AS autorise
FROM faits;
```

Le point critique : `NOT R` en trois valeurs vaut T seulement si R=F. En SQL, `R IS FALSE` capture exactement cela ; `NOT R` (SQL) donnerait NULL pour R=NULL, ce qui n'est pas T et donc n'autorise pas — mais l'écrire `IS FALSE` rend l'intention explicite et évite toute dépendance à la sémantique NULL du moteur.

**Vérification sur les 243 combinaisons.** J'ai énuméré exhaustivement les 3⁵ = 243 affectations de (M,P,R,C,E) et comparé l'interpréteur de référence à la traduction SQL : **équivalence totale, 0 écart**. L'interpréteur de référence autorise exactement **5 combinaisons** : M=T, P=T, R=F, et (C=T ou E=T).

**Portée exacte de ce contrôle fini.** Ce contrôle prouve l'équivalence **sur le domaine fini des valeurs logiques** {T,F,U}⁵, c'est-à-dire qu'aucune des 243 valuations ne distingue les deux expressions. Il **ne prouve pas** :
- l'équivalence des **traces d'effets** (P04) : deux expressions de même valeur peuvent différer par leurs effets de bord ;
- la **fraîcheur** des faits (P05) : la valeur logique ne dit rien sur la cohérence temporelle des révisions ;
- la **concurrence** (P06) ni l'**idempotence** (P07), qui sont des propriétés d'exécution, hors du modèle de valeurs.

C'est un contrôle de correction *dénotationnelle*, pas *opérationnelle*.

---

## Q2 — Contre-exemples et comptage des mutants

**P02 — Mutant NULL.** `M IS TRUE AND P IS TRUE AND NOT COALESCE(R,FALSE) AND (C IS TRUE OR E IS TRUE)`.

`COALESCE(R,FALSE)` transforme U en F, donc `NOT COALESCE(R,FALSE)` devient **T quand R=U**, alors que la référence donne `NOT U = U` (non autorisant). Contre-exemple : **(M,P,R,C,E) = (T,T,U,T,F)** → référence = U (refus), mutant = T (autorisation). Le mutant autorise un dossier **dont la révocation est inconnue** — exactement le défaut annoncé.

**P03 — Mutant de parenthèses.** `((M AND P AND NOT R AND C) OR E) IS TRUE`.

La parenthèse fait que **E=T suffit à autoriser**, court-circuitant M, P et R. Contre-exemple : **(T,T,T,T,T)** → référence = F (R=T interdit), mutant = T. Pire : **(F,F,F,F,T)** → référence = F, mutant = T : l'urgence autorise sans appartenance ni finalité, violant R03 (« l'urgence ne remplace jamais l'appartenance, la finalité ou l'absence établie de révocation »).

**Comptage (par rapport à R03, sur 243 combinaisons) :**

| Mutant | Autorisations | Sur-autorisations | Sous-autorisations |
|---|---|---|---|
| Référence R03 | 5 | — | — |
| **P02** | 10 | **5** | 0 |
| **P03** | 83 | **78** | 0 |

- **P02 sur-autorise 5 combinaisons**, *toutes avec R=U* (le `COALESCE` masque l'incertitude de révocation). Aucune sous-autorisation.
- **P03 sur-autorise 78 combinaisons**, dont **78 avec E=T** (urgence seule) et **27 avec R=T** (révocation établie ignorée). Aucune sous-autorisation.

Les deux mutants sont **strictement plus permissifs** : ils ne refusent jamais à tort, mais autorisent à tort — le pire sens pour une politique de sécurité.

---

## Q3 — P04 : valeur vs exécution

**Le fait.** M=T, P=T, R=F, C=T, E=T. L'interpréteur initial évalue C d'abord (C=T) et **n'appelle pas** la branche d'urgence. L'optimiseur place `consumeEmergencyToken()` en premier : il renvoie T **et consomme le jeton**, puis termine le OR.

**Pourquoi la commutativité de OR est insuffisante.** `OR` est commutatif **sur les valeurs** : `C OR E = E OR C`. Mais `consumeEmergencyToken()` n'est pas une valeur, c'est une **fonction à effet de bord**. Réordonner les branches change la **trace d'exécution** (le jeton est consommé) sans changer la **valeur** (T dans les deux cas). R07 le dit explicitement : « si une primitive produit un effet, l'équivalence booléenne de sa valeur ne prouve pas l'équivalence de sa trace ». De plus R04 impose : quand C=T, l'accès ordinaire **doit être préféré** et **ne doit pas** consommer de jeton, même si E=T. L'optimiseur viole donc R04 tout en préservant la valeur.

**Représentation intermédiaire séparant décision et consommation.** On scinde l'évaluation en deux phases :

```
IR = {
  décision :  pure(M,P,R,C,E) → {AUTORISE, REFUSE, INDÉTERMINÉ}
              -- aucune primitive à effet ; C et E évalués sans consommation
  plan     :  si décision = AUTORISE :
                 si C = T        → mode = ORDINAIRE   (aucun jeton)
                 sinon (E = T)   → mode = URGENCE     (consommer 1 jeton)
              si décision ≠ AUTORISE → mode = AUCUN
  effet    :  exécuté atomiquement avec l'accès (R05), jamais pendant l'évaluation
}
```

La décision est **pure et réordonnable** ; la consommation est **isolée** et déclenchée par le mode, jamais par l'ordre d'évaluation des branches. L'optimiseur peut alors réordonner librement la partie pure sans toucher aux effets.

---

## Q4 — Réparation des vues, du cache et de la concurrence (P05/P06)

**P05 — Révisions croisées.** e7 dit R=F, e8 dit M=T et P=T, mais à e8 la valeur **courante** de R est T. Le frontend combine des signatures d'époques différentes et prétend que « tous les faits nécessaires sont certifiés ». C'est faux : les faits ne portent pas sur la **même vue de politique** (violation de R02). Réparation : chaque fait doit être étiqueté par une **version de vue** (epoch) ; une décision n'est valide que si les cinq faits partagent la même epoch. Un mélange d'epochs vaut **U** *et* est signalé comme **défaut de preuve** (R02). Le frontend ne doit pas agréger des signatures hétérogènes.

**P06 — Concurrence.** C=F, un seul jeton valide (E=T). A et B lisent l'état avant toute consommation et veulent toutes deux un nouvel accès. Les requêtes sont légitimes à soumettre, mais **aucun privilège ne donne le droit de réutiliser le jeton**. Réparation : la consommation doit être un **compare-and-swap atomique** sur le jeton (usage unique, R04/R05). Une seule des deux transactions réussit ; l'autre voit le jeton déjà consommé → E devient F → refus (ou nouvelle évaluation). Le point de linéarisation est **l'écriture atomique qui consomme le jeton** : c'est là que l'accès devient effectif et ordonné.

**Point de linéarisation et politique changeante.** Le point de linéarisation de l'accès est l'instant atomique où (vérification des faits courants + consommation du jeton + enregistrement de l'accès) sont validés ensemble (R05). Si la politique change **pendant** le calcul, la transaction doit détecter le changement d'epoch et **avorter/rejouer** : on ne valide jamais une décision calculée sur une vue périmée. La révocation utilise le même ordre logique.

---

## Q5 — Idempotence, usage unique et révocation (P07)

**Le fait.** A a consommé son jeton ; sa réponse réseau est perdue ; la permission de lecture est ensuite **révoquée** ; le client rejoue A et le cache renvoie **sans contrôle** l'ancienne projection privée.

**Réconciliation.** Trois notions distinctes :
- **Idempotence** : rejouer A ne doit pas consommer un **second** jeton (R05). ✔ préservé.
- **Usage unique** : le jeton de A est consommé une fois pour toutes. ✔ préservé.
- **Révocation** : le droit de **lire** le contenu est réévalué **maintenant**. ✘ violé par le cache.

**Rejouer un statut ≠ divulguer un résultat.** Il faut séparer :
- **Statut opaque** (métadonnée : « opération A : succès », identifiant, horodatage) → consultable après coup selon les **droits de suivi** (R06a). Ce n'est pas une divulgation de contenu privé.
- **Projection privée** (le contenu du résultat) → toute redélivrance est une **nouvelle divulgation** exigeant une **autorisation de lecture courante** (R06b).

Réparation : le cache d'idempotence ne renvoie **que le statut opaque** sans contrôle ; la **projection privée** n'est redélivrée qu'après **revérification du droit courant**. Le cache d'idempotence **n'est pas** une exception générale à la révocation (R06c).

---

## Q6 — Preuve composée, tests, limites

**Preuve composée.** (1) *Dénotation* : équivalence de l'interpréteur et du SQL sur les 243 valuations (Q1, vérifié). (2) *Effets* : séparation décision/consommation (Q3) garantit que la trace respecte R04. (3) *Fraîcheur* : epoch unique par décision (Q4). (4) *Concurrence* : linéarisation par CAS atomique (Q4). (5) *Idempotence/révocation* : statut opaque vs projection privée (Q5). La composition tient parce que chaque couche traite une dimension **orthogonale** (valeur, effet, temps, concurrence, divulgation).

**Tests positifs** : (T,T,F,T,F) → autorise, mode ORDINAIRE, 0 jeton ; (T,T,F,F,T) → autorise, mode URGENCE, 1 jeton ; rejeu de A → statut opaque renvoyé, 0 jeton supplémentaire.

**Tests négatifs** : (T,T,U,T,F) → refus (P02 échoue) ; (T,T,T,T,T) → refus (P03 échoue) ; (F,F,F,F,T) → refus (urgence ne remplace pas M/P/R) ; A et B concurrents → une seule consomme ; rejeu après révocation → projection privée **refusée**.

**Limites de la compilation frontend/backend.** Le frontend ne peut pas certifier la **fraîcheur** (il ne voit que des signatures) ni la **consommation** (effet backend). Il ne doit donc produire que des **prédicats purs** (décision), jamais des décisions d'effet. La compilation ne peut pas, à elle seule, garantir la cohérence temporelle : elle exige un protocole d'epoch et une linéarisation côté backend.

---

## Variante — Les exigences sont-elles compatibles pour une projection privée ?

**Non, pas telles quelles.** Voici la démonstration.

**Le conflit.** R06(b) énonce : *redélivrer une ancienne projection privée est une nouvelle divulgation, qui exige une autorisation de lecture courante*. L'exception ajoutée autorise *la redélivrance du résultat historique après révocation*. Or « après révocation » signifie précisément que le droit courant est **absent**. Si l'exception est **inconditionnelle**, elle autorise une divulgation de projection privée **sans droit courant** — ce que R06 interdit. Contradiction directe.

**Test formel.** Soit D = droit courant présent, H = redélivrance historique demandée. R06 impose `divulgation ⇒ D`. J'ai énuméré les cas :

| Lecture de l'exception | Règle | Violation de R06 ? |
|---|---|---|
| **A — inconditionnelle** : `H ⇒ autorisé` | autorise dès H | **Oui** : cas (D=F, H=T) → divulgation sans droit courant |
| **B — bornée** : `H ∧ D ⇒ autorisé` | exige D | **Non** : aucune violation |

**Conclusion.** Les deux exigences sont **incompatibles** si l'exception est inconditionnelle, et **compatibles** (mais alors redondantes avec R06) si l'exception est **subordonnée au droit courant**. Autrement dit, l'exception ne peut pas créer un droit de contenu ; elle ne peut créer qu'un **droit de suivi** sur le **statut opaque**.

**La seule formulation compatible** distingue explicitement les deux objets :

1. **Statut opaque** (métadonnée d'opération : identifiant, succès/échec, horodatage) → redélivrable après révocation **selon les droits de suivi** (R06a). Ce n'est pas une divulgation de contenu privé.
2. **Projection privée** (contenu du résultat) → **jamais** redélivrable sans **droit courant** ; l'exception ne s'y applique pas.

**Réponse à la question posée.** Pour une **projection privée**, les exigences **ne sont pas compatibles** : l'exception de redélivrance historique, si elle s'applique au contenu privé, contredit R06. Elles ne le deviennent qu'en **restreignant l'exception au statut opaque** ou en la **conditionnant au droit courant** — auquel cas elle n'autorise plus rien que R06 n'autorisait déjà.

---

## Pièges traités

- **Valeur ≠ effet** : la commutativité de OR (P04) préserve la valeur mais pas la trace ; d'où la séparation décision/consommation.
- **U ≠ F** : `COALESCE(R,FALSE)` (P02) et la parenthèse (P03) confondent l'inconnu avec le faux ; 5 et 78 sur-autorisations respectivement.
- **Fraîcheur ≠ valeur** : P05 montre que des faits « tous T » peuvent être périmés ; l'epoch est indispensable.
- **Idempotence ≠ autorisation ≠ usage unique** : P07 les sépare ; le cache ne contourne pas la révocation.
- **Statut ≠ contenu** : la variante ne tient que si l'on ne confond pas métadonnée et projection privée.

## Limites / impossibilités

- Le contrôle fini (243 cas) ne prouve **que** l'équivalence dénotationnelle ; il ne couvre ni effets, ni temps, ni concurrence.
- La compatibilité de la variante **n'est pas démontrable** pour une projection privée : elle est **réfutée** dans la lecture inconditionnelle (témoin D=F, H=T).
- Aucune compilation frontend/backend ne peut garantir seule la fraîcheur : elle requiert un protocole d'epoch et une linéarisation atomique côté backend.