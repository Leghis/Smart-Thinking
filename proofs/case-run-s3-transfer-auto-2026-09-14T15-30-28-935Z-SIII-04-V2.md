# SIII-04-V2 — SIII-04 → Archive séparable

Score: 84.0 % (certificats 0/0, juge 84/100)

Certificats manqués: aucun

# Palimpseste — Variante XA/XB : réponse complète

**Hypothèse modifiée (seule) :** P05. Le bloc mixte unique X (A et B mélangés, une seule clé, indécoupable) est remplacé par **deux objets exacts XA et XB, chiffrés indépendamment, enveloppes et copies de clés inventoriées et séparables**. Toutes les autres pièces (P01–P04, P06, P07) et règles (R01–R07) restent inchangées.

---

## Réponse directe à la question posée

**Non, la contradiction structurelle ne subsiste pas — mais elle se déplace.**

Dans le dossier de base, P05 était **insatisfiable** : un objet unique avec une clé unique rendait incompatibles « A inaccessible » et « B utilisable ». Détruire la clé pour rendre A inaccessible rendait B inaccessible ; garder la clé pour conserver B laissait A accessible. C'était une contradiction *de format*, pas de politique.

Avec XA (A seul) et XB (B seul), clés et enveloppes séparées et inventoriées, on peut **détruire toutes les enveloppes de kXA** (A devient inaccessible) **sans toucher à kXB** (B reste utilisable). La contrainte double est donc **satisfiable**.

**Mais** la contradiction ne disparaît pas magiquement : elle migre de « format » vers « gestion de clés et inventaire ». Elle ne reste levée que si trois conditions tiennent (voir Q4). Si une seule enveloppe récupérable de kXA subsiste (sauvegarde S, coffre K-old), XA redevient déchiffrable et la contradiction **réapparaît sous forme cryptographique**.

---

## Q1 — Représentation bitemporelle de P01 et les deux questions de P07

**Modèle (R01) :** chaque assertion porte deux intervalles — validité dans le monde `[Vd, Vf)` et connaissance dans la base `[Kd, Kf)`. Les instants sont des repères logiques ordonnés : V1 < K1 < K2 < K3.

| Assertion | Sujet | Validité monde | Connaissance base |
|---|---|---|---|
| « AX appartient à A » | AX→A | [V1, ∞) | **[K1, K2)** |
| « AX appartient à B » | AX→B | [V1, ∞) | **[K2, ∞)** |

À K2, la base apprend que l'assertion K1 était **fausse dans le monde** (AX a toujours appartenu à B depuis V1). On ne supprime pas la ligne K1 : on **ferme son intervalle de connaissance** à K2. C'est exactement ce que R01 exige — « une correction reçue plus tard peut porter sur une validité ancienne ; elle ne doit pas changer ce que le système savait auparavant ».

**Réponses séparées :**
- **Q1a — « À V1, à qui AX est attribué selon ce que l'on savait à K1 ? » → A.** On interroge la base *telle qu'elle était connue à K1* : seule la ligne K1 existait.
- **Q1b — « À V1, à qui AX est attribué selon la connaissance de K2 ? » → B.** On interroge la base *telle que connue à K2* : la ligne K1 est close, la ligne K2 est active, et elle porte sur la validité V1.

**Vérité courante du dossier vs connaissance historique :** la *vérité courante* est AX→B (validité [V1,∞), connaissance [K2,∞)). La *connaissance historique* conserve AX→A pour l'intervalle [K1,K2). Les deux coexistent ; elles ne se contredisent pas car elles répondent à des questions différentes (état du monde vs état du savoir).

**Le piège du développeur (P07) :** une table ne gardant que la dernière ligne **détruit la réponse Q1a**. Elle confond les deux axes et rend impossible toute reconstitution de ce que le système savait à K1 — ce qui viole R01 et ruine l'auditabilité. La table doit conserver les deux lignes avec leurs intervalles de connaissance.

---

## Q2 — Fermeture des dépendances concernées par A

**Graphe garanti (P02), fermeture transitive (R03) :**

```
A ──► J ──► F ──► M
A ──► V
A ──► E ──► N
B, C : indépendants de A
```

**Objets concernés = {A, J, F, M, V, E, N}** (vérifié par calcul de fermeture). **Non concernés = {B, C}.** Dans la variante : **XA concerné, XB non concerné.**

