// Erzeugt supabase/seed.sql aus content/e-questions.json (einzige Quelle für die Fragen von Prototyp E).
// Aufruf: npm run seed:sql
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const questions = JSON.parse(readFileSync(join(root, 'content/e-questions.json'), 'utf8'));

const q = (v) => (v === null || v === undefined ? 'null' : `'${String(v).replaceAll("'", "''")}'`);
const b = (v) => (v === null || v === undefined ? 'null' : v ? 'true' : 'false');

const rows = questions.map(
  (r) =>
    `  (${[
      q(r.id),
      q(r.league),
      q(r.title),
      q(r.details),
      q(r.category),
      q(r.close_date),
      q(r.resolution_source),
      b(r.practice),
      b(r.outcome),
      q(r.resolved_at),
      b(r.verify),
    ].join(', ')})`,
);

const sql = `-- Fragen für Prototyp E. Erzeugt aus content/e-questions.json (npm run seed:sql), nicht von Hand ändern.
-- Alle Zeilen mit verify = true sind Platzhalter: Region, Werte, Ausgang und Quelle vom Team prüfen.

insert into questions
  (id, league, title, details, category, close_date, resolution_source, practice, outcome, resolved_at, verify)
values
${rows.join(',\n')}
on conflict (id) do nothing;
`;

writeFileSync(join(root, 'supabase/seed.sql'), sql);
console.log(`supabase/seed.sql geschrieben (${questions.length} Fragen)`);
