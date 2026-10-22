import { defineConfig } from 'vitest/config';
import { loadEnv, type Plugin } from 'vite';
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

/** Bedient POST /api/wall-read auch im Dev-Server, damit `npm run dev` ohne Vercel reicht (Schlüssel aus .env.local). */
const wallReadApi = (env: Record<string, string>): Plugin => ({
  name: 'wall-read-api',
  configureServer(server) {
    server.middlewares.use('/api/wall-read', async (req, res) => {
      if (req.method !== 'POST') {
        res.statusCode = 405;
        res.end();
        return;
      }
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(chunk as Buffer);
      let body: unknown = null;
      try {
        body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      } catch {
        /* bleibt null, wird als bad_request beantwortet */
      }
      const { handleWallRead } = await server.ssrLoadModule('/api/_wallRead.ts');
      const result = await handleWallRead(body, { ...process.env, ...env });
      res.statusCode = result.status;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(result.body));
    });
  },
});

export default defineConfig(({ mode }) => ({
  plugins: [stripGoogleFonts(), react(), wallReadApi(loadEnv(mode, process.cwd(), ''))],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
}));
