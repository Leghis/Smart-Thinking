# P07 — Deux modes stables, une trajectoire dangereuse

Score: 90.0 % (certificats 4/5, juge 100/100)

Certificats manqués: par_commutations

The count 10970 = 2·Σ C(29-2k,k-1) confirms exhaustive coverage. Everything is verified. Let me write the final answer.

---

# Résolution complète

## Question 1 — Stabilité des modes, commutation arbitraire, rayon spectral joint

**Chaque mode est asymptotiquement stable.** $A_0=\tfrac12\begin{pmatrix}1&2\\0&1\end{pmatrix}$ et $A_1=\tfrac12\begin{pmatrix}1&0\\2&1\end{pmatrix}$ sont triangulaires, de spectre $\{1/2,1/2\}$ : $\rho(A_0)=\rho(A_1)=1/2<1$. Chacune est donc stable (et même contractante en norme : $\|A_0\|_2=\|A_1\|_2=(1+\sqrt2)/2$).

**La commutation arbitraire est instable.** On calcule
$$A_0A_1=\tfrac14\begin{pmatrix}5&2\\2&1\end{pmatrix},\qquad \rho(A_0A_1)=\tfrac34+\tfrac{\sqrt2}{2}\approx1.4571>1.$$
Le produit de deux matrices stables est instable : la commutation arbitraire ne préserve pas la stabilité.

**Rayon spectral joint exact.** On remarque la symétrie fondamentale
$$A_1=A_0^{\!\top}.$$
D'où $\|A_0\|_2=\|A_1\|_2=\sqrt{\lambda_{\max}(A_0^\top A_0)}=\sqrt{\tfrac34+\tfrac{\sqrt2}{2}}=\dfrac{1+\sqrt2}{2}=:c$. Par sous-multiplicativité, pour tout mot de longueur $L$,
$$\|A_{\sigma_{L-1}}\cdots A_{\sigma_0}\|_2\le c^{L}\ \Longrightarrow\ \widehat\rho\le c.$$
Réciproquement, le mot périodique $(0,1)$ répété donne $(A_0A_1)^k$, donc
$$\widehat\rho\ \ge\ \rho(A_0A_1)^{1/2}=\Big(\tfrac34+\tfrac{\sqrt2}{2}\Big)^{1/2}=\frac{1+\sqrt2}{2}=c.$$
(La recherche exhaustive sur tous les mots de longueur $\le14$ confirme que le maximum de $\rho(\text{produit})^{1/L}$ vaut exactement $c$, atteint par $(0,1)$.)

$$\boxed{\ \widehat\rho=\frac{1+\sqrt2}{2}\approx1.2071>1\ }$$

La commutation arbitraire est donc **instable** (croissance géométrique de taux $\widehat\rho$).

## Question 2 — Temps de séjour minimal et certificat de contraction

Un bloc de longueur $L$ d'un mode fixe donne $A_0^{L}=\tfrac1{2^L}\begin{pmatrix}1&2L\\0&1\end{pmatrix}$ (idem $A_1^L$ par transposition). On calcule
$$\|A_0^{L}\|_2^2=\frac{1}{4^{L}}\Big[(2L^2+1)+\sqrt{(2L^2+1)^2-1}\Big],$$
qui **décroît pour $L\ge3$**, avec maximum en $L=3$ :
$$\|A_0^{3}\|_2=\|A_1^{3}\|_2=\sqrt{\tfrac{19}{64}+\tfrac{3\sqrt{10}}{32}}\approx0.7703<1.$$

**$d=2$ échoue.** Le pire cas est l'alternance de blocs de longueur exactement $2$ :
$$\rho(A_0^2A_1^2)=\tfrac{9}{16}+\tfrac{\sqrt5}{4}\approx1.1215,\qquad \rho(A_0^2A_1^2)^{1/4}\approx1.0291>1.$$
L'énumération de toutes les séquences de blocs de longueur $\ge2$ confirme que ce taux $1.0291$ est le pire : $d=2$ ne garantit pas la stabilité.

