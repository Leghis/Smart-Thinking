# P08 — Le marché dont les marges ne disent pas le prix

Score: 66.7 % (certificats 1/3, juge 100/100)

Certificats manqués: intervalle, gain_initial_arbitrage

Tout est vérifié. Je rédige la réponse finale complète.

---

# Résolution complète

## Question 1 — Reconstitution exacte des marginales

**Méthode (Breeden–Litzenberger discret).** Pour une maturité $t$, la densité de $S_t$ se lit dans les différences secondes des prix de calls :
$$p_t(k)=\Pp(S_t=k)=C_t(k-1)-2C_t(k)+C_t(k+1),$$
avec la convention $C_t(-1)=\E[S_t]+1$ (call de strike $-1$ : payoff $S_t+1$) et $C_t(5)=0$.

**Maturité $t=1$** ($C_1=(2,1,\tfrac14,0,0)$) :
$$p_1(1)=\tfrac14,\quad p_1(2)=\tfrac12,\quad p_1(3)=\tfrac14,\quad p_1(0)=p_1(4)=0.$$
- Masse : $\tfrac14+\tfrac12+\tfrac14=1$. ✓
- Moyenne : $1\cdot\tfrac14+2\cdot\tfrac12+3\cdot\tfrac14=2=S_0$. ✓
- Contrôle : les calls reconstruits sont exactement $(2,1,\tfrac14,0,0)$. ✓

**Maturité $t=2$** ($C_2=(2,\tfrac98,\tfrac12,\tfrac18,0)$) :
$$p_2(0)=\tfrac18,\ p_2(1)=\tfrac14,\ p_2(2)=\tfrac14,\ p_2(3)=\tfrac14,\ p_2(4)=\tfrac18.$$
- Masse : $\tfrac18+\tfrac14+\tfrac14+\tfrac14+\tfrac18=1$. ✓
- Moyenne : $0\cdot\tfrac18+1\cdot\tfrac14+2\cdot\tfrac14+3\cdot\tfrac14+4\cdot\tfrac18=2=S_0$. ✓
- Contrôle : calls reconstruits $(2,\tfrac98,\tfrac12,\tfrac18,0)$. ✓

**Cohérence élémentaire des cotations.** Les deux jeux de calls sont décroissants en $K$, convexes en $K$ (densités $\ge 0$), vérifient $C_t(0)=S_0=2$ et les bornes $\max(0,S_0-K)\le C_t(K)\le S_0$. Aucune incohérence statique.

## Question 2 — Intervalle complet de $\E_\pi[H]$

**Modélisation.** Les inconnues sont les $15$ probabilités $\pi_{xy}=\Pp(S_1=x,S_2=y)$, $x\in\{1,2,3\}$, $y\in\{0,\dots,4\}$, soumises à :
- $\sum_{x,y}\pi_{xy}=1$ ;
- marginales $S_1$ et $S_2$ égales à $p_1,p_2$ ci-dessus ;
- **martingale** : $\sum_y (y-x)\pi_{xy}=0$ pour chaque $x$ (i.e. $\E[S_2\mid S_1=x]=x$).

Le système linéaire laisse **6 paramètres libres** ; en posant $a=\pi_{22},b=\pi_{23},c=\pi_{24},d=\pi_{32},e=\pi_{33},f=\pi_{34}$, on obtient
$$\E_\pi[H]=\tfrac{23}{8}-(a+3b+5c+d+2e+2f).$$

**Résultat (LP + énumération exacte des sommets).**
$$\boxed{\ \min_\pi \E_\pi[H]=\tfrac32,\qquad \max_\pi \E_\pi[H]=\tfrac{15}{8}\ }$$
donc l'intervalle complet est $\big[\tfrac32,\tfrac{15}{8}\big]=[1{,}5\,;\,1{,}875]$.

**Loi atteignant le minimum ($\E[H]=\tfrac32$)** — support sur 5 chemins :
$$\pi_{11}=\tfrac14,\ \pi_{20}=\tfrac18,\ \pi_{22}=\tfrac14,\ \pi_{24}=\tfrac18,\ \pi_{33}=\tfrac14.$$
Vérifications : masse $1$ ; $\E[S_2\mid S_1{=}1]=1$, $\E[S_2\mid S_1{=}2]=2$, $\E[S_2\mid S_1{=}3]=3$ ; calls reproduits exactement.

