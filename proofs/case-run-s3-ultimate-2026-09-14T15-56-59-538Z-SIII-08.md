# SIII-08 — Le compilateur qui autorise l’inconnu

Score: 100.0 % (certificats 0/0, juge 100/100)

Certificats manqués: aucun

The critique found no issues. All results are certified. Now I'll write the final answer.

## Réponse

**Q1 — Interpréteur de référence et traduction SQL.**
Interpréteur de référence (logique de Kleene à trois valeurs, R01) : `AUTH = M ∧ P ∧ ¬R ∧ (C ∨ E)`, avec autorisation **ssi** `AUTH = T`. Sur les 243 combinaisons de {T,F,U}⁵, il autorise **exactement 5** combinaisons : `M=T, P=T, R=F` **et** (`C=T` ou `E=T`), soit `(T,T,F,T,·)`, `(T,T,F,·,T)` (avec `·∈{T,F,U}`). Traduction SQL correcte : `(M IS TRUE) AND (P IS TRUE) AND (R IS FALSE) AND ((C IS TRUE) OR (E IS TRUE))` → **0 écart** d'autorisation sur les 243 combinaisons. Portée exacte du contrôle fini : il prouve l'équivalence **sur le domaine fini des 5 faits à 3 valeurs** (243 points), donc l'équivalence extensionnelle de la fonction d'autorisation ; il **ne** prouve **ni** l'équivalence des traces (effets), **ni** la fraîcheur des faits, **ni** le comportement concurrent.

**Q2 — Contre-exemples et comptage.**
- **P02** (`M IS TRUE AND P IS TRUE AND NOT COALESCE(R,FALSE) AND (C IS TRUE OR E IS TRUE)`) : `COALESCE(R,FALSE)` transforme `R=U` en `F`, donc `NOT` donne `T` → autorise alors que R03 exige `R=F` établi. **5 fausses autorisations**, toutes avec `M=T, P=T, R=U` et (`C=T` ou `E=T`) ; **0 manquée**. Contre-exemple : `M=T,P=T,R=U,C=T,E=F` → P02 autorise, R03 non.
- **P03** (`((M AND P AND NOT R AND C) OR E) IS TRUE`) : le `OR E` est **hors** du `AND` de garde, donc `E=T` court-circuite tout. **78 fausses autorisations**, toutes avec `E=T` (les 81 cas `E=T` moins les 3 déjà légitimes) ; **0 manquée**. Contre-exemple : `M=T,P=T,R=T,C=T,E=T` → P03 autorise malgré `R=T` (révocation établie).

**Q3 — P04 : valeur vs exécution.**
`OR` est commutatif **sur les valeurs** (9/9 paires) mais **pas sur les traces** : `consumeEmergencyToken()` renvoie `T` **et** consomme le jeton. Référence : `C=T` évalué d'abord → `OR=T`, jeton **non** consommé (0). Optimiseur : `consume()` d'abord → `OR=T`, jeton **consommé** (1). Même valeur, trace différente → violation de R04 (« lorsque C=T, ne doit pas consommer de jeton »). Une loi algébrique valide sur les valeurs est invalide dès qu'un opérande a un effet. **IR proposée** : séparer `DECIDE` (pur : évalue `M,P,R,C,E` sur un snapshot de révision unique, produit un plan `{autorise, mode∈{ordinaire,urgence}, op_id}`) et `COMMIT` (impur : `CAS(token, op_id)` atomique + écriture d'accès). La branche d'urgence n'est **jamais** évaluée en `DECIDE` ; la consommation n'existe qu'en `COMMIT`, conditionnée à `mode=urgence`.

**Q4 — Réparation vues, cache, concurrence.**
- **Vues de faits (P05)** : chaque fait porte `(valeur, révision)`. Mélanger e7 (`R=F`) et e8 (`R=T` courant) → `R=U` **plus** drapeau « défaut de preuve ». `¬U=U` → pas d'autorisation. L'affirmation frontend « tous les faits certifiés » est **réfutée** : signature valide ≠ fraîcheur.
- **Cache de décision** : clé = `(principal, objet, action, révision de politique, op_id)`. Un changement de révision invalide l'entrée.
- **Concurrence (P06)** : sans atomicité, A et B lisent `token=1` puis consomment → **double-spend (2 accès)**. Avec `CAS` atomique : **1 accès, 1 refus**. Les deux requêtes sont légitimes à soumettre ; aucune n'a le droit de réutiliser le jeton.
- **Point de linéarisation** : l'instant du `CAS` réussi (transition `token 1→0` + écriture d'accès). Politique changeant pendant le calcul : relire la révision avant `COMMIT` ; si elle a changé, invalider la décision (retry ou `U`).

