# SIII-04-V4 — SIII-04 → Correction de validité plus tardive

Score: 96.0 % (certificats 0/0, juge 96/100)

Certificats manqués: aucun

# Réponse à la variante — Palimpseste

## Cadrage : ce qui change, ce qui ne change pas

La variante ne modifie **qu'une seule hypothèse** : la teneur de la correction reçue à K2 dans **P01**. Dans le dossier de base, K2 apprenait « AX appartient à B **depuis V1** » (rétroaction jusqu'à V1). Dans la variante, K2 apprend « AX appartient à B **seulement depuis V2** », avec **V1 < V2**, et l'énoncé précise explicitement que **l'attribution A avant V2 reste valide**.

Tout le reste du dossier (R01–R07, P02–P07) est conservé tel quel. Je ne recalcule donc que les conclusions qui dépendent de l'intervalle de validité de l'assertion d'identité, c'est-à-dire **Q1** et la question posée. Les autres conclusions (fermeture de dépendances, clés, P05, restauration, certificat) sont **inchangées** et je les rappelle brièvement pour mémoire.

---

## Q1 — Représentation bitemporelle et réponse à la question

### Modèle à deux axes (R01)

Chaque assertion porte un **intervalle de validité** (le monde décrit) et un **intervalle de connaissance** (ce que la base savait, et quand). Les instants sont des repères logiques ordonnés : **V1 < K1 < K2 < K3**, et **V1 < V2**.

### Assertions d'identité de AX

| # | Assertion | Validité (monde) | Connaissance (base) | Statut |
|---|-----------|------------------|---------------------|--------|
| a1 | AX ∈ A | **[V1, V2)** | **[K1, K2)** | remplacée à K2 |
| a2 | AX ∈ B | **[V2, ∞)** | **[K2, ∞)** | courante |

Point crucial de la variante : la correction de K2 **ne rétroagit plus jusqu'à V1**. Elle ne fait que **borner supérieurement** l'assertion a1 à V2 et ouvrir a2 à partir de V2. Il n'y a donc **aucune contradiction** entre ce que K1 savait et ce que K2 sait : les deux s'accordent sur l'attribution à V1.

### Les deux questions de P07

- **« À V1, à qui AX est-il attribué selon ce que l'on savait à K1 ? »**
  → **A**. (a1 est valide sur [V1,V2) et connue dès K1 ; V1 ∈ [V1,V2).) *Inchangé par rapport au dossier de base.*

- **« À V1, à qui AX est-il attribué selon la connaissance de K2 ? »**
  → **A**. (a1 reste valide sur [V1,V2) ; V1 < V2, donc V1 est dans l'intervalle d'attribution A.) **C'est ici que la variante change la réponse** : dans le dossier de base, K2 attribuait AX à B dès V1, donc la réponse était B.

### Réponse directe à la question posée

> **À V1, selon la connaissance K2, AX appartient à A.**

Justification : la correction de K2 fixe le basculement d'identité à **V2**, pas à V1. Comme **V1 < V2**, l'instant V1 tombe dans la fenêtre de validité de l'attribution A, qui n'a pas été invalidée pour cette période. La connaissance K2 **confirme donc** l'attribution A à V1, au lieu de la corriger.

### Conséquence sur la table du développeur (P07)

La proposition « ne conserver que la dernière ligne » reste **fausse**, mais pour une raison légèrement différente : elle écraserait a1 par a2 et ferait disparaître la fenêtre [V1,V2) où AX est A. La table correcte doit conserver **les deux lignes avec leurs bornes** :

```
AX ∈ A : validité [V1, V2)  | connaissance [K1, K2)
AX ∈ B : validité [V2, ∞)   | connaissance [K2, ∞)
```

Une requête « as-of » doit croiser les deux axes : *validité = V1* et *connaissance = K2* → sélectionne a1 → **A**.

### Distinction vérité courante / connaissance historique

- **Vérité courante du dossier** (dernière connaissance, K3) : AX ∈ B depuis V2 ; AX ∈ A sur [V1,V2).
- **Connaissance historique** : à K1, le système croyait AX ∈ A depuis V1 — et cette croyance **n'était pas erronée** sur [V1,V2), elle était seulement **incomplète** (elle ignorait le basculement futur à V2). C'est un cas de **révision par raffinement**, non de **révision par rétractation** : on n'efface pas l'histoire, on la précise.

---

## Q2 — Fermeture des dépendances (inchangée)

Le graphe garanti (P02) ne dépend pas de l'intervalle de validité de l'identité ; la variante ne le modifie pas. Fermeture depuis A :

