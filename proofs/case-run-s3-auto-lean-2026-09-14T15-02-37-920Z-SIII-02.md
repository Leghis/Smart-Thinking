# SIII-02 — Le navigateur aux identités superposées

Score: 84.0 % (certificats 0/0, juge 84/100)

Certificats manqués: aucun

Tous les certificats sont enregistrés. Je rédige maintenant la réponse finale complète.

---

# Mission Mosaïque — Réponse complète

**Cadre.** Je traite les contrats R01–R08 et les traces P01–P07 comme le mandat. Aucune trace ne prouve à elle seule une exploitation ; je distingue donc systématiquement **établi** (démontré par contrat ou trace), **réfuté** (contredit) et **non déterminé** (ni l'un ni l'autre). Les outils du dossier sont simulés : rien ici n'autorise une action sur un compte réel.

---

## Q1 — Matrice incident / frontière / preuve / composant

| Incident | Frontière franchie | Preuve de fuite (octets/effet) | Composant responsable | Catégorie |
|---|---|---|---|---|
| **P01** Réponse tardive | Frontend : gestionnaire commun `setDossier(response)` sans garde de contexte ni de génération | La réponse SOLEIL (nom + note privée du dossier 17) est **reçue** puis **écrite** dans la vue LUNE (gen 9) | Gestionnaire commun + couche réseau (pas de garde de génération) | **Divulgation inter-contexte** + **affichage erroné** |
| **P02** Fragment anticipé | Serveur de rendu : émet le fragment nom+note **avant** le contrôle d'accès (R04) | Le premier fragment HTML (nom + note privée) est **émis** vers un principal sans permission ; le 403 final ne rachète pas un octet émis | Rendu serveur / point de décision | **Divulgation** |
| **P03** Rejeu local | Service worker : clé = **chemin seul** (R03) | Le JSON SOLEIL conservé est **servi** à une session LUNE, backend non contacté | Service worker | **Divulgation** + **affichage erroné** |
| **P04** Mutation tardive | Couche mutation/affichage : pas de contexte capturé | Annonce « Mise à jour réussie » **dans LUNE** pour une opération exécutée dans SOLEIL | Composant d'affichage + couche mutation | **Affichage erroné** (R07) |

**Distinction des trois catégories :**

- **Divulgation** (octets franchissant une frontière d'autorisation) : **P01, P02, P03**. Établie. P02 est la plus grave : l'octet est émis *sans* décision favorable (R04 : « un octet émis est considéré divulgué »).
- **Affichage erroné** (résultat d'un contexte présenté dans un autre) : **P01, P03, P04**. Établi. R07 exige de séparer « opération exécutée dans l'ancien contexte » et « état affiché dans le contexte actuel ».
- **Mutation indûment autorisée** : **non déterminée par les traces**. P04 est une mutation *autorisée pour SOLEIL* au moment de l'envoi (R07 l'admet explicitement). En revanche, **R06 établit une vulnérabilité structurelle** : l'API extrait l'organisation d'un champ JSON, accepte `allowed=true` fourni par le frontend, et n'utilise qu'un jeton d'identité. Une mutation indûment autorisée est donc **possible par construction**, mais **aucune trace ne l'observe** → statut : *vulnérabilité établie, exploitation non déterminée*.

**Point clé sur P04 :** la proposition de « changer le JSON en transit pour remplacer SOLEIL par LUNE » est **à rejeter**. Elle falsifie l'attribution de contexte (elle ferait passer une opération SOLEIL pour une opération LUNE), ce que R07 interdit. La bonne réponse est de **conserver** le contexte d'origine et de l'**afficher séparément**.

---

## Q2 — Condition nécessaire de partage de cache, analyse K-a…K-d

**Condition nécessaire.** Soit `Auth(r)` la projection autorisée d'une requête `r` (les octets que `r` a le droit de recevoir), fonction de `(principal, organisation, objet, action, finalité, révision de politique)` (R01). Une réponse protégée ne peut être partagée entre `r1` et `r2` que si :

> **K(r1) = K(r2) ⟹ Auth(r1) = Auth(r2)** — la clé doit *raffiner* la décision d'autorisation.

C'est **nécessaire** (pas suffisant : il faut aussi l'invalidation/révocation). Vérification par inclusion d'ensembles de champs :

| Clé | Champs | Couvre `Auth` ? | Verdict |
|---|---|---|---|
| **K-a** chemin | `{chemin}` | Non | **Viole** — deux principaux/orgs partagent `/dossiers/17` |
| **K-b** org+dossier | `{org, objet}` | Non | **Viole** — ignore principal, action, finalité, révision |
| **K-c** org+dossier+rôle | `{org, objet, role_nom}` | Non | **Viole** — R01/P05 : un nom de rôle ne détermine pas les permissions |
| **K-d** contexte complet + révision données + langue + version représentation | tous les champs de `Auth` + fraîcheur + octets | **Oui** | **Seule clé sûre** |

