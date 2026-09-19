# Smart-Thinking 16.0.0 — notes client

Serveur : **16.0.0** (dépôt privé `Smart-Thinking-core`). Client : **16.0.0**,
publié en même temps que le serveur. Profil wire : **`smart-thinking-mcp/16.0`**.

## Correctif immédiat (lot L0 — visibilité)

Le profil `code` de `clients/remote-mcp/protocol.mjs` n'exposait que les outils
exacts : un hôte qui sélectionnait ce profil ne **découvrait pas** les fonctions de
jugement Jev (`analyze`, `plan`, `critique`, `next_step`) ni leurs dépendances de
dossier. C'est la cause concrète n°1 de la sous-utilisation relevée par le dossier
d'architecture V16.

Le profil `code` de la V16 expose désormais :

- la **façade de supervision** `code_bind`, `code_context`, `code_review`,
  `code_check_start`, `code_job_get`, `code_job_cancel`, `code_checkpoint`,
  `code_gate` ;
- les outils de **jugement Jev** (`analyze`, `plan`, `critique`, `next_step`) ;
- leurs **dépendances de dossier** (`run_create`, `run_get`, `run_export`,
  `artifact_import`, `artifact_get`, `claim`, `claim_revise`, `requirement_add`,
  `verify`, `audit`, `run_finalize`, `run_cancel`, `events`) ;
- la **traçabilité** (`budget_status`, `operation_get`) ;
- **toutes** les capacités exactes précédentes (`calculate`, `calculate_batch`,
  `finite_compute`, `solve_logic`, `solve_math`, `check`).

Les tests de profils vérifient maintenant explicitement ces propriétés
(`clients/remote-mcp/tests/code-profile-v16.test.mjs`), y compris la fermeture de
dépendances : aucun profil ne dépend silencieusement d'outils qu'il ne présente pas.

## Empreinte du catalogue

`capabilities.catalog` publie `{ count, fingerprint }` : l'empreinte SHA-256 du
catalogue trié par noms. Le client exporte `catalogueFingerprint(tools)` et
`verifyCatalogue(announced, tools)` ; `doctor` la vérifie et échoue si la
découverte reçue n'est pas le catalogue annoncé (distingue serveur, client et
cache du connecteur).

## Compatibilité

- Le client 16.0.0 exige un serveur 16.0 ; la plage annoncée côté serveur est
  `>=14.0.0 <17.0.0` et les clients 14.x/15.x restent fonctionnels contre les
  serveurs de leur ligne.
- Les dossiers V15 restent lisibles avec leur portée historique ; les objets
  logiciels V16 vivent dans une extension explicite (`code`) du document de
  dossier. Un dossier V15 n'est jamais converti silencieusement en dossier
  logiciel certifié.
- `SMART_THINKING_TOOL_PROFILE=code` ne change aucun droit : le serveur autorise
  chaque appel indépendamment du profil de découverte.

## Vérifications de cette version

```bash
npm ci && npm run check
```

La suite couvre le transport, la pagination du catalogue, la négociation, les
erreurs structurées, les profils (dont la régression L0 ci-dessus) et la frontière
public/privé. Les tests vivent dans `clients/remote-mcp/tests/` et
`scripts/tests/`.
