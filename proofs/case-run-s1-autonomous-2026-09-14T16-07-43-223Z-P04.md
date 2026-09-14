# P04 — La logistique contre un futur adversarial

Score: 80.0 % (certificats 3/5, juge 100/100)

Certificats manqués: politiques, par_stock

Tous les résultats sont confirmés. f(t) est décroissante sur [1/20, 3/10] pour la politique optimale, avec maximum à t=1/20. Je peux maintenant rédiger la réponse finale complète.

# Résolution exacte du problème min-max

## Cadre et méthode

L'espace des politiques déterministes est fini : $7\times 6\times 6\times 6 = 1512$ politiques $\pi=(x,h,u_A,u_B)$. Pour chaque politique, les quatre coûts $C_i$ sont des rationnels exacts. Le critère $J(\pi)=\max_t f_\pi(t)$ avec $f_\pi(t)=\E_{p(t)}[C]+\CVaR_{0,8}^{p(t)}(C)$.

**Structure clé.** $p(t)$ est affine en $t$. Pour $\eta$ fixé, $g_\eta(t)=\eta+5\sum_i p_i(t)(C_i-\eta)_+$ est affine en $t$. Donc $\CVaR_{0,8}^{p(t)}(C)=\min_{\eta\in\{C_1,\dots,C_4\}}g_\eta(t)$ est un **minimum de fonctions affines**, donc **concave** en $t$ ; $\E_{p(t)}[C]$ est affine. Ainsi $f_\pi$ est concave, linéaire par morceaux en $t$. Son maximum sur $[1/20,3/10]$ est atteint soit aux extrémités, soit à un point de rupture $t_0$ où deux $g_\eta$ se croisent. J'ai énuméré exactement ces points (fractions) pour chaque politique.

---

## Question 1 — Optimum, unicité, coûts, loi adversaire

**Politique optimale (unique) :**
$$\boxed{\pi^\star=(x,h,u_A,u_B)=(9,\,4,\,0,\,4)}$$

**Coûts par scénario** (calculés via (1)) :

| $i$ | $a_i$ | $d_i$ | $s_i$ | $u$ | $b_i$ | $C_i$ |
|---|---|---|---|---|---|---|
| 1 (A, froid) | 2 | 2 | 0 | 0 | 7 | $687/10=68{,}7$ |
| 2 (A, chaud) | 2 | 5 | 2 | 0 | 5 | $737/10=73{,}7$ |
| 3 (B, froid) | 4 | 3 | 0 | 4 | 9 | $917/10=91{,}7$ |
| 4 (B, chaud) | 4 | 6 | 1 | 4 | 6 | $977/10=97{,}7$ |

Détail : $x=9\Rightarrow \tfrac7{10}x^2+x=56{,}7+9=65{,}7$ ; $2h=8$ ; $6u_B=24$. Scénario 4 : $b=\max(0,9-4-1)+\lfloor 4/2\rfloor=4+2=6$, pénurie $6-6=0$. Scénario 3 : $b=\max(0,9-4)+4=9$, surplus $9-3=6$ valorisé $6$.

**Loi adversaire :** $t^\star=1/20$, soit
$$p^\star=\big(\tfrac9{20},\tfrac1{20},\tfrac15,\tfrac3{10}\big).$$

**Valeur du critère :**
$$\boxed{J^\star=\tfrac{3599}{20}=179{,}95.}$$

Décomposition à $t^\star$ : $\E_{p^\star}[C]=\tfrac{329}{4}=82{,}25$ et $\CVaR_{0,8}^{p^\star}(C)=\tfrac{977}{10}=97{,}7$, d'où $82{,}25+97{,}7=179{,}95$.

**Unicité :** l'énumération des 1512 politiques donne **exactement une** politique atteignant $3599/20$ : $(9,4,0,4)$.

---

## Question 2 — Certificat fini d'optimalité

**Certificat par énumération exhaustive.** L'espace est fini (1512 politiques) et le continuum de lois est traité exactement :

