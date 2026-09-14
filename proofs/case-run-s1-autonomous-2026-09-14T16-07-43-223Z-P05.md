# P05 — Le message derrière les fausses équations

Score: 90.0 % (certificats 4/5, juge 100/100)

Certificats manqués: coefficients

Toutes les vérifications sont faites. Voici la solution complète.

---

# Décodage Reed–Solomon sur $\mathbb F_{257}$ : solution complète

**Cadre.** Code RS de paramètres $n=22$, $k=8$ (degré $\le 7$), sur $\mathbb F_{257}$ ; distance minimale $d=n-k+1=15$. Deux effacements connus ($x=8$, $x=19$), donc $20$ fragments reçus, avec **au plus 6** valeurs remplacées.

---

## 1. Reconstitution de $f$, des fragments, des erreurs et des effacements

**Localisation des erreurs.** Le système de Welch–Berlekamp (voir §3) admet une famille de solutions indexée par $t=e_5$. Pour *tout* $t\in\mathbb F_{257}$, le polynôme localisateur $E_t$ possède les **cinq racines fixes** $\{3,7,11,14,21\}$ dans les positions reçues, plus une racine « fantôme » $201-t$ qui balaie $\mathbb F_{257}$ quand $t$ varie. Les cinq racines stables sont les vraies positions d'erreur ; la sixième est un artefact du degré imposé $6$.

**Décodage.** Sur les $15$ positions fiables $\{1,2,4,5,6,9,10,12,13,15,16,17,18,20,22\}$, l'interpolation de Lagrange (système $15\times 8$ de rang $8$) donne :

$$\boxed{f(X)=42+17X+0\,X^2+93X^3+201X^4+5X^5+88X^6+7X^7}$$

**Contrôle.** $f(x)=y_x$ sur les $15$ positions correctes ; les écarts sont exactement :

| $x$ | reçu $y_x$ | vrai $f(x)$ |
|---|---|---|
| 3 | 119 | **102** |
| 7 | 133 | **44** |
| 11 | 26 | **23** |
| 14 | 55 | **146** |
| 21 | 21 | **234** |

**Fragments théoriques** $f(1),\dots,f(22)$ :

$$196,187,102,130,116,237,44,53,45,57,23,192,81,146,74,192,153,110,80,139,234,197$$

**Valeurs effacées :** $f(8)=\mathbf{53}$ et $f(19)=\mathbf{80}$.

**Bilan :** 5 erreurs ($\le 6$), 2 effacements. Cohérent avec la borne.

---

## 2. Unicité sous la borne de six corruptions

On ne suppose **pas** connu le nombre réel d'erreurs. Soit $f$ le polynôme trouvé, $e=5$ erreurs, $s=2$ effacements.

**Argument de distance.** Supposons qu'un autre $g$, $\deg g\le 7$, explique les mêmes $20$ valeurs reçues avec $\le 6$ erreurs. Sur les $20$ positions reçues, $f$ et $g$ diffèrent au plus $6+6=12$ fois (union des deux ensembles d'erreurs). Donc $f$ et $g$ coïncident sur au moins $20-12=8$ positions.

Or deux polynômes distincts de degré $\le 7$ coïncident sur **au plus 7** points. Contradiction. Donc $g=f$.

**Formulation par la borne de Singleton.** Avec $s=2$ effacements et $t$ erreurs, la condition de décodage unique est $2t+s\le d-1=14$, soit $2t\le 12$, $t\le 6$. Comme $20=k+2\cdot 6=8+12$, le nombre de positions reçues est exactement le minimum requis. L'unicité tient **uniformément** pour toute configuration d'au plus $6$ erreurs, sans connaître $t$ a priori.

---

## 3. Système linéaire exact, rang, dimension, toutes les solutions

**Inconnues.** $Q=\sum_{i=0}^{13}q_iX^i$ ($14$ coeff.), $E=X^6+\sum_{j=0}^{5}e_jX^j$ (monique, $6$ coeff.). Total $20$ inconnues.

