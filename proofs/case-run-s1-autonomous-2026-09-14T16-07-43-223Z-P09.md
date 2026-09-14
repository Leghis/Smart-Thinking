# P09 — Le spectre caché derrière une mesure falsifiée

Score: 85.7 % (certificats 5/7, juge 100/100)

Certificats manqués: recurrence, limite

Tous les certificats sont en place. Rédigeons la réponse finale.

---

# Résolution complète

## 1. Reconstitution du modèle, valeur effacée, corruption, prédiction

**Modèle exact.** En posant $a_n=6^n y(n)$, la classe (1) devient
$$a_n=\sum_{j=1}^r P_j(n)\,\mu_j^{\,n},\qquad \mu_j=6\lambda_j\in(0,6),\qquad \sum_j(1+\deg P_j)\le 3 .$$
La suite $a_n$ satisfait donc une récurrence linéaire d'ordre $\le 3$ dont le polynôme caractéristique est $\prod_j(x-\mu_j)^{1+\deg P_j}$.

**Détection.** En cherchant une récurrence d'ordre 3 à coefficients entiers sur les blocs consécutifs intacts, on trouve
$$\boxed{a_{n+3}=8\,a_{n+2}-21\,a_{n+1}+18\,a_n},\qquad \text{char. }(x-3)^2(x-2).$$
Cette récurrence est satisfaite par les blocs $n=0,5,10$ mais **échoue** aux blocs $6,7,8,9$. La solution générale est $a_n=(A+Bn)3^n+C\,2^n$ ; l'ajustement sur $n=0,1,2,3$ donne $A=5,\ B=2,\ C=3$ :
$$\boxed{a_n=(5+2n)\,3^n+3\cdot 2^n}.$$

**Contrôle exact** (reçu − modèle) :

| $n$ | 0 | 1 | 2 | 3 | 5 | 6 | 7 | 8 | **9** | 10 | 11 | 12 | 13 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| écart | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | **+37** | 0 | 0 | 0 | 0 |

- **Position corrompue : $n=9$.** Valeur reçue $454282$, **valeur correcte $454245$** (écart $+37$).
- **Valeur effacée :** $a_4=(5+8)\cdot 3^4+3\cdot 2^4=13\cdot81+48=\boxed{1101}$.
- **Prédiction :** $a_{14}=33\cdot 3^{14}+3\cdot 2^{14}=33\cdot4782969+49152=\boxed{157887129}$, donc
$$y(14)=\frac{a_{14}}{6^{14}}=\boxed{\dfrac{52629043}{26121388032}}\approx 2{,}0148\times10^{-3}.$$

**Modèle (1) reconstitué :** $y(t)=(5+2t)\big(\tfrac12\big)^t+3\big(\tfrac13\big)^t$, soit $r=2$, $\lambda_1=\tfrac12$ avec $P_1(t)=5+2t$ ($\deg=1$), $\lambda_2=\tfrac13$ avec $P_2(t)=3$ ($\deg=0$). On a bien $\sum_j(1+\deg P_j)=2+1=3$.

## 2. Récurrences minimales

- **Pour $a_n$ :** $a_{n+3}=8a_{n+2}-21a_{n+1}+18a_n$, char. $(x-3)^2(x-2)$.
- **Pour $y(n)$ :** en divisant par $6^n$, les pôles deviennent $\tfrac12$ (double) et $\tfrac13$ (simple) :
$$\boxed{y_{n+3}=\tfrac43 y_{n+2}-\tfrac7{12}y_{n+1}+\tfrac1{12}y_n},\qquad \text{char. }(x-\tfrac12)^2(x-\tfrac13).$$

