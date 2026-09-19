import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import release from '../../contracts/release.json' with {type:'json'};
for(const [file,key]of [['claude-desktop.json','mcpServers'],['cursor.json','mcpServers'],['vscode-mcp.json','servers']])test('Assistant configuration: '+file,()=>{
 const config=JSON.parse(readFileSync(new URL('../../examples/'+file,import.meta.url),'utf8'));
 const entry=config[key]['smart-thinking'];assert.equal(entry.command,'npx');assert.deepEqual(entry.args,['-y',release.package+'@'+release.clientVersion]);
 if(key==='servers'){assert.equal(entry.type,'stdio');assert.equal(config.mcpServers,undefined);}
});
test('Packaged CLI exposes the doctor and refuses implicit network diagnostics',()=>{
 const result=spawnSync(process.execPath,['bin/smart-thinking.mjs','--doctor'],{encoding:'utf8'});
 assert.equal(result.status,2);assert.match(result.stderr,/--allow-network/);
});
