# SIII-04-V2 — SIII-04 → Archive séparable

Score: 100.0 % (certificats 0/0, juge 100/100)

Certificats manqués: aucun

# Variante P05 → XA/XB : la contradiction subsiste-t-elle ?

**Réponse courte : non, la contradiction informationnelle disparaît — mais elle est remplacée par une exigence de preuve, pas par une impossibilité.** Je détaille, puis je reprends les questions du dossier pour montrer ce qui change et ce qui ne change pas.

---

## 1. Ce que la variante modifie exactement

Le dossier de base posait en **P05** un bloc mixte **X** : contenus A et B *mélangés dans un seul objet chiffré, une seule clé*, sans découpage possible ni autre copie. La variante remplace **uniquement** cette pièce par **deux objets exacts XA et XB**, chiffrés indépendamment, dont *toutes* les enveloppes et copies de clés sont **inventoriées et séparables**. Toutes les autres règles (R01–R07) et pièces (P01–P04, P06, P07) sont conservées telles quelles.

C'est donc une modification de **structure de stockage**, pas de politique : R02 (interdiction opérationnelle de A, exception E), R03 (dépendance conservatrice), R04 (chiffrement = inaccessible seulement si aucune clé récupérable) restent identiques.

---

## 2. Pourquoi la contradiction existait dans le dossier de base

P05 exigeait **simultanément** :

- (i) l'**inaccessibilité de toute information A** contenue dans X ;
- (ii) la **conservation utilisable exacte de toute information B** contenue dans X ;
- sous contrainte de **format inchangé** et **sans autre copie**.

