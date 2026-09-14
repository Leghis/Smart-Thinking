# SIII-04 — La sauvegarde qui ressuscite les interdits

Score: 91.0 % (certificats 0/0, juge 91/100)

Certificats manqués: aucun

Toutes les exigences sont couvertes. Je rédige la réponse finale.

## Réponse

### Q1 — Représentation bitemporelle de P01 et questions de P07

**Modèle (R01).** Chaque assertion est une ligne `(sujet, objet, valid_from, valid_to, know_from, know_to)`. Les instants sont des repères logiques ordonnés : V1 < K1 < K2 < K3.

| Ligne | Assertion | Validité (monde) | Connaissance (base) |
|---|---|---|---|
| L1 | AX → A | [V1, K2) | [K1, K2) |
| L2 | AX → B | [V1, +∞) | [K2, +∞) |

La correction reçue à K2 **ferme** L1 en validité (valid_to = K2) et en connaissance (know_to = K2), et **ouvre** L2. On ne réécrit jamais L1 : on l'invalide par fermeture d'intervalle, ce qui préserve ce que le système savait avant K2.

**Réponses séparées (P07)** — évaluées par `compute` (intersection validité ∩ connaissance) :

- « À V1, à qui AX est-il attribué **selon ce que l'on savait à K1** ? » → **A** (seule L1 est visible à K1).
- « À V1, à qui AX est-il attribué **selon la connaissance de K2** ? » → **B** (L1 est close en connaissance à K2 ; seule L2 est visible).
- **Vérité courante du dossier à K3** → **B**.

**Distinction établie :** la *vérité courante* (validité) dit B ; la *connaissance historique* dit qu'à K1 le système croyait A. La table « dernière ligne seulement » du développeur (P07) est **réfutée** : elle ne peut pas répondre à la première question, car elle écrase la connaissance K1.

### Q2 — Fermeture des dépendances et décisions par objet

Graphe garanti (P02) : J←{A,B} ; F←{J,C} ; M←{F,B} ; V←{A} ; E←{A} ; N←{E}. Fermeture transitive (`compute`) : **objets dépendant de A = {E, F, J, M, N, V}**. B et C **ne dépendent pas** de A.

