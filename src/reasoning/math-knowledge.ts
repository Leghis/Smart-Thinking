/**
 * Curated mathematics knowledge base (classical results only, no problem
 * answers). Gives the calling LLM reliable theory references for advanced
 * analysis/algebra so it can build rigorous derivations instead of guessing.
 */

export interface KnowledgeEntry {
  id: string;
  domain: string;
  title: string;
  keywords: string[];
  content: string;
}

const ENTRIES: KnowledgeEntry[] = [
  {
    id: 'weierstrass-p-definition',
    domain: 'complex-analysis',
    title: 'Weierstrass ℘ : définition et convergence',
    keywords: ['weierstrass', 'p', '℘', 'elliptique', 'réseau', 'lattice', 'série', 'convergence', 'pôle'],
    content: [
      'Pour un réseau Λ = Zω1 + Zω2 (ω1/ω2 ∉ R) : ℘(z) = 1/z² + Σ_{ω∈Λ\\{0}} [1/(z-ω)² − 1/ω²].',
      'La convergence est absolue et uniforme sur tout compact de C\\Λ : le terme général est O(|ω|^{-3}) pour |ω| grand, et le nombre de points du réseau dans une couronne j ≤ |ω| < j+1 est O(j).',
      '℘ est méromorphe, paire, de périodes ω1 et ω2, avec un pôle double en chaque point du réseau. La fonction dérivée ℘′(z) = −2 Σ_{ω∈Λ} 1/(z-ω)³ est impaire et périodique.',
      'Les deux fractions d\'un même terme de la série ne doivent pas être séparées (chaque série séparée diverge).',
    ].join('\n'),
  },
  {
    id: 'weierstrass-p-differential',
    domain: 'complex-analysis',
    title: 'Équation différentielle de ℘ et invariants',
    keywords: ['équation différentielle', 'invariants', 'g2', 'g3', 'weierstrass', '℘′'],
    content: [
      '℘′(z)² = 4℘(z)³ − g₂℘(z) − g₃ avec g₂ = 60 Σ\' 1/ω⁴ et g₃ = 140 Σ\' 1/ω⁶.',
      'En dérivant : ℘″(z) = 6℘(z)² − g₂/2.',
      'Les valeurs aux demi-périodes e₁ = ℘(ω1/2), e₂ = ℘(ω2/2), e₃ = ℘((ω1+ω2)/2) sont les racines de 4t³ − g₂t − g₃ = 0, et e₁+e₂+e₃ = 0, e₁e₂+e₂e₃+e₃e₁ = −g₂/4, e₁e₂e₃ = g₃/4.',
      '℘′(ω/2) = 0 pour toute demi-période ω (la dérivée s\'annule aux points de 2-torsion).',
    ].join('\n'),
  },
  {
    id: 'square-lattice-halves',
    domain: 'complex-analysis',
    title: 'Réseau carré Λ = Z[i] : valeurs remarquables',
    keywords: ['réseau carré', 'square lattice', 'z[i]', 'lemniscate', 'gamma 1/4', 'demi-période'],
    content: [
      'Pour Λ = Z + iZ : e₁ = ℘(1/2) = c > 0, e₂ = ℘(i/2) = 0, e₃ = ℘((1+i)/2) = −c, donc g₃ = 0 et g₂ = 4c².',
      'La constante de lemniscate vérifie c = Γ(1/4)⁴/(8π) = ϖ², où ϖ = 2∫₀¹ dt/√(1−t⁴) est la constante de lemniscate.',
      'Vérification : pour le réseau carré, ∫_e^∞ dv/√(4v³−4c²v) = 1/2 se calcule avec s = v/c puis r = s⁻¹/²·… et donne √c = ∫₀¹ dt/√(1−t⁴) = Γ(1/4)Γ(1/2)/(2^{3/2}π^{1/2}) pour Γ(1/2)=√π et la formule de réflexion Γ(1/4)Γ(3/4) = π√2.',
      'La rotation iΛ = Λ donne ℘(iz) = −℘(z) et ℘′(iz) = i℘′(z).',
    ].join('\n'),
  },
  {
    id: 'weierstrass-duplication',
    domain: 'complex-analysis',
    title: 'Duplication et addition de Weierstrass',
    keywords: ['duplication', 'addition', 'weierstrass', 'x(2z)', 'formule'],
    content: [
      'Formule de duplication : ℘(2z) = −2℘(z) + (1/4)·(℘″(z)/℘′(z))².',
      'En utilisant ℘″ = 6℘² − g₂/2 et ℘′² = 4℘³ − g₂℘ − g₃, elle s\'écrit ℘(2z) = R(℘(z)) où R est une fraction rationnelle en t = ℘(z) qui ne dépend que des invariants.',
      'Addition : ℘(u+v) = −℘(u) − ℘(v) + (1/4)·[(℘′(u) − ℘′(v))/(℘(u) − ℘(v))]² (si u ≠ ±v mod Λ).',
      'Ces formules sont des identités de fonctions méromorphes : elles se vérifient en comparant les développements en série ou par le lemme d\'identité.',
    ].join('\n'),
  },
  {
    id: 'zeros-of-p-minus-a',
    domain: 'complex-analysis',
    title: 'Zéros de ℘ − a et injectivité modulo ±',
    keywords: ['zéros', 'degré', 'maille', 'période', 'injectif', '℘(u)=℘(v)'],
    content: [
      'Dans une maille fondamentale, ℘ − a possède exactement deux zéros comptés avec multiplicité (l\'unique pôle est double).',
      'Conséquence : ℘(u) = ℘(v) ⟺ u ≡ v ou u ≡ −v (mod Λ).',
      'Si ℘′(u) ≠ 0, les deux zéros sont simples et distincts ; si ℘′(u) = 0, u ≡ −u (mod Λ) et le zéro est double.',
      'La paire (℘(u), ℘′(u)) caractérise u modulo Λ : ℘(u)=℘(v) et ℘′(u)=℘′(v) ⟹ u−v ∈ Λ.',
    ].join('\n'),
  },
  {
    id: 'jacobi-relation',
    domain: 'complex-analysis',
    title: 'Relation ℘ ↔ sn de Jacobi (cas g₃ = 0)',
    keywords: ['jacobi', 'sn', 'elliptique', 'relation', 'g3', 'numérique'],
    content: [
      'Si g₃ = 0 (réseau rectangulaire/carré), avec e₁ > e₂ > e₃ et m = (e₂−e₃)/(e₁−e₃) :',
      '℘(z) = e₁ + (e₁−e₃)/sn²(√(e₁−e₃)·z | m), avec sn la fonction elliptique de Jacobi de paramètre m.',
      'Pour le réseau carré : e₁ = c, e₂ = 0, e₃ = −c, donc m = 1/2 et ℘(z) = −c + 2c/sn²(√(2c)·z | 1/2).',
      'Cette forme est utile pour les vérifications numériques haute précision (mpmath.ellipfun("sn", u, m)).',
    ].join('\n'),
  },
  {
    id: 'gaussian-integers-eisenstein',
    domain: 'algebra',
    title: 'Entiers de Gauss et critère d\'Eisenstein',
    keywords: ['gauss', 'z[i]', 'eisenstein', 'irréductible', 'norme', 'anneau euclidien', 'premier'],
    content: [
      'Z[i] est euclidien pour la norme N(a+bi) = a²+b², donc factoriel et intégralement clos.',
      'Un élément α est premier si N(α) est un nombre premier rationnel (réciproque fausse pour p ≡ 1 mod 4, somme de deux carrés).',
      'Critère d\'Eisenstein dans Z[i] : si P(u) = u^n + a_{n−1}u^{n−1} + … + a₀ a tous ses coefficients non dominants divisibles par un premier α et a₀ non divisible par α², alors P est irréductible sur Q(i).',
      'Le passage au polynôme réciproque H(u) = u^n P(1/u) préserve l\'irréductibilité lorsque le terme constant est non nul.',
    ].join('\n'),
  },
  {
    id: 'minimal-polynomial-rational',
    domain: 'algebra',
    title: 'Degré algébrique, polynôme minimal, passage Q(i) → Q',
    keywords: ['polynôme minimal', 'degré algébrique', 'irréductible', 'conjugué', 'q(i)', 'galois'],
    content: [
      'Le polynôme minimal d\'un nombre algébrique t sur un corps K est le polynôme unitaire irréductible de K[t] s\'annulant en t ; son degré est [K(t):K].',
      'Si t annule P ∈ Q[t] irréductible de degré n, alors P est le polynôme minimal (à normalisation près).',
      'Si Q ∈ Q(i)[t] est irréductible et Q* son conjugué (i ↦ −i) est distinct et non associé, alors Q·Q* ∈ Q[t] est irréductible sur Q (la conjugaison échange les deux facteurs et un facteur rationnel devrait les contenir tous les deux).',
      'Le représentant primitif entier P de Q·Q* n\'est unitaire que si son coefficient dominant vaut 1 ; sinon le polynôme minimal est P/P(1) si P est normalisé, ou P divisé par son coefficient dominant (ici P = 17·(polynôme unitaire)).',
    ].join('\n'),
  },
  {
    id: 'gaussian-enumeration-method',
    domain: 'algebra',
    title: 'Énumérer les z du carré fondamental avec αz ∈ Z[i]',
    keywords: ['énumération', 'entier de gauss', 'congruence', 'carré fondamental', 'lattice_solve', 'alpha z'],
    content: [
      'Soit α = a + bi ∈ Z[i] de norme N = a²+b². On cherche z ∈ (0,1)² (carré semi-ouvert) tel que αz ∈ Z[i].',
      'Écrire z = (u + iv)/N avec u,v entiers ; la condition devient au − bv ≡ 0 (mod N) et av + bu ≡ 0 (mod N), soit v ≡ −b·a⁻¹·u (mod N) (a inversible si N premier, par exemple N = 17).',
      'Pour chaque u ∈ {1,…,N−1} il existe un unique v ∈ {0,…,N−1} : la liste est exhaustive.',
      'Utiliser cas(operation="lattice_solve", a=…, b=…) pour obtenir directement les paires (u,v) et les points z=(u+iv)/N.',
      'Le signe de b (donc α = 4+i ou 4−i) doit être fixé par un argument supplémentaire (dérivée, orientation) : les deux familles sont distinctes.',
    ].join('\n'),
  },
  {
    id: 'lattice-counting',
    domain: 'algebra',
    title: 'Dénombrement dans un carré fondamental et congruences',
    keywords: ['dénombrement', 'congruence', 'bijection', 'carré fondamental', 'modulo'],
    content: [
      'Si (a+bi)z ∈ Λ avec a,b entiers, alors z = (a−bi)(m+ni)/(a²+b²) a des coordonnées rationnelles de dénominateur a²+b².',
      'L\'application (m,n) ↦ z mod Λ induit une bijection entre les classes du quotient et les points du carré fondamental, d\'où l\'exhaustivité et le comptage exact.',
      'Pour un module premier p, la congruence b ≡ k·a (mod p) définit une permutation de {0,…,p−1} ; pour chaque a ≠ 0 il existe un unique b.',
      'Un point z = 0 est exclu si le domaine exclut l\'origine : dans le comptage, exclure a = 0 (qui force b = 0).',
    ].join('\n'),
  },
  {
    id: 'numerical-verification',
    domain: 'numerics',
    title: 'Vérification numérique haute précision',
    keywords: ['numérique', 'précision', 'mpmath', 'résidu', 'vérification', 'precision'],
    content: [
      'Une vérification numérique ne remplace pas une preuve mais détecte les erreurs : évaluer Q(X(z_k)) avec 60–100 chiffres significatifs et exiger un résidu < 10^-40.',
      'Utiliser des fonctions elliptiques stables (mpmath.ellipfun("sn", u, m)) plutôt que des sommes de réseaux tronquées.',
      'Vérifier aussi les identités polynomiales par calcul symbolique exact (sympy.expand(lhs − rhs) == 0) : c\'est décisif et instantané.',
    ].join('\n'),
  },
  {
    id: 'polynomial-equation-multiplication',
    domain: 'methodology',
    title: 'Relier Q(X(z))=0 à une multiplication complexe',
    keywords: ['multiplication', 'équation polynomiale', 'duplication', 'factorisation', 'signe', 'dérivée', 'q(x)'],
    content: [
      'Si X est une fonction elliptique avec duplication X(2z)=R(X(z))=N₂(t)/D₂(t), alors X(4z)=R(R(X(z)))=T(X(z)) avec T(t)=N(t)/D(t).',
      'Pour résoudre Q(X(z))=0, chercher les points où X(4z)=±X(z) : calculer (T(t)−t)·D(t) et (T(t)+t)·D(t), puis FACTORISER (cas operation="factor").',
      'Si l\'un des deux produits est exactement Q(t)·Q*(t) (où Q* est Q avec coefficients conjugués), l\'équivalence avec une multiplication est établie : T(t)=−t ⟺ Q(t)Q*(t)=0, car Q et Q* n\'ont pas de racine commune (sans quoi D s\'annulerait).',
      'Le SIGNE de l\'entier de Gauss se choisit par la dérivée : dériver T et évaluer T\'(t) aux racines; T\'(t)=−4i (par exemple) sélectionne α=4+i, tandis que +4i sélectionne α=4−i. Vérifier la cohérence avec X\'(4z)=T\'(X(z))X\'(z).',
      'Toutes ces étapes sont exactes et mécaniques : utilise cas(verify_identity) pour chaque égalité polynomiale et cas(factor) pour la factorisation.',
    ].join('\n'),
  },
  {
    id: 'crt-valuations-hensel',
    domain: 'algebra',
    title: 'CRT, valuations et Hensel (général)',
    keywords: ['crt', 'chinois', 'valuation', 'hensel', 'puissance première', 'racines modulo', 'multiplicité'],
    content: [
      'Pour résoudre F(x) ≡ 0 mod N avec N = ∏ p_i^{e_i}, résoudre séparément mod chaque p_i^{e_i} puis recombiner par le théorème chinois (les multiplicités CRT comptent).',
      'Les racines mod p^e se relèvent depuis mod p par Hensel quand F\'(r) ≢ 0 (mod p) ; sinon il faut une analyse de valuation : si v_p(F(r)) ≥ 2 v_p(F\'(r)) alors le nombre de relevés change (0, 1 ou p^{k} selon le cas).',
      'Dans Z/NZ non intègre, un produit nul n\'implique pas un facteur nul : traiter les valuations par composante première.',
      'Toujours fournir les valeurs entières exactes et un certificat de comptage (multiplicités comprises).',
    ].join('\n'),
  },
  {
    id: 'serializability-theory',
    domain: 'methodology',
    title: 'Sérialisabilité, snapshots et effets externes',
    keywords: ['sérialisabilité', 'transaction', 'snapshot', 'isolation', 'exactly-once', 'fencing', 'idempotence', 'outbox'],
    content: [
      'Une exécution est sérialisable si le graphe de conflits (lecture-écriture) est acyclique : exhiber l\'ordre sérialisable équivalent est la preuve canonique.',
      'Snapshot isolation autorise des anomalies de write skew : distinguer « chaque transaction voit un instantané cohérent » de « il existe un ordre sérialisable global ».',
      'Un effet externe irréversible (email, paiement) ne peut pas être annulé par un rollback : il exige idempotence + outbox/transactionnel ou une compensation explicite.',
      'Ne pas confondre fencing token (empêche l\'écriture périmée), idempotence (rejoue sans effet double), autorisation (droit d\'agir) et budget (ressource limitée).',
      'Pour vérifier : énumérer les sous-ensembles/témoins pertinents et prouver l\'impossibilité des ordres restants, pas seulement vérifier les cycles courts.',
    ].join('\n'),
  },
  {
    id: 'partial-identification',
    domain: 'methodology',
    title: 'Identification partielle et mesure imparfaite',
    keywords: ['identification partielle', 'ate', 'late', 'instrument', 'contrefactuel', 'monotonie', 'borne'],
    content: [
      'Sans hypothèse d\'identification forte, l\'effet causal n\'est pas ponctuellement identifié : on calcule des bornes (inégalités de probabilités, LP).',
      'Outils standard : bornes de Manski, monotonie, exclusion restriction, instrument (LATE pour les compliers), contraintes de positivité.',
      'Une mesure imparfaite Y* induit des bornes supplémentaires : exprimer P(Y|D,Z) en fonction de P(Y*|D,Z) et des taux de mal-classification, puis optimiser sur ces taux.',
      'Vérifier : somme des probabilités = 1, cohérence de toutes les cellules, bornes encadrant l\'effet et atteintes par des lois admissibles explicites.',
    ].join('\n'),
  },
  {
    id: 'robust-optimization',
    domain: 'methodology',
    title: 'Optimisation robuste et politiques déterministes',
    keywords: ['robuste', 'minimax', 'adversarial', 'lp', 'dualité', 'politique', 'pire cas', 'enumeration'],
    content: [
      'Un problème robuste est un minimax : min_{décision} max_{scénario} coût(décision, scénario). Le certificat d\'optimalité = solution atteignant la valeur + minorant prouvé (dual LP, relaxation).',
      'Si les décisions sont déterministes et discrètes, l\'énumération exhaustive exacte est souvent possible (avec comptage du nombre de politiques admissibles).',
      'Pour un problème séquentiel, l\'ordre des décisions et l\'information disponible à chaque étape définissent l\'espace des politiques (adaptatives vs non adaptatives).',
      'Conserver les valeurs en fractions exactes et vérifier les contraintes de domaine ; un décimale arrondi n\'est pas un certificat.',
    ].join('\n'),
  },
  {
    id: 'reed-solomon-berlekamp-welch',
    domain: 'methodology',
    title: 'Décodage algébrique (Reed-Solomon, Berlekamp-Welch)',
    keywords: ['reed-solomon', 'berlekamp', 'welch', 'corps fini', 'effacement', 'erreur', 'interpolation', 'gf'],
    content: [
      'Avec n évaluations d\'un polynôme f de degré < k, au plus t erreurs et e effacements : décoder par interpolation/ Berlekamp-Welch en résolvant un système linéaire sur le corps fini.',
      'Berlekamp-Welch : chercher Q(X) = f(X)E(X) et E(X) unitaire de degré t ; résoudre le système Q(x_i) = y_i E(x_i) ; f = Q/E.',
      'Les effacements se traitent en supprimant les points et en ajustant le degré ; les erreurs restantes par recherche du plus petit ensemble cohérent (décodage par syndromes).',
      'Vérifier : rang du système, exactitude des coefficients, réévaluation sur les points sains, et borne d\'unicité (2t + e < n - k + 1 selon convention).',
    ].join('\n'),
  },
  {
    id: 'quantum-marginals',
    domain: 'methodology',
    title: 'Marginales quantiques et cohérence PSD',
    keywords: ['quantique', 'marginale', 'psd', 'pauli', 'trace', 'intrication', 'tomographie'],
    content: [
      'Une famille de marginales est compatible s\'il existe ρ ⪰ 0, Tr ρ = 1, dont les réduites coïncident : c\'est un problème de faisabilité SDP.',
      'Les espérances de Pauli donnent des contraintes linéaires ; les inégalités de cohérence (par ex. ⟨X⊗X⟩² + ⟨X⊗Y⟩² + ⟨Y⊗X⟩² + ⟨Y⊗Y⟩² ≤ 1 pour deux qubits) fournissent des certificats d\'incompatibilité.',
      'Pour prouver une compatibilité, exhiber ρ (matrice explicite) et vérifier PSD par ses valeurs propres ; pour l\'incompatibilité, exhiber un certificat dual (observable, inégalité).',
      'Vérifier que chaque marginale est reproduite exactement (traces partielles) et que les bornes demandées sont atteintes ou encadrées par des états admissibles.',
    ].join('\n'),
  },
  {
    id: 'joint-spectral-radius',
    domain: 'methodology',
    title: 'Rayon spectral joint, séjour minimal et sûreté',
    keywords: ['rayon spectral joint', 'commutation', 'séjour', 'lyapunov', 'blocs', 'sûreté', 'stabilité'],
    content: [
      'Le rayon spectral joint d\'une famille finie de matrices est ρ̂ = limsup_n max_produits ‖A_{σ}…‖^{1/n}. Pour deux modes 2×2, les produits se calculent sous forme close (matrices de Jordan).',
      'Un temps de séjour minimal d impose des blocs de longueur ≥ d : énumérer/certifier les séquences de blocs plutôt que toutes les séquences.',
      'Certificat d\'optimalité : exhiber la séquence atteignant la valeur + borner toutes les autres (par structure de blocs, inégalités, ou fonction de Lyapunov commune/paramétrique).',
      'Vérifier avec une seconde méthode (puissances de produits, itération de matrices) et conserver les valeurs en fractions exactes.',
    ].join('\n'),
  },
  {
    id: 'martingale-transport',
    domain: 'methodology',
    title: 'Transport martingale et bornes de prix',
    keywords: ['martingale', 'transport', 'arbitrage', 'call', 'réplication', 'dualité', 'intervalle de prix'],
    content: [
      'Les prix d\'options cohérents avec l\'absence d\'arbitrage sont les E_Q[payoff] sur les mesures martingales Q cohérentes avec les prix de marché donnés : c\'est un LP.',
      'L\'intervalle de prix admissibles d\'un nouveau payoff se calcule par le LP primal (max/min sur Q) ; le certificat = loi extrémale atteignant la borne + portefeuille de sur/sous-réplication (dual).',
      'Un arbitrage existe si le primal est infaisable ou si le prix hors intervalle : exhiber le portefeuille de réplication et le gain certain.',
      'Vérifier : contraintes de martingale pour chaque actif et chaque date, positivité, somme des probabilités, reproduction exacte de tous les calls cotés.',
    ].join('\n'),
  },
  {
    id: 'prony-recurrences',
    domain: 'methodology',
    title: 'Signaux exponentiels, récurrences et Prony',
    keywords: ['prony', 'récurrence', 'pôles', 'identification', 'effacement', 'ordre minimal', 'exponentielle'],
    content: [
      'Un signal y(n) = Σ P_j(n) λ_j^n avec Σ(1+deg P_j) ≤ r satisfait une récurrence linéaire d\'ordre r à coefficients constants : y(n+r) = Σ_{i<r} c_i y(n+i).',
      'Méthode de Prony : reconstruire les coefficients par les données exactes (résolution d\'un système de Hankel), puis les pôles par le polynôme caractéristique.',
      'Un effacement connu se traite par interpolation (positions conservées) ; l\'ordre minimal est le plus petit r compatible avec la classe annoncée.',
      'Vérifier : récurrence appliquée à tous les échantillons sains, racines distinctes, degrés des polynômes, et unicité sous la contrainte d\'ordre.',
    ].join('\n'),
  },
  {
    id: 'agent-security',
    domain: 'methodology',
    title: 'Sécurité d\'agent : moindre privilège, budget, révisions',
    keywords: ['agent', 'mcp', 'confused deputy', 'moindre privilège', 'budget', 'révision', 'autorisation', 'idempotence'],
    content: [
      'Principe de moindre privilège : lister les capacités autorisées, refuser tout le reste (pas d\'envoi externe, pas de suppression, pas d\'action non confirmée).',
      'Chaque action consomme un budget : planifier le coût total avant d\'agir et ne jamais dépasser le budget annoncé.',
      'Écrire sur la dernière révision au moment de l\'enregistrement : lire-écrire-verrouiller, gérer les conflits par relecture, idempotence et clé de révision.',
      'Un effet non confirmé ne doit pas être annoncé comme réalisé ; en cas d\'impossibilité, ne pas agir et l\'expliquer (l\'inaction est parfois la bonne réponse).',
      'Vérifier : journal des actions (autorisation, coût, révision), invariants de sûreté, et scénarios d\'altération malveillante.',
    ].join('\n'),
  },
  {
    id: 'proof-strategy',
    domain: 'methodology',
    title: 'Stratégie de preuve pour une équivalence',
    keywords: ['preuve', 'stratégie', 'équivalence', 'méthode', 'rédaction'],
    content: [
      '1. Fixer les définitions et prouver la convergence.',
      '2. Identifier les objets classiques (fonctions méromorphes, invariants).',
      '3. Établir les identités clés (souvent par calcul algébrique exact — vérifiable par CAS).',
      '4. Prouver l\'équivalence dans les DEUX sens séparément, en contrôlant les dénominateurs nuls à chaque division.',
      '5. Dénombrer exhaustivement via un argument de bijection/congruence.',
      '6. Établir multiplicités (dérivée non nulle), degré et polynôme minimal.',
      '7. Accompagner d\'une vérification numérique haute précision sans s\'en servir comme preuve.',
    ].join('\n'),
  },
];

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/**
 * Generic words that used to manufacture relevance by matching every entry's
 * body. They are ignored when scoring a query.
 */