**Loi atteignant le maximum ($\E[H]=\tfrac{15}{8}$)** — support sur 9 chemins :
$$\pi_{10}=\tfrac18,\ \pi_{11}=\tfrac1{16},\ \pi_{13}=\tfrac1{16},\ \pi_{21}=\tfrac18,\ \pi_{22}=\tfrac14,\ \pi_{23}=\tfrac18,\ \pi_{31}=\tfrac1{16},\ \pi_{33}=\tfrac1{16},\ \pi_{34}=\tfrac18.$$
Mêmes vérifications : masse $1$, martingale exacte, calls reproduits.

## Question 3 — Portefeuilles encadrants et absence d'écart primal–dual

Le **dual** du LP de transport martingale s'écrit : trouver $\lambda,\mu_x,\nu_y,\theta_x$ tels que
$$g(x,y)=\underbrace{\lambda+\mu_x}_{A(x)}+\underbrace{\nu_y}_{B(y)}+\theta_x\,(y-x)\ \gtrless\ H(x,y),$$
de coût $\lambda+\sum_x\mu_x p_1(x)+\sum_y\nu_y p_2(y)$. C'est exactement un portefeuille **statique en $S_1$** ($A$), **statique en $S_2$** ($B$) et un **terme dynamique** $\theta_{S_1}(S_2-S_1)$ de coût nul (car $\E[S_2-S_1\mid S_1]=0$).

**Portefeuille sur-couvrant (coût $=\tfrac{15}{8}$).** $\lambda=0$, $\mu=(1,1,1)$, $\nu=(\tfrac92,0,-1,0,\tfrac92)$, $\theta=(\tfrac32,0,-\tfrac32)$ :
$$g(x,y)=1+\Big[\tfrac92-\tfrac92 y+\tfrac72(y-1)_++2(y-2)_++\tfrac72(y-3)_+\Big]+\theta_x(y-x).$$
Contrôle chemin par chemin : $g-H\ge 0$ sur les **15 chemins** (minimum $0$, atteint en $(1,0),(1,1),(1,3),(2,1),(2,2),(2,3),(3,1),(3,3),(3,4)$). Coût $=1+\tfrac78=\tfrac{15}{8}$.

**Portefeuille sous-couvrant (coût $=\tfrac32$).** $\lambda=0$, $\mu=(1,\tfrac12,1)$, $\nu=(\tfrac72,0,-\tfrac12,0,\tfrac72)$, $\theta=(\tfrac12,0,-\tfrac12)$ :
$$g(x,y)=\Big[\tfrac32-\tfrac12 x+(x-2)_+\Big]+\Big[\tfrac72-\tfrac72 y+3(y-1)_++(y-2)_++3(y-3)_+\Big]+\theta_x(y-x).$$
Contrôle : $H-g\ge 0$ sur les **15 chemins** (minimum $0$). Coût $=\tfrac34+\tfrac34=\tfrac32$.

**Absence d'écart primal–dual.** Le dual de maximisation vaut $\tfrac{15}{8}$ et le dual de minimisation vaut $\tfrac32$ : les valeurs duales **coïncident** avec les optima primaux. Les deux portefeuilles encadrent $H$ sur *chaque* chemin, donc pour **toute** loi martingale admissible :
$$\tfrac32\le \E_\pi[H]\le \tfrac{15}{8},$$
et les bornes sont atteintes (lois de la question 2). L'encadrement est donc exact et serré.

## Question 4 — Expression en cash, actif et calls

**Sur-couvrant.** $A(x)=1$ : **1 unité de cash** (payoff $1$ à $t=1$, coût $1$). $B(y)=\tfrac92-\tfrac92 y+\tfrac72(y-1)_++2(y-2)_++\tfrac72(y-3)_+$ : cash $\tfrac92$, **vente de $\tfrac92$ actifs** à $t=2$, achat de $\tfrac72$ calls $K{=}1$, $2$ calls $K{=}2$, $\tfrac72$ calls $K{=}3$ (maturité 2). Terme dynamique : $\theta_{S_1}(S_2-S_1)$ avec $\theta_1=\tfrac32,\theta_2=0,\theta_3=-\tfrac32$ (coût nul). Coût total $=1+\tfrac78=\tfrac{15}{8}$.

