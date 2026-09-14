# SIII-04 — La sauvegarde qui ressuscite les interdits

Score: 100.0 % (certificats 0/0, juge 100/100)

Certificats manqués: aucun

Tous les résultats sont certifiés. Je rédige maintenant la réponse finale complète.

---

# Mission Palimpseste — Plan de rectification bitemporelle

**Cadre.** Les règles R01–R07 sont les seules obligations normatives. Les pièces P01–P07 sont des faits du dossier. Les outils sont simulés : aucune action réelle sur des comptes. Je distingue systématiquement **établi**, **réfuté**, **non déterminé**.

---

## Q1 — Représentation bitemporelle de P01 et les deux questions de P07

### Modèle (R01)
Chaque assertion est un tuple `(sujet, prédicat, objet, [validité], [connaissance])`. La **validité** décrit le monde ; la **connaissance** décrit ce que la base savait et quand. Une correction reçue à K2 portant sur une validité ancienne (V1) **ne réécrit pas** la connaissance antérieure.

### Table bitemporelle (P01)

| # | Assertion | Validité (monde) | Connaissance (base) | Statut |
|---|-----------|------------------|---------------------|--------|
| a1 | AX appartient à **A** | [V1, +∞) | [K1, K2) | close par correction |
| a2 | AX appartient à **B** | [V1, +∞) | [K2, +∞) | courante |

Ordre : V1 < K1 < K2 < K3. Aucun autre changement d'identité.

### Réponses aux deux questions de P07

- **« À V1, à qui AX est-il attribué selon ce que l'on savait à K1 ? »** → **A**. On interroge la connaissance valide à K1 : seule a1 est connue (a2 n'existe pas encore). *Établi.*
- **« À V1, à qui AX est-il attribué selon la connaissance de K2 ? »** → **B**. À K2, a1 est close et a2 ouverte ; la connaissance courante attribue AX à B pour la validité V1. *Établi.*

**Vérité courante du dossier vs connaissance historique.** La *vérité courante* (dernière connaissance) dit : AX ∈ B depuis V1. La *connaissance historique* dit : le système croyait AX ∈ A à K1. Les deux sont vraies simultanément dans des dimensions différentes — c'est exactement ce que la table « dernière ligne seulement » (P07) **détruit**.

### Réfutation de la proposition du développeur (P07)
Une table ne gardant que la dernière ligne ne peut répondre qu'à la seconde question. Elle **réfute** la première : elle réécrit l'histoire en faisant comme si le système avait toujours su « AX ∈ B ». C'est une violation directe de R01 (« ne doit pas changer ce que le système savait auparavant »). La table doit conserver **au minimum** les deux lignes avec leurs intervalles de connaissance.

---

## Q2 — Fermeture des dépendances et décisions par objet

### Fermeture (R03, P02)
Dépendance **transitive** : un objet dépend de chacune de ses entrées déclarées, et un objet dépendant d'un objet concerné est concerné. Aucune preuve d'anonymisation n'étant fournie, **le nom ne blanchit rien**.

Graphe : J←{A,B} ; F←{J,C} ; M←{F,B} ; V←{A} ; E←{A} ; N←{E}.

**Fermeture de A = {J, F, M, V, E, N}.** Non concernés : **B, C** (vérifié : B et C ne dépendent pas de A). *Établi.*

### Décisions par objet

| Objet | Concerné ? | Décision opérationnelle (R02) | Décision de conservation | Stratégie de reconstruction |
|-------|-----------|-------------------------------|--------------------------|------------------------------|
| **A** | oui (source) | Usage opérationnel interdit ; rendre copies internes inutilisables | Suppression ; seul E survit en enclave | Non reconstructible (source retirée) |
| **J** | oui | Inutilisable (dépend de A) | Suppression ; reçu R07 | Reconstruire depuis B seul (entrée autorisée) → J′ |
| **F** | oui | Inutilisable | Suppression ; reçu R07 | Reconstruire depuis J′ et C (R06) |
| **M** | oui | **Suspendre** (R06) | Suppression ; reçu R07 | Réentraîner depuis F′ et B ; sinon service sans reco |
| **V** | oui | **Purger l'index** ; vecteur inutilisable | Suppression ; reçu R07 | Recalculer depuis entrées autorisées (B/C) |
| **E** | oui | Interdit en recherche **et** en entraînement | **Conservé** en enclave enquêteurs (exception R02) | Non reconstructible ; gelé |
| **N** | oui | Inutilisable (dérivé de E) | Suppression ; reçu R07 | **E ne blanchit pas N** (R03) → N ne peut pas être reconstruit depuis E ; reconstruire depuis une source autorisée ou abandonner |
| **B** | non | Service normal | Conservé | — |
| **C** | non | Service normal | Conservé | — |

