# SIII-09-V3 — SIII-09 → Secours réellement compatible

Score: 83.0 % (certificats 0/0, juge 83/100)

Certificats manqués: aucun

Toutes les exigences sont couvertes. Je rédige la réponse finale.

## Réponse

**Non. La seule présence de l'état WAITLISTED dans G-safe n'interdit pas la bascule.**

Ce qui interdit (ou autorise) la bascule n'est pas l'**existence** d'un état supplémentaire, mais la **compatibilité sémantique** entre ce que G-new écrit et ce que G-safe sait relire, ainsi que la **qualification préalable** de cette compatibilité. Dans la variante, ces deux conditions sont explicitement remplies :

- G-safe comprend WAITLISTED **avec des transitions exactes** ;
- sa **qualification indépendante est fournie avant activation**.

Donc la bascule est **sûre** : `bascule_sure = True`.

Résultat exact du test de compatibilité (compute) :

| Scénario | États mal interprétés | Compatible ? |
|---|---|---|
| Base (P07) : G-safe = {FREE, BOOKED} | `['WAITLISTED']` | **False** |
| Variante : G-safe = {FREE, BOOKED, WAITLISTED}, transitions exactes | `[]` | **True** |

Transitions G-new non couvertes par G-safe : **aucune**. États de G-new absents de G-safe : **aucun**.

## Preuves et certificats

**1. Modélisation machine à états.** G-new (principal) admet les transitions `FREE→BOOKED`, `BOOKED→FREE`, `FREE→WAITLISTED`, `WAITLISTED→BOOKED`, `WAITLISTED→FREE`. Dans la variante, G-safe implémente **exactement** le même ensemble de transitions. Le test `transitions_gnew − transitions_gsafe = ∅` est vide : aucune transition écrite par le principal n'est indéfinie pour le secours.

**2. Test d'interprétation exacte (R01).** R01 exige « une interprétation exacte des données, pas seulement un serveur qui répond 200 ». On teste, pour chaque état écrit par G-new, si le lecteur de secours restitue le **même** état :
- Base P07 : `gsafe(WAITLISTED) = FREE ≠ WAITLISTED` → écart, incompatible.
- Variante : `gsafe(e) = e` pour tout `e` → aucun écart, compatible.

**3. Le point décisif — qualification préalable.** La qualification indépendante fournie *avant* activation transforme la compatibilité d'une **conjecture** en **fait établi**. C'est exactement ce que R07 autorise : « faire évoluer et qualifier indépendamment la génération de secours avant de l'autoriser ». Sans cette qualification, la bascule reposerait sur une hypothèse non testée — précisément l'erreur de P07, où l'équipe revendiquait un succès sur la seule base de réponses 200 alors que l'état inconnu était silencieusement mappé FREE.

**4. Cohérence avec le dossier de base.** R07 précise que « la faute V est limitée à la génération principale identifiée, pas à tout logiciel imaginable ». G-safe étant une génération distincte, qualifiée et indépendante de V, elle reste opérante sous la faute V. La présence de WAITLISTED dans G-safe ne crée aucune dépendance nouvelle à V.

**5. Second calcul indépendant.** Deux scripts `compute` distincts (test d'interprétation, puis test de transitions) donnent le même verdict : compatibilité totale dans la variante. Aucun écart entre les deux méthodes.

## Pièges traités

- **Confondre présence et compatibilité.** Le piège central de la variante : croire qu'ajouter un état « complique » ou « interdit » la bascule. Faux : un état supplémentaire est **neutre** ; seul compte le fait qu'il soit interprété identiquement des deux côtés. C'est l'**incompatibilité** (interprétation divergente), non la **présence**, qui bloque.
- **Le « 200 OK » trompeur (P07).** Une bascule qui répond n'est pas une bascule correcte. Le critère est l'interprétation exacte (R01), pas la disponibilité apparente. La variante lève ce piège par les transitions exactes + qualification.
- **Qualification a posteriori.** Qualifier *après* activation ne protège pas : la fenêtre d'activation reste exposée. La variante impose la qualification *avant*, ce qui est la bonne borne.
- **Étendre la faute V à tout logiciel.** R07 borne V à la génération principale identifiée. G-safe qualifiée n'est pas dans le périmètre de V ; ne pas sur-généraliser la panne.
- **Inventer des garanties chiffrées.** Aucune probabilité ni valeur de disponibilité n'est fournie (R05) ; on ne conclut qu'en termes de **sûreté conditionnelle** (« sous panne unique de R05 »), jamais en taux de disponibilité chiffré.

## Limites / impossibilités

- **La sûreté est conditionnelle, pas absolue.** Elle vaut *sous réserve* que les transitions exactes et la qualification soient réellement celles annoncées. Le dossier les déclare fournies ; on ne peut pas, depuis ce seul dossier, **re-vérifier** le contenu de la qualification (pas de jeu de tests, pas de preuve formelle de raffinement fournis). La conclusion est donc : *si* la qualification est conforme, *alors* la bascule est sûre.
- **Aucune garantie chiffrée de disponibilité.** R05 ne fournit ni probabilités ni délais numériques ; on ne peut déduire ni MTTR, ni taux de disponibilité, ni RTO/RPO chiffrés.
- **Hors garantie.** Compromission cryptographique, deux pannes simultanées, panne de tous les capteurs de santé : hors du modèle (R05). La conclusion ne s'y étend pas.
- **Portée.** La réponse porte sur *cette* architecture et *cette* variante (nécessité locale), pas sur un optimum universel de compatibilité de versions.

**En une phrase :** la présence de WAITLISTED est neutre ; c'est l'interprétation exacte des transitions, garantie par une qualification indépendante *préalable*, qui rend la bascule sûre — et dans la variante ces conditions sont réunies, donc la bascule n'est pas interdite.