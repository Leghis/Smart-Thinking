# SIII-04-V4 — SIII-04 → Correction de validité plus tardive

Score: 96.0 % (certificats 0/0, juge 96/100)

Certificats manqués: aucun

# Réponse à la variante — Palimpseste

## Cadrage : ce que la variante change, et ce qu'elle ne change pas

La variante ne modifie **qu'une seule hypothèse** : **P01** (chronologie d'identité). À K2, la correction ne dit plus « AX appartient à B depuis V1 » mais « **AX appartient à B seulement depuis V2** », avec **V1 < V2**, et l'attribution A **avant V2 reste valide**.

Tout le reste du dossier de base est conservé tel quel : R01–R07, P02 (graphe), P03 (inventaire), P04, P05, P06, P07. Je recalcule donc uniquement les conclusions affectées (Q1 et la question posée), et je conserve les autres.

---

## Q1 — Représentation bitemporelle et réponse à la question de la variante

### Modèle bitemporel (R01)

Deux axes indépendants :
- **Validité** (le monde décrit) : intervalle `[début, fin)`.
- **Connaissance** (la base) : instant logique d'apprentissage `K`.

Ordre des repères : **V1 < V2 < K1 < K2 < K3** (V1 précède K1 ; K1 précède K2 ; K2 précède K3 ; et V1 < V2 par la variante).

| Assertion | Validité (monde) | Connue à partir de | Statut |
|---|---|---|---|
| **A1** : AX ∈ A | **[V1, V2)** | **K1** | valide, jamais rétractée sur [V1,V2) |
| **A2** : AX ∈ B | **[V2, ∞)** | **K2** | valide à partir de V2 |

Différence clé avec le dossier de base : dans le dossier de base, A2 avait pour validité `[V1, ∞)` et **remplaçait** la validité courante de A1 (donc A1 devenait `[V1, V1)` = vide). **Ici, A2 commence à V2** : elle ne recouvre pas `[V1, V2)`. Les deux assertions **coexistent** sur des intervalles disjoints, et A1 **reste valide** sur `[V1, V2)`.

### Les deux questions de P07

- **« À V1, à qui AX est-il attribué selon ce que l'on savait à K1 ? »**
  On interroge la validité à V1 avec la connaissance disponible à K1. À K1, seule A1 est connue, valide sur [V1,V2) ∋ V1 → **A**.

- **« À V1, à qui AX est-il attribué selon la connaissance de K2 ? »**
  On interroge la validité à V1 avec la connaissance disponible à K2. À K2, on connaît A1 ([V1,V2)) **et** A2 ([V2,∞)). À l'instant de validité V1, on est dans [V1,V2) → **A**.

### Réponse à la question de la variante

> **À V1 selon la connaissance K2, AX appartient à A.**

Justification : la correction reçue à K2 porte sur une validité qui **commence à V2**. Elle n'a donc **aucun effet rétroactif** sur l'intervalle `[V1, V2)`. La connaissance K2 ajoute une information (B à partir de V2) sans invalider l'information antérieure (A sur [V1,V2)). Interroger « à V1 » sélectionne l'intervalle de validité contenant V1, c'est-à-dire A1 → **A**.

**Contraste avec le dossier de base** (à garder en tête) : dans le dossier de base, K2 disait « B depuis V1 », donc à V1 selon K2 → **B**. La variante **inverse** cette réponse : **A**. C'est le seul point de bascule produit par la modification de P01.

**Vérité courante du dossier vs connaissance historique.** La « vérité courante » (au présent, après K3) est : AX ∈ B depuis V2, et AX ∈ A sur [V1,V2). La « connaissance historique » à K1 ne contenait que A1. Les deux questions de P07 illustrent précisément qu'une même interrogation « à V1 » donne **A** dans les deux cas ici, mais pour des raisons différentes : à K1 parce qu'on ne sait rien d'autre ; à K2 parce que la correction ne couvre pas V1. Le développeur qui ne garde que « la dernière ligne » (P07) écraserait A1 et répondrait faussement **B** à la première question — erreur de conception à proscrire.