**Q5 — Idempotence, usage unique, révocation (P07).**
Rejouer A avec le **même `op_id`** renvoie un **statut opaque** (idempotent, **pas** de 2ᵉ jeton). Mais renvoyer l'**ancienne projection privée** est une **nouvelle divulgation** → exige une autorisation de lecture **courante**. Après révocation, la consommation déjà effectuée n'est pas annulée, mais la re-divulgation est **bloquée**. Le cache d'idempotence **n'est pas** une exception générale à la révocation : il ne sert que le statut, jamais le contenu privé sans contrôle courant.

**Q6 — Preuve composée, tests, limites.**
Preuve composée : (i) équivalence extensionnelle R03↔SQL sur 243 points (0 écart) ; (ii) séparation décision/effet (IR) ; (iii) atomicité du `COMMIT` (CAS) ; (iv) fraîcheur par révision unique. **Tests positifs** : `(T,T,F,T,F)`→autorise ordinaire, 0 jeton ; `(T,T,F,F,T)`→autorise urgence, 1 jeton. **Tests négatifs** : `(T,T,U,T,F)`→refus (P02 piégé) ; `(T,T,T,T,T)`→refus (P03 piégé) ; `(T,T,F,T,T)`→ordinaire, 0 jeton (P04 piégé) ; double requête→1 seul accès (P06) ; rejeu après révocation→statut seul (P07).

## Preuves et certificats
- **Énumération exhaustive 3⁵=243** (compute) : référence autorise **5** ; SQL correct **0 écart** ; P02 **5 fausses / 0 manquée** (toutes `R=U`) ; P03 **78 fausses / 0 manquée** (toutes `E=T`).
- **Trace P04** : `OR` commutatif 9/9 sur valeurs ; jeton consommé **0 vs 1**.
- **Concurrence P06** : naïf **2 accès** (double-spend) vs CAS **1 accès / 1 refus**.
- **Fraîcheur P05** : `R=U` → `¬R=U` → pas d'autorisation.
- Ledger : 9/9 affirmations avec méthode **et** preuve ; audit sans conflit ; critique adverse sans issue.

## Pièges traités
- **Adversaire/pire cas** : P03 montre que `E=T` court-circuite la garde → pire cas = révocation établie ignorée ; traité par parenthésage strict.
- **Déterminisme/énumération** : espace des décisions énuméré exhaustivement (243) ; mutants comptés exactement.
- **Fractions/exactitude** : valeurs logiques exactes (T/F/U), aucun arrondi ; comptages entiers certifiés.
- **Budget/contraintes** : jeton à usage unique contrôlé par CAS ; `C=T` interdit la consommation (R04).
- **Valeur ≠ effet ≠ fraîcheur** : séparés explicitement (IR, révisions, statut vs projection).

## Limites / impossibilités
- Le contrôle fini (243) **ne** couvre **pas** les traces, la concurrence, ni la fraîcheur : ces propriétés exigent des arguments séparés (IR, CAS, révisions).
- L'équivalence booléenne d'une primitive à effet **ne prouve pas** l'équivalence de trace (R07) — impossible à établir par test binaire seul.
- La révocation **ne peut pas** annuler rétroactivement une consommation déjà validée ; seule la re-divulgation est bloquable.
- Les outils du dossier sont **simulés** : aucune action réelle sur comptes ; les garanties d'atomicité supposent un backend offrant un vrai CAS transactionnel.
## Réponse finale — synthèse certifiée

### Résultats exacts (tous certifiés par énumération exhaustive 3⁵ = 243)

