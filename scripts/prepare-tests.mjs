import{readdir,access}from'node:fs/promises';import{resolve,dirname}from'node:path';import{spawnSync}from'node:child_process';
// npm 11 may require explicit approval of native package postinstall scripts.
for(const name of await readdir('node_modules/@embedded-postgres')){const file=resolve('node_modules/@embedded-postgres',name,'scripts/hydrate-symlinks.js');try{await access(file);}catch{continue;}const r=spawnSync(process.execPath,[file],{cwd:resolve(dirname(file),'..'),stdio:'inherit'});if(r.status!==0)process.exit(r.status||1);}
