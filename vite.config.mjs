import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

// For GitHub Pages project sites, assets must be served from 
// "/<repo-name>/". This sets the correct base for builds while
// keeping dev server behavior unchanged.
const repoBase = '/jossos-world/';

export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE || repoBase,
});
