# SIII-02 — Le navigateur aux identités superposées

Score: 81.0 % (certificats 0/0, juge 81/100)

Certificats manqués: aucun

# RÉPONSE FINALE

## Q1 — Matrice incident / frontière / preuve / composant

| Incident | Frontière franchie | Type | Preuve de fuite | Composant responsable | Statut |
|---|---|---|---|---|---|
| **P01** | Cache mémoire frontend ↔ vue | **Affichage erroné + divulgation** | `setDossier(response)` sans contrôle de génération : la réponse SOLEIL (gén. 8) écrase la vue LUNE (gén. 9) | Gestionnaire commun frontend | **Établi** |
| **P02** | Rendu serveur (octets émis avant contrôle) | **Divulgation** | R04 : le fragment HTML nom + note privée est émis *avant* le contrôle ; le 403 final ne « dé-émet » rien | Serveur de rendu | **Établi** |
| **P03** | Service worker (cache hors ligne) | **Divulgation** | Le SW renvoie le JSON SOLEIL à une session LUNE, backend non contacté | Service worker | **Établi** |
| **P04** | Autorité des mutations / concurrence | **Mutation indûment autorisée + affichage erroné** | La mutation SOLEIL aboutit après bascule ; « Mise à jour réussie » annoncée dans LUNE | API mutations + composant | **Établi** |

**Distinction** : *divulgation* = octets d'une autre organisation reçus (P02, P03, et P01 pour la note privée SOLEIL) ; *affichage erroné* = résultat SOLEIL présenté dans la vue LUNE (P01, P04) ; *mutation indûment autorisée* = écriture SOLEIL exécutée alors que le contexte affiché est LUNE (P04). **Non déterminé** : si l'usagère a effectivement *lu* les octets P02/P03 (R04 dit qu'un octet émis est divulgué, mais la copie effective par un humain n'est pas observable).

## Q2 — Condition nécessaire de partage de cache

**Condition nécessaire (I1)** : deux requêtes ne peuvent partager une entrée que si leurs **droits effectifs sur la ressource sont identiques**. Formellement, la clé doit être un **raffinement de la fonction d'autorisation effective** : `K(r1)=K(r2) ⟹ Auth(r1,o,a)=Auth(r2,o,a)` pour tout `(o,a)` atteignable via K.

Analyse (certificat `compute`, 2 principaux même rôle AGENT, même org, même dossier, permissions différentes) :

| Clé | Buckets | Collisions dangereuses | Verdict |
|---|---|---|---|
| K-a (chemin) | 1 | **1** | Insuffisant |
| K-b (org+dossier) | 1 | **1** | Insuffisant |
| K-c (org+dossier+rôle) | 1 | **1** | Insuffisant (R01 : le rôle nommé ne détermine pas les permissions) |
| K-d (contexte complet + révision + langue + version) | 2 | **0** | Seul admissible |

**Politique concrète** : pour toute réponse protégée, `Cache-Control: private, no-store` (CDN ne stocke pas) ; clé de cache interne = K-d ; le service worker ne sert une entrée que si `(principal, org, dossier, révision_politique, langue, version_représentation)` correspond à la session courante, sinon réseau obligatoire.

**Pourquoi une clé n'est pas un contrôle d'accès** : la clé ne fait que *séparer* des entrées ; elle ne *décide* rien. Si la clé est trop grossière (K-a..K-c), deux principaux distincts tombent dans le même bucket et le cache **sert** la réponse de l'un à l'autre — c'est une décision d'autorisation prise par le cache, sans point de décision (R02). Une clé correcte (K-d) est *nécessaire* mais pas *suffisante* : il faut aussi que le point de décision serveur reste l'autorité (R06).

## Q3 — Machine d'état (changement de contexte / chargement / mutation)

