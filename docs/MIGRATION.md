# Migration du dépôt public

La V14 est une migration majeure, pas une extension parallèle de la V13.

| Ancien élément | Nouvelle destination / décision |
|---|---|
| `package.json` V13, `build/cli.js` | Paquet V14 sans dépendance runtime ; bin `bin/smart-thinking.mjs`. |
| `src/` serveur local et heuristiques | Retirés de la distribution publique active. La V14 serveur a son dépôt privé ; l'historique V13 est conservé. |
| Python/CAS lancé chez le client | Non distribué. Le serveur privé exécute ses opérations typées. |
| `.env` fournisseur chez le client | Remplacé par l'URL du service. **Aucun jeton requis depuis 14.2.1** (un jeton nominatif facultatif donne un quota dédié). Aucune clé Jev ici. |
| Scripts V13 de benchmarks/GCP/proofs | Retirés de ce client ; résultats historiques consultables au commit V13, non attribués à V14. |
| Dockerfile serveur | Remplacé par image **cliente stdio** non-root ; le Cloud Run serveur appartient au dépôt privé. |
| Jest, TypeScript et compilation serveur | Remplacés côté public par tests Node natifs et vérification syntaxique. |
| README/architecture | Réécrits pour le produit distant et ses limites réelles. |
| Client isolé ajouté dans PR6 | Devenu le véritable point d'entrée du paquet, avec tests présents et packaging testé. |

## Ordre de livraison

1. Déployer le backend de production et ses secrets côté serveur.
2. Exécuter les tests du noyau, du worker et du véritable client distant.
3. Valider authentification, isolation des utilisateurs et parcours fournisseurs en production.
4. Exécuter et publier les mesures comparatives avec leurs limites.
5. Publier le client stable, puis **connecter votre outil à l'endpoint public** (aucun jeton requis depuis 14.2.1 ; jeton nominatif facultatif).

La livraison du 16 septembre 2026 se fait directement en production, conformément
à la demande de l’opérateur. Voir [le bilan de version](RELEASE_V14.md).

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