**Contre-exemple explicite pour K-b** (celui exigé en Q6) : `r1 = (P1, LUNE, 17, read)` avec P1 habilité → `Auth = {nom, note}` ; `r2 = (P2, LUNE, 17, read)` avec P2 non habilité → `Auth = {}`. Or `K-b(r1) = K-b(r2) = (LUNE, 17)`. Donc K-b fait fuiter.

**Politique concrète pour les réponses protégées :**
1. **CDN** : `Cache-Control: private, no-store` sur toute réponse dont `Auth` dépend du principal. Le CDN ignore Cookie/Vary (R03) → il **ne peut pas** distinguer les principaux → il ne doit **jamais** mettre en cache une réponse protégée.
2. **Service worker** : ne pas servir de cache pour les réponses protégées ; si cache local, clé **K-d** et **purge** à la déconnexion et à tout changement de contexte.
3. **Cache mémoire frontend** : indexer par **K-d** (et non `['dossier', dossier_id]`), purger au changement de contexte.
4. **Partage utile** : avec K-d, le partage inter-principaux est nul (le principal est dans la clé) ; le seul partage légitime est *intra-principal, même contexte*.

**Pourquoi une clé n'est pas un contrôle d'accès.** Une clé de cache est un mécanisme de **réutilisation d'octets déjà produits** : elle *retrouve* un objet, elle ne *décide* pas si la requête a le droit de le voir *maintenant*. Trop grossière, elle fait fuiter (K-a/b/c) ; assez fine, elle ne fait que rejouer une décision passée. La décision doit rester au **point de décision** (R02), évaluée à chaque restitution, **séparée** du cache. Un cache correct est un cache dont la clé raffine l'autorisation — mais l'autorité reste au point de décision.

---

## Q3 — Machine d'état / pseudo-code : contexte, chargement, mutation, rendu, onglets, annonces

**État de vue** : `{ principal, org, generation (monotone), revision_politique, revision_donnees, langue }`. Chaque requête **capture** ce contexte au départ et le renvoie avec un numéro de génération (R05).

```
ÉTAT: ctx = {principal, org, gen, rev_pol, rev_data, langue}

# --- Changement de contexte (SOLEIL -> LUNE) ---
on switchContext(newOrg):
    ctx.gen += 1                      # génération monotone
    ctx.org = newOrg
    purgeCacheMemoire()               # clé K-d : purge tout ce qui n'est plus valide
    sw.postMessage({type:"PURGE", org:newOrg})   # purge SW (clé K-d)
    broadcastToTabs({type:"CTX", gen:ctx.gen, org:newOrg})  # autres onglets (asynchrone, R05)
    renderSkeleton()                  # ne rien afficher d'ancien

# --- Chargement d'un dossier ---
on loadDossier(dossier_id):
    req = {org:ctx.org, dossier_id, gen:ctx.gen, rev_pol:ctx.rev_pol}
    resp = await fetch(req)           # réponse porte le contexte capturé + gen
    if resp.gen != ctx.gen:           # GARDE DE GÉNÉRATION (corrige P01)
        discard(resp)                 # ne JAMAIS setDossier
        return
    if resp.org != ctx.org: discard(resp); return
    setDossier(resp)                  # seulement si contexte identique

# --- Mutation ---
on mutate(dossier_id, payload):
    req = {org:ctx.org, dossier_id, gen:ctx.gen, rev_pol:ctx.rev_pol,
           idempotency_key:uuid(), csrf:token}   # org vient du SERVEUR, pas du JSON client
    resp = await fetch(req)
    if resp.gen != ctx.gen:
        # opération exécutée dans l'ANCIEN contexte (R07)
        announce("Opération exécutée dans le contexte précédent (" + resp.org + ")")
        showSeparately("État affiché : contexte actuel (" + ctx.org + ")")
    else:
        announce("Mise à jour réussie dans " + ctx.org)

# --- Rendu serveur (corrige P02) ---
render(dossier):
    decision = authorize(principal, org, dossier, action, finalite, rev_pol)  # AVANT tout octet
    if not decision.allowed:
        emit(accessDeniedFragment)    # AUCUN octet du dossier avant la décision
        return
    emit(dossierFragment)             # nom + note émis seulement si autorisé
```

**Accessibilité (annonces).** Les annonces passent par une région `aria-live="polite"` ; le changement de contexte annonce « Contexte : LUNE » ; une opération d'ancien contexte est annoncée **distinctement** de l'état affiché (R07). Ne jamais annoncer une opération SOLEIL comme opération LUNE.