**$d=3$ suffit — certificat de contraction.** Pour toute séquence de blocs $B_1,\dots,B_k$ de longueurs $L_i\ge3$ (longueur totale $n=\sum L_i$), comme $\|A^{L_i}\|_2\le\|A^3\|_2$ pour $L_i\ge3$ :
$$\|B_1\cdots B_k\|_2\le\prod_i\|A^{L_i}\|_2\le\|A^3\|_2^{\,k}\le\|A^3\|_2^{\,n/3},$$
car $k\le n/3$. Donc
$$\|B_1\cdots B_k\|_2^{1/n}\le\|A^3\|_2^{1/3}=\Big(\tfrac{19}{64}+\tfrac{3\sqrt{10}}{32}\Big)^{1/6}\approx0.91668<1.$$
Ce taux est **optimal** : l'alternance de blocs de longueur $3$, $(A_0^3A_1^3)^k$, donne $\rho(A_0^3A_1^3)^{1/6}=\|A_0^3A_1^3\|_2^{1/6}=0.91668$ (on a $\|A_0^3A_1^3\|_2=\|A_0^3\|_2\|A_1^3\|_2$).

$$\boxed{\ d_{\min}=3,\qquad \text{taux de contraction } c_3=\Big(\tfrac{19}{64}+\tfrac{3\sqrt{10}}{32}\Big)^{1/6}\approx0.91668\ }$$

**Préfixes incomplets.** Un préfixe de longueur $L<3$ (dernier bloc tronqué) a une norme $\|A^L\|_2\le\|A\|_2=(1+\sqrt2)/2\approx1.2071$ (max en $L=1$). Comme il n'y a qu'**un** préfixe, de longueur bornée par $2$, il est absorbé dans une constante : pour toute séquence admissible de longueur $n$,
$$\|\text{produit}\|_2\le C\,c_3^{\,n},\qquad C=\|A\|_2^{2}=\Big(\tfrac{1+\sqrt2}{2}\Big)^2\approx1.4571.$$
C'est exactement la **stabilité exponentielle uniforme** (avec constante $C$ et taux $c_3<1$). Le préfixe court ne détruit donc pas la stabilité ; il ne fait que majorer la constante transitoire.

## Question 3 — Maximum exact de $z_{30}$ et maximiseurs

Avec $x_0=0$, $x_{30}=\sum_{t=0}^{29}\Phi_t w_t$ où $\Phi_t=A_{\sigma_{29}}\cdots A_{\sigma_{t+1}}$ (produit vide en $t=29$). Pour une séquence de modes fixée, l'adversaire maximise chaque terme indépendamment sur la boîte :
$$\max_{w_t\in[-1/100,1/100]^2}(1,1)\Phi_t w_t=\frac1{100}\big\|\Phi_t^{\!\top}(1,1)\big\|_1.$$
En posant $v_t=\Phi_t^{\!\top}(1,1)$ (récurrence $v_{29}=(1,1)$, $v_t=A_{\sigma_{t+1}}^{\!\top}v_{t+1}$) :
$$\max z_{30}=\frac1{100}\sum_{t=0}^{29}\|v_t\|_1.$$

L'énumération **exhaustive** des séquences admissibles (compositions de $30$ en $k\le5$ parts $\ge3$, fois $2$ modes initiaux : $2\sum_{k=1}^{5}\binom{29-2k}{k-1}=10970$ séquences) donne

$$\boxed{\ \max z_{30}=\frac{547614819}{3355443200}\approx0.163202\ }$$

**Séquences optimales (exactement deux, symétriques) :**
$$(\underbrace{0,\dots,0}_{18},\underbrace{1,1,1}_{},\underbrace{0,0,0}_{},\underbrace{1,1,1}_{},\underbrace{0,0,0}_{})\quad\text{et}\quad(\underbrace{1,\dots,1}_{18},\underbrace{0,0,0}_{},\underbrace{1,1,1}_{},\underbrace{0,0,0}_{},\underbrace{1,1,1}_{}).$$
Structure : un long bloc de $18$, puis $4$ blocs de longueur $3$ (soit $5$ blocs, $4$ changements).

**Perturbation optimale :** tous les $v_t$ ont leurs deux composantes strictement positives, donc le maximiseur de la boîte est
$$w_t=\Big(\tfrac1{100},\tfrac1{100}\Big)\quad\text{pour tout }t=0,\dots,29.$$
Vérification par simulation directe : $z_{30}=547614819/3355443200$ exactement.

## Question 4 — Maxima par nombre exact de changements

Le nombre de changements $=$ (nombre de blocs) $-1$. Énumération exhaustive par nombre de blocs :

