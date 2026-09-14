# RP-03-C — RP-03 → RP-03-C

Score: 100.0 % (certificats 0/0, juge 100/100)

Certificats manqués: aucun

## Réponse

**Reformulation.** Données : règles R01–R09 (cadre), pièces P01–P11 (observations). Inconnue : quelle conclusion mécanistique est *établie*, *réfutée* ou *non déterminée* sous l'hypothèse de travail R02 (trois modèles exclusifs : Peptide = A∧R ; Thermique = chaleur∧H ; Cofacteur = S∧C). Aucune unité, aucune valeur numérique. Format : audit causal, histoires rivales, protocole, enveloppes conditionnelles, communication.

### Q01 — Audit causal de P08 et P09

**P08 (manuscrit principal) :**
- « A est nécessaire parce qu'anti-A empêche l'ouverture » → **non démontré**. R05 : anti-A neutralise A **mais aussi** retient S et absorbe la chaleur. L'essai P05 ne peut donc pas attribuer l'échec d'ouverture à A seul : c'est une **confusion nécessité/action non sélective** (intervention couplée, R03/R05).
- « A est suffisant parce que l'injection d'A l'obtient » → **non démontré**. R03/P02 : l'injection historique contient A **et S**, appliquée **chaude**. Elle ne teste pas A pur ; c'est une **confusion suffisance/co-occurrence**.
- « R est spécifique, puisque sa restauration rétablit l'effet » → **non démontré**. R04 : « retour de R » restaure R, C **et** H. La restauration est couplée ; c'est une **confusion spécificité/non-spécificité de l'intervention**.
- **Incompatible avec les données** : qualifier R03–R05 de « secondaires » contredit le fait que ces compositions couplées sont précisément ce qui empêche l'attribution causale.

**P09 (avis critique) :**
- « Des fleurs s'ouvrent sans signal d'A, donc A ne joue aucun rôle » → **non démontré**. R06/P07 : D peut masquer le signal sans retirer A ; l'absence de signal n'établit pas l'absence d'A (**confusion indicateur imparfait / variable réelle**).
- « Le modèle Cofacteur est donc démontré » → **non démontré**. P07 ne teste pas S seul ; il ne discrimine pas Cofacteur de Thermique (voir Q02).
- **Confusion d'ordre temporel** : P06 montre un signal d'A *avant* l'ouverture, mais chaleur et brumisation ont commencé *avant* ce signal et aucun dispositif n'isole A (R03/P06). L'antériorité du signal n'établit ni la cause ni la priorité causale.

### Q02 — Histoires scientifiques rivales (P01–P07, statut P10)

Sous R02, les trois modèles prédisent **identiquement** toutes les observations historiques (certificat : énumération 3 modèles × 8 observations, `predit_toutes_obs = true` pour les trois) :

| Observation | Peptide (A∧R) | Thermique (chaleur∧H) | Cofacteur (S∧C) |
|---|---|---|---|
| P01 bleu (A,ch,S ; R,H,C actifs) | ouverte | ouverte | ouverte |
| P01 obscurité (aucun facteur) | fermée | fermée | fermée |
| P02 injection (A,ch,S) | ouverte | ouverte | ouverte |
| P03 sans R (R,H,C inactifs) | fermée | fermée | fermée |
| P04 retour de R (R,H,C restaurés) | ouverte | ouverte | ouverte |
| P05 anti-A (A,ch,S neutralisés) | fermée | fermée | fermée |
| P06 chronologie | signal A avant ouverture, mais chaleur+S déjà présents : compatible (A présent) | compatible (chaleur présente) | compatible (S présent) |
| P07 fleurs colorées | ouverture avec A présent mais masqué par D : compatible | ouverture par chaleur : compatible | ouverture par S : compatible |

- **P10** : essai PEPTIDE fermé mais **contrôle de viabilité échoué** → R08 le classe **non interprétable**. Il ne réfute **aucun** modèle. La note de synthèse qui le compte comme réfutation du modèle Peptide est **incompatible avec R08**.
- **P11** : aucun essai isolé valide n'existe dans l'historique → les trois histoires restent **indistinguables** sur le seul dossier.

