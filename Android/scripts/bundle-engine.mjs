import { createRequire } from 'node:module';
import { join } from 'node:path';

const [webProject, entry, outfile] = process.argv.slice(2);
const requireFromWeb = createRequire(join(webProject, 'package.json'));
let esbuild;
try {
    esbuild = requireFromWeb('esbuild');
} catch (error) {
    throw new Error('Install the pinned generator build tools with npm ci in Web/.', { cause: error });
}

await esbuild.build({
    entryPoints: [entry],
    outfile,
    bundle: true,
    platform: 'browser',
    target: 'es2020',
    format: 'iife',
});