| Objet | Dépend de A ? | Décision opérationnelle | Conservation | Reconstruction |
|---|---|---|---|---|
| A | source | **Interdit** (R02) | Non (hors E) | Non |
| J | oui (A,B) | Interdit | Non | Non (dépend de A) |
| V | oui (A) | **Index purgé** | Non | Non (dépend de A) |
| F | oui (via J) | Interdit | Non | Non (dépend de A) |
| M | oui (via F) | **Suspendu** | Non | Non (pas d'oubli exact, R06) |
| E | oui (A) | Interdit en opérationnel | **Oui, enclave audit seule** | Non |
| N | oui (via E) | Interdit | Non | Non (E ne blanchit pas, R03) |
| B | non | **Autorisé** | Oui | Oui |
| C | non | **Autorisé** | Oui | Oui |

**Invariant (R03) :** un objet dépendant de A est concerné ; l'exception E ne blanchit pas N. Aucune preuve d'anonymisation n'étant fournie, ni empreinte, ni vecteur, ni modèle ne devient anonyme par son nom.

### Q3 — Clés et sauvegardes

**Pourquoi supprimer kA au coffre courant ne prouve rien.** Chaîne de récupération (`compute`) :

`K-old (coffre de reprise, présent)` → `enveloppe de kA (présente dans S)` → `kA récupérable` → `objet A dans S déchiffrable`.

Tant que K-old et l'enveloppe de kA subsistent, kA est **récupérable** : la suppression au coffre courant est une suppression *d'usage*, pas une suppression *cryptographique* (R04). En revanche F, M, V, N ont des clés **indépendantes de kA** : leur inaccessibilité ne peut pas être obtenue par la seule destruction de kA.

**Procédure vérifiable (dans ce modèle) :**
1. **Inventaire exhaustif** des enveloppes et clés maîtresses (aucune copie non inventoriée n'est ajoutée au modèle, R04).
2. **Test de récupération** : tenter de reconstruire kA depuis K-old + enveloppe de S ; si succès → kA non supprimée.
3. **Destruction** de K-old et des enveloppes de kA (et kJ) dans S, puis rotation des clés de données.
4. **Test négatif** : vérifier qu'aucune clé/enveloppe récupérable ne déchiffre plus les objets de A.
5. **Reçu minimal** (R07) : identifiant opaque, classes d'objets, statut — sans texte de A.

### Q4 — P05 : démonstration d'insatisfiabilité

X est **un seul objet chiffré, une seule clé**, contenus A et B mélangés, sans découpage ni autre copie. Les deux exigences du produit sont :
- (i) inaccessibilité de **toute** information A de X ;
- (ii) conservation **utilisable exacte** de **toute** information B de X.

Énumération exhaustive des états de X (`compute`) :

| État de X | (i) A inaccessible | (ii) B utilisable | Satisfait |
|---|---|---|---|
| déchiffrable | non | oui | **non** |
| non déchiffrable | oui | non | **non** |

**Aucun état ne satisfait les deux** : les contraintes sont **complémentaires** sur un support de déchiffrement atomique. **P05 est insatisfiable** dans le modèle fermé (R04, R06). Ce n'est pas un slogan d'anonymisation : c'est une impossibilité structurelle. La seule issue honnête est de **déclarer** l'impossibilité et de choisir explicitement une branche (garder X inutilisable, ou conserver B en assumant l'accessibilité de A), sans promettre une suppression sélective que le format ne permet pas.

### Q5 — Restauration sûre

**Ordre de dépendances (tri topologique + R05) :**
0. **Vérifier le registre de retraits/gels** (numéro de politique monotone) **avant** remise en service.
1. Restaurer les **sources propres B et C**.
2. Reconstruire les **dérivés autorisés** depuis B, C.
3. **Quarantaine** : J, F, M, V, E, N (tous dépendants de A).

**Politique si le registre est indisponible (R05) :** les données protégées restaurées restent **en quarantaine** ; le produit sert un **écran neutre**. Le numéro de politique ne doit **jamais régresser** ; une restauration antérieure à K3 (P06) ne doit pas réintroduire l'ancienne table d'autorisation de A.

**Moteur de recherche :** V dépend de A → **index purgé, non reconstruit** ; aucune réintroduction de A dans le moteur public.

**Modèle M :** **suspendu** ; service **sans recommandation** (R06). Aucune méthode d'oubli exact d'influence n'étant fournie, on ne prétend pas « dé-entraîner » M.

**Correction de P06 :** publier d'abord puis « rejouer les retraits plus tard » est **réfuté** — c'est exactement la régression interdite par R05. L'ordre correct est : registre → quarantaine → sources autorisées → dérivés.

### Q6 — Limites du certificat, branche de service pour B, tests falsifiants

**Limites du certificat de suppression :**
- Ne prouve pas l'absence de **copies exportées hors périmètre** (R07) : leur existence doit être **déclarée, pas niée**.
- Ne prouve pas l'absence de **copies non inventoriées** (hors modèle R04).
- Ne prouve pas l'**oubli exact d'influence dans M** déjà entraîné (R06).
- Ne prouve pas l'effacement de **X** (P05 insatisfiable).

**Branche de service utile pour B :** restaurer B et C, reconstruire les dérivés autorisés depuis B/C, servir recherche et recommandation **sans** les composantes issues de A (V purgé, M suspendu ou remplacé par un service neutre). Les services légitimes de B sont conservés sans promettre une suppression sélective impossible.

**Tests falsifiant une restauration qui paraît saine :**

| Test | Falsifie si… |
|---|---|
| T1 : restaurer S, tester la déchiffrabilité de A | kA récupérable via K-old → A lisible |
| T2 : comparer le numéro de politique avant/après | le numéro régresse (viole R05) |
| T3 : interroger le moteur sur un terme de A | V restauré → A réapparaît |
| T4 : vérifier que M ne sert pas de recommandation | M actif → influence de A persistante |
| T5 : vérifier que N n'est pas reconstruit depuis E | N présent → E blanchit un dérivé (viole R03) |
| T6 : inspecter le reçu | texte de A présent (viole R07) |

## Preuves et certificats

- **Q1** : `compute` → `{"K1":["A"],"K2":["B"],"K3":["B"]}` (évaluation par intervalles validité × connaissance).
- **Q2** : `compute` → `objets_dependant_de_A=[E,F,J,M,N,V]`, B/C = false (fermeture transitive).
- **Q3** : `compute` → chaîne K-old → enveloppe_kA → kA → A déchiffrable ; F,M,V,N clés indépendantes.
- **Q4** : `compute` → `{dechiffrable:false, non_dechiffrable:false}`, `existe_solution=false` (énumération exhaustive des 2 états).
- **Q5** : `compute` → ordre registre→B,C→dérivés ; quarantaine {J,F,M,V,E,N}.
- **Q6** : `compute` → tests T1–T6 et 4 limites.

## Pièges traités

- **Confondre validité et connaissance** : traité (Q1) — la table « dernière ligne » est réfutée.
- **Croire qu'un nom rend anonyme** : réfuté (R03) — V, M, N restent concernés.
- **Croire qu'une suppression de clé = suppression cryptographique** : réfuté (Q3, chaîne K-old).
- **Croire qu'une pièce gelée blanchit ses dérivés** : réfuté (E ne blanchit pas N).
- **Croire qu'on peut « anonymiser » X** : réfuté (Q4, insatisfiable).
- **Publier avant de rejouer les retraits** : réfuté (P06, viole R05).
- **Nier les copies exportées** : interdit (R07) — déclarer, pas nier.

## Limites / impossibilités

- **P05 est insatisfiable** : aucune solution ne satisfait simultanément A-inaccessible et B-utilisable sur X atomique.
- **Pas d'oubli exact dans M** : le modèle doit être suspendu, pas « nettoyé ».
- **Copies hors périmètre et non inventoriées** : hors du modèle de maîtrise ; déclarées, non niées.
- **Statut épistémique** : *établi* = Q1, Q2, Q3, Q4, Q5, Q6 (démontrés par énumération/fermeture) ; *réfuté* = table dernière-ligne, anonymisation de X, suppression cryptographique par kA, blanchiment de N par E, publication avant retraits ; *non déterminé* = existence de copies exportées hors organisation (hors modèle).