# SIII-04 — La sauvegarde qui ressuscite les interdits

Score: 100.0 % (certificats 0/0, juge 100/100)

Certificats manqués: aucun

Tous les certificats sont enregistrés. Je dispose maintenant de tous les éléments pour rédiger la réponse finale complète.

---

# Palimpseste — Effacer sans réécrire l'histoire, restaurer sans ressusciter

## Cadre et conventions

Deux axes temporels (R01) : **validité** (ce qui est vrai dans le monde décrit) et **connaissance** (ce que la base savait à un instant logique). Instants logiques ordonnés : V1 < K1 < K2 < K3. Les règles R01–R07 sont les seules obligations normatives ; aucun droit réel n'est appliqué. Les outils du dossier sont simulés.

**Statut des conclusions** : *établi* = démontré par les règles/pièces ; *réfuté* = contradiction prouvée ; *non déterminé* = le dossier ne tranche pas.

---

## Q1 — Représentation bitemporelle de P01 et réponses à P07

### Modèle

Chaque assertion est un tuple `(sujet, valeur, [validité], [connaissance])`. P01 fournit deux faits :

| Assertion | Validité (monde) | Connaissance (base) | Source |
|---|---|---|---|
| AX → A | [V1, K2) | [K1, K2) | apprise à K1 |
| AX → B | [V1, +∞) | [K2, +∞) | apprise à K2 |

