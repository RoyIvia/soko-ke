import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

const projectRoot = path.resolve(import.meta.dirname);
const workspaceRoot = path.resolve(import.meta.dirname, '../..');

const port = Number(process.env.PORT ?? 5173);
const basePath = process.env.BASE_PATH ?? '/';

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${process.env.PORT}"`);
}

export default defineConfig({
  root: projectRoot,

  // Load environment files from the repository root.
  // Local:      /Users/royivia/Desktop/soko-ke/.env
  // Production: /opt/soko-ke/.env
  envDir: workspaceRoot,

  base: basePath,

  plugins: [
    react(),
    tailwindcss(),
  ],

  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
    },
    dedupe: ['react', 'react-dom'],
  },

  build: {
    outDir: path.resolve(import.meta.dirname, 'dist/public'),
    emptyOutDir: true,
  },

  server: {
    port,
    strictPort: true,
    host: '0.0.0.0',
    allowedHosts: true,
    fs: {
      strict: true,
    },
  },

  preview: {
    port,
    host: '0.0.0.0',
    allowedHosts: true,
  },
});
