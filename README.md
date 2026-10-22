# Fünf Prototypen für Projektentwickler

Eine Web-App mit einer Startseite und fünf klickbaren Prototypen, die dasselbe Konzept in fünf Formen zeigen, plus einem sechsten (F), der zwei davon einfach kombiniert. Alle laufen auf denselben neun Fällen (F1–F9) aus dem Interview, damit man die **Form** vergleicht und nicht den Inhalt.

| Route | Prototyp | Vorbild | Verb |
| --- | --- | --- | --- |
| `/a` | **A** Kreuzen mit vernetzter Bibliothek | AMBOSS (Medizin) | Kreuzen |
| `/b` | **B** Projekt als Beweis | Lean mit Blueprint (Mathematik) | Beweisen |
| `/c` | **C** Flächenportfolio und Informationswert | Play-Based Exploration (Öl und Gas) | Rechnen |
| `/d` | **D** Projekt-Planspiel | Wargaming (Militär) | Spielen |
| `/e` | **E** Prognose-Liga | Superforecasting | Prognostizieren |
| `/f` | **F** Entscheiden mit dem Projektlog | Kombination aus A und B | Entscheiden |

Bewertet werden soll die **Idee**, nicht die Oberfläche: skizzenhafter Look (PaperCSS-Rahmen und -Schatten, aber mit ruhiger Systemschrift statt der Handschrift-Schriften des Frameworks), Graustufen, Farbe nur mit Bedeutung (grün belegt, orange offen, rot gebrochen, blau bereit), auf jeder Seite das Banner „Prototyp: Inhalte fiktiv“. Alle Zahlen, Wahrscheinlichkeiten und Projektdaten sind fiktiv; nur Kostenarten und Abläufe stammen aus dem Interview. Keine Rechtsberatung.

Es werden keine externen Schriften geladen (ein Vite-Plugin in `vite.config.ts` entfernt den Google-Fonts-Import aus PaperCSS), die App fragt also keinen Google-Server an. Die Schrift stellt `--font-ui` in `src/shared/styles.css` ein.

Die Spezifikation liegt in `docs/`: [Konzept](docs/01-konzept-fuenf-prototyp-versionen.md) (was und warum) und [Technischer Umsetzungsplan](docs/02-technischer-umsetzungsplan.md) (wie). Bei Widersprüchen gilt der Umsetzungsplan.

## Schnellstart (Linux)

```bash
# Node.js LTS (>= 22.12), z. B. über nvm
nvm install --lts

npm install
npm run dev        # http://localhost:5173
npm test           # Vitest: Rechenlogik aller fünf Prototypen
npm run build      # Typprüfung + Produktions-Build nach dist/
```

**Ohne Supabase laufen alle fünf Prototypen.** B, C und D sind rein im Browser. A nutzt dann das Platzhalter-Panel, und E, das Panel von A sowie das Feedback arbeiten in einem **lokalen Probemodus** (Daten bleiben im Browser, ein Hinweis steht auf der Seite). Zum Teilen mit anderen braucht es Supabase.

Tester-Kürzel: per URL `?t=K1` übergeben oder beim ersten Feedback eintragen; es wird in `localStorage` gemerkt.

## Projektstruktur

```text
api/judge.ts            optionale KI-Spielleitung für D (Serverless-Funktion)
content/                alle Inhalte, nur JSON (Fälle, Wissensknoten, Karten, Fragen)
docs/                   Konzept und Umsetzungsplan
scripts/                gen-seed.mjs (seed.sql aus JSON), list-verify.mjs (ungeprüfte Inhalte)
src/shared/             Layout, Banner, Feedback, Typen, Inhalte laden, Store, SVG-Karte, Graph
src/a/ … src/e/         je ein Prototyp (Rechenlogik in reinen Funktionen mit Tests)
supabase/               schema.sql, seed.sql
```

Code und Bezeichner sind englisch, alle Oberflächentexte deutsch.

## Inhalte pflegen

Alle Inhalte liegen als JSON in `content/`, getrennt vom Code. Das Team ändert Fälle, Fragen und Karten, ohne Code anzufassen; beim Start werden sie mit zod geprüft (Tippfehler in den Spielkarten werden sofort gemeldet).

| Datei | Inhalt |
| --- | --- |
| `cases.json` | Fallpaket F1–F9 |
| `knowledge.json` | 31 Wissensknoten, 37 Kanten |
| `region.json` | fiktive „Musterkreis“-Region (SVG, viewBox 1000 × 700) |
| `a-questions.json` | 20 Fragen: 9 Einzelwahl, 8 SCT, 3 Kaskade |
| `b-project-windpark-x.json`, `b-law-updates.json` | Demo-Projekt mit Ereignissen, Rechtsstand-Updates |
| `c-sites.json` | acht fiktive Flächen W1–W8 |
| `d-actions.json`, `d-events.json` | 10 Aktionskarten, 16 Ereigniskarten |
| `e-questions.json` | 10 Zukunfts- und 10 Übungsfragen für E |
| `f-decisions.json` | Projektlog „Windpark X“ (6 Einträge) und eine anstehende Entscheidung für F |

**Inhaltsregel:** Alles stammt aus dem Konzeptdokument. Was darüber hinausgeht oder recherchiert werden muss, trägt `verify: true` und erscheint in der Oberfläche als „ungeprüft“. `npm run verify:list` listet alle Einträge (aktuell 22: die 20 Platzhalter-Fragen von E, `n-abstand-wohnhaus` mit der Interview-Notiz „1000km“ und `n-gemeinde`).

Die Fragen von E sind die einzige Quelle für `supabase/seed.sql`. Nach Änderungen an `e-questions.json`: `npm run seed:sql`.

## Supabase einrichten (für E, das Panel von A und das Feedback)

1. Auf supabase.com ein Projekt anlegen, **in einer EU-Region**.
2. Im SQL-Editor zuerst `supabase/schema.sql`, dann `supabase/seed.sql` ausführen.
3. Unter Project Settings → API die Project URL und den `anon`-Key kopieren.
4. `.env.local` anlegen (Vorlage: `.env.example`):

   ```bash
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```

5. **Fragen auflösen** (E): im Supabase-Dashboard in der Tabelle `questions` die Felder `outcome` (true/false) und `resolved_at` setzen. Score und Kalibrierung aktualisieren sich beim nächsten Laden. Neue Fragen ebenfalls dort anlegen; ein Admin-Bereich ist nicht nötig.

Grenzen: Die Policies reichen für einen Test mit eingeladenen Personen, **nicht für die Öffentlichkeit**. Dass fremde Prognosen erst nach der eigenen sichtbar werden, regelt nur die Oberfläche. Keine echten Projektdaten eintragen.

## Umgebungsvariablen

| Variable | Sichtbar für | Wofür |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Browser | Adresse des Supabase-Projekts |
| `VITE_SUPABASE_ANON_KEY` | Browser | öffentlicher Schlüssel, durch die Policies begrenzt |
| `VITE_LLM_JUDGE` | Browser | `1` schaltet die KI-Spielleitung in D ein |
| `ANTHROPIC_API_KEY` | nur Server (`/api/judge`) | Aufrufe an das Sprachmodell |
| `JUDGE_MODEL` | nur Server | optional, Standard `claude-haiku-5-5` |

**Der API-Schlüssel darf nie mit `VITE_` beginnen**, sonst landet er im Browser.

## KI-Spielleitung (optional, Prototyp D)

D läuft vollständig ohne KI mit festen Regeln und Begründungslisten. Mit `VITE_LLM_JUDGE=1` erscheint beim Spielstart die Option „KI-Spielleitung“: Statt Begründungen anzukreuzen, schreibt man sie frei, und `/api/judge` bewertet sie gegen die Faktenkarten der Aktion (Fallpaket, Wissensknoten).

- Die Funktion ruft die Anthropic Messages API mit einem kleinen, schnellen Modell (Standard `claude-haiku-5-5`). Der Schlüssel liegt nur serverseitig.
- Die Antwort kommt über genau ein Tool (`report_judgement`) und wird mit zod geprüft: `validReasons` 0–3, `feedback` höchstens 2 Sätze, `missing`. Der Systemprompt erlaubt nur die mitgeschickten Fakten und verbietet ergänzte Rechtsfakten; bei Unsicherheit steht „unklar“.
- Zeitlimit 10 Sekunden, keine Wiederholungsversuche. Bei **jedem** Fehler (kein Schlüssel, Zeitüberschreitung, ungültige Antwort, Refusal) fällt das Spiel in den Listenmodus zurück, ohne zu blockieren.
- Die Funktion hat keine Anmeldung. Für einen Test mit eingeladenen Personen ein **Ausgabenlimit** im Anthropic-Konto setzen.
- Lokal testen: `npx vercel dev` (der Vite-Dev-Server allein bedient `/api` nicht).

## Deployment auf Vercel

1. Repository auf GitHub, in Vercel importieren (Framework: Vite). Jeder Push erzeugt eine neue Version unter derselben URL.
2. Umgebungsvariablen im Vercel-Dashboard setzen (siehe oben). `api/judge.ts` wird automatisch zur Funktion; `vercel.json` leitet alle anderen Pfade auf die App um.
3. Konditionen der kostenlosen Tarife von Vercel und Supabase vor dem Start prüfen, auch zur kommerziellen Nutzung.

Netlify geht genauso; die Funktion liegt dort unter `netlify/functions` und braucht einen kleinen Adapter.

## Tests

`npm test` (Vitest, 123 Tests) prüft die Rechenlogik gegen die Testwerte aus dem Umsetzungsplan:

- **A:** SCT-Wertung (Panel `[0, 2, 6, 2, 0]` → 1,0 / 0,33 / 0), Platzhalter-Panel bis 4 und echtes Panel ab 5 Experten, Kaskaden-Punkte, Mischen ohne zwei gleiche Fälle in Folge, Wiederholung, Verbindungs-Radar, Wissenskarte mit Knoten aus anderem Bereich.
- **B:** `derive` mit den drei Abnahme-Zuständen (Start, Ereignis F3, Rechtsstand § 6b), Lücken-Report, „Worauf ruht das?“, Zyklenerkennung, Rückgängig durch unveränderliche Stände, Import/Export.
- **C:** alle neun Testwerte (EV 0 / 600.000 / 450.000 / 360.000 / 585.000 / 60.000 €, VoI 600.000 / 360.000 / 0 €), Tornado, Portfolio, Ampel.
- **D:** gleicher Seed ergibt gleichen Verlauf, Zielwerte mit Begründungen und Kontakten, Pacht und Verzögerung, F1-Kaskade, Nachbesprechung (jede Entscheidung hat mindestens eine Folge mit Ursache), Fuzz mit 200 Zufallsspielen, Siegquoten der Bots, `/api/judge` mit gemocktem Modell.
- **E:** Brier (0,7 bei Eintritt → 0,09; 0,2 bei Nicht-Eintritt → 0,04; Mittel 0,065), Median (0,2 / 0,5 / 0,9 → 0,5), Kalibrierung, Stichtag.
- **F:** Verweise im Projektlog, Abgleich gefunden / übersehen / zusätzlich, wer Bescheid wissen muss.

## Prototyp F: Entscheiden mit dem Projektlog

These: Projektentwickler haben Spaß an ihrem Job, weil sie Wissen aus vielen Fachbereichen verknüpfen. F lässt dieses Verknüpfen beim Menschen. Eine Seite, zwei Schritte:

1. Eine neue Entscheidung steht an („Stellen wir jetzt den Genehmigungsantrag?“). Darunter das Projektlog: was die Abteilungen bisher entschieden haben, und warum. Man tippt an, was damit zusammenhängt (aus A: erst selbst denken, dann aufdecken).
2. Auflösen: gefunden, übersehen, jeweils mit dem Zusammenhang, und wer Bescheid wissen muss. Dann entscheiden und begründen; der Eintrag landet im Log (aus B: das Projekt als Kette begründeter Schritte).

## Abweichungen vom Umsetzungsplan

Offen gelegt, damit sie keine Überraschung sind:

- **Meilensteine nicht einzeln abgenommen.** Der Plan sieht nach jedem Meilenstein ein OK vor. M0–M5 sind in einem Durchgang entstanden, je Meilenstein ein Commit. M6 ist nur teilweise erledigt (siehe unten).
- **`@vercel/node` nicht verwendet.** Das Typpaket zieht Pakete mit Sicherheitswarnungen (`npm audit`) ein; `api/judge.ts` nutzt stattdessen kleine lokale Typen. `npm audit` ist sauber.
- **Tool-Erzwingung in `/api/judge`:** Statt eines erzwungenen `tool_choice` nutzt die Funktion `tool_choice: auto` + `strict: true` + Anweisung, genau das eine Tool aufzurufen. Neuere Modelle lehnen erzwungenes `tool_choice` ab, und bei aktivem Thinking ist es ohnehin nicht erlaubt. Die Antwort wird weiterhin mit zod geprüft. Mit echtem Schlüssel ist die Funktion noch **nicht** getestet (nur mit gemocktem SDK).
- **Zusätzlich:** `content/e-questions.json` (Quelle für `seed.sql` und den lokalen Probemodus), lokaler Probemodus ohne Supabase, Prüfbericht als Markdown-Export in B, eine eigene Klasse `choice` für Radio/Checkbox (PaperCSS stylt sie nur in `.form-group`).
- **Bereiche (`Domain`):** Die Fall-Tabelle nennt auch „Planung“, „Eigentümer“, „Zeitplan“ und „Gemeinde“, die nicht in der Liste der acht Bereiche stehen. Zuordnung: Planung → Recht, Eigentümer → Verträge, Zeitplan → Verträge, Gemeinde → Genehmigung.
- **Beispiel-Blueprint in B:** Das Diagramm aus dem Konzeptdokument ist im Export nicht enthalten. Das Demo-Projekt „Windpark X“ ist aus den Abnahmekriterien rekonstruiert (11 sichtbare Knoten, 1 Querabhängigkeit, Kapazität am Umspannwerk 1 Mio. €, Trasse 500.000 €) und liefert die geforderten drei Zustände.
- **Spielbalance in D** ist per Bot-Simulation geprüft (kluger Spieler mit zwei gültigen Begründungen gewinnt in rund 60 % der Seeds, Zufallsspieler praktisch nie, ohne Begründungen deutlich seltener), aber noch nicht mit Menschen.
- **Platzhalter in E:** Die Übungsfragen tragen erfundene Ausgänge und Quellen ausschließlich als Platzhalter (`verify = true`, Titel mit „[Termin]“, „[x]“). Das Team recherchiert Ausgang und Quelle.

## Was noch aussteht (M6)

- Alle Einträge mit `verify: true` klären oder sichtbar markiert lassen (`npm run verify:list`).
- Supabase-Projekt anlegen, Deploy auf Vercel, Probelauf mit einer Person.
- `/api/judge` mit echtem Schlüssel einmal durchspielen.
- Die Platzhalter-Panels der SCT-Fragen (`seedPanel`) durch echte Panels ersetzen: fünf Expertinnen oder Experten beantworten unter `/a/panel` dieselben acht Fragen.

## Testlauf mit Projektentwicklern

- Pro Person 60–90 Minuten für alle fünf Prototypen, in wechselnder Reihenfolge. Pro Prototyp 10–15 Minuten freies Ausprobieren, dann das Feedback-Formular (Knopf oben rechts).
- Nach Problemen und Nutzen fragen, nicht nach Lösungen.
- Bei B und C möglichst ein echtes, anonymisiertes Projekt oder eine echte Fläche der Person einspielen (B: JSON-Import, C: Regler und Kosten anpassen).
- Zum Schluss: „Welche Version würdest du nächste Woche wieder öffnen, und warum?“