```
ÉTATS: Idle | Loading(gen, ctx) | Ready(gen, ctx) | Mutating(gen, ctx, opId) | Revoked

TRANSITION switchContext(newCtx):
  gen ← gen + 1                      # génération de vue monotone (R05)
  ctx ← newCtx
  purge cache mémoire (clé K-d de l'ancien ctx)
  postMessage(SW, {type:"invalidate", ctx:newCtx})   # SW ne sert plus l'ancien ctx
  état ← Loading(gen, ctx)
  annonce_accessible("Contexte changé : " + newCtx.org)   # aria-live=polite

TRANSITION onResponse(resp):
  si resp.gen ≠ gen_courante OU resp.ctx ≠ ctx_courant:
      # R07 : ne JAMAIS remplacer la vue courante
      journaliser("opération exécutée dans l'ancien contexte " + resp.ctx.org)
      annonce_accessible("Résultat de l'ancien contexte ignoré pour l'affichage")
      return
  setDossier(resp)                   # seule voie autorisée

TRANSITION mutate(op):
  opId ← uuid(); gen_op ← gen; ctx_op ← ctx
  envoyer {opId, ctx_op, gen_op, action, objet, finalité}   # PAS de allowed=true, PAS d'org client
  état ← Mutating(gen_op, ctx_op, opId)

TRANSITION onMutationResult(r):
  si r.ctx_op ≠ ctx_courant:
      afficher séparément : « opération exécutée dans l'ancien contexte (SOLEIL) »
      + « état affiché dans le contexte actuel (LUNE) »     # R07
  sinon: afficher « Mise à jour réussie » dans le contexte courant

RENDU SERVEUR (R04 corrigé):
  décision ← autoriser(principal, org, objet, action, finalité, révision)   # AVANT tout octet
  si décision == refus: émettre UNIQUEMENT le fragment « accès refusé » (aucun octet privé)
  sinon: émettre le fragment complet
```

**Onglets** : chaque onglet a sa propre génération ; le changement de contexte diffuse via `BroadcastChannel` ; un onglet qui reçoit un changement de contexte invalide ses requêtes en vol (marquage, pas annulation fiable — R05). **Annonces accessibles** : `aria-live="polite"` pour le changement de contexte, `role="status"` pour le résultat de mutation, message distinct ancien/nouveau contexte.

## Q4 — Ordre logique et réparation de l'API

**Ordre requis (I5)** : `révocation (écriture sérialisée) < toute lecture/mutation dont le point de décision est postérieur`. Sur 6 ordres possibles de {R, L, M}, seuls **2** placent R en tête : `(R,L,M)` et `(R,M,L)` (certificat `compute`). Toute décision postérieure à R doit être refusée.

**Réparation de l'API (R06)** :
1. **Organisation** : extraite de la **session serveur**, jamais du JSON client.
2. **Supprimer `allowed=true`** : l'autorisation est calculée côté serveur sur `(principal, org, objet, action, finalité, révision)`.
3. **Jeton** : preuve d'identité **+** liaison de session ; cookie `SameSite=Strict` + jeton anti-CSRF (double-submit) car les cookies partent automatiquement.
4. **Validation atomique** : la mutation et la vérification de politique dans la même transaction sérialisée.

**Mutation dont l'annulation navigateur n'a pas annulé l'effet (P04)** : l'annulation est une tentative de transport (R05), pas un rollback. Traitement : (a) `opId` idempotent + clé d'idempotence serveur ; (b) la réponse porte `ctx_op` et `gen_op` ; (c) le composant affiche **séparément** « opération exécutée dans l'ancien contexte » et « état affiché dans le contexte actuel » (R07) ; (d) **refuser** la proposition de « changer le JSON en transit pour remplacer SOLEIL par LUNE » : c'est une falsification de contexte qui masque une mutation réelle et viole R06/R07.

## Q5 — Non-divulgation, impossibilité P06, garantie honnête