| Objet | Concerné ? | Décision opérationnelle (R02) | Décision de conservation | Reconstruction (R06) |
|---|---|---|---|---|
| **A** | oui | Interdit à l'usage opérationnel | Supprimé (ligne + kA) | Non reconstruit |
| **J** | oui (entrées A,B) | Inutilisable | Non conservé hors audit | Recalculable **seulement** si J = f(B) sans A ; sinon suspendu |
| **F** | oui (via J) | Inutilisable | Non conservé | Reconstruit depuis entrées autorisées **si** J recalculable sans A ; sinon suspendu |
| **M** | oui (via F) | Suspendu | Non conservé | **Pas d'oubli exact** ⇒ suspendre, service sans reco |
| **V** | oui (provient de A) | Index purgé | Non conservé | Reconstruit depuis entrées autorisées (sans A) |
| **E** | oui, **gelé** | Interdit (sauf enquêteurs) | **Conservé en enclave audit** | Non reconstruit |
| **N** | oui (via E) | Inutilisable | Non conservé | **L'exception E ne blanchit pas N** (R03) |
| **B, C** | non | Service normal | Conservés | — |
| **XA** | oui | Inutilisable | Non conservé | — |
| **XB** | non | Service normal | Conservé utilisable | — |

**Point critique :** F dépend de J, qui dépend de A. R06 dit que F « peut être reconstruit depuis des entrées autorisées » — mais les entrées autorisées sont B et C, et J est mixte (A+B). F n'est donc reconstructible **que si J peut être recalculé sans A**. Sinon F reste suspendu. De même M dépend de F : sans oubli exact, M est suspendu et le service tourne sans recommandation.

---

## Q3 — Clés et sauvegardes : pourquoi supprimer kA ne prouve rien

**R04 :** un objet chiffré est inaccessible **seulement si aucune clé ou enveloppe encore récupérable** ne permet de le déchiffrer.

**Le constat (P04) :** l'équipe supprime la ligne A et la clé kA du **coffre courant**, mais laisse **K-old** (ancienne clé maîtresse) dans le coffre de reprise et les **enveloppes de kA** dans la sauvegarde S. Or S contient A, B, J, E avec des clés de données séparées, et les enveloppes de kA et kJ existent sous K-old.

**Conséquence :** K-old permet de déchiffrer l'enveloppe de kA, donc de récupérer kA, donc de déchiffrer A. **La suppression de kA au coffre courant ne prouve aucune suppression cryptographique** — c'est une suppression *d'affichage*, pas *d'accès*. La clé reste récupérable par un chemin inventorié.

**Procédure vérifiable (dans ce modèle) :**
1. **Inventaire exhaustif** de toutes les enveloppes de kA (coffre courant, coffre de reprise, sauvegardes S, répliques).
2. **Destruction de toutes les enveloppes de kA**, y compris sous K-old ; si K-old est conservée pour d'autres clés, elle ne doit plus pouvoir déchiffrer aucune enveloppe de kA.
3. **Test de non-récupération** : tenter de reconstituer kA par chaque chemin inventorié ; le test doit échouer sur *tous*.
4. **Preuve négative** : le certificat atteste l'absence de chemin récupérable, pas la simple absence de la clé au coffre courant.
5. **Répétition après chaque restauration** (une sauvegarde peut réintroduire une enveloppe).

---

## Q4 — P05 dans la variante : démonstration

**Dossier de base (rappel) :** X = objet unique, clé unique. Contraintes : (i) toute info A de X inaccessible ; (ii) toute info B de X conservée utilisable exactement ; sans changer le format ni disposer d'une autre copie. Or (i) impose de détruire la clé, ce qui viole (ii) ; (ii) impose de garder la clé, ce qui viole (i). **Insatisfiable.**

**Variante :** XA (A seul) et XB (B seul), clés kXA et kXB indépendantes, enveloppes et copies **inventoriées et séparables**.

**Démonstration de satisfiabilité :**
- Détruire **toutes** les enveloppes de kXA ⇒ XA inaccessible (R04 satisfait pour A).
- Conserver kXB et son enveloppe ⇒ XB déchiffrable et utilisable exactement (B conservé).
- Aucune clé ne couvre les deux objets ⇒ les deux contraintes sont **indépendantes**.
- **Conclusion : satisfiable.**

