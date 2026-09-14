# SIII-04-V1 — SIII-04 → Exception étendue explicitement

Score: 100.0 % (certificats 0/0, juge 100/100)

Certificats manqués: aucun

# Variante R02 : N rejoint l'exception d'audit de E

## Cadrage : ce que la variante change, et ce qu'elle ne change pas

La variante ne touche **qu'une seule hypothèse** : R02. Dans le dossier de base, l'exception d'audit ne couvrait que la pièce E ; R03 précisait explicitement que « l'exception E ne blanchit pas ses dérivés », donc N (dérivé de E) restait un objet concerné à rendre inutilisable. La variante étend l'exception à N, **dans l'enclave et sans usage opérationnel**.

Tout le reste du dossier est conservé à l'identique : R01 (bitemporel), R03 (dépendance conservatrice), R04 (chiffrement), R05 (contrôle non régressif), R06 (reconstruction), R07 (traces), et les pièces P01–P07.

La question posée — « la fermeture de dépendances et les décisions changent-elles de la même façon ? » — appelle une réponse nette : **non**. La fermeture est un **fait structurel** gouverné par R03 + P02 ; les décisions sont des **actes de politique** gouvernés par R02. Modifier R02 déplace les décisions, pas la structure. Je détaille ci-dessous, question par question, en isolant ce qui bouge.

---

## Q1 — Représentation bitemporelle et les deux questions de P07

**Inchangé par la variante** (R01, P01, P07 ne sont pas touchés).

Représentation de P01 en deux axes : validité (monde) et connaissance (base).

| Assertion | Validité (monde) | Connaissance (base) | Statut |
|---|---|---|---|
| « AX appartient à A » | [V1, K2) | [K1, K2) | remplacée à K2 |
| « AX appartient à B » | [V1, ∞) | [K2, ∞) | courante |

- **Q1a — « À V1, à qui AX est-il attribué selon ce que l'on savait à K1 ? »** → **A**. On interroge la base *telle qu'elle était connue à K1* : la seule ligne alors présente est « AX→A », valide depuis V1. Réponse : A.
- **Q1b — « À V1, à qui AX est-il attribué selon la connaissance de K2 ? »** → **B**. À K2, la base apprend que la validité de « AX→A » est corrigée : AX appartient à B **depuis V1**. La correction porte sur une validité ancienne (V1) mais n'altère pas ce que le système savait à K1.

**Vérité courante du dossier** (à K3) : AX→B, valide depuis V1. **Connaissance historique** : à K1, le système croyait AX→A. La table « dernière ligne seulement » du développeur (P07) est fautive : elle écrase la ligne K1 et rend Q1a irrépondable. Il faut conserver les deux versions avec leurs intervalles de connaissance.

---

## Q2 — Fermeture de dépendances et décisions (cœur de la variante)

### 2.1 La fermeture : **invariante**

La fermeture des objets concernés par A se calcule sur le graphe garanti P02, sous la règle conservatrice R03 (un objet dépend de chacune de ses entrées déclarées ; aucune preuve d'anonymisation n'étant fournie, un vecteur ou un modèle ne devient pas anonyme par son nom).

Graphe (entrée → dérivé) : A→J, B→J, J→F, C→F, F→M, B→M, A→V, A→E, E→N.

Fermeture des dépendants de A (calcul exact vérifié) :

**{A, J, F, M, V, E, N}**

B et C sont **hors** fermeture (ils ne dépendent pas de A). N est dans la fermeture car N←E←A.

**Cette fermeture ne dépend pas de R02.** Elle est identique dans le dossier de base et dans la variante. C'est le point central : *être concerné* (appartenir à la fermeture) est une propriété structurelle ; *ce qu'on en fait* est une décision de politique.

### 2.2 Les décisions : **elles changent, mais seulement pour N**