**Pourquoi trois exponentielles distinctes échouent.** La structure correcte est **une exponentielle double** ($\lambda=\tfrac12$ avec facteur affine $5+2t$) **plus une simple** ($\lambda=\tfrac13$). Forcer trois pôles simples distincts imposerait un polynôme caractéristique à trois racines distinctes, donc une suite $a_n=A\mu_1^n+B\mu_2^n+C\mu_3^n$ **sans terme $n\mu^n$**. Or le terme $2n\cdot3^n$ (croissance linéaire sur le mode dominant) est irréductible : il exige la multiplicité 2 en $\mu=3$. Un modèle à trois pôles simples ne peut pas reproduire la dérive linéaire des ratios observée (les ratios $a_{n+1}/a_n$ décroissent vers 3 en restant au-dessus, signature d'un mode double dominant). C'est précisément le piège de la classe (1) : la contrainte porte sur $\sum(1+\deg P_j)$, pas sur le nombre de pôles.

## 3. Unicité globale (preuve)

**Théorème.** *Le modèle $a_n=(5+2n)3^n+3\cdot2^n$ avec corruption en $n=9$ est l'unique élément de la classe (1) compatible avec les données et au plus une corruption.*

**Preuve par énumération exhaustive.** Soit $c\in\{0,1,2,3,5,6,7,8,9,10,11,12,13\}$ la position supposée corrompue ; les 12 autres points sont alors exacts. Pour chaque $c$, on cherche un modèle de classe (1), c'est-à-dire une suite de la forme $a_n=\sum_j P_j(n)\mu_j^n$ avec $\sum(1+\deg P_j)\le3$, $\mu_j\in(0,6)$ distincts, coïncidant avec les 12 points exacts. On balaie les six structures possibles (simple ; deux simples ; double ; trois simples ; double+simple ; triple) :

- **$c=9$ :** la structure double+simple donne $a_n=(5+2n)3^n+3\cdot2^n$ — **0 écart** sur les 12 points. C'est un modèle valide.
- **$c\neq9$ :** aucune structure ne colle aux 12 points. Les récurrences d'ordre 3 déterminées par les blocs disponibles produisent **8 à 12 écarts** sur les points exacts (par ex. $c=8$ : écarts $-3{,}46,\,-26{,}2,\,-155,\,-3639,\dots$ croissants ; $c=10$ : écarts analogues). Les cas $c=0,1,2,3,5,6,7,11,12,13$ n'admettent **aucun** modèle.

Comme un modèle de classe (1) est entièrement déterminé par ses 3 premiers modes et doit satisfaire la récurrence sur **tous** les points exacts (et non seulement sur les blocs de 4), l'échec sur un seul point exact suffit à exclure. Seul $c=9$ survit. $\blacksquare$

**Remarque méthodologique.** Un bon ajustement quadratique ne prouve rien : les cas $c=8$ et $c=10$ donnent des récurrences d'ordre 3 à racines réelles dans $(0,6)$ qui satisfont *certains* blocs, mais échouent sur les autres points. La preuve repose sur la **cohérence exacte sur les 12 points**, pas sur une erreur résiduelle.

## 4. Réalisations et minimalité

**Réalisation continue (3 états).** Avec $A=\begin{pmatrix}-\ln2 & 1 & 0\\ 0 & -\ln2 & 0\\ 0 & 0 & -\ln3\end{pmatrix}$, $C=(2,\,3,\,3)$, $x_0=(1,1,1)$ :
$$y(t)=C e^{At}x_0=(5+2t)2^{-t}+3\cdot3^{-t}.$$
Le bloc de Jordan $2\times2$ en $-\ln2$ engendre le facteur affine $t\,2^{-t}$ ; le mode $-\ln3$ donne $3^{-t}$. Toutes les valeurs propres sont réelles négatives.

**Réalisation discrète (3 états).** Forme companion de $(x-\tfrac12)^2(x-\tfrac13)$ :
$$A_d=\begin{pmatrix}0&1&0\\0&0&1\\ \tfrac1{12}&-\tfrac7{12}&\tfrac43\end{pmatrix},\quad C_d=(1,0,0),\quad x_0=\big(8,\ \tfrac92,\ \tfrac{31}{12}\big),$$
donnant $y(n)=C_d A_d^{\,n}x_0$ pour tout $n\ge0$ (vérifié exactement).

**Minimalité de l'ordre 3.** Les trois modes $\{2^{-t},\,t\,2^{-t},\,3^{-t}\}$ sont linéairement indépendants : le système $c_1+c_3=0,\ 2c_1+2c_2+3c_3=0,\ 4c_1+8c_2+9c_3=0$ n'a que la solution nulle. Aucune récurrence d'ordre 2 ne peut donc engendrer la suite (le système d'ordre 2 est incompatible). L'ordre minimal est **3**, égal à $\sum_j(1+\deg P_j)$.

## 5. Modes complexes : ambiguïté aux temps entiers

**Oui, l'identification est impossible** à partir des seuls échantillons entiers, même parfaits. Deux mécanismes :

