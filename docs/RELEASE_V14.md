# Bilan de version — client 14.0.0 (16 septembre 2026)

Ce document résume ce qui est publié, ce qui a été vérifié et ce qui a été mesuré.
Il ne remplace pas les notes de version npm ; il les documente.

## 1. Ce qui change

- Le paquet `smart-thinking-mcp` n'embarque plus de serveur local : c'est un **client MCP
  authentifié** du serveur V14 privé. Un endpoint et un **jeton individuel** sont requis
  (fichier local, jamais une clé fournisseur).
- Endpoint de production :
  `https://smart-thinking-v14-923774092927.northamerica-northeast1.run.app/mcp` —
  santé publique : `/health`.
- Le moteur de raisonnement, les preuves, Jev, les budgets et les secrets restent **côté serveur**.
  Rien de sensible n'est dans le paquet.

## 2. Vérifié le 16 septembre 2026

- **61 tests** du client, contrôle de frontière public/privé, test de packaging (installation hors
  ligne dans un consommateur vierge) : tous verts ; CI verte sur Node 22.16 et 24.
- **Doctor** contre la production : `ok`, protocole `2025-11-25`, 26 outils, profil
  `smart-thinking-mcp/14.0`, sémantique `typesafe/jev`.
- **Recette de production authentifiée exécutée avec ce client** (16,8 s, jetons réels) :
  **26 contrôles passés** — handshake et catalogue, refus des requêtes non authentifiées, entier
  exact au-delà de la précision JavaScript, cache de vérification, Jev réel (analyse, revue de
  passage, sémantique), worker symbolique via IAM avec refus anonyme, artefacts persistants,
  recherche Tavily réelle, fetch borné, refus inter-utilisateur et écriture refusée en lecture
  seule, persistance entre connexions, finalisation, annulation, 8 lectures concurrentes.
  Latences observées : lectures chaudes **54–98 ms** ; 8 lectures concurrentes **91–421 ms**.

## 3. Mesure comparative publiée avec ses limites

Campagne diagnostique du 16 septembre 2026 : 24 tâches synthétiques à réponse univoque
(entiers exacts, rationnels exacts, raisonnement, classification d'exactitude), 3 bras ×
2 répétitions, **même modèle hôte** (DeepSeek `deepseek-flash`, température 0), mêmes verrous
(10 réponses max, 16 appels d'outils, 8 000 tokens générés), web désactivé partout, outils MCP
réels par bras, aucune réponse de référence fournie à l'agent.

| Bras | Exactitude | Entiers exacts | Rationnels | Raisonnement | Sources | p50 | p95 |
|---|---|---|---|---|---|---|---|
| Hôte seul (sans MCP) | 89,6 % (43/48) | 6/8 | 7/8 | 14/16 | 16/16 | 0,8 s | 3,4 s |
| MCP V13 locale (npm 13.1.1) | 93,8 % (45/48) | 5/8 | 8/8 | 16/16 | 16/16 | 3,0 s | 7,6 s |
| MCP V14 distante (ce client) | 97,9 % (47/48) | 8/8 | 8/8 | 15/16 | 16/16 | 7,3 s | 10,2 s |

Lecture honnête : sur ce jeu, l'ordre observé est V14 > V13 > hôte seul, porté par l'exactitude
vérifiée (le serveur calcule ; le modèle peut se corriger sur une contradiction). Les écarts de
1 à 2 tâches sur 48 **ne sont pas statistiquement significatifs** ; c'est un diagnostic de version,
pas un classement. La V14 distante paie son service : ~50 ms d'API par lecture, latence p50 plus
élevée et davantage de tokens, réseau, authentification et Jev inclus.

Limites : jeu rédigé pour cette livraison et non partie d'un classement externe ; 2 répétitions ;
tâches non indépendantes entre bras ; famille « sources » saturée ; qualité web non mesurée
(web désactivé) ; aucun multiplicateur de qualité ou de vitesse n'est promis. Un extracteur de
réponse trop strict utilisé lors d'un premier passage sous-évaluait tous les bras ; il a été
corrigé **avant** la campagne officielle, et les deux passages sont conservés comme preuve.

## 4. Démarrer

```bash
npm install -g smart-thinking-mcp@14.0.0
export SMART_THINKING_MCP_URL="https://smart-thinking-v14-923774092927.northamerica-northeast1.run.app/mcp"
export SMART_THINKING_MCP_TOKEN_FILE="/CHEMIN/PRIVE/token"   # jeton individuel fourni par l'opérateur
smart-thinking-mcp --version
smart-thinking-mcp   # serveur MCP stdio pour votre client hôte
```

Rappels : jamais de clé fournisseur dans ce client ; le jeton se révoque côté serveur ;
`--help` liste les options. La V13 reste disponible dans l'historique du dépôt pour référence.