| changements | structure optimale | $\max z_{30}$ exact | valeur |
|---|---|---|---|
| $0$ | $(30)$ | $67108863/838860800$ | $0.080000$ |
| $1$ | $(27,3)$ | $369098727/3355443200$ | $0.110000$ |
| $2$ | $(24,3,3)$ | $889192173/6710886400$ | $0.132500$ |
| $3$ | $(21,3,3,3)$ | $125697861/838860800$ | $0.149844$ |
| $4$ | $(18,3,3,3,3)$ | $547614819/3355443200$ | $0.163202$ |

**Structure optimale universelle :** un bloc long de longueur $30-3k$ suivi de $k$ blocs de longueur $3$ (le minimum permis), pour $k$ changements. Le maximum croît strictement avec le nombre de changements.

**Certificat d'exhaustivité sans tester $2^{30}$ séquences.** Une séquence admissible est entièrement déterminée par (i) la composition de $30$ en $k\le5$ parts chacune $\ge3$, et (ii) le mode initial. Le nombre de compositions de $30$ en $k$ parts $\ge3$ est $\binom{29-2k}{k-1}$, d'où
$$2\sum_{k=1}^{5}\binom{29-2k}{k-1}=2(1+25+253+1330+3876)=10970.$$
On énumère ces $10970$ séquences (et non $2^{30}$), chacune évaluée par la récurrence exacte sur $v_t$. C'est un **certificat exhaustif** : toute séquence admissible est représentée une fois.

## Question 5 — La propriété $z_{30}\le4/25$ est-elle garantie ?

