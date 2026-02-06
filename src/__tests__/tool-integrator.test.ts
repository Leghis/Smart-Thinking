import { ToolIntegrator } from '../tool-integrator';
import { callInternalLlm } from '../utils/openrouter-client';

jest.mock('../utils/openrouter-client', () => ({
  callInternalLlm: jest.fn(),
}));

const mockedCallInternalLlm = callInternalLlm as jest.MockedFunction<typeof callInternalLlm>;

describe('ToolIntegrator', () => {
  const originalEnableExternal = process.env.SMART_THINKING_ENABLE_EXTERNAL_TOOLS;

  beforeEach(() => {
    process.env.SMART_THINKING_ENABLE_EXTERNAL_TOOLS = undefined;
    mockedCallInternalLlm.mockReset();
    mockedCallInternalLlm.mockResolvedValue(null);
  });

  afterAll(() => {
    if (originalEnableExternal === undefined) {
      delete process.env.SMART_THINKING_ENABLE_EXTERNAL_TOOLS;
      return;
    }

    process.env.SMART_THINKING_ENABLE_EXTERNAL_TOOLS = originalEnableExternal;
  });

  it('utilise la réponse LLM quand elle est valide', async () => {
    process.env.SMART_THINKING_ENABLE_EXTERNAL_TOOLS = 'true';
    mockedCallInternalLlm.mockResolvedValueOnce(
      '[{"name":"tavily-search","reason":"Recherche web détaillée"}]'
    );

    const integrator = new ToolIntegrator();
    const suggestions = await integrator.suggestToolsGeneric('Je veux vérifier cette information récente', {
      verificationMode: true,
      limit: 3,
    });

    expect(suggestions[0].name).toBe('tavily-search');
    expect(suggestions[0].reason).toContain('Recherche web détaillée');
    expect(suggestions[0].priority).toBe(1);
  });

  it('retombe sur les heuristiques si la réponse LLM est invalide', async () => {
    process.env.SMART_THINKING_ENABLE_EXTERNAL_TOOLS = 'true';
    mockedCallInternalLlm.mockResolvedValueOnce('Réponse non JSON');

    const integrator = new ToolIntegrator();
    const suggestions = await integrator.suggestToolsGeneric(
      'Peux-tu rechercher des informations web et vérifier des statistiques ? ',
      {
        verificationMode: true,
        limit: 2,
      }
    );

    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.some(s => ['tavily-search', 'perplexity_search_web', 'brave_web_search'].includes(s.name))).toBe(true);
  });

  it('désactive les suggestions externes par défaut (mode sans clé API)', async () => {
    const integrator = new ToolIntegrator();
    const suggestions = await integrator.suggestToolsGeneric('Je veux vérifier cette information récente', {
      verificationMode: true,
      limit: 3,
    });

    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.some(s => ['tavily-search', 'perplexity_search_web', 'brave_web_search', 'tavily-extract'].includes(s.name))).toBe(false);
    expect(suggestions.some(s => ['executePython', 'executeJavaScript'].includes(s.name))).toBe(true);
  });

  it('renvoie vide quand le filtre d’outils exclut tout', async () => {
    const integrator = new ToolIntegrator();
    const suggestions = await integrator.suggestToolsGeneric('analyse fichier', {
      verificationMode: false,
      toolFilter: ['outil-inexistant'],
    });

    expect(suggestions).toEqual([]);
  });

  it('suggère des outils non-vérification en fonction des intentions locales', async () => {
    const integrator = new ToolIntegrator();
    const suggestions = await integrator.suggestToolsGeneric(
      'Liste les fichiers du dossier local, puis recherche un motif regex et exécute une commande shell',
      {
        verificationMode: false,
        reasoningStage: 'advanced',
        previousSuggestions: [{ name: 'list_files', confidence: 0.8, reason: 'déjà vu', priority: 1 }],
        limit: 5,
      }
    );

    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.some(s => ['list_files', 'search_files', 'execute_command', 'read_file'].includes(s.name))).toBe(true);
  });

  it('exécute les outils de vérification supportés', async () => {
    process.env.SMART_THINKING_ENABLE_EXTERNAL_TOOLS = 'true';
    const integrator = new ToolIntegrator();

    const names = [
      'perplexity_search_web',
      'tavily-search',
      'brave_web_search',
      'tavily-extract',
      'executePython',
      'executeJavaScript',
    ] as const;

    for (const name of names) {
      const result = await integrator.executeVerificationTool(name, '2 + 2 = 4');
      expect(result).toBeTruthy();
      expect(result.isValid).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.7);
    }
  });

  it('retourne un fallback local pour les outils externes désactivés', async () => {
    const integrator = new ToolIntegrator();

    const result = await integrator.executeVerificationTool('tavily-search', '2 + 2 = 4');
    expect(result).toBeTruthy();
    expect(result.isValid).toBe('uncertain');
    expect(result.confidence).toBeLessThan(0.5);
  });

  it('rejette les outils de vérification non supportés', async () => {
    const integrator = new ToolIntegrator();
    await expect(integrator.executeVerificationTool('unknown-tool', 'contenu')).rejects.toThrow('non pris en charge');
  });

  it('gère le registre dynamique des outils', () => {
    const integrator = new ToolIntegrator();
    const before = integrator.getAllTools().length;

    integrator.addTool('custom_tool', 'desc', ['custom'], 'cas custom');
    expect(integrator.getAllTools().some(t => t.name === 'custom_tool')).toBe(true);

    const removed = integrator.removeTool('custom_tool');
    expect(removed).toBe(true);
    expect(integrator.getAllTools().length).toBe(before);
  });

  it('couvre les générateurs de raisons internes', () => {
    const integrator = new ToolIntegrator();
    const tools = integrator.getAllTools();

    const question = 'Que dit la source sur ce sujet ?';
    const longContent = 'A'.repeat(250);
    const urlContent = 'Analyse cette URL https://example.com/document.';

    const byName = (name: string) => tools.find(t => t.name === name);

    const reasonPerplexity = (integrator as any).generateReason(byName('perplexity_search_web'), question);
    const reasonBrave = (integrator as any).generateReason(byName('brave_web_search'), question);
    const reasonLocal = (integrator as any).generateReason(byName('brave_local_search'), 'restaurant près de moi');
    const reasonTavily = (integrator as any).generateReason(byName('tavily-search'), longContent);
    const reasonExtract = (integrator as any).generateReason(byName('tavily-extract'), urlContent);
    const reasonPython = (integrator as any).generateReason(byName('executePython'), 'calcul python');
    const reasonJs = (integrator as any).generateReason(byName('executeJavaScript'), 'calcul js');

    expect(reasonPerplexity).toContain('question');
    expect(reasonBrave).toContain('question');
    expect(reasonLocal).toContain('locaux');
    expect(reasonTavily).toContain('complexe');
    expect(reasonExtract).toContain('URLs');
    expect(reasonPython).toContain('Python');
    expect(reasonJs).toContain('JavaScript');

    const verificationReason = (integrator as any).generateVerificationReason(byName('tavily-search'), 'vérifie');
    const defaultVerificationReason = (integrator as any).generateVerificationReason({ name: 'x', useCase: 'cas par défaut' }, 'x');
    expect(verificationReason).toContain('Tavily');
    expect(defaultVerificationReason).toContain('cas par défaut');

    expect((integrator as any).containsAny('abc def', ['def'])).toBe(true);
    expect((integrator as any).containsAny('abc def', ['zzz'])).toBe(false);
  });

  it('expose les méthodes publiques de haut niveau', async () => {
    const integrator = new ToolIntegrator();

    const general = await integrator.suggestTools('Créer un fichier local et lister le dossier', 3);
    const verification = await integrator.suggestVerificationTools('Vérifier cette statistique 25%', 2);

    expect(general.length).toBeGreaterThan(0);
    expect(verification.length).toBeGreaterThan(0);
  });
});
