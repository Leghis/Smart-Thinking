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
