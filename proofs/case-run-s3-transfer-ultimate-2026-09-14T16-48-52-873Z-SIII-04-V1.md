# SIII-04-V1 — SIII-04 → Exception étendue explicitement

Score: 88.0 % (certificats 0/0, juge 88/100)

Certificats manqués: aucun

Les vérifications sont faites. Je rédige la réponse complète.

---

# Réponse — Variante « N rejoint l'exception d'audit »

**Réponse directe à la question posée :** **Non.** La fermeture de dépendances et les décisions ne changent **pas de la même façon**. La fermeture est un objet **structurel** (elle ne dépend que de P02 et R03) : elle est **strictement invariante** sous la variante. Les décisions sont des objets **normatifs** (elles dépendent de R02) : elles changent, mais **d'une seule ligne** — le régime de N. Autrement dit : *la variante déplace une décision sans toucher la structure, et elle ne déplace qu'une décision, pas l'ensemble.*

---

## Q1 — Représentation bitemporelle de P01 et les deux questions de P07

**Modèle à deux axes (R01).** Chaque assertion porte un couple (intervalle de validité monde, intervalle de connaissance base). Les instants sont des repères logiques : V1 < K1 < K2 < K3.

| Assertion | Validité (monde) | Connaissance (base) | Statut |
|---|---|---|---|
| AX appartient à A | [V1, →) | [K1, K2) | remplacée à K2 |
| AX appartient à B | [V1, →) | [K2, →) | courante |

Le point crucial : la correction reçue à K2 porte sur une **validité ancienne** (V1). Elle **corrige le monde** mais **ne réécrit pas l'histoire de la base** : ce que le système savait à K1 reste vrai *en tant que connaissance*.

**Réponses séparées (P07) :**

- **Q1 — « À V1, à quel A/B AX est-il attribué selon ce que l'on savait à K1 ? »** → **AX appartient à A.** On interroge la validité V1 *avec la connaissance disponible à K1* : seule l'assertion AX→A était connue.
- **Q2 — « À V1, à quel A/B AX est-il attribué selon la connaissance de K2 ? »** → **AX appartient à B.** Même instant de validité (V1), mais connaissance postérieure : l'assertion AX→B est connue et remplace la validité courante.

**Vérité courante du dossier vs connaissance historique.** La *vérité courante* (ce qui vaut maintenant, à K3) est AX→B. La *connaissance historique* est une fonction du temps de connaissance : à K1 on « croyait » AX→A, à K2 on « sait » AX→B. Les deux réponses coexistent sans contradiction : elles diffèrent par l'axe de connaissance, pas par l'axe de validité.

**Pourquoi la table « dernière ligne seulement » échoue.** Elle projette sur l'axe de validité en écrasant l'axe de connaissance : elle ne peut produire que la réponse courante (AX→B) et **rend Q1 non calculable**. Elle détruit précisément l'information qui distingue « ce qu'on savait » de « ce qui est vrai ». C'est une perte de la dimension connaissance, donc une violation de R01.

---

## Q2 — Fermeture des dépendances et décisions

**Fermeture (calcul structurel, P02 + R03).** Objets dépendant transitivement de A :

**{A, J, F, M, V, E, N}** — non concernés : **{B, C}**.

Chaîne : A → J → F → M ; A → V ; A → E → N. (Vérifié par fermeture transitive.)

**Point clé de la variante :** cette fermeture est **identique** dans le dossier de base et dans la variante. R02 est une règle de *décision*, pas de *structure* ; la modifier ne retire ni n'ajoute aucune arête. N reste **dans** la fermeture (il dépend toujours de A via E) : l'exception d'audit ne le « dé-concerne » pas, elle change seulement son **régime**.

**Décisions par objet** (colonne « base » = dossier de base ; colonne « variante » = ce qui change) :

| Objet | Opérationnel | Conservation | Reconstruction | Δ variante |
|---|---|---|---|---|
| **A** | Interdit (R02) | Non (hors E) | Non reconstruit | — |
| **J** | Inutilisable, purge | Non | Impossible à l'identique (dépend de A **et** B) ; seule la part B est récupérable | — |
| **F** | Inutilisable, purge | Non | Reconstruit **uniquement** depuis entrées autorisées (C, et B) ; la branche A est abandonnée | — |
| **M** | Suspendu (R06) | Non | Réentraîné depuis F/B autorisés ; pas d'oubli exact disponible | — |
| **V** | Purge de l'index | Non | Reconstruit depuis sources autorisées (pas de A) | — |
| **E** | Interdit | **Conservé — enclave audit** | Depuis A (gelé) | — |
| **N** | Interdit | **Base : non conservé** → **Variante : conservé — enclave audit** | Base : — ; Variante : reconstruit depuis E (gelé) | **← seul changement** |

