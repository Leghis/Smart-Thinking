# SIII-02-V2 — SIII-02 → Même rôle, projections différentes

Score: 84.0 % (certificats 0/0, juge 84/100)

Certificats manqués: aucun

Toutes les preuves numériques sont établies. Je rédige maintenant la réponse finale complète.

---

# Variante — Deux agentes LUNE, même rôle AGENT, permissions différentes

## Réponse directe

**Non, K-c ne suffit pas.** K-c = `(organisation, dossier, nom de rôle)` collisionne dès que deux principaux partagent le même triplet mais pas les mêmes permissions effectives — exactement le cas de la variante. La clé K-c est un **raffinement insuffisant** de la fonction de projection autorisée : elle identifie *qui demande nominalement*, pas *ce que le demandeur a le droit de recevoir*. La seule clé correcte est **K-d**, qui inclut l'ensemble des permissions effectives (le contexte d'autorisation complet).

---

## Q1 — Matrice incident / frontière / preuve / composant (ligne ajoutée par la variante)

| Incident | Frontière franchie | Preuve de fuite | Composant responsable | Nature |
|---|---|---|---|---|
| **P01** Réponse tardive SOLEIL→LUNE | Contexte de vue (génération) | Octets SOLEIL rendus dans une vue LUNE | Gestionnaire commun (`setDossier` sans contrôle de génération) | Affichage erroné |
| **P02** Fragment anticipé | Autorisation avant émission | Nom + note privée émis avant le 403 | Serveur de rendu (R04) | Divulgation |
| **P03** Rejeu local SW | Session / cache hors ligne | JSON SOLEIL servi à une session LUNE | Service worker (clé = chemin) | Divulgation |
| **P04** Mutation tardive | Autorité de mutation | Mutation SOLEIL aboutie, annoncée comme LUNE | API (org depuis JSON, `allowed=true` client) | Mutation indûment autorisée + affichage erroné |
| **V1 (variante)** Collision K-c | Autorisation par principal | A2 (résumé seul) reçoit la note privée via HIT | Cache partagé (CDN / SW / cache mémoire) | **Divulgation** |

**Preuve V1 (certifiée).** A1 (perms `{résumé, note}`) remplit le cache sous `('LUNE', 17, 'AGENT')`. A2 (perms `{résumé}`) demande le même chemin → même clé → **HIT** → reçoit `{résumé, note}`. La note privée est délivrée à un principal non habilité : au sens de R04, un octet émis est divulgué. C'est une **divulgation**, pas un simple affichage erroné : les octets sortent du domaine d'autorisation.

