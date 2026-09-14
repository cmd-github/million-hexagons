import { defineConfig, loadEnv } from 'vite';
import { cp, stat } from 'node:fs/promises';
import { createReadStream, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { appFiles, runtimeFiles, copyFiles } from './scripts/deployment-assets.mjs';
import { stagingViteDefines } from './scripts/staging-vite-defines.mjs';

// Ship visitor assets; the optional stress fixture and canonical compiler inputs
// stay local. Use Vite's resolved paths so other project roots still work.
let config;
export default defineConfig(({mode,command})=>({
  // This mode is dev-only: it hot-reloads against public staging artwork without
  // building a deployable staging-dist bundle or exposing private MH_* settings.
  define:mode==='globe-study'&&command==='serve'?(()=>{
    const monitor=JSON.parse(readFileSync(new URL('./deploy/staging-monitor.json',import.meta.url),'utf8'));
    const settings={...loadEnv('staging',process.cwd(),'MH_'),...process.env};
    return {
      ...stagingViteDefines(settings,`${monitor.assetOrigin}/releases/${monitor.release}`),
      'import.meta.env.VITE_ARTWORK_SNAPSHOTS':JSON.stringify('false'),
    };
  })():{},
  server: { watch: { ignored: ['**/public/artwork/**','**/artifacts/**'] } },
  build: { target: 'es2022', copyPublicDir: false },
  plugins: [{
    name: 'runtime-public-assets',
    configResolved(value) { config=value; },
    configureServer(server) {
      // Artwork generation is intentionally unwatched. Serve its current files
      // directly instead of Vite's startup-only public-file index/HTML fallback.
      const root=path.resolve(server.config.publicDir,'artwork');
      server.middlewares.use(async(req,res,next)=>{
        if(!['GET','HEAD'].includes(req.method))return next();
        let pathname;
        try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{return next();}
        if(!pathname.startsWith('/artwork/'))return next();
        const file=path.resolve(root,pathname.slice('/artwork/'.length));
        if(!file.startsWith(root+path.sep)){res.statusCode=403;res.end();return;}
        try{
          const info=await stat(file);
          if(!info.isFile())throw Error('Not a file');
          res.setHeader('Content-Type',file.endsWith('.json')?'application/json':file.endsWith('.webp')?'image/webp':'application/octet-stream');
          res.setHeader('Content-Length',info.size);
          res.setHeader('Cache-Control','no-cache');
          if(req.method==='HEAD'){res.end();return;}
          const stream=createReadStream(file);stream.on('error',()=>res.destroy());stream.pipe(res);
        }catch{res.statusCode=404;res.setHeader('Content-Type','text/plain');res.end('Artwork asset not found');}
      });
    },
    async closeBundle() {
      if(config.command!=='build'||!config.publicDir)return;
      const output=path.resolve(config.root,config.build.outDir);
      if(path.resolve(config.root)===path.dirname(fileURLToPath(import.meta.url))){
        await copyFiles(config.publicDir,output,appFiles);
        if(config.mode!=='staging')await copyFiles(config.publicDir,output,await runtimeFiles(config.publicDir));
      }else await cp(config.publicDir,output,{recursive:true});
    },
  }],
  preview: { allowedHosts: true },
}));
