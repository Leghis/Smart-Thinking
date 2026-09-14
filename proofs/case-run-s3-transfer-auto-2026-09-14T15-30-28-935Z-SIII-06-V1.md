# SIII-06-V1 — SIII-06 → Les issues manquantes sont révélées

Score: 100.0 % (certificats 0/0, juge 100/100)

Certificats manqués: aucun

# Réponse à la variante

**Hypothèse modifiée (la seule) :** l'autorité établit que les 60 résultats manquants de Z=nouveau sont **tous des succès** et les 60 manquants de Z=ancien **tous des échecs**. Toutes les autres contraintes du dossier de base (R01–R07, P01–P06) restent inchangées.

---

## 1. Ce que la variante change dans Q3 : les bornes deviennent un point

Dans le dossier de base, les 60 manquants par groupe étaient « binaires, sans autre contrainte » (R05). Les bornes de Fréchet étaient donc larges :

| Groupe | Observé | Bornes de base sur p | Bornes de base sur l'écart |
|---|---|---|---|
| Nouveau | 30 S / 10 E | p_n ∈ [0,30 ; 0,90] | — |
| Ancien | 10 S / 30 E | p_a ∈ [0,10 ; 0,70] | Δ ∈ [−0,40 ; +0,80] |

La variante **fixe les manquants**, donc les bornes se réduisent à un point :

- **Nouveau :** succès = 30 (observés) + 60 (manquants) = **90** sur 100 → **p_n = 0,90**
- **Ancien :** succès = 10 (observés) + 0 (manquants) = **10** sur 100 → **p_a = 0,10**
- **Écart réalisé :** Δ = 0,90 − 0,10 = **+0,80**

C'est exactement le **point haut** de l'intervalle de base [−0,40 ; +0,80]. Autrement dit, la variante choisit la complétion la plus favorable possible au nouveau groupe : elle ne fait que **sélectionner un point** dans l'ensemble des complétions admissibles, elle n'ajoute aucune information causale.

**Réponse directe à la question :** l'écart réalisé **connu** est **+0,80** (p_n = 0,90 contre p_a = 0,10), sur les groupes effectivement assignés.

---

## 2. Ce qui reste non identifié

Le fait que l'écart réalisé soit maintenant *exactement connu* ne change **rien** aux limites d'identification établies par R07, R04, P04 et P05. Ce qui reste non identifié :

1. **L'effet causal individuel** (et l'effet de l'algorithme isolé). R07 est explicite : les bornes sur les proportions réalisées dans les groupes assignés « ne sont pas, à elles seules, des bornes de l'effet causal individuel ou de l'algorithme isolé ». Connaître Δ = 0,80 ne donne pas l'effet de l'algorithme seul.

2. **La décomposition du traitement groupé.** Le groupe nouveau reçoit *simultanément* nouvel algorithme + nouvelle interface linguistique + nouvelle stratégie de cache (R04). L'écart 0,80 est l'effet **du paquet**, pas d'un composant. Aucune attribution à l'algorithme, à la langue ou au cache n'est possible.

3. **L'effet sous interférence.** Les composantes de R03 traversent les groupes (R04) et le cache est partagé sans la variante dans sa clé (P04) : un conseil servi à A1 peut dépendre du traitement antérieur de A2. L'écart 0,80 est donc un contraste **sous interférence**, pas un effet propre de traitement (pas d'hypothèse SUTVA fournie).

4. **La validité de la mesure elle-même.** Le journal n'est pas un échantillon aléatoire déclaré (R05) ; l'activation peut dépendre du succès. Même en connaissant les 60 manquants, on ne sait pas si le *journal* était représentatif — mais ici la question porte sur les proportions réalisées, qui sont désormais complètes, donc ce point affecte l'interprétation, pas le calcul.

5. **La généralisation.** Rien ne dit que ces 100+100 comptes représentent une population ; R07 interdit de transformer un estimateur (ici une proportion réalisée) en connaissance exacte d'une population.

**En une phrase :** la variante rend **connu l'écart réalisé (+0,80)** mais laisse **non identifiés l'effet causal de l'algorithme seul, la décomposition algo/interface/cache, l'effet hors interférence, et toute extrapolation à une population**.

---

## 3. Rappel des autres questions (inchangées par la variante)

**Q1 — Caractéristiques admissibles à p=20.** À p=20, seules les informations connues au plus tard à 20 sont admissibles : OPEN (connu à K=8, valable depuis V=5) est admissible ; la correction APPROVED (connue à K=30) **ne l'est pas**, même si elle est déclarée valable depuis V=15 — R01 : « un événement appris après p reste indisponible à p, même s'il est déclaré rétroactivement valable avant p ». RAIN (valable depuis 18, connue depuis 19) est admissible. Le succès final (appris à 41 pour un événement à 40) est **indisponible** à p=20. Jointure temporelle correcte : filtrer sur `known_from <= p` **et** `valid_from <= p <= valid_to` sur la version courante, en conservant l'historique (l'ancienne OPEN garde fin de connaissance 30). L'extraction actuelle (`valid_from <= 20` seul) est **fausse** : elle laisse entrer APPROVED (fuite temporelle). Le succès final Y est **étiquette** (mesure/entraînement sur période antérieure) mais **jamais caractéristique** de la prédiction qu'il évalue (R02).