**Onglets.** R05 : les autres onglets ne reçoivent pas instantanément les changements. Chaque onglet **revalide sa génération** à la réception ; un onglet en retard **jette** tout résultat dont la génération ne correspond plus.

---

## Q4 — Ordre logique révocation / lecture / mutation ; réparation de l'API

**Ordre logique (R02).** La révocation est une **écriture sérialisée** dans le domaine du point de décision. Règle de sûreté :

> **autorisé(e) ⟺ decision(e) < decision(V)** — tout événement dont le point de décision est **postérieur** à la révocation est refusé.

Vérifié par énumération : dans l'ordre `L1, M1, V, L2, M2`, les événements décidés après `V` (`L2, M2`) sont refusés. **Mais** `L1`, décidé avant `V` et reçu après, reste une **lecture autorisée non annulable** : R02 dit que la révocation ne retire pas les octets déjà délivrés. D'où la nécessité d'une **garde de génération côté client** (Q3), et non d'une annulation serveur.

**Réparation de l'API (R06) :**
1. **Organisation** : ne jamais l'extraire d'un champ JSON client ; la dériver de la **session serveur** (liée au principal authentifié).
2. **`allowed=true`** : supprimer ce paramètre. La décision est prise **côté serveur** par le point de décision (R02), jamais fournie par le frontend.
3. **Jeton** : le jeton d'identité seul ne suffit pas ; ajouter une **session serveur** + **protection CSRF** (les cookies partent automatiquement, R06) + **validation atomique de la politique** (principal, org, objet, action, finalité, révision).
4. **Idempotence** : chaque mutation porte une **clé d'idempotence** ; le serveur déduplique.

**Mutation dont l'annulation navigateur n'a pas annulé l'effet (P04).** L'annulation est une **tentative de transport** (R05), sans garantie. Traitement correct :
- Le serveur a **déjà reçu** la mutation → elle s'exécute dans **SOLEIL** (autorisée, R07).
- Le client **ne réécrit pas** le JSON en transit (rejet de la proposition P04).
- Le client **conserve le contexte capturé** (`org=SOLEIL, gen=8`) et affiche **séparément** : « opération exécutée dans l'ancien contexte (SOLEIL) » vs « état affiché dans le contexte actuel (LUNE) ».
- La clé d'idempotence empêche un double effet si la requête est rejouée.

---

## Q5 — Non-divulgation, impossibilité de P06, garantie honnête

**Propriété de non-divulgation (périmètre R08).**

> **Théorème.** Sous R01–R08, pour tout principal `p` et tout contexte `c`, aucun octet d'un dossier `(org', d)` avec `org' ≠ org(c)` ou non autorisé pour `p` n'est **émis** vers `p` par le rendu serveur, ni **restitué** par un cache, ni **affiché** comme résultat du contexte courant.

*Preuve (esquisse).* (i) **Rendu** : la décision précède l'émission (Q3) → aucun octet non autorisé n'est émis (corrige P02). (ii) **Caches** : clé K-d raffine `Auth` (Q2) → toute entrée restituée a `Auth` identique à la requête (corrige P03). (iii) **Frontend** : garde de génération + garde d'organisation (Q3) → un résultat d'un autre contexte est jeté (corrige P01). (iv) **Erreurs** : messages uniformes → pas de fuite d'existence (R08). ∎

*Limite explicite (R08).* La propriété porte sur l'**émission** et la **restitution**, pas sur les octets **déjà copiés** par un client : « toute donnée déjà envoyée peut avoir été copiée ». Les canaux temporels et la compromission OS sont **hors périmètre**.

**Impossibilité de P06 (réfutée).** P06 promet : « suppression immédiate de toute copie, tous onglets, tous caches, tout appareil hors ligne, sans perdre une mise à jour légitime ». Preuve par cas exhaustif sur `(isolé, maj_transmise)` :

| isolé | maj transmise | verdict |
|---|---|---|
| **True** | **False** | **IMPOSSIBLE** : copie non supprimable (aucun canal, R08) **et** mise à jour non transmise → perte garantie |
| True | True | copie non supprimable immédiatement ; mise à jour sauvée |
| False | False | suppression possible ; mise à jour locale non transmise → perte si on purge |
| False | True | suppression possible ; mise à jour au serveur → OK |

Le cas `(isolé=True, maj_transmise=False)` rend les deux clauses **simultanément insatisfaisables** : un appareil isolé ne peut être contacté (donc pas de suppression immédiate), et purger ses copies locales détruirait une mise à jour non encore transmise. **P06 est réfutée.**

**Garantie produit honnête (formulation).**

