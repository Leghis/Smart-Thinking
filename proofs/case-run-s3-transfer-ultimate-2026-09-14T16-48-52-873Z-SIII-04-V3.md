# SIII-04-V3 — SIII-04 → Toutes les clés A détruites

Score: 100.0 % (certificats 0/0, juge 100/100)

Certificats manqués: aucun

Toutes les affirmations sont certifiées. Je peux maintenant rédiger la réponse finale.

---

# Réponse à la variante : « La suppression opérationnelle complète est-elle prouvée ? »

## Réponse directe

**Non.** La variante ne prouve pas la suppression opérationnelle complète. Elle prouve seulement une chose plus étroite — l'inaccessibilité de la **ligne brute A** — et échoue sur trois fronts cumulatifs :

1. **Elle conserve des dérivés de A en usage** (F, M, V, N), ce qui viole frontalement R02 et R03.
2. **Le bloc X (P05) rend impossible la suppression de *tous* les chemins de déchiffrement de A** sans détruire B.
3. **Le certificat de suppression ne peut pas être total** (copies exportées hors périmètre, R07).

Autrement dit : la variante modifie bien l'hypothèse P04 (au lieu de laisser K-old et les enveloppes, on détruit réellement les chemins de déchiffrement de A), mais elle **conserve l'hypothèse fautive de P04** — garder V, M, N « parce que ce n'est qu'un vecteur / il ne contient pas les lignes / il provient d'une pièce gelée ». Or c'est précisément cette hypothèse que R03 invalide. La variante est donc **interne au dossier** : elle ne peut pas être cohérente avec R02/R03.

---

## Q1 — Représentation bitemporelle de P01 et les deux questions de P07

**Modèle (R01).** Chaque assertion porte deux intervalles : validité (monde décrit) et connaissance (base). Instants logiques : V1 < K1 < K2 < K3.

| Assertion | Validité | Connaissance | Contenu |
|---|---|---|---|
| a₁ | [V1, →) | [K1, K2) | « AX appartient à A » |
| a₂ | [V1, →) | [K2, →) | « AX appartient à B » |

