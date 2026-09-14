# SIII-04-V3 — SIII-04 → Toutes les clés A détruites

Score: 100.0 % (certificats 0/0, juge 100/100)

Certificats manqués: aucun

La critique ne relève aucun problème. Je rédige la réponse finale.

## Réponse

**Non. La suppression opérationnelle complète n'est pas prouvée.** La variante ne modifie qu'une seule hypothèse — elle coupe réellement tous les chemins de déchiffrement de A (ligne A, kA au coffre courant, K-old, enveloppes de kA dans S) — mais elle **conserve les clés et les usages de F, M, V et N**. Or ces quatre objets sont, par R03, des dérivés de A. La variante prouve donc l'**inaccessibilité cryptographique de A**, pas la **suppression opérationnelle** exigée par R02. C'est une preuve partielle, pas une preuve complète.

---

## Preuves et certificats

### 1. Fermeture des dépendances (R03 + P02)

R03 pose qu'un objet dépend de chacune de ses entrées déclarées, et qu'aucune empreinte, vecteur ou modèle ne devient anonyme par son seul nom. La fermeture transitive du graphe P02 donne :

| Objet | Entrées déclarées | Fermeture | Dépend de A ? |
|---|---|---|---|
| J | A, B | {A, B} | **Oui** |
| F | J, C | {A, B, C, J} | **Oui** |
| M | F, B | {A, B, C, F, J} | **Oui** |
| V | A | {A} | **Oui** |
| E | A | {A} | **Oui** (gel d'audit) |
| N | E | {A, E} | **Oui** |
| B, C | — | ∅ | Non |

En production (P03 : A, J, V, F, M, N), **tous les objets sauf A lui-même sont concernés** : J, V, F, M, N. La liste P02 est exhaustive, donc aucun dérivé caché n'échappe à cette fermeture.

### 2. Pourquoi couper les chemins de A ne suffit pas

P03 précise que **F, M, V et N ont leurs propres clés, sans dépendance cryptographique à kA**. Conséquence directe : supprimer kA (et K-old, et les enveloppes) rend A illisible, mais **laisse F, M, V, N parfaitement déchiffrables et utilisables**. La variante « conserve les clés et usages » de ces objets, donc :

- **V** (vecteur de recherche issu de A) reste indexé et interrogeable → recherche opérationnelle sur un dérivé de A : violation de R02.
- **M** (modèle, dépend de F donc de A) reste servi → recommandation opérationnelle sur un dérivé de A : violation de R02. Aucune méthode d'oubli exact n'existe (R06), donc M ne peut pas être « nettoyé ».
- **F** (transformation, dépend de J donc de A) reste utilisable → dérivé opérationnel de A.
- **N** (résumé de E, E provenant de A) reste servi → dérivé de A ; l'exception E ne blanchit pas ses dérivés (R03).

### 3. Test de la condition R02

R02 exige quatre choses : (1) rendre les copies internes concernées **inutilisables**, (2) **purger les index**, (3) **reconstruire les dérivés utiles**, (4) interdire toute utilisation opérationnelle d'un dérivé de A. La variante ne satisfait que l'inaccessibilité de A :

| Exigence R02 | Variante |
|---|---|
| Inaccessibilité de A | ✅ (chemins coupés) |
| Copies dérivées inutilisables | ❌ (F, M, V, N utilisables) |
| Purge des index | ❌ (V conservé) |
| Reconstruction des dérivés utiles | ❌ (non prévue) |

**Conclusion : 1 exigence sur 4 satisfaite → suppression opérationnelle non prouvée.**

---

## Pièges traités

- **« Ce n'est qu'un vecteur / un modèle »** : R03 l'interdit explicitement. V et M restent des dérivés de A faute de preuve d'anonymisation, absente du dossier.
- **« La pièce E est gelée, donc N est propre »** : faux. R03 : l'exception E ne blanchit pas ses dérivés ; N dépend de E donc de A.
- **Confusion inaccessibilité ≠ suppression** : couper kA prouve l'inaccessibilité de A, pas l'inutilisabilité de ses dérivés. Ce sont deux propriétés distinctes.
- **Clés propres des dérivés** : P03 montre que F, M, V, N ne dépendent pas cryptographiquement de kA ; leur survie est donc indépendante de la suppression de kA.
- **R06** : aucune méthode d'oubli exact dans M n'étant fournie, M ne peut être ni nettoyé ni « désappris » ; il doit être suspendu.

---

## Ce qu'il faudrait pour prouver la suppression complète

1. **Rendre inutilisables** F, M, V, N : suspendre M (service sans recommandation, R06), purger l'index de V, retirer F et N du service.
2. **Reconstruire** F et M depuis des entrées autorisées (B, C uniquement), sans réintroduire A (R06).
3. **Geler N** avec E dans l'enclave d'audit, sans usage opérationnel ni entraînement (R02).
4. **Prouver l'inaccessibilité de A** : inventaire exhaustif des chemins de déchiffrement (ligne A, kA, K-old, enveloppes de S) et vérification qu'aucune enveloppe récupérable ne subsiste (R04).
5. **Fournir une preuve de transformation anonymisante** pour tout objet qu'on voudrait conserver — preuve absente du dossier, donc non invocable.

Tant que F, M, V, N restent servis avec leurs clés, la suppression opérationnelle **n'est pas prouvée**, même si A lui-même est devenu cryptographiquement inaccessible.

---

## Limites / impossibilités

- **Preuve partielle seulement** : la variante établit l'inaccessibilité de A, pas la conformité R02 sur les dérivés.
- **M est irréversible** : sans méthode d'oubli exact (R06), la seule option conforme est la suspension, pas la conservation.
- **Copies exportées hors périmètre** (R07) : leur existence doit être déclarée, jamais niée ; elles restent hors du modèle de maîtrise et ne peuvent être « prouvées supprimées ».
- **Bloc mixte X (P05)** : reste insoluble dans ce modèle (inaccessibilité de A et conservation exacte de B dans un objet unique et indivisible sont contradictoires) ; il ne peut être ni découpé ni reconstruit, donc il doit être mis en quarantaine, ce qui ne sauve pas la partie B.
- **Registre de retraits (R05)** : toute restauration doit vérifier que le numéro de politique ne régresse pas ; sinon quarantaine et écran neutre. La variante ne traite pas ce point, qui reste une condition nécessaire à une remise en service sûre.

**Verdict : la suppression opérationnelle complète n'est pas prouvée — elle est seulement partielle (inaccessibilité de A), et la conservation des usages de F, M, V, N viole R02 et R03.**