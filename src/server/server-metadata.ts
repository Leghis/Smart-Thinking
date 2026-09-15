import { Implementation, ServerCapabilities } from '@modelcontextprotocol/sdk/types.js';

const PROJECT_HOMEPAGE = 'https://github.com/Leghis/Smart-Thinking';
const PROJECT_ICON = 'https://raw.githubusercontent.com/Leghis/Smart-Thinking/main/logoSmart-thinking.png';

/**
 * Server instructions. Kept deliberately short: MCP clients duplicate this text
 * on every tool description, so a long block multiplies the context cost by the
 * number of tools. The detailed guide lives in SMART_THINKING_TOOL_GUIDE and is
 * served on demand (`smartthinking(help=true)` and the docs resource).
 */
export const SMART_THINKING_INSTRUCTIONS = [
  'Smart-Thinking augmente ton raisonnement : graphe de pensées persistant, vérification honnête, calcul exact et recherche web.',
  '',
  'RÈGLES ESSENTIELLES :',
  '1. Fait chiffré, récent ou incertain : vérifie avant d\'affirmer (calculate, cas, compute, verify) ; ne présente jamais un résultat non vérifié comme un fait.',
  '2. Résultat quantifié : enregistre-le avec claim(statement, value, method, evidence) puis lance audit() avant la réponse finale.',
  '3. Multi-sources : web_search + fetch, ou web_agent (boucle autonome bornée) ; research pour un rapport long.',
  '4. Tâche complexe : plan(goal) puis smartthinking pour consigner les étapes et les hypothèses.',
  '5. Problème difficile : protocol(problem) pour le domaine, la checklist des pièges et le format de réponse.',
  '6. Détail des outils et boucle complète : smartthinking(help=true) ou la ressource smart-thinking://docs/about.',
].join('\n');

/** Full operating guide, served on demand instead of being duplicated per tool. */
export const SMART_THINKING_TOOL_GUIDE = [
  '## Boucle recommandée',
  '1. protocol(problem) pour cadrer un problème difficile (domaine, pièges, format de réponse).',
  '2. plan(goal) pour les tâches de plus de deux étapes, puis smartthinking pour consigner chaque étape.',
  '3. compute pour écrire un script exact (sympy/numpy/scipy) et produire un certificat : énumération exhaustive, LP, corps finis, valeurs propres, récurrences.',
  '4. claim(statement, value, method, evidence) pour chaque résultat, puis audit(requirements=[...]) avant la réponse finale.',
  '5. web_search + fetch pour les faits ciblés ; web_agent pour une question multi-sources ; web_crawl pour un site entier ; research pour un rapport long.',
  '6. verify pour une affirmation donnée : un contrôle déterministe exact tranche seul (aucune dilution par le web).',
  '7. critique pour une revue adversariale du brouillon (nécessite SMART_THINKING_ASSIST_API_KEY).',
  '',
  '## Repères par outil',
  '- calculate : arithmétique déterministe ; "expression = résultat" vérifie une valeur.',
  '- solve_logic / solve_math : ordres et équations exacts, sans calcul mental.',
  '- cas : identités symboliques (verify_identity), polynôme minimal, fonctions elliptiques.',
  '- math_knowledge : fiches classiques ciblées (aucune fiche hors sujet n\'est injectée).',
  '- web_agent : décomposition, dédup par domaine, extraction, stance par source, contradictions, budget de crédits par session.',
  '- session : état, export, plan, configuration Tavily, crédits web consommés.',
  '- search / fetch : mémoires locales et contenus web (compatibles connecteurs).',
  '',
  '## Règles de vérité',
  '- Un statut "unverified", "uncertain" ou "absence_of_information" ne doit jamais être présenté comme un fait.',
  '- Aucune recherche web n\'est simulée : si aucun moteur n\'est configuré, l\'outil délègue explicitement au client (requiresClientAction).',
  '- Un budget de crédits web épuisé, un quota ou une clé invalide se traduisent par degraded/truncated + raison, jamais par un succès silencieux.',
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