**Propriété de non-divulgation (périmètre R08)** : *Après révocation, aucune nouvelle décision d'autorisation postérieure n'est accordée, et aucune donnée d'une autre organisation n'est affichée ni annoncée dans le contexte courant.* Preuve : par I2 (aucun octet émis avant décision), I3 (application conditionnée à la génération/contexte), I5 (ordre R < décisions postérieures), I6 (SW n'utilise pas un contexte périmé). **Portée explicite** : cette propriété ne couvre **pas** les octets déjà délivrés avant révocation (R02), ni les canaux temporels, ni la compromission OS (R08).

**Impossibilité P06 (réfutée)** : l'ensemble des copies = {onglet1, onglet2, cache CDN, cache SW, cache mémoire, **appareil hors ligne**}. Les canaux de révocation atteignent {onglet1, onglet2, cache CDN, cache SW, cache mémoire} ; **l'appareil hors ligne n'est atteint par aucun canal** (R08 exclut les canaux temporels). Donc « supprimer immédiatement toute copie sur tout appareil » est **impossible** (certificat `compute` : `P06 realisable ? False`).

**Garantie produit honnête** : « Une révocation bloque immédiatement toute **nouvelle** lecture ou mutation dont la décision est postérieure, dans tous les onglets et caches en ligne. Les données déjà délivrées avant la révocation ne peuvent pas être retirées d'un appareil hors ligne ; elles sont purgées dès que l'appareil se reconnecte. Aucune donnée d'une autre organisation n'est affichée ni annoncée dans le contexte courant. »

## Q6 — Tests adversariaux et oracles

| Test | Oracle | Résultat |
|---|---|---|
| **T1** (discriminant) : deux principaux même rôle AGENT, même org, même dossier, permissions différentes (Alice read+write, Bob read) — « les deux partagent la même entrée de cache » | `K(Alice)==K(Bob)` | **PASSE avec K-b** (même clé), **ÉCHOUE avec clé par permissions individuelles** |
| **T2** (sécurité) : `Bob.can_write == False` | réponse de Bob | **ÉCHOUE avec K-b** (Bob reçoit `can_write=True` d'Alice → fuite), **PASSE avec clé individuelle** |
| T3 : réponse tardive SOLEIL après bascule LUNE | vue courante = LUNE | Doit ignorer SOLEIL (P01) |
| T4 : rendu sans permission | aucun octet privé émis | Doit n'émettre que le fragment refus (P02) |
| T5 : SW hors ligne, session LUNE, chemin SOLEIL | pas de JSON SOLEIL | Doit aller au réseau / refuser (P03) |
| T6 : mutation SOLEIL aboutie après bascule | affichage séparé ancien/nouveau | Doit afficher les deux libellés (P04) |
| T7 : branche positive P07 | lecture+modification LUNE 17 réussies | Doit **passer** (interdiction de masquer tous les dossiers) |
| T8 : messages d'erreur | indistinguables | Refus « inexistant » et « non autorisé » identiques (R08) |

**Certificat T1/T2** (`compute`) : `K-b : meme cle=True` → T1 passe ; `cle individuelle : meme cle=False` → T1 échoue ; oracle sécu : avec K-b Bob reçoit `{'can_write': True}` (échec), avec clé individuelle `{'can_write': False}` (succès).

## Pièges traités (checklist domaine)

- **Snapshot vs sérialisabilité** : l'ordre sérialisable explicite est `R < {L,M}` (Q4) ; les 2 ordres valides sur 6 sont énumérés.
- **Effet externe irréversible** : l'annulation navigateur (P04) n'annule pas une mutation reçue ; un rollback de transaction ne « dé-émet » pas les octets de P02 (R04).
- **Exactly-once / fencing / idempotence / autorisation** : `opId` idempotent ≠ autorisation ; la génération de vue est un *fencing token* d'affichage, pas une autorisation ; l'autorisation reste au point de décision serveur (R02/R06).
- **Cohérence des caches** : 3 caches distincts (R03) ; vider l'un ne vide pas les autres → purge coordonnée.

## Limites / impossibilités

- **Réfuté** : P06 (suppression de toute copie sur tout appareil) — appareil hors ligne inatteignable.
- **Non garanti** : retrait des octets déjà délivrés (R02) ; annulation d'une lecture autorisée avant révocation mais reçue après.
- **Hors périmètre** : canaux temporels, compromission OS, navigateur hostile (R08).
- **Non déterminé** : copie effective par l'humain des octets P02/P03 ; ordre réel d'arrivée des réponses dans P01 (le modèle dit « n'importe quel ordre »).