**Réponse à la question :** la fermeture ne bouge pas ; **une seule décision** bouge (N). Les décisions ne changent donc **pas** « de la même façon » que la fermeture — elles changent de façon **ciblée et non uniforme**.

**Cohérence avec R03.** R03 dit « l'exception E ne blanchit pas ses dérivés » : le gel de E ne rend pas N gelé *par dérivation*. La variante **ne viole pas** R03, car elle **nomme N explicitement** comme bénéficiaire — c'est une extension explicite de la liste des pièces gelées, non un blanchiment automatique. N reste un dérivé concerné ; il est simplement placé sous le même régime que E.

---

## Q3 — Clés et sauvegardes : pourquoi supprimer kA ne prouve rien

**Pourquoi ce n'est pas une preuve de suppression cryptographique (R04).** Supprimer la ligne A et la clé kA du **coffre courant** ne rend pas A inaccessible, car :
1. **S contient A** dans un objet séparé, avec sa **clé de données séparée** ;
2. l'**enveloppe de kA** existe sous l'**ancienne clé maîtresse K-old**, conservée dans le coffre de reprise ;
3. **K-old existe encore** → l'enveloppe est déchiffrable → la clé de données de A est récupérable → **A est accessible**.

Règle R04 : un objet chiffré n'est inaccessible que si **aucune clé ou enveloppe encore récupérable** ne permet de le déchiffrer. Ici une telle enveloppe subsiste. Donc la suppression est **apparente**, pas effective. (Aucun attaquant externe ni copie non inventoriée n'est ajouté au modèle : le problème est purement interne.)

**Procédure vérifiable (dans ce modèle) :**
1. **Inventaire exhaustif** des enveloppes et clés maîtresses (coffre courant **et** coffre de reprise) référençant kA, kJ, et toute clé de données de S.
2. **Destruction cryptographique** : supprimer/écraser K-old **et** toutes les enveloppes de kA (et kJ si J doit être neutralisé), puis **rotation** de la clé maîtresse.
3. **Test de non-récupération** : tenter le déchiffrement de chaque objet de S avec l'ensemble des clés restantes → doit **échouer** pour A. C'est le certificat.
4. **Vérification d'absence de dépendance cryptographique** : confirmer que F, M, V, N ont leurs propres clés **sans dépendance à kA** (P03) — donc leur neutralisation relève de la purge logique, pas de la clé.
5. **Reçu (R07)** : identifiant opaque, classes d'objets traitées, statut — **sans** réintroduire le texte de A.

**Limite honnête :** la destruction cryptographique ne couvre que les copies **inventoriées**. Les copies exportées hors organisation sont **hors du modèle de maîtrise** : elles doivent être **déclarées**, pas niées (R07).

---

## Q4 — P05 est-il satisfiable ? Non.

**Énoncé du bloc X :** un **seul** objet chiffré, une **seule** clé, contenant A et B **mélangés**. Exigences simultanées : (i) **inaccessibilité de toute information A** de X ; (ii) **conservation utilisable exacte de toute information B** de X ; sans modifier le format, sans autre copie.

**Démonstration d'impossibilité.** Soit X un objet à clé unique kX. Toute lecture de la partie B exige kX. Or kX déchiffre **tout** X, donc aussi la partie A. Donc :
- Si l'on **détruit kX** (ou rend X inaccessible) → (i) satisfaite, mais (ii) **violée** : B devient illisible.
- Si l'on **conserve kX** → (ii) satisfaite, mais (i) **violée** : A reste lisible.

Il n'existe pas de troisième état : le format ne permet **aucun découpage** (pas de granularité par enregistrement), et **aucune copie** alternative n'existe. La seule transformation qui séparerait A de B serait une **transformation anonymisante** — or R03 exige une **preuve** d'anonymisation, et **aucune n'est fournie** ; de plus P05 interdit de modifier le format. Donc **P05 est contradictoire : impossible à satisfaire.**