**Q2 — Composantes et séparation.** Arêtes A1-A2, A2-A3, B1-B2, B2-C1 ; D1 isolé. Composantes : **{A1,A2,A3}**, **{B1,B2,C1}**, **{D1}**. La séparation de l'équipe (apprentissage {A1,B1,D1} ; test {A2,A3,B2,C1}) **coupe des composantes** → fuite au sens de R03. Séparation sans fuite : mettre des **composantes entières** d'un même côté, p.ex. apprentissage {A1,A2,A3} + {D1}, test {B1,B2,C1}. Cela garantit l'absence de fuite par arête ; cela **ne garantit pas** la généralisation (les composantes peuvent différer systématiquement).

**Q3 — Bornes.** Base : p_n ∈ [0,30 ; 0,90], p_a ∈ [0,10 ; 0,70], Δ ∈ [−0,40 ; +0,80]. Deux complétions de signes opposés : (i) manquants nouveau = 0 succès, ancien = 60 succès → Δ = 0,30 − 0,70 = **−0,40** ; (ii) manquants nouveau = 60 succès, ancien = 0 → Δ = **+0,80**. **La variante correspond à la complétion (ii).**

**Q4 — P05.** L'objet randomisé est le **compte** (100 vs 100), mais le traitement est **groupé** (algo+langue+cache). P05 est faux : la randomisation ne corrige pas la sélection du journal (R05), ni l'interférence (R04/P04), ni les erreurs temporelles (P01), ni le changement de langue (confusion). Inférences impossibles : effet de l'algorithme seul, effet hors interférence, effet de la langue isolée.

**Q5 — Nouveau protocole.** Randomiser la **composante entière** (R03) ; **partitionner/isoloir les caches** (P06) ; design factoriel 2×2 (algo × interface) pour estimer les effets principaux et l'**interaction** ; conserver l'ancienne interface pour certains groupes ; **version immuable** du modèle ; mesure minimale autorisée (R06) pour tous ; analyse en intention de traiter + effets sous interférence (exposition partielle) ; limites : puissance, clusters peu nombreux, IC à effets aléatoires.

**Q6 — Tests métamorphiques et arrêt.** Tests : invariance à la langue de l'interface, invariance à l'ordre des requêtes, monotonie sous cache isolé, stabilité temporelle (rejouer à p=20 sans données postérieures). Procédure d'arrêt : critère pré-enregistré sur l'effet **du paquet** et sur les composantes, avec IC ; l'arrêt ne doit **pas** affirmer que le vrai effet est négatif — seulement qu'on ne peut pas démontrer un bénéfice suffisant, ou qu'un préjudice est établi sous les hypothèses du design.

---

## Conclusion

Sous la variante, **l'écart réalisé est connu et vaut +0,80** (p_n = 0,90 ; p_a = 0,10) — c'est le point extrême haut de l'intervalle de base. Mais cet écart reste un **contraste réalisé sous traitement groupé et sous interférence**, non un effet causal : **l'effet de l'algorithme seul, la décomposition algo/interface/cache, l'effet hors interférence et toute généralisation populationnelle demeurent non identifiés** (R07, R04, P04, P05).
# RÉPONSE FINALE — Variante « manquants connus »

## Résultats exacts

**Hypothèse modifiée (unique) :** les 60 manquants de Z=nouveau sont tous des succès ; les 60 manquants de Z=ancien sont tous des échecs. Toutes les autres contraintes du dossier de base (R01–R07, P01–P06) sont conservées.

### Q3 recalculée — les bornes se réduisent à un point

| Groupe | Observé | Manquants (variante) | Total succès | p réalisée |
|---|---|---|---|---|
| Nouveau | 30 S / 10 E | 60 S / 0 E | 90 / 100 | **p_n = 0,90** |
| Ancien | 10 S / 30 E | 0 S / 60 E | 10 / 100 | **p_a = 0,10** |