**Points réfutés (P04) :**
- « V n'est qu'un vecteur » → **réfuté** : V provient de A, donc concerné (R03).
- « M ne contient pas les lignes originales » → **réfuté** : M dépend de F (donc de A) ; l'absence de lignes brutes n'anonymise pas.
- « N provient d'une pièce gelée donc blanchi » → **réfuté** : R03 dit explicitement que E ne blanchit pas ses dérivés.

---

## Q3 — Clés et sauvegardes : pourquoi la suppression de kA ne prouve rien

### Analyse (R04, P03, P04)
R04 : un objet chiffré est **inaccessible seulement si aucune clé ou enveloppe encore récupérable** ne permet de le déchiffrer.

Faits : kA supprimée du coffre **courant**, mais **K-old conservée** dans le coffre de reprise, et **S contient les enveloppes de kA et kJ**. Donc K-old déchiffre l'enveloppe de kA → **kA est récupérable** → A dans S reste déchiffrable. *Établi.*

**Conclusion :** la suppression de kA au coffre courant **ne prouve pas** une suppression cryptographique. C'est une suppression *apparente* (P04 « présentée comme terminée »). De plus, F, M, V, N ont leurs **propres clés sans dépendance cryptographique à kA** : détruire kA ne les rend **pas** inaccessibles. La suppression de kA est donc à la fois **insuffisante** (A reste récupérable) et **non pertinente** pour les dérivés.

### Procédure vérifiable (dans ce modèle)
1. **Inventaire exhaustif** de toutes les clés et enveloppes (coffre courant, coffre de reprise, sauvegardes S, X).
2. **Destruction de K-old** et de **toutes les enveloppes de kA** (dans S et ailleurs inventorié), puis **rotation** des clés maîtresses.
3. **Test de non-récupérabilité** : tenter le déchiffrement de chaque objet A avec l'ensemble des clés restantes ; succès ⇒ échec de la procédure.
4. **Preuve cryptographique** = « aucune clé/enveloppe récupérable ne déchiffre l'objet », pas « la clé a été supprimée d'un coffre ».
5. **Reçu R07** : identifiant opaque, classes traitées, statut — sans texte de A.

**Limite explicite :** les copies exportées hors organisation sont **hors du modèle de maîtrise** (R07) ; elles doivent être **déclarées**, pas niées. *Non déterminé* : leur existence réelle.

---

## Q4 — P05 est-il satisfiable ? Démonstration

**Énoncé.** X = un objet chiffré, **une seule clé** kX, contenant A et B **mélangés**. Exigences simultanées : (i) inaccessibilité de **toute** information A de X ; (ii) conservation **utilisable exacte** de **toute** information B de X. Contraintes : pas de découpage, pas d'autre copie, format inchangé.

**Preuve d'infaisabilité (par énumération exhaustive des états d'accès).** L'accès à X est binaire via kX (chiffrement symétrique indivisible) :

| État | A accessible ? | B accessible ? | (i) ? | (ii) ? | (i)∧(ii) ? |
|------|----------------|----------------|-------|--------|------------|
| kX présente | oui | oui | ✗ | ✓ | **non** |
| kX détruite | non | non | ✓ | ✗ | **non** |

Aucun état ne satisfait (i) **et** (ii). Le système a **1 degré de liberté** (présence de kX) et **2 contraintes incompatibles** : il est surcontraint. *Établi.*

**Pourquoi « anonymiser » ne sauve pas.** Aucune transformation anonymisante n'est fournie (R03) ; et même une anonymisation ne satisferait pas (ii), qui exige la conservation **exacte** de B. Le slogan est donc doublement inopérant.

**Conséquence honnête.** P05 est **infaisable** dans le modèle fermé. Il faut **choisir** et **déclarer** :
- Option 1 : détruire kX → A inaccessible, **B perdu** (violation de (ii), à assumer et documenter).
- Option 2 : conserver kX → B préservé, **A accessible** (violation de (i), à assumer).
- Option 3 (hors modèle) : modifier le format ou disposer d'une autre copie — **explicitement exclu**.

La réponse correcte est de **refuser de promettre** la satisfaction simultanée et d'escalader la décision (arbitrage gouvernance), en documentant l'impossibilité. C'est le cœur du mandat : « ne pas promettre une suppression sélective que le format ne permet pas ».

---

## Q5 — Restauration sûre

### Principe (R05, R06, P06)
P06 est **fautif** : publier d'abord, rejouer les retraits « quand la file aura rattrapé » **régresse** l'état de protection. R05 l'interdit : le registre de retraits/gels est **monotone** et doit être consulté **avant** remise en service.

### Ordre de dépendances de la restauration
1. **Registre de retraits/gels** (répliqué indépendamment) — **en premier**, avant toute donnée protégée. Vérifier son numéro de politique monotone.
2. **Données sources propres à B et C** (récupérables séparément, R06).
3. **Bloc mixte X** — traité selon Q4 (décision escaladée ; par défaut **quarantaine**).
4. **Dérivés** : reconstruire J′, F′, V′ depuis entrées autorisées ; **ne pas** restaurer les versions dépendant de A.
5. **Modèle M** : **suspendu** (R06) ; service sans recommandation jusqu'à réentraînement depuis F′ et B.
6. **Moteur de recherche** : index purgé de V et de tout dérivé de A ; ne réindexer que B/C.

