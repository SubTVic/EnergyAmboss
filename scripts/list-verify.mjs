// Listet alle Inhalte mit verify: true (nicht aus dem Konzeptdokument, vor dem Test prüfen).
// Aufruf: npm run verify:list
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'content');
let total = 0;

function walk(value, path, file, hits) {
  if (Array.isArray(value)) {
    value.forEach((v, i) => walk(v, `${path}[${i}]`, file, hits));
  } else if (value && typeof value === 'object') {
    if (value.verify === true) {
      const name = value.id ?? value.title ?? value.label ?? path;
      hits.push(`${file}  ${path}  ${name}`);
    }
    for (const [k, v] of Object.entries(value)) walk(v, path ? `${path}.${k}` : k, file, hits);
  }
}

for (const file of readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
  const hits = [];
  walk(JSON.parse(readFileSync(join(dir, file), 'utf8')), '', file, hits);
  total += hits.length;
  hits.forEach((h) => console.log(h));
}
console.log(`\n${total} Einträge mit verify: true`);
