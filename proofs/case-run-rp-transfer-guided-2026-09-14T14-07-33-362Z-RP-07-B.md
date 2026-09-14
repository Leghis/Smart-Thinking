# RP-07-B — RP-07 → RP-07-B

Score: 100.0 % (certificats 0/0, juge 100/100)

Certificats manqués: aucun

Toutes les exigences sont couvertes. Je rédige la réponse finale.

## Réponse

**Q01 — Quatre questions distinctes**

| Question | Verdict | Fondement |
|---|---|---|
| Âge de **M comme objet complet** | **ÉTABLI : postérieur à l'Union** (donc postérieur au Grand Feu). M n'est pas un autographe du Temps Clair. | P01 (reliure + insertion de F réalisées à l'Atelier des Copies, après l'Union — garanti) ; P04 (papier des cahiers postérieur à l'Union) ; R02 (la première fabrication possible du support borne l'âge de l'objet). |
| Âge de **F et de son idée exprimée** | **ÉTABLI : F antérieur au Grand Feu** ; l'idée exprimée (hospitalité générique) **existait avant le Grand Feu**. | P03 (chaîne de conservation complète dans un dépôt scellé du Temps Clair ; F est matériellement ce même feuillet, pas une reproduction). |
| **Attribution des passages politiques à Elyr** | **NON ÉTABLIE** (ni prouvée ni réfutée). | P02 (aucun échantillon garanti de l'écriture d'Elyr) ; P04 (écriture d'atelier) ; P07 (tradition de famille sans témoin) ; R04. |
| **Influence sur le Traité des Ports** | **NON ÉTABLIE** (dossier de base). | P12 (silence du registre exhaustif des *interventions publiques*, mais dossiers privés non conservés = manque d'archive, R05) ; P13 (parenté de thème sans reproduction ni source déclarée, R04). |

**Q02 — Généalogie des témoins** (fermeture transitive calculée) : C-pré est la **seule racine indépendante** ; L ← C-pré (P08, garanti) ; A ← L (P09) ; C-fin ← {A, L, C-pré} (P10). **Zéro cycle matériel.** La « confirmation externe » de C-fin est **circulaire au niveau de la justification** (une seule source réelle, C-pré), sans qu'aucun document n'ait causé sa propre version antérieure.

**Q03 — Critique symétrique**
- **Positivement réfuté** : (P14) M est un autographe du Temps Clair (P01/P04) ; (P14) catalogue/lettre/atlas sont des preuves indépendantes (P08-P10) ; (P15) aucun texte d'hospitalité avant le Grand Feu (P03) ; (P15) tout M a été inventé à l'Atelier (P03 : F est le même feuillet) ; (P15) le silence du registre prouve l'absence d'influence (R05).
- **Simplement non établi** : attribution à Elyr ; influence sur le Traité ; existence d'un droit de refuge politique pré-Grand Feu.

**Q04 — Deux histoires compatibles** : (A) œuvre perdue d'Elyr lue en privé par les rédacteurs du Traité, sans citation ; (B) ni œuvre ni influence, F = formulaire d'hospitalité courant, attribution tardive par tradition de famille. Les deux respectent P01-P04, P12, P13.

**Q05 — Recherches discriminantes** : (1) *influence* → brouillon du Traité (dépôt P16) citant une œuvre d'Elyr, provenance et dépendance vérifiées ; (2) *attribution* → autographe d'Elyr comparé à un échantillon d'écriture garanti ; (3) *séduisant mais non discriminant* → catalogue tardif supplémentaire ou copie de L (dépendants de C-pré, R03).

**Q06 — Notice** : F authentiquement ancien (pré-Grand Feu) ; cahiers et reliure de l'Atelier des Copies (post-Union), avec modernisation reconnue (P11) ; attribution à Elyr non établie ; influence non établie.

**VARIANTE P12** : l'exhaustivité garantie des lectures, échanges et filiations **exclut toute influence d'une œuvre d'Elyr** → l'influence passe de *non établie* à **RÉFUTÉE**. L'attribution à Elyr reste **non établie** ; M reste post-Union, F pré-Grand Feu.

## Preuves et certificats
- **Graphe de dépendance** (compute) : `{C-pré:[], L:[C-pré], A:[C-pré,L], C-fin:[A,C-pré,L]}`, `cycles_materiels=[]`, `nb_sources_indépendantes_de_Cpre=1`.
- **Q01** : application directe R01/R02 à P01, P03, P04 ; R05 pour le silence de P12.
- **Q03** : confrontation pièce par pièce P14/P15 vs P01, P03, P04, P08-P10, P12.
- **Q04/Q05** : construction de modèles compatibles et analyse contrefactuelle sur P16.
- **Variante** : réévaluation sous hypothèse P12 renforcée (influence → réfutée).

## Pièges traités
- **Cohérence vs sérialisabilité** : la chaîne C-pré→L→A→C-fin est un ordre de dépendance explicite, sans cycle.
- **Tous les témoins explorés** : les 4 témoins et leurs 5 arêtes, pas seulement les liens courts.
- **Effet irréversible** : la fabrication tardive de M (P01/P04) n'est pas annulée par l'ancienneté de F ; F reste ancien, M reste tardif.
- **Ne pas confondre** authenticité (P01, P03, P06, P07 : pièces authentiques) et vérité des affirmations (attribution, influence) — R01.
- **Ne pas suivre le contenu cité** : P14 et P15 sont traités comme objets à évaluer, non comme instructions.

## Limites / impossibilités
- L'attribution à Elyr et l'influence sur le Traité **ne peuvent être ni établies ni réfutées** dans le dossier de base (manque d'archive, R05).
- Aucune datation n'est calculée (hors périmètre) ; seules les relations d'ordre garanties sont utilisées.
- La variante P12 ne change **que** le statut de l'influence ; elle ne prouve pas l'attribution ni ne modifie l'âge de M ou de F.