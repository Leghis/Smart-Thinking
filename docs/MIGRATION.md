# Migration du dépôt public

Cette PR est une migration majeure, pas une extension parallèle de la V13.

| Ancien élément | Nouvelle destination / décision |
|---|---|
| `package.json` V13, `build/cli.js` | Paquet V14 sans dépendance runtime ; bin `bin/smart-thinking.mjs`. |
| `src/` serveur local et heuristiques | Retirés de la distribution publique active. La V14 serveur a son dépôt privé ; l'historique V13 est conservé. |
| Python/CAS lancé chez le client | Non distribué. Le serveur privé exécute ses opérations typées. |
| `.env` fournisseur chez le client | Remplacé par URL + chemin de jeton MCP. Aucune clé Jev ici. |
| Scripts V13 de benchmarks/GCP/proofs | Retirés de ce client ; résultats historiques consultables au commit V13, non attribués à V14. |
| Dockerfile serveur | Remplacé par image **cliente stdio** non-root ; le Cloud Run serveur appartient au dépôt privé. |
| Jest, TypeScript et compilation serveur | Remplacés côté public par tests Node natifs et vérification syntaxique. |
| README/architecture | Réécrits pour le produit distant et ses limites réelles. |
| Client isolé ajouté dans PR6 | Devenu le véritable point d'entrée du paquet, avec tests présents et packaging testé. |

## Ordre de livraison

1. Revoir les deux PR. Le merge du client seul ne rend pas le backend disponible.
2. Valider le serveur privé en staging avec un projet GCP dédié et des clés neuves.
3. Exécuter le test inter-dépôts, le doctor et les tests du véritable client hôte.
4. Fournir endpoint et jetons applicatifs aux utilisateurs de test.
5. Publier une préversion explicitement, jamais automatiquement depuis cette PR.
6. Passer au tag stable seulement après les recettes et mesures comparatives.

## Utilisateurs V13 existants

Ne pas remplacer leur configuration avant d'avoir reçu endpoint et jeton V14.
Pour conserver V13, épingler une version npm V13 vérifiée ou utiliser le commit
historique `a2dd4e6d926e50f8244b061f6ec97c90e5db62bb`. Les anciens arguments
`--transport=http`, `--host`, `--port`, ainsi que les imports du moteur local,
sont des ruptures d'API explicites. Ne pas faire un fallback silencieux.

Les sessions V13 ne sont pas envoyées automatiquement au cloud. L'opérateur du
serveur dispose d'un import restreint, non destructif et sans promotion des
anciens verdicts. Une migration de données demande un consentement séparé.

## Retour arrière

Avant publication, conserver la configuration cliente antérieure. Revenir à
l'artefact V13 épinglé ne doit pas supprimer les dossiers V14 stockés à distance.
Le rollback du serveur Cloud Run se fait dans son dépôt privé et indépendamment
du client. Les opérations dont le résultat est inconnu doivent être réconciliées,
non réessayées à l'aveugle.
