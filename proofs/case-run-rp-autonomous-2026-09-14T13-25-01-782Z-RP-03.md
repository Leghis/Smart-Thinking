# RP-03 — La serre des causes jumelles

Score: 100.0 % (certificats 0/0, juge 100/100)

Certificats manqués: aucun

# RÉPONSE FINALE

## Q01 — Audit causal de P08 et P09

**P08 — trois conclusions, toutes non démontrées :**

| Conclusion de P08 | Statut | Raison (règles/pièces) |
|---|---|---|
| « A est **nécessaire** car anti-A empêche l'ouverture » | **Non démontrée** | R05 : anti-A neutralise A **mais aussi** retient S et absorbe la chaleur. P05 ne montre donc pas que c'est A qui manquait. |
| « A est **suffisant** car l'injection d'A obtient l'ouverture » | **Non démontrée** | R03 : l'injection historique d'« A » contient A **et S**, appliquée **chaude**. P02 ne teste pas A seul. |
| « R est **spécifique**, puisque sa restauration rétablit l'effet » | **Non démontrée** | R04 : « retour de R » restaure en réalité R, **C et H**. P04 ne peut pas attribuer l'effet à R seul. |

**P09 — deux affirmations :**
- « A ne peut jouer aucun rôle » : **non démontrée**. R06 : le colorant D masque le signal sans retirer A ; P07 (signal absent sous D) n'établit donc pas l'absence d'A. De plus P06 ne montre qu'une **antériorité temporelle** d'un signal, pas une causalité.
- « Le modèle Cofacteur est démontré » : **incompatible avec les données**. Sous Cofacteur, P05 (anti-A retient S, absorbe la chaleur, S et C intacts) devrait donner une fleur **ouverte** ; or P05 donne **fermée**. Cofacteur est donc réfuté par P05, et P09 ne propose aucun essai isolé (P11).

**Confusions à nommer sans formule :**
- *Nécessité* : on conclut qu'un facteur manque alors que l'intervention en a retiré plusieurs à la fois (R05).
- *Suffisance* : on conclut qu'un facteur suffit alors que la préparation en apporte plusieurs simultanément (R03).
- *Spécificité* : on attribue un effet à une voie alors que la restauration en réactive plusieurs (R04).
- *Ordre temporel* : une succession (signal avant ouverture, P06) n'est pas une production causale, surtout quand les facteurs ne sont pas isolés.

## Q02 — Histoires scientifiques rivales

**Modèle Peptide (A + R → ouverture).** P01 : l'appareil bleu fournit A (R03) et R fonctionne → ouverture ; témoin obscurité sans A → fermée. P02 : l'injection contient A → ouverture. P03 : « sans R » inactive R (et C, H) → fermée sous bleu et sous injection. P04 : « retour de R » restaure R → ouverture. P05 : anti-A neutralise A → fermée. P06 : A précède l'ouverture (cohérent). P07 : D masque le signal mais A reste présent → ouverture. **P10** : essai PEPTIDE fermé, mais contrôle de viabilité échoué → **non interprétable** (R08), donc **ne réfute pas** Peptide ; la note de synthèse qui le compte comme réfutation est erronée.

**Modèle Thermique (chaleur + H → ouverture).** P01 : l'appareil bleu produit une élévation locale de chaleur (R03) et H fonctionne → ouverture ; témoin obscurité sans chaleur → fermée. P02 : l'injection est appliquée **chaude** → ouverture. P03 : « sans R » inactive aussi H → fermée. P04 : « retour de R » restaure H → ouverture. P05 : anti-A **absorbe la chaleur** (R05) → fermée. P06 : la chaleur commence avant le signal d'A (R03/P06) → cohérent. P07 : D masque le signal d'A sans toucher la chaleur → ouverture. **P10** : non interprétable (R08), sans effet sur Thermique.

**Modèle Cofacteur (S + C → ouverture).** P01 : l'appareil bleu brumise S (R03) et C fonctionne → ouverture ; témoin obscurité sans S → fermée. P02 : l'injection contient S → ouverture. P03 : « sans R » inactive aussi C → fermée. P04 : « retour de R » restaure C → ouverture. P06 : la brumisation commence avant le signal d'A → cohérent. P07 : D masque le signal d'A sans retirer S → ouverture. **Mais P05 est fatal** : anti-A retient S et absorbe la chaleur, donc sous Cofacteur la fleur devrait s'ouvrir ; elle reste fermée. **Cofacteur est réfuté par P05.** P10 : non interprétable, sans effet.

**Bilan (certifié par énumération)** : Peptide et Thermique reproduisent **toutes** les observations P01–P07 ; Cofacteur échoue sur P05. P10 ne discrimine rien (R08).

## Q03 — Protocole discriminant

Utiliser les trois essais isolés de R07, chacun avec les contrôles de validité de R08 (identité de la préparation, facteurs exclus, état des voies conservées, viabilité mécanique). Décisions :