**Conséquence normative.** On ne peut pas promettre la satisfaction simultanée. Il faut **choisir et déclarer** : soit X reste **inaccessible** (A protégé, B perdu — cohérent avec R02), soit X reste **utilisable** (B conservé, A exposé — violation de R02). La branche conforme à R02 est l'**inaccessibilité**, avec **déclaration explicite** de la perte de la part B de X (R07 : déclarer, ne pas nier). Le slogan « anonymiser » est **rejeté** : aucune transformation de ce type n'est disponible dans le dossier.

---

## Q5 — Restauration sûre

**Principe (R05).** Le registre de retraits/gels est **répliqué indépendamment**, consulté **avant** remise en service, et porte un **numéro de politique monotone**. Une restauration ne doit **jamais** faire régresser ce numéro.

**Ordre de dépendances (remise en service) :**
1. **Registre de retraits/gels** — restaurer/répliquer **en premier**, vérifier le **numéro de politique** ≥ version courante.
2. **Sources propres à B et C** — récupérables séparément (R06), sans A.
3. **Dérivés autorisés** — reconstruire F (depuis C/B), puis M (réentraîné), puis V (sans A).
4. **Enclave d'audit** — E (et, en variante, N) isolés, **sans** usage opérationnel ni entraînement.
5. **Bloc X** — laissé **inaccessible** (Q4), perte de la part B déclarée.

**Politique si le registre est indisponible.** Les **données protégées restaurées restent en quarantaine** ; le produit sert un **écran neutre** (R05). On **ne publie pas** avant d'avoir le registre : c'est exactement l'erreur de P06 (publier d'abord, « rejouer les retraits plus tard »).

**Traitement du moteur de recherche et de M.**
- **V (recherche)** : purgé de l'index ; reconstruit **sans A**. Tant que la purge n'est pas prouvée, l'index reste **désactivé**.
- **M (modèle)** : **suspendu** (R06) — aucune méthode d'oubli exact d'une influence n'est fournie, donc on ne peut pas « nettoyer » M en place. On sert un **service sans recommandation** jusqu'à réentraînement depuis entrées autorisées.

**Correction de P06.** La sauvegarde pré-K3 contient une **ancienne table d'autorisation** permettant A. Il faut : (a) **ne pas publier** avant réplication du registre ; (b) **appliquer les retraits/gels avant** remise en service ; (c) vérifier la **monotonie** du numéro de politique. Publier d'abord puis « rattraper la file » est une **régression** interdite par R05.

---

## Q6 — Limites du certificat, branche utile pour B, tests falsifiants

