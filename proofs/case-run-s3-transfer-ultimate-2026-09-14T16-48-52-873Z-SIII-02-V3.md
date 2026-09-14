# SIII-02-V3 — SIII-02 → Mutation antérieure à la révocation

Score: 100.0 % (certificats 0/0, juge 100/100)

Certificats manqués: aucun

La seconde méthode confirme : dans le cas de la variante, `autorisee=True` et `affichage_correct=False`. Les deux notions sont bien orthogonales. Je rédige la réponse finale.

## Réponse

**Non. Dans la variante, M ne doit pas être qualifiée de mutation non autorisée.**

M est une **mutation autorisée exécutée dans l'ancien contexte**, dont la réponse est simplement **reçue tardivement** après la révocation V. La qualification exacte est :

| Événement | Point de décision | Statut d'autorisation | Statut d'affichage |
|---|---|---|---|
| M (mutation SOLEIL) | t = 8, **antérieur à V** | **Autorisée** (tous paramètres valides) | Réponse reçue à t = 10 → **affichage tardif** |
| V (révocation) | t = 9 | — | — |

Le défaut résiduel n'est **pas** un défaut d'autorisation, mais un défaut d'**exactitude visible** (R07) : la réponse de M ne doit pas être présentée comme une opération du contexte courant (LUNE). C'est un problème de **présentation**, pas de **permission**.

## Preuves et certificats

**1. Règle R02 appliquée littéralement.** R02 énonce : « L'objectif normal interdit les nouvelles lectures ou mutations **dont le point de décision est postérieur à cette révocation**. » La condition d'interdiction est donc `decision_time > revocation_time`. Dans la variante, `decision_time(M) = 8 < 9 = revocation_time(V)`, donc la condition d'interdiction **n'est pas remplie**.

**2. Énumération des cas (compute).** Le modèle d'états donne :
- `autorisee(8, 9) = True` → M est autorisée.
- `autorisee(10, 9) = False` → contre-exemple : si M avait été décidée *après* V, elle serait non autorisée. C'est précisément ce que la variante **exclut**.

**3. Ordre partiel (solve_logic).** L'ordre `M_decision < V_revocation < M_reponse_recue` est cohérent, sans contradiction. La sérialisation M-avant-V est exactement l'ordre qui rend M légitime.

**4. R02, clause explicite sur la réception tardive.** R02 précise que l'objectif « ne prétend pas retirer des octets déjà délivrés **ni annuler une lecture autorisée avant la révocation mais reçue plus tard**. » La variante est le cas d'école de cette clause : autorisée avant V, reçue après V. La qualification d'autorisation est **figée au point de décision**, pas à la réception.

**5. R07 confirme la doctrine.** « Une opération déjà autorisée pour SOLEIL peut néanmoins aboutir dans SOLEIL. » M aboutit dans SOLEIL : c'est conforme. Ce qui est interdit, c'est qu'un résultat SOLEIL « remplace une vue LUNE » ou soit « annoncé comme une opération LUNE ».

**6. Seconde méthode indépendante (table de vérité).** En croisant trois variables binaires (décision avant V ?, réponse après V ?, paramètres valides ?), on obtient pour le cas de la variante `{autorisee: True, affichage_correct: False}`. La table montre que les deux propriétés sont **orthogonales** : `(True, False, True)` et `(True, True, True)` donnent la même autorisation mais un affichage différent. Aucun écart entre les deux méthodes.

**7. Distinction des trois notions (à ne pas confondre).**
- **Autorisation** : dépend du point de décision vs V → M **autorisée**.
- **Exactitude visible** : dépend de la génération de vue au moment de l'affichage → **violée** si la réponse de M écrase une vue LUNE.
- **Octets délivrés** : R04/R08 — des octets SOLEIL ont pu être reçus ; cela ne rend pas M « non autorisée », cela rend la **divulgation** possible (problème distinct).

## Pièges traités

- **Confondre « reçue après V » et « décidée après V ».** C'est le piège central. La révocation est une écriture sérialisée (R02) ; seule la position du **point de décision** compte pour l'autorisation. La réception est un fait de transport (R05), pas de décision.
- **Confondre annulation de transport et annulation d'effet.** R05 : annuler la requête côté navigateur « est une tentative de transport, sans garantie d'annuler une mutation déjà reçue ». Ici le backend a déjà sérialisé M avant V : l'effet est acquis, l'annulation navigateur est sans objet.
- **Confondre autorisation et affichage (R07).** M autorisée ≠ M affichable dans LUNE. Le composant qui affiche « Mise à jour réussie » dans LUNE (P04) commet une faute d'**exactitude visible**, pas une faute d'autorisation.
- **Confondre « autorisée » et « souhaitable ».** M est autorisée *dans SOLEIL* ; elle reste une opération de l'ancien contexte. La qualifier de « non autorisée » serait une erreur de catégorie.
- **Le piège de la « correction » proposée en P04.** Réécrire le JSON en transit pour remplacer SOLEIL par LUNE est **interdit** : cela falsifierait l'objet réel de la mutation (R01 : l'objet est `(organisation, dossier_id)`), transformerait une opération SOLEIL légitime en opération LUNE inexistante, et violerait l'intégrité. La bonne réponse est de **présenter séparément** « opération exécutée dans l'ancien contexte » et « état affiché dans le contexte actuel » (R07).
- **Autorisations avant action / périmètre.** Aucune action externe, aucune suppression : la qualification est un raisonnement sur le modèle, sans effet de bord. Conforme à la checklist.
- **Budget / écriture sur dernière révision.** Sans objet ici (pas d'écriture concurrente) ; la sérialisation M-avant-V garantit justement l'absence de conflit d'écrasement.

## Limites / impossibilités

- **On ne peut pas « dé-autoriser » rétroactivement M.** Une fois le point de décision franchi avant V, requalifier M en « non autorisée » contredirait R02 et créerait une insécurité juridique/logique (toute opération passée deviendrait révocable arbitrairement). L'autorisation est un fait daté.
- **On ne peut pas annuler l'effet de M par la révocation V.** V interdit les décisions *postérieures* ; elle ne défait pas les décisions antérieures. Si l'on veut annuler l'effet, il faut une **mutation compensatoire** explicite (rollback), qui est une nouvelle opération soumise à sa propre autorisation — pas une conséquence automatique de V.
- **On ne peut pas garantir que la réponse tardive de M ne soit jamais reçue.** R05/R08 : le transport est asynchrone et des octets déjà envoyés peuvent avoir été copiés. La garantie réalisable porte sur l'**affichage** (ne pas écraser une vue LUNE, ne pas annoncer M comme LUNE), pas sur la non-réception.
- **La qualification « autorisée » ne dit rien sur la divulgation.** Si la réponse de M contient des données SOLEIL reçues après le passage à LUNE, il peut y avoir **divulgation** (R04/R08) — un problème distinct de l'autorisation de M. M reste autorisée ; la fuite éventuelle se traite par l'isolation de cache (Q2) et la séparation des contextes, non en requalifiant M.
- **Hors périmètre (R08).** Canaux temporels et compromission OS exclus ; on ne prétend pas empêcher la copie d'octets déjà délivrés.

**Synthèse.** La réponse à la question posée est **non** : M n'est pas une mutation non autorisée, car son point de décision précède V et tous ses paramètres étaient valides. Le traitement correct consiste à (i) **accepter** l'effet de M dans SOLEIL, (ii) **ne pas** le présenter comme une opération LUNE, (iii) **séparer** l'affichage « opération exécutée dans l'ancien contexte » de « état affiché dans le contexte actuel », et (iv) si l'effet doit être défait, émettre une **mutation compensatoire** distincte et autorisée.