// Serverless-Funktion (Vercel: POST /api/wall-read). Die Arbeit macht api/_wallRead.ts.
import { handleWallRead } from './_wallRead';

interface Req {
  method?: string;
  body?: unknown;
}
interface Res {
  status(code: number): Res;
  json(body: unknown): void;
  setHeader(name: string, value: string): void;
}

export default async function handler(req: Req, res: Res): Promise<void> {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }
  const result = await handleWallRead(req.body, process.env);
  res.status(result.status).json(result.body);
}