**Limites d'un certificat de suppression (R07).**
- Il **atteste un traitement**, pas une disparition : il ne prouve pas l'absence de copies **hors modèle** (exports externes) — celles-ci sont **déclarées**, pas niées.
- Il ne couvre que les objets **inventoriés** ; une copie non inventoriée invaliderait le certificat (mais R04 exclut d'en ajouter au modèle).
- Il ne peut **pas** certifier l'effacement d'une influence dans M (pas d'oubli exact, R06) : au mieux la **suspension**.
- Il ne peut **pas** certifier P05 (impossible, Q4).
- Contenu minimal : identifiant opaque, classes d'objets, statut — **sans** texte de A. Conserver le reçu **n'autorise pas** à conserver le contenu.

**Branche de service utile pour B.** B et C ne dépendent pas de A : on peut servir un **produit dégradé mais légitime** — recherche et recommandation reconstruites **sans A**, sources B/C intactes, écran neutre si le registre manque. C'est la « conservation des services légitimes de B » demandée par la mission.

**Tests falsifiant une restauration qui paraît saine :**
1. **Test de monotonie** : injecter un registre restauré avec un numéro de politique **inférieur** → la remise en service doit **échouer** (sinon régression non détectée).
2. **Test de récupération de clé** : après destruction cryptographique, tenter de déchiffrer A dans S via K-old → doit **échouer** ; s'il réussit, la suppression est fausse.
3. **Test de dépendance cachée** : vérifier que V, M, N ne réintroduisent pas A (recherche d'un alias AX, d'un vecteur dérivé de A) → toute résurgence falsifie la purge.
4. **Test d'enclave** : tenter un usage **opérationnel** ou un **entraînement** depuis E (et N en variante) → doit être **refusé** ; sinon l'exception fuit.
5. **Test de publication précoce** : simuler P06 (publier avant registre) → doit être **bloqué** par la quarantaine.
6. **Test X** : tenter de lire B depuis X tout en gardant A inaccessible → doit être **impossible** (confirme Q4).

---

## Synthèse de la variante

| Élément | Dossier de base | Variante | Change ? |
|---|---|---|---|
| Fermeture de dépendances | {A,E,F,J,M,V,N} | {A,E,F,J,M,V,N} | **Non** |
| Décision sur N | purge, non conservé | **conservé en enclave, sans usage opérationnel** | **Oui** |
| Décisions sur A,J,F,M,V,E | idem | idem | Non |
| Q1–Q6 (hors N) | — | inchangées | Non |

**Conclusion.** La fermeture de dépendances et les décisions **ne changent pas de la même façon** : la fermeture est **invariante** (structurelle, R03/P02 intacts), tandis que les décisions changent **ponctuellement** — une seule ligne, N, passe du régime « purge » au régime « conservation gelée en enclave ». La variante **ne contredit pas R03** (N est nommé explicitement, non blanchi par dérivation), **ne modifie pas** la fermeture, et **ne touche aucune autre décision**.
# RÉPONSE FINALE — Variante « N rejoint l'exception d'audit »

## Résultats exacts

**Question posée :** *La fermeture de dépendances et les décisions changent-elles de la même façon ?*

**Réponse : NON.** Elles ne changent pas de la même façon, et c'est le résultat central de la variante.

- **Fermeture de dépendances = invariante.** Elle est purement structurelle : elle ne dépend que de P02 (graphe garanti) et R03 (dépendance conservatrice). La variante ne touche que R02, qui est une règle de **décision**, pas de **structure**. Aucune arête n'est ajoutée ni retirée.
- **Décisions = changent, mais d'une seule ligne.** Le seul objet dont le régime change est **N** : de « purge / non conservé » (base) à « conservé en enclave d'audit, sans usage opérationnel » (variante).

Autrement dit : *la variante déplace une décision sans toucher la structure, et elle ne déplace qu'une décision, pas l'ensemble.*

**Fermeture exacte (identique base et variante) :**

$$\text{Concernés}(A) = \{A,\ J,\ F,\ M,\ V,\ E,\ N\}, \qquad \text{Non concernés} = \{B,\ C\}$$

Chaînes : A → J → F → M ; A → V ; A → E → N.

**Delta de la variante :** $\Delta = \{\,N : \text{conservation en enclave, sans usage opérationnel}\,\}$ — et rien d'autre.

**Table de décisions (base → variante) :**

| Objet | Opérationnel | Conservation | Reconstruction | Δ |
|---|---|---|---|---|
| A | Interdit | Non | Non reconstruit | — |
| J | Purge | Non | Impossible à l'identique (dépend de A **et** B) | — |
| F | Purge | Non | Depuis entrées autorisées (C, B) | — |
| M | Suspendu | Non | Réentraîné ; pas d'oubli exact | — |
| V | Purge index | Non | Sans A | — |
| E | Interdit | **Enclave audit** | Depuis A (gelé) | — |
| **N** | Interdit | **Base : non → Variante : enclave audit** | Base : — / Variante : depuis E | **← seul changement** |

**Bitemporel (P01/P07) :**

| Assertion | Validité | Connaissance |
|---|---|---|
| AX → A | [V1, →) | [K1, K2) |
| AX → B | [V1, →) | [K2, →) |

- Q1 (validité V1, connaissance K1) → **AX appartient à A**
- Q2 (validité V1, connaissance K2) → **AX appartient à B**

---

## Certificats

**C1 — Fermeture transitive.** Calcul déterministe sur le graphe P02 : `J←{A,B}, F←{J,C}, M←{F,B}, V←{A}, E←{A}, N←{E}`. Résultat : concernés = {A,E,F,J,M,N,V}, non concernés = {B,C}. *Invariant sous la variante* (R02 n'est pas une arête).

**C2 — Delta de la variante.** Comparaison base/variante : seule la décision de conservation de N change. Preuve : R02 base ne gèle que E ; R03 empêche le blanchiment automatique des dérivés → N purgé en base. La variante **nomme N explicitement** → extension de la liste gelée, **pas** un blanchiment par dérivation. Donc **pas de violation de R03**.

**C3 — Bitemporel.** Deux réponses distinctes coexistent sans contradiction : elles diffèrent par l'axe de **connaissance**, pas par l'axe de **validité**. La table « dernière ligne seulement » écrase l'axe connaissance → rend Q1 non calculable → viole R01.

**C4 — Impossibilité de P05.** Objet X à clé unique kX, A et B mélangés, pas de découpage, pas d'autre copie. Si kX détruite → B illisible (viole (ii)) ; si kX conservée → A lisible (viole (i)). Aucun troisième état. Aucune transformation anonymisante disponible (R03 exige une preuve, absente). **P05 est contradictoire : insatisfiable.**

**C5 — Non-preuve cryptographique.** Supprimer kA au coffre courant ne prouve rien : S contient A avec clé de données séparée, l'enveloppe de kA existe sous K-old conservée au coffre de reprise, et K-old existe encore → clé de données récupérable → A accessible (R04). Procédure vérifiable : inventaire exhaustif → destruction cryptographique (K-old + enveloppes + rotation) → test de non-récupération → vérification d'indépendance cryptographique de F/M/V/N → reçu opaque (R07).

---

## Pièges

1. **Confondre structure et norme.** Croire que changer R02 change la fermeture. Faux : R02 est une règle de décision ; la fermeture est structurelle. C'est le piège principal de la variante.
2. **Croire que l'exception « sort » N de la fermeture.** Faux : N reste concerné (dépend de A via E). L'exception change son **régime**, pas son **statut de dépendance**.
3. **Croire que la variante viole R03.** Faux : R03 interdit le blanchiment *automatique par dérivation* ; la variante **nomme N explicitement**, ce qui est une extension légitime de la liste gelée.
4. **Croire que N devient opérationnel.** Faux : l'exception est **enclave uniquement, sans usage opérationnel ni entraînement** — exactement comme E.
5. **Table « dernière ligne seulement ».** Détruit l'axe connaissance → ne peut pas répondre à Q1 (P07).
6. **« Anonymiser » X.** Slogan rejeté : aucune transformation anonymisante n'est disponible (R03).
7. **Publier avant le registre (P06).** Régression interdite par R05 : publier d'abord puis « rattraper la file » viole la monotonie du numéro de politique.
8. **Croire que supprimer kA suffit.** Faux tant que K-old et les enveloppes subsistent (R04).
9. **Croire qu'on peut « oublier » l'influence de A dans M.** Faux : aucune méthode d'oubli exact fournie (R06) → suspension, pas nettoyage.

---

## Limites

- **Copies hors modèle.** Le certificat ne couvre que les objets **inventoriés** ; les exports externes sont **déclarés, pas niés** (R07). Aucun attaquant externe ni copie non inventoriée n'est ajouté au modèle (R04).
- **P05 insatisfiable.** On ne peut pas promettre la satisfaction simultanée ; il faut **choisir et déclarer** (branche conforme à R02 : X inaccessible, perte de la part B déclarée).
- **M non nettoyable.** Pas d'oubli exact → au mieux suspension + réentraînement depuis entrées autorisées.
- **J non reconstructible à l'identique.** J dépend de A **et** B ; seule la part B est récupérable.
- **Reçu ≠ disparition.** Conserver un reçu n'autorise pas à conserver le contenu supprimé (R07).
- **Portée de la variante.** Elle ne modifie **que** le régime de N ; toutes les autres conclusions (Q1–Q6 hors N) restent celles du dossier de base.

---

## Conclusion

La fermeture de dépendances et les décisions **ne changent pas de la même façon** : la fermeture est **invariante** (structurelle, R03/P02 intacts), tandis que les décisions changent **ponctuellement** — une seule ligne, **N**, passe du régime « purge » au régime « conservation gelée en enclave ». La variante **ne contredit pas R03** (N nommé explicitement, non blanchi par dérivation), **ne modifie pas** la fermeture, et **ne touche aucune autre décision**. Le reste du dossier de base — bitemporel, clés, impossibilité de P05, restauration sûre, limites du certificat — demeure inchangé.