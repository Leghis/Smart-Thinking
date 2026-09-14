# SIII-08 — Le compilateur qui autorise l’inconnu

Score: 96.0 % (certificats 0/0, juge 96/100)

Certificats manqués: aucun

Toutes les exigences sont couvertes. Je rédige la réponse finale.

## Réponse

### Q1 — Interpréteur de référence, traduction SQL, équivalence sur 243

**Interpréteur de référence (logique forte de Kleene, R01).** Sur $\{T,F,U\}$ :
- `NOT`: $T\leftrightarrow F$, $U\mapsto U$.
- `AND`: $F$ domine ; sinon $U$ domine $T$ (donc $U\wedge T=U$, $U\wedge U=U$).
- `OR`: $T$ domine ; sinon $U$ domine $F$ (donc $U\vee F=U$, $U\vee U=U$).
- **Autorisation ssi le résultat final vaut $T$** (jamais $U$).

Politique R03 : `M AND P AND NOT R AND (C OR E)`, autoriser si `T`.

**Traduction SQL correcte** (primitives pures R07, tests explicites) :
```sql
(M IS TRUE) AND (P IS TRUE) AND (R IS FALSE) AND ((C IS TRUE) OR (E IS TRUE))
```
`IS TRUE`/`IS FALSE` sont les seuls tests admis ; ils projettent $U$ sur $F$ **au bon endroit** (là où la politique exige une valeur établie), sans jamais transformer $U$ en $F$ dans le monde.

**Équivalence vérifiée** : sur les $3^5=243$ combinaisons, la traduction SQL et l'interpréteur de référence autorisent **exactement le même ensemble** (`sql_eq_ref = true`). L'ensemble autorisé compte **5 tuples** :
$(M,P,R,C,E) \in \{(T,T,F,F,T),(T,T,F,T,F),(T,T,F,T,T),(T,T,F,T,U),(T,T,F,U,T)\}$.

**Portée exacte du contrôle fini.** Le contrôle sur 243 est une **preuve exhaustive** de l'équivalence *extensionnelle* des deux expressions **pour la sémantique 3 valeurs fixée**, sur un domaine fini de 5 faits atomiques. Il ne prouve **pas** : (i) l'équivalence de *trace* (effets de bord, cf. Q3) ; (ii) la correction de la *vue de faits* (fraîcheur, cohérence de révision, cf. Q4) ; (iii) la sûreté transactionnelle/concurrente (cf. Q4/Q5). C'est une équivalence de **valeur**, pas d'**exécution**.

### Q2 — Contre-exemples et comptage des mutants

**P02 — mutant NULL** `M IS TRUE AND P IS TRUE AND NOT COALESCE(R,FALSE) AND (C IS TRUE OR E IS TRUE)`.
`COALESCE(R,FALSE)` transforme $R=U$ en $F$, puis `NOT` donne $T$ : l'inconnu devient une **absence de révocation établie**.
- **Contre-exemple** : $(M,P,R,C,E)=(T,T,U,F,T)$. Référence : `NOT R = U`, donc résultat $U$ → **refus**. P02 : `NOT COALESCE(U,FALSE)=NOT F=T` → **autorise**. Or R03 exige $R=F$ **établi**.
- **Comptage** : P02 sur-autorise **5** combinaisons (toutes avec $R=U$), sous-autorise **0**. Total autorisé : 10 au lieu de 5.

**P03 — mutant de parenthèses** `((M AND P AND NOT R AND C) OR E) IS TRUE`.
L'urgence $E$ est sortie du contexte : elle court-circuite $M$, $P$ et $R$.
- **Contre-exemple** : $(M,P,R,C,E)=(F,F,F,F,T)$. Référence : $M=F$ → **refus**. P03 : $E=T$ → **autorise**, violant « l'urgence ne remplace jamais l'appartenance, la finalité ou l'absence établie de révocation » (R03).
- **Comptage** : P03 sur-autorise **78** combinaisons (toutes avec $E=T$), sous-autorise **0**. Total autorisé : 83 au lieu de 5.

