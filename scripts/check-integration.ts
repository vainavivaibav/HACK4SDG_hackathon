import {strict as assert} from 'node:assert';
import {readFile,readdir,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {theme} from '@hunger/core';
import {copyFor as webCopy} from '../apps/web/lib/presentation';
import {copyFor as mobileCopy} from '../apps/mobile/src/ui/copy';
const read=(p:string)=>readFile(p,'utf8');
const release=JSON.parse(await read('docs/RELEASE.json'));
const lock=JSON.parse(await read('package-lock.json'));
const styles=await read('packages/ui/src/styles.css');
const root=styles.match(/:root\s*\{([^}]+)/)![1];
for(const [key,value] of Object.entries(theme))assert.equal(root.match(new RegExp(`--${key}:\\s*([^;}]+)`))?.[1].trim(),value,`Shared ${key} differs between CSS and native theme`);
assert.match(await read('apps/mobile/src/ui/styles.ts'),/palette\s*=\s*theme/,'Mobile must use shared theme');
for(const lang of ['en','kn','hi'] as const)assert.deepEqual(webCopy(lang),mobileCopy(lang),`${lang} presentation copy differs`);
for(const name of ['thali','pulao','biryani']){
 const digest=async(p:string)=>createHash('sha256').update(await readFile(p)).digest('hex');
 assert.equal(await digest(`apps/web/public/assets/${name}-v2.jpg`),await digest(`apps/mobile/assets/${name}-v2.jpg`),`${name} assets differ`);
}
let project:string|undefined;
for(const app of ['web','mobile','console']){
 const file=`apps/${app}/package.json`,pkg=JSON.parse(await read(file));
 for(const section of ['dependencies','devDependencies'])for(const [key,value] of Object.entries(pkg[section]||{})){
  assert.equal(lock.packages[`apps/${app}`][section]?.[key],value,`${file}: ${key} lockfile mismatch`);
  if(!key.startsWith('@hunger/'))assert.match(String(value),/^\d+\.\d+\.\d+(?:[-+][\w.-]+)?$/,`${file}: ${key} must be pinned`);
 }
 const env=await read(`apps/${app}/.env.example`);
 const url=env.match(/(?:NEXT|EXPO)_PUBLIC_SUPABASE_URL=(.+)/)?.[1].trim();
 assert.ok(url,`${app}: project URL missing`);project??=url;assert.equal(url,project,`${app}: different Supabase project`);
 assert.match(env,/(?:NEXT|EXPO)_PUBLIC_SUPABASE_PUBLISHABLE_KEY=\s*$/m,`${app}: only blank publishable example key is permitted`);
}
const schema=await read('backend/schema.sql');
const migrations=(await readdir('backend/supabase/migrations')).filter(p=>p.endsWith('.sql'));
assert.equal(migrations.length,1,'Review migration history before changing the schema contract check');
assert.equal(await read(`backend/supabase/migrations/${migrations[0]}`),schema,'Initial migration and schema differ');
const api=await read('packages/core/src/api.ts');
const rpcs=[...api.matchAll(/this\.rpc(?:<[^>]*>)?\('([^']+)'/g)].map(m=>m[1]);
assert.ok(rpcs.length>=10,'RPC discovery unexpectedly incomplete');
for(const rpc of rpcs)assert.match(schema,new RegExp(`function\\s+public\\.${rpc}\\s*\\(`,'i'),`Backend RPC ${rpc} missing`);
for(const filename of ['01-website.md','02-mobile-app.md','03-backend.md','04-host-admin-integration.md'])assert.ok((await read(`handoff/${filename}`)).includes(release.id),`${filename}: release marker differs`);
for(const path of ['apps/web','apps/mobile','backend','apps/console','packages/core','packages/ui'])await access(path);
console.log(`${release.id}: shared palette, EN/KN/HI copy, image hashes, package lock, project URL, ${rpcs.length} RPCs, schema/migration and all four handoffs agree.`);
