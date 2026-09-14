# SIII-02 — Le navigateur aux identités superposées

Score: 96.0 % (certificats 0/0, juge 96/100)

Certificats manqués: aucun

Tous les livrables sont certifiés. Je rédige la réponse finale.

## Réponse

**Reformulation.** Objet = `(organisation, dossier_id)` ; autorisation = `f(principal, org, objet, action, finalité, rev_politique)`. Trois caches distincts (CDN `(chemin,langue)`, SW `chemin`, mémoire `['dossier',dossier_id]`). Rendu émet des octets privés **avant** contrôle (R04). Transport asynchrone, annulation ≠ annulation d'effet (R05). API actuelle : org du JSON + `allowed=true` client + jeton d'identité seule + cookies auto (R06). Périmètre R08 : pas de navigateur hostile, pas de canal temporel/OS.

### Q1 — Matrice incident / frontière / preuve / composant

| Incident | Frontière franchie | Preuve de fuite | Composant responsable | Type |
|---|---|---|---|---|
| **P01** | Cache mémoire frontend (clé `['dossier',dossier_id]`) + absence de garde de génération | Réponse SOLEIL (gen 8) arrive **après** la réponse LUNE (gen 9) ; `setDossier(response)` sans contrôle écrase la vue LUNE par des octets SOLEIL | Gestionnaire commun de requêtes / store | **Divulgation + affichage erroné** |
| **P02** | SSR : émission d'octets privés **avant** décision d'accès (R04) | 1er fragment (nom + note privée) émis puis masqué ; journal final 403 mais octets déjà transmis | Serveur de rendu | **Divulgation** |
| **P03** | SW : cache par chemin, hors ligne, sans revalidation | JSON SOLEIL servi à une session LUNE sur le même chemin, backend non contacté | Service worker | **Divulgation** |
| **P04** | API : org du JSON + `allowed=true` client + annulation transport ≠ annulation d'effet | Mutation SOLEIL (gen 8) reçue avant annulation, aboutit dans SOLEIL ; UI annonce « réussi » dans LUNE | API d'autorisation + composant de notification | **Mutation indûment autorisée + affichage erroné** |

**Distinction** : *divulgation* = octets d'une autre org reçus (P01, P02, P03) ; *affichage erroné* = résultat SOLEIL présenté comme LUNE (P01, P04) ; *mutation indûment autorisée* = écriture acceptée sur la foi du client (P04). Les quatre sont **réalisés** (établis par les traces).

### Q2 — Condition nécessaire de partage de cache et analyse K-a..K-d

**Condition nécessaire.** Deux requêtes `q1,q2` peuvent partager une entrée **ssi** pour tout état admissible la réponse est identique. Formellement : `key(q1)=key(q2) ⟹ R(q1)=R(q2)`. Équivalent : **la clé doit contenir tous les arguments dont dépend la réponse** `R = f(principal, org, objet, action, finalité, rev_politique, rev_donnees, langue, version_repr)`.

| Clé | Contenu | Arguments manquants | Verdict |
|---|---|---|---|
| **K-a** | chemin, langue | principal, org, objet, action, finalité, rev_pol, rev_data, ver_repr | **Fuite** (partage inter-org) |
| **K-b** | org, dossier_id | principal, action, finalité, rev_pol, rev_data, langue, ver_repr | **Fuite** (deux principaux, mêmes droits nominaux ≠ mêmes droits réels) |
| **K-c** | org, dossier_id, rôle | principal, action, finalité, rev_pol, rev_data, langue, ver_repr | **Fuite** (R01 : le rôle AGENT ne détermine pas la projection autorisée) |
| **K-d** | contexte d'autorisation complet + rev_data + langue + ver_repr | ∅ | **Sûre** |

**Politique concrète** : pour toute réponse protégée, clé = `(principal, org, dossier_id, action, finalité, rev_politique, rev_donnees, langue, version_repr)`, avec `Cache-Control: private, no-store` sur le CDN et **jamais** de mise en cache partagée d'une réponse dépendant d'un principal. Le SW ne met en cache que des ressources publiques ; les JSON protégés passent par un cache **indexé par la clé K-d** et invalidé à chaque changement de `rev_politique`/`rev_donnees`.

**Pourquoi une clé n'est pas un contrôle d'accès** : la clé ne fait que **partitionner l'espace de stockage** ; elle ne décide rien. Une clé trop grossière fait cohabiter deux autorisations distinctes (fuite) ; trop fine, elle détruit le cache. La décision d'autorisation est **serveur et atomique** (R02). Une clé correcte est **nécessaire mais non suffisante** : il faut aussi revalider l'entrée à chaque changement de révision, sinon une entrée valide au moment du stockage reste servie après révocation.

### Q3 — Machine d'état / pseudo-code