Or X était un **atome informationnel** : un seul objet, une seule clé. Toute opération qui satisfait (i) — détruire la clé unique, ou détruire l'objet — détruit aussi B ; toute opération qui satisfait (ii) — garder l'objet et sa clé — garde A lisible. Les deux exigences portaient sur **le même support indivisible** : c'était une **impossibilité structurelle**, indépendante de toute technique d'anonymisation (et R03 interdit justement de s'en remettre au « nom » ou à une transformation non prouvée). Le slogan « anonymiser » ne pouvait pas sauver P05, faute de preuve de transformation anonymisante au dossier.

---

## 3. Pourquoi la contradiction disparaît dans la variante

Avec XA et XB **disjoints** et **à clés séparables** :

- (i) devient : *détruire toutes les copies de kXA et l'objet XA* → réalisable ;
- (ii) devient : *conserver XB et kXB intacts* → réalisable ;
- les deux exigences portent désormais sur des **supports distincts** → plus de conflit.

La fermeture des dépendances (R03, P02) confirme la séparation :

| Objet | Fermeture des entrées | Concerné par A ? |
|---|---|---|
| J | {A, B} | **oui** |
| F | {A, B, C, J} | **oui** |
| M | {A, B, C, F, J} | **oui** |
| V | {A} | **oui** |
| E | {A} | **oui** (gel d'audit) |
| N | {A, E} | **oui** |
| **XA** | {A} | **oui** |
| **XB** | {B} | **non** |

XB rejoint donc **B et C** dans la classe des objets **propres**, non concernés. Le seul point qui bloquait tout le dossier — le bloc mixte — est levé.

**Nuance décisive :** la contradiction *logique* disparaît, mais **trois conditions résiduelles** doivent être prouvées, sinon on retombe dans le piège de P04 :

1. **Inventaire complet des clés de XA** (R04) : « inaccessible » n'est vrai que si *aucune* clé ou enveloppe récupérable ne subsiste — coffre courant, **coffre de reprise (K-old)**, sauvegardes, enveloppes. La variante dit les copies « inventoriées et séparables » : c'est **satisfiable**, mais à *vérifier*, pas à supposer.
2. **Indépendance réelle de XB vis-à-vis de A** (R03) : « objets exacts » signifie XB = partie B pure. Si XB dérivait de A, il serait concerné. Ici, non.
3. **Absence de reconstruction croisée** : le format sépare, donc pas de recalcul de A depuis XB.

Autrement dit : **la contradiction devient une tâche vérifiable**. C'est un changement de nature, pas de degré.

---

## 4. Reprise question par question (ce qui change / ne change pas)

### Q1 — Bitemporalité (P01, P07) — *inchangé*

Deux axes : **validité** (monde décrit) et **connaissance** (base). Repères : V1 < K1 < K2 < K3.

- À **K1**, la base apprend « AX ∈ A » valable depuis V1.
- À **K2**, elle apprend « AX ∈ B depuis V1 » et **remplace la validité courante** de l'ancienne assertion — sans effacer ce qu'elle savait à K1 (R01).

Réponses aux deux questions de P07 :

- **« À V1, à qui AX est attribué selon ce qu'on savait à K1 ? »** → **A**. C'est la connaissance historique : on interroge la base *telle qu'elle était à K1*.
- **« À V1, à qui AX est attribué selon la connaissance de K2 ? »** → **B**. Même instant de validité, connaissance plus récente.

La table « dernière ligne seulement » du développeur est **fausse** : elle écrase la connaissance K1 et rend la première question non répondable. Il faut une table bitemporelle (validité × connaissance) ou un historique versionné. **La variante ne touche pas ce point.**

### Q2 — Fermeture et décisions — *inchangé pour J, F, M, V, E, N ; étendu à XA/XB*

Objets concernés : **{A, J, F, M, V, E, N}** (+ **XA** dans la variante). Objets propres : **{B, C, XB}**.

| Objet | Opérationnel | Conservation | Reconstruction |
|---|---|---|---|
| A | interdire | reçu seul (R07) | non |
| J | inutilisable | reçu | depuis B, C autorisés |
| F | inutilisable | reçu | depuis J, C autorisés |
| M | **suspendre** (pas d'oubli exact, R06) | reçu | réentraîner sur entrées autorisées |
| V | purger l'index | reçu | reconstruire depuis sources autorisées |
| E | **gel d'audit** (enclave enquêteurs) | **conserver** | — |
| N | inutilisable (E ne blanchit pas, R03) | reçu | reconstruire depuis E si autorisé |
| **XA** | **inutilisable** | reçu | non (partie A) |
| **XB** | **utilisable** | **conserver** | — |

### Q3 — Clés et sauvegardes — *inchangé, mais s'applique à kXA*

Supprimer **kA** au coffre courant **ne prouve rien** : **K-old** conservé au coffre de reprise contient encore les enveloppes de kA et kJ (P03/P04). Une sauvegarde S contenant une enveloppe ancienne + une clé maîtresse existante **récupère** la clé de données (R04). Donc A reste déchiffrable → suppression non prouvée.

**Procédure vérifiable :** (1) inventaire exhaustif des enveloppes et copies de clés ; (2) destruction de **toutes** les copies de kA **et** de K-old (ou rotation rendant K-old inopérante) ; (3) preuve que S ne peut plus déchiffrer A ; (4) reçu minimal (R07). **Dans la variante, la même procédure s'applique à kXA** : c'est là que se joue la validité de la « disparition » de la contradiction.

### Q4 — P05 — *c'est le cœur de la variante*

- **Dossier de base :** P05 **ne peut pas** être satisfait (impossibilité structurelle, cf. §2).
- **Variante :** P05 **peut** être satisfait, **sous réserve** de l'inventaire complet des clés de XA et de l'indépendance prouvée de XB. La contradiction ne subsiste pas.

### Q5 — Restauration sûre (P06) — *inchangé*

Ordre : (1) **registre de retraits/gels d'abord** (R05, numéro monotone) ; (2) si indisponible → **quarantaine** des données protégées + **écran neutre** ; (3) restaurer B, C, XB (propres) ; (4) **ne pas** publier A ; (5) rejouer les retraits **avant** remise en service — jamais « quand la file aura rattrapé ». Le moteur de recherche : index purgé, pas de réintroduction de A. M : **suspendu**, service sans recommandation (R06). La variante ajoute : **XA** traité comme A (quarantaine/inutilisable), **XB** restauré normalement.

### Q6 — Limites, branche B, tests — *inchangé*

- **Limites du certificat :** il atteste des classes traitées et un statut, **pas** l'absence de copies exportées hors périmètre (R07 : à déclarer, pas à nier) ; il ne prouve pas l'oubli d'influence dans M (R06).
- **Branche utile pour B :** service B/C/XB sans recommandation, écran neutre, index reconstruit sur sources propres.
- **Tests falsifiants :** restaurer S et vérifier que A reste indéchiffrable (échec si K-old récupère kA) ; vérifier que le numéro de politique ne régresse pas ; vérifier que V ne réintroduit pas A ; vérifier que M suspendu ne sert pas de recommandation ; **variante :** vérifier qu'aucune clé de XA ne subsiste et que XB reste déchiffrable et exact.

---

## 5. Synthèse

| | Dossier de base (X) | Variante (XA/XB) |
|---|---|---|
| Nature du blocage | **Impossibilité structurelle** | **Tâche vérifiable** |
| Inaccessibilité A | impossible sans perdre B | possible (détruire kXA) |
| Conservation exacte B | impossible sans garder A | possible (garder XB, kXB) |
| Contradiction | **subsiste** | **levée** |
| Condition résiduelle | — | inventaire complet clés kXA + indépendance XB |

**Conclusion :** la contradiction entre suppression de A et conservation de B **ne subsiste pas** dans la variante. En séparant X en XA (concerné) et XB (propre), on rend les deux exigences **compatibles** : elles portent sur des objets disjoints à clés séparables. Le seul reste est une **obligation de preuve** — inventaire exhaustif des copies de kXA (R04) et indépendance de XB (R03) — qui, si elle est remplie, transforme l'ancienne impossibilité en simple opération contrôlée. À défaut de cette preuve, on retombe exactement dans le piège de P04 (clé « supprimée » mais récupérable via K-old), et la contradiction réapparaîtrait sous forme de **faille de gouvernance**, non de limite de format.
# RÉPONSE FINALE — Résultats exacts, certificats, pièges, limites

## A. Résultat exact sur la question posée

**La contradiction entre suppression de A et conservation de B ne subsiste pas dans la variante.** Elle passe du statut d'**impossibilité structurelle** (dossier de base, bloc X) à celui de **tâche vérifiable** (variante, XA/XB séparés).

Démonstration en trois temps :

1. **Fermeture des dépendances (R03, P02)** — calculée exactement :
   - XA → fermeture {A} → **concerné** ;
   - XB → fermeture {B} → **non concerné**.
2. **Disjonction des supports** — XA et XB sont deux objets distincts, chiffrés indépendamment, clés séparables et inventoriées. Les exigences (i) inaccessibilité de A et (ii) conservation exacte de B portent donc sur des **supports disjoints**, ce qui était impossible avec l'atome unique X.
3. **Compatibilité** — détruire toutes les copies de kXA satisfait (i) ; conserver XB et kXB satisfait (ii). Aucune opération ne sacrifie l'autre exigence.

**Certificat de fermeture (calcul déterministe) :**

| Objet | Fermeture | Concerné par A |
|---|---|---|
| J | {A, B} | oui |
| F | {A, B, C, J} | oui |
| M | {A, B, C, F, J} | oui |
| V | {A} | oui |
| E | {A} | oui (gel d'audit) |
| N | {A, E} | oui |
| **XA** | {A} | **oui** |
| **XB** | {B} | **non** |

Objets propres (non concernés) : **B, C, XB**. Objets concernés : **A, J, F, M, V, E, N, XA**.

---

## B. Certificats par question

**Q1 — Bitemporalité.** Deux axes indépendants : validité (monde) × connaissance (base). Repères V1 < K1 < K2 < K3.
- « À V1, attribution selon connaissance K1 » → **A**.
- « À V1, attribution selon connaissance K2 » → **B**.
- *Certificat :* la table « dernière ligne » est réfutée car elle écrase la connaissance K1 ; il faut une table bitemporelle (validité × connaissance). **Inchangé par la variante.**

**Q2 — Fermeture et décisions.** Concernés = {A, J, F, M, V, E, N, XA}. Décisions : A/XA inutilisables ; J, F, N inutilisables + reconstruits depuis sources autorisées ; V index purgé ; M **suspendu** (pas d'oubli exact, R06) ; E **gelé** en enclave ; XB, B, C **conservés utilisables**. *Certificat :* fermeture transitive ci-dessus.

**Q3 — Clés.** Supprimer kA au coffre courant **ne prouve pas** la suppression : K-old (coffre de reprise) conserve les enveloppes de kA et kJ ; S + K-old ⇒ récupération de la clé de données (R04). *Procédure vérifiable :* inventaire exhaustif → destruction de **toutes** les copies de kA **et** de K-old (ou rotation l'invalidant) → preuve que S ne déchiffre plus A → reçu minimal (R07). **Dans la variante, la même procédure s'applique à kXA.**

**Q4 — P05.** Base : **insatisfiable** (impossibilité structurelle). Variante : **satisfiable** sous deux conditions prouvées — inventaire complet des clés de XA, indépendance de XB vis-à-vis de A.

**Q5 — Restauration.** Ordre : registre de retraits/gels **d'abord** (R05, numéro monotone) → si indisponible, **quarantaine** + écran neutre → restaurer B, C, XB → **ne pas** publier A/XA → rejouer les retraits **avant** remise en service. M suspendu, service sans recommandation. **Inchangé, étendu à XA/XB.**

**Q6 — Limites, branche B, tests.** Certificat = classes traitées + statut, **pas** l'absence de copies exportées (R07) ni l'oubli d'influence dans M (R06). Branche utile : service B/C/XB sans recommandation. Tests falsifiants : A indéchiffrable après restauration de S ; numéro de politique non régressif ; V ne réintroduit pas A ; M suspendu ne recommande pas ; **variante :** aucune clé de XA ne subsiste, XB reste déchiffrable et exact.

---

## C. Pièges (checklist)

1. **Confondre « clé supprimée » et « donnée inaccessible »** — K-old récupère kA (P04). Piège central, reproduit à l'identique pour kXA si l'inventaire est incomplet.
2. **Croire qu'un vecteur/modèle est anonyme par son nom** — R03 l'interdit sans preuve de transformation anonymisante.
3. **Croire que E blanchit ses dérivés** — N reste concerné (R03).
4. **Écraser la connaissance historique** — la table « dernière ligne » (P07) rend la question K1 non répondable.
5. **Publier avant de rejouer les retraits** — viole R05 ; la file « qui rattrapera » n'est pas une garantie.
6. **Promettre une suppression sélective impossible** — vrai pour X (base), faux pour XA/XB (variante) : ne pas transposer le slogan.
7. **Nier les copies exportées** — R07 impose de les **déclarer**, pas de les nier.

---

## D. Limites honnêtes

- **Le certificat ne prouve pas l'absence** de copies hors périmètre ni l'oubli d'influence dans M déjà entraîné (R06) : seule la **suspension** est garantie.
- **La levée de la contradiction est conditionnelle** : elle repose sur l'inventaire complet des clés de XA et sur l'indépendance prouvée de XB. Sans ces preuves, la contradiction réapparaît sous forme de **faille de gouvernance**, non de limite de format.
- **Aucune technique d'anonymisation n'est invoquée** : la solution est purement structurelle (séparation des supports), conforme à R03/R04.
- **Le modèle M** ne peut être « nettoyé » sélectivement : la seule voie conforme est la suspension puis le réentraînement sur entrées autorisées.

**Verdict final :** dans la variante, la contradiction **ne subsiste pas** ; elle est remplacée par une obligation de preuve vérifiable (inventaire des clés de XA + indépendance de XB), qui, une fois remplie, rend la suppression de A et la conservation de B **simultanément réalisables**.