---

## Q2 — Fermeture des dépendances de A (inchangée)

Le graphe P02 est inchangé par la variante. Fermeture transitive (R03, dépendance conservatrice) :

- **J** ← {A, B} → dépend de A
- **F** ← {J, C} → dépend de A (via J)
- **M** ← {F, B} → dépend de A (via F)
- **V** ← {A} → dépend de A
- **E** ← {A} → dépend de A (seule pièce bénéficiant du gel d'audit)
- **N** ← {E} → dépend de A (via E)
- **B, C** : ne dépendent pas de A.

**Fermeture concernée = {J, F, M, V, E, N}** (vérifié par calcul).

| Objet | Dépend de A ? | Décision opérationnelle (R02) | Décision de conservation | Reconstruction |
|---|---|---|---|---|
| **A** | source | Retrait opérationnel ; ligne supprimée | Reçu minimal (R07) ; pas de contenu | Non reconstruit |
| **J** | oui (A,B) | Inutilisable en opérationnel | Conservé seulement si re-dérivable sans A | Reconstruire depuis B seul (entrée A retirée) |
| **F** | oui (via J) | Inutilisable | Reconstruit | Reconstruire depuis J(B) et C |
| **M** | oui (via F) | **Suspendu** (pas d'oubli exact, R06) | Non conservé en l'état | Réentraîner depuis F(B,C) et B |
| **V** | oui (A) | **Purgé de l'index** | Non conservé | Recalculer depuis sources autorisées |
| **E** | oui (A) | Interdit en opérationnel et en entraînement | **Conservé** en enclave enquêteurs (exception R02) | Non reconstruit (pièce d'audit) |
| **N** | oui (via E) | Inutilisable | Non conservé | Reconstruire depuis E **uniquement** si usage d'audit ; sinon supprimer |
| **B, C** | non | **Service maintenu** | Conservés | — |

Point R03 : ni V (« ce n'est qu'un vecteur »), ni M (« pas les lignes originales »), ni N (« provient d'une pièce gelée ») ne deviennent anonymes par leur nom. L'exception E **ne blanchit pas** N.

---

## Q3 — Clés et sauvegardes (inchangé)

**Pourquoi supprimer kA au coffre courant ne prouve pas une suppression cryptographique.** R04 : un objet chiffré n'est inaccessible que si **aucune clé ou enveloppe encore récupérable** ne permet de le déchiffrer. Or P03/P04 : la sauvegarde S contient A, B, J, E avec des clés de données séparées, et **les enveloppes de kA et kJ existent sous l'ancienne clé maîtresse K-old, conservée dans le coffre de reprise**. Supprimer kA du coffre courant laisse donc **K-old + enveloppe de kA** → kA reste **récupérable**. La suppression est **apparente**, pas effective.

**Procédure vérifiable :**
1. Inventorier **toutes** les enveloppes de kA (coffre courant **et** coffre de reprise).
2. Détruire/rendre irrécupérables **K-old et toute enveloppe de kA** (ou re-chiffrer S sans A).
3. Prouver l'irrécupérabilité : test de déchiffrement échoue avec l'ensemble des clés inventoriées.
4. Consigner un reçu (R07) : identifiant opaque, classes traitées, statut — **sans** réintroduire le texte de A.
5. Déclarer les copies exportées hors périmètre (R07) : existence déclarée, non niée.

---

## Q4 — P05 : bloc mixte X (inchangé)

**P05 est insatisfiable.** X contient A et B **mélangés dans un seul objet chiffré et une seule clé**, sans découpage ni reconstruction possible, sans autre copie, sans modification de format. Le produit exige simultanément :
- (i) inaccessibilité de **toute** information A de X ;
- (ii) conservation **utilisable exacte** de **toute** information B de X.

Or (i) et (ii) sont contradictoires : rendre X inutilisable pour A (détruire la clé unique) rend aussi B inutilisable ; conserver B utilisable (garder la clé) rend A accessible. Aucune transformation anonymisante n'étant fournie (R03), on ne peut pas invoquer « anonymiser ». **Conclusion : P05 est un bloc impossible ; il faut le déclarer comme tel** (contrainte contradictoire), et non promettre une suppression sélective que le format ne permet pas. Options honnêtes : conserver X en quarantaine sous accès restreint (compromis assumé, non conforme à (i)), ou détruire X (non conforme à (ii)) — le choix doit être **explicité comme un arbitrage**, pas présenté comme une solution.

---

## Q5 — Restauration sûre (inchangé)

**Ordre de dépendances (R05, R06) :**
1. **Registre de retraits/gels d'abord** : répliquer et consulter le registre (numéro de politique monotone) **avant** toute remise en service.
2. **Vérifier la non-régression** : le numéro restauré doit être ≥ numéro courant. Sinon → **quarantaine** des données protégées, écran neutre.
3. **Restaurer B et C** (sources propres, récupérables séparément).
4. **Reconstruire J, F** depuis entrées autorisées (sans A).
5. **Moteur de recherche** : ne **pas** réintroduire V ; purger l'index, reconstruire depuis sources autorisées.
6. **Modèle M** : **suspendre** (pas d'oubli exact, R06) ; servir un **service sans recommandation**.
7. **E** : uniquement en enclave d'audit ; **N** non reconstruit pour usage opérationnel.

**Politique si registre indisponible (R05)** : données protégées restaurées **en quarantaine** ; produit sert un **écran neutre**. Ne jamais publier puis « rejouer les retraits plus tard » (erreur de P06).

**Traitement P06** : la sauvegarde pré-K3 contient une **ancienne table d'autorisation permettant A**. Il faut **rejouer les retraits AVANT publication**, jamais après. Publier d'abord puis rattraper la file = réintroduction de A dans le moteur public (le sinistre décrit).

---

## Q6 — Limites, branche de service pour B, tests falsifiants (inchangé)

**Limites d'un certificat de suppression (R07)** : il atteste seulement (a) un identifiant opaque, (b) les classes d'objets traitées, (c) un statut. Il **ne prouve pas** l'absence de copies exportées hors périmètre (déclarées, non niées), ni l'absence d'influence résiduelle dans M (pas d'oubli exact), ni l'irrécupérabilité cryptographique si une enveloppe subsiste. Conserver un reçu **n'autorise pas** à conserver le contenu.

**Branche de service utile pour B** : servir B et C directement ; reconstruire J(B), F(J(B),C) ; recommandation **dégradée** (sans M) ou M réentraîné sur F(B,C) et B ; recherche sans V.

**Tests falsifiant une restauration « saine » :**
1. **Test de régression du registre** : restaurer un registre de numéro inférieur → doit déclencher quarantaine.
2. **Test de déchiffrement résiduel** : tenter de déchiffrer A via K-old + enveloppe → doit **échouer** ; s'il réussit, la suppression est fausse.
3. **Test d'index** : requête sur un terme propre à A → doit ne rien retourner.
4. **Test d'influence M** : vérifier que M ne sert pas de recommandation issue de A (suspension effective).
5. **Test d'ordre** : publier avant rejeu des retraits → doit être **détecté** comme violation (P06).
6. **Test N** : vérifier que N n'est pas servi en opérationnel malgré le gel de E.

---

## Synthèse de la variante

| Élément | Dossier de base | Variante |
|---|---|---|
| P01 à K2 | B depuis **V1** | B depuis **V2** (V1<V2) |
| A1 (AX∈A) | [V1,V1) = vide | **[V1,V2)** valide |
| À V1 selon K1 | A | A |
| **À V1 selon K2** | **B** | **A** |
| Q2–Q6 | — | **inchangés** |

**Réponse finale à la question posée : à V1 selon la connaissance K2, AX appartient à A.** La correction de K2 ne rétroagit pas sur `[V1, V2)` ; elle ne fait que fixer l'attribution à B **à partir de V2**.