$$\max z_{30}=\frac{547614819}{3355443200}\approx0.163202\ >\ \frac{4}{25}=0.16.$$
$$\boxed{\ \text{Non, } z_{30}\le4/25 \text{ n'est pas garanti.}\ }$$
Le dépassement vaut $\approx0.003202$ (soit $\approx2\%$ de la borne). Le témoin est la séquence $(0^{18},1^3,0^3,1^3,0^3)$ avec $w_t=(1/100,1/100)$.

**La stabilité asymptotique ne répond pas à cette question.** Trois raisons :
1. La stabilité (des modes, ou du système contraint $d=3$) est une propriété **asymptotique** ($n\to\infty$), alors que $z_{30}$ est une grandeur **finie** sur un horizon de $30$ pas. Un système exponentiellement stable peut avoir un transitoire dépassant un seuil donné.
2. Le système contraint ($d=3$) est stable avec taux $0.91668$, mais la constante transitoire $C\approx1.4571$ et l'accumulation des perturbations sur $30$ pas produisent un pic fini supérieur à $4/25$.
3. La sûreté finie exige une analyse **pire-cas sur l'horizon** (ici l'énumération exacte), pas une conclusion de stabilité. La stabilité est nécessaire mais non suffisante pour une borne finie.

## Question 6 — Récurrence en entiers (calcul exact sans arrondi)

On part de $v_t=A_{\sigma_{t+1}}^{\!\top}v_{t+1}$, $v_{29}=(1,1)$. Comme $A_0^\top=A_1$ et $A_1^\top=A_0$, on a $v_t=A_{1-\sigma_{t+1}}v_{t+1}=\tfrac12 M_{t+1}v_{t+1}$ avec $M_{t+1}\in\{B_0,B_1\}$,
$$B_0=\begin{pmatrix}1&2\\0&1\end{pmatrix},\qquad B_1=\begin{pmatrix}1&0\\2&1\end{pmatrix}.$$
En posant $u_t=2^{\,29-t}v_t$ (vecteur **entier**), la récurrence devient purement entière :
$$\boxed{\ u_{29}=(1,1),\qquad u_t=B_{1-\sigma_{t+1}}\,u_{t+1}\quad(t=28,\dots,0).\ }$$
Comme tous les $u_t$ ont des composantes positives, $\|v_t\|_1=(u_t[0]+u_t[1])/2^{29-t}$, et
$$\boxed{\ z_{30}=\frac{N}{100\cdot2^{29}},\qquad N=\sum_{t=0}^{29}\big(u_t[0]+u_t[1]\big)\,2^{\,t}\ \in\mathbb Z.\ }$$
Pour le maximiseur : $N=8761837104$, et $N/(100\cdot2^{29})=547614819/3355443200$ exactement. **Aucune erreur d'arrondi** : tout est en entiers (les $B_i$ sont entières, les $u_t$ entiers, $N$ entier).

**On n'a jamais remplacé la commande de l'adversaire par une moyenne.** L'adversaire choisit une séquence de modes **déterministe** (pire-cas), et pour chaque $t$ la perturbation est choisie au pire de la boîte via $\|v_t\|_1$ (dual de la norme $\ell_\infty$ sur la boîte). Aucune espérance, aucune matrice moyenne $\bar A$ n'intervient.

---

## Pièges traités
- **Modes stables $\ne$ commutation stable** : $\rho(A_0A_1)>1$ malgré $\rho(A_i)=1/2$.
- **JSR $\ne$ rayon spectral d'un produit** : $\widehat\rho=\sqrt{\rho(A_0A_1)}=(1+\sqrt2)/2$, pas $\rho(A_0A_1)$.
- **$d=2$ insuffisant** : le pire cas utilise des blocs de longueur exactement $2$ (taux $1.0291>1$).
- **Préfixe final court** : absorbé dans la constante $C$, ne détruit pas la stabilité uniforme.
- **Exhaustivité** : $10970$ séquences de blocs, pas $2^{30}$.
- **Sûreté finie $\ne$ stabilité** : $4/25$ est violé malgré la stabilité du système contraint.
- **Exactitude** : récurrence entière, aucune moyenne de matrices.

## Limites / impossibilités
- La borne $4/25$ **ne peut pas** être garantie : le pire cas l'excède de $0.0032$.
- Le rayon spectral joint $\widehat\rho=(1+\sqrt2)/2>1$ interdit toute stabilité sous commutation arbitraire ; seule une contrainte de séjour ($d\ge3$) la restaure.
- Le taux $c_3\approx0.91668$ est **optimal** pour $d=3$ (atteint par l'alternance de blocs de longueur $3$) ; on ne peut pas garantir mieux avec $d=3$.
- La constante transitoire $C\approx1.4571$ est intrinsèque (préfixe court) et ne peut être réduite à $1$.
# Réponse finale

## Résultats exacts

**Q1 — Stabilité des modes, commutation, rayon spectral joint.**
- Chaque mode est asymptotiquement stable : $\rho(A_0)=\rho(A_1)=\tfrac12<1$ (spectre $\{1/2,1/2\}$).
- La commutation arbitraire est **instable** : $\rho(A_0A_1)=\tfrac34+\tfrac{\sqrt2}{2}\approx1.4571>1$.
- Rayon spectral joint exact :
$$\boxed{\ \widehat\rho=\frac{1+\sqrt2}{2}\approx1.2071\ }$$
atteint par le mot périodique $(0,1)$ répété.

**Q2 — Temps de séjour minimal.**
$$\boxed{\ d_{\min}=3,\qquad \text{taux de contraction } c_3=\Big(\tfrac{19}{64}+\tfrac{3\sqrt{10}}{32}\Big)^{1/6}\approx0.91668\ }$$
$d=2$ échoue (taux $\rho(A_0^2A_1^2)^{1/4}\approx1.0291>1$).

**Q3 — Maximum de l'audit fini.**
$$\boxed{\ \max z_{30}=\frac{547614819}{3355443200}\approx0.163202\ }$$
Deux maximiseurs symétriques : $(0^{18},1^3,0^3,1^3,0^3)$ et $(1^{18},0^3,1^3,0^3,1^3)$. Perturbation optimale : $w_t=(1/100,1/100)$ pour tout $t$.

**Q4 — Maxima par nombre de changements.**

| changements | structure | $\max z_{30}$ exact | valeur |
|---|---|---|---|
| $0$ | $(30)$ | $67108863/838860800$ | $0.080000$ |
| $1$ | $(27,3)$ | $369098727/3355443200$ | $0.110000$ |
| $2$ | $(24,3,3)$ | $889192173/6710886400$ | $0.132500$ |
| $3$ | $(21,3,3,3)$ | $125697861/838860800$ | $0.149844$ |
| $4$ | $(18,3,3,3,3)$ | $547614819/3355443200$ | $0.163202$ |

**Q5 — Sûreté.** $z_{30}\le4/25$ **n'est pas garanti** : $\max z_{30}\approx0.163202>0.16$, dépassement $\approx0.003202$.

**Q6 — Récurrence entière.** $u_{29}=(1,1)$, $u_t=B_{1-\sigma_{t+1}}u_{t+1}$ avec $B_0=\begin{pmatrix}1&2\\0&1\end{pmatrix}$, $B_1=\begin{pmatrix}1&0\\2&1\end{pmatrix}$ ; $z_{30}=N/(100\cdot2^{29})$, $N=\sum_{t=0}^{29}(u_t[0]+u_t[1])2^t\in\mathbb Z$.

## Preuves et certificats

**Q1.** $A_1=A_0^{\!\top}$ (vérifié exactement). Donc $\|A_0\|_2=\|A_1\|_2=\sqrt{\lambda_{\max}(A_0^\top A_0)}=\sqrt{\tfrac34+\tfrac{\sqrt2}{2}}=\tfrac{1+\sqrt2}{2}=c$. Sous-multiplicativité $\Rightarrow\widehat\rho\le c$. Le mot $(0,1)$ répété donne $\widehat\rho\ge\rho(A_0A_1)^{1/2}=c$. Recherche exhaustive sur tous les mots de longueur $\le14$ : maximum $=c$, atteint par $(0,1)$. D'où l'égalité.

**Q2.** $\|A_0^L\|_2^2=4^{-L}\big[(2L^2+1)+\sqrt{(2L^2+1)^2-1}\big]$ décroît pour $L\ge3$, max en $L=3$ : $\|A_0^3\|_2=\|A_1^3\|_2=\sqrt{\tfrac{19}{64}+\tfrac{3\sqrt{10}}{32}}\approx0.7703<1$. Pour des blocs $L_i\ge3$, $\|B_1\cdots B_k\|_2\le\|A^3\|_2^k\le\|A^3\|_2^{n/3}$ (car $k\le n/3$), d'où le taux $\|A^3\|_2^{1/3}=c_3$. Optimalité : $(A_0^3A_1^3)^k$ donne $\rho(A_0^3A_1^3)^{1/6}=c_3$ (car $\|A_0^3A_1^3\|_2=\|A_0^3\|_2\|A_1^3\|_2$). Échec de $d=2$ : $\rho(A_0^2A_1^2)=\tfrac{9}{16}+\tfrac{\sqrt5}{4}$, taux $1.0291>1$, confirmé pire cas par énumération. Préfixe court : $\|A^L\|_2\le(1+\sqrt2)/2$ pour $L<3$, absorbé dans $C=\|A\|_2^2\approx1.4571$.

**Q3.** Dualité boîte : $\max_{w_t}(1,1)\Phi_tw_t=\tfrac1{100}\|\Phi_t^\top(1,1)\|_1$. Énumération exhaustive des $2\sum_{k=1}^5\binom{29-2k}{k-1}=10970$ séquences admissibles ; maximum exact $547614819/3355443200$, atteint par $2$ séquences. Tous les $v_t>0$ composante à composante $\Rightarrow w_t=(1/100,1/100)$. Simulation directe confirme.

**Q4.** Énumération par nombre de blocs $k+1$ ($k=0..4$), compositions de $30$ en $k+1$ parts $\ge3$, $2$ modes initiaux. Structure optimale : bloc long $30-3k$ puis $k$ blocs de longueur $3$.

**Q5.** Comparaison exacte : $547614819/3355443200-4/25=0.0032019\ldots>0$.

**Q6.** $v_t=A_{\sigma_{t+1}}^\top v_{t+1}=\tfrac12M_{t+1}v_{t+1}$ ; $u_t=2^{29-t}v_t$ entier ; $N$ entier. Pour le maximiseur $N=8761837104$, et $N/(100\cdot2^{29})=547614819/3355443200$ exactement.

## Pièges traités
- **Modes stables $\ne$ commutation stable** : $\rho(A_0A_1)>1$ malgré $\rho(A_i)=1/2$.
- **JSR $\ne$ rayon spectral d'un produit** : $\widehat\rho=\sqrt{\rho(A_0A_1)}=(1+\sqrt2)/2$.
- **$d=2$ insuffisant** : pire cas à blocs de longueur exactement $2$.
- **Préfixe final court** : absorbé dans $C$, stabilité uniforme préservée.
- **Exhaustivité** : $10970$ séquences de blocs, pas $2^{30}$.
- **Sûreté finie $\ne$ stabilité** : $4/25$ violé malgré la stabilité du système contraint.
- **Exactitude** : récurrence entière, aucune moyenne de matrices.

## Limites / impossibilités
- $z_{30}\le4/25$ **ne peut pas** être garanti (dépassement $0.0032$).
- $\widehat\rho=(1+\sqrt2)/2>1$ interdit toute stabilité sous commutation arbitraire ; seule une contrainte de séjour $d\ge3$ la restaure.
- $c_3\approx0.91668$ est **optimal** pour $d=3$ (atteint par l'alternance de blocs de longueur $3$).
- La constante transitoire $C\approx1.4571$ est intrinsèque (préfixe court) et ne peut être réduite à $1$.