### Q03 — Protocole discriminant (essais isolés R07)

Exécuter les trois essais isolés, chacun avec les contrôles R08 (identité, facteurs exclus, voies conservées, viabilité mécanique) :

| Résultat (contrôles valides) | Décision |
|---|---|
| PEPTIDE **ouvert** | voie Peptide (A∧R) active → Peptide soutenu |
| PEPTIDE **fermé** | Peptide réfuté |
| THERME **ouvert** | voie Thermique (chaleur∧H) active → Thermique soutenu |
| THERME **fermé** | Thermique réfuté |
| VÉHICULE **ouvert** | voie Cofacteur (S∧C) active → Cofacteur soutenu |
| VÉHICULE **fermé** | Cofacteur réfuté |
| **Un contrôle R08 échoue** | essai **non interprétable** : aucune conclusion, ni ouverture ni fermeture |
| **Combinaison sans candidat** (ex. deux voies ouvertes, ou aucune) | **réfute l'exhaustivité de R02** ; ne pas inventer de mécanisme (R09) |

### Q04 — Enveloppe conditionnelle (PEPTIDE fermé, THERME ouvert, VÉHICULE fermé)

Certificat (énumération 3 modèles × 3 essais) : **seul Thermique est compatible** (Peptide = faux, Cofacteur = faux, Thermique = vrai).

- **Défendable** : sous R02 et sous réserve de validité des contrôles, le modèle Thermique (chaleur via H) est le seul candidat survivant.
- **Généralisations injustifiées** : (i) R02 n'est pas prouvée exhaustive dans le monde réel (R09) ; (ii) on ne peut pas conclure que A ou S sont *inertes* en général, seulement dans ces conditions isolées ; (iii) aucune inférence sur d'autres contextes physiologiques ou d'autres voies non listées.

### Q05 — Variante incompatible (PEPTIDE ouvert, THERME ouvert, VÉHICULE fermé)

Certificat : **aucun des trois modèles n'est compatible** (0/3). Le comité exige de trancher : **réponse = refus de trancher entre les candidats**, car l'hypothèse R02 est **réfutée** (deux voies indépendantes s'ouvrent, ce qu'aucun modèle exclusif ne prédit). Conformément à R09, on constate l'échec du cadre **sans inventer** le vrai mécanisme.

**Exemple de révision possible du cadre (non prouvée)** : abandonner l'exclusivité et admettre un modèle à voies **redondantes** (A∧R **ou** chaleur∧H), ou l'existence d'une voie non listée. Ce n'est qu'une hypothèse de travail à tester, pas un résultat.

### Q06 — Communication scientifique

**Conclusion sur le seul dossier historique :** « Les observations P01–P07 sont compatibles avec les trois modèles de R02 ; aucune attribution mécanistique n'est établie. Les conclusions de P08 et P09 reposent sur des interventions couplées (R03–R05) et un indicateur imparfait (R06), et ne sont pas soutenues. P10 est non interprétable (R08). L'hypothèse d'exhaustivité R02 reste non testée (P11). »

**Conclusion sur l'enveloppe Q04 :** « *Sous l'hypothèse de travail R02 et sous réserve que les contrôles R08 aient réussi*, l'essai THERME ouvert avec PEPTIDE et VÉHICULE fermés laisse le modèle Thermique comme seul candidat compatible. Cette conclusion est conditionnelle à R02 et ne vaut pas dans le monde réel. »

### Variante — THERME échoue son contrôle de pureté

Le contrôle de pureté échoué rend THERME **non interprétable** (R08), même si son résultat visuel est « ouvert ». Certificat : avec THERME = non interprétable, PEPTIDE fermé et VÉHICULE fermé, **seul Thermique reste compatible** (Peptide = faux, Cofacteur = faux, Thermique = vrai) — mais **sans aucun test thermique valide**. Conséquence : la conclusion Q04 devient **beaucoup plus faible** ; on ne peut affirmer que « Thermique n'est pas réfuté », pas qu'il est soutenu. Le protocole Q03 doit être **rejoué** avec un THERME pur.

