# SIII-02-V4 — SIII-02 → Une copie déjà emportée

Score: 100.0 % (certificats 0/0, juge 100/100)

Certificats manqués: aucun

La preuve est confirmée. Je rédige la réponse finale.

---

# Variante — Peut-on certifier l'effacement instantané lors de V ?

## Cadrage : ce que la variante change, et ce qu'elle ne change pas

La variante modifie **une seule hypothèse** du dossier de base : *toutes les nouvelles réponses sont correctement protégées*. Autrement dit, les fuites **actives** de P01–P04 (réponse tardive, fragment anticipé, rejeu local, mutation tardive) sont supposées corrigées par l'architecture de Q2–Q4. Ce qui subsiste est un **résidu historique** : une copie **autorisée au moment de sa délivrance**, conservée sur un appareil **maintenant isolé**.

Je ne remplace donc que cette hypothèse. Les conclusions Q1–Q4 et Q6 du dossier de base restent valides (elles portent sur les fuites actives, désormais fermées) ; seule **Q5** est directement concernée, et elle est ici **instanciée** sur le cas de l'appareil isolé.

**Réponse courte : NON.** On ne peut pas certifier l'effacement instantané. Ce n'est pas un défaut d'ingénierie à corriger, c'est une **impossibilité structurelle** qui découle de R02, R08 et P06. En revanche, on peut certifier une propriété plus faible mais utile : le **non-usage futur** de la copie.

---

## Q1 — Matrice incident / frontière / preuve / composant (état après correction)