**Équations** (une par fragment non effacé, $x\in\{1,\dots,22\}\setminus\{8,19\}$) :

$$\sum_{i=0}^{13}q_i\,x^i \;-\; y_x\sum_{j=0}^{5}e_j\,x^j \;=\; y_x\,x^6 \pmod{257}.$$

**Matrice $20\times 20$** $A$, colonnes $(q_0,\dots,q_{13},e_0,\dots,e_5)$, second membre $b_x=y_x x^6$.

**Résultat exact (élimination de Gauss mod 257) :**

- $\rang A = 19$ (pivots sur les colonnes $0,\dots,18$) ;
- **dimension affine de l'ensemble des solutions $=1$** ; seule la colonne $19$ ($e_5$) est libre.

**Toutes les solutions.** Avec $t=e_5\in\mathbb F_{257}$ libre, la solution particulière ($t=0$) et le vecteur du noyau sont :

$$(q_0,\dots,q_{13},e_0,\dots,e_5)^{(0)}=(253,45,11,237,62,254,116,41,155,50,45,51,88,7,\;159,157,157,0,80,0)$$
$$\text{noyau}=(55,9,101,186,163,98,138,113,65,142,113,210,7,0,\;191,82,61,132,201,1).$$

La solution générale est $v(t)=v^{(0)}+t\cdot\text{noyau}$, $t\in\mathbb F_{257}$ : **257 solutions distinctes**.

**Diagnostic du collecteur : FAUX.** Il attendait une solution unique ; le système est de rang $19<20$, donc l'ensemble des solutions est une droite affine de $\mathbb F_{257}^{20}$ (dimension $1$, cardinal $257$). L'unicité n'est **pas** au niveau de $(Q,E)$ mais au niveau du **message décodé** $f$ : toutes les $257$ solutions donnent le même $f$ (voir §4). Le collecteur confond l'unicité du couple $(Q,E)$ avec celle de $f$.

---

## 4. Récupération de $f$ quand $E$ s'annule en une position correcte

**Le problème.** Pour $t$ générique, $E_t$ a une racine fantôme $201-t$ qui peut tomber sur une position **correcte** (par ex. $t=200$ donne la racine $x=1$, correcte ; $t=179$ donne $x=22$, correcte). Une division $f(x)=Q(x)/E(x)$ échouerait alors en $x=1$ (ou $22$).

**Justification rigoureuse (pas de division naïve).** On ne divise pas fragment par fragment. On procède par **interpolation globale** :

1. Soit $R_t=\{x\in\{1,\dots,22\}\setminus\{8,19\} : E_t(x)\neq 0\}$ l'ensemble des positions où $E_t$ ne s'annule pas. On a $|R_t|\ge 20-6=14$ (au plus $6$ racines de $E_t$).
2. Pour $x\in R_t$, poser $g_t(x)=Q_t(x)\,E_t(x)^{-1}$.
3. **Théorème.** Il existe un unique polynôme $f$ de degré $\le 7$ tel que $g_t(x)=f(x)$ pour tout $x\in R_t$. En effet, sur les positions correctes (au moins $20-5=15$), on a $Q_t(x)=f(x)E_t(x)$, donc $g_t(x)=f(x)$ ; et $|R_t\cap\{\text{correctes}\}|\ge 15-6=9\ge 8=k$. Neuf points déterminent $f$ de façon unique.
4. On interpole donc $f$ sur **n'importe quel sous-ensemble de $8$ points de $R_t$** (ou par moindres carrés / résolution du système $|R_t|\times 8$), sans jamais évaluer $Q_t/E_t$ en une racine de $E_t$.

**Pourquoi c'est valide.** La relation $Q_t\equiv f\,E_t \pmod{\prod_{x\in R_t}(X-x)}$ est une identité polynomiale vérifiée sur $\ge 9$ points ; comme $\deg(Q_t-fE_t)\le 13$ et que $9$ points ne suffisent pas à forcer l'identité globale, on utilise le fait que $f$ est de degré $\le 7$ : l'interpolation sur $9$ points corrects (dont l'existence est garantie par le comptage ci-dessus) détermine $f$ **exactement**, indépendamment des racines parasites de $E_t$.