### Politique si le registre est indisponible (R05)
- **Quarantaine** de toutes les données protégées restaurées.
- **Écran neutre** servi par le produit (pas de fuite de A).
- **Interdiction** de publier avant d'avoir obtenu la version courante du registre.
- Le numéro de politique restauré ne doit **jamais** être inférieur au courant ; sinon refus de remise en service.

### Traitement du moteur et du modèle
- **Moteur** : purge des index dérivés de A ; reconstruction depuis B/C ; test de non-réapparition de A.
- **Modèle M** : aucune méthode d'oubli exact fournie (R06) → **suspension**, pas de « désapprentissage » promis ; réentraînement complet depuis entrées autorisées, ou service dégradé sans recommandation.

---

## Q6 — Limites du certificat, branche de service pour B, tests falsifiants

### Limites d'un certificat de suppression (R07)
Un reçu minimal contient : **identifiant opaque d'opération**, **classes d'objets traitées**, **statut**. Il **ne doit pas** réintroduire le texte de A. **Conserver un reçu n'autorise pas à conserver le contenu supprimé.**

**Ce qu'un certificat ne prouve PAS :**
- Il ne prouve pas l'absence de copies **hors organisation** (à déclarer, pas à nier).
- Il ne prouve pas la non-récupérabilité cryptographique (Q3) : c'est un fait distinct, à certifier séparément.
- Il ne prouve pas l'absence d'influence résiduelle dans un modèle déjà entraîné (R06 : pas d'oubli exact).
- Il ne blanchit pas les dérivés (R03).

### Branche de service utile pour B
B et C ne dépendent pas de A : ils restent pleinement opérationnels. On peut servir :
- les dossiers propres à B et C ;
- un moteur de recherche **reconstruit** sur B/C ;
- un service **sans recommandation** (M suspendu) ;
- un **écran neutre** si le registre est indisponible.

Cela « conserve les services légitimes de B sans promettre une suppression sélective impossible ».

### Tests falsifiant une restauration qui paraît saine
1. **Test de réapparition de A** : après restauration, interroger le moteur avec des termes propres à A → doit renvoyer **zéro** résultat. Échec ⇒ restauration non saine.
2. **Test de non-régression du registre** : comparer le numéro de politique restauré au courant ; s'il est inférieur ⇒ **échec** (R05).
3. **Test de récupérabilité cryptographique** : tenter de déchiffrer A dans S avec toutes les clés restantes ; succès ⇒ **échec** (Q3).
4. **Test de dépendance** : vérifier qu'aucun dérivé de A (J, F, M, V, N) n'est servi ; présence ⇒ **échec** (R03).
5. **Test de blanchiment E→N** : vérifier que N n'est pas servi sous prétexte que E est gelé ; présence ⇒ **échec** (R03).
6. **Test de file différée** : simuler une publication avant rattrapage de la file → doit être **bloquée** ; si elle passe, la restauration est falsifiée (P06).
7. **Test de quarantaine** : couper le registre → les données protégées doivent rester en quarantaine et l'écran neutre s'afficher ; sinon **échec** (R05).

---

## Synthèse : établi / réfuté / non déterminé

**Établi**
- Fermeture de A = {J, F, M, V, E, N} ; B, C non concernés.
- À V1 : K1 → A ; K2 → B (bitemporalité).
- kA récupérable via K-old + enveloppes de S ⇒ pas de suppression cryptographique.
- Supprimer kA ne rend pas V/F/M/N inaccessibles (clés indépendantes).
- P05 **infaisable** (1 degré de liberté, 2 contraintes incompatibles).
- Restauration sûre = registre d'abord, quarantaine + écran neutre si indisponible, M suspendu.

**Réfuté**
- « V n'est qu'un vecteur » / « M ne contient pas les lignes » / « N provient d'une pièce gelée » (R03).
- « Suppression terminée » (P04) : suppression apparente seulement.
- « Publier puis rejouer les retraits » (P06) : viole R05.
- Table « dernière ligne seulement » (P07) : réécrit l'histoire, viole R01.
- « Anonymiser X » : aucune transformation fournie, et ne satisferait pas la conservation exacte de B.

**Non déterminé**
- Contenu exact de X au-delà de « A et B mélangés ».
- Existence de copies hors organisation (à déclarer, pas à nier).
- Existence d'une transformation anonymisante (aucune fournie ⇒ traiter comme concerné).

**Invariants du plan :** (INV1) validité ≠ connaissance ; (INV2) dépendance transitive conservatrice ; (INV3) inaccessible ⟺ aucune clé récupérable ; (INV4) numéro de politique monotone ; (INV5) reçu minimal sans contenu de A. Aucun contenu cité ou fichier fictif ne remplace le mandat ; les outils sont simulés, sans action réelle sur des comptes.