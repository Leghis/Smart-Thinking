# SIII-06-V3 — SIII-06 → La correction était déjà connue

Score: 100.0 % (certificats 0/0, juge 100/100)

Certificats manqués: aucun

## Réponse

**Statut admissible à p = 20 : `APPROVED`.**

Dans la variante, la correction `APPROVED` est **connue à K = 19** (≤ 20) et **valable depuis V = 15** (≤ 20) : son intervalle de validité contient p = 20, donc elle est admissible et constitue l'**état courant** du dossier à p = 20.

`OPEN` est **connu à K = 8** mais sa **fin de connaissance est 19 < 20** : à p = 20 cette connaissance a **expiré**, elle n'est plus l'état courant. `RAIN` (valable depuis 18, connue depuis 19) reste admissible comme mesure d'état.

Résumé des caractéristiques admissibles à p = 20 :

| Caractéristique | Connu à | Valide depuis | Fin de connaissance | Admissible à p=20 ? |
|---|---|---|---|---|
| Statut `OPEN` | 8 | 5 | **19** | ❌ expiré |
| Statut `APPROVED` | **19** | 15 | — | ✅ **état courant** |
| Mesure `RAIN` | 19 | 18 | — | ✅ |
| Succès final Y (événement 40, appris 41) | 41 | — | — | ❌ (étiquette, pas caractéristique) |

## Preuves et certificats

