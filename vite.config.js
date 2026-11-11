import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { existsSync, readdirSync } from 'node:fs';

// base './' : 어느 폴더에 올려도 동작하게 · examples/*/index.html 도 함께 빌드
const ex = existsSync('examples') ? readdirSync('examples').filter((n) => existsSync(`examples/${n}/index.html`)) : [];
export default defineConfig({
  base: './',
  build: { chunkSizeWarningLimit: 900, rollupOptions: { input: { main: resolve('index.html'), ...Object.fromEntries(ex.map((n) => [n, resolve('examples', n, 'index.html')])) } } },
});
