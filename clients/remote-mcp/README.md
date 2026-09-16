# Client distant Smart-Thinking V14

Client public **14.0.0-dev.3**, Node.js **22.16.0 minimum**. Il relie un hôte MCP
stdio au serveur privé V14. Aucun `npm install` n'est nécessaire pour l'exécuter.
Il ne contient ni moteur Jev, ni prompts privés, ni clés fournisseur.

## Configuration

Créer un fichier de jeton MCP attribué par l'opérateur, hors du dépôt. Ce n'est
**jamais** la clé TypeSafe. Permissions POSIX recommandées : `chmod 600`.

```bash
export SMART_THINKING_MCP_URL="https://VOTRE-SERVICE.run.app/mcp"
export SMART_THINKING_MCP_TOKEN_FILE="$HOME/.config/smart-thinking/token"
node clients/remote-mcp/bridge.mjs
```

Le bridge relit le fichier à chaque requête. Ne pas mettre le jeton dans les
arguments, dans une URL, dans la configuration MCP partagée ou dans Git.
HTTPS est obligatoire. `--allow-loopback` autorise uniquement HTTP sur une IP
littérale `127.0.0.1` ou `::1` pour des essais locaux explicites.

### Client MCP stdio

```json
{
  "mcpServers": {
    "smart-thinking-v14": {
      "command": "node",
      "args": ["/CHEMIN/Smart-Thinking/clients/remote-mcp/bridge.mjs"],
      "env": {
        "SMART_THINKING_MCP_URL": "https://VOTRE-SERVICE.run.app/mcp",
        "SMART_THINKING_MCP_TOKEN_FILE": "/CHEMIN/PRIVE/token"
      }
    }
  }
}
```

### Cloud Run privé : deux identités distinctes

Le jeton applicatif reste dans `Authorization`. L'identité IAM est envoyée dans
`X-Serverless-Authorization`. Choisir **une seule** source IAM :

| Variable | Usage |
|---|---|
| `SMART_THINKING_ID_TOKEN_FILE` | Fichier de jeton d'identité Google, renouvelé par l'opérateur. |
| `SMART_THINKING_IAM_SERVICE_ACCOUNT` | Compte **client** dédié à impersonner via `gcloud`, jamais le compte runtime. |
| `SMART_THINKING_IAM_AUDIENCE` | Avec impersonation : URL du service récepteur fournie par Terraform, sans `/mcp`. |

L'identité cliente doit avoir `roles/run.invoker` sur le MCP. L'opérateur doit
être autorisé à l'impersonner. Aucun fichier de clé de compte de service n'est
créé par ce client. Le jeton obtenu par `gcloud` est mis en cache cinq minutes.
En mode public authentifié, le jeton applicatif reste obligatoire ; l'identité
IAM additionnelle dépend de la configuration de déploiement.

## Validation

```bash
npm --prefix clients/remote-mcp test
node scripts/v14-test-package.mjs
node clients/remote-mcp/doctor.mjs --allow-network
```

Le doctor effectue initialize, capabilities et tools/list, pas une inférence
Jev. Sa réussite ne prouve ni l'isolation multi-utilisateur ni la qualité IA.

## Contrat et limites

Transport ciblé : Streamable HTTP **stateless à réponses JSON**, avec négociation
des versions `2025-03-26`, `2025-06-18` et `2025-11-25`. Ce n'est pas un client SSE
universel, ni une implémentation des révisions MCP ultérieures. Une session
stateful retournée par un autre serveur est explicitement rejetée.

Requêtes plafonnées à 256 000 octets, réponses à 1 600 000 octets, délai maximal
115 secondes, huit requêtes et huit notifications simultanées. Les identifiants
de réponse sont vérifiés. Le bridge préserve les IDs de l'hôte, négocie avant
les appels suivants et remappe les annulations. Il ne réessaie **jamais** une
mutation automatiquement et ne suit pas les redirections.

Une annulation interrompt l'attente locale mais ne garantit pas l'annulation
d'une action déjà reçue par une autre instance Cloud Run. Utiliser `run_cancel`
pour l'annulation durable et `operation_get` pour vérifier le reçu avant de
réessayer. Le bridge ne gère pas de navigateur OAuth, PKCE ni refresh token : un
IdP externe doit fournir et renouveler le jeton d'accès.

Le paquet reste `private: true` pour éviter une publication npm accidentelle.
La validation de packaging n'exécute aucune publication.

Références : [transport MCP ciblé](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports),
[authentification interservices Cloud Run](https://docs.cloud.google.com/run/docs/authenticating/service-to-service).