1. Pour chaque politique, $f_\pi$ est concave PL en $t$ ; ses points de rupture sont les $t_0\in[1/20,3/10]$ solutions de $g_{\eta}(t)=g_{\eta'}(t)$ pour $\eta,\eta'\in\{C_1,\dots,C_4\}$ (au plus $\binom42=6$ intersections). On évalue $f_\pi$ en ces points et aux deux extrémités ; le max est exact.
2. Le minimum sur les 1512 valeurs est $3599/20$, atteint uniquement par $(9,4,0,4)$.

**Meilleur résultat par $x$** (min sur $h,u_A,u_B$) :

| $x$ | $J^\star(x)$ | politique optimale pour ce $x$ |
|---|---|---|
| 4 | $1931/10=193{,}1$ | $(4,4,0,4)$ |
| 5 | $4083/20=204{,}15$ | $(5,4,0,4)$ |
| 6 | $1939/10=193{,}9$ | $(6,4,0,4)$ |
| 7 | $3729/20=186{,}45$ | $(7,4,0,4)$ |
| 8 | $909/5=181{,}8$ | $(8,4,0,4)$ |
| **9** | $\mathbf{3599/20=179{,}95}$ | $(9,4,0,4)$ |
| 10 | $729/4=182{,}25$ | $(10,2,0,2)$ |

Le profil est non monotone : $x=5$ est le pire (surstock coûteux), $x=9$ le meilleur. Le minimum global est bien en $x=9$.

---

## Question 3 — Suffit-il de tester les extrémités ?

**Non.** C'est une **réfutation** : $f_\pi$ est concave en $t$, donc son maximum peut être **intérieur**. L'énumération montre que **98 politiques** ont un maximum intérieur strictement supérieur aux deux extrémités.

**Contre-exemple admissible explicite :** $\pi=(4,0,0,0)$ (donc $x=4,h=0,u_A=u_B=0$). Coûts : $C=(106/5,\,106/5,\,106/5,\,106/5)$? Non — calculons : $x=4\Rightarrow \tfrac7{10}\cdot16+4=15{,}2$ ; $h=u=0$. Scénario 1 : $b=2$, $d=2$, $C=15{,}2$. Scénario 2 : $b=\max(0,4-2-2)=0$, pénurie $5$, $C=15{,}2+100=115{,}2$. Scénario 3 : $b=0$, pénurie $3$, $C=15{,}2+60=75{,}2$. Scénario 4 : $b=\max(0,4-4-1)=0$, pénurie $6$, $C=15{,}2+120=135{,}2$.

Valeurs exactes du critère :
$$f(1/20)=\tfrac{1017}{5}=203{,}4,\quad f(3/10)=\tfrac{992}{5}=198{,}4,\quad \max_t f=\tfrac{1037}{5}=207{,}4.$$
Le maximum est atteint au point de rupture intérieur $t=3/20$, strictement au-dessus des deux extrémités. **Tester seulement $t\in\{1/20,3/10\}$ sous-estime donc $J$ de $207{,}4-203{,}4=4$ pour cette politique** — et fausserait la sélection de la politique optimale.

---

## Question 4 — Pire espérance seule

En ne gardant que $\max_t \E_{p(t)}[C]$ (fonction affine en $t$, donc max aux extrémités), l'optimum est :
$$\boxed{\min_\pi\max_t\E_{p(t)}[C]=\tfrac{326}{5}=65{,}2,\quad \pi^{\text{esp}}=(4,3,0,3).}$$
Coûts : $C=(106/5,\,606/5,\,196/5,\,696/5)$.

**Comparaison.** La politique change radicalement : $(4,3,0,3)$ (petit stock, transport modéré) contre $(9,4,0,4)$ pour le critère (3). Le critère espérance ignore le risque de queue : il choisit un stock minimal $x=4$ car l'espérance est dominée par les scénarios froids probables, alors que le CVaR pénalise lourdement les pénuries chaudes (scénarios 2 et 4), poussant vers $x=9$ et $u_B=4$. Les deux critères ne sont donc **pas** cohérents ici.

---

## Question 5 — Relaxation clairvoyante

On choisit $u_i\in\{0,\dots,h\}$ **séparément par scénario** (information complète), $x,h$ restant choisis avant le signal. Optimum :
$$\boxed{J^{\text{cl}}=\tfrac{3519}{20}=175{,}95,\quad (x,h)=(9,4),}$$
avec $C=(687/10,\,737/10,\,717/10,\,977/10)$ (seul le scénario 3 s'améliore : $u_3=2$ au lieu de $4$, coût $917/10\to717/10$).

**Écart :** $J^\star-J^{\text{cl}}=\tfrac{3599}{20}-\tfrac{3519}{20}=\boxed{4}$.

**Inadmissibilité.** Dans le problème original, $u_G$ est choisi **avant** de connaître $K$ (froid/chaud) : une seule valeur $u_A$ doit servir les scénarios 1 et 2, et une seule $u_B$ les scénarios 3 et 4. La relaxation clairvoyante suppose de distinguer $u$ selon le scénario complet, ce qui **viole la contrainte d'information** (non-anticipativité). Elle fournit donc une **borne inférieure** $J^{\text{cl}}\le J^\star$ (ici $175{,}95\le179{,}95$), utile comme certificat de qualité mais non réalisable.

---

## Question 6 — Atome chevauchant la frontière des pires 20 %

**Le problème.** $\CVaR_{0,8}$ correspond à la moyenne des pires $20\,\%$ de la loi. Si un atome $p_i$ est tel que la frontière $0{,}2$ tombe **à l'intérieur** de cet atome, une « moyenne tronquée naïve » (prendre les scénarios jusqu'à cumuler $0{,}2$) est mal définie : on ne peut pas couper un atome.

**Exemple dans cette instance.** Pour $\pi^\star$ à $t^\star=1/20$, $p^\star=(9/20,1/20,1/5,3/10)$ et $C=(68{,}7;73{,}7;91{,}7;97{,}7)$. Le pire atome est $C_4=97{,}7$ avec $p_4=3/10=0{,}3>0{,}2$ : la frontière $0{,}2$ est **entièrement contenue** dans cet atome.

**Traitement correct (Rockafellar–Uryasev).** On n'utilise jamais de troncature naïve ; on résout
$$\CVaR_{0,8}^{p}(C)=\min_{\eta\in\R}\Big\{\eta+5\sum_i p_i(C_i-\eta)_+\Big\}.$$
Comme $C$ est discret, l'optimum est atteint en un $\eta=C_i$ (les $g_\eta$ sont PL, le min est en un point de rupture). Ici $\eta^\star=C_4=97{,}7$ et $\CVaR=97{,}7$ : l'atome chevauchant est **entièrement** dans la queue, sans fractionnement.

**Algorithme exact reproductible :**
1. Trier les scénarios par $C_i$ décroissant.
2. Calculer $\eta^\star=\min_{i}\big\{C_i+5\sum_j p_j(C_j-C_i)_+\big\}$ (évaluation sur les 4 candidats $C_i$).
3. Retourner $\eta^\star+5\sum_j p_j(C_j-\eta^\star)_+$.

Cette procédure est exacte pour tout atome, qu'il chevauche ou non la frontière, et coïncide avec la moyenne tronquée lorsque la frontière tombe entre deux atomes.

---

## Contrôles et limites

**Contrôles effectués.** (i) Énumération exhaustive des 1512 politiques (aucune omission). (ii) Max sur $t$ exact via points de rupture rationnels, pas de grille approchée. (iii) Vérification indépendante : $f_\pi$ décroissante sur $[1/20,3/10]$ pour $\pi^\star$ (max à $t=1/20$), cohérente avec l'argmax. (iv) CVaR recalculé par la formule RU et par min sur $\eta\in\{C_i\}$ : identiques. (v) Écart clairvoyant $=4$ vérifié par différence exacte.

**Limites.** (a) L'unicité de $\pi^\star$ est établie **par énumération** (certificat fini), non par un argument analytique général. (b) La concavité de $f_\pi$ garantit que le max est en un point de rupture ou une extrémité, mais **pas** que les extrémités suffisent (Q3). (c) La relaxation clairvoyante n'est qu'une borne inférieure, non réalisable. (d) Tous les résultats sont conditionnels aux hypothèses énoncées (coûts abstraits, loi (2), randomisation interdite) ; toute modification de la famille $p(t)$ ou des bornes de $x,h$ invaliderait ces valeurs.