const STOPWORDS = new Set([
  'les', 'des', 'une', 'uns', 'que', 'qui', 'est', 'sont', 'par', 'pour', 'avec',
  'dans', 'sur', 'pas', 'plus', 'mais', 'tout', 'tous', 'toute', 'cette', 'ces',
  'ses', 'son', 'leur', 'comme', 'alors', 'donc', 'entre', 'aussi', 'ainsi',
  'elle', 'ils', 'nous', 'vous', 'the', 'and', 'for', 'are', 'was', 'were',
  'its', 'their', 'not', 'but', 'all', 'any', 'can', 'how', 'what', 'when',
  'where', 'which', 'while', 'into', 'than', 'then', 'they', 'you', 'your',
  'with', 'from', 'have', 'has', 'this', 'that',
]);

export interface KnowledgeMatch {
  entry: KnowledgeEntry;
  score: number;
  matchedTerms: string[];
  /** A hit in the title or the curated keywords (as opposed to body-only matches). */
  titleOrKeywordHit: boolean;
  /** Number of distinct query terms matched in the title or the curated keywords. */
  strongTermCount: number;
}

function tokenizeQuery(query: string): string[] {
  return normalize(query)
    .split(/[^\p{L}\p{N}]+/u)
    .filter(term => term.length > 2 && !STOPWORDS.has(term));
}

