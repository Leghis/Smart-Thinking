# SIII-02-V3 — SIII-02 → Mutation antérieure à la révocation

Score: 100.0 % (certificats 0/0, juge 100/100)

Certificats manqués: aucun

# Variante — Faut-il qualifier M de mutation non autorisée ?

## Réponse directe

**Non.** Dans la variante, M n'est **pas** une mutation non autorisée. C'est une **mutation autorisée dans l'ancien contexte (SOLEIL)**, dont le point de décision est **antérieur** à la révocation V. Ce qui est fautif n'est pas l'autorisation de M, mais son **attribution et son affichage** dans le nouveau contexte (LUNE). La qualification correcte est donc : **mutation légitime + affichage erroné**, et non **mutation indûment autorisée**.

Je détaille le raisonnement, puis je précise ce qui reste néanmoins à corriger, car « non autorisée » ≠ « sans conséquence ».

---

## 1. Pourquoi M n'est pas « non autorisée » : l'argument de sérialisation

Le dossier de base fixe la sémantique exacte de la révocation en **R02** :

> « Une révocation est une écriture sérialisée dans ce même domaine. L'objectif normal interdit les **nouvelles** lectures ou mutations **dont le point de décision est postérieur à cette révocation**. »

La clause décisive est **« dont le point de décision est postérieur »**. La révocation ne frappe pas toute opération *reçue* après elle, ni toute opération dont la *réponse* arrive après elle : elle frappe les opérations dont **le point de décision** (l'évaluation atomique principal / organisation / objet / action / finalité / révision de politique, cf. R01) est **postérieur** à V.

Or la variante stipule explicitement deux faits :

1. **« L'autorité sérialise M avant V »** — dans le domaine de décision unique et sérialisé (R02), l'ordre logique est **M ≺ V**. Le point de décision de M précède la révocation.
2. **« Tous les paramètres étaient autorisés lors de M »** — au moment de ce point de décision, l'évaluation a retourné *autorisé* sur l'ensemble des attributs requis par R01.

Il en découle que M **ne tombe pas** sous l'interdiction de R02 : ce n'est pas une « nouvelle mutation dont le point de décision est postérieur à la révocation ». C'est une mutation **antérieure** à la révocation, donc **dans le périmètre autorisé** de l'ancien contexte.

**R02 va plus loin et ferme la porte à l'interprétation inverse** :

> « Il ne prétend pas retirer des octets déjà délivrés ni **annuler une lecture autorisée avant la révocation mais reçue plus tard**. »

Le texte énonce le principe pour une *lecture* ; le principe est **symétrique** pour une *mutation* : une opération autorisée avant la révocation, dont l'effet ou la réponse se manifeste après, **n'est pas annulée rétroactivement** par la révocation. La révocation est un **coupure vers l'avant** (elle bloque ce qui décide *après* elle), pas un **effacement vers l'arrière** (elle ne réécrit pas l'histoire déjà linéarisée).

**R07 confirme la qualification** :

> « Une opération **déjà autorisée pour SOLEIL** peut néanmoins **aboutir dans SOLEIL**. Le produit doit présenter séparément "opération exécutée dans l'ancien contexte" et "état affiché dans le contexte actuel". »

C'est **exactement** le scénario de la variante : M est une opération déjà autorisée pour SOLEIL, elle aboutit dans SOLEIL, et seule sa **réponse** est reçue après le passage à LUNE. R07 ne demande pas de l'empêcher — il demande de **ne pas la présenter comme une opération LUNE**.

**Conclusion partielle :** la qualification « mutation non autorisée » est **fausse**. La bonne qualification est « **mutation autorisée dans l'ancien contexte, mal attribuée dans le nouveau** ».

---

## 2. Le piège à écarter : « autorisée » au sens de quelle autorité ?

Il faut distinguer deux lectures, car le dossier de base signale une faille réelle en **R06** (l'API actuelle extrait l'organisation d'un champ JSON et accepte `allowed=true` fourni par le frontend). Si « autorisé » signifiait « le frontend a envoyé `allowed=true` », alors M ne serait **pas** réellement autorisée et la réponse s'inverserait.

Mais la variante dit **« l'autorité sérialise M avant V »** et **« tous les paramètres étaient autorisés lors de M »**. Le mot **« autorité »** désigne le **point de décision serveur** (R02), et « tous les paramètres » renvoie aux attributs de R01 (principal, organisation, objet, action, finalité, révision de politique). On est donc dans le régime de la **version corrigée** (R06 : session serveur + validation atomique de la politique), où l'autorisation est **réelle**, non déclarative.

Autrement dit : la variante **neutralise volontairement** la faille R06 pour isoler la question de la **concurrence révocation/mutation**. Sous cette hypothèse, il n'y a **aucun défaut d'autorisation** à reprocher à M.

*(Si l'on voulait au contraire tester la faille R06, la réponse changerait : une mutation validée sur la base d'un `allowed=true` client serait non autorisée **indépendamment** de tout ordre avec V. Mais ce n'est pas la variante posée.)*

---

## 3. Ce qui reste fautif — et pourquoi ce n'est pas « non autorisé »

La variante ne blanchit pas le système. Elle **déplace** le défaut de la colonne « autorisation » vers la colonne « affichage / attribution ». Trois défauts subsistent, tous distincts d'une autorisation manquante :

**(a) Affichage erroné (le défaut principal).** P04 décrit le symptôme : « Le composant affiche ensuite "Mise à jour réussie" **dans LUNE** quand une notification globale arrive. » C'est une **violation de R07** : un résultat SOLEIL (génération 8) est **annoncé comme une opération LUNE**. La réponse de M porte un contexte capturé au départ et une génération de vue (R05) ; le gestionnaire doit comparer cette génération à la génération courante (9) et **refuser de l'appliquer à la vue LUNE**. Le défaut est donc un **défaut de garde de génération**, pas un défaut d'autorisation.

**(b) Risque de corruption d'état.** Si la réponse de M (état SOLEIL 17) est écrite dans le store LUNE via `setDossier(response)` sans contrôle de contexte (P01), elle peut **écraser** la vue LUNE légitime. C'est un **affichage erroné** doublé d'un risque d'**incohérence d'état**, toujours pas une autorisation manquante.

**(c) La « correction » proposée par l'équipe est dangereuse.** P04 rapporte : « L'équipe propose de changer le JSON en transit pour remplacer SOLEIL par LUNE. » C'est à **rejeter** : cela falsifie l'origine de l'opération, viole R07 (qui exige de **présenter séparément** les deux contextes), et peut transformer une mutation SOLEIL légitime en **mutation croisée** effectivement non autorisée (écrire dans LUNE un effet décidé pour SOLEIL). La bonne réponse n'est pas de **réécrire** le contexte, mais de **l'étiqueter** et de **le router** correctement.

**Distinction des trois catégories (rappel Q1) appliquée à la variante :**

| Catégorie | Présente dans la variante ? | Justification |
|---|---|---|
| **Divulgation** (octets d'une autre organisation reçus) | **Non** (dans la variante stricte) | M porte sur SOLEIL, contexte d'origine de l'usagère ; aucune donnée LUNE n'est exposée à SOLEIL ni l'inverse par M elle-même. |
| **Affichage erroné** | **Oui** | « Mise à jour réussie » annoncée dans LUNE (R07 violé). |
| **Mutation indûment autorisée** | **Non** | Point de décision M ≺ V, tous paramètres autorisés (R02 non violé). |

---

## 4. L'ordre logique correct (rappel Q4) et le cas de la variante

L'ordre logique exigé par le dossier de base est :

> **décision(M) ≺ décision(V) ≺ décision(lectures/mutations suivantes)**

- Toute opération dont le **point de décision** est **postérieur** à V est **refusée** (R02).
- Toute opération dont le **point de décision** est **antérieur** à V est **valide dans son contexte d'origine**, même si sa réponse arrive après V (R02, R07).

La variante se place **entièrement dans le second cas**. La seule chose qui « arrive après V » est **la réponse de M** — un événement de **transport** (R05 : « les requêtes et réponses peuvent finir dans n'importe quel ordre »), sans portée sur la validité de la décision. Confondre « réponse reçue après V » avec « décision prise après V » est précisément l'erreur que la variante invite à ne pas commettre.

**Traitement correct de la réponse tardive de M :**

1. La réponse de M est **estampillée** `{contexte: SOLEIL, génération: 8, op_id: …}` (R05).
2. À la réception, le gestionnaire compare `génération(8) ≠ génération_courante(9)` → **ne pas appliquer** à la vue LUNE.
3. Il **journalise** l'événement comme « **opération exécutée dans l'ancien contexte (SOLEIL)** » et, séparément, affiche « **état affiché dans le contexte actuel (LUNE)** » (R07).
4. Il **n'annule pas** M (elle est déjà linéarisée) et **ne la réécrit pas** en LUNE (interdit).
5. Il **rafraîchit** éventuellement la vue LUNE depuis la source LUNE pour garantir la cohérence.

---

## 5. Conséquences pour la conception (ce que la variante impose)

La variante, correctement comprise, **valide** plusieurs choix d'architecture et en **invalide** d'autres :

- **Valide** la séparation stricte « exécution » / « affichage » (R07) : deux canaux d'information distincts, jamais fusionnés.
- **Valide** l'usage d'un **numéro de génération de vue** monotone (R05) comme garde d'application des réponses.
- **Valide** l'**idempotence** et la **journalisation** des mutations : une mutation autorisée-avant-révocation doit rester traçable et non rejouée.
- **Invalide** toute promesse du type P06 (« la révocation supprime immédiatement toute copie… sans perdre une seule mise à jour légitime ») : la variante est un **contre-exemple vivant** — une mise à jour légitime (M) survit à la révocation et sa réponse arrive après. La garantie honnête doit donc dire : *« la révocation bloque les décisions postérieures ; elle n'annule ni les octets déjà délivrés, ni les opérations déjà linéarisées avant elle »* (R02).
- **Invalide** la « correction » par réécriture du JSON en transit (P04) : elle crée une mutation croisée non autorisée.

---

## 6. Formulation de la garantie produit honnête (adaptée à la variante)

> « Une révocation empêche toute **nouvelle** lecture ou mutation dont le **point de décision** est postérieur à la révocation. Les opérations **déjà autorisées et sérialisées avant** la révocation **aboutissent dans leur contexte d'origine** ; leur résultat n'est **jamais** présenté comme une opération du nouveau contexte. Le produit distingue explicitement *"opération exécutée dans l'ancien contexte"* et *"état affiché dans le contexte actuel"*. La révocation ne retire pas les octets déjà délivrés et n'annule pas les opérations déjà linéarisées. »

Cette formulation est **exactement** celle que la variante rend nécessaire : elle est vraie, vérifiable, et ne promet pas l'impossible.

---

## 7. Test adversarial associé (Q6) et oracle

**Test T-MV :** provoquer M (SOLEIL, gén. 8) puis V (passage LUNE, gén. 9) de sorte que la **réponse de M arrive après V**. Injecter un délai de transport sur la réponse de M.

**Oracle attendu :**
- La vue LUNE **n'est pas** modifiée par la réponse de M (garde de génération).
- Aucune annonce accessible « Mise à jour réussie » n'est émise **dans le contexte LUNE**.
- Un enregistrement « opération exécutée dans l'ancien contexte SOLEIL » est présent dans le journal.
- L'état SOLEIL reflète bien l'effet de M (M a abouti dans SOLEIL).
- **Échec** si le composant appelle `setDossier(response)` sans contrôle de contexte (P01) ou affiche « succès » dans LUNE (P04).

**Oracle de non-régression (branche positive P07) :** une agente LUNE habilitée lit puis modifie le dossier LUNE 17 avec politique stable → la séquence **doit réussir** ; masquer tous les dossiers est interdit. Ce test garantit que la garde de génération ne dégénère pas en blocage général.

---

## Synthèse

| Question | Réponse |
|---|---|
| **M est-elle une mutation non autorisée ?** | **Non.** Point de décision M ≺ V ; tous paramètres autorisés (R02, R07). |
| **Qu'est-ce qui est fautif ?** | L'**affichage/attribution** : résultat SOLEIL présenté dans LUNE (violation R07), et le risque d'écrasement d'état (P01). |
| **Catégorie Q1** | **Affichage erroné** (et non « mutation indûment autorisée »). |
| **Traitement** | Étiqueter la réponse (contexte + génération), ne pas l'appliquer à LUNE, journaliser « exécuté dans l'ancien contexte », ne pas réécrire le JSON. |
| **Promesse produit** | Révocation = coupure vers l'avant, pas effacement rétroactif (contredit P06). |

**En une phrase :** M est une mutation **légitime dans SOLEIL**, sérialisée avant la révocation ; la faute est de la **présenter comme une opération LUNE**, ce qui relève de l'affichage erroné et non de l'autorisation — et c'est précisément la distinction que R02 et R07 imposent de respecter.
# RÉPONSE FINALE — Variante « M sérialisée avant V »

## Résultat exact (verdict)

**M n'est PAS une mutation non autorisée.** C'est une **mutation autorisée dans l'ancien contexte (SOLEIL)**, dont le point de décision précède la révocation. La qualification correcte est **« mutation légitime + affichage erroné »**, jamais **« mutation indûment autorisée »**.

**Certificat logique (chaîne de décision) :**

```
Faits de la variante :
  F1 : décision(M) ≺ décision(V)          [« l'autorité sérialise M avant V »]
  F2 : autorisé(M) = vrai sur tous les attributs R01  [« tous les paramètres étaient autorisés »]
  F3 : réponse(M) reçue après V            [« seule la réponse de M est reçue après V »]

Règles du dossier de base :
  R02 : interdit les opérations dont le POINT DE DÉCISION est POSTÉRIEUR à V
  R02 : ne prétend pas annuler une opération autorisée avant V mais reçue plus tard
  R07 : une opération déjà autorisée pour SOLEIL peut aboutir dans SOLEIL

Déduction :
  F1 ⇒ ¬(décision(M) postérieure à V) ⇒ M hors du champ d'interdiction de R02
  F2 ⇒ M satisfait l'évaluation d'autorisation (R01)
  F3 ⇒ simple effet de transport (R05), sans portée sur la validité de la décision
  ⇒ M est AUTORISÉE (dans SOLEIL).  ∎
```

**Verdict :** `qualification(M) = "mutation autorisée, contexte SOLEIL"` — et non `"mutation non autorisée"`.

---

## Certificats par affirmation

| # | Affirmation | Méthode | Preuve (règle du dossier) | Confiance |
|---|---|---|---|---|
| C1 | M n'est pas interdite par la révocation | Application directe de R02 | R02 : « interdit les **nouvelles** … mutations **dont le point de décision est postérieur** » ; ici décision(M) ≺ V | 0,95 |
| C2 | M est autorisée | Évaluation R01 au point de décision | F2 : « tous les paramètres étaient autorisés lors de M » (principal, org, objet, action, finalité, révision) | 0,95 |
| C3 | La réponse tardive n'invalide pas M | R05 (transport asynchrone) + R02 | R05 : « requêtes et réponses peuvent finir dans n'importe quel ordre » ; R02 : pas d'annulation rétroactive | 0,9 |
| C4 | M peut aboutir dans SOLEIL | R07 | R07 : « Une opération déjà autorisée pour SOLEIL peut néanmoins aboutir dans SOLEIL » | 0,95 |
| C5 | Le défaut est un affichage erroné | R07 + P04 | R07 : présenter séparément les deux contextes ; P04 : « Mise à jour réussie » annoncée dans LUNE | 0,9 |
| C6 | La réécriture du JSON en transit est interdite | R07 + R06 | R07 (séparation des contextes) ; risque de mutation croisée non autorisée | 0,9 |

**Audit du registre :** 1/1 affirmation certifiée avec méthode ET preuve. Aucune contradiction détectée entre C1–C6 et le dossier de base.

---

## Pièges (à ne pas commettre)

1. **Confondre « réponse reçue après V » et « décision prise après V ».** C'est l'erreur centrale que la variante teste. La révocation est un **coupure vers l'avant** (bloque les décisions postérieures), pas un **effacement vers l'arrière** (ne réécrit pas l'histoire linéarisée). R02 est explicite.

2. **Lire « autorisé » comme « `allowed=true` du frontend ».** Sous R06 (API défectueuse), une mutation validée par un champ client serait non autorisée *indépendamment* de V. Mais la variante dit « **l'autorité** sérialise » et « tous les paramètres étaient autorisés » → régime de la **version corrigée** (validation atomique serveur). La faille R06 est **neutralisée** par l'énoncé.

3. **Croire que la révocation annule M.** Faux : M est déjà linéarisée avant V. La révocation ne peut pas « dé-sérialiser » une écriture antérieure.

4. **Accepter la « correction » par réécriture du JSON (P04).** Remplacer SOLEIL par LUNE en transit **falsifie l'origine**, viole R07, et peut créer une **mutation croisée effectivement non autorisée** (écrire dans LUNE un effet décidé pour SOLEIL). À rejeter.

5. **Appliquer la réponse de M à la vue LUNE.** `setDossier(response)` sans garde de génération (P01) écrase l'état LUNE → affichage erroné + incohérence. La réponse porte génération 8 ; la vue courante est 9 → **ne pas appliquer**.

6. **Sur-corriger en masquant tout.** Interdit par P07 : la branche positive (agente LUNE habilitée lit/modifie LUNE 17) **doit** fonctionner. La garde de génération ne doit pas dégénérer en blocage général.

7. **Promettre P06.** « La révocation supprime immédiatement toute copie… sans perdre une seule mise à jour légitime » est **faux** : la variante en est un contre-exemple vivant (M, mise à jour légitime, survit à V et sa réponse arrive après).

---

## Traitement correct de la réponse tardive de M (pseudo-code)

```
onResponse(resp):
    if resp.generation != currentView.generation:      # 8 != 9
        journal.append({type: "OP_EXECUTED_OLD_CONTEXT",
                        ctx: resp.context,          # SOLEIL
                        op_id: resp.op_id})
        # NE PAS appliquer à la vue LUNE
        # NE PAS réécrire resp.context en LUNE
        refreshViewFromSource(currentView.context)      # LUNE
        announceAccessible("Opération exécutée dans l'ancien contexte SOLEIL ; "
                           "état affiché : contexte actuel LUNE")
    else:
        applyToView(resp)
```

**Invariant :** `applyToView` n'est appelé que si `resp.generation == currentView.generation`. Toute réponse d'une génération antérieure est **journalisée, jamais appliquée, jamais réécrite**.

---

## Garantie produit honnête (formulation finale)

> « Une révocation empêche toute **nouvelle** lecture ou mutation dont le **point de décision** est postérieur à la révocation. Les opérations **déjà autorisées et sérialisées avant** la révocation **aboutissent dans leur contexte d'origine** ; leur résultat n'est **jamais** présenté comme une opération du nouveau contexte. Le produit distingue explicitement *"opération exécutée dans l'ancien contexte"* et *"état affiché dans le contexte actuel"*. La révocation ne retire pas les octets déjà délivrés et n'annule pas les opérations déjà linéarisées. »

Cette garantie est **vraie, vérifiable et non sur-promettante** : elle décrit exactement ce que R02 autorise et ce que R07 exige.

---

## Limites (périmètre R08)

- **Hors périmètre :** navigateur hostile, canaux temporels, compromission de l'OS. Le modèle suppose un **client honnête** (R05) ; toute donnée déjà envoyée peut avoir été copiée, mais cela ne change pas la qualification de M.
- **Non couvert par la variante :** la faille R06 (autorisation déclarative client) est **neutralisée** par l'hypothèse « l'autorité sérialise ». Si l'on retirait cette hypothèse, M deviendrait non autorisée **pour une raison indépendante de V** — mais ce n'est pas le cas posé.
- **Non couvert :** la divulgation par fragment anticipé (P02) et le rejeu local du service worker (P03) sont des incidents **distincts** de la variante ; ils relèvent de R04 et R03, non de l'ordre M/V.
- **Dépendance :** la conclusion repose sur la **fiabilité de l'horodatage de sérialisation** au point de décision. Si l'ordre M ≺ V n'était pas garanti par une écriture sérialisée unique (R02), la qualification s'effondrerait.

---

## Synthèse finale

| Question | Réponse |
|---|---|
| **M est-elle une mutation non autorisée ?** | **Non.** Décision M ≺ V ; tous paramètres autorisés (R02, R07). |
| **Catégorie Q1** | **Affichage erroné** (résultat SOLEIL présenté dans LUNE), pas « mutation indûment autorisée ». |
| **Défaut réel** | Absence de garde de génération à la réception (P01) + annonce « succès » dans le mauvais contexte (P04). |
| **Correction** | Étiqueter (contexte + génération), ne pas appliquer à LUNE, journaliser « exécuté dans l'ancien contexte », ne pas réécrire le JSON. |
| **Promesse** | Révocation = coupure vers l'avant, pas effacement rétroactif (contredit P06). |

**En une phrase :** M est une mutation **légitime dans SOLEIL**, sérialisée avant la révocation ; la faute est de la **présenter comme une opération LUNE** — affichage erroné, non autorisation manquante — exactement la distinction que R02 et R07 imposent de respecter.