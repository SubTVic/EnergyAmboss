# Umsetzungsplan: Projektwand (Fernseher, Webcam, Post-its)

Auftrag für Claude Code. Ziel ist ein Demo-Prototyp, kein Produkt.

## Ziel

Nach einem Gespräch mit einem Landwirt klebt man 2–3 handgeschriebene Post-its an eine Wand. Eine Webcam liest sie. Der Fernseher daneben zeigt zu jedem Post-it, welche Gesetze und welche früheren Projektschritte damit zusammenhängen, und welche Post-its untereinander zusammenhängen.

## Aufbau

```
 ┌──────────────┐   ┌──────────────────────┐
 │  Wand mit    │   │  Fernseher           │
 │  Post-its    │◄──│  (Browser, Vollbild) │
 │              │   │                      │
 └──────────────┘   └──────────────────────┘
        ▲                     │ HDMI
        │ Webcam (USB)        │
        └──────── Laptop ─────┘
```

- Fernseher hochkant oder quer an der Wand, daneben eine weiße Fläche (Whiteboard oder Schaumstoffplatte) für die Post-its.
- Webcam auf einem Stativ oder am Fernseher, frontal auf die Post-it-Fläche gerichtet.
- Laptop am Fernseher (HDMI) und an der Webcam (USB). Die App läuft im Browser im Vollbild.
- Gleichmäßiges Licht, dicker schwarzer Filzstift, gelbe Post-its.

Hardware: Fernseher (vorhanden), USB-Webcam mit 1080p und Autofokus, Stativ, Laptop, HDMI-Kabel, Whiteboard.

## Beispiel für die Demo

Die drei Post-its nach dem Gespräch mit dem Landwirt:

1. „Grundsätzlich Interesse an Pachtvertrag, 20.000 €“
2. „Bedingung: Leitung entlang der Feldrichtung verlegen“
3. „Kein Umspannwerk zwischen 380- und 110-kV-Leitung in der Nähe“

Die App zeigt dazu Verweise auf:

- **Gesetze** aus einem kleinen, festen Katalog (`content/wall-laws.json`).
- **Frühere Projektschritte** aus einem erfundenen Projektlog (`content/wall-steps.json`).
- **Verbindungen zwischen den Post-its**, zum Beispiel: Die Bedingung aus Post-it 2 verlängert die Leitung, und nach Post-it 3 ist der nächste Anschlusspunkt ohnehin weit weg.

## Inhalte

Alle Inhalte liegen als JSON in `content/`, mit zod geprüft, wie im Rest des Repos.

**`content/wall-steps.json`**: 4–6 erfundene frühere Projektschritte. Jeder Schritt hat `id`, `date`, `who`, `text` und `keywords`. Vorschläge, alle fiktiv und so zu kennzeichnen:

- Netzanfrage beim Verteilnetzbetreiber: nächster möglicher Verknüpfungspunkt ist ein Umspannwerk in rund 12 km Entfernung.
- Trassenplanung: Die bisher geplante Kabeltrasse verläuft quer zur Bewirtschaftungsrichtung der Felder.
- Pachtangebote anderer Flächen in der Region: Spanne der bisherigen Angebote.
- Flächenauswahl: Die Fläche liegt in einem ausgewiesenen Windgebiet.

**`content/wall-laws.json`**: 4–6 Normen mit `id`, `title`, `summary` (1–2 Sätze), `keywords` und `verify: true`. Der Katalog muss vor jeder Vorführung juristisch geprüft werden. Bis dahin zeigt die App bei jedem Gesetz das Label „ungeprüft“. Kandidaten zum Prüfen:

- Pachtvertrag: §§ 581 ff. BGB
- Leitungsrecht auf fremdem Grund: beschränkte persönliche Dienstbarkeit, § 1090 BGB
- Netzanschluss für EE-Anlagen: § 8 EEG
- Netzanschluss allgemein: § 17 EnWG

**Regel:** Die App erfindet keine Gesetze und keine Projektschritte. Sie verweist nur auf Einträge aus diesen beiden Dateien.

## Technik

Baut auf dem bestehenden Repo auf (Vite, React, TypeScript, zod, Vitest). Route `/wand` (Startseite leitet dorthin), Ordner `src/wand/`, Serverfunktion `api/wall-read.ts` mit dem Kern in `api/_wallRead.ts`. Der Vite-Dev-Server bedient `/api/wall-read` selbst, `npm run dev` reicht.

### Ablauf

1. **Kamerabild:** `getUserMedia` zeigt das Live-Bild der Webcam. Die Kamera wird über ein Auswahlfeld gewählt und in `localStorage` gemerkt.
2. **Erfassen:** Auf Tastendruck (Leertaste oder Presenter-Klicker) wird ein Standbild als JPEG (max. 1600 px Breite) an `/api/wall-read` geschickt. Kein Dauer-Streaming an die API.
3. **Lesen und verknüpfen** in einem einzigen Modellaufruf mit Bild. Das Modell bekommt das Bild und beide Kataloge (IDs, Titel, Zusammenfassungen) und gibt über ein Tool mit festem Schema zurück:
   - `notes`: je Post-it `id`, gelesener `text` und `box` (x, y, Breite, Höhe relativ zum Bild, 0–1).
   - `references`: je Verweis `noteId`, `targetId` (aus einem der Kataloge) und `why` (höchstens 1 Satz).
   - `noteLinks`: je Verbindung `a`, `b` (Post-it-IDs) und `why` (höchstens 1 Satz).
4. **Prüfen:** Die Antwort wird mit zod geprüft. Verweise auf IDs, die nicht im Katalog stehen, werden verworfen.
5. **Anzeigen** auf dem Fernseher, siehe unten.

### Modellaufruf

- Anthropic Messages API mit Bild-Eingabe und Structured Outputs (`client.beta.messages.parse` mit zod-Schema). Modell über `WALL_MODEL` einstellbar, Standard `claude-opus-5-5`, mit serverseitigem Fallback bei Ablehnung (`fallbacks: "default"`).
- Der Schlüssel liegt nur serverseitig in `ANTHROPIC_API_KEY`, niemals mit `VITE_`-Präfix.
- Systemprompt: nur Verweise aus den mitgeschickten Katalogen; unleserlicher Text wird als `?` markiert, nicht geraten.
- Zeitlimit 30 Sekunden, keine Wiederholungen. Bei Fehlern zeigt die App „Nicht erkannt, bitte erneut erfassen“.

### Demo-Modus (Pflicht)

Damit die Vorführung nie an der Erkennung scheitert:

- Die Tasten `1`, `2` und `3` blenden die drei Beispiel-Post-its nacheinander ein, mit fest hinterlegten Verweisen aus `content/wall-demo.json`.
- Der Demo-Modus braucht keine Kamera und keinen API-Schlüssel.
- Ein kleines Label „Demo“ ist sichtbar, damit niemand getäuscht wird.

## Anzeige auf dem Fernseher

Lesbar aus 3 m Entfernung: Grundschrift mindestens 28 px, wenig Text, hoher Kontrast.

- **Oben:** schmale Leiste mit Projektname, Status („bereit“, „lese …“, „erkannt: 3 Post-its“) und Taste zum Erfassen.
- **Links (ein Drittel):** Live-Kamerabild mit nummerierten Rahmen um die erkannten Post-its.
- **Links unter dem Kamerabild:** die Zusammenhänge zwischen den Post-its („② ↔ ③ …“), jeder nur einmal.
- **Rechts:** eine Karte pro Post-it in derselben Nummerierung, mit dem gelesenen Text und den Verweisen, getrennt nach „Gesetz“ und „Früherer Schritt“, je mit einem Satz Begründung.
- Neue Verweise erscheinen mit einer kurzen Einblend-Animation, damit man sieht, was sich geändert hat.

## Meilensteine

Jeder Meilenstein endet mit grünem `npm test` und `npm run build` und einem Commit.

1. **Inhalte und Schemas:** die drei JSON-Dateien und zod-Schemas, dazu ein Test, dass alle Verweise in `wall-demo.json` auf vorhandene IDs zeigen.
2. **Anzeige mit Demo-Modus:** Route `/wand`, Layout wie oben, Tasten 1–3. Abnahme: Die Demo läuft vollständig ohne Kamera und ohne Schlüssel.
3. **Kamera:** Live-Bild, Kamerawahl, Standbild auf Tastendruck. Abnahme: Das Standbild wird angezeigt und kann als Datei gespeichert werden (zum Testen).
4. **Erkennung:** `api/wall-read.ts` mit Modellaufruf und zod-Prüfung, dazu Tests mit gemocktem SDK: gültige Antwort, unbekannte Katalog-ID wird verworfen, Zeitüberschreitung führt zur Fehlermeldung. Abnahme mit echter Webcam: drei Post-its werden gelesen und verknüpft.
5. **Feinschliff an der echten Wand:** Schriftgröße, Licht und Kamerawinkel testen. Drei Fotos der Wand als Testbilder in `test-fixtures/` ablegen (ohne Personen im Bild).

## Lokal starten

```bash
npm install
npm run dev             # http://localhost:5173 (leitet auf /wand)
```

Ohne Schlüssel funktioniert nur der Demo-Modus. Mit Schlüssel: `.env.local` mit `ANTHROPIC_API_KEY=…` anlegen.

## Nicht Teil des Prototyps

- Dauerhafte Speicherung und Übernahme in Prototyp F
- Mehrere Wände oder Nutzer
- Linien zwischen den Post-its auf der Wand erkennen (Verbindungen schlägt vorerst das Modell vor)

## Offene Punkte vor der Vorführung

- Gesetzeskatalog juristisch prüfen.
- Klären, ob „20.000 €“ pro Jahr oder einmalig gemeint ist, und das Post-it entsprechend schreiben.
- Kamerabilder enthalten keine Personen; Bilder werden nicht gespeichert, nur an die API geschickt.