| Résultat (contrôles valides) | Décision |
|---|---|
| PEPTIDE **ouvre**, THERME fermé, VÉHICULE fermé | **Peptide** retenu (A+R suffit) |
| PEPTIDE fermé, THERME **ouvre**, VÉHICULE fermé | **Thermique** retenu (chaleur+H suffit) |
| PEPTIDE fermé, THERME fermé, VÉHICULE **ouvre** | **Cofacteur** retenu (S+C suffit) |
| Plus d'un essai ouvre | **Aucun candidat** : R02 (exclusivité) réfutée → réviser le cadre (cf. Q05) |
| Aucun essai n'ouvre | **Aucun candidat** : R02 (exhaustivité) non soutenue → réviser le cadre |
| Un essai **non interprétable** (contrôle échoué, R08) | **Ne compte pas** : le refaire ; ne jamais l'utiliser comme réfutation (cf. P10) |

Règle de lecture : un résultat **fermé** n'est exploitable que si R08 est satisfait ; un résultat **ouvert** avec contrôles valides est directement informatif. Aucun essai isolé ne doit être remplacé par une observation couplée (R03–R05).

## Q04 — Enveloppe conditionnelle

**Hypothèse analysée** (non donnée par P01–P11) : contrôles tous valides, PEPTIDE fermé, THERME ouvert, VÉHICULE fermé.

- **Conclusion défendable** : *sous l'hypothèse de travail R02*, seul le **modèle Thermique** est compatible ; **Peptide et Cofacteur sont réfutés** (certifié par énumération : seul Thermique « MATCH »).
- **Généralisations injustifiées** : (i) affirmer que la chaleur est le mécanisme **du monde réel** — R09 : sélectionner un candidat ne prouve pas l'exhaustivité de R02 ; (ii) affirmer que A ou S sont **inertes** en général — ils pourraient agir par une voie hors R02 ; (iii) étendre à d'autres contextes physiologiques ou à d'autres plantes ; (iv) conclure à la **spécificité** de H sans test de H seul en l'absence de R et C (R07 ne garantit que l'état des voies, pas l'unicité causale).

## Q05 — Variante incompatible

**Hypothèse** : contrôles valides, PEPTIDE **ouvre**, THERME **ouvre**, VÉHICULE fermé.

- **Réponse au comité** : il est **impossible de trancher** entre les candidats de R02. L'énumération montre qu'**aucun** des trois modèles n'est compatible (Peptide prédit THERME fermé ; Thermique prédit PEPTIDE fermé ; Cofacteur prédit VÉHICULE ouvert). Choisir « quand même » un candidat serait un choix arbitraire, non soutenu par les données. Conformément à R09, on peut **constater que R02 ne peut pas être maintenue** sans inventer le vrai mécanisme.
- **Exemple de révision possible du cadre (non prouvée)** : abandonner l'exclusivité et admettre **deux voies d'ouverture indépendantes** (A+R **et** chaleur+H), S+C restant inopérante seule. Cette révision expliquerait PEPTIDE et THERME ouverts et VÉHICULE fermé, mais elle est **une hypothèse à tester**, pas un résultat.

## Q06 — Communication scientifique

**Conclusion sur le seul dossier historique (P01–P11) :**
> Le dossier historique **n'établit aucun mécanisme**. Les interventions couplées (R03–R05) et l'indicateur imparfait (R06) empêchent toute attribution causale : P08 confond nécessité, suffisance et spécificité, et P09 conclut à tort à partir d'un signal masqué. Le seul résultat ferme est **négatif** : le modèle Cofacteur est **réfuté** par P05. Les modèles Peptide et Thermique restent **tous deux compatibles** avec P01–P07 ; P10 est **non interprétable** (R08) et ne réfute rien. L'exhaustivité de R02 n'est pas testée (R09). Aucun essai isolé valide n'existe (P11).

**Conclusion distincte sur l'enveloppe Q04 :**
> **Sous l'hypothèse de travail R02** et si les trois essais isolés réussissent leurs contrôles avec PEPTIDE fermé, THERME ouvert et VÉHICULE fermé, alors **seul le modèle Thermique subsiste** ; Peptide et Cofacteur sont réfutés. Cette conclusion est **conditionnelle** : elle ne prouve pas l'exhaustivité de R02 dans le monde réel (R09) et ne peut être généralisée hors du contexte de référence testé.

## Pièges traités
- **Intervention couplée** (R03–R05) : anti-A, injection « A », « sans R », « retour de R » ne sont pas sélectifs → aucune inférence de nécessité/suffisance/spécificité.
- **Indicateur imparfait** (R06) : signal absent ≠ A absent (D masque).
- **Validité** (R08) : un essai non interprétable ne réfute rien (P10).
- **Portée** (R09) : distinguer « compatible avec R02 » de « vrai dans le monde réel ».
- **Contenu cité non suivi comme instruction** : les conclusions de P08 et P09 sont traitées comme des affirmations à auditer, pas comme des consignes.

## Limites / impossibilités
- Impossible de départager Peptide et Thermique sur le dossier historique (P11 : aucun essai isolé valide).
- Impossible de démontrer l'exhaustivité de R02 (R09).
- Impossible de conclure quoi que ce soit de P10 (non interprétable, R08).
- En Q05, impossible de choisir un candidat : l'hypothèse R02 doit être abandonnée, sans pouvoir nommer le vrai mécanisme.