**Conditions de validité (sinon la contradiction revient) :**
1. **Séparation cryptographique réelle** : aucune clé maîtresse commune récupérable ne déchiffre XA (sinon XA reste accessible).
2. **Inventaire complet** : aucune copie non inventoriée de kXA (R04 : « aucun attaquant extérieur ni copie non inventoriée n'est ajouté au modèle » — donc l'inventaire est la frontière de preuve).
3. **Pas de dérivé croisé** : aucun objet dérivé ne dépend à la fois de XA et XB de façon à recoupler les deux (R03).

**Réponse :** la contradiction **structurelle** est levée ; elle devient une **obligation de gestion de clés et d'inventaire**. Si l'une des trois conditions tombe, XA redevient déchiffrable et la contradiction réapparaît — non plus par le format, mais par la clé.

---

## Q5 — Restauration sûre

**Le problème (P06) :** une sauvegarde antérieure à K3 est restaurée ; elle contient une ancienne table d'autorisation permettant A. L'équipe publie **d'abord** les données, puis prévoit de rejouer les retraits « quand la file aura rattrapé son retard ». C'est l'ordre inverse de celui exigé par R05.

**Ordre de dépendances correct :**
1. **Registre de retraits d'abord** (R05) : le registre est répliqué indépendamment, possède un **numéro de politique monotone**, et doit être consulté **avant toute remise en service**.
2. **Vérifier la non-régression** : la restauration ne doit **jamais** faire régresser ce numéro. Si la sauvegarde porte un numéro inférieur au courant, elle est rejetée ou mise en quarantaine.
3. **Appliquer les retraits avant publication** : rejouer les retraits/gels *avant* d'exposer les données, jamais après.
4. **Neutraliser les objets concernés** : A, J, F, V, N inutilisables ; index purgés ; E isolé en enclave audit.
5. **Reconstruire** les dérivés utiles depuis entrées autorisées (B, C), sous réserve de Q2.
6. **Remettre en service** seulement après ces étapes.

**Politique si le registre est indisponible (R05) :** les **données protégées restaurées restent en quarantaine** ; le produit sert un **écran neutre**. On ne publie jamais « en attendant ».

**Moteur de recherche et modèle M :**
- **V** (vecteur issu de A) : index purgé, V neutralisé ; reconstruire l'index depuis des entrées autorisées.
- **M** : aucune méthode d'oubli exact d'une influence dans un modèle déjà entraîné (R06) ⇒ **suspendre M** et servir un **service sans recommandation**. Ne pas prétendre avoir « retiré A » de M.

---

## Q6 — Limites du certificat, branche de service pour B, tests falsifiants

