import { Implementation, ServerCapabilities } from '@modelcontextprotocol/sdk/types.js';

const PROJECT_HOMEPAGE = 'https://github.com/Leghis/Smart-Thinking';
const PROJECT_ICON = 'https://raw.githubusercontent.com/Leghis/Smart-Thinking/main/logoSmart-thinking.png';

export const SMART_THINKING_INSTRUCTIONS = [
  'Smart-Thinking augmente ton raisonnement: graphe de pensées persistant, planification, vérification honnête et recherche web.',
  '',
  'RÈGLES D\'USAGE:',
  '0. Problème de recherche/ingénierie complexe: commence par protocol(problem) et suis le protocole standard (classer le domaine, plan, compute exact, certificats, checklist des pièges, limites). Utilise compute pour écrire des scripts exacts (sympy/numpy/scipy) qui produisent des certificats.',
  '0bis. Certifie CHAQUE résultat avec claim(statement, value, method, evidence) et lance audit() avant la réponse finale: aucune affirmation ne doit rester sans méthode ni preuve.',
  '0ter. Bornes, intervalles, optima, cardinaux, structures minimales: énumère l\'espace complet des configurations avec compute et certifie min/max/comptage avec témoins. Avant la réponse finale, reprends chaque quantité demandée avec audit(requirements=[...]): toute exigence sans certificat doit être calculée puis claim.',
  '1. Tâche complexe (plus de 2 étapes): commence par plan(goal) puis exécute les étapes.',
  '2. Utilise calculate pour TOUT calcul non trivial (ex: calculate("(120*0.45)")) au lieu de calculer de tête. Passe "expression = résultat" pour vérifier une valeur.',
  '2bis. Puzzle d\'ordre/classement (avant/après, plus rapide/lent, >/<) : utilise solve_logic. Équations ou systèmes : solve_math. Ces solveurs sont exacts : ne les remplace jamais par du calcul mental.',
  '2bis-cas. Mathématiques avancées (analyse complexe, algèbre, identités, polynômes minimaux, fonctions elliptiques) : utilise math_knowledge pour la théorie puis cas pour PROUVER les identités (verify_identity), calculer exactement (minimal_polynomial, solve, mod_linear) et vérifier en haute précision (evalf, elliptic). Une preuve doit reposer sur des identités vérifiées par cas, pas sur des approximations.',
  '2ter. Question multi-hop (deux entités à relier, fait composite) : utilise research (recherche itérative Tavily + réponses candidates sourcées) avant de conclure.',
  '2quater. Avant de rendre une réponse importante, passe-la à critique pour une revue adversariale (erreurs, faits non prouvés, étapes manquantes).',
  '3. Consigne chaque étape importante avec smartthinking (thoughtType, connections vers les pensées précédentes, depth adapté).',
  '4. Affirmation factuelle, chiffrée ou récente: utilise web_search puis verify. web_search accepte topic, timeRange, include/excludeDomains et includeRawContent pour cibler les sources. Si provider="native", effectue la recherche avec ton outil natif et cite les URL.',
  '4bis. Pour explorer un site ou rassembler plusieurs pages (documentation, dossier de presse), utilise web_crawl (mode="crawl" pour le contenu, mode="map" pour lister les URLs).',
  '5. Ne présente jamais un résultat "unverified", "uncertain" ou "absence_of_information" comme un fait. Signale l\'incertitude.',
  '6. Utilise hypotheses dès qu\'il y a plusieurs explications possibles, puis hypothesisUpdate pour ajouter les preuves.',
  '7. Utilise search/fetch pour retrouver les mémoires de la session; fetch accepte aussi une URL.',
  '8. Configure la clé Tavily par session avec session(action="configure_search", tavilyApiKey="...") si web_search indique que la recherche serveur n\'est pas configurée.',
  '9. Termine par une réponse synthétique: conclusion, preuves sourcées, incertitudes restantes.',
].join('\n');

export const SMART_THINKING_CAPABILITIES: ServerCapabilities = {
  logging: {},
  tools: { listChanged: true },
  prompts: { listChanged: true },
  resources: { listChanged: true, subscribe: false },
  completions: {},
};

export function buildServerImplementation(version: string): Implementation {
  return {
    name: 'smart-thinking-mcp',
    title: 'Smart-Thinking',
    version,
    websiteUrl: PROJECT_HOMEPAGE,
    icons: [
      {
        src: PROJECT_ICON,
        mimeType: 'image/png',
        sizes: ['512x512'],
      },
    ],
  };
}

export const SERVER_DOCS_RESOURCE_URI = 'smart-thinking://docs/about';
export const SERVER_RUNTIME_RESOURCE_URI = 'smart-thinking://runtime/status';
