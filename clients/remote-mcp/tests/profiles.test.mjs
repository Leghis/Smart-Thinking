import test from 'node:test';
import assert from 'node:assert/strict';
import { selectTools, TOOL_PROFILES } from '../protocol.mjs';
const catalogue = [...new Set(Object.values(TOOL_PROFILES).flat())].map(name => ({ name, inputSchema: { type: 'object' }, description: name }));
test('full profile retains all received definitions and is the default', () => assert.deepEqual(selectTools(catalogue), catalogue));
for (const profile of Object.keys(TOOL_PROFILES))
    test('explicit discovery profile ' + profile, () => { const selected = selectTools(catalogue, profile); assert.deepEqual(selected.map(t => t.name).sort(), [...TOOL_PROFILES[profile]].sort()); assert.ok(selected.every(t => catalogue.includes(t))); });
test('invalid profile fails before any connection', () => assert.throws(() => selectTools(catalogue, 'auto-guess')));
test('profile only filters present capabilities, never invents a tool', () => assert.deepEqual(selectTools([{ name: 'calculate' }], 'math').map(t => t.name), ['calculate']));
test('math profile excludes network search and audit ceremony from model context', () => { const names = selectTools(catalogue, 'math').map(t => t.name); assert.ok(names.includes('finite_compute')); assert.ok(!names.includes('web_search')); assert.ok(!names.includes('run_create')); });

// L13 — fermeture des profils sur leurs dépendances : un profil qui expose un
// outil exigeant un dossier (claim/verify) doit aussi fournir les moyens de le
// créer, de le relire et d'enregistrer des sources. Aucun profil ne doit
// dépendre silencieusement d'outils qu'il ne présente pas.
const RUN_TOOLS = ['run_create', 'run_get'];
const SOURCE_TOOLS = ['artifact_import', 'artifact_get'];
for (const [profile, tools] of Object.entries(TOOL_PROFILES)) {
    const admitsDossierWork = tools.some(t => ['claim', 'claim_revise', 'requirement_add', 'verify', 'audit', 'run_finalize'].includes(t));
    test(`dependency closure of profile ${profile}`, () => {
        if (admitsDossierWork)
            for (const required of [...RUN_TOOLS, ...SOURCE_TOOLS])
                assert.ok(tools.includes(required), `${profile} exposes dossier work but misses ${required}`);
        if (tools.includes('verify'))
            assert.ok(tools.includes('claim') || tools.includes('check'), `${profile}: verify needs claim or the stateless check`);
        if (tools.includes('run_finalize'))
            for (const required of ['audit', 'requirement_add'])
                assert.ok(tools.includes(required), `${profile}: run_finalize needs ${required}`);
        if (tools.includes('claim'))
            assert.ok(tools.includes('budget_status') && tools.includes('operation_get'), `${profile}: claim must be traceable`);
    });
}
