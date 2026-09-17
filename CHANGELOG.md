# Changelog

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

