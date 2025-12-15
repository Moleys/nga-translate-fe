import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

// Plugin to copy public folder to dist
function copyPublicPlugin() {
  return {
    name: 'copy-public',
    closeBundle() {
      const publicDir = resolve(__dirname, 'public');
      const distDir = resolve(__dirname, 'dist');
      
      function copyRecursive(src, dest) {
        try {
          const stats = statSync(src);
          if (stats.isDirectory()) {
            mkdirSync(dest, { recursive: true });
            readdirSync(src).forEach(file => {
              copyRecursive(join(src, file), join(dest, file));
            });
          } else {
            mkdirSync(resolve(dest, '..'), { recursive: true });
            copyFileSync(src, dest);
          }
        } catch (err) {
          console.warn('Copy warning:', err.message);
        }
      }
      
      // Copy manifest.json and sw.js to root of dist
      copyFileSync(join(publicDir, 'manifest.json'), join(distDir, 'manifest.json'));
      copyFileSync(join(publicDir, 'sw.js'), join(distDir, 'sw.js'));
      
      // Copy assets folder
      copyRecursive(join(publicDir, 'assets'), join(distDir, 'assets'));
      
      console.log('✓ PWA files copied to dist');
    }
  };
}

export default defineConfig({
  root: 'frontend',
  base: '/',
  publicDir: false, // We'll handle public files manually
  resolve: {
    alias: {
      '/assets/jieba-wasm-html/jieba_rs_wasm.js': resolve(__dirname, 'public/assets/jieba-wasm-html/jieba_rs_wasm.js')
    }
  },
  plugins: [
    svelte({
      emitCss: false
    }),
    copyPublicPlugin()
  ],
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    assetsDir: 'assets',
    cssCodeSplit: false,
    rollupOptions: {
      input: resolve(__dirname, 'frontend/index.html'),
      output: {
        inlineDynamicImports: true,
        entryFileNames: 'assets/js/app.js',
        chunkFileNames: 'assets/js/app.js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith('.css')) {
            return 'assets/css/[name][extname]';
          }
          return 'assets/[name][extname]';
        }
      }
    }
  }
});