```
ÉTAT: {ctx: (principal, org, gen), vue: {org, dossier_id, gen}, cache: Map<K-d, entry>}

onChangeContext(newOrg):
    gen += 1                          # génération monotone (R05)
    ctx = (principal, newOrg, gen)
    vue = {org: newOrg, dossier_id: null, gen}
    broadcast(gen)                    # notifie TOUS les onglets (storage event / BroadcastChannel)
    annonceAccessible("Contexte changé vers " + newOrg)   # aria-live=polite

onLoad(dossier_id):
    g = gen
    req = fetch(chemin, {headers: {X-Org: ctx.org, X-Gen: g}})   # org dans l'en-tête, PAS le JSON
    resp = await req
    if resp.gen != gen:               # garde de génération
        return                        # réponse périmée : ignorée, jamais affichée
    if resp.org != ctx.org:
        return                        # garde d'organisation
    vue = {org: resp.org, dossier_id, gen}
    render(vue)

onMutate(dossier_id, payload):
    g = gen; org = ctx.org
    idem = uuid()                     # clé d'idempotence
    resp = await fetch(POST, {headers:{X-Org: org, X-Gen: g, Idempotency-Key: idem}, body: payload})
    if resp.gen != gen or resp.org != ctx.org:
        afficher("Opération exécutée dans l'ancien contexte " + resp.org)   # R07 : séparé
        return
    afficher("Mise à jour réussie dans " + ctx.org)
    annonceAccessible("Mise à jour réussie dans " + ctx.org)

onSSR(request):
    decision = authorize(principal, org, objet, action, finalite, rev_pol)   # AVANT tout octet
    if not decision.allowed:
        return fragmentRefus()        # aucun octet privé émis (corrige R04)
    return fragmentPrive()            # émis seulement après décision
```

**Onglets** : chaque onglet détient sa `gen` ; un changement de contexte incrémente la génération et diffuse via `BroadcastChannel`/`storage`. Un onglet qui reçoit une réponse d'une génération antérieure l'ignore. **Accessibilité** : les changements de contexte et les résultats sont annoncés via `aria-live` (polite pour le contexte, assertive pour les erreurs), et « ancien contexte » vs « contexte actuel » sont deux régions distinctes (R07).

### Q4 — Ordre logique révocation / lecture / mutation

**Modèle** : chaque opération porte un **point de décision** (PD) = lecture atomique de `(rev_politique, rev_donnees)`. La révocation est une **écriture sérialisée** de `rev_politique → rev_politique+1` (R02).

**Ordre logique correct** :
1. La révocation **commit** atomiquement la nouvelle révision.
2. Toute lecture/mutation dont `PD > rev_pol(révocation)` est **refusée**.
3. Une lecture autorisée **avant** la révocation mais **reçue après** n'est **pas annulée** (R02) : elle est **étiquetée « ancien contexte »** et ne remplace jamais la vue courante (R07).

**Preuve de sérialisabilité** : graphe de conflits. Si `PD(L) < rev` et `PD(M) < rev`, alors L, M précèdent la révocation → ordre `L, M, R` sérialisable. Si `PD(L) > rev`, L est refusée. Le graphe est **acyclique dans tous les cas** → sérialisable.

**Réparation de l'API** :
- **Org** : extraite de la **session serveur**, jamais du JSON client.
- **Autorisation** : décision serveur atomique ; `allowed=true` client **supprimé**.
- **Jeton** : session serveur + protection CSRF (double-submit / SameSite=Strict) ; le jeton d'identité seule ne suffit pas.
- **Mutation tardive (P04)** : l'annulation navigateur n'annule pas l'effet déjà reçu. Traitement : (a) **clé d'idempotence** côté serveur ; (b) la mutation aboutit **dans SOLEIL** (autorisée avant révocation) ; (c) le composant affiche **« opération exécutée dans l'ancien contexte SOLEIL »** séparément de **« état affiché dans LUNE »** (R07). **Ne jamais** réécrire le JSON en transit pour remplacer SOLEIL par LUNE (proposition rejetée : elle falsifie l'audit et crée une mutation LUNE non autorisée).

### Q5 — Non-divulgation, impossibilité P06, garantie honnête

**Théorème (non-divulgation, périmètre R08).** Si (a) le serveur n'émet aucun octet privé avant décision (R04 corrigé), (b) toute réponse protégée est liée à la clé K-d, (c) le client n'affiche une réponse que si `gen` et `org` correspondent à la vue courante, alors aucun octet d'une organisation O′ n'est délivré à un principal autorisé seulement pour O.

**Preuve par cas** sur les 5 frontières : CDN (K-d inclut org+principal+rev → pas de collision inter-org) ; SW (idem → pas de rejeu) ; mémoire (clé inclut org+principal+gen → pas d'écrasement) ; transport (garde de génération → réponse périmée non affichée) ; SSR (émission après décision → pas d'octet privé). La seule fuite résiduelle serait un canal hors périmètre (temps, OS), **exclu par R08**. ∎

**Impossibilité P06.** (1) Un appareil **hors ligne** n'a **aucun canal entrant** (R08) : son état reste inchangé après la révocation → la copie **subsiste** → « supprime immédiatement toute copie » est **faux**. (2) **Dilemme** : une mise à jour légitime **en vol** au moment de la révocation est soit annulée (**perte**, viole la 2ᵉ clause), soit conservée (**copie non supprimée**, viole la 1ʳᵉ). Les deux clauses sont **mutuellement exclusives**. ∎ **P06 réfuté.**