> « Une révocation prend effet **au point de décision** : toute lecture ou mutation dont la décision est **postérieure** à la révocation est refusée. Les caches en ligne (CDN, service worker, mémoire) sont **invalidés** à la révocation et à tout changement de contexte. Les copies déjà délivrées **ne peuvent pas être retirées** d'un client ; un appareil **hors ligne** appliquera la révocation **à son prochain contact**. Les mises à jour légitimes non encore transmises sont **préservées** et réconciliées au retour, sans double effet (idempotence). »

---

## Q6 — Tests adversariaux et oracles

| # | Test | Oracle |
|---|---|---|
| **T1** | **Réponse tardive (P01)** : lancer lecture SOLEIL gen 8, changer en LUNE gen 9, forcer l'arrivée SOLEIL **après** LUNE | La vue LUNE **n'est pas** remplacée ; le résultat SOLEIL est **jeté** (garde de génération). Échec si `setDossier` écrit SOLEIL. |
| **T2** | **Fragment anticipé (P02)** : requête sans permission, capturer **tous** les octets émis | Aucun octet du dossier (nom/note) n'est émis **avant** la décision ; seul le fragment « accès refusé » sort. Échec si un octet du dossier apparaît. |
| **T3** | **Rejeu local (P03)** : session SOLEIL, mise en cache SW, déconnexion, session LUNE, même chemin, hors ligne | Le SW **ne sert pas** le JSON SOLEIL ; purge à la déconnexion. Échec si le JSON SOLEIL est restitué. |
| **T4** | **Mutation tardive (P04)** : mutation SOLEIL gen 8, annulation navigateur, changement LUNE, notification globale | Affichage **séparé** : « exécutée dans SOLEIL » vs « état affiché LUNE ». Échec si « Mise à jour réussie » est annoncé dans LUNE. |
| **T5** | **Forge API (R06)** : envoyer `allowed=true` + `org=LUNE` dans le JSON avec un jeton d'un principal SOLEIL | Le serveur **ignore** `allowed` et l'org du JSON ; décision serveur → refus. Échec si la mutation passe. |
| **T6** | **Uniformité des erreurs (R08)** : comparer les réponses pour (a) dossier inexistant, (b) dossier d'une autre org, (c) dossier non autorisé | Messages **indistinguables** (même code, même corps, même timing grossier). Échec si l'existence d'un dossier d'une autre org transparaît. |
| **T7** | **Onglets désynchronisés (R05)** : deux onglets, changement de contexte dans l'un | L'onglet en retard **revalide** sa génération et jette les résultats périmés. Échec si un résultat d'ancien contexte s'affiche. |
| **T8 (exigé)** | **K-b vs permissions individuelles** : deux principaux P1, P2 de **même org LUNE**, **même dossier 17**, permissions **individuelles différentes** (P1 habilité, P2 non). Requêtes identiques `(LUNE, 17)`. | **Passe avec K-b** (même clé → même entrée servie) **mais échoue** avec des permissions individuelles correctes : P2 **ne doit pas** recevoir les octets de P1. Oracle : `Auth(P1) ≠ Auth(P2)` alors que `K-b(P1) = K-b(P2)` → **K-b est non sûr**. Le test **doit échouer** si le cache sert P2 avec les octets de P1. |
| **T9** | **Branche positive (P07)** : agente LUNE habilitée lit puis modifie le dossier LUNE 17, politique stable | La séquence **réussit** ; aucun masquage permanent. Échec si l'architecture bloque une opération légitime. |

**Oracle de T8 (le plus important).** Il **passe** avec K-b (les deux requêtes partagent la clé `(LUNE,17)`) et **échoue** dès que les permissions individuelles diffèrent : c'est la démonstration opérationnelle que K-b n'est pas un raffinement de `Auth`. Seule K-d (qui inclut le principal) fait passer T8.

---

## Synthèse : établi / réfuté / non déterminé

- **Établi** : P01, P02, P03 = divulgations ; P01, P03, P04 = affichages erronés ; K-a/b/c non sûres, K-d sûre ; ordre `decision(e) < decision(V)` ; vulnérabilité structurelle de l'API (R06) ; P07 réalisable.
- **Réfuté** : P06 (impossibilité démontrée) ; la proposition de réécrire le JSON en transit (falsification de contexte, contraire à R07).
- **Non déterminé** : exploitation effective d'une mutation indûment autorisée (aucune trace ne l'observe, mais la faille R06 la rend possible) ; toute copie déjà exfiltrée hors périmètre R08 (hors mandat).

**Invariant central à retenir :** *la clé de cache doit raffiner la décision d'autorisation, mais l'autorité reste au point de décision ; et aucun mécanisme ne peut retirer des octets déjà délivrés — seule une garde de contexte côté client empêche leur usage erroné.*