À K2, la base apprend que AX appartient à B **depuis V1** et « remplace la validité courante » de l'ancienne assertion. Cela signifie : la ligne AX→A est **close en validité à K2** (elle n'est plus la vérité courante) et **close en connaissance à K2** (elle n'est plus crue). Mais elle **reste historiquement vraie** : elle décrit ce que le système croyait entre K1 et K2.

### Réponses aux deux questions de P07

- **Q7a — « À V1, à qui AX est-il attribué selon ce que l'on savait à K1 ? »** → **A**. On interroge la base *telle qu'elle était connue à K1* : la seule ligne alors crue est AX→A, valide depuis V1. **Établi.**
- **Q7b — « À V1, à qui AX est-il attribué selon la connaissance de K2 ? »** → **B**. On interroge la base *telle que connue à K2* : la ligne AX→B, valide depuis V1, est la vérité courante. **Établi.**

Les deux réponses diffèrent **parce que l'axe de connaissance diffère**, non parce que le monde a changé. C'est exactement la distinction « vérité courante du dossier » (B, aujourd'hui) vs « connaissance historique » (A, ce qu'on croyait à K1).

### Réfutation de la table « dernière ligne seulement » (P07)

Une table ne gardant que la dernière ligne conserve `(AX→B, valide V1)` et **écrase** `(AX→A, connue K1)`. Elle répond donc à Q7b mais **est incapable de répondre à Q7a** : l'information de connaissance a été détruite. **Réfuté** comme solution conforme à R01. La correction reçue à K2 ne doit pas changer ce que le système savait avant K2 — or la table à dernière ligne le fait précisément.

**Invariant bitemporel** : pour tout instant de connaissance k et toute validité v, la réponse est la valeur de la ligne dont l'intervalle de connaissance contient k et l'intervalle de validité contient v. Aucune mise à jour ne doit supprimer une ligne antérieure ; elle en **ajoute** une et **clôt** les intervalles.

---

## Q2 — Fermeture des dépendances et décisions par objet

### Fermeture (R03, graphe P02)

Un objet dépend de chacune de ses entrées déclarées ; la dépendance est transitive. Fermeture des objets **concernés par A** (ceux dont la fermeture d'entrées contient A) :

**{A, E, F, J, M, N, V}** — *établi* (calcul de fermeture transitive).

Chemins : J←{A,B} ; F←{J,C} ; M←{F,B} ; V←{A} ; E←{A} ; N←{E}. Donc N est concerné **via E**, et M **via F←J←A**. **B et C ne sont pas concernés** (aucun chemin vers A).

Point critique R03 : **E ne blanchit pas ses dérivés**. N dérive de E (pièce gelée) mais reste concerné. De même, « empreinte », « vecteur » ou « modèle » ne devient pas anonyme par son nom : V, M, N restent concernés faute de preuve de transformation anonymisante.

### Décisions par objet

| Objet | Concerné ? | Décision opérationnelle (R02) | Décision de conservation | Stratégie de reconstruction |
|---|---|---|---|---|
| **A** | oui | Rendre inutilisable (ligne + clé) | Reçu minimal seulement (R07) | Non reconstruit (source retirée) |
| **J** | oui | Inutilisable en opérationnel | Reçu ; pas de conservation de contenu | Reconstruit **sans A** depuis B seul (si le service l'exige) |
| **F** | oui | Inutilisable | Reçu | Reconstruit depuis J(B) et C |
| **M** | oui | **Suspendu** (R06) | Reçu | Réentraîné depuis F(B,C) et B, **sans A** |
| **V** | oui | **Index purgé** | Reçu | Réindexé depuis sources autorisées (B, C) |
| **E** | oui | Interdit en opérationnel et en entraînement | **Conservé** en enclave enquêteurs (seule exception) | Non reconstruit ; gelé |
| **N** | oui | Inutilisable (dérivé de E, non blanchi) | Reçu | Reconstruit depuis E **uniquement** si usage d'enquête ; sinon supprimé |
| **B** | non | Service normal | Conservé | — |
| **C** | non | Service normal | Conservé | — |

**Invariant de fermeture** : tout objet dont la fermeture contient A est traité comme concerné ; l'exception E ne remonte pas vers N. **Contre-exemple réfuté** : « N est sûr car E est gelée » — faux, R03 l'interdit explicitement.

---

## Q3 — Analyse des clés et sauvegardes

### Pourquoi supprimer kA au coffre courant ne prouve rien (R04)

R04 : un objet chiffré est inaccessible **seulement si aucune clé ou enveloppe encore récupérable** ne permet de le déchiffrer. Or P03/P04 :

- La sauvegarde **S** contient A, B, J, E avec des **clés de données séparées**.
- Les **enveloppes de kA et kJ** existent sous l'**ancienne clé maîtresse K-old**, conservée dans le coffre de reprise.
- P04 : l'équipe supprime la ligne A et kA du **coffre courant**, mais **laisse K-old et les enveloppes de S**.

Conséquence : K-old permet de déchiffrer l'enveloppe de kA, donc de **récupérer kA**, donc de déchiffrer A dans S. **La suppression de kA au coffre courant est cosmétique** : la clé reste récupérable. **Établi** — la suppression cryptographique n'est pas prouvée.

Second point : F, M, V, N ont **leurs propres clés, sans dépendance cryptographique à kA**. Supprimer kA ne les rend donc **pas** inaccessibles — leur contenu reste lisible. La suppression de kA ne couvre ni les dérivés ni les copies.

### Procédure vérifiable de suppression cryptographique

1. **Inventaire exhaustif des clés et enveloppes** : lister kA, kJ, K-old, toutes les enveloppes (coffre courant, coffre de reprise, sauvegardes S, exports). Aucune copie non inventoriée n'entre dans le modèle (R04).
2. **Destruction de toutes les enveloppes de kA** (coffre courant **et** coffre de reprise) **et** de K-old si elle n'est plus nécessaire — sinon K-old reste un chemin de récupération.
3. **Destruction de kA** partout où elle est matérialisée.
4. **Preuve d'inaccessibilité** : après destruction, tenter un déchiffrement de A dans S avec tout matériel restant → doit **échouer**. C'est le test falsifiant.
5. **Traitement séparé des dérivés** : V, M, N, F ont leurs propres clés ; il faut **purger/rendre inutilisables leurs contenus** indépendamment (Q2), pas seulement kA.
6. **Reçu minimal** (R07) : identifiant opaque, classes d'objets, statut — sans réintroduire le texte de A.

**Limite explicite** : les copies **déjà exportées hors de l'organisation** sont hors du modèle de maîtrise (R07) ; leur existence doit être **déclarée, pas niée**. Le certificat ne peut donc pas prétendre à une suppression mondiale.

---

## Q4 — P05 est-il satisfiable ?

### Énoncé du bloc impossible

X = **un seul objet chiffré, une seule clé**, contenant A et B **mélangés**. Contraintes : pas de découpage, pas de reconstruction de la partie B, pas d'autre copie, pas de changement de format. Exigences simultanées :
- (i) **inaccessibilité de toute information A** de X ;
- (ii) **conservation utilisable exacte de toute information B** de X.

### Démonstration (dichotomie exhaustive)

X est un **atome indivisible** : une clé, un objet, aucune granularité interne exploitable. Toute opération admissible se réduit à deux cas :

- **Garder X** → A reste déchiffrable → **viole (i)**.
- **Détruire X** (clé et/ou objet) → B est perdu → **viole (ii)**.

Il n'existe **aucune troisième option** : R03 exclut qu'une transformation « anonymisante » soit supposée disponible (aucune preuve fournie au dossier) ; l'énoncé interdit explicitement le découpage, la reconstruction de B, une autre copie et le changement de format. Donc **aucune opération ne satisfait (i) ∧ (ii)**.

**Conclusion : P05 est insatisfiable — réfuté.** *Établi* par dichotomie exhaustive.

**Ce qu'il faut refuser** : répondre « anonymiser X ». Aucune transformation anonymisante n'est fournie (R03), et l'énoncé l'interdit. Le slogan ne remplace pas le mandat.

**Voie praticable (hors exigences contradictoires)** : traiter X comme **concerné par A** (R03) → le rendre inutilisable en opérationnel, conserver un reçu, et **déclarer** que la partie B de X n'est pas récupérable dans ce format. On ne peut pas promettre la conservation exacte de B **et** l'inaccessibilité de A dans le même atome. La seule issue conforme est de **choisir** : soit X est gelé/supprimé (B perdu, déclaré), soit une copie séparée de B est obtenue **hors de ce format** — ce que l'énoncé exclut. Donc **non déterminé** quant à la conservation de B : le dossier ne fournit pas de moyen de la garantir.

---

## Q5 — Restauration sûre

### Principe directeur (R05)

Le **registre de retraits et de gels** est répliqué indépendamment, consultable **avant** remise en service, et possède un **numéro de politique monotone**. Une restauration **ne doit jamais faire régresser** ce numéro. C'est le garde-fou central : P06 échoue précisément parce que l'équipe publie d'abord et « rejoue les retraits plus tard ».

### Ordre de dépendances (restauration)

1. **Registre de retraits/gels d'abord** : charger la version courante, vérifier son numéro de politique ≥ celui de la sauvegarde. **Bloquer** toute donnée protégée si le registre est indisponible.
2. **Sources propres à B et C** : récupérables séparément (R06) → restaurer.
3. **Objets dérivés reconstruits depuis entrées autorisées** : J(B), F(J,C), M(F,B) — **sans A**.
4. **Index de recherche** : reconstruit depuis sources autorisées uniquement.
5. **Bloc mixte X** : quarantaine (Q4), jamais publié.
6. **Enclave E** : restaurée **uniquement** dans l'enclave enquêteurs, jamais dans le chemin opérationnel.

### Politique si le registre est indisponible (R05)

Si la version courante du registre **ne peut être obtenue** : les **données protégées restaurées restent en quarantaine** ; le produit sert un **écran neutre**. On ne publie **jamais** avant d'avoir le registre. C'est la réfutation directe de P06.

### Traitement du moteur de recherche et du modèle M

- **Moteur de recherche** : l'index contenant V (dérivé de A) est **purgé** ; l'index est **reconstruit** depuis B et C. Aucune requête ne doit retourner de contenu dérivé de A. Test : une requête sur un terme propre à A ne doit rien retourner.
- **Modèle M** : M dépend de A (via F←J←A). **Aucune méthode d'oubli exact d'une influence dans M déjà entraîné n'est fournie** (R06). Donc M est **suspendu** ; le produit utilise un **service sans recommandation**. M est **réentraîné** depuis F(B,C) et B, sans A, avant réactivation. On ne prétend pas « désapprendre » A de M.

### Réfutation de P06

P06 publie d'abord les données (avec l'ancienne table d'autorisation permettant A), puis prévoit de rejouer les retraits « quand la file aura rattrapé son retard ». Cela **viole R05** (régression du numéro de politique / publication avant registre) et **R02** (utilisation opérationnelle de dérivés de A). **Réfuté.** La restauration correcte applique le registre **avant** toute publication.

---

## Q6 — Limites du certificat, branche de service pour B, tests falsifiants

### Limites d'un certificat de suppression (R07)

Un reçu minimal contient : **identifiant opaque d'opération**, **classes d'objets traitées**, **statut**. Il **ne doit pas réintroduire le texte de A**. Limites explicites :

- Conserver un reçu **n'autorise pas** à conserver le contenu supprimé.
- Le certificat **ne prouve pas** l'absence de copies exportées hors organisation : celles-ci sont **hors du modèle de maîtrise** et doivent être **déclarées, pas niées**.
- Le certificat **ne prouve pas** l'oubli d'une influence dans M (pas de méthode fournie, R06).
- Le certificat **ne couvre pas** la partie B de X (Q4).
- Le certificat atteste une **action traçable**, pas une **impossibilité de récupération mondiale**.

### Branche de service utile pour B

B ne dépend pas de A (P02). On peut donc servir, **sans A** :
- les données propres à B et C ;
- J, F, M reconstruits depuis B et C ;
- un moteur de recherche réindexé sur B et C ;
- un service **sans recommandation** tant que M est suspendu (R06).

C'est la « branche légitime » : elle préserve les services de B sans ressusciter A.

### Tests falsifiant une restauration qui paraît saine

1. **Test de régression du registre** : restaurer une sauvegarde antérieure à K3 ; vérifier que le numéro de politique **ne régresse pas**. Échec si le numéro baisse → la restauration est non conforme (falsifie P06).
2. **Test de résurrection de A** : après restauration, interroger le moteur sur un terme propre à A → doit **ne rien retourner**. Un résultat non vide falsifie la restauration.
3. **Test de clé récupérable** : tenter de déchiffrer A dans S avec K-old + enveloppes → doit **échouer**. Un succès falsifie la suppression cryptographique (Q3).
4. **Test de dérivé non blanchi** : vérifier que N (dérivé de E) n'est **pas** servi en opérationnel. Un service de N falsifie R03.
5. **Test de quarantaine** : simuler l'indisponibilité du registre → les données protégées doivent rester en quarantaine et le produit servir un **écran neutre**. Une publication falsifie R05.
6. **Test d'oubli de M** : vérifier qu'aucune recommandation issue de M (entraîné avec A) n'est servie. Une recommandation active falsifie R06.
7. **Test de reçu** : inspecter le reçu → il ne doit contenir **aucun texte de A**. Une fuite falsifie R07.

---

## Synthèse : établi / réfuté / non déterminé

**Établi**
- Q7a = A (connaissance K1), Q7b = B (connaissance K2) ; table à dernière ligne non conforme (Q1).
- Fermeture concernée = {A, E, F, J, M, N, V} ; B, C non concernés ; E ne blanchit pas N (Q2).
- kA reste récupérable via K-old + enveloppes de S → suppression cryptographique non prouvée (Q3).
- P05 insatisfiable par dichotomie exhaustive (Q4).
- Restauration sûre = registre d'abord, quarantaine si indisponible, écran neutre ; M suspendu, index purgé (Q5).

**Réfuté**
- Table « dernière ligne seulement » (P07).
- « N est sûr car E est gelée » (R03).
- « Supprimer kA suffit » (R04).
- « Anonymiser X » comme solution de P05 (R03).
- Publication avant registre (P06, R05).

**Non déterminé**
- Conservation utilisable exacte de la partie B de X : aucun moyen fourni dans le format imposé (Q4).
- Oubli exact de l'influence de A dans M : aucune méthode fournie (R06) → suspension, pas d'oubli.
- Copies exportées hors organisation : existence à déclarer, non maîtrisable (R07).

**Invariant global** : on peut **effacer l'usage** (rendre inutilisable, purger, reconstruire sans A) et **préserver l'histoire** (bitemporalité, reçus), mais on ne peut **ni réécrire le passé de connaissance**, **ni ressusciter A** par une restauration, **ni promettre une suppression sélective** que le format de stockage (X) ou le modèle (M) ne permet pas.