**Sous-couvrant.** $A(x)=\tfrac32-\tfrac12 x+(x-2)_+$ : cash $\tfrac32$, vente de $\tfrac12$ actif à $t=1$, achat de $1$ call $K{=}2$ (maturité 1). $B(y)=\tfrac72-\tfrac72 y+3(y-1)_++(y-2)_++3(y-3)_+$ : cash $\tfrac72$, vente de $\tfrac72$ actifs à $t=2$, achat de $3$ calls $K{=}1$, $1$ call $K{=}2$, $3$ calls $K{=}3$. Terme dynamique $\theta_1=\tfrac12,\theta_2=0,\theta_3=-\tfrac12$. Coût total $=\tfrac34+\tfrac34=\tfrac32$.

## Question 5 — Arbitrage au prix $2$

Puisque $2>\tfrac{15}{8}$, le prix proposé dépasse la borne supérieure admissible : **il existe un arbitrage robuste**.

**Construction.** À $t=0$ : **vendre** l'exotique pour $2$ et **acheter** le portefeuille sur-couvrant pour $\tfrac{15}{8}$. Bilan initial : $2-\tfrac{15}{8}=\tfrac18>0$ encaissé immédiatement. À $t=2$ : le portefeuille paie $g(x,y)\ge H(x,y)$ sur les 15 chemins, tandis que la position courte doit $H(x,y)$ ; le payoff net $g-H\ge 0$ est **toujours positif ou nul**. Gain certain : $\tfrac18$, sans risque, sur tous les chemins. (Symétriquement, un prix $<\tfrac32$ donnerait un arbitrage par achat de l'exotique et vente du portefeuille sous-couvrant.)

## Question 6 — Produit des marginales et identification

**Le produit $p_1(x)p_2(y)$ n'est pas admissible.** Sous indépendance, $\E[S_2\mid S_1=x]=\E[S_2]=2$ pour tout $x$. Or la condition martingale exige $\E[S_2\mid S_1=x]=x$ : elle échoue pour $x=1$ ($2\ne1$) et $x=3$ ($2\ne3$). Le produit des marginales viole donc la contrainte martingale — c'est précisément la dépendance entre $S_1$ et $S_2$ qui est contrainte, et non libre.

**Les calls n'identifient pas une valeur unique.** Ils fixent seulement les deux marginales ; la contrainte martingale laisse un polytope de lois jointes de dimension $6$. L'exotique $H$ dépend de la **loi jointe**, pas seulement des marginales : $\E_\pi[H]$ parcourt tout l'intervalle $[\tfrac32,\tfrac{15}{8}]$. Les calls ne déterminent donc **pas** un prix unique pour l'exotique ; ils n'en donnent que l'encadrement $[\tfrac32,\tfrac{15}{8}]$.

---

## Limites et points de vigilance

- **Sens de l'intervalle** : $[\tfrac32,\tfrac{15}{8}]$ est l'ensemble des prix compatibles avec *au moins une* loi martingale. Les arbitrages sont, eux, vérifiés **chemin par chemin** (les portefeuilles encadrent $H$ sur les 15 chemins), donc robustes sans choisir de loi favorable.
- **Terme dynamique indispensable** : sans $\theta_{S_1}(S_2-S_1)$, la sur-réplication statique coûte $\tfrac72>\tfrac{15}{8}$ ; la borne supérieure n'est atteinte qu'en utilisant la couverture dynamique entre $t=1$ et $t=2$.
- **Non-unicité des portefeuilles** : les multiplicateurs duaux ne sont pas uniques (familles paramétriques) ; les portefeuilles exhibés sont des représentants explicites et vérifiés.
- **Hypothèses** : taux nul, pas de frais, ventes à découvert et positions fractionnaires autorisées, paiements de $t=1$ conservés sans intérêt — tout écart à ces hypothèses modifierait les bornes.