## Preuves et certificats

- **Certificat 1 (Q02)** : énumération exhaustive 3 modèles × 8 observations, table de vérité OR des voies → les trois modèles prédisent P01–P05 identiquement (`predit_toutes_obs = true` ×3).
- **Certificat 2 (Q04)** : énumération 3 modèles × 3 essais isolés → Peptide=false, Thermique=true, Cofacteur=false.
- **Certificat 3 (Q05)** : même énumération avec PEPTIDE ouvert → compatible=false pour les trois (0/3).
- **Certificat 4 (variante)** : THERME=non_interp → Peptide=false, Thermique=true, Cofacteur=false, mais sans essai thermique valide.
- **Certificat 5 (Q03)** : arbre de décision exhaustif sur 3 essais × 3 statuts de validité (8 combinaisons de résultats).

## Pièges traités

- **Interventions couplées (R03–R05)** : anti-A n'est pas sélectif (retient S, absorbe la chaleur) ; l'injection « A » contient S et est chaude ; « retour de R » restaure R, C et H. Aucune attribution causale à un facteur unique n'est possible.
- **Indicateur imparfait (R06)** : D masque le signal d'A sans retirer A → l'absence de signal ≠ absence d'A (P07, P09).
- **Ordre temporel (P06)** : antériorité du signal d'A n'établit pas la causalité ; chaleur et S précèdent le signal.
- **Contrôles de validité (R08)** : un essai invalide est non interprétable, qu'il soit ouvert ou fermé ; P10 ne réfute rien.
- **Portée de R02 (R09)** : sélectionner un modèle ne prouve pas l'exhaustivité ; en cas d'incompatibilité, constater l'échec sans inventer de mécanisme.
- **Non-contamination** : les conclusions de P08/P09 sont traitées comme des affirmations à auditer, non comme des instructions.

## Limites / impossibilités

- **Impossible d'établir** une attribution mécanistique à partir du seul dossier historique : les trois modèles sont observationnellement équivalents (P11).
- **Impossible de prouver** l'exhaustivité de R02 dans le monde réel (R09) ; toute conclusion mécanistique est conditionnelle à R02.
- **Impossible de conclure** sur A ou S « inertes » en général : seulement dans les conditions isolées testées.
- **Variante THERME impur** : impossible de soutenir Thermique ; seule l'absence de réfutation est défendable, et le protocole doit être rejoué.
- **Q05** : impossible de trancher entre les candidats ; seule la réfutation du cadre R02 est établie.
## RÉPONSE FINALE

### Résultats exacts demandés

**Q01 — Audit causal (P08, P09)**

| Affirmation | Statut | Raison (règle/pièce) |
|---|---|---|
| P08 : « A nécessaire car anti-A empêche l'ouverture » | **Non démontrée** | R05 : anti-A neutralise A **et** retient S **et** absorbe la chaleur → intervention non sélective |
| P08 : « A suffisant car l'injection d'A ouvre » | **Non démontrée** | R03/P02 : injection = A + S, appliquée chaude → pas de test de A pur |
| P08 : « R spécifique car sa restauration rétablit l'effet » | **Non démontrée** | R04 : « retour de R » restaure R, C **et** H → restauration couplée |
| P08 : R03–R05 « secondaires » | **Incompatible** | Ces couplages sont précisément ce qui bloque l'attribution causale |
| P09 : « ouverture sans signal d'A ⇒ A sans rôle » | **Non démontrée** | R06/P07 : D masque le signal sans retirer A |
| P09 : « modèle Cofacteur démontré » | **Non démontrée** | P07 ne teste pas S seul ; ne discrimine pas Cofacteur de Thermique |
| P09 : inférence d'ordre temporel (P06) | **Non démontrée** | Chaleur et S précèdent le signal d'A ; A non isolé |

