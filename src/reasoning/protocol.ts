/**
 * Standard science protocol: turns a hard research-level problem into a
 * reproducible solving workflow (classify → plan → exact compute → certificates
 * → traps → limits). Domain checklists are generic methodology, never answers.
 */

export type ScienceDomain =
  | 'number-theory'
  | 'distributed'
  | 'causal'
  | 'optimization'
  | 'coding'
  | 'quantum'
  | 'control'
  | 'finance'
  | 'inverse'
  | 'agents'
  | 'general';

export interface ScienceProtocol {
  domain: ScienceDomain;
  steps: string[];
  checklist: string[];
  toolHints: string[];
  answerFormat: string[];
}

const DOMAIN_KEYWORDS: Array<{ domain: ScienceDomain; keywords: RegExp }> = [
  { domain: 'number-theory', keywords: /(modulo|mod\b|premiers?\b|valuation|hensel|chinois|racines?|anneau|congruence|nombres? premiers?)/i },
  { domain: 'distributed', keywords: /(transaction|sérialis|serialis|registre|journal|instantané|snapshot|validation|verrou|exclusion)/i },
  { domain: 'causal', keywords: /(causal|contrefactuel|ate\b|late\b|instrument|invitation|traitement|imparfait)/i },
  { domain: 'optimization', keywords: /(politique|scénario|adversarial|robuste|coût|stock|minimax|règret|regret|décision|capacité|budget)/i },
  { domain: 'coding', keywords: /(fragment|f\s*_?\{?257|effacement|erreur|code correcteur|polynôme|degré au plus)/i },
  { domain: 'quantum', keywords: /(qubit|densité|matrice réduite|pauli|marginales|intriqu|trace\b)/i },
  { domain: 'control', keywords: /(mode|commutation|rayon spectral|séjour|lyapunov|sûreté|stabilité|trajectoire)/i },
  { domain: 'finance', keywords: /(marché|martingale|call|arbitrage|prix|transport|actif|option)/i },
  { domain: 'inverse', keywords: /(spectre|pôles|récurrence|effacé|effacement|modèle|exponentiel|identification)/i },
  { domain: 'agents', keywords: /(agent|mcp|autorisation|crédits?|tenant|outil|permission|serveur)/i },
];

const CHECKLISTS: Record<ScienceDomain, string[]> = {
  'number-theory': [
    'Ne jamais utiliser « produit nul donc facteur nul » dans Z/NZ non intègre : traiter chaque puissance première puis recombiner par CRT.',
    'Compter les solutions avec multiplicités aux seuils (par exemple n = 2a) et gérer les cas de bord.',
    'Le lemme de Hensel exige une hypothèse de racine simple (ou un relevé contrôlé) : expliciter l\'hypothèse avant de l\'appliquer.',
    'Produire les entiers exacts (pas d\'approximation) et vérifier le cardinal avec une méthode indépendante.',
  ],
  distributed: [
    'Distinguer cohérence instantanée (snapshot) et sérialisabilité : produire un ordre sérialisable explicite.',
    'Explorer TOUS les sous-ensembles/témoins pertinents, pas seulement les cycles courts.',
    'Un effet externe irréversible n\'est pas annulé par un rollback de transaction : l\'argumenter.',
    'Ne pas confondre exactly-once, fencing, idempotence et autorisation.',
  ],
  causal: [
    'Identification partielle : produire des bornes exactes, jamais une valeur ponctuelle non identifiée.',
    'Énoncer les hypothèses (exclusion, monotonie, instrument) avant tout calcul.',
    'Traiter l\'indicateur imparfait séparément de la variable réelle ; distinguer ATE, LATE et sous-populations.',
    'Vérifier la cohérence des probabilités (positivité, somme 1, contraintes de monotonicité).',
  ],
  optimization: [
    'L\'adversaire choisit le scénario : optimiser le pire cas, pas la moyenne.',
    'Vérifier le caractère déterministe des politiques et énumérer exhaustivement (ou par certificat) l\'espace des décisions.',
    'Conserver les optima sous forme de fractions exactes et prouver l\'optimalité (majorant + solution atteignant le majorant).',
    'Contrôler le budget (crédits, capacité) et les contraintes de domaine à chaque étape.',
  ],
  coding: [
    'Séparer effacements connus et erreurs inconnues ; utiliser une méthode de décodage (interpolation, Berlekamp-Welch) sur le corps fini exact.',
    'Vérifier la borne d\'erreurs (au plus t) et le rang du système ; donner les positions d\'erreur et les coefficients exacts.',
    'Vérifier la solution par évaluation indépendante sur des points de contrôle.',
    'Ne pas supposer que les erreurs sont rares ou regroupées sans le prouver.',
  ],
  quantum: [
    'Vérifier la cohérence avec CHAQUE marginale donnée et la semi-définie positivité.',
    'Utiliser des inégalités/observables de Pauli pour certifier les bornes demandées.',
    'Produire un certificat numérique (vecteurs propres, valeurs propres, inégalités) et non une simple intuition.',
    'Distinguer impossible / possible sous hypothèses et état explicite en cas de réalisation.',
  ],
  control: [
    'Expliciter le temps de séjour minimal et la structure des blocs de commutation.',
    'Énumérer ou certifier les séquences par bloc ; borner exactement le rayon spectral joint.',
    'Utiliser des fractions exactes pour les bornes et vérifier avec une méthode numérique indépendante.',
    'Traiter le préfixe final potentiellement plus court que le séjour minimal.',
  ],
  finance: [
    'Toute loi admissible doit être une martingale cohérente avec TOUS les prix de calls fournis.',
    'Produire l\'intervalle exact de prix admissibles (transport martingale) et le portefeuille d\'arbitrage s\'il existe.',
    'Vérifier les prix par réplication (portefeuille dynamique) et par contraintes de probabilité.',
    'Conserver des fractions exactes, pas des décimaux.',
  ],
  inverse: [
    'Reconstruire les pôles par une récurrence linéaire (type Prony) sur les données exactes.',
    'Localiser l\'erreur et l\'effacement, puis distinguer modèles admissibles et non admissibles.',
    'Déterminer l\'ordre minimal compatible avec la classe annoncée et fournir la récurrence exacte.',
    'Vérifier la reconstruction sur les échantillons non corrompus.',
  ],
  agents: [
    'Vérifier les autorisations AVANT chaque action : lecture seule + écriture privée uniquement.',
    'Respecter strictement le budget de crédits et refuser toute action non confirmée.',
    'Écrire uniquement sur la dernière révision au moment de l\'enregistrement ; gérer les conflits sans écrasement.',
    'Ne rien envoyer à l\'extérieur, ne rien supprimer ; en cas d\'impossibilité, ne pas agir et l\'expliquer.',
  ],
  general: [
    'Expliciter les hypothèses et les limites du modèle avant de conclure.',
    'Vérifier chaque résultat par une méthode indépendante.',
    'Ne pas inventer de donnée manquante : signaler l\'impossibilité si nécessaire.',
  ],
};

const TOOL_HINTS: Record<ScienceDomain, string[]> = {
  'number-theory': ['compute (sympy factorint/crt/nthroot_mod, énumération exacte)', 'cas (vérifications exactes)'],
  distributed: ['compute (énumération exhaustive des sous-ensembles, vérification de sérialisabilité)'],
  causal: ['compute (LP/inégalités sur probabilités, bornes exactes)', 'cas'],
  optimization: ['compute (linprog/énumération, fractions exactes)'],
  coding: ['compute (arithmétique GF(257), interpolation, décodage)'],
  quantum: ['compute (numpy/scipy/sympy : valeurs propres, SDP simples, certificats)'],
  control: ['compute (produits matriciels exacts, énumération de blocs)', 'cas'],
  finance: ['compute (LP transport martingale, portefeuilles de réplication)'],
  inverse: ['compute (récurrences exactes, Prony, reconstruction)'],
  agents: ['compute (planificateur de budget/état)', 'plan', 'critique'],
  general: ['compute', 'cas', 'plan', 'verify', 'critique'],
};

export function detectScienceDomain(problem: string): ScienceDomain {
  let best: { domain: ScienceDomain; score: number } = { domain: 'general', score: 0 };
  for (const { domain, keywords } of DOMAIN_KEYWORDS) {
    const global = new RegExp(keywords.source, 'gi');
    const score = (problem.match(global) ?? []).length;
    if (score > best.score) {
      best = { domain, score };
    }
  }
  return best.domain;
}

export function buildScienceProtocol(problem: string, domainHint?: ScienceDomain): ScienceProtocol {
  const domain = domainHint ?? detectScienceDomain(problem);
  return {
    domain,
    steps: [
      '1. Reformuler le problème : données, inconnues, unités, contraintes et format de réponse attendu.',
      '2. Classifier le domaine et écrire un plan de résolution testable (outil plan).',
      '3. Modéliser exactement, puis produire les résultats numériques avec compute (script court, sortie JSON, valeurs exactes en fractions/entiers).',
      '4. Construire un certificat pour chaque résultat : énumération exhaustive de l\'espace (bornes, optima, cardinaux, structures minimales), témoin, LP dual, valeurs propres, récurrence, etc.',
      '4b. Recettes par type de quantité : borne/intervalle → optimisation sur l\'espace admissible (LP/énumération) + témoins aux deux extrêmes ; optimum → énumération + minorant prouvé ; cardinal/comptage → énumération ou DP ; structure minimale → invariants, récurrence, polynôme minimal.',
      '5. Relire la checklist des pièges du domaine et vérifier chaque point explicitement.',
      '6. Vérifier par une seconde méthode indépendante (exacte vs numérique) et signaler tout écart.',
      '7. Exhaustivité : reprendre chaque quantité demandée et vérifier qu\'un certificat exact existe pour chacune ; combler les manques avant de conclure.',
      '8. Rédiger la réponse finale : résultats exacts, preuves/certificats, pièges traités, limites et impossibilités.',
    ],
    checklist: CHECKLISTS[domain],
    toolHints: TOOL_HINTS[domain],
    answerFormat: [
      '## Réponse',
      'Résultats exacts demandés (valeurs, listes, fractions).',
      '## Preuves et certificats',
      'Dérivations et sorties d\'outils qui justifient chaque résultat.',
      '## Pièges traités',
      'Point par point (voir checklist).',
      '## Limites / impossibilités',
      'Ce qui ne peut pas être garanti et pourquoi.',
    ],
  };
}
