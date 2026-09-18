# Changelog

## 15.0.1 — découverte du catalogue : pagination complète (fiche équipe T01)

`RemoteConnection.tools()` suit désormais `nextCursor` sur toutes les pages et retourne l'union filtrée par profil. Toute anomalie — page mal formée, doublon d'outil, curseur répété ou surdimensionné, erreur en cours de pagination, dépassement de 32 pages — refuse la découverte ENTIÈRE, jamais un catalogue partiel silencieux. Serveur inchangé (15.0.1). Tests : `catalog-pagination.test.mjs` (8 cas, catalogue simulé à deux pages avec `run_export` en page 2).

## 15.0.0 — client aligné sur l'audit V15 (serveur 15.0.0)

- Erreurs structurées : les refus d'outil exposent `code`, `reasonCode` (ex.
  `EGRESS_NON_PUBLIC`, `DATA_POLICY_EXTERNAL_DISABLED`, `SCOPE_MISSING`,
  `CAPABILITY_REQUIRED`) et `quota {dimension, requested, allowed, remaining, recovery}`
  validés — les hôtes décident sans analyser le message.
- Profil wire `smart-thinking-mcp/15.0` ; contrat `contracts/v14.json` clientVersion 15.0.0
  (+ `run_export` dans les profils discovery research/audit).
- Capacités de dossier : pour un accès anonyme, l'identifiant retourné par `run_create`
  embarque la capacité du dossier — reusez-le EXACTEMENT tel que retourné, il n'est
  jamais ré-émis.
- Serveur 15.0.0 : 34 outils, vérificateur d'ordre v2 (unicité), domaines symboliques
  appliqués, plan sans appel fournisseur pour les dossiers restreints, `run_export`,
  métadonnées de build. Détails : docs/RELEASE_V15.md.

## 14.2.2 — correctifs issus d'un usage réel

- Comparaisons booléennes unifiées : `check` et `claim → verify` acceptent `62 >= 70`
  avec `expected: "true"|"false"` (même noyau exact que `calculate`).
- `plan`/`reason` : le déterministe d'abord — une décision Jev `clarify` (non calibrée)
  ne bloque plus les claims exactes ; clarification **scopée** ; `frontier` expose
  `category`/`selected`/`reason` pour chaque claim.
- `semantic_segment` : `granularity: coarse | sentence | atomic` (offsets littéraux,
  type, confiance, lien parent).
- `run_create` : `availability` (inférence sémantique / recherche externe + raison) et
  avertissement non bloquant si l'objectif semble nécessiter une interprétation.
- `budget_status` : `baseRunBudget` / `profileMultiplier` / `effectiveRunBudget` /
  `consumed` / `held` (alias `limits`/`budgetLimit` conservés).
- Docs : architecture et flux de données (`dataClass` × `externalAllowed`), sécurité,
  bilan de version, migration et benchmarks mis à jour.

## 14.2.1 — accès public sans jeton

- Aucun jeton requis : le point d'accès hébergé accepte les requêtes anonymes ;
  `SMART_THINKING_MCP_TOKEN_FILE` devient facultatif (quota nominatif supérieur si fourni).
- L'endpoint public est la valeur par défaut ; `SMART_THINKING_MCP_URL` reste une surcharge.
- ChatGPT (Developer Mode → connecteur sans authentification), Claude Code, Codex, Hermes,
  Cursor et Antigravity se connectent sans configuration de secret.
- Doctor et `--help` reflètent le mode public ; le serveur garde les plafonds opérateur et
  isole les dossiers anonymes (liste de dossiers désactivée en anonyme).
- Contrats machine `contracts/v14.json` : clientVersion 14.2.1, authentification « none required ».

## 14.0.0-dev.4 — migration réelle vers le client distant

Rupture : `smart-thinking-mcp` lance le client distant, plus le serveur V13 local.
Le paquet n'inclut plus les heuristiques, workers, sessions et outils serveur V13.
README, architecture, Dockerfile, scripts, tests et packaging sont remplacés pour
ce rôle. Ajout d'un lockfile, d'un contrat inter-dépôts et de tests réellement
versionnés. Initialisation/annulation, limites et rotation des jetons renforcées.

Serveur, décisions Jev, preuves et infrastructure développés dans le dépôt privé.
Aucun déploiement ni gain de benchmark réel n'est impliqué par ce changement.
Pas de publication automatique ni de migration de données utilisateur.

L'historique V13 et son changelog restent consultables au commit
`a2dd4e6d926e50f8244b061f6ec97c90e5db62bb`.
# 14.2.0 — profils de découverte et validation coordonnée

- Ajoute les profils explicites full/math/research/code/audit au bridge stdio.
- Ajoute `RemoteConnection.tools(profile)` ; filtre seulement les outils réellement annoncés.
- Conserve les contrats de sécurité, corrélation RPC, annulation et absence de retries de mutations.
- Déclare les extensions optionnelles calculate_batch, finite_compute, check, cas du core 14.2.
- CI sur les branches v14.2, version du paquet 14.2.0, tag de publication par défaut next.
- Les fonctionnalités de calcul/recherche s'exécutent dans le core ; aucun code fournisseur privé ici.

