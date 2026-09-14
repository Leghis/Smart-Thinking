/**
 * v13 benchmark datasets — 25 tasks with verifiable reference answers.
 *
 * Categories: 6 arithmetic, 5 logic, 4 planning, 5 factual, 5 synthesis.
 * Factual/synthesis tasks carry `offlineEvidence`, a clearly-labelled stub that
 * stands in for a Tavily response so the harness stays offline by default.
 * `keyFacts` are concrete strings checked by grader.ts (accent/case-insensitive).
 */

import type { BenchTask } from './types';
import { REAL_BENCH_TASKS } from './datasets-real';

export const BENCH_TASKS: BenchTask[] = [
  // -------------------------------------------------------------------------
  // Arithmetic (6) — multi-step, distractors, invalid chain equation
  // -------------------------------------------------------------------------
  {
    id: 'arith-bakery',
    category: 'arithmetic',
    difficulty: 1,
    question:
      "Une boulangerie vend 12 croissants à 1,50 € chacun et 8 pains à 2,20 € chacun. Combien la boulangerie encaisse-t-elle au total ?",
    referenceAnswer: '35,60 €',
    keyFacts: ['35,60'],
    numericAnswer: 35.6,
    requiresWeb: false,
  },
  {
    id: 'arith-train-distractor',
    category: 'arithmetic',
    difficulty: 2,
    question:
      "Un train roule à 90 km/h pendant 2 heures, puis à 110 km/h pendant 3 heures. Une voiture, partie plus tôt, a déjà parcouru 40 km. Quelle distance totale le train a-t-il parcourue ?",
    referenceAnswer: '510 km',
    keyFacts: ['510'],
    numericAnswer: 510,
    requiresWeb: false,
  },
  {
    id: 'arith-invalid-chain',
    category: 'arithmetic',
    difficulty: 3,
    question:
      "Vérifie cette chaîne de calcul : 15 * 4 = 60, puis 60 + 35 = 95, puis 95 / 5 = 18. Si une étape est fausse, indique-la et donne le résultat correct final.",
    referenceAnswer:
      'Le calcul est invalide : 95 / 5 = 18 est faux, le résultat correct final est 19.',
    keyFacts: ['invalide', '19'],
    numericAnswer: 19,
    requiresWeb: false,
  },
  {
    id: 'arith-tank-fraction',
    category: 'arithmetic',
    difficulty: 2,
    question:
      'Un réservoir contient 240 litres et il est rempli aux 3/8 de sa capacité. Combien de litres contient-il ?',
    referenceAnswer: '90 litres',
    keyFacts: ['90'],
    numericAnswer: 90,
    requiresWeb: false,
  },
  {
    id: 'arith-workforce-percent',
    category: 'arithmetic',
    difficulty: 1,
    question:
      "Une entreprise compte 120 employés et 45 % d'entre eux sont des femmes. Combien de femmes travaillent dans cette entreprise ?",
    referenceAnswer: '54 femmes',
    keyFacts: ['54'],
    numericAnswer: 54,
    requiresWeb: false,
  },
  {
    id: 'arith-pot-division',
    category: 'arithmetic',
    difficulty: 2,
    question:
      'Une cagnotte de 500 € est partagée équitablement entre 4 personnes, puis chaque part est réduite de 25 € de frais. Combien reçoit chaque personne ?',
    referenceAnswer: '100 €',
    keyFacts: ['100'],
    numericAnswer: 100,
    requiresWeb: false,
  },

  // -------------------------------------------------------------------------
  // Logic (5) — syllogisms and ordering
  // -------------------------------------------------------------------------
  {
    id: 'logic-syllogism-chats',
    category: 'logic',
    difficulty: 1,
    question:
      "Tous les chats sont des mammifères. Tous les mammifères sont des animaux. Quelle conclusion est valide ? (A) Certains animaux ne sont pas des mammifères (B) Tous les chats sont des animaux (C) Aucun chat n'est un animal. Réponds par A, B ou C.",
    referenceAnswer: 'Tous les chats sont des animaux (B).',
    keyFacts: ['tous les chats sont des animaux'],
    expectedLetter: 'B',
    requiresWeb: false,
  },
  {
    id: 'logic-syllogism-robots',
    category: 'logic',
    difficulty: 2,
    question:
      "Tous les robots sont des machines. Aucune machine ne ressent la douleur. Un robot peut-il ressentir la douleur ? (A) Oui, un robot peut ressentir la douleur (B) Non, aucun robot ne ressent la douleur (C) On ne peut pas savoir. Réponds par A, B ou C.",
    referenceAnswer: 'Non, aucun robot ne ressent la douleur (B).',
    keyFacts: ['aucun robot ne ressent la douleur'],
    expectedLetter: 'B',
    requiresWeb: false,
  },
  {
    id: 'logic-order-runners',
    category: 'logic',
    difficulty: 1,
    question:
      'Classe ces trois coureurs du plus rapide au plus lent : Chloé a terminé avant Bob et Bob a terminé avant Alice.',
    referenceAnswer: '1. Chloé, 2. Bob, 3. Alice',
    keyFacts: ['1 chloe', '2 bob', '3 alice'],
    orderedFacts: ['chloe', 'bob', 'alice'],
    requiresWeb: false,
  },
  {
    id: 'logic-order-versions',
    category: 'logic',
    difficulty: 2,
    question:
      'Classe ces versions de la plus ancienne à la plus récente : V2 est sorti avant V4, V1 est sorti avant V2 et V3 est sorti après V4.',
    referenceAnswer: '1. V1, 2. V2, 3. V4, 4. V3',
    keyFacts: ['1 v1', '2 v2', '3 v4', '4 v3'],
    orderedFacts: ['v1', 'v2', 'v4', 'v3'],
    requiresWeb: false,
  },
  {
    id: 'logic-disjunction-vase',
    category: 'logic',
    difficulty: 2,
    question:
      "Soit le vase est intact, soit le vase est cassé. Le vase n'est pas intact. Qu'en déduit-on ? (A) On ne peut rien déduire (B) Le vase est intact (C) Le vase est cassé. Réponds par A, B ou C.",
    referenceAnswer: 'Le vase est cassé (C).',
    keyFacts: ['le vase est casse'],
    expectedLetter: 'C',
    requiresWeb: false,
  },

  // -------------------------------------------------------------------------
  // Planning (4) — ordering constraints
  // -------------------------------------------------------------------------
  {
    id: 'plan-cake',
    category: 'planning',
    difficulty: 1,
    question:
      "Planifie la préparation d'un gâteau en ordonnant ces étapes : Préchauffer le four, Mélanger les ingrédients, Beurrer le moule, Verser la pâte dans le moule, Cuire la pâte. Contraintes : Préchauffer le four avant de cuire la pâte ; Mélanger les ingrédients avant de cuire la pâte ; Beurrer le moule avant de verser la pâte ; Verser la pâte avant de cuire la pâte.",
    referenceAnswer:
      '1. Préchauffer le four, 2. Mélanger les ingrédients, 3. Beurrer le moule, 4. Verser la pâte dans le moule, 5. Cuire la pâte',
    keyFacts: [
      '1 prechauffer le four',
      '2 melanger les ingredients',
      '3 beurrer le moule',
      '4 verser la pate dans le moule',
      '5 cuire la pate',
    ],
    orderedFacts: ['prechauffer le four', 'melanger les ingredients', 'beurrer le moule', 'verser la pate dans le moule', 'cuire la pate'],
    requiresWeb: false,
  },
  {
    id: 'plan-deploy',
    category: 'planning',
    difficulty: 2,
    question:
      "Ordonne ces tâches de déploiement : Écrire le code, Corriger les bugs, Écrire les tests, Valider en staging, Déployer en production. Contraintes : Écrire le code avant de corriger les bugs ; Écrire le code avant d'écrire les tests ; Corriger les bugs avant de valider en staging ; Écrire les tests avant de valider en staging ; Valider en staging avant de déployer en production.",
    referenceAnswer:
      '1. Écrire le code, 2. Corriger les bugs, 3. Écrire les tests, 4. Valider en staging, 5. Déployer en production',
    keyFacts: [
      '1 ecrire le code',
      '2 corriger les bugs',
      '3 ecrire les tests',
      '4 valider en staging',
      '5 deployer en production',
    ],
    orderedFacts: ['ecrire le code', 'corriger les bugs', 'ecrire les tests', 'valider en staging', 'deployer en production'],
    requiresWeb: false,
  },
  {
    id: 'plan-travel',
    category: 'planning',
    difficulty: 1,
    question:
      "Ordonne ces étapes d'un voyage : Acheter les billets, Réserver l'hôtel, Faire les valises, Partir à l'aéroport, Passer la sécurité. Contraintes : Acheter les billets avant de réserver l'hôtel ; Réserver l'hôtel avant de faire les valises ; Faire les valises avant de partir à l'aéroport ; Partir à l'aéroport avant de passer la sécurité.",
    referenceAnswer:
      "1. Acheter les billets, 2. Réserver l'hôtel, 3. Faire les valises, 4. Partir à l'aéroport, 5. Passer la sécurité",
    keyFacts: [
      '1 acheter les billets',
      '2 reserver l hotel',
      '3 faire les valises',
      '4 partir a l aeroport',
      '5 passer la securite',
    ],
    orderedFacts: ['acheter les billets', 'reserver l hotel', 'faire les valises', 'partir a l aeroport', 'passer la securite'],
    requiresWeb: false,
  },
  {
    id: 'plan-construction',
    category: 'planning',
    difficulty: 3,
    question:
      'Ordonne ces étapes de construction : Couler les fondations, Monter les murs, Poser la toiture, Installer les fenêtres, Peindre les murs. Contraintes : Couler les fondations avant de monter les murs ; Monter les murs avant de poser la toiture ; Monter les murs avant d\'installer les fenêtres ; Poser la toiture avant d\'installer les fenêtres ; Poser la toiture avant de peindre les murs.',
    referenceAnswer:
      '1. Couler les fondations, 2. Monter les murs, 3. Poser la toiture, 4. Installer les fenêtres, 5. Peindre les murs',
    keyFacts: [
      '1 couler les fondations',
      '2 monter les murs',
      '3 poser la toiture',
      '4 installer les fenetres',
      '5 peindre les murs',
    ],
    orderedFacts: ['couler les fondations', 'monter les murs', 'poser la toiture', 'installer les fenetres', 'peindre les murs'],
    requiresWeb: false,
  },

  // -------------------------------------------------------------------------
  // Factual (5) — requiresWeb, offlineEvidence simulates web results
  // -------------------------------------------------------------------------
  {
    id: 'fact-capital-australia',
    category: 'factual',
    difficulty: 1,
    question: "Quelle est la capitale de l'Australie ?",
    referenceAnswer: 'Canberra',
    keyFacts: ['canberra'],
    requiresWeb: true,
    forbiddenPatterns: ['sydney', 'melbourne'],
    offlineEvidence: [
      {
        title: "Géographie de l'Australie — Encyclopédie",
        url: 'https://example.org/australie',
        snippet:
          "La capitale de l'Australie est Canberra, située dans le Territoire de la capitale australienne. Sydney et Melbourne sont les deux plus grandes villes du pays.",
      },
    ],
  },
  {
    id: 'fact-moon-year',
    category: 'factual',
    difficulty: 1,
    question: "En quelle année l'être humain a-t-il marché sur la Lune pour la première fois ?",
    referenceAnswer: '1969 (mission Apollo 11)',
    keyFacts: ['1969', 'apollo 11'],
    requiresWeb: true,
    forbiddenPatterns: ['1965', '1972'],
    offlineEvidence: [
      {
        title: 'Programme Apollo — NASA',
        url: 'https://example.org/apollo-11',
        snippet:
          'Le 20 juillet 1969, la mission Apollo 11 a permis à Neil Armstrong de marcher sur la Lune pour la première fois.',
      },
    ],
  },
  {
    id: 'fact-longest-river',
    category: 'factual',
    difficulty: 2,
    question: "Quel est le plus long fleuve d'Afrique ?",
    referenceAnswer: 'Le Nil (environ 6 650 km)',
    keyFacts: ['nil', '6 650'],
    requiresWeb: true,
    forbiddenPatterns: ['congo', '4 700'],
    offlineEvidence: [
      {
        title: "Fleuves d'Afrique — Atlas",
        url: 'https://example.org/fleuves',
        snippet:
          "Le Nil est le plus long fleuve d'Afrique, avec environ 6 650 kilomètres. Le fleuve Congo, long de 4 700 kilomètres, arrive en deuxième position.",
      },
    ],
  },
  {
    id: 'fact-mona-lisa',
    category: 'factual',
    difficulty: 1,
    question: 'Qui a peint le tableau La Joconde ?',
    referenceAnswer: 'Léonard de Vinci',
    keyFacts: ['vinci'],
    requiresWeb: true,
    forbiddenPatterns: ['michel-ange', 'raphael'],
    offlineEvidence: [
      {
        title: 'La Joconde — Musée du Louvre',
        url: 'https://example.org/joconde',
        snippet:
          'La Joconde, également appelée Mona Lisa, a été peinte par Léonard de Vinci entre 1503 et 1519.',
      },
    ],
  },
  {
    id: 'fact-iron-symbol',
    category: 'factual',
    difficulty: 2,
    question: 'Quel élément chimique porte le symbole Fe ?',
    referenceAnswer: 'Le fer (numéro atomique 26)',
    keyFacts: ['fer', '26'],
    requiresWeb: true,
    forbiddenPatterns: ['fluor'],
    offlineEvidence: [
      {
        title: 'Tableau périodique — Chimie',
        url: 'https://example.org/tableau-periodique',
        snippet:
          'Le symbole chimique Fe correspond au fer, de numéro atomique 26. Le fluor, de symbole F, est un autre élément.',
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Synthesis (5) — combine two facts
  // -------------------------------------------------------------------------
  {
    id: 'synth-boiling',
    category: 'synthesis',
    difficulty: 2,
    question:
      "Compare le point d'ébullition de l'eau au niveau de la mer et à 2 000 mètres d'altitude.",
    referenceAnswer: "100 °C au niveau de la mer, environ 93 °C à 2 000 m d'altitude.",
    keyFacts: ['100', '93'],
    requiresWeb: true,
    offlineEvidence: [
      {
        title: 'Pression atmosphérique et ébullition',
        url: 'https://example.org/ebullition',
        snippet:
          "Au niveau de la mer, l'eau bout à 100 °C sous une pression de 1 013 hPa.",
      },
      {
        title: 'Cuisine en altitude',
        url: 'https://example.org/altitude',
        snippet:
          "À 2 000 mètres d'altitude, la pression chute et l'eau bout à environ 93 °C.",
      },
    ],
  },
  {
    id: 'synth-timezone',
    category: 'synthesis',
    difficulty: 2,
    question: "S'il est midi à Paris en hiver, quelle heure est-il à Tokyo ?",
    referenceAnswer: '20 h à Tokyo (midi à Paris)',
    keyFacts: ['20', 'tokyo'],
    requiresWeb: true,
    offlineEvidence: [
      {
        title: 'Fuseaux horaires — Europe',
        url: 'https://example.org/paris',
        snippet: 'En hiver, Paris est à UTC+1.',
      },
      {
        title: 'Fuseaux horaires — Japon',
        url: 'https://example.org/tokyo',
        snippet: "Tokyo est à UTC+9 toute l'année, sans heure d'été.",
      },
    ],
  },
  {
    id: 'synth-rayleigh',
    category: 'synthesis',
    difficulty: 3,
    question: 'Pourquoi le ciel est-il bleu le jour et rouge au coucher du soleil ?',
    referenceAnswer:
      'La diffusion de Rayleigh favorise le bleu le jour ; au coucher, la lumière traverse plus d’atmosphère et le rouge domine.',
    keyFacts: ['rayleigh', 'bleue', 'rouges'],
    requiresWeb: true,
    offlineEvidence: [
      {
        title: 'Diffusion de Rayleigh',
        url: 'https://example.org/rayleigh',
        snippet:
          "La diffusion de Rayleigh est plus intense pour les courtes longueurs d'onde, ce qui explique la couleur bleue du ciel.",
      },
      {
        title: 'Couchers de soleil',
        url: 'https://example.org/coucher',
        snippet:
          "Au coucher du soleil, la lumière traverse une plus grande épaisseur d'atmosphère et les longueurs d'onde rouges dominent.",
      },
    ],
  },
  {
    id: 'synth-climate',
    category: 'synthesis',
    difficulty: 3,
    question:
      "Quel est le lien entre l'augmentation du CO2 atmosphérique et la fonte de la banquise arctique ?",
    referenceAnswer:
      'Le CO2 renforce l’effet de serre, ce qui réchauffe la planète et accélère la fonte de la banquise arctique.',
    keyFacts: ['13', 'co2', 'effet de serre'],
    requiresWeb: true,
    offlineEvidence: [
      {
        title: 'Gaz à effet de serre',
        url: 'https://example.org/co2',
        snippet:
          "Le CO2 est un gaz à effet de serre qui augmente la température moyenne de la planète.",
      },
      {
        title: 'Banquise arctique',
        url: 'https://example.org/banquise',
        snippet:
          'La banquise arctique perd en moyenne 13 % de sa surface par décennie depuis 1979.',
      },
    ],
  },
  {
    id: 'synth-blood-pressure',
    category: 'synthesis',
    difficulty: 2,
    question:
      "Un traitement A réduit la pression artérielle de 10 % et un traitement B de 15 %. Quelle réduction peut-on attendre en les combinant, si les effets s'additionnent ?",
    referenceAnswer: 'Environ 25 % (10 % + 15 %).',
    keyFacts: ['25', '10', '15'],
    requiresWeb: true,
    offlineEvidence: [
      {
        title: 'Traitement A — essai clinique',
        url: 'https://example.org/traitement-a',
        snippet: "Le traitement A réduit la pression artérielle systolique d'environ 10 %.",
      },
      {
        title: 'Traitement B — essai clinique',
        url: 'https://example.org/traitement-b',
        snippet: "Le traitement B réduit la pression artérielle systolique d'environ 15 %.",
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Hard reasoning set — composed multi-step problems where unaided models
  // typically slip (nested percentages, unit chains, weighted averages,
  // multi-constraint scheduling).
  // -------------------------------------------------------------------------
  {
    id: 'hard-compound-discount',
    category: 'arithmetic',
    difficulty: 3,
    question:
      'Un produit coûte 250 €. On applique d\'abord une remise de 20 %, puis une taxe de 10 % sur le prix remisé. Quel est le prix final en euros ?',
    referenceAnswer: '220 € (250 × 0,8 = 200 ; 200 × 1,1 = 220).',
    keyFacts: ['220'],
    numericAnswer: 220,
    forbiddenPatterns: ['225', '230'],
    requiresWeb: false,
  },
  {
    id: 'hard-speed-average',
    category: 'arithmetic',
    difficulty: 3,
    question:
      'Un train parcourt 315 km en 2 h 30 min. Quelle est sa vitesse moyenne en km/h ?',
    referenceAnswer: '126 km/h (315 / 2,5 = 126).',
    keyFacts: ['126'],
    numericAnswer: 126,
    forbiddenPatterns: ['157.5', '130'],
    requiresWeb: false,
  },
  {
    id: 'hard-weighted-average',
    category: 'arithmetic',
    difficulty: 3,
    question:
      'Un élève obtient 12/20 coefficient 2, 15/20 coefficient 3 et 9/20 coefficient 1. Quelle est sa moyenne pondérée sur 20 ?',
    referenceAnswer: '13 (24 + 45 + 9 = 78 ; 78 / 6 = 13).',
    keyFacts: ['13'],
    numericAnswer: 13,
    forbiddenPatterns: ['12', '12.5'],
    requiresWeb: false,
  },
  {
    id: 'hard-compound-interest',
    category: 'arithmetic',
    difficulty: 3,
    question:
      'Un capital de 1 000 € est placé à 5 % par an avec intérêts composés pendant 2 ans. Quelle est la valeur finale en euros (arrondi au centime) ?',
    referenceAnswer: '1 102,50 € (1000 × 1,05² = 1102,5).',
    keyFacts: ['1102.5'],
    numericAnswer: 1102.5,
    forbiddenPatterns: ['1100', '1050'],
    requiresWeb: false,
  },
  {
    id: 'hard-scheduling-rooms',
    category: 'logic',
    difficulty: 3,
    question:
      'Quatre réunions A, B, C, D doivent être planifiées à des heures distinctes. A doit avoir lieu avant B. C doit avoir lieu après B. D doit avoir lieu avant A. Quel est l\'ordre chronologique complet ? Réponds sous la forme D, A, B, C.',
    referenceAnswer: 'D, A, B, C',
    keyFacts: ['d', 'a', 'b', 'c'],
    orderedFacts: ['d', 'a', 'b', 'c'],
    requiresWeb: false,
  },
  {
    id: 'hard-contradiction-detect',
    category: 'logic',
    difficulty: 3,
    question:
      'Deux rapports se contredisent-ils ? Rapport 1 : « Le serveur a fonctionné sans interruption toute la journée. » Rapport 2 : « Le serveur a redémarré à 14 h suite à une panne. » Réponds OUI ou NON et justifie en une phrase.',
    referenceAnswer: 'OUI, les deux rapports sont incompatibles (redémarrage = interruption).',
    keyFacts: ['oui'],
    forbiddenPatterns: ['non'],
    requiresWeb: false,
  },
  {
    id: 'hard-planning-release',
    category: 'planning',
    difficulty: 3,
    question:
      'Ordonne ces six étapes de release : Écrire le code, Relire le code, Écrire les tests, Exécuter les tests, Déployer en staging, Déployer en production. Contraintes : Écrire le code avant de le relire ; Écrire le code avant d\'écrire les tests ; Écrire les tests avant d\'exécuter les tests ; Relire le code avant de déployer en staging ; Exécuter les tests avant de déployer en staging ; Déployer en staging avant de déployer en production. Attention : relire le code et écrire les tests peuvent être dans n\'importe quel ordre.',
    referenceAnswer:
      '1. Écrire le code, puis (Relire le code / Écrire les tests dans n\'importe quel ordre), puis Exécuter les tests, puis Déployer en staging, puis Déployer en production',
    keyFacts: ['ecrire le code', 'relire le code', 'ecrire les tests', 'executer les tests', 'deployer en staging', 'deployer en production'],
    orderedFacts: ['ecrire le code', 'executer les tests', 'deployer en staging', 'deployer en production'],
    requiresWeb: false,
  },
  {
    id: 'hard-synthesis-budget',
    category: 'synthesis',
    difficulty: 3,
    question:
      'Un projet a un budget de 12 000 €. La phase 1 coûte 45 % du budget, la phase 2 coûte 30 % du reste après la phase 1. Combien reste-t-il en euros après les deux phases ?',
    referenceAnswer: '4 620 € (phase 1 = 5 400 ; reste 6 600 ; phase 2 = 1 980 ; reste 4 620).',
    keyFacts: ['4620'],
    numericAnswer: 4620,
    forbiddenPatterns: ['1800', '3600'],
    requiresWeb: false,
  },

  // -------------------------------------------------------------------------
  // Tool-leverage suite (ids `levier-*`): problems designed so that the
  // calculator / verification / planning tools change the outcome. Reported
  // separately with --prefix=levier.
  // -------------------------------------------------------------------------
  {
    id: 'levier-mult',
    category: 'arithmetic',
    difficulty: 3,
    question: 'Calcule 47 253 × 86 + 19 402 × 7. Donne le résultat exact.',
    referenceAnswer: '4 199 572 (47 253 × 86 = 4 063 758 ; 19 402 × 7 = 135 814).',
    keyFacts: ['4199572'],
    numericAnswer: 4199572,
    requiresWeb: false,
  },
  {
    id: 'levier-percent',
    category: 'arithmetic',
    difficulty: 3,
    question:
      'Un prix de 84 559 € augmente de 17 %, puis baisse de 9 %. Quel est le prix final arrondi à l\'euro ?',
    referenceAnswer: '90 030 € (84 559 × 1,17 = 98 934,03 ; 98 934,03 × 0,91 = 90 029,9673).',
    keyFacts: ['90030'],
    numericAnswer: 90030,
    requiresWeb: false,
  },
  {
    id: 'levier-units',
    category: 'arithmetic',
    difficulty: 3,
    question:
      'Un véhicule roule à 83 km/h pendant 3 h 45 min. Quelle distance parcourt-il, en km (résultat exact) ?',
    referenceAnswer: '311,25 km (3 h 45 min = 3,75 h ; 83 × 3,75 = 311,25).',
    keyFacts: ['311.25'],
    numericAnswer: 311.25,
    requiresWeb: false,
  },
  {
    id: 'levier-chain',
    category: 'arithmetic',
    difficulty: 3,
    question: 'Calcule ((2 457 + 5 643) × 12 − 8 400) / 6. Donne le résultat exact.',
    referenceAnswer: '14 800 ((2 457 + 5 643) = 8 100 ; × 12 = 97 200 ; − 8 400 = 88 800 ; / 6 = 14 800).',
    keyFacts: ['14800'],
    numericAnswer: 14800,
    requiresWeb: false,
  },
  {
    id: 'levier-division',
    category: 'arithmetic',
    difficulty: 3,
    question: 'Calcule (987 654 − 123 456) / 6. Donne le résultat exact.',
    referenceAnswer: '144 033 (987 654 − 123 456 = 864 198 ; 864 198 / 6 = 144 033).',
    keyFacts: ['144033'],
    numericAnswer: 144033,
    requiresWeb: false,
  },
  {
    id: 'levier-invalid-chain',
    category: 'arithmetic',
    difficulty: 3,
    question:
      'Vérifie ce raisonnement et dis s\'il est correct : « (845 + 1 255) × 12 = 25 200, puis 25 200 / 5 = 4 800 ». Si c\'est faux, donne le résultat correct.',
    referenceAnswer: 'Faux : 25 200 / 5 = 5 040, pas 4 800.',
    keyFacts: ['5040'],
    numericAnswer: 5040,
    requiresWeb: false,
  },
  {
    id: 'levier-contradiction',
    category: 'logic',
    difficulty: 2,
    question:
      'Doc A : « La production a augmenté de 12 % en 2025. » Doc B : « La production a diminué de 3 % en 2025. » Les deux documents sont-ils compatibles ? Réponds OUI ou NON et justifie.',
    referenceAnswer: 'NON : les deux documents décrivent une évolution opposée de la production la même année.',
    keyFacts: ['non', 'opposee'],
    forbiddenPatterns: ['oui'],
    requiresWeb: false,
  },
];

export function getBenchTasks(): BenchTask[] {
  return [...BENCH_TASKS, ...REAL_BENCH_TASKS];
}

export function getRealBenchTasks(): BenchTask[] {
  return [...REAL_BENCH_TASKS];
}

export function selectTasks(options: {
  category?: BenchTask['category'];
  prefix?: string;
  limit?: number;
}): BenchTask[] {
  let tasks = getBenchTasks();
  if (options.category) {
    tasks = tasks.filter(task => task.category === options.category);
  }
  if (options.prefix) {
    tasks = tasks.filter(task => task.id.startsWith(options.prefix as string));
  }
  if (options.limit !== undefined && options.limit > 0) {
    tasks = tasks.slice(0, options.limit);
  }
  return tasks;
}
