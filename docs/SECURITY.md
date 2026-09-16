# Sécurité du client public

Aucun secret fournisseur, prompt propriétaire ni code serveur ne doit être publié
ici. Le scanner `scripts/v14-check-public.mjs` refuse les répertoires serveur,
archives, bases locales, états Terraform et plusieurs formats de secrets. C'est
un contrôle supplémentaire, pas une preuve d'absence de fuite. Activer aussi la
protection de branches et le secret scanning GitHub selon les options du compte.

Les jetons MCP sont saisis dans un fichier privé avec permissions adaptées ; ne
pas les coller dans une issue, une PR, l'URL ou les arguments de commande. Ils
restent accessibles à l'opérateur local autorisé. Révoquer/renouveler tout secret
précédemment exposé. La clé Jev reste exclusivement dans le Secret Manager du
serveur. Un endpoint externe reçoit nécessairement le contenu qu'on lui envoie.

HTTPS obligatoire ; exception volontaire uniquement pour IP loopback de test.
Ni redirection ni retry automatique. La taille, la concurrence et la durée sont
bornées. Les messages d'erreur transport ne reproduisent pas de corps distant.
Les résultats d'outils restent des données non fiables que l'hôte doit traiter
sans exécuter d'instructions injectées.

Une interface OAuth interactive n'est pas fournie. Les jetons doivent être obtenus
et renouvelés par l'opérateur ou un fournisseur d'identité séparé. Le contrôle
IAM Cloud Run et l'identité applicative sont deux responsabilités distinctes.

Le code V13 déjà public demeure dans l'historique et les anciennes distributions.
Aucune suppression de branche dans cette PR ne peut rendre rétroactivement ce
code secret. Ne jamais copier une archive de serveur privé dans ce dépôt.

En cas d'incident, révoquer le jeton côté serveur, examiner les reçus d'opération
avec les droits nécessaires, puis faire la rotation. Ne pas publier les journaux
contenant des dossiers utilisateurs pour demander de l'aide.