**Principe de jointure temporelle correcte (R01).** Une caractéristique est admissible à p si et seulement si les trois conditions tiennent :
1. **Disponibilité** : `known_at ≤ p` (l'information est connue au plus tard à p) ;
2. **Validité** : `valid_from ≤ p` (l'intervalle de validité contient p pour un état courant) ;
3. **Non-expiration** : `known_until ≥ p` (la connaissance n'a pas été clôturée avant p).

La jointure doit donc être une **jointure bitemporelle** : on sélectionne, pour chaque entité, la version dont l'intervalle de *validité* contient p **et** dont l'intervalle de *connaissance* contient p. L'extraction actuelle (`valid_from <= 20` sur la version courante) est **incorrecte** : elle ignore la dimension de connaissance et retiendrait la version courante même si elle n'était pas encore connue à p.

**Vérification exacte (compute).** En appliquant ces trois conditions :
- `OPEN` → `(False, 'connaissance expiree avant p')` car `known_until = 19 < 20` ;
- `APPROVED` → `(True, 'admissible')` car `known_at = 19 ≤ 20` et `valid_from = 15 ≤ 20` ;
- `RAIN` → `(True, 'admissible')`.

**Rôle différent du succès final (R02).** Y (événement à 40, appris à 41) est une **étiquette** évaluée *après* la prédiction dans un horizon fixé : il peut servir à mesurer/entraîner sur une période antérieure, mais **ne peut jamais entrer dans les caractéristiques de la prédiction qu'il évalue**. Ici, appris à 41 > p = 20, il est de toute façon indisponible à p = 20 — et le resterait même s'il était déclaré rétroactivement valable avant 20 (R01 : un événement appris après p reste indisponible à p).

## Pièges traités

- **Snapshot vs sérialisabilité / bitemporalité** : le piège central de la variante est de confondre « version courante » et « version connue à p ». La correction `APPROVED` est *rétroactivement valable* depuis 15, mais dans le dossier de base elle n'était **connue qu'à 30** : elle était donc **inadmissible** à p = 20 (l'état courant restait `OPEN`). La variante déplace la connaissance à 19, ce qui **bascule** le statut admissible vers `APPROVED` et **expire** `OPEN`. C'est exactement le cas où « déclaré rétroactivement valable avant p » ne suffit pas : c'est la **date de connaissance** qui décide.
- **Ne pas confondre validité et connaissance** : `valid_from = 15` est identique dans les deux dossiers ; seul `known_at` change (30 → 19). Le résultat change donc **uniquement** à cause de la dimension de connaissance — preuve que la jointure doit être bitemporelle.
- **Effet irréversible / rollback** : la clôture de `OPEN` à 19 est une **fin de connaissance**, pas une annulation d'événement ; on ne « ressuscite » pas `OPEN` à p = 20 par simple reconfiguration.
- **Exhaustivité** : les trois caractéristiques temporelles (OPEN, APPROVED, RAIN) et l'étiquette Y sont toutes traitées ; aucune n'est laissée sans verdict.

## Limites / impossibilités

- **Ce qui est garanti** : à p = 20, le seul statut courant admissible est `APPROVED` ; `OPEN` est expiré ; `RAIN` est admissible.
- **Ce qui n'est pas garanti** : cette conclusion porte **uniquement** sur l'admissibilité temporelle des caractéristiques à p = 20. Elle ne dit rien de la véracité de la correction `APPROVED` (une correction connue à 19 peut elle-même être erronée), ni de l'effet causal du système, ni de la validité de l'extraction actuelle qui, elle, reste **fausse** tant qu'elle ne filtre pas aussi la dimension de connaissance.
- **Sensibilité** : le résultat est **exactement** à la frontière — si la connaissance de `APPROVED` était à 21 (ou la fin de connaissance de `OPEN` à 20), le statut admissible redeviendrait `OPEN`. La conclusion dépend donc de façon critique de la date de connaissance, et non de la date de validité.
## Réponse

**Statut admissible à p = 20 : `APPROVED`.**

Dans la variante, la correction `APPROVED` est **connue à K = 19** (≤ 20) et **valable depuis V = 15** (≤ 20) : son intervalle de validité contient p = 20, donc elle est admissible et constitue l'**état courant** du dossier à p = 20.

`OPEN` est **connu à K = 8** mais sa **fin de connaissance est 19 < 20** : à p = 20 cette connaissance a **expiré**, elle n'est plus l'état courant. `RAIN` (valable depuis 18, connue depuis 19) reste admissible comme mesure d'état.

Résumé des caractéristiques admissibles à p = 20 :

| Caractéristique | Connu à | Valide depuis | Fin de connaissance | Admissible à p=20 ? |
|---|---|---|---|---|
| Statut `OPEN` | 8 | 5 | **19** | ❌ expiré |
| Statut `APPROVED` | **19** | 15 | — | ✅ **état courant** |
| Mesure `RAIN` | 19 | 18 | — | ✅ |
| Succès final Y (événement 40, appris 41) | 41 | — | — | ❌ (étiquette, pas caractéristique) |

## Preuves et certificats

**Principe de jointure temporelle correcte (R01).** Une caractéristique est admissible à p si et seulement si les trois conditions tiennent :
1. **Disponibilité** : `known_at ≤ p` (l'information est connue au plus tard à p) ;
2. **Validité** : `valid_from ≤ p` (l'intervalle de validité contient p pour un état courant) ;
3. **Non-expiration** : `known_until ≥ p` (la connaissance n'a pas été clôturée avant p).

La jointure doit donc être une **jointure bitemporelle** : on sélectionne, pour chaque entité, la version dont l'intervalle de *validité* contient p **et** dont l'intervalle de *connaissance* contient p. L'extraction actuelle (`valid_from <= 20` sur la version courante) est **incorrecte** : elle ignore la dimension de connaissance et retiendrait la version courante même si elle n'était pas encore connue à p.

**Vérification exacte (compute).** En appliquant ces trois conditions :
- `OPEN` → `(False, 'connaissance expiree avant p')` car `known_until = 19 < 20` ;
- `APPROVED` → `(True, 'admissible')` car `known_at = 19 ≤ 20` et `valid_from = 15 ≤ 20` ;
- `RAIN` → `(True, 'admissible')`.

**Rôle différent du succès final (R02).** Y (événement à 40, appris à 41) est une **étiquette** évaluée *après* la prédiction dans un horizon fixé : il peut servir à mesurer/entraîner sur une période antérieure, mais **ne peut jamais entrer dans les caractéristiques de la prédiction qu'il évalue**. Ici, appris à 41 > p = 20, il est de toute façon indisponible à p = 20 — et le resterait même s'il était déclaré rétroactivement valable avant 20 (R01 : un événement appris après p reste indisponible à p).

## Pièges traités

- **Snapshot vs sérialisabilité / bitemporalité** : le piège central de la variante est de confondre « version courante » et « version connue à p ». La correction `APPROVED` est *rétroactivement valable* depuis 15, mais dans le dossier de base elle n'était **connue qu'à 30** : elle était donc **inadmissible** à p = 20 (l'état courant restait `OPEN`). La variante déplace la connaissance à 19, ce qui **bascule** le statut admissible vers `APPROVED` et **expire** `OPEN`. C'est exactement le cas où « déclaré rétroactivement valable avant p » ne suffit pas : c'est la **date de connaissance** qui décide.
- **Ne pas confondre validité et connaissance** : `valid_from = 15` est identique dans les deux dossiers ; seul `known_at` change (30 → 19). Le résultat change donc **uniquement** à cause de la dimension de connaissance — preuve que la jointure doit être bitemporelle.
- **Effet irréversible / rollback** : la clôture de `OPEN` à 19 est une **fin de connaissance**, pas une annulation d'événement ; on ne « ressuscite » pas `OPEN` à p = 20 par simple reconfiguration.
- **Exhaustivité** : les trois caractéristiques temporelles (OPEN, APPROVED, RAIN) et l'étiquette Y sont toutes traitées ; aucune n'est laissée sans verdict.

## Limites / impossibilités

- **Ce qui est garanti** : à p = 20, le seul statut courant admissible est `APPROVED` ; `OPEN` est expiré ; `RAIN` est admissible.
- **Ce qui n'est pas garanti** : cette conclusion porte **uniquement** sur l'admissibilité temporelle des caractéristiques à p = 20. Elle ne dit rien de la véracité de la correction `APPROVED` (une correction connue à 19 peut elle-même être erronée), ni de l'effet causal du système, ni de la validité de l'extraction actuelle qui, elle, reste **fausse** tant qu'elle ne filtre pas aussi la dimension de connaissance.
- **Sensibilité** : le résultat est **exactement** à la frontière — si la connaissance de `APPROVED` était à 21 (ou la fin de connaissance de `OPEN` à 20), le statut admissible redeviendrait `OPEN`. La conclusion dépend donc de façon critique de la date de connaissance, et non de la date de validité.
## Réponse

**Statut admissible à p = 20 : `APPROVED`.**

Dans la variante, la correction `APPROVED` est **connue à K = 19** (≤ 20) et **valable depuis V = 15** (≤ 20) : son intervalle de validité contient p = 20, donc elle est admissible et constitue l'**état courant** du dossier à p = 20.

`OPEN` est **connu à K = 8** mais sa **fin de connaissance est 19 < 20** : à p = 20 cette connaissance a **expiré**, elle n'est plus l'état courant. `RAIN` (valable depuis 18, connue depuis 19) reste admissible comme mesure d'état.

Résumé des caractéristiques admissibles à p = 20 :

| Caractéristique | Connu à | Valide depuis | Fin de connaissance | Admissible à p=20 ? |
|---|---|---|---|---|
| Statut `OPEN` | 8 | 5 | **19** | ❌ expiré |
| Statut `APPROVED` | **19** | 15 | — | ✅ **état courant** |
| Mesure `RAIN` | 19 | 18 | — | ✅ |
| Succès final Y (événement 40, appris 41) | 41 | — | — | ❌ (étiquette, pas caractéristique) |

## Preuves et certificats

**Principe de jointure temporelle correcte (R01).** Une caractéristique est admissible à p si et seulement si les trois conditions tiennent :
1. **Disponibilité** : `known_at ≤ p` (l'information est connue au plus tard à p) ;
2. **Validité** : `valid_from ≤ p` (l'intervalle de validité contient p pour un état courant) ;
3. **Non-expiration** : `known_until ≥ p` (la connaissance n'a pas été clôturée avant p).

La jointure doit donc être une **jointure bitemporelle** : on sélectionne, pour chaque entité, la version dont l'intervalle de *validité* contient p **et** dont l'intervalle de *connaissance* contient p. L'extraction actuelle (`valid_from <= 20` sur la version courante) est **incorrecte** : elle ignore la dimension de connaissance et retiendrait la version courante même si elle n'était pas encore connue à p.

**Vérification exacte (compute).** En appliquant ces trois conditions :
- `OPEN` → `(False, 'connaissance expiree avant p')` car `known_until = 19 < 20` ;
- `APPROVED` → `(True, 'admissible')` car `known_at = 19 ≤ 20` et `valid_from = 15 ≤ 20` ;
- `RAIN` → `(True, 'admissible')`.

**Rôle différent du succès final (R02).** Y (événement à 40, appris à 41) est une **étiquette** évaluée *après* la prédiction dans un horizon fixé : il peut servir à mesurer/entraîner sur une période antérieure, mais **ne peut jamais entrer dans les caractéristiques de la prédiction qu'il évalue**. Ici, appris à 41 > p = 20, il est de toute façon indisponible à p = 20 — et le resterait même s'il était déclaré rétroactivement valable avant 20 (R01 : un événement appris après p reste indisponible à p).

## Pièges traités

- **Snapshot vs sérialisabilité / bitemporalité** : le piège central de la variante est de confondre « version courante » et « version connue à p ». La correction `APPROVED` est *rétroactivement valable* depuis 15, mais dans le dossier de base elle n'était **connue qu'à 30** : elle était donc **inadmissible** à p = 20 (l'état courant restait `OPEN`). La variante déplace la connaissance à 19, ce qui **bascule** le statut admissible vers `APPROVED` et **expire** `OPEN`. C'est exactement le cas où « déclaré rétroactivement valable avant p » ne suffit pas : c'est la **date de connaissance** qui décide.
- **Ne pas confondre validité et connaissance** : `valid_from = 15` est identique dans les deux dossiers ; seul `known_at` change (30 → 19). Le résultat change donc **uniquement** à cause de la dimension de connaissance — preuve que la jointure doit être bitemporelle.
- **Effet irréversible / rollback** : la clôture de `OPEN` à 19 est une **fin de connaissance**, pas une annulation d'événement ; on ne « ressuscite » pas `OPEN` à p = 20 par simple reconfiguration.
- **Exhaustivité** : les trois caractéristiques temporelles (OPEN, APPROVED, RAIN) et l'étiquette Y sont toutes traitées ; aucune n'est laissée sans verdict.

## Limites / impossibilités

- **Ce qui est garanti** : à p = 20, le seul statut courant admissible est `APPROVED` ; `OPEN` est expiré ; `RAIN` est admissible.
- **Ce qui n'est pas garanti** : cette conclusion porte **uniquement** sur l'admissibilité temporelle des caractéristiques à p = 20. Elle ne dit rien de la véracité de la correction `APPROVED` (une correction connue à 19 peut elle-même être erronée), ni de l'effet causal du système, ni de la validité de l'extraction actuelle qui, elle, reste **fausse** tant qu'elle ne filtre pas aussi la dimension de connaissance.
- **Sensibilité** : le résultat est **exactement** à la frontière — si la connaissance de `APPROVED` était à 21 (ou la fin de connaissance de `OPEN` à 20), le statut admissible redeviendrait `OPEN`. La conclusion dépend donc de façon critique de la date de connaissance, et non de la date de validité.
## Réponse

**Statut admissible à p = 20 : `APPROVED`.**

Dans la variante, la correction `APPROVED` est **connue à K = 19** (≤ 20) et **valable depuis V = 15** (≤ 20) : son intervalle de validité contient p = 20, donc elle est admissible et constitue l'**état courant** du dossier à p = 20.

`OPEN` est **connu à K = 8** mais sa **fin de connaissance est 19 < 20** : à p = 20 cette connaissance a **expiré**, elle n'est plus l'état courant. `RAIN` (valable depuis 18, connue depuis 19) reste admissible comme mesure d'état.

Résumé des caractéristiques admissibles à p = 20 :

| Caractéristique | Connu à | Valide depuis | Fin de connaissance | Admissible à p=20 ? |
|---|---|---|---|---|
| Statut `OPEN` | 8 | 5 | **19** | ❌ expiré |
| Statut `APPROVED` | **19** | 15 | — | ✅ **état courant** |
| Mesure `RAIN` | 19 | 18 | — | ✅ |
| Succès final Y (événement 40, appris 41) | 41 | — | — | ❌ (étiquette, pas caractéristique) |

## Preuves et certificats

**Principe de jointure temporelle correcte (R01).** Une caractéristique est admissible à p si et seulement si les trois conditions tiennent :
1. **Disponibilité** : `known_at ≤ p` (l'information est connue au plus tard à p) ;
2. **Validité** : `valid_from ≤ p` (l'intervalle de validité contient p pour un état courant) ;
3. **Non-expiration** : `known_until ≥ p` (la connaissance n'a pas été clôturée avant p).

La jointure doit donc être une **jointure bitemporelle** : on sélectionne, pour chaque entité, la version dont l'intervalle de *validité* contient p **et** dont l'intervalle de *connaissance* contient p. L'extraction actuelle (`valid_from <= 20` sur la version courante) est **incorrecte** : elle ignore la dimension de connaissance et retiendrait la version courante même si elle n'était pas encore connue à p.

**Vérification exacte (compute).** En appliquant ces trois conditions :
- `OPEN` → `(False, 'connaissance expiree avant p')` car `known_until = 19 < 20` ;
- `APPROVED` → `(True, 'admissible')` car `known_at = 19 ≤ 20` et `valid_from = 15 ≤ 20` ;
- `RAIN` → `(True, 'admissible')`.

**Rôle différent du succès final (R02).** Y (événement à 40, appris à 41) est une **étiquette** évaluée *après* la prédiction dans un horizon fixé : il peut servir à mesurer/entraîner sur une période antérieure, mais **ne peut jamais entrer dans les caractéristiques de la prédiction qu'il évalue**. Ici, appris à 41 > p = 20, il est de toute façon indisponible à p = 20 — et le resterait même s'il était déclaré rétroactivement valable avant 20 (R01 : un événement appris après p reste indisponible à p).

## Pièges traités

- **Snapshot vs sérialisabilité / bitemporalité** : le piège central de la variante est de confondre « version courante » et « version connue à p ». La correction `APPROVED` est *rétroactivement valable* depuis 15, mais dans le dossier de base elle n'était **connue qu'à 30** : elle était donc **inadmissible** à p = 20 (l'état courant restait `OPEN`). La variante déplace la connaissance à 19, ce qui **bascule** le statut admissible vers `APPROVED` et **expire** `OPEN`. C'est exactement le cas où « déclaré rétroactivement valable avant p » ne suffit pas : c'est la **date de connaissance** qui décide.
- **Ne pas confondre validité et connaissance** : `valid_from = 15` est identique dans les deux dossiers ; seul `known_at` change (30 → 19). Le résultat change donc **uniquement** à cause de la dimension de connaissance — preuve que la jointure doit être bitemporelle.
- **Effet irréversible / rollback** : la clôture de `OPEN` à 19 est une **fin de connaissance**, pas une annulation d'événement ; on ne « ressuscite » pas `OPEN` à p = 20 par simple reconfiguration.
- **Exhaustivité** : les trois caractéristiques temporelles (OPEN, APPROVED, RAIN) et l'étiquette Y sont toutes traitées ; aucune n'est laissée sans verdict.

## Limites / impossibilités

- **Ce qui est garanti** : à p = 20, le seul statut courant admissible est `APPROVED` ; `OPEN` est expiré ; `RAIN` est admissible.
- **Ce qui n'est pas garanti** : cette conclusion porte **uniquement** sur l'admissibilité temporelle des caractéristiques à p = 20. Elle ne dit rien de la véracité de la correction `APPROVED` (une correction connue à 19 peut elle-même être erronée), ni de l'effet causal du système, ni de la validité de l'extraction actuelle qui, elle, reste **fausse** tant qu'elle ne filtre pas aussi la dimension de connaissance.
- **Sensibilité** : le résultat est **exactement** à la frontière — si la connaissance de `APPROVED` était à 21 (ou la fin de connaissance de `OPEN` à 20), le statut admissible redeviendrait `OPEN`. La conclusion dépend donc de façon critique de la date de connaissance, et non de la date de validité.