# Smart-Thinking 15.0.0 — notes client

Serveur : **15.0.0** (dépôt privé `Smart-Thinking-core`, réponse à l'audit V15).
Client : **15.0.0** — publié en même temps que le serveur (attestation de version, constat A18).

## Ce qui change côté client

- **Erreurs structurées** : `toolError` attache `code`, `hint`, `reasonCode` et `quota`
  (forme validée, bornes strictes) à l'`Error` levée par `call()` ; le message préfixé
  reste inchangé pour la compatibilité.
- **Profil** : `API_PROFILE = 'smart-thinking-mcp/15.0'`, contrat `contracts/v14.json`
  mis à jour (clientVersion 15.0.0).
- **Capacité de dossier (anonyme)** : l'identifiant `run_…` retourné par `run_create`
  peut contenir la capacité du dossier (suffixe après le point). Recopiez-le
  **exactement** ; il autorise seul les opérations sur ce dossier et n'est jamais
  ré-émis (rejeu compris). Perdu → créez un nouveau dossier.
- **Nouvel outil serveur** : `run_export` (copie portable bornée), disponible aussi
  dans les profils discovery `research` et `audit`.

## Compatibilité

- Le client 14.x reste fonctionnel contre le serveur 15.0.0 (ajouts additifs ; les
  nouveaux champs d'erreur sont ignorés par les anciens clients).
- Les vérifications déterministes antérieures ne sont pas cassées ; seuls les verdicts
  `finite-ordering` v1 et symboliques v1 sont lus « superseded » côté serveur (jamais
  réécrits) et doivent être rejoués pour compter à nouveau.

## Vérifications

- Client : `npm run check` (74 tests + validations) vert.
- Serveur : suite complète + acceptance production + banc d'audit `regressions_v15.py`
  (16 cas) — résultats archivés dans le dépôt privé.

## 15.0.1 (client) — pagination du catalogue (T01)

Fiche équipe T01 : la découverte suivait un seul `tools/list`. Avec un catalogue à deux pages, l'ancien code retournait la première seulement. Correctif : la boucle suit `nextCursor` jusqu'à la page finale (garde-fous : doublons, curseurs répétés/malformés, pages malformées, erreur en cours, plafond de 32 pages) — toute anomalie refuse la découverte entière. Aucune autorisation, aucun filtre de profil, aucune politique de retry modifiés. Le serveur ne pagine pas aujourd'hui (34 outils, une page) ; ce correctif est une défense en profondeur conforme au protocole et un prérequis pour toute pagination future.