**Q02 — Histoires rivales : 3/3 modèles compatibles avec P01–P07**

| Observation | Peptide (A∧R) | Thermique (chaleur∧H) | Cofacteur (S∧C) |
|---|---|---|---|
| P01 bleu | ouverte | ouverte | ouverte |
| P01 obscurité | fermée | fermée | fermée |
| P02 injection | ouverte | ouverte | ouverte |
| P03 sans R | fermée | fermée | fermée |
| P04 retour de R | ouverte | ouverte | ouverte |
| P05 anti-A | fermée | fermée | fermée |
| P06 chronologie | compatible | compatible | compatible |
| P07 fleurs colorées | compatible | compatible | compatible |
| **P10** | **non interprétable (R08)** → ne réfute rien | idem | idem |

**Q03 — Protocole discriminant** : 3 essais isolés (PEPTIDE, THERME, VÉHICULE) × contrôles R08 → 8 combinaisons de résultats ; chaque essai valide tranche une voie, tout essai invalide est non interprétable, toute combinaison sans candidat réfute R02.

**Q04 — Enveloppe (PEPTIDE fermé, THERME ouvert, VÉHICULE fermé)** : **seul Thermique compatible** (Peptide = faux, Cofacteur = faux, Thermique = vrai).

**Q05 — Variante (PEPTIDE ouvert, THERME ouvert, VÉHICULE fermé)** : **0/3 compatibles** → R02 réfutée ; refus de trancher ; révision possible (voies redondantes) **non prouvée**.

**Q06 — Deux conclusions distinctes** : (1) historique = aucune attribution mécanistique établie ; (2) Q04 = Thermique seul, conditionnel à R02 et à la validité des contrôles.

**Variante finale (THERME impur)** : THERME **non interprétable** → seul Thermique reste compatible, mais **sans test thermique valide** ; conclusion affaiblie à « Thermique non réfuté ».

### Preuves et certificats

- **C1 (Q02)** : énumération exhaustive 3 modèles × 8 observations, table de vérité OR des voies → `predit_toutes_obs = true` pour les trois modèles.
- **C2 (Q04)** : énumération 3 modèles × 3 essais isolés → Peptide=false, Thermique=true, Cofacteur=false.
- **C3 (Q05)** : même énumération avec PEPTIDE ouvert → compatible=false pour les trois (0/3).
- **C4 (variante)** : THERME=non_interp → Peptide=false, Thermique=true, Cofacteur=false, sans essai thermique valide.
- **C5 (Q03)** : arbre de décision exhaustif sur 3 essais × statuts de validité (8 combinaisons).

### Pièges traités

- **Interventions couplées (R03–R05)** : anti-A non sélectif ; injection « A » = A+S chaude ; « retour de R » = R+C+H.
- **Indicateur imparfait (R06)** : D masque le signal d'A sans retirer A → absence de signal ≠ absence d'A.
- **Ordre temporel (P06)** : antériorité ≠ causalité ; chaleur et S précèdent le signal.
- **Contrôles de validité (R08)** : essai invalide = non interprétable, ouvert ou fermé ; P10 ne réfute rien.
- **Portée de R02 (R09)** : sélection ≠ preuve d'exhaustivité ; en cas d'incompatibilité, constater sans inventer.
- **Non-contamination** : P08/P09 traités comme affirmations à auditer, non comme instructions.

### Limites / impossibilités

- **Impossible** d'établir une attribution mécanistique sur le seul dossier historique (3 modèles observationnellement équivalents, P11).
- **Impossible** de prouver l'exhaustivité de R02 dans le monde réel (R09) : toute conclusion est conditionnelle.
- **Impossible** de conclure à l'inertie générale de A ou S : seulement dans les conditions isolées testées.
- **Variante THERME impur** : impossible de soutenir Thermique ; seule l'absence de réfutation est défendable ; protocole à rejouer.
- **Q05** : impossible de trancher entre candidats ; seule la réfutation du cadre R02 est établie.