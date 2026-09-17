# Tests du client V14

```bash
npm ci
npm run check
```

La suite exécute les tests de transport/stdio, de rotation de fichiers de jetons,
de négociation, d'initialisation, d'annulation, de limites, de refus d'enveloppes
malformées, de compatibilité du point d'entrée, ainsi que le scanner public.
Le contrôle de packaging crée le tarball, impose une liste exacte de neuf fichiers,
l'installe hors ligne dans un consommateur vierge et exécute son bin/export.

Les fichiers de tests référencés sont versionnés dans cette PR. La CI n'appelle
ni Jev ni GCP, ne demande aucun secret et ne publie pas de paquet. Les fixtures
contiennent uniquement des jetons synthétiques.

Dans le dépôt privé, `scripts/test-cross-repo.mjs` exécute ce véritable client
contre le véritable serveur HTTP V14 avec stockage mémoire et fournisseur simulé.
C'est un test d'intégration de code, pas une validation de Firestore/IAM en cloud.
Le workflow privé épingle une révision publique pour cette recette.

Pour la cible réelle, configurer l'URL (`SMART_THINKING_MCP_URL`, facultatif : endpoint public par
défaut) et, si vous disposez d'un quota nominatif, `SMART_THINKING_MCP_TOKEN_FILE` ; puis
`npm run doctor`.
La réussite ne prouve pas la qualité Jev, le cloisonnement complet ou la tenue en
charge. Ceux-ci ont des recettes et autorisations spécifiques dans le dépôt privé.