**Distinction maintenue** : V1 = divulgation (octets franchissent la frontière) ; P01 = affichage erroné (octets légitimes, mauvais contexte) ; P04 = mutation indûment autorisée (effet d'écriture hors contexte).

---

## Q2 — Condition nécessaire de partage, analyse K-a→K-d, politique retenue

**Condition nécessaire de partage.** Deux réponses peuvent partager une entrée de cache **si et seulement si** elles sont identiques octet pour octet pour *tout* demandeur susceptible de produire cette clé. Autrement dit, la clé doit être un **raffinement** de la fonction de projection autorisée : `clé(r1) = clé(r2) ⟹ projection(r1) = projection(r2)`. Si deux demandeurs distincts peuvent produire la même clé avec des projections différentes, le partage est **interdit**.

**Analyse :**

- **K-a = chemin** — collisionne entre organisations (R01 : `dossier_id` n'est unique que dans une organisation) et entre langues. Insuffisant.
- **K-b = organisation + dossier** — corrige la collision inter-organisations, mais collisionne entre principaux de permissions différentes (deux agentes LUNE). Insuffisant.
- **K-c = organisation + dossier + rôle** — **insuffisant** : le rôle nommé ne détermine pas les permissions (R01, P05). Deux AGENT LUNE de permissions différentes collisionnent → fuite V1.
- **K-d = contexte d'autorisation complet + révision des données + langue + version de représentation** — **suffisant** : il inclut l'ensemble des permissions effectives, donc deux projections différentes ont des clés différentes. Il intègre aussi la révision (invalidation) et la langue/version (R01 : la langue change les octets, pas les droits).

**Politique concrète pour les réponses protégées :**
1. **Par défaut, ne pas mettre en cache partagé** les réponses protégées (`Cache-Control: private, no-store`), sauf si la clé est un raffinement prouvé de la projection.
2. Si cache partagé : clé = **K-d**, et le CDN doit traiter `Vary`/Cookie (contrairement à R03) ou être remplacé par un cache par-principal.
3. Le service worker et le cache mémoire frontend doivent utiliser **K-d** (ou être purgés au changement de contexte/session).
4. **Invalidation** : toute écriture de politique ou de données incrémente la révision incluse dans K-d.

**Pourquoi une clé n'est pas un contrôle d'accès.** Une clé de cache est un **index de réutilisation**, pas une décision d'autorisation. Elle ne fait que décider *si* une réponse déjà calculée peut être resservie ; elle ne vérifie ni le principal, ni l'action, ni la finalité, ni la révision de politique (R02). Une clé correcte évite la *collision*, mais elle ne remplace jamais le point de décision : même avec K-d, le serveur doit vérifier l'autorisation **avant** de servir ou de calculer. La clé réduit la surface de fuite ; elle ne l'élimine pas et ne constitue pas une barrière d'autorisation.

---

## Q3 — Machine d'état / pseudo-code (changement de contexte, chargement, mutation)

```
ÉTAT: { contexte: (org, principal, rôle, perms, révision_politique),
        génération: int,           # monotone, incrémentée à chaque changement de contexte
        vue: {dossier_id, données, génération_source} }

# --- Changement de contexte ---
onChangeContext(nouveau):
    génération += 1
    contexte = nouveau
    vue = vide
    purgerCacheMémoire()                 # clé K-d, sinon fuite V1
    annoncerAccessible("Contexte changé vers " + nouveau.org)   # aria-live polite
    rechargerVue()

# --- Chargement (lecture) ---
onLoad(dossier_id):
    g = génération
    ctx = contexte
    r = await fetch(chemin(ctx.org, dossier_id), {credentials, csrf})
    # R02 : le serveur décide AVANT d'émettre (R04)
    if r.génération != génération or r.contexte != contexte:
        return                            # réponse périmée : NE PAS setDossier (P01)
    if r.statut == 403:
        afficher("Accès refusé")          # message identique quelle que soit l'org (R08)
        return
    vue = {dossier_id, r.données, r.génération}

# --- Rendu serveur (R04) ---
render(dossier_id, ctx):
    if not autorisé(ctx, dossier_id, "lire", finalité, révision_politique):
        return fragment("accès refusé")   # AUCUN octet privé avant la décision
    return fragment(nom, note_privée)     # émis seulement après autorisation

# --- Mutation ---
onMutate(dossier_id, delta):
    g = génération; ctx = contexte
    idempotency_key = uuid()
    r = await POST(chemin(ctx.org, dossier_id), {
            corps: delta,
            org: ctx.org,                 # serveur, PAS depuis le JSON client (R06)
            csrf: jeton,                  # protection requêtes forgées
            idempotency_key
        })
    # Le serveur valide la politique atomiquement (R02)
    if r.contexte != contexte or r.génération != génération:
        # L'annulation navigateur n'a pas annulé l'effet (P04)
        journaliser("opération exécutée dans l'ancien contexte " + r.contexte.org)
        annoncerAccessible("Opération exécutée dans l'ancien contexte " + r.contexte.org)
        # NE PAS afficher "Mise à jour réussie" dans le contexte courant (R07)
        return
    afficher("Mise à jour réussie dans " + contexte.org)
```

**Onglets.** Chaque onglet a sa propre `génération` ; les changements de session ne se propagent pas instantanément (R05). Utiliser `BroadcastChannel` pour notifier les autres onglets, mais **chaque onglet revalide** sa génération avant d'afficher. Un onglet ne doit jamais adopter une donnée d'un autre contexte sans revalidation.

**Annonces accessibles.** `aria-live="polite"` pour les changements de contexte et les résultats ; distinguer explicitement « opération exécutée dans l'ancien contexte » et « état affiché dans le contexte actuel » (R07). Les messages d'erreur doivent être **identiques** pour « inexistant » et « non autorisé » (R08).

---

## Q4 — Ordre logique révocation / lecture / mutation, réparation API, mutation tardive

**Ordre logique (R02).** La révocation est une **écriture sérialisée** dans le domaine de décision. Toute lecture ou mutation dont le point de décision est **postérieur** à la révocation doit être refusée. Ordre total : `révocation ≺ décision(lecture/mutation)`. Une lecture autorisée **avant** la révocation mais reçue après reste valide (R02) — mais elle ne doit pas s'afficher dans un contexte postérieur (R07).

**Réparation de l'API (R06) :**
1. **Organisation côté serveur** : dériver l'org de la session serveur, jamais du champ JSON client.
2. **Supprimer `allowed=true`** : la décision vient du serveur (point de décision atomique), pas du frontend.
3. **Session serveur + CSRF** : jeton de session lié au principal ; protection contre requêtes forgées ; ne pas se fier au cookie seul.
4. **Validation atomique** : vérifier `(principal, org, objet, action, finalité, révision_politique)` dans une transaction unique avec la mutation.
5. **Idempotence** : clé d'idempotence pour éviter les doubles effets lors des reprises.

**Mutation tardive (P04).** L'annulation navigateur (`AbortController`) est une tentative de transport **sans garantie** (R05). Si le backend a déjà reçu et appliqué la mutation :
- **Ne pas** réécrire le JSON en transit pour remplacer SOLEIL par LUNE (proposition rejetée : falsification de contexte, viole R07 et l'intégrité).
- **Accepter** que l'opération aboutisse dans SOLEIL (R07 l'autorise explicitement).
- **Afficher séparément** : « opération exécutée dans l'ancien contexte (SOLEIL) » vs « état affiché dans le contexte actuel (LUNE) ».
- **Réconciliation** : la réponse porte le contexte capturé au départ ; le composant compare `r.contexte` à `contexte` courant et route l'annonce en conséquence.

---

## Q5 — Non-divulgation, impossibilité de P06, garantie honnête

**Propriété de non-divulgation (périmètre R08).** *Pour tout principal p, toute lecture ou mutation dont le point de décision est postérieur à une révocation concernant p est refusée ; et aucune réponse servie à p ne contient d'octets hors de la projection autorisée de p.*

*Preuve (esquisse).* (i) Le serveur décide **avant** d'émettre (R04) : aucun octet privé ne précède la décision. (ii) Toute clé de cache est un raffinement de la projection (K-d) : deux projections différentes ⇒ clés différentes ⇒ pas de collision (démontré : K-d diff = True). (iii) Les réponses périmées sont rejetées par contrôle de génération/contexte (P01). (iv) Les messages d'erreur sont indistinguables (R08). Donc aucune fuite par cache, par rendu anticipé, par réponse tardive ou par canal d'erreur. **Limite** : la propriété porte sur les octets *délivrés par le système* ; elle ne couvre pas la copie post-délivrance (R08) ni les canaux temporels (hors périmètre).

**Impossibilité de P06.** P06 promet : « une révocation supprime immédiatement toute copie, dans tous les onglets, tout cache et tout appareil hors ligne ». Or R08 pose qu'**aucun canal ne peut contacter un appareil isolé**. Un appareil hors ligne n'est joignable par aucun message de révocation ; il conservera ses copies jusqu'à reconnexion. De plus, R02 précise qu'une révocation **ne retire pas les octets déjà délivrés**. Donc P06 est **logiquement impossible** : elle exige un canal vers un appareil isolé (inexistant) et le retrait d'octets déjà émis (impossible). C'est une promesse non tenable.

**Garantie produit honnête.** « Une révocation empêche **toute nouvelle** lecture ou mutation dont la décision est postérieure à la révocation, sur tous les appareils **connectés**, dans un délai borné par la prochaine synchronisation. Les copies déjà délivrées et les appareils hors ligne ne peuvent pas être rappelés ; ils sont invalidés dès leur reconnexion. Les mises à jour légitimes déjà autorisées avant la révocation peuvent aboutir dans leur contexte d'origine. »

---

## Q6 — Tests adversariaux et oracles

| Test | Oracle | Résultat attendu |
|---|---|---|
| **T1 — Collision K-c (variante)** | A1 (note+résumé) remplit ; A2 (résumé seul) demande | **ÉCHEC** : A2 reçoit la note → fuite détectée |
| **T2 — K-b, permissions identiques** | Deux agentes mêmes droits | **PASSE** (True) |
| **T3 — K-b, permissions différentes** | Deux agentes droits différents | **ÉCHEC** (False) → fuite |
| **T4 — K-d, permissions différentes** | Deux agentes droits différents | **PASSE** (True) → sûr |
| **T5 — Réponse tardive (P01)** | Réponse SOLEIL gén. 8 arrive après bascule LUNE gén. 9 | La vue LUNE n'est pas remplacée ; oracle : `vue.génération == 9` |
| **T6 — Fragment anticipé (P02)** | Requête sans permission | Aucun octet privé avant le 403 ; oracle : premier octet = fragment refus |
| **T7 — Rejeu SW (P03)** | Session LUNE demande chemin SOLEIL hors ligne | Pas de HIT SOLEIL ; oracle : MISS ou refus |
| **T8 — Mutation tardive (P04)** | Mutation SOLEIL aboutie après bascule | Annonce « ancien contexte », pas « réussie dans LUNE » |
| **T9 — Indistinguabilité erreurs (R08)** | Dossier inexistant vs non autorisé, autre org | Messages identiques (octet pour octet) |
| **T10 — Branche positive (P07)** | Agente LUNE habilitée lit+modifie LUNE 17 | **PASSE** : séquence autorisée, pas de masquage permanent |

**Test exigé par l'énoncé (passe avec K-b, échoue avec permissions individuelles différentes) :** c'est **T2 vs T3**. Avec K-b et permissions **identiques**, le test passe (True) ; avec permissions **individuelles différentes**, il échoue (False). La variante ajoute **T1** : le même test appliqué à **K-c** échoue aussi (False), prouvant que K-c ne suffit pas. Seul **K-d** (T4) passe dans tous les cas.

---

## Synthèse de la variante

**K-c ne suffit pas.** Le nom de rôle ne détermine pas les permissions (R01, P05) : deux AGENT LUNE de droits différents produisent la même clé K-c et collisionnent, exposant la note privée à l'agente qui n'a droit qu'au résumé (fuite V1, certifiée). La clé correcte est **K-d**, qui inclut l'ensemble des permissions effectives, la révision des données, la langue et la version de représentation. Les conclusions affectées (Q1 : nouvelle ligne de divulgation ; Q2 : K-c rejetée, K-d retenue ; Q6 : T1/T3 échouent, T4 passe) sont recalculées ; les autres contraintes du dossier de base (R01–R08, P01–P07) restent inchangées.