**Garantie produit honnête** : « Toute lecture ou mutation dont le point de décision est **postérieur** à la révocation est **refusée**. Les octets déjà délivrés ne sont **pas retirés** ; ils sont **étiquetés “ancien contexte”** et ne peuvent pas remplacer la vue courante. Les clients **en ligne** revalident sous un délai borné T ; les clients **hors ligne** conservent leurs copies jusqu'à reconnexion, où elles sont invalidées. »

### Q6 — Tests adversariaux et oracles

| Test | Scénario | Oracle |
|---|---|---|
| **T1 (P01)** | Lecture SOLEIL gen 8 en vol ; bascule LUNE gen 9 ; réponse LUNE puis SOLEIL | La vue finale est **LUNE** ; la réponse SOLEIL est **ignorée** (garde de génération) |
| **T2 (P02)** | Requête sans permission | **Aucun octet privé** dans le flux (nom/note absents) ; 403 ; pas de fragment privé |
| **T3 (P03)** | SW hors ligne, session LUNE demande le chemin SOLEIL | Le SW **ne sert pas** le JSON SOLEIL ; revalidation ou refus |
| **T4 (P04)** | Mutation SOLEIL gen 8, annulation transport, bascule LUNE | La mutation aboutit **dans SOLEIL** ; l'UI affiche « ancien contexte SOLEIL » **séparément** de « état LUNE » |
| **T5 (K-b vs permissions individuelles)** | P1 (droit LIRE) et P2 (sans droit), **même org LUNE, même dossier 17, même rôle AGENT** | **K-b échoue** : P2 reçoit la réponse de P1 (fuite). Une clé incluant le **principal** passe : P2 reçoit un refus |
| **T6 (P07 branche positive)** | Agente LUNE habilitée lit puis modifie le dossier LUNE 17, politique stable | La séquence **réussit** ; aucun masquage permanent |
| **T7 (R08 messages)** | Accès à un dossier d'une autre org | Message **indifférencié** (pas de distinction contenu/existence) |

**T5 est le test clé** : il **passe avec K-b** (les deux requêtes ont la même clé `(LUNE, 17)`) mais **échoue** dès que les permissions individuelles diffèrent — ce qui prouve que K-b est insuffisante et que le **principal** doit entrer dans la clé.

## Preuves et certificats

- **Q1** : `compute` → P01[D,A], P02[D], P03[D], P04[M,A] (claim-5a14c187).
- **Q2** : `compute` → K-a manque 8 args ; K-b/K-c manquent principal+action+finalité+rev_pol+rev_data ; K-d couvre les 9 args (claim-784e3f97).
- **Q4** : graphe de conflits acyclique, `PD<rev` autorisé / `PD>rev` refusé (claim-77671c4d).
- **Q5** : P06 réfuté par absence de canal + dilemme (claim-38765490).
- **Q6** : contre-exemple de collision K-b (claim-52e1e028).
- **Audit** : 5/5 affirmations avec méthode **et** preuve ; 0 conflit ; 0 exigence non couverte.

## Pièges traités

- **Autorisations avant action** : aucun outil n'agit sur des comptes réels ; les outils du dossier sont **simulés** (R08, énoncé). Toutes les analyses sont en lecture seule.
- **Budget de crédits** : aucune action externe non confirmée ; pas d'appel réseau sortant.
- **Écriture sur la dernière révision** : la machine d'état utilise `rev_politique`/`rev_donnees` et une **garde de génération** ; les conflits sont résolus par refus, **jamais par écrasement** (P01 corrigé).
- **Rien envoyé à l'extérieur / rien supprimé** : la proposition P04 de réécrire le JSON en transit est **rejetée** (falsification d'audit) ; aucune suppression de données.
- **Pièges de domaine** : (i) rôle ≠ identité de projection (R01) → K-c insuffisante ; (ii) octet émis = divulgué (R04) → P02 ; (iii) annulation transport ≠ annulation d'effet (R05) → P04 ; (iv) cache ≠ contrôle d'accès (Q2) ; (v) révocation ≠ retrait d'octets (R02) ; (vi) messages indifférenciés (R08).

## Limites / impossibilités

- **P06 est impossible** (prouvé) : aucune architecture ne peut supprimer une copie sur un appareil isolé ni concilier « supprimer toute copie » et « ne perdre aucune mise à jour légitime ».
- **Non déterminé** : le délai exact de revalidation T et la latence de propagation inter-onglets dépendent de l'implémentation ; ils doivent être **mesurés**, pas supposés.
- **Hors périmètre (R08)** : navigateur hostile, canaux temporels, compromission OS — aucune garantie fournie.
- **Hypothèse** : client honnête (R05). Si le client est hostile, la clé K-d et les gardes de génération ne suffisent plus ; seule la décision serveur atomique (R02) protège.
- **Établi** : fuites P01–P04 réalisées ; K-d nécessaire ; ordre PD/rev ; impossibilité P06. **Réfuté** : P06, la proposition de réécriture JSON, K-a/K-b/K-c comme clés sûres.