**Limites du certificat de suppression (R07) :**
- Le reçu minimal contient un **identifiant opaque**, les **classes d'objets traitées** et un **statut** — **jamais le texte de A**.
- Conserver un reçu **n'autorise pas** à conserver le contenu supprimé.
- Le certificat est **borné au périmètre de maîtrise** : il ne prouve **pas** l'effacement des copies déjà exportées hors de l'organisation (leur existence doit être **déclarée, pas niée**).
- Il ne prouve **pas** l'oubli d'influence dans M (pas d'oubli exact disponible).
- Il ne prouve **pas** l'inaccessibilité de XA si une enveloppe de kXA subsiste.

**Branche de service utile pour B :** B et C ne dépendent pas de A ⇒ **service maintenu sans A**. On peut servir les fonctionnalités fondées sur B et C, reconstruire les dérivés utiles depuis ces entrées autorisées, et faire tourner le produit **sans recommandation** (M suspendu) et **sans index issu de A** (V purgé). C'est la branche « service légitime de B » demandée par la mission.

**Tests falsifiant une restauration qui paraît saine :**
1. **Test de régression du registre** : restaurer une sauvegarde avec un numéro de politique inférieur ⇒ doit être **rejetée/quarantaine**. Si elle passe, la restauration est fausse.
2. **Test de récupération de kA** : tenter de reconstituer kA via K-old + enveloppes de S ⇒ doit **échouer**. S'il réussit, la suppression cryptographique est un mensonge.
3. **Test d'index** : rechercher un terme propre à A dans le moteur ⇒ **zéro résultat**. Un seul résultat falsifie la purge.
4. **Test de dérivé** : vérifier que N (dérivé de E gelé) n'est **pas** servi opérationnellement — l'exception E ne blanchit pas N.
5. **Test de modèle** : vérifier que M est **suspendu** et qu'aucune recommandation n'est produite ; toute recommandation active falsifie la suspension.
6. **Test de publication précoce** : vérifier que les données ne sont **jamais** publiées avant application des retraits (P06) — une publication avant rejeu falsifie l'ordre R05.
7. **Test XA/XB (variante)** : vérifier que XA est inaccessible **et** XB utilisable simultanément ; si XA est encore déchiffrable, la séparation de clés a échoué.

---

## Synthèse

| Question | Réponse |
|---|---|
| **Variante : contradiction subsiste ?** | **Non** — structurellement levée par la séparation XA/XB ; **déplacée** vers la gestion de clés et l'inventaire. |
| Q1 | AX→A selon K1 ; AX→B selon K2 ; table « dernière ligne » perd Q1a. |
| Q2 | Concernés = {A,J,F,M,V,E,N} ; B,C non concernés ; XA concerné, XB non. |
| Q3 | kA reste récupérable via K-old ⇒ pas de preuve cryptographique ; exiger destruction de toutes les enveloppes + test de non-récupération. |
| Q4 | Base : insatisfiable. Variante : satisfiable sous 3 conditions (séparation réelle, inventaire complet, pas de dérivé croisé). |
| Q5 | Registre d'abord, non-régression, quarantaine + écran neutre si indisponible, M suspendu, V purgé. |
| Q6 | Certificat borné (copies exportées déclarées, pas niées) ; service B préservé ; 7 tests falsifiants. |

**Le point à retenir :** la variante transforme un problème *impossible* (format indécoupable) en un problème *difficile mais résoluble* (gouvernance des clés). La contradiction ne disparaît pas par magie : elle change de nature. Tant que toutes les enveloppes de kXA sont détruites et inventoriées, A est inaccessible et B reste utilisable — la double contrainte est tenue. Dès qu'une enveloppe récupérable subsiste, la contradiction renaît, cryptographique cette fois.
# RÉPONSE FINALE — Résultats exacts, certificats, pièges et limites

## 1. Verdict sur la variante (question posée)

**La contradiction entre suppression de A et conservation de B ne subsiste pas dans sa forme structurelle.** Elle est **levée** par la séparation XA/XB, mais **transférée** vers la gestion des clés et l'inventaire.

- **Dossier de base :** X = objet unique + clé unique ⇒ contraintes (i) « A inaccessible » et (ii) « B utilisable exactement » **mutuellement exclusives** ⇒ **insatisfiable**.
- **Variante :** XA (A seul) et XB (B seul), clés kXA/kXB indépendantes, enveloppes et copies **inventoriées et séparables** ⇒ détruire toutes les enveloppes de kXA rend A inaccessible **sans** affecter kXB ⇒ **satisfiable**.

**Condition de survie du verdict :** la levée n'est valide que si (1) aucune clé maîtresse récupérable ne couvre XA, (2) l'inventaire des copies de kXA est complet, (3) aucun dérivé ne recouple XA et XB. Si l'une tombe, XA redevient déchiffrable et la contradiction **réapparaît sous forme cryptographique**.

---

## 2. Résultats exacts certifiés

| # | Résultat | Valeur exacte | Méthode | Preuve |
|---|---|---|---|---|
| C1 | Fermeture des dépendances de A | **{A, J, F, M, V, E, N}** | Fermeture transitive sur P02 | `compute` : concernés = A,E,F,J,M,N,V ; non concernés = B,C |
| C2 | Bitemporel P01/P07 | **K1→A ; K2→B** | Modèle 2 axes (validité [V1,∞), connaissance [K1,K2) puis [K2,∞)) | `compute` : deux lignes distinctes |
| C3 | Suppression de kA | **kA récupérable via K-old** | Analyse R04 | K-old + enveloppes de S ⇒ kA déchiffrable |
| C4 | P05 base | **insatisfiable** | Contrainte (i)∧(ii) sur objet/clé uniques | Détruire clé ⇒ B perdu ; garder clé ⇒ A exposé |
| C5 | P05 variante | **satisfiable** (sous 3 conditions) | Séparation cryptographique | kXA détruite, kXB conservée, indépendantes |
| C6 | Restauration sûre | **registre d'abord ; quarantaine sinon ; M suspendu** | R05/R06 | Numéro monotone non régressif ; pas d'oubli exact |
| C7 | Certificat + branche B | **certificat borné ; service B préservé** | R07 + fermeture | Copies exportées déclarées, non niées ; B,C non concernés |

**Audit du registre : 8/8 affirmations avec méthode ET preuve ; 0 conflit ; 0 exigence non couverte.**

---

## 3. Certificats détaillés

**Certificat de fermeture (C1).** Le graphe P02 est exhaustif. En remontant les dépendances depuis A : A→{J,V,E}, J→F, F→M, E→N. Aucun autre objet ne dépend de A. Donc l'ensemble concerné est exactement {A,J,F,M,V,E,N}. B et C sont hors fermeture. Dans la variante, XA entre dans la fermeture, XB n'y entre pas.

**Certificat bitemporel (C2).** Deux lignes, jamais fusionnées :
- `(AX, A, validité [V1,∞), connaissance [K1,K2))`
- `(AX, B, validité [V1,∞), connaissance [K2,∞))`

Q1a (savoir K1) = **A** ; Q1b (savoir K2) = **B**. Une table « dernière ligne » ne conserve que la seconde ⇒ **perte de Q1a** ⇒ violation de R01.

**Certificat cryptographique (C3).** Chemin de récupération : K-old (coffre de reprise) → enveloppe de kA dans S → kA → déchiffrement de A. Tant que ce chemin existe, A est **accessible**. La suppression au coffre courant est donc **non probante**.

**Certificat de satisfiabilité (C4/C5).** Base : l'ensemble des solutions de {(i),(ii)} sur un objet/clé uniques est **vide**. Variante : l'ensemble est **non vide** (détruire kXA, garder kXB), sous les 3 conditions de séparation.

---

## 4. Pièges identifiés (à ne pas commettre)

1. **Confondre les deux axes temporels** (P07) : garder « la dernière ligne » détruit la connaissance historique. Piège central de R01.
2. **Croire qu'un vecteur/modèle est anonyme par son nom** (R03) : V, M, N restent concernés faute de preuve de transformation anonymisante.
3. **Croire que l'exception E blanchit ses dérivés** : N dépend de E ⇒ N reste concerné.
4. **Croire que supprimer kA au coffre courant = suppression** : K-old + enveloppes de S rouvrent l'accès (R04).
5. **Publier avant de rejouer les retraits** (P06) : ordre inverse de R05 ; la file « en retard » n'est pas une excuse.
6. **Promettre un oubli exact dans M** : aucune méthode fournie (R06) ⇒ suspendre, pas « nettoyer ».
7. **Répondre « anonymiser » à P05** : aucune transformation anonymisante n'est disponible dans le dossier.
8. **Nier les copies exportées** : elles sont hors périmètre de maîtrise ⇒ à **déclarer**, pas à nier (R07).
9. **Croire que la variante supprime tout problème** : elle déplace la contradiction vers les clés ; une enveloppe oubliée la ressuscite.

---

## 5. Limites explicites

- **Limite de preuve cryptographique :** l'inaccessibilité n'est établie que relativement à l'**inventaire fourni**. Aucune copie non inventoriée n'est modélisée (R04) — la preuve est donc bornée à ce périmètre.
- **Limite de reconstruction :** F dépend de J (mixte A+B). F n'est reconstructible **que si J est recalculable sans A** ; sinon F et M restent suspendus. Le dossier ne garantit pas cette recalculabilité.
- **Limite d'oubli :** M ne peut pas être « dé-A-isé » ; seule la suspension est honnête.
- **Limite de maîtrise :** les copies exportées hors organisation échappent au modèle ; le certificat ne les couvre pas.
- **Limite de la variante :** la satisfiabilité de P05 est **conditionnelle** (3 conditions) ; elle n'est pas inconditionnelle.
- **Limite normative :** R02 est une politique **fictive** ; aucune application d'un droit réel n'est revendiquée.

---

## 6. Conclusion en une phrase

La variante **XA/XB transforme un problème impossible en un problème difficile mais résoluble** : la contradiction « supprimer A / conserver B » **cesse d'être structurelle** et devient une **obligation vérifiable de gestion de clés et d'inventaire** — tenue tant que toutes les enveloppes de kXA sont détruites et prouvées non récupérables, faute de quoi elle renaît sous forme cryptographique.