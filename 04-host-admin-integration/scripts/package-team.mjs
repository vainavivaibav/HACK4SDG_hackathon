import{readdir,readFile,writeFile,mkdir,stat}from'node:fs/promises';
import{resolve,relative,join,sep}from'node:path';import{createHash}from'node:crypto';import{spawnSync}from'node:child_process';
const root=process.cwd();const output=resolve(process.argv[2]||'../output/hackathon');
const groups=[
 {archive:'01-website.zip',owner:'Teammate 1: worker website',paths:['apps/web','handoff/01-website.md']},
 {archive:'02-mobile-app.zip',owner:'Teammate 2: Expo mobile app',paths:['apps/mobile','handoff/02-mobile-app.md']},
 {archive:'03-backend.zip',owner:'Teammate 3: Supabase backend',paths:['backend','handoff/03-backend.md']},
 {archive:'04-host-admin-integration.zip',owner:'Teammate 4: host/admin, shared contracts and integration',paths:['apps/console','packages','scripts','integration','docs','legacy','handoff/04-host-admin-integration.md','package.json','package-lock.json','tsconfig.base.json','playwright.config.ts','.gitignore','README.md']}
];
const excluded=new Set(['node_modules','dist','out','.expo','.git','.temp','test-results','playwright-report','.DS_Store','coverage']);
async function walk(path){const info=await stat(path);if(!info.isDirectory())return[path];let out=[];for(const d of await readdir(path,{withFileTypes:true})){if(excluded.has(d.name)||d.name.startsWith('.next')||d.name.endsWith('.tsbuildinfo')||d.name.startsWith('.env')&&d.name!=='.env.example')continue;if(d.isSymbolicLink())throw new Error('Unexpected source symlink: '+d.name);out.push(...await walk(join(path,d.name)));}return out;}
const seen=new Set(),manifest={format:1,baseRepository:'https://github.com/vainavivaibav/HACK4SDG_hackathon.git',instructions:'Extract all four archives into the same repository root. No commits or pushes were made.',modules:[]};
for(const g of groups){const files=[];for(const p of g.paths)files.push(...await walk(resolve(root,p)));g.files=files.map(f=>relative(root,f).split(sep).join('/')).sort();for(const path of g.files){if(seen.has(path))throw new Error('Ownership collision: '+path);seen.add(path);if(path.includes('/.env')&&!path.endsWith('.env.example'))throw new Error('Private environment file: '+path);}const hashes=[];for(const path of g.files){if(path==='docs/DELIVERY-MANIFEST.json'||path==='docs/REPOSITORY-TREE.txt')continue;hashes.push({path,sha256:createHash('sha256').update(await readFile(resolve(root,path))).digest('hex')});}manifest.modules.push({archive:g.archive,owner:g.owner,files:hashes});}
await writeFile('docs/DELIVERY-MANIFEST.json',JSON.stringify(manifest,null,2)+'\n');await writeFile('docs/REPOSITORY-TREE.txt',[...seen,'docs/DELIVERY-MANIFEST.json','docs/REPOSITORY-TREE.txt'].filter((v,i,a)=>a.indexOf(v)===i).sort().join('\n')+'\n');
groups[3].files=[...new Set([...groups[3].files,'docs/DELIVERY-MANIFEST.json','docs/REPOSITORY-TREE.txt'])].sort();
await mkdir(output,{recursive:true});
const python=String.raw`import sys,json,zipfile,pathlib
request=json.load(sys.stdin)
for group in request['groups']:
 target=pathlib.Path(request['output'])/group['archive']
 with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
  for path in group['files']: z.write(pathlib.Path(request['root'])/path,path)
 with zipfile.ZipFile(target) as z:
  assert z.testzip() is None
 print(str(target))
`;
const result=spawnSync(process.platform==='win32'?'python':'python3',['-c',python],{input:JSON.stringify({root,output,groups}),encoding:'utf8'});if(result.status!==0)throw new Error(result.stderr||'ZIP creation failed. Install Python 3.');console.log(result.stdout.trim());console.log(`Verified ${groups.length} disjoint archives; ${seen.size} source paths.`);
