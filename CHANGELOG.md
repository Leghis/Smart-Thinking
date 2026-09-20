## 16.3.1 — filtered search and source selection

- Publish the updated 43-tool contract with Tavily domain/date/depth options and source-specific Jev ranking.
- Refresh installation commands and shared metadata for core 16.3.1 and site 2.2.1.

## 16.3.0 — qualified semantic-review contract

- Align the manifest and catalogue with engine 16.3.0 and website 2.2.0; the existing MCP interface and client behavior remain compatible.
- Explain the scoped internal review qualification, its limits and current installation commands in the short English README.

## 16.2.1

- Correct the public README to describe eighteen scenarios and the current advisory calibration status. Client behavior and MCP compatibility are unchanged.

## 16.2.0 — focused reviews and clearer guides

- Update the published contracts and release manifest for engine 16.2.0 and website 2.1.0. The existing 43-tool interface remains compatible.
- Keep the short English npm guide, with current installation commands and links to the bilingual examples and benchmark documentation.

## 16.0.2 — alignement de version avec le serveur 16.0.1

- Métadonnées uniquement : `contracts/v16.json` déclare `serverVersion 16.0.1` et
  `clientVersion 16.0.2` ; le serveur publie désormais `capabilities.version = 16.0.1`
  (même correction du côté serveur : plus d'ambiguïté « serveur 16.0.0 / client 16.0.1 »).
- Aucun changement de comportement : la plage de compatibilité et la surface d'outils
  (42 au catalogue, profil `code` complet) sont inchangées.

# Changelog

## 16.0.1 — garde-fou de catalogue (serveur 16.0)

- `verifyCatalogue` échoue avec des **codes machine-lisibles** : `CATALOGUE_INCOMPLETE`
  (ex. `expected 42, discovered 33`), `CATALOGUE_FINGERPRINT_MISMATCH`,
  `CATALOGUE_NOT_ANNOUNCED` — et marque l'erreur `catalogueIncomplete: true`. Un catalogue
  partiel n'est jamais accepté silencieusement : l'hôte (ou `doctor`) sait qu'il doit
  rafraîchir sa découverte au lieu de conclure à une panne serveur.

## 16.0.0 — client du superviseur logiciel V16 (serveur 16.0)

- **Correctif L0** : le profil `code` expose la façade `code_*`, les outils Jev
  (`analyze`, `plan`, `critique`, `next_step`) et toutes leurs dépendances de
  dossier/artefacts/budget — plus la conservation des capacités exactes. Test de
  régression dédié (`code-profile-v16.test.mjs`).
- **Empreinte du catalogue** : `capabilities.catalog {count, fingerprint}`,
  `catalogueFingerprint()` / `verifyCatalogue()` côté client, vérification dans
  `doctor` (échoue sur catalogue partiel ou divergent).
- Profil wire `smart-thinking-mcp/16.0` ; contrat `contracts/v16.json` ;
  `contracts/v14.json` conservé comme référence historique.

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

