import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Builds one self-contained HTML file (used to publish a shareable preview).
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  build: { outDir: 'dist-artifact', rollupOptions: { input: 'artifact.html' } },
});