| Incident | Frontière franchie | Preuve de fuite | Composant responsable | Nature |
|---|---|---|---|---|
| P01 réponse tardive | Contexte de vue (SOLEIL→LUNE) | Octets SOLEIL reçus et affichés en LUNE | Gestionnaire commun (`setDossier` sans garde de génération) | **Affichage erroné** (pas de divulgation nouvelle : la lecture était autorisée) |
| P02 fragment anticipé | Rendu avant contrôle d'accès | Nom + note privée émis avant le 403 | Serveur de rendu (R04) | **Divulgation** (octets émis = divulgués) |
| P03 rejeu local | Cache service worker (clé = chemin) | JSON SOLEIL servi hors ligne à une session LUNE | Service worker (R03) | **Divulgation** (données d'une autre organisation) |
| P04 mutation tardive | Autorité de mutation (R06) | `allowed=true` du frontend + org extraite du JSON | API (R06) | **Mutation indûment autorisée** |
| **Variante : copie isolée** | **Aucune (délivrance autorisée)** | **Aucune : la copie était légitime à t_del** | **Aucun — hors périmètre R08** | **Ni divulgation, ni affichage erroné, ni mutation indue** |

**Point décisif pour la variante :** la copie de l'appareil isolé **ne figure dans aucune ligne de fuite**. Elle a été délivrée sous autorisation valide (point de décision antérieur à V). Elle n'est donc pas un incident à réparer, mais une **limite de portée** à énoncer honnêtement. Confondre « copie légitime antérieure » et « fuite » serait une erreur de qualification qui fausserait toute la promesse produit.

---

## Q2 — Condition nécessaire de partage de cache (rappel, inchangé)

**Condition nécessaire :** deux réponses ne peuvent partager une entrée de cache que si elles sont **substituables pour tout consommateur** — c'est-à-dire si elles ont la **même projection autorisée** (mêmes octets visibles) pour tout principal susceptible de les recevoir.

- **K-a (chemin)** : viole la condition — le même chemin `/dossiers/17` sert SOLEIL et LUNE (R01 : `dossier_id` n'est unique que dans une organisation).
- **K-b (organisation + dossier)** : nécessaire mais **non suffisant** — deux personnes de la même organisation avec le même rôle nommé AGENT peuvent avoir des permissions différentes (R01, P05).
- **K-c (organisation + dossier + rôle)** : insuffisant — « aucun nom de rôle ne garantit l'identité des projections autorisées » (P05).
- **K-d (contexte d'autorisation complet + révision des données + langue + version de représentation)** : **seul candidat correct**.

**Politique concrète :** pour toute réponse protégée, **ne pas mettre en cache partagé** (CDN) ; utiliser au mieux un cache **privé par principal** clé par K-d, ou `Cache-Control: private, no-store` pour les fragments sensibles. **Une clé n'est pas un contrôle d'accès** : elle ne fait que *séparer* des entrées ; elle ne *vérifie* rien. Si la clé est fausse ou incomplète, le cache sert des octets à un principal non autorisé — la clé ne peut pas refuser, elle ne fait que ranger. Le contrôle d'accès reste au **point de décision** (R02), jamais dans la clé.

---

## Q3 — Machine d'état de changement de contexte (inchangée, applicable)

```
ÉTATS : {SOLEIL:g8, LUNE:g9, ...}   # (contexte, génération monotone)

onContextSwitch(newCtx):
    gen += 1
    currentCtx = newCtx
    invalidateView()                 # purge cache mémoire frontend (clé ['dossier', id])
    announce(a11y, "Contexte : " + newCtx.org)   # annonce accessible

onLoad(id):
    g = gen; ctx = currentCtx
    r = await fetch(ctx, id)         # requête porte (ctx, g)
    if r.gen != gen or r.ctx != currentCtx:
        discard(r)                   # R07 : ne remplace jamais une vue LUNE
        return
    render(r)

onMutation(id, payload):
    g = gen; ctx = currentCtx
    send(ctx, id, payload, g)        # mutation liée à (ctx, g)
    # à la réponse : si ctx != currentCtx → afficher
    #   « opération exécutée dans l'ancien contexte » (R07)
    #   séparément de « état affiché dans le contexte actuel »
```

**Rendu serveur (R04) :** contrôle d'accès **avant** tout octet ; jamais de fragment anticipé. **Onglets :** chaque onglet a sa génération ; les autres onglets ne reçoivent pas instantanément les changements de session (R05) → diffuser un signal de changement de contexte, mais **ne jamais** faire confiance à l'état local d'un autre onglet. **Accessibilité :** annoncer le contexte courant et distinguer explicitement « exécuté dans l'ancien contexte » / « affiché dans le contexte actuel ».

---

## Q4 — Ordre logique révocation / lecture / mutation (inchangé)

**Ordre sérialisé (R02) :** toute lecture ou mutation dont le **point de décision est postérieur à V** est refusée. La révocation est une écriture sérialisée dans le même domaine de décision.

**Réparation de l'API (R06) :** session serveur (pas d'org extraite du JSON client), protection anti-CSRF, **validation atomique de la politique** au point de décision ; **supprimer** `allowed=true` fourni par le frontend.

**Mutation dont l'annulation navigateur n'a pas annulé l'effet (P04) :** l'annulation est une tentative de transport (R05), sans garantie. Traitement correct :
1. La mutation déjà reçue est **exécutée dans son contexte d'origine** (SOLEIL) — c'est légitime (R07).
2. Le composant **ne doit pas** afficher « Mise à jour réussie » dans LUNE. Il affiche séparément « opération exécutée dans l'ancien contexte ».
3. **Interdit :** réécrire le JSON en transit pour remplacer SOLEIL par LUNE (proposition rejetée) — cela falsifierait l'autorité et créerait une mutation indue.

---

## Q5 — Non-divulgation, impossibilité de P06, garantie honnête

### 5.1 Propriété de non-divulgation (périmètre R08) — **certifiable**

> **Théorème (non-divulgation).** Sous l'architecture corrigée, pour tout principal p, toute organisation o et tout instant t > t_V, aucune réponse servie à p ne contient d'octets d'un dossier de o non autorisés pour p à t.

*Preuve.* Toute réponse protégée passe par le point de décision (R02), qui vérifie atomiquement (principal, organisation, objet, action, finalité, révision de politique). Les caches sont clés par K-d ou désactivés pour le protégé (Q2), donc aucune entrée substituable n'est servie à un principal non autorisé. Le rendu contrôle l'accès avant émission (R04). Les erreurs ne distinguent pas contenu ni existence d'un dossier d'une autre organisation (R08). ∎

### 5.2 Impossibilité de P06 — **preuve formelle**

> **Théorème (impossibilité).** Il est impossible de garantir « une révocation supprime immédiatement toute copie, dans tous les onglets, tout cache et tout appareil hors ligne ».

*Preuve.* Soit A un appareil isolé détenant une copie C délivrée à t_del < t_V. Pour que C soit effacée à t_V, il faut un canal c joignable de A à t_V transportant l'ordre d'effacement. Or R08 exclut les canaux temporels et la compromission OS, et P06 stipule qu'**aucun canal ne peut contacter un appareil isolé**. L'ensemble des canaux joignables de A à t_V est donc **vide** ; aucun ordre d'effacement ne peut être transporté ; C subsiste à t_V. La garantie est donc **fausse** pour tout A isolé. ∎

*(Vérifié par calcul : `certifiable_effacement(∅) = False`.)*

### 5.3 Garantie produit honnête

> **Garantie de révocation (honnête).** À partir de V, **aucune nouvelle lecture ni mutation** dont le point de décision est postérieur à V n'est servie. Toute copie détenue par un client **est invalidée avant tout usage** dès son prochain point de décision (reconnexion). L'effacement effectif des octets déjà délivrés est **borné par le prochain contact** de l'appareil, **non garanti à l'instant de V**.

**Formulation commerciale acceptable :** « Après révocation, l'accès est coupé immédiatement côté serveur ; toute copie locale devient inutilisable dès la prochaine connexion de l'appareil. » **À proscrire :** « supprime immédiatement toute copie… tout appareil hors ligne ».

---

## Q6 — Tests adversariaux et oracles (inchangés, applicables à la variante)

| Test | Oracle |
|---|---|
| Réponse tardive SOLEIL après bascule LUNE (P01) | La vue LUNE n'est **jamais** remplacée ; aucune annonce « LUNE » pour un résultat SOLEIL |
| Fragment anticipé (P02) | Aucun octet du nom/note privée avant le contrôle d'accès ; journal = 403 sans contenu |
| Rejeu local service worker (P03) | Hors ligne, une session LUNE ne reçoit **jamais** un JSON SOLEIL |
| Mutation tardive (P04) | Affichage séparé « exécuté dans l'ancien contexte » / « affiché dans le contexte actuel » |
| **K-b vs permissions individuelles** | **Passe avec K-b** (même org+dossier) **mais échoue** dès que deux principaux de même rôle AGENT ont des permissions différentes → prouve que K-b est insuffisant, K-d requis |
| **Appareil isolé (variante)** | Oracle : à la reconnexion, la copie est **invalidée avant usage** ; l'effacement instantané **n'est pas** un critère de succès (impossible) |

---

## Conclusion de la variante

**Non, on ne peut pas certifier l'effacement instantané lors de V.** La copie autorisée antérieure sur un appareil isolé est **hors de portée de tout canal** (R08, P06) ; la révocation, écriture sérialisée, **ne retire pas les octets déjà délivrés** (R02). C'est une **impossibilité prouvée**, pas un défaut à corriger.

Ce qui **reste certifiable** et doit être promis :
1. **Coupure immédiate côté serveur** : aucune lecture/mutation postérieure à V n'est servie (Q5.1).
2. **Invalidation avant usage** : toute copie est neutralisée à son prochain point de décision.
3. **Borne honnête** : l'effacement effectif est borné par le prochain contact de l'appareil, **non garanti à l'instant de V**.

La seule hypothèse modifiée (nouvelles réponses protégées) **ne change pas** cette conclusion : elle ferme les fuites actives (P01–P04) mais laisse intacte la limite structurelle sur les copies déjà délivrées. La promesse P06 doit être **réécrite** en promesse de non-usage, jamais d'effacement instantané.