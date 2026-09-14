# SIII-08-V2 — SIII-08 → Révocation toujours connue

Score: 100.0 % (certificats 0/0, juge 100/100)

Certificats manqués: aucun

Tous les certificats sont en place. Je rédige la réponse finale.

---

# Réponse — Variante « R ∈ {T,F} » : le mutant NULL de P02 diffère-t-il encore de la référence ?

## Réponse directe

**Non. Sous la restriction R ∈ {T,F}, le mutant NULL de P02 devient strictement équivalent à la référence R03 : zéro divergence sur les 162 combinaisons du domaine restreint.**

Le bug de P02 — autoriser un dossier dont la révocation est *inconnue* — **disparaît entièrement** dès que R n'est plus ternaire. C'est un résultat net, mais il faut en comprendre la raison exacte, car elle est plus subtile que « le mutant redevient correct ».

## Preuves et certificats

### 1. Le domaine et les deux fonctions

- **Référence R03** : `M AND P AND NOT R AND (C OR E)`, autorise ssi le résultat final vaut **T** (Kleene : NOT échange T/F, laisse U ; AND : F domine sinon U domine T ; OR : T domine sinon U domine F).
- **Mutant P02** : `M IS TRUE AND P IS TRUE AND NOT COALESCE(R,FALSE) AND (C IS TRUE OR E IS TRUE)`.

Domaine de base : 3⁵ = **243** combinaisons. Domaine variante : 2 · 3⁴ = **162** combinaisons (R ∈ {T,F}, M,P,C,E ternaires).

### 2. Résultat de l'énumération exhaustive

| Domaine | Combinaisons | Divergences P02 vs R03 | Nature |
|---|---|---|---|
| Base (R ternaire) | 243 | **5** | toutes R=U, toutes **autorisations à tort** |
| Variante (R∈{T,F}) | 162 | **0** | équivalence stricte |

Les 5 divergences de base sont exactement :
`(M,P,R,C,E) = (T,T,U,T,T), (T,T,U,T,F), (T,T,U,T,U), (T,T,U,F,T), (T,T,U,U,T)` — dans chaque cas `ref=F` mais `mutant=T`.

### 3. Pourquoi l'équivalence est exacte (preuve, pas seulement test)

Deux faits algébriques se composent :

**(a) `COALESCE(R,FALSE) = R` dès que R ∈ {T,F}.** COALESCE ne remplace que NULL/U. Si R ne prend jamais la valeur U, le terme `NOT COALESCE(R,FALSE)` se réduit à `NOT R`, identique à la référence. C'est **la seule source du bug** : j'ai vérifié que le mutant *privé* de COALESCE (gardant `IS TRUE` sur M,P,C,E) est déjà équivalent à la référence sur **tout** le domaine ternaire (0 divergence sur 243). Autrement dit, `COALESCE(R,FALSE)` est le seul écart de P02, et il est neutralisé par la restriction.

**(b) `IS TRUE` sur M,P,C,E ne change rien *dans cette formule*.** La référence n'autorise que si `M AND P AND NOT R AND (C OR E) = T`, ce qui exige déjà M=T, P=T, R=F et (C=T ou E=T). Or `X IS TRUE` vaut T exactement quand X=T. Donc `M IS TRUE ≡ (M=T)`, `P IS TRUE ≡ (P=T)`, `C IS TRUE OR E IS TRUE ≡ (C=T ∨ E=T)` — mêmes conditions que celles imposées par la référence. Vérifié : 0 divergence sur 243.

En combinant (a) et (b), sur R ∈ {T,F} :
`P02 ≡ (M=T ∧ P=T ∧ R=F ∧ (C=T ∨ E=T)) ≡ R03`.

### 4. Portée exacte de ce contrôle fini

Le contrôle sur 162 combinaisons est **exhaustif pour le domaine déclaré** : il couvre *toutes* les valuations possibles de M,P,C,E (ternaires) et de R (binaire). Ce n'est donc pas un échantillon mais une preuve par cas complète — l'équivalence est établie, pas seulement testée. La preuve algébrique (a)+(b) la confirme indépendamment.

## Pièges traités

- **Confondre « le mutant est réparé » et « le mutant est correct ».** Le mutant P02 reste **faux en général** : il n'est correct *que* sous l'hypothèse R ∈ {T,F}. La restriction est une **hypothèse d'entrée**, pas une correction du code. Si la preuve fiable de restriction tombe (R redevient U), les 5 autorisations à tort réapparaissent immédiatement.
- **La restriction doit être prouvée, pas supposée.** L'énoncé l'exige explicitement (« avec preuve fiable de cette restriction »). Sans cette preuve, on ne peut pas invoquer l'équivalence : c'est précisément le point où P05 (révisions croisées) est dangereux — une signature e7 disant R=F et une valeur courante R=T montrent que R peut être *inconnu ou périmé*. La restriction R∈{T,F} n'est valide que si le système garantit que R est **toujours** connu et frais au moment de la décision.
- **Ne pas étendre l'équivalence aux autres mutants.** P03 (`((M AND P AND NOT R AND C) OR E) IS TRUE`) reste faux même sous R∈{T,F} : son erreur est une **mauvaise parenthésation** (E sort du AND), indépendante de la valeur de R. La restriction ne le répare pas.
- **Valeur logique ≠ effet de bord.** Même quand P02 ≡ R03 en *valeur*, cela ne dit rien de la *trace* (P04) : l'équivalence booléenne ne prouve pas l'équivalence d'exécution. Ici la question porte sur la valeur d'autorisation, donc l'équivalence tient ; mais elle ne s'étend pas à la consommation de jeton.

## Limites / impossibilités

1. **L'équivalence est conditionnelle à la restriction.** Elle vaut *si et seulement si* R ∈ {T,F} est garanti à chaque évaluation. Toute réintroduction de U sur R (fait manquant, révision mixée, révocation non encore propagée) rouvre les 5 autorisations à tort. La restriction doit donc être **imposée par le schéma** (colonne R NOT NULL + contrainte de domaine + fraîcheur vérifiée), pas seulement espérée.

2. **Le mutant reste un mauvais patron de compilation.** Même équivalent ici, `COALESCE(R,FALSE)` encode une sémantique « U = F » qui est *fausse* en logique à trois valeurs (R01 : « U ne signifie pas faux dans le monde »). Il ne faut pas le conserver sous prétexte qu'il passe les tests : il est correct par accident de domaine, pas par construction. La traduction correcte reste `R IS FALSE` (ou `NOT R` avec R non-null), qui est équivalente à la référence **sur tout le domaine**, y compris R=U.

3. **Ce que la variante ne résout pas.** Elle ne traite ni P03 (parenthèses), ni P04 (effet d'urgence), ni P05/P06/P07 (fraîcheur, concurrence, rejeu). Elle ne fait que neutraliser le seul défaut de P02, et uniquement parce que ce défaut était localisé sur R.

**En une phrase :** oui, le mutant NULL de P02 diffère encore de la référence *en général* (5 autorisations à tort, toutes sur R=U), mais **non** sous la restriction prouvée R ∈ {T,F}, où il coïncide exactement avec R03 sur les 162 combinaisons — parce que `COALESCE(R,FALSE)` y devient l'identité et que les `IS TRUE` n'ajoutent aucune contrainte dans cette formule.