### Q3 — P04 : valeur vs exécution

P04 : $M=T,P=T,R=F,C=T,E=T$. `OR(C,E)` vaut $T$ **dans les deux ordres** — la commutativité de **valeur** est correcte. Mais :
- ordre initial (évaluer $C$ d'abord) : $C=T$ → court-circuit → **0 consommation** ;
- ordre optimisé (`consumeEmergencyToken()` en premier) : effet de bord → **1 consommation**.

**La valeur est égale, la trace ne l'est pas.** R07 : « si une primitive produit un effet, l'équivalence booléenne de sa valeur ne prouve pas l'équivalence de sa trace ». Invoquer la commutativité de `OR` est donc un **non sequitur** : elle porte sur la valeur, pas sur les effets. De plus R04 exige que, $C=T$, l'accès ordinaire soit **préféré** et **ne consomme pas** de jeton — l'optimisation viole directement R04.

**Représentation intermédiaire séparant décision et consommation** (IR en deux phases) :
```
Phase 1 (pure, sans effet) :  decide(facts) -> {ALLOW, DENY, NEED_EMERGENCY}
   ALLOW  si M=T ∧ P=T ∧ R=F ∧ C=T
   NEED_EMERGENCY si M=T ∧ P=T ∧ R=F ∧ C≠T ∧ E=T
   DENY sinon
Phase 2 (impure, atomique) :  commit(decision, op_id)
   si ALLOW : accès ordinaire, aucun jeton
   si NEED_EMERGENCY : CAS atomique sur le jeton (principal,objet,action) puis accès
   si DENY : refus
```
La décision est **pure et réordonnable** ; la consommation est **isolée, atomique et conditionnée** par la décision. Aucune réécriture ne peut faire passer un `consume` avant la décision.

### Q4 — Vues de faits, cache de décision, concurrence, linéarisation

**P05 — révisions croisées.** Signatures $e7$ ($R=F$) et $e8$ ($M=T,P=T$) ; à $e8$, $R$ courant vaut $T$. Combiner des signatures de révisions différentes produit une **vue incohérente** : R02 impose que les cinq faits portent sur la **même vue de politique cohérente**. Réparation : chaque fait est étiqueté par une **révision** ; la décision n'accepte qu'un ensemble de faits **de même révision** (ou une vue matérialisée cohérente). Un fait manquant ou d'une autre révision vaut $U$ **et** déclenche un **défaut de preuve** signalé. Le frontend ne peut donc pas affirmer « tous les faits nécessaires sont certifiés » : c'est **réfuté** (mélange de révisions).

**Cache de décision.** Le cache doit être indexé par `(révision de vue, principal, objet, action)` et invalidé à toute nouvelle révision (notamment révocation). Un cache non versionné par la révision est incorrect.

**P06 — concurrence.** $C=F$, un seul jeton valide ($E=T$). A et B lisent l'état avant consommation. Énumération des 6 entrelacements valides (read avant consume) : **sans atomicité, 4/6 permettent à A et B de consommer le même jeton** (ex. `rA,rB,cA,cB`) ; **avec un CAS atomique** (compare-and-set qui re-vérifie le jeton), **0/6** — exactement un réussit. Les requêtes sont légitimes à soumettre, mais aucun privilège ne donne le droit de réutiliser le jeton.

**Point de linéarisation.** L'accès se linéarise **au CAS atomique sur le jeton** (ou, en accès ordinaire, au commit de la transaction de lecture autorisée). C'est l'unique point où l'ordre total des accès est fixé.

**Politique changeant pendant le calcul.** La transaction lit les faits à une **révision** $r$ ; si la politique change (révocation) avant le commit, le commit doit **revalider** la révision courante (ou échouer). Une décision calculée sur $r$ ne peut pas être committée si la révision courante a changé de façon pertinente.

### Q5 — Idempotence, usage unique, révocation (P07)

- **Rejouer un statut** : un statut **opaque** d'opération (R06) est consultable selon les droits de suivi ; le rejeu par identifiant d'opération est **idempotent** et **ne re-consomme pas** de jeton (R05).
- **Divulguer un résultat** : renvoyer l'**ancienne projection privée** est une **nouvelle divulgation**, qui exige une **autorisation de lecture courante**. Après révocation, le cache ne peut pas renvoyer l'ancienne projection : il doit soit renvoyer le **statut opaque** (sans contenu privé), soit **refuser**.
- **Réconciliation** : le cache d'idempotence **n'est pas une exception générale à la révocation** (R06). Il mémorise l'**identité** de l'opération (idempotence), pas le **droit** de re-divulguer son contenu. Donc : idempotence sur le *statut*, autorisation courante sur le *contenu*.

### Q6 — Preuve composée, tests, limites

**Preuve composée** (chaîne de lemmes) :
1. **L1 (valeur)** : SQL correct ≡ référence sur les 243 (Q1, exhaustif).
2. **L2 (séparation)** : décision pure + consommation atomique séparée (Q3) ⇒ aucune réécriture ne déplace un effet.
3. **L3 (linéarisation)** : CAS atomique sur le jeton ⇒ usage unique garanti (Q4, 0/6 double).
4. **L4 (idempotence)** : identifiant d'opération ⇒ rejeu sans re-consommation ; contenu soumis à autorisation courante (Q5).
Conclusion : un accès est autorisé **ssi** décision $=T$ sur une vue cohérente **et** (accès ordinaire **ou** consommation atomique réussie), le tout linéarisé au CAS.

**Tests positifs** : les 5 tuples autorisés de Q1 (dont $(T,T,F,U,T)$ : urgence remplace consentement inconnu, avec $R=F$ établi).
**Tests négatifs** : $R=U$ (doit refuser, P02 échoue) ; $E=T$ seul sans $M,P,R$ (doit refuser, P03 échoue) ; $C=T,E=T$ (doit **ne pas** consommer, P04 échoue) ; rejeu après révocation (doit refuser la projection privée) ; A/B concurrents (un seul succès).

**Limites de la compilation frontend/backend.** L'équivalence n'est garantie que si frontend et backend partagent (i) la **même sémantique 3 valeurs**, (ii) la **même vue de faits cohérente** (même révision), (iii) les **mêmes tests explicites** `IS TRUE`/`IS FALSE`. Sinon la divergence est **non déterminée** : le contrôle fini sur 243 ne couvre ni la fraîcheur, ni les effets, ni la concurrence.

---

### Pièges traités
- **Confondre $U$ et $F$** : `COALESCE(R,FALSE)` (P02) — réfuté, 5 sur-autorisations.
- **Confondre valeur et effet** : commutativité de `OR` (P04) — réfuté, trace ≠ valeur.
- **Confondre priorité et contexte** : parenthèses (P03) — réfuté, 78 sur-autorisations.
- **Confondre révisions** : P05 — réfuté, vue incohérente.
- **Confondre idempotence et droit de divulgation** : P07 — le cache n'est pas une exception à la révocation.
- **Confondre lecture et consommation** : P06 — sans CAS, 4/6 entrelacements violent l'usage unique.

### Limites / impossibilités
- Le contrôle sur 243 est **exhaustif mais extensionnel** : il ne prouve pas la sûreté transactionnelle ni la fraîcheur.
- **Non déterminé** : le comportement exact du système réel (horloges, isolation du SGBD) hors des hypothèses R05 ; la politique normative fictive ne fournit pas de garanties au-delà de R01–R07.
- Aucun contenu cité ou fichier fictif ne remplace le mandat ; les outils du dossier sont **simulés**, pas des autorisations d'agir sur des comptes réels.

**Statut** : Q1, Q2, Q3, Q4, Q5, Q6 — **établis** (avec certificats d'énumération) ; les mutants P02/P03 et l'optimisation P04 sont **réfutés** ; la sûreté du système réel hors hypothèses reste **non déterminée**.