- **A** → concerné (source).
- **J** (entrées A, B) → concerné.
- **F** (entrées J, C) → concerné (dépend de J, donc de A ; R03 : pas d'anonymisation prouvée).
- **M** (entrées F, B) → concerné.
- **V** (provient de A) → concerné.
- **E** (provient de A) → concerné mais **seul objet bénéficiant du gel d'audit** (R02).
- **N** (provient de E) → concerné ; **E ne blanchit pas ses dérivés** (R03).
- **B, C** → non concernés (ne dépendent pas de A).

| Objet | Décision opérationnelle | Décision de conservation | Reconstruction |
|-------|------------------------|--------------------------|----------------|
| A | Interdit (R02) | Supprimer hors enclave | Non reconstruit |
| J | Interdit | Supprimer | Reconstruire depuis B seul (entrée A retirée) |
| F | Interdit | Supprimer | Reconstruire depuis J(B) et C |
| M | Interdit | Suspendre (R06) | Réentraîner depuis F(B,C) et B |
| V | Interdit (purge index) | Supprimer | Reconstruire depuis sources autorisées |
| E | Interdit hors enquête | **Conserver en enclave** (R02) | N/A |
| N | Interdit | Supprimer | Reconstruire depuis E si usage d'audit autorisé |
| B, C | Autorisé | Conserver | N/A |

---

## Q3 — Clés et sauvegardes (inchangée)

Supprimer **kA** du coffre courant **ne prouve pas** une suppression cryptographique, car **K-old** (clé maîtresse conservée dans le coffre de reprise) permet de récupérer les **enveloppes de kA et kJ** présentes dans la sauvegarde S (P03, P04). Tant qu'une enveloppe et sa clé maîtresse sont récupérables, l'objet est **accessible** au sens de R04.

**Procédure vérifiable :**
1. Inventorier **toutes** les enveloppes et clés maîtresses (y compris K-old).
2. Détruire ou rendre inutilisables les enveloppes de kA dans **toutes** les sauvegardes, ou détruire K-old.
3. Prouver l'inaccessibilité par **test de déchiffrement négatif** (tentative échoue faute de clé).
4. Émettre un reçu (R07) : identifiant opaque, classes traitées, statut — **sans** réintroduire le texte de A.

---

## Q4 — P05 (inchangée)

**P05 est insatisfiable.** X est un objet unique, chiffré sous **une seule clé**, mêlant A et B, sans découpage possible et sans autre copie. R04 impose l'inaccessibilité de toute information A ; R06 exige la conservation **utilisable exacte** de toute information B. Or l'inaccessibilité de A dans X **détruit la clé unique**, donc rend B inutilisable ; conserver B utilisable **conserve A**. Les deux exigences sont **contradictoires** : aucune transformation anonymisante n'étant fournie (R03), il n'existe pas de solution. Conclusion : **impossible** — il faut soit renoncer à l'exactitude de B, soit accepter une copie supplémentaire (hors modèle).

---

## Q5 — Restauration sûre (inchangée)

**Ordre de dépendances :** registre de retraits/gels (R05) **d'abord** → vérifier le numéro de politique monotone → puis B, C → puis reconstruire J, F, V → puis M (ou service sans recommandation, R06).

**Registre indisponible :** données protégées **en quarantaine**, écran neutre (R05). Ne **jamais** publier avant rejeu des retraits (contredit P06).

**Moteur de recherche :** purger l'index, ne pas réindexer A ; V reconstruit depuis sources autorisées.

**Modèle M :** suspendre (pas d'oubli exact disponible, R06) ; servir sans recommandation jusqu'à réentraînement sur entrées autorisées.

---

## Q6 — Limites, branche B, tests falsifiants (inchangée)

- **Limites du certificat :** ne prouve que les objets **dans le périmètre** ; ne couvre pas les copies exportées hors organisation (R07 : à **déclarer**, pas nier) ; ne prouve pas l'absence d'influence résiduelle dans M.
- **Branche de service pour B :** B et C intacts → J(B), F(B,C), M réentraîné → service dégradé mais légitime.
- **Tests falsifiants :** (i) restaurer S et tenter de déchiffrer kA via K-old → doit **échouer** ; (ii) vérifier que le numéro de politique ne régresse pas ; (iii) requête as-of V1/K2 → doit renvoyer **A** (test de non-écrasement de la fenêtre [V1,V2)).

---

## Synthèse de la variante

| Question | Dossier de base | **Variante** |
|----------|-----------------|--------------|
| AX à V1 selon K1 | A | **A** (inchangé) |
| AX à V1 selon K2 | B | **A** ← *seul changement* |
| Nature de la révision K2 | rétractation (rétroagit à V1) | **raffinement** (borne à V2) |
| Q2–Q6 | — | **inchangées** |

**Réponse finale : à V1, selon la connaissance K2, AX appartient à A.** La correction de K2 ne rétroagit que jusqu'à V2 ; comme V1 < V2, l'attribution A reste valide à V1, et la connaissance K2 la confirme au lieu de la corriger.