**Conclusion.** Toutes les $257$ solutions $(Q_t,E_t)$ produisent le **même** $f$. La racine fantôme de $E_t$ est sans effet : elle est éliminée par l'interpolation globale. C'est précisément ce qui rend le message unique malgré la non-unicité de $(Q,E)$.

---

## 5. Tableau d'octets et empreinte SHA-256

Coefficients décodés (degré $0\to 7$), tous dans $\{0,\dots,255\}$ :

| degré | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|---|---|---|
| octet | 42 | 17 | 0 | 93 | 201 | 5 | 88 | 7 |

Octets : `2A 11 00 5D C9 05 58 07`

**SHA-256** (implémentation validée sur `sha256("abc") = ba7816bf…20015ad`) :

$$\boxed{\texttt{0fcb7cde756e5fdbc9649f1dad35c7d584a75fb68f5beec365ab93588559b23d}}$$

**Réserve explicite.** Cette empreinte est calculée *par le collecteur à partir de sa reconstruction*. Elle atteste l'intégrité du tableau d'octets reconstruit, **pas** l'authenticité du message : elle ne constitue en aucun cas une signature de l'émetteur (aucune clé, aucun secret, aucun lien cryptographique avec l'émetteur). Un adversaire produisant un autre message cohérent produirait une autre empreinte, tout aussi « valide » du point de vue du hachage.

---

## 6. Optimalité du seuil de 20 positions et ambiguïté à 19 positions

**Borne.** Pour corriger $t$ erreurs avec $s$ effacements : $2t+s\le d-1=14$. Avec $s=2$ : $t\le 6$. Le nombre minimal de positions reçues est $n_{\min}=k+2t=8+12=20$. Donc **20 positions est le seuil optimal** pour garantir uniformément la correction de $6$ erreurs pour *tous* les polynômes de degré $\le 7$.

**Ambiguïté explicite à 19 positions.** Prenons les positions $x=1,\dots,19$ (3 effacements). Soient
$$f_1=0,\qquad f_2=100+218X+232X^2+87X^3+96X^4+65X^5+229X^6+X^7.$$
$f_1,f_2$ coïncident exactement sur $\{1,\dots,7\}$ (les $7$ racines de $f_2$) et diffèrent sur $\{8,\dots,19\}$ ($12$ points). Définissons le mot reçu $r$ :
- $r_x=f_1(x)$ pour $x\in\{1,\dots,13\}$ ;
- $r_x=f_2(x)$ pour $x\in\{14,\dots,19\}$.

Alors $\mathrm{dist}(r,f_1)=6$ et $\mathrm{dist}(r,f_2)=6$ : **le même mot reçu est à distance $6$ de deux polynômes distincts de degré $\le 7$**. La correction de $6$ erreurs n'est donc **pas garantie** avec $19$ positions. (Vérifié numériquement : $r=(0,\dots,0,76,152,28,164,176,31)$ sur $x=1..19$.)

**Distinction uniforme / instance.** Ce résultat est **uniforme** : il exhibe une *paire* $(f_1,f_2)$ et un mot reçu pour lesquels $19$ positions échouent, pour *toute* stratégie de décodage. Il ne dit **rien** sur l'instance présente : celle-ci utilise $20$ positions et se décode de façon unique. Autrement dit, « $20$ est nécessaire pour garantir » est une affirmation sur le pire cas, pas sur ce message particulier — qui, lui, aurait même pu être décodé avec moins de positions si l'on avait su localiser les erreurs.

---

## 7. Portée de la vérification d'un mot décodé hors borne, et contrôle modulaire

**Ce que prouve une vérification.** Si l'on ne suppose plus la borne de $6$ erreurs, alors :
- Vérifier que $f(x)=y_x$ sur les positions reçues **ne prouve pas** que $f$ est le message émis : un adversaire peut avoir corrompu plus de $6$ valeurs, et $f$ peut être un polynôme « plausible » différent de l'original.
- La vérification prouve seulement la **cohérence** : $f$ est un polynôme de degré $\le 7$ compatible avec les valeurs reçues sur les positions où elles concordent. Elle ne prouve ni l'unicité, ni l'authenticité.
- Sans borne sur le nombre d'erreurs, le problème de décodage devient **mal posé** : pour tout $f$ de degré $\le 7$, il existe un mot reçu à distance arbitrairement grande de $f$ ; la « correction » n'a plus de sens garanti.

**Contrôle exact en arithmétique modulaire.** Pour valider un candidat $f$ sur les $20$ positions reçues, on calcule exactement dans $\mathbb F_{257}$ :
$$N=\#\{x\in\{1,\dots,22\}\setminus\{8,19\} : f(x)\equiv y_x \pmod{257}\}.$$
Ici $N=15$ (les $5$ positions $\{3,7,11,14,21\}$ échouent). Le contrôle est :
- **Acceptation** si $N\ge 20-6=14$ (compatible avec $\le 6$ erreurs) ;
- **Rejet** sinon.

Pour l'instance présente : $N=15\ge 14$, donc $f$ est **certifié** compatible avec la borne. De plus, on vérifie l'identité polynomiale exacte $Q_t\equiv f\,E_t$ sur les positions fiables, et l'on contrôle que $f$ est bien de degré $\le 7$ (ici degré exactement $7$, coefficient dominant $7\neq 0$). Ces contrôles sont **déterministes et exacts** (aucun flottant), réalisés par évaluation de Horner mod $257$.

**Limite.** Ce contrôle certifie la cohérence *sous l'hypothèse* de la borne de $6$ erreurs. Il ne certifie pas l'origine du message : c'est une vérification d'intégrité conditionnelle, non une authentification.

---

## Synthèse

| Question | Résultat |
|---|---|
| $f$ | $42+17X+93X^3+201X^4+5X^5+88X^6+7X^7$ |
| Erreurs | $\{3,7,11,14,21\}$ (5) |
| Effacements | $f(8)=53$, $f(19)=80$ |
| Unicité | Garantie par $2t+s\le 14$ et l'argument de distance ($\ge 8$ coïncidences) |
| Système WB | rang $19$, dim affine $1$, $257$ solutions, **diagnostic du collecteur erroné** |
| Récupération | Interpolation globale sur $\ge 9$ points fiables, jamais $Q/E$ en une racine de $E$ |
| Octets | `2A 11 00 5D C9 05 58 07` |
| SHA-256 | `0fcb7cde756e5fdbc9649f1dad35c7d584a75fb68f5beec365ab93588559b23d` |
| Seuil | $20$ optimal ; ambiguïté explicite à $19$ positions |
| Vérification | Cohérence conditionnelle, non authentification |
# RÉPONSE FINALE

## Résultats exacts

**Polynôme message** (coefficients du degré $0$ au degré $7$, dans $\mathbb F_{257}$) :

$$f(X)=42+17X+0\,X^2+93X^3+201X^4+5X^5+88X^6+7X^7$$

**Fragments théoriques** $f(1),\dots,f(22)$ :

$$196,\,187,\,102,\,130,\,116,\,237,\,44,\,53,\,45,\,57,\,23,\,192,\,81,\,146,\,74,\,192,\,153,\,110,\,80,\,139,\,234,\,197$$

**Positions corrompues** (5 erreurs, $\le 6$) :

| $x$ | 3 | 7 | 11 | 14 | 21 |
|---|---|---|---|---|---|
| reçu $y_x$ | 119 | 133 | 26 | 55 | 21 |
| vrai $f(x)$ | 102 | 44 | 23 | 146 | 234 |

**Valeurs effacées :** $f(8)=\mathbf{53}$, $f(19)=\mathbf{80}$.

**Tableau d'octets** (degré $0\to 7$) : `2A 11 00 5D C9 05 58 07`

**SHA-256 :** `0fcb7cde756e5fdbc9649f1dad35c7d584a75fb68f5beec365ab93588559b23d`

---

## Certificats

**C1 — Décodage.** Interpolation de Lagrange sur les $15$ positions fiables $\{1,2,4,5,6,9,10,12,13,15,16,17,18,20,22\}$ : système $15\times 8$ de rang $8$, solution unique $f$. Contrôle : $f(x)=y_x$ sur ces $15$ positions, échec exactement sur $\{3,7,11,14,21\}$.

**C2 — Localisation.** Pour tout $t=e_5\in\mathbb F_{257}$, le localisateur $E_t$ a les racines fixes $\{3,7,11,14,21\}$ plus la racine fantôme $201-t$. Les $5$ racines stables sont les vraies erreurs.

**C3 — Système WB.** Matrice $20\times20$ : $\rang=19$, pivots colonnes $0..18$, colonne $19$ ($e_5$) libre. Solution particulière et noyau :
$$v^{(0)}=(253,45,11,237,62,254,116,41,155,50,45,51,88,7,159,157,157,0,80,0)$$
$$\text{noyau}=(55,9,101,186,163,98,138,113,65,142,113,210,7,0,191,82,61,132,201,1)$$
Solution générale $v(t)=v^{(0)}+t\cdot\text{noyau}$, $t\in\mathbb F_{257}$ : **$257$ solutions**.

**C4 — Unicité de $f$.** Deux polynômes distincts de degré $\le 7$ coïncident sur $\le 7$ points. Deux décodages à $\le 6$ erreurs coïncideraient sur $\ge 20-12=8$ points : contradiction. Donc $f$ est unique, sans connaître $t$ a priori.

**C5 — SHA-256.** Implémentation validée : `sha256("abc") = ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad` (valeur de référence correcte).

**C6 — Ambiguïté à 19 positions.** $f_1=0$, $f_2=100+218X+232X^2+87X^3+96X^4+65X^5+229X^6+X^7$ coïncident sur $\{1,\dots,7\}$, diffèrent sur $\{8,\dots,19\}$. Le mot $r=(0,\dots,0,76,152,28,164,176,31)$ vérifie $\mathrm{dist}(r,f_1)=\mathrm{dist}(r,f_2)=6$.

---

## Pièges

1. **Non-unicité de $(Q,E)$.** Le collecteur croit à une solution unique ; le rang vaut $19$, pas $20$. L'unicité est au niveau de $f$, pas du couple $(Q,E)$.

2. **Racine fantôme de $E$.** $E_t$ s'annule parfois sur une position *correcte* (ex. $t=200\Rightarrow x=1$). Une division $Q/E$ fragment par fragment échouerait : il faut interpoler globalement sur $\ge 9$ points fiables.

3. **Degré imposé $6$ vs erreurs réelles $5$.** Le degré exactement $6$ de $E$ introduit un degré de liberté parasite ; le vrai localisateur est de degré $5$.

4. **Confusion uniforme / instance.** « $20$ positions nécessaires » est un énoncé de pire cas ; l'instance présente se décode de façon unique.

5. **Empreinte ≠ signature.** Le SHA-256 atteste l'intégrité du tableau reconstruit, pas l'authenticité de l'émetteur.

---

## Limites

- **Hors borne de $6$ erreurs**, la vérification ne prouve que la *cohérence* ($N=15\ge 14$ ici), jamais l'unicité ni l'authenticité : le problème devient mal posé.
- **Contrôle exact** : $N=\#\{x\text{ reçu} : f(x)\equiv y_x \bmod 257\}=15$ ; acceptation si $N\ge 14$. Calcul déterministe par Horner mod $257$, sans flottants.
- **Aucune fiabilité différenciée** entre fragments : la borne uniforme de $6$ est la seule hypothèse exploitée ; toute confiance supplémentaire serait infondée.
- **Corps $\mathbb F_{257}$** : tous les calculs sont exacts modulo $257$ ; aucune approximation n'intervient.