À K2, la correction **remplace la validité courante** de a₁ (elle ne l'efface pas : elle la clôt en connaissance). La ligne a₁ reste lisible *telle que connue à K1*.

**Réponses séparées (P07) :**

- **« À V1, à qui AX est attribué selon ce que l'on savait à K1 ? »** → **A**. On interroge la base *telle qu'elle était à K1* : seule a₁ est connue, et V1 ∈ [V1,→). Réponse : A.
- **« À V1, à qui AX est attribué selon la connaissance de K2 ? »** → **B**. On interroge la base *telle qu'elle était à K2* : a₂ est connue et couvre V1. Réponse : B.

**Vérité courante du dossier vs connaissance historique.** La *vérité courante* (aujourd'hui) est B. La *connaissance historique* à K1 était A — et cette connaissance ne doit pas être réécrite (R01 : « elle ne doit pas changer ce que le système savait auparavant »). La table « dernière ligne seulement » du développeur (P07) **détruit la dimension connaissance** : elle ne peut répondre qu'à la seconde question et rend la première non calculable. C'est une régression de traçabilité, pas une simplification.

---

## Q2 — Fermeture des dépendances et décisions par objet

**Fermeture transitive (R03, graphe P02, calcul exact) :**

| Objet | Entrées | Fermeture | Concerné par A ? |
|---|---|---|---|
| A | — | ∅ | (source) |
| J | A, B | {A,B} | **oui** |
| V | A | {A} | **oui** |
| F | J, C | {A,B,C,J} | **oui** |
| M | F, B | {A,B,C,F,J} | **oui** |
| E | A | {A} | **oui** (gel d'audit) |
| N | E | {A,E} | **oui** |
| B | — | ∅ | non |
| C | — | ∅ | non |

**Point décisif :** F, M, V, N sont tous des **dérivés de A**. R03 est explicite : « un objet qui dépend de A doit être traité comme concerné » et « l'exception E ne blanchit pas ses dérivés » — donc **N est concerné malgré E**. Le raisonnement de P04 (« ce n'est qu'un vecteur », « il ne contient pas les lignes ») est réfuté par R03 : sans preuve de transformation anonymisante fournie au dossier, un vecteur ou un modèle **ne devient pas anonyme par son nom**.

**Décisions (dossier de base, R02) :**

| Objet | Décision opérationnelle | Conservation | Reconstruction |
|---|---|---|---|
| A | interdite | supprimer (hors E) | non |
| J | interdite | supprimer | reconstruire depuis B,C si utile |
| V | interdite (purger l'index) | supprimer | reconstruire depuis entrées autorisées |
| F | interdite | supprimer | reconstruire depuis J(B,C) autorisés |
| M | interdite (suspendre) | supprimer | réentraîner depuis F,B autorisés |
| E | interdite hors enclave | **conserver** (enclave enquêteurs) | — |
| N | interdite | supprimer | reconstruire depuis E (enclave) |
| B, C | autorisée | conserver | — |

**Dans la variante**, on conserve F, M, V, N **utilisables** : c'est exactement l'usage opérationnel de dérivés de A que R02 interdit à K3. La variante **contredit donc R02/R03** — elle ne peut pas être « prouvée » puisqu'elle est normativement illégale dans le dossier.

---

## Q3 — Clés et sauvegardes : pourquoi supprimer kA ne prouve rien

**Pourquoi la suppression de kA au coffre courant ne prouve pas la suppression cryptographique (R04) :**

- Un objet chiffré n'est inaccessible **que si aucune clé/enveloppe récupérable ne permet de le déchiffrer** (R04).
- P03 : la sauvegarde S contient A, B, J, E avec des clés de données séparées, et **les enveloppes de kA et kJ existent sous K-old conservée dans le coffre de reprise**. Tant que K-old existe, on peut **récupérer la clé de données de A** → A reste déchiffrable. Supprimer kA du coffre courant ne détruit donc pas le chemin de déchiffrement.
- **Dans la variante**, on supprime *réellement tous les chemins de déchiffrement de A* (kA, K-old, enveloppes de S). Alors A devient inaccessible — **mais cela ne suffit pas** : F, M, V, N ont leurs **propres clés sans dépendance cryptographique à kA** (P03). Détruire kA ne les rend pas inaccessibles. La suppression cryptographique de A **ne propage pas** aux dérivés.

**Procédure vérifiable (dans ce modèle) :**

1. **Inventaire exhaustif des chemins de déchiffrement** de A : kA, K-old, enveloppes de S, toute copie de clé listée (R04 : pas de copie non inventoriée ajoutée au modèle).
2. **Destruction effective** de chaque chemin, avec preuve de destruction (pas seulement retrait d'index).
3. **Test de non-déchiffrabilité** : tentative de déchiffrement de chaque objet contenant A → doit échouer.
4. **Fermeture des dérivés** : pour chaque dérivé (J, V, F, M, N), soit destruction, soit reconstruction depuis entrées autorisées (R06). Un dérivé conservé **doit** être prouvé non concerné — impossible ici sans transformation anonymisante (R03).
5. **Registre non régressif** (R05) : numéro de politique monotone, consulté avant remise en service.
6. **Reçu minimal** (R07) : identifiant opaque, classes traitées, statut — sans réintroduire le texte de A.

---

## Q4 — P05 est-il satisfiable ?

**Non, démonstration par contradiction.**

Hypothèses : X = un seul objet chiffré, **une seule clé**, contenant A et B mélangés ; aucun découpage ni reconstruction de la partie B possible ; aucune transformation anonymisante disponible (R03) ; format non modifiable, pas d'autre copie.

Exigences simultanées : (i) **inaccessibilité de toute information A de X** ; (ii) **conservation utilisable exacte de toute information B de X**.

- Si on **détruit la clé de X** → (i) satisfaite, mais B devient inaccessible → (ii) violée.
- Si on **garde la clé de X** → (ii) satisfaite, mais A reste déchiffrable → (i) violée.

Il n'existe pas de troisième option : sans transformation anonymisante (interdite par R03) et sans découpage (impossible par P05), les deux exigences sont **mutuellement exclusives**. L'ensemble des solutions est **vide**. Répondre « anonymiser » est un slogan : aucune telle transformation n'est fournie au dossier, et R03 interdit de la présumer.

**Conséquence pour la variante :** même en supprimant « tous les chemins de déchiffrement de A », **X reste un chemin de déchiffrement de A** (clé partagée avec B). On ne peut donc pas supprimer *tous* les chemins de A sans perdre B. La prémisse de la variante est **auto-contradictoire** dès qu'on inclut X.

---

## Q5 — Restauration sûre, ordre de dépendances, registre indisponible, moteur et modèle

**Ordre de dépendances (R05, R06) :**

1. **Registre de retraits/gels d'abord** : répliquer indépendamment, vérifier le **numéro de politique monotone**. Ne jamais restaurer des données protégées avant d'avoir le registre à jour.
2. **Sources propres à B et C** (récupérables séparément, R06) — sauf bloc mixte X.
3. **Reconstruire J, F** depuis B, C autorisés.
4. **Réentraîner M** depuis F, B autorisés (R06 : aucune méthode d'oubli exact d'influence dans M déjà entraîné → on **suspend** M et on sert un service sans recommandation).
5. **Reconstruire V** depuis entrées autorisées ; **purger l'index** de recherche.
6. **E** : uniquement dans l'enclave d'audit ; **N** reconstruit depuis E, jamais exposé en opérationnel.

**Politique si le registre est indisponible (R05) :** les données protégées restaurées **restent en quarantaine** ; le produit sert un **écran neutre**. On ne publie jamais avant d'avoir le numéro de politique courant.

**Traitement du moteur et de M :** suspendre M (pas d'oubli exact disponible) ; purger l'index de recherche de V ; servir sans recommandation jusqu'à reconstruction depuis entrées autorisées.

**Erreur de P06 :** publier d'abord puis « rejouer les retraits quand la file aura rattrapé » **régresse** le numéro de politique (R05) et réintroduit A via l'ancienne table d'autorisation. C'est une restauration **non sûre** : l'ordre est inversé.

---

## Q6 — Limites du certificat, branche utile pour B, tests falsifiants

**Limites d'un certificat de suppression (R07) :**
- Il ne peut **pas** prouver l'absence de copies exportées hors périmètre : leur existence doit être **déclarée, pas niée**.
- Il ne peut **pas** prouver l'absence de dérivés non inventoriés (R04 : pas de copie non inventoriée ajoutée au modèle — mais c'est une hypothèse, pas une preuve).
- Il ne peut **pas** couvrir X (P05) : A y reste tant que la clé partagée existe.
- Conserver un reçu **n'autorise pas** à conserver le contenu supprimé.

**Branche de service utile pour B :** B et C ne dépendent pas de A → service de recommandation/recherche **reconstruit sur B, C** (et F, M réentraînés depuis entrées autorisées) reste pleinement légitime. C'est la branche à préserver.

**Tests falsifiant une restauration qui paraît saine :**
1. **Test de régression de politique** : le numéro de politique restauré est-il ≥ au courant ? Sinon → quarantaine.
2. **Test de déchiffrabilité de A** : tenter de déchiffrer A via K-old/enveloppes de S → doit échouer.
3. **Test de dérivés** : tenter d'utiliser V, M, N en opérationnel → doit être bloqué (sinon violation R02/R03).
4. **Test X** : vérifier qu'aucune clé ne permet de lire A dans X sans perdre B → confirme l'insatisfiabilité.
5. **Test d'écran neutre** : registre coupé → le produit ne sert aucune donnée protégée.

---

## Conclusion sur la variante

**La suppression opérationnelle complète n'est pas prouvée**, pour trois raisons cumulatives :

1. **Dérivés conservés** : F, M, V, N dépendent transitivement de A (fermeture calculée) et sont maintenus utilisables → violation directe de R02/R03. La variante est **normativement incohérente** avec le dossier.
2. **Bloc X** : clé unique partagée A+B → impossible de supprimer *tous* les chemins de déchiffrement de A sans perdre B (P05 insatisfiable). La prémisse « tous les chemins de A » est **auto-contradictoire**.
3. **Certificat borné** : copies exportées hors périmètre et dérivés non inventoriés ne peuvent être niés (R07/R04).

Ce qui **est** prouvable dans la variante : l'**inaccessibilité de la ligne brute A** (si kA, K-old et enveloppes de S sont réellement détruits). Ce qui **ne l'est pas** : la suppression opérationnelle complète au sens de R02, qui exige que **tout dérivé de A** soit rendu inutilisable, purgé et reconstruit — or la variante conserve précisément F, M, V, N.

**Recommandation :** la variante doit être rejetée telle quelle. La seule version cohérente est celle du dossier de base : détruire les chemins de déchiffrement de A **et** traiter F, M, V, N comme concernés (purge + reconstruction depuis entrées autorisées), suspendre M, purger l'index de V, conserver E en enclave, et déclarer X comme **impossible à satisfaire** plutôt que de promettre une suppression sélective que le format ne permet pas.