/**
 * Score a query against the curated entries. Body-only matches are heavily
 * discounted (0.5 per term) so a long generic question can no longer pull in
 * unrelated entries: an entry must reach 3 points or hit a title/keyword.
 */
export function searchKnowledge(query?: string, domain?: string): KnowledgeMatch[] {
  const filtered = domain
    ? ENTRIES.filter(entry => normalize(entry.domain) === normalize(domain))
    : ENTRIES;
  if (!query?.trim()) {
    return filtered.map(entry => ({
      entry,
      score: 0,
      matchedTerms: [],
      titleOrKeywordHit: false,
      strongTermCount: 0,
    }));
  }
  const terms = tokenizeQuery(query);
  if (terms.length === 0) {
    return [];
  }
  return filtered
    .map(entry => {
      const title = normalize(entry.title);
      const keywords = normalize(entry.keywords.join(' '));
      const content = normalize(entry.content);
      let score = 0;
      let titleOrKeywordHit = false;
      let strongTermCount = 0;
      const matchedTerms: string[] = [];
      for (const term of terms) {
        let termScore = 0;
        let strong = false;
        if (title.includes(term)) {
          termScore += 3;
          titleOrKeywordHit = true;
          strong = true;
        }
        if (keywords.includes(term)) {
          termScore += 2;
          titleOrKeywordHit = true;
          strong = true;
        }
        if (content.includes(term)) {
          termScore += 0.5;
        }
        if (termScore > 0) {
          score += termScore;
          matchedTerms.push(term);
          if (strong) {
            strongTermCount += 1;
          }
        }
      }
      return { entry, score, matchedTerms, titleOrKeywordHit, strongTermCount };
    })
    // Either a strong single-term hit, or several distinct terms from the query:
    // one generic word ("entiers", "modèle", "agent") is no longer enough.
    .filter(
      item =>
        item.titleOrKeywordHit &&
        (item.score >= 5 || item.strongTermCount >= 2),
    )
    .sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title));
}

export function lookupKnowledge(query?: string, domain?: string, limit = 3): KnowledgeEntry[] {
  const matches = searchKnowledge(query, domain);
  return (query?.trim() ? matches.slice(0, Math.max(limit, 1)) : matches).map(match => match.entry);
}

export function listKnowledgeTopics(): Array<{ id: string; domain: string; title: string }> {
  return ENTRIES.map(entry => ({ id: entry.id, domain: entry.domain, title: entry.title }));
}