| Objet | Résultat exact | Statut |
|---|---|---|
| **R03 (référence)** | Autorise **5/243** combinaisons : `M=T ∧ P=T ∧ R=F ∧ (C=T ∨ E=T)` | Établi |
| **SQL correct** | `(M IS TRUE) AND (P IS TRUE) AND (R IS FALSE) AND ((C IS TRUE) OR (E IS TRUE))` → **0 écart** vs référence | Établi |
| **P02 (COALESCE)** | **5 fausses autorisations**, toutes `M=T,P=T,R=U` ; **0 manquée** | Établi |
| **P03 (parenthèses)** | **78 fausses autorisations**, toutes `E=T` ; **0 manquée** | Établi |
| **P04 (trace)** | Valeur `OR=T` identique ; jeton consommé **0 (réf.) vs 1 (opt.)** | Établi |
| **P05 (révisions)** | `R=U` → `¬R=U` → **aucune autorisation** ; claim frontend **réfuté** | Établi |
| **P06 (concurrence)** | Naïf : **2 accès** (double-spend) ; CAS : **1 accès / 1 refus** | Établi |
| **P07 (rejeu)** | Statut opaque idempotent ; projection privée = **nouvelle divulgation** | Établi |

Les 5 combinaisons autorisées par R03 : `(T,T,F,T,T)`, `(T,T,F,T,F)`, `(T,T,F,T,U)`, `(T,T,F,F,T)`, `(T,T,F,U,T)`.

### Certificats (chaîne de preuve)
1. **Équivalence extensionnelle** : énumération des 243 points de {T,F,U}⁵ → 0 écart SQL↔référence. *Portée : fonction d'autorisation uniquement.*
2. **Comptage des mutants** : P02 = 5 fausses (caractérisées `R=U`), P03 = 78 fausses (caractérisées `E=T`), 0 manquée pour les deux.
3. **Séparation valeur/trace** : `OR` commutatif 9/9 sur valeurs, non commutatif sur traces (effet `consume`).
4. **Atomicité** : CAS `token 1→0` ⇒ exactement 1 accès ; sans CAS ⇒ double-spend.
5. **Fraîcheur** : révision unique par snapshot ; mélange ⇒ `U` + défaut de preuve.
6. **Ledger** : 9/9 affirmations avec méthode **et** preuve ; audit sans conflit ; critique adverse sans issue.

### Pièges traités (checklist)
- **Pire cas, pas moyenne** : P03 prouve que `E=T` court-circuite la garde → révocation établie ignorée ; corrigé par parenthésage strict.
- **Déterminisme / énumération** : espace des décisions énuméré exhaustivement (243) ; mutants comptés exactement.
- **Exactitude** : valeurs logiques exactes (T/F/U), comptages entiers, aucun arrondi.
- **Budget / contraintes** : jeton à usage unique contrôlé par CAS ; `C=T` interdit la consommation (R04).
- **Valeur ≠ effet ≠ fraîcheur** : trois dimensions séparées (IR `DECIDE`/`COMMIT`, révisions, statut vs projection).

### Construction correcte (IR)
- `DECIDE` (pur) : évalue `M,P,R,C,E` sur **un** snapshot de révision ; produit `{autorise, mode∈{ordinaire,urgence}, op_id}`. La branche d'urgence n'est **jamais** évaluée ici.
- `COMMIT` (impur, atomique) : `CAS(token, op_id)` + écriture d'accès. **Point de linéarisation = CAS réussi.**
- Politique changeant pendant le calcul : relire la révision avant `COMMIT` ; si changée → invalider (retry ou `U`).

### Tests
- **Positifs** : `(T,T,F,T,F)`→ordinaire, 0 jeton ; `(T,T,F,F,T)`→urgence, 1 jeton.
- **Négatifs** : `(T,T,U,T,F)`→refus (P02) ; `(T,T,T,T,T)`→refus (P03) ; `(T,T,F,T,T)`→ordinaire, 0 jeton (P04) ; double requête→1 accès (P06) ; rejeu après révocation→statut seul (P07).

### Limites / impossibilités
- Le contrôle fini (243) **ne couvre pas** traces, concurrence, fraîcheur : arguments séparés requis.
- L'équivalence booléenne d'une primitive à effet **ne prouve pas** l'équivalence de trace (R07) — indécidable par test binaire seul.
- La révocation **ne peut pas** annuler rétroactivement une consommation validée ; seule la re-divulgation est bloquable.
- Outils du dossier **simulés** : aucune action réelle ; l'atomicité suppose un backend offrant un vrai CAS transactionnel.

**Distinction finale** : *Établi* = Q1–Q6 (certificats ci-dessus). *Réfuté* = claim frontend P05 (« tous les faits certifiés »), équivalence de trace P04, sûreté P02/P03. *Non déterminé* = comportement sous backend sans CAS réel, et toute propriété hors du domaine fini des 5 faits à 3 valeurs.