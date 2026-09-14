# SIII-02-V4 — SIII-02 → Une copie déjà emportée

Score: 100.0 % (certificats 0/0, juge 100/100)

Certificats manqués: aucun

Tous les livrables sont couverts. Je rédige la réponse finale.

## Réponse

**Question centrale de la variante : peut-on certifier l'effacement instantané, lors de la révocation V, d'une copie autorisée conservée sur un appareil maintenant isolé ?**

**Non.** On ne peut certifier ni l'*instantanéité*, ni l'*effacement* de cette copie. Ce qui reste certifiable est strictement plus faible et doit être énoncé séparément :

| Niveau de garantie | Contenu | Certifiable ? |
|---|---|---|
| **N1 — Interdiction post-V** | Aucune nouvelle lecture/mutation dont le point de décision est ≥ V n'est servie (R02) | **Oui** (invariant vérifiable au point de décision) |
| **N2 — Ordre de purge émis** | Un signal de purge a été émis vers tous les supports joignables | **Oui** (journal d'émission) |
| **N3 — Purge effective sur appareils joignables** | Acquittement de purge par les clients coopératifs en ligne, dans un délai borné | **Oui, mais non instantané** (latence > 0, R05) |
| **N4 — Effacement effectif sur appareil isolé** | La copie n'existe plus sur l'appareil isolé | **Non** (ni déclenchable, ni observable) |

**Résultats exacts :**
- Supports certifiables : `{CDN, cache service worker, mémoire frontend, autres onglets}` → **oui**.
- Supports **non** certifiables : `{appareil isolé, sauvegarde OS/snapshot}` → **non**.
- Propriété globale `E = « aucune copie n'existe »` : **non certifiable** (`all(certifiabilité) = False`).
- Fenêtre d'exploitabilité résiduelle sous expiration cryptographique : **bornée par le TTL de clé** (ex. 24 h), pas nulle à V.
- Délai de purge sur appareil joignable : **> 0** (ex. borne 30 s), donc **jamais « instantané »**.

## Preuves et certificats

**1. Modèle de certifiabilité (compute).** Un support `s` autorise la certification de l'effacement ssi `joignable(s) ∧ coopératif(s) ∧ observable(s)`. Sortie :

```
CDN:True  SW_cache:True  front_mem:True  onglet_autre:True
appareil_isole:False  sauvegarde_os:False
E certifiable globalement ? False
Supports NON certifiables : ['appareil_isole', 'sauvegarde_os']
```

**2. Preuve d'impossibilité (P06, R08).** Soit `S` l'ensemble des supports de copie et `S_obs` l'ensemble observable par le système. L'appareil isolé `s* ∈ S \ S_obs`. Pour certifier `E = ∀s, copie(s)=∅`, il faut un témoin d'effacement pour chaque `s`. Or P06 stipule qu'**aucun canal ne peut contacter un appareil isolé** : aucune transition d'effacement n'est déclenchable sur `s*`, et aucun témoin n'est collectable. C'est une **preuve négative sur un support non observé** : indécidable par le système. Même à la reconnexion, un acquittement de purge ne prouve pas l'absence de copie résiduelle (sauvegarde, snapshot, mémoire, copie de fichier) — R08 : « toute donnée déjà envoyée peut avoir été copiée ».

**3. Cohérence avec le modèle de base.** R02 énonce explicitement que la révocation « ne prétend pas retirer des octets déjà délivrés ». La variante ne modifie pas cette hypothèse : la copie a été **autorisée avant V**, donc elle relève exactement du cas que R02 exclut de la garantie. La conclusion est donc *renforcée*, pas affaiblie, par la variante.

**4. Non-instantanéité même sur appareil joignable.** R05 : « les autres onglets ne reçoivent pas instantanément tous les changements de session ». La purge est bornée par un délai de propagation `> 0`. « Instantané » est donc faux même dans le meilleur cas.

**5. Mitigation honnête — expiration cryptographique.** La seule garantie réalisable sur `s*` n'est pas l'effacement mais l'**inexploitabilité** : chiffrer les copies avec une clé à durée de vie bornée (TTL). Après V, la clé n'est plus renouvelée ; la copie reste des octets mais devient indéchiffrable à l'expiration. On certifie alors « inexploitable après TTL », **pas** « effacée à V ».

### Q1 — Matrice incident / frontière / preuve / composant

| Incident | Frontière franchie | Preuve de fuite | Composant responsable | Catégorie |
|---|---|---|---|---|
| **P01** réponse tardive | Frontière de contexte (génération) | Réponse SOLEIL (gen 8) écrase la vue LUNE (gen 9) via `setDossier` sans garde | Gestionnaire commun frontend | **Affichage erroné** (pas de divulgation : SOLEIL était autorisé) |
| **P02** fragment anticipé | Frontière de rendu (émission avant contrôle) | Premier fragment HTML (nom + note privée) émis avant le 403 ; octet émis = divulgué (R04) | Serveur de rendu | **Divulgation** |
| **P03** rejeu local | Frontière d'authentification/session | JSON SOLEIL servi hors ligne à une session LUNE, backend non contacté | Service worker (clé = chemin) | **Divulgation** |
| **P04** mutation tardive | Frontière d'autorité de mutation | Mutation SOLEIL aboutit après changement de contexte ; « Mise à jour réussie » annoncée dans LUNE | API (org depuis JSON, `allowed=true` client) + composant d'annonce | **Mutation indûment autorisée** (l'effet est légitime dans SOLEIL, mais l'annonce est fausse dans LUNE) |

**Variante :** les nouvelles réponses étant correctement protégées, P01–P04 ne se reproduisent plus *pour de nouvelles données*. La copie résiduelle sur appareil isolé n'est **aucun** de ces quatre incidents : c'est une **divulgation potentielle hors périmètre de contrôle** (R08), non révocable.

### Q2 — Condition de partage de cache et clés K-a…K-d

**Condition nécessaire de partage :** deux réponses peuvent partager une entrée de cache **ssi** leurs *projections autorisées* sont identiques, c'est-à-dire ssi `(principal, organisation, objet, action, finalité, révision de politique, langue, version de représentation)` produisent le même sous-ensemble de champs visibles. La langue change les octets, pas les droits (R01) : elle doit donc être dans la clé, mais elle ne suffit pas.

| Clé | Contenu | Suffisante ? | Raison |
|---|---|---|---|
| **K-a** | chemin | **Non** | Collision inter-organisation : `/dossiers/17` de SOLEIL et de LUNE partagent la même entrée |
| **K-b** | organisation + dossier | **Nécessaire, non suffisante** | Deux principaux avec le rôle AGENT homonyme peuvent avoir des permissions différentes sur le même `(org, dossier)` (R01) |
| **K-c** | organisation + dossier + nom de rôle | **Non** | « Aucun nom de rôle ne garantit l'identité des projections autorisées » (P05) |
| **K-d** | contexte d'autorisation complet + révision des données + langue + version de représentation | **Oui** | Capture exactement la projection autorisée |

**Politique concrète pour les réponses protégées :** clé **K-d**, avec `Cache-Control: private, no-store` (ou `Vary` complet si un cache partagé est indispensable), et **jamais** de mise en cache partagée d'une réponse dépendant d'une décision d'autorisation. Le CDN ne doit servir que des ressources publiques.

**Pourquoi une clé n'est pas un contrôle d'accès :** une clé de cache est un *index de réutilisation* ; elle ne réévalue pas la politique au moment du service. Si la politique change (révocation V) sans que la clé change, le cache ressert une entrée devenue interdite. Le contrôle d'accès doit être **réévalué au point de décision** (R02) à chaque service ; la clé ne fait que réduire les collisions, elle ne décide rien.

### Q3 — Machine d'état / pseudo-code

```
États : IDLE, LOADING(gen), COMMITTING(gen), MUTATING(gen, org)
Variable : currentGen (monotone, R05)

onContextSwitch(newOrg):
    currentGen += 1
    purge(front_mem)                      # cache mémoire vidé
    sw.postMessage({type:'purge', org:oldOrg})
    announce("Contexte : " + newOrg)      # aria-live polite

onLoad(org, dossierId):
    g = currentGen
    r = fetch(K-d key, {gen:g, org})
    if r.gen != currentGen: DROP           # garde de commit
    else: COMMIT(r); render(r)

onMutation(org, dossierId, payload):
    g = currentGen
    send({org, dossierId, payload, gen:g, csrf:token})
    # réponse tardive :
    if resp.gen != currentGen:
        announce("Opération exécutée dans l'ancien contexte (" + resp.org + ")")
        # NE PAS remplacer la vue courante
    else:
        announce("Mise à jour réussie dans " + resp.org)

Rendu serveur (R04) :
    checkAccess(principal, org, objet, action, finalité, policyRev)
    if DENY: emit(refus)          # AUCUN octet privé avant le contrôle
    else:    emit(fragment)
```

**Accessibilité :** deux canaux `aria-live` distincts — « opération exécutée dans l'ancien contexte » (politeness `polite`) et « état affiché dans le contexte actuel » (`assertive` pour les changements de contexte). Les autres onglets reçoivent la purge via `BroadcastChannel` (best-effort, non instantané).

### Q4 — Ordre logique et réparation de l'API

**Ordre logique :** `V` est une écriture **sérialisée** dans le domaine du point de décision (R02). Une lecture/mutation est autorisée **ssi** son point de décision est **antérieur** à `V`. Donc : `V` précède logiquement toute lecture/mutation postérieure ; les lectures/mutations antérieures restent valides même si leur réponse arrive après `V`.

**Mutation dont l'annulation navigateur n'a pas annulé l'effet (P04) :** l'annulation est une tentative de transport sans garantie (R05). Si le backend a déjà reçu la mutation, elle aboutit **dans SOLEIL** (R07). Le produit doit alors afficher séparément « opération exécutée dans l'ancien contexte (SOLEIL) » et « état affiché dans le contexte actuel (LUNE) ». **Ne jamais** réécrire le JSON en transit pour remplacer SOLEIL par LUNE (proposition rejetée : falsification de contexte, viole R01/R07).

**Réparation de l'API (R06) :**
1. Organisation **dérivée de la session serveur**, jamais d'un champ JSON client.
2. `allowed` **calculé côté serveur** ; le champ client est supprimé.
3. Jeton anti-CSRF (double-submit ou synchronizer token) ; cookies `SameSite=Lax/Strict`, `Secure`, `HttpOnly`.
4. Validation **atomique** de la politique au point de décision, avec révision de politique dans la transaction.

### Q5 — Non-divulgation, impossibilité P06, garantie honnête

**Propriété de non-divulgation (périmètre R08) :** *Pour toute réponse servie à un principal `p` dans le contexte `c`, le point de décision de la réponse est ≥ V ⇒ la réponse est refusée.* Invariant : aucune réponse dont le point de décision est postérieur à `V` n'est servie. Preuve : le point de décision est atomique (R02) ; toute lecture/mutation postérieure à `V` échoue au contrôle ; le rendu émet après contrôle (R04). **Limite :** cette propriété ne couvre **pas** les octets déjà délivrés avant `V` (R02, R08).

**Preuve d'impossibilité de P06 :** voir certificat 2 ci-dessus. Aucun canal vers un appareil isolé ⇒ pas d'effacement déclenchable ⇒ pas de témoin ⇒ `E` non certifiable. La promesse « supprime immédiatement toute copie, dans tous les onglets, tout cache et tout appareil hors ligne, sans perdre une seule mise à jour légitime » est **logiquement impossible** : elle exige un canal vers un appareil non joignable et une preuve négative sur un support non observé.

**Garantie produit honnête :**
> « La révocation V interdit immédiatement toute nouvelle lecture ou mutation dont le point de décision est postérieur à V. Les copies sur appareils joignables et coopératifs sont purgées dans un délai borné (best-effort, non instantané). Les copies déjà délivrées avant V, notamment sur appareils isolés, ne peuvent être ni effacées ni certifiées ; leur exploitabilité est bornée par l'expiration cryptographique (TTL de clé). »

### Q6 — Tests adversariaux et oracles

| Test | Scénario | Oracle |
|---|---|---|
| T1 réponse tardive | gen 8 SOLEIL puis gen 9 LUNE, réponse SOLEIL arrive après | La vue LUNE n'est **pas** remplacée ; aucune annonce LUNE pour une opération SOLEIL |
| T2 fragment anticipé | requête sans permission | Aucun octet privé dans le flux ; 403 ; pas de nom/note dans le premier fragment |
| T3 rejeu SW | session LUNE demande un chemin mis en cache SOLEIL | Le SW ne sert **pas** l'entrée SOLEIL ; requête réseau ou refus |
| T4 mutation tardive | mutation SOLEIL annulée côté navigateur mais reçue | Effet dans SOLEIL ; annonce « ancien contexte » distincte de la vue LUNE |
| T5 **discriminant K-b** | deux principaux, rôle **AGENT homonyme**, permissions **différentes** sur le même `(org, dossier)` | **Passe avec K-b** (même clé ⇒ même entrée ⇒ mauvaise projection servie) ; **échoue avec K-d** (clés distinctes ⇒ projections correctes). Oracle : la projection servie doit égaler la projection autorisée du principal |
| T6 révocation | V puis lecture/mutation | Toute opération postérieure à V refusée ; opérations antérieures valides |
| T7 appareil isolé | copie autorisée sur appareil hors ligne, V déclenchée | **Aucun oracle d'effacement possible** ; seul oracle : inexploitabilité après TTL |

## Pièges traités

- **Autorisations avant action :** toutes les actions décrites sont en lecture seule ou écriture privée (caches locaux, session serveur) ; aucune écriture sur ressource partagée non confirmée.
- **Budget de crédits :** aucune action externe coûteuse engagée ; refus explicite de toute opération non confirmée.
- **Écriture sur dernière révision / conflits :** la garde `gen == currentGen` empêche l'écrasement d'une vue récente par une réponse tardive ; les mutations sont taggées `(org, gen)` et ne réécrivent jamais le contexte courant.
- **Aucun envoi externe, aucune suppression :** la purge est locale ; aucune donnée n'est transmise à l'extérieur ; en cas d'impossibilité (appareil isolé), on **n'agit pas** et on l'explique.
- **Cohérence instantanée vs sérialisabilité :** V est sérialisée au point de décision ; l'ordre logique V < lecture/mutation est explicite.
- **Effet externe irréversible :** une mutation reçue n'est pas annulée par l'annulation navigateur (R05) ; elle aboutit dans l'ancien contexte.
- **Ne pas confondre exactly-once, fencing, idempotence, autorisation :** la garde de génération est du *fencing* de vue, pas de l'autorisation ; l'autorisation reste au point de décision.
- **Divulgation vs affichage erroné vs mutation indûment autorisée :** distingués dans Q1 (P02/P03 = divulgation ; P01 = affichage erroné ; P04 = mutation indûment autorisée).

## Limites / impossibilités

1. **Effacement instantané lors de V : impossible à certifier.** L'appareil isolé n'est ni joignable ni observable (P06, R08) ; la propriété « aucune copie n'existe » est une preuve négative sur support non observé, donc indécidable.
2. **Même sur appareil joignable, l'effacement n'est pas instantané** (latence de propagation > 0, R05).
3. **Les octets déjà délivrés avant V ne sont pas révocables** (R02) ; la variante place précisément la copie dans ce cas.
4. **La seule garantie réalisable sur appareil isolé est l'inexploitabilité bornée** (expiration cryptographique / TTL), pas l'effacement.
5. **Hors périmètre (R08) :** canaux temporels et compromission du système d'exploitation — non couverts, donc non certifiables.
6. **La promesse P06 est logiquement impossible** et doit être remplacée par la garantie honnête de Q5.