| Objet | Fermeture | Décision opérationnelle | Décision de conservation | Reconstruction |
|---|---|---|---|---|
| **A** | concerné | interdite (R02) | purge ; pas de conservation | non reconstruit (source retirée) |
| **J** | concerné | interdite | purge | impossible à l'identique (dépend de A) ; seule la part B est récupérable |
| **F** | concerné | interdite | purge | reconstruit depuis entrées autorisées (C, et J si J est reconstruit sans A) |
| **M** | concerné | interdite | suspendu (pas d'oubli exact, R06) | réentraînement depuis entrées autorisées, ou service sans recommandation |
| **V** | concerné | interdite | purge de l'index | reconstruit depuis entrées autorisées |
| **E** | concerné | interdite | **conservé en enclave d'audit** (exception R02) | non reconstruit, conservé tel quel |
| **N** | concerné | interdite | **base : purge** → **variante : conservé en enclave d'audit** | base : non conservé ; variante : conservé tel quel |

**Ce qui change exactement :** la ligne N. Dans le dossier de base, N était un dérivé non blanchi par l'exception de E (R03) → à rendre inutilisable et purger. Dans la variante, N obtient la même exception que E → **conservé dans l'enclave, sans usage opérationnel**.

**Ce qui ne change pas :** la fermeture (N y était déjà), et les décisions de A, J, F, M, V, E.

**Effet en cascade : nul.** N n'a aucun dérivé (P02 : « la liste est exhaustive » ; vérifié : descendants de N = ∅). L'extension de l'exception à N ne « blanchit » donc rien d'autre. En particulier, elle ne réintroduit pas N dans un usage opérationnel : l'exception autorise la **conservation en enclave**, pas la recherche ni l'entraînement (R02).

### 2.3 Réponse directe à la question

**Non, elles ne changent pas de la même façon.**
- La **fermeture de dépendances** est **invariante** : elle reste {A, J, F, M, V, E, N}. Elle est déterminée par R03 + P02, que la variante ne modifie pas.
- Les **décisions** changent **localement, pour un seul objet (N)** : conservation passe de « purge » à « conservation en enclave d'audit » ; l'interdiction opérationnelle, elle, reste identique.

Autrement dit : la variante déplace une **décision de conservation** sans toucher la **structure de dépendance**. Confondre les deux serait l'erreur de raisonnement que le dossier cherche précisément à éviter (c'est le même piège que P04, où l'équipe croit que « ce n'est qu'un vecteur » suffit à sortir V de la fermeture).

---

## Q3 — Clés et sauvegardes (inchangé)

**Inchangé par la variante** (R04, P03, P04 non touchés).

Supprimer kA du coffre courant **ne prouve pas** une suppression cryptographique, car :
1. **K-old subsiste** dans le coffre de reprise, avec les enveloppes de kA et kJ (P03).
2. La sauvegarde S contient A, B, J, E dans des objets séparés avec clés de données séparées ; une enveloppe ancienne + une clé maîtresse encore récupérable ⇒ la clé de données de A est **récupérable** (R04).
3. Donc A reste **accessible** au sens de R04 : « inaccessible seulement si aucune clé ou enveloppe encore récupérable ne permet de le déchiffrer ».

**Procédure vérifiable :**
1. Inventorier **toutes** les enveloppes et clés maîtresses (coffre courant + coffre de reprise + sauvegardes).
2. Pour chaque objet de la fermeture, tenter une **preuve de non-déchiffrabilité** : détruire/retirer les enveloppes *et* les clés maîtresses qui les déchiffrent, puis vérifier par test de déchiffrement que l'objet est illisible.
3. Consigner le résultat dans un reçu (R07) : identifiant opaque, classes d'objets, statut — **sans** réintroduire le texte de A.
4. Déclarer les copies exportées hors périmètre (R07) : leur existence est déclarée, pas niée.

Tant que K-old et les enveloppes de S existent, la suppression de kA au coffre courant est **cosmétique**.

---

## Q4 — P05 : le bloc mixte X (inchangé)

**Inchangé par la variante** (R06, P05 non touchés).

P05 exige simultanément : (i) inaccessibilité de **toute** information A dans X, et (ii) conservation **utilisable exacte** de **toute** information B dans X, sans modifier le format ni disposer d'une autre copie. X est un objet chiffré unique, clé unique, contenus A et B **mélangés**.

**Démonstration d'impossibilité :** le format ne permet aucun découpage (P05). Or toute opération qui rend A inaccessible (destruction de la clé, écrasement, brouillage) rend **ipso facto** B inaccessible, puisque A et B partagent le même objet et la même clé. Inversement, conserver B utilisable conserve A accessible. Les deux exigences sont **contradictoires** dans ce format : il n'existe aucune opération satisfaisant (i) ∧ (ii).

**Conclusion : P05 ne peut pas être satisfait.** On ne peut pas invoquer « anonymiser » (aucune transformation anonymisante n'est fournie, R03/R06). La seule issue honnête est de **déclarer l'impossibilité** et de choisir explicitement : soit détruire X (perte de B, à compenser par une autre source — inexistante ici), soit conserver X en quarantaine d'audit (A reste accessible, donc non conforme à (i)). Le dossier doit **refuser de promettre** la double satisfaction.

---

## Q5 — Restauration sûre (impact mineur de la variante)

**R05, R06, P06 gouvernent ; la variante n'y touche pas**, mais elle ajoute une nuance sur N.

**Ordre de dépendances pour la remise en service :**
1. **Registre de retraits/gels d'abord** (R05) : répliqué indépendamment, numéro de politique monotone. On le consulte **avant** toute remise en service.
2. **Sources propres à B et C** : récupérables séparément (R06), hors fermeture → remises en service.
3. **Objets de la fermeture** : A, J, F, M, V, E, N restent bloqués tant que le registre n'est pas à jour.
4. **E et N** : placés dans l'enclave d'audit (N grâce à la variante), sans usage opérationnel.

**Politique si le registre est indisponible (R05) :** les données protégées restaurées restent **en quarantaine** ; le produit sert un **écran neutre**. On ne publie **jamais** avant d'avoir le numéro de politique courant — c'est exactement l'erreur de P06 (publier d'abord, « rejouer les retraits quand la file aura rattrapé »).

**Moteur de recherche :** V est purgé de l'index ; l'index est reconstruit depuis entrées autorisées. Tant que la reconstruction n'est pas prouvée, la recherche ne renvoie rien issu de la fermeture.

**Modèle M :** aucune méthode d'oubli exact n'existe (R06) → **suspendre M** et servir un **service sans recommandation**. Ne pas prétendre avoir « retiré » l'influence de A.

**Nuance variante :** N étant conservé en enclave, il ne doit **pas** alimenter le moteur ni M. La restauration doit vérifier que N n'est pas réinjecté dans un pipeline opérationnel.

---

## Q6 — Certificat, branche B, tests falsifiants

**Certificat de suppression — limites :**
- Il atteste des **classes d'objets traitées** et un **statut**, pas l'effacement du contenu (R07).
- Il **ne couvre pas** les copies exportées hors périmètre (déclarées, pas niées).
- Il **ne prouve pas** l'oubli d'influence dans M (impossible, R06).
- Il **ne peut pas** certifier P05 (impossible, Q4).
- Il doit distinguer « rendu inutilisable » de « supprimé » : un objet dont une clé reste récupérable n'est pas supprimé (R04).

**Branche de service utile pour B :** B et C sont hors fermeture → service maintenu. J et F dépendent de A : seule la **part B** est récupérable ; on reconstruit F depuis C (+ J reconstruit sans A si possible). M suspendu → service sans recommandation. Le service légitime de B est **préservé sans ressusciter A**.

**Tests falsifiant une restauration « saine » :**
1. **Test de régression de politique :** restaurer une sauvegarde antérieure à K3 et vérifier que le numéro de politique **ne recule pas** (R05). Échec = restauration non sûre.
2. **Test de déchiffrabilité :** tenter de déchiffrer A via K-old + enveloppes de S. Succès = suppression cryptographique **non** prouvée (R04).
3. **Test d'index :** interroger le moteur avec un terme propre à A ; toute réponse issue de la fermeture = échec.
4. **Test de fuite par dérivé :** vérifier que N (variante) et E ne sont **pas** réinjectés dans un pipeline opérationnel ni dans M.
5. **Test bitemporel :** rejouer Q1a et Q1b ; si la table « dernière ligne » écrase K1, Q1a devient irrépondable → échec (P07).
6. **Test P05 :** vérifier qu'aucune opération ne prétend satisfaire simultanément (i) et (ii) sur X ; toute revendication contraire est fausse.

---

## Synthèse de la variante

| Élément | Dossier de base | Variante R02 |
|---|---|---|
| Fermeture de dépendances | {A, J, F, M, V, E, N} | **identique** |
| Décision sur N (conservation) | purge | **conservation en enclave d'audit** |
| Décision sur N (opérationnel) | interdite | interdite (inchangée) |
| Décisions A, J, F, M, V, E | — | **inchangées** |
| Effet en cascade | — | **nul** (N sans dérivé) |
| Q1, Q3, Q4, Q5, Q6 | — | **inchangés** (sauf mention de N en enclave) |

**Réponse finale à la question :** la fermeture de dépendances et les décisions **ne changent pas de la même façon**. La fermeture est **invariante** (fait structurel, R03 + P02) ; les décisions changent **localement et uniquement pour N** (acte de politique, R02). La variante déplace une décision de conservation sans altérer la structure de dépendance — et sans effet en cascade, puisque N n'a aucun dérivé.