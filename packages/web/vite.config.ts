import { defineConfig } from 'vite';
import { scopedName } from './vite/scopedName.ts';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { devProxy } from './vite/devProxy.ts';
import { emitAsset } from './vite/emitAsset.ts';

export default defineConfig({
  plugins: [devProxy(), viteSingleFile(), emitAsset()],
  css: { modules: { generateScopedName: scopedName } },
  build: { outDir: 'dist', target: 'es2023', minify: true },
});
