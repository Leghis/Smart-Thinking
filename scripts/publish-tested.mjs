#!/usr/bin/env node
/** Publish a tested archive through npm's directory manifest preparation (includes README metadata). */
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const [archive,tag='next']=process.argv.slice(2).filter(a=>a!=='--execute');
if(!archive||!process.argv.includes('--execute'))throw Error('Usage: node scripts/publish-tested.mjs ARCHIVE.tgz [TAG] --execute. Set NPM_CONFIG_USERCONFIG to the private publishing configuration.');
const input=resolve(archive),temp=mkdtempSync(join(tmpdir(),'st-publish-tested-'));
const hash=b=>createHash('sha512').update(b).digest('hex'),original=hash(readFileSync(input));
try{
 const entries=execFileSync('tar',['-tzf',input],{encoding:'utf8'}).trim().split('\n');
 assert.ok(entries.every(p=>p.startsWith('package/')&&!p.split('/').includes('..')));
 execFileSync('tar',['-xzf',input,'-C',temp]);
 const cwd=join(temp,'package');assert.ok(readFileSync(join(cwd,'README.md'),'utf8').trim().length);
 const repacked=JSON.parse(execFileSync('npm',['pack','--ignore-scripts','--json','--pack-destination',temp],{cwd,encoding:'utf8'}))[0];
 assert.equal(hash(readFileSync(join(temp,repacked.filename))),original,'Repacking changed the tested artifact. Publication stopped.');
 execFileSync('npm',['publish','.','--ignore-scripts','--tag',tag,'--access','public'],{cwd,stdio:'inherit'});
 console.log('Published the exact tested bytes with directory-prepared README metadata. Verify registry integrity and README before promotion.');
}finally{rmSync(temp,{recursive:true,force:true});}
