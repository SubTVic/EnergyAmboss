import { defineConfig } from 'vitest/config';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * PaperCSS lädt seine Handschrift-Schriften per @import von Google Fonts. Wir verwenden Systemschriften
 * (siehe src/shared/styles.css): kein Request an Google (Datenschutz, schnellerer Start) und ein ruhigerer Look.
 */
const stripGoogleFonts = (): Plugin => ({
  name: 'strip-google-fonts-import',
  enforce: 'pre',
  transform(code, id) {
    if (id.includes('papercss') && id.endsWith('.css')) {
      return code.replace(/@import\s+url\(["']?https:\/\/fonts\.googleapis\.com[^)]*\)\s*;?/g, '');
    }
    return null;
  },
});

export default defineConfig({
  plugins: [stripGoogleFonts(), react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