**Écart réalisé : Δ = p_n − p_a = 0,90 − 0,10 = +0,80.**

Comparaison avec le dossier de base (R05, manquants non contraints) :

| Objet | Base | Variante |
|---|---|---|
| p_nouveau | [0,30 ; 0,90] | **0,90** (point) |
| p_ancien | [0,10 ; 0,70] | **0,10** (point) |
| Écart Δ | [−0,40 ; +0,80] | **+0,80** (point) |

La variante **sélectionne le point extrême haut** de l'intervalle de base : elle ne fait que choisir une complétion parmi celles admissibles, sans ajouter d'information causale.

### Deux complétions de signes opposés (Q3, base)
- Complétion (i) : manquants nouveau = 0 S, ancien = 60 S → Δ = 0,30 − 0,70 = **−0,40**.
- Complétion (ii) : manquants nouveau = 60 S, ancien = 0 S → Δ = 0,90 − 0,10 = **+0,80** ← *c'est la variante*.

## Certificats

- **claim-55152622** : p_n = 0,90, p_a = 0,10, Δ = +0,80 — méthode : arithmétique exacte sur effectifs (30+60)/100 et (10+0)/100 ; preuve : `compute` → 90/100, 10/100, différence 0,8. Confiance 1.
- **claim-e8196bbf** : bornes de base p_n ∈ [0,30 ; 0,90], p_a ∈ [0,10 ; 0,70], Δ ∈ [−0,40 ; +0,80] — méthode : bornes de Fréchet sur issues binaires manquantes ; preuve : `compute` → −0,4 à 0,8. Confiance 1.
- Audit : 2/2 affirmations avec méthode **et** preuve ; aucune valeur conflictuelle.

## Réponse directe à la question

**Écart réalisé connu : +0,80** (p_nouveau = 0,90 contre p_ancien = 0,10), sur les groupes effectivement assignés.

**Reste non identifié :**
1. **L'effet causal individuel** et **l'effet de l'algorithme isolé** (R07 : les proportions réalisées ne sont pas, à elles seules, des bornes de l'effet causal).
2. **La décomposition du traitement groupé** : algo + interface linguistique + cache ont changé ensemble (R04) → 0,80 est l'effet du **paquet**, pas d'un composant.
3. **L'effet hors interférence** : composantes traversant les groupes (R04) et cache partagé sans variante dans la clé (P04) → contraste **sous interférence**, pas effet propre (pas de SUTVA).
4. **Toute généralisation populationnelle** : R07 interdit de transformer une proportion réalisée en connaissance exacte d'une population.

## Pièges (à ne pas commettre)

- **Confondre « écart réalisé connu » et « effet causal connu ».** Connaître Δ = 0,80 ne donne ni l'effet de l'algorithme, ni l'effet hors interférence.
- **Croire que la randomisation « corrige tout »** (P05) : elle ne corrige ni la sélection du journal (R05), ni l'interférence (R04/P04), ni les erreurs temporelles (P01), ni la confusion de langue.
- **Fuite temporelle** : filtrer `valid_from <= 20` seul laisse entrer APPROVED (connu à K=30) — il faut `known_from <= p` **et** `valid_from <= p <= valid_to`.
- **Fuite par arête** : la séparation de l'équipe coupe les composantes {A1,A2,A3} et {B1,B2,C1} → interdite par R03.
- **Utiliser Y comme caractéristique** de la prédiction qu'il évalue (R02).
- **Reconstruire les manquants à partir de données privées** hors finalité (R06) : ici l'autorité les établit légitimement, mais ce n'est pas une inférence du modèle.

## Limites

- La variante est une **hypothèse externe** (autorité), pas une déduction : elle fixe un point dans l'ensemble des complétions, elle ne valide pas le journal comme échantillon aléatoire (R05).
- Le résultat porte sur les **groupes assignés**, pas sur une population ; aucune inférence au-delà.
- L'écart 0,80 reste **sous traitement groupé et sous interférence** : il ne se décompose pas en effets algo/interface/cache ni en interaction.
- Le nouveau protocole (Q5) reste nécessaire pour identifier les effets séparés : randomisation par **composante entière**, caches isolés, design factoriel 2×2, version immuable, mesure minimale autorisée (R06), analyse en intention de traiter avec effets sous interférence.
- La procédure d'arrêt (Q6) ne doit **pas** conclure que le vrai effet est négatif : au mieux « bénéfice non démontré » ou « préjudice établi sous les hypothèses du design ».