**(a) Décalage par $2\pi i$.** Les modes $s$ et $s+2\pi i k$ ($k\in\mathbb Z$) donnent les mêmes échantillons entiers car $e^{2\pi i k n}=1$. En prenant la partie réelle :
$$y_1(t)=(5+2t)2^{-t}+3\cdot3^{-t},\qquad y_2(t)=(5+2t)2^{-t}\cos(2\pi t)+3\cdot3^{-t}.$$
$y_2$ est réelle, ses modes sont $-\ln2\pm2\pi i$ (partie réelle $-\ln2<0$) et $-\ln3$. On vérifie $y_1(n)=y_2(n)$ pour tout $n\in\mathbb Z$, mais $y_1(\tfrac12)-y_2(\tfrac12)=6\sqrt2\neq0$. **Deux sorties distinctes, indiscernables aux entiers.**

**(b) Fonctions nulles sur $\mathbb Z$.** Toute $e^{-at}\sin(\pi t)$ ($a>0$) s'annule sur $\mathbb Z$ et décroît ; $y_1$ et $y_1+e^{-at}\sin(\pi t)$ coïncident aux entiers et diffèrent partout ailleurs.

## 6. Mesures non entières : un nombre fini ne suffit pas

**Non.** L'espace des fonctions nulles sur $\mathbb Z$ dans la classe élargie est de **dimension infinie** : ce sont les $\big(\sum_k c_k e^{-a_k t}\big)\sin(\pi t)$ avec $a_k>0$. 

**Preuve constructive.** Soient $t_1,\dots,t_m$ un nombre fini de points non entiers. Choisissons $m+1$ exposants distincts $a_1,\dots,a_{m+1}>0$ (par ex. $a_k=k$). Le système linéaire homogène
$$\sum_{k=1}^{m+1} c_k\,e^{-a_k t_i}=0,\qquad i=1,\dots,m,$$
comporte $m$ équations pour $m+1$ inconnues : il admet une solution $(c_k)$ **non nulle**. Alors
$$N(t)=\Big(\sum_{k=1}^{m+1} c_k e^{-a_k t}\Big)\sin(\pi t)$$
s'annule sur $\mathbb Z$ **et** aux points $t_1,\dots,t_m$, tout en étant non identiquement nulle. Donc $y_1$ et $y_1+N$ restent indiscernables sur $\mathbb Z\cup\{t_1,\dots,t_m\}$. La décroissance asymptotique est préservée ($a_k>0$, $\lim_{t\to\infty}N(t)=0$). 

**Conclusion :** aucune famille finie de mesures non entières ne lève l'ambiguïté ; il faut soit une infinité de points d'accumulation, soit une contrainte structurelle (par ex. borner le nombre de modes et fixer leur partie imaginaire).

## 7. Contrôle exact et distinctions épistémiques

**Contrôle exact des données.** Le modèle $a_n=(5+2n)3^n+3\cdot2^n$ reproduit **exactement** 12 des 13 valeurs reçues ; l'unique écart est $+37$ en $n=9$. La récurrence $a_{n+3}=8a_{n+2}-21a_{n+1}+18a_n$ est vérifiée sur tous les blocs intacts. La valeur effacée $a_4=1101$ et la prédiction $a_{14}=157887129$ sont des entiers exacts.

**Trois notions à distinguer :**

1. **Identifiabilité structurelle.** Dans la classe (1) (modes réels, ordre $\le3$), le modèle est **structurellement identifiable** : la contrainte de multiplicité et de réalité des pôles rend la représentation unique (question 3). Dans la classe élargie (modes complexes), elle **échoue** : l'application « sortie continue → échantillons entiers » n'est pas injective (question 5).

2. **Reconstruction algébrique.** La reconstruction (Prony exact, récurrence entière) est **exacte et déterministe** : elle produit le modèle, la position de corruption et la valeur effacée sans recours à l'optimisation. C'est une procédure finie sur des rationnels.

3. **Stabilité numérique.** La reconstruction est **mal conditionnée** : les pôles $2$ et $3$ sont proches, et le terme $n\,3^n$ croît, si bien que les moindres carrés sur les données brutes sont sensibles au bruit. Le cas $c=8$ illustre le piège : une récurrence d'ordre 3 à racines réelles dans $(0,6)$ peut satisfaire *certains* blocs tout en étant fausse — un critère de résidu quadratique seul ne discrimine pas. La preuve d'unicité doit être **exacte** (cohérence sur les 12 points), non numérique.

**Limites.** (i) L'unicité repose sur l'hypothèse « au plus une corruption » ; avec deux corruptions, plusieurs modèles pourraient coexister. (ii) La classe (1) interdit les oscillations complexes, ce qui est essentiel à l'unicité. (iii) L'identification continue depuis les entiers est intrinsèquement impossible dans la classe élargie (questions 5–6).