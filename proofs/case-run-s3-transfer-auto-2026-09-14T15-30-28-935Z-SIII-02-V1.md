# SIII-02-V1 — SIII-02 → Tous les caches sont supprimés

Score: 96.0 % (certificats 0/0, juge 96/100)

Certificats manqués: aucun

Toutes les exigences sont couvertes. Je rédige la réponse finale.

---

# Variante : supprimer les trois caches protégés suffit-il à rendre le mélange SOLEIL/LUNE impossible ?

## Réponse directe

**Non. Le mélange SOLEIL/LUNE reste possible.** La suppression des trois caches protégés (CDN `(chemin, langue)`, service worker `(chemin)`, cache mémoire `['dossier', dossier_id]`) ferme **une seule famille de frontières** — celle du *stockage partagé ou persistant* — mais laisse intactes **trois autres frontières** par lesquelles le mélange se produit réellement dans ce dossier : le **transport asynchrone**, le **rendu avant contrôle d'accès**, et la **mutation non sérialisée**. Comme la variante précise explicitement qu'on **ne change ni le réducteur `setDossier` de P01 ni la génération de vue**, elle conserve précisément la cause racine de P01.

Autrement dit : la variante est **nécessaire mais pas suffisante**. Elle élimine P03 et la collision de clé mémoire, mais **P01, P02, P04 et la désynchronisation d'onglets survivent inchangés**.

---

## 1. Ce que la suppression des caches élimine réellement

| Incident | Frontière empruntée | Éliminé par la variante ? |
|---|---|---|
| **P03 — Rejeu local** (service worker renvoie le JSON SOLEIL hors ligne à une session LUNE) | F2 stockage persistant SW | **OUI** |
| **Collision de clé mémoire** `['dossier', 17]` : `(SOLEIL,17)` et `(LUNE,17)` partagent la même clé car `dossier_id` n'est unique que par organisation (R01) | F3 cache mémoire frontend | **OUI** |
| **Partage CDN inter-organisation** : clé `(chemin, langue)` sans Cookie ni Vary (R03) | F1 cache CDN | **OUI** |

Ces trois gains sont réels : sans cache, il n'y a plus de **copie persistante** à rejouer, plus de **collision de clé** entre deux organisations, plus de **réponse partagée** entre principaux distincts. C'est un progrès net sur la classe « stockage ».

## 2. Ce qui survit — et pourquoi c'est décisif

| Incident | Frontière empruntée | Éliminé ? |
|---|---|---|
| **P01 — Réponse tardive** | F4 transport asynchrone (R05) | **NON** |
| **P02 — Fragment anticipé** | F5 rendu avant contrôle (R04) | **NON** |
| **P04 — Mutation tardive** | F4 + F6 mutation non sérialisée (R06) | **NON** |
| **Désynchronisation d'onglets** | F7 état de session par onglet (R05) | **NON** |

**P01 est le cas décisif.** Le chemin de données de P01 ne traverse **aucun cache** : la réponse SOLEIL (génération 8) et la réponse LUNE (génération 9) arrivent toutes deux directement dans `setDossier(response)`. L'ordre d'arrivée étant LUNE puis SOLEIL, l'état final devient SOLEIL — vérifié par calcul :

```
setDossier actuel (contexte LUNE) → {'dossier': {'org':'SOLEIL','id':17,'note':'privée'}}
```

La vue LUNE affiche donc un dossier SOLEIL. **Aucun cache n'est impliqué.** Supprimer les caches ne change strictement rien à ce scénario. La génération de vue (8, 9) existe mais `setDossier` ne la lit pas : elle est présente et **inutilisée**, donc sans effet protecteur.

**P02** est une fuite par le **corps HTTP** : R04 fait émettre le nom et la note privée *avant* le contrôle d'accès. Les octets sont divulgués dès l'émission, indépendamment de tout cache (R04 : « un octet émis est considéré divulgué »).

**P04** est une **mutation** : le backend a déjà reçu la modification SOLEIL ; l'annulation navigateur n'annule pas l'effet (R05). L'annonce « Mise à jour réussie » s'affiche dans LUNE — mélange d'affichage *et* mutation dans l'ancien contexte.

**Désynchronisation d'onglets** : R05 précise que les autres onglets ne reçoivent pas instantanément les changements de session ; un onglet peut rester en SOLEIL pendant qu'un autre est en LUNE.

## 3. Pourquoi la variante ne peut pas suffire par construction

Le mélange a **trois causes racines distinctes** :

1. **Stockage** (caches) → traitée par la variante. ✅
2. **Concurrence** (réponses/mutations en désordre, R05) → **non traitée** : il faut garder `setDossier` par `(contexte, génération)` et sérialiser les mutations.
3. **Rendu** (émission avant autorisation, R04) → **non traitée** : il faut contrôler l'accès *avant* d'émettre le premier octet.

La variante ne touche que la cause 1. Les causes 2 et 3 sont orthogonales au stockage : elles se produisent **en mémoire vive, dans le corps de la réponse, et dans l'ordre d'arrivée réseau**. Aucune suppression de cache ne les atteint.

## 4. Ce qu'il faudrait ajouter (indépendamment des caches)

- **Réducteur gardé** : `setDossier(response, ctx, gen)` n'écrit que si `response.org == ctx.org` **et** `gen == ctx.gen`. C'est le correctif minimal de P01, et la variante l'exclut explicitement.
- **Contrôle d'accès avant émission** (corrige R04) : ne jamais émettre le fragment privé avant la décision d'autorisation.
- **Sérialisation des mutations** (R06) : session serveur, protection anti-CSRF, validation atomique de la politique ; l'organisation ne doit pas venir d'un champ JSON ni `allowed=true` du frontend.
- **Synchronisation inter-onglets** : diffuser le changement de contexte (BroadcastChannel / storage event) pour éviter qu'un onglet reste en SOLEIL.
- **Séparation d'affichage** (R07) : présenter distinctement « opération exécutée dans l'ancien contexte » et « état affiché dans le contexte actuel ».

## 5. Preuve d'impossibilité pour P06 et garantie honnête

**P06 est logiquement impossible**, pour deux raisons indépendantes :
- **(a) Physique** : R08 exclut tout canal vers un appareil isolé. Une révocation ne peut donc pas « supprimer immédiatement toute copie sur tout appareil hors ligne » — aucun message ne peut l'atteindre.
- **(b) Contradiction interne** : « supprimer toute copie » et « sans perdre une seule mise à jour légitime » sont incompatibles. Les mutations optimistes en attente *sont* des copies locales ; les supprimer, c'est perdre des mises à jour légitimes.

**Garantie honnête** : « Une révocation empêche toute **nouvelle** lecture ou mutation dont le point de décision est postérieur à la révocation (R02). Les octets déjà délivrés avant la révocation peuvent subsister sur des appareils non joignables et sont réputés compromis (R08). Les mises à jour légitimes en attente sont préservées et rejouées sous le nouveau contexte, ou explicitement signalées comme non appliquées. »

**Propriété de non-divulgation (R08)** : pour tout principal non autorisé sur `(O', d)`, la réponse observable (code, corps, message) est **indistinguable** de celle d'un dossier inexistant — pas d'oracle d'existence. Preuve : contrôle d'accès **avant** émission (corrige R04) + message d'échec constant pour « interdit » et « inexistant ».

## 6. Test adversarial discriminant

Un test qui **passe avec K-b** (clé `organisation + dossier`) mais **échoue avec des permissions individuelles différentes** : deux principaux de la **même** organisation LUNE, même rôle nommé AGENT, mais permissions différentes sur le dossier 17 (R01 : « le même rôle nommé AGENT peut correspondre à des permissions différentes »). Une clé `(organisation, dossier)` les confond et sert à l'un la réponse de l'autre → **fuite intra-organisation**. Oracle : la réponse servie au principal non autorisé doit être identique à celle d'un dossier inexistant (propriété §5). Ce test échoue avec K-b, passe avec K-d (contexte d'autorisation complet + révision + langue + version).

---

## Conclusion

**Le mélange SOLEIL/LUNE n'est pas impossible dans la variante.** Supprimer les trois caches protégés élimine la frontière du *stockage* (P03, collision de clé, partage CDN) mais laisse ouvertes les frontières du *transport asynchrone* (P01, P04), du *rendu avant contrôle* (P02) et de la *désynchronisation d'onglets*. Comme la variante conserve le réducteur `setDossier` non gardé et la génération de vue inutilisée, **la cause racine de P01 demeure intacte** : une réponse SOLEIL tardive écrase encore une vue LUNE, sans qu'aucun cache n'intervienne. La suppression des caches est une condition **nécessaire** de l'isolation, jamais **suffisante**.