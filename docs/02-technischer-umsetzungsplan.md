# Technischer Umsetzungsplan: Fünf Prototypen

Oct 21, 2026 · @Victor

Ergänzt Doc: Mit beiden Dokumenten baut eine Code-KI alle fünf Prototypen als eine skizzenhafte Web-App, die Projektentwickler direkt ausprobieren können.

## Ziel und Leitplanken

Gebaut wird eine einzige Web-App mit einer Startseite und fünf Prototypen (A–E); jeder zeigt dasselbe Konzept in einer anderen Form. Bewertet werden soll die Idee, nicht die Oberfläche.

### Was gebaut wird

- Eine Web-App unter einer URL: Startseite mit fünf Karten, je ein Bereich `/a` bis `/e`.
- Alle fünf nutzen dieselben Inhalte: Fallpaket F1–F9, Wissensknoten und eine fiktive Musterregion.
- Jeder Bereich hat einen Feedback-Knopf mit den Fragen aus dem Vergleichsraster des Konzeptdokuments.
- Daten auf einem Server nur dort, wo mehrere Personen zusammenkommen: Prognosen (E), Panel-Antworten (A) und Feedback.

### Bewusst unfertig

- Wer nur einen Entwurf sieht, bewertet ihn deutlich besser und kritisiert weniger, als wer ihn neben Alternativen sieht ([Tohidi et al., CHI 2006](https://www.microsoft.com/en-us/research/?p=151922)). Fünf Varianten nebeneinander holen also ehrlichere Kritik.
- Skizzenhafter Look mit [PaperCSS](https://getpapercss.com/) als einzigem CSS-Framework, Graustufen, Farbe nur mit Bedeutung: grün belegt, orange offen, rot gebrochen, blau bereit.
- Auf jeder Seite ein Banner: „Prototyp: Inhalte fiktiv. Bitte die Idee bewerten, nicht die Details.“
- Keine Logos, keine Animationen, keine Feinarbeit an Abständen. Lieber ein sichtbarer Platzhalter als ein glatter Text.
- Auf dem Laptop muss alles laufen, auf dem Handy darf es holpern.

### Nicht-Ziele

- Keine echten Projektdaten, keine echten Karten- oder Netzdaten.
- Kein Login und keine Rollen; Teilnehmende geben nur einen Namen oder ein Kürzel ein.
- Keine Produktionssicherheit, keine Skalierung, Tests nur für die Rechenlogik.
- Keine Rechtsberatung: Rechtsinhalte nur aus dem Konzeptdokument, alles andere sichtbar als „ungeprüft“ markiert.

## Architektur

Eine statische Web-App trägt alle fünf Prototypen. Nur Prognosen, Panel-Antworten und Feedback landen in einer kleinen Datenbank, und nur Version D ruft optional ein Sprachmodell.

&#91;embedded content: Architektur · 1 Web-App, 3 Dienste\]

B, C und D laufen allein im Browser; nur E, das SCT-Panel von A und das Feedback schreiben in die Datenbank.

| Baustein | Wahl | Wofür |
| --- | --- | --- |
| Grundgerüst | Vite, React, TypeScript, React Router | eine App, fünf Routen |
| Look | PaperCSS 1.9 | skizzenhafte Optik ohne Designarbeit |
| Graphen | Cytoscape.js mit react-cytoscapejs | Wissenskarte (A), Beweisgraph (B), Kaskadenkarte (D) |
| Diagramme | Recharts | Verbindungs-Radar (A), Tornado (C), Kalibrierung (E) |
| Karte | eigenes SVG, keine Kartenbibliothek | fiktive Musterregion (C, D) |
| Validierung | zod | Inhalte und KI-Antworten prüfen |
| Datenbank | Supabase (Postgres) mit supabase-js | Prognosen (E), Panel (A), Feedback |
| KI-Spielleitung | Serverless-Funktion `/api/judge` mit dem Anthropic SDK | Begründungen in D bewerten, optional |
| Tests | Vitest | Rechenlogik in A, B, C, D und E |
| Hosting | Vercel (alternativ Netlify) | eine URL für alle Tester |

Die Bibliotheken sind Open Source; Supabase und das Sprachmodell sind gehostete Dienste.

### Warum dieser Stack

- Tester brauchen nur einen Link, keine Installation.
- Code-KIs kennen React, Supabase und Vercel gut; das spart Rückfragen und Fehler.
- B, C und D laufen komplett im Browser. Fällt die Datenbank aus, bleiben drei Prototypen nutzbar.

## Gemeinsame Bausteine

Inhalte liegen als JSON im Repository, getrennt vom Code. So ändert das Team Fälle, Fragen und Karten, ohne Code anzufassen.

### Projektstruktur

```text
prototypen/
├─ api/judge.ts                  # optionale KI-Spielleitung (D)
├─ content/                      # alle Inhalte, nur JSON
│  ├─ cases.json                 # Fallpaket F1–F9
│  ├─ knowledge.json             # Wissensknoten und Kanten
│  ├─ region.json                # fiktive Musterregion
│  ├─ a-questions.json
│  ├─ b-project-windpark-x.json  # Demo-Projekt inkl. Ereignisse
│  ├─ b-law-updates.json
│  ├─ c-sites.json
│  ├─ d-actions.json
│  └─ d-events.json
├─ src/
│  ├─ shared/                    # Layout, Banner, Feedback, Typen, Supabase-Client
│  ├─ a/ b/ c/ d/ e/             # je ein Prototyp
│  └─ main.tsx
├─ supabase/schema.sql
├─ supabase/seed.sql             # Fragen für E
└─ README.md
```

### Inhalte und Datentypen

```ts
type Domain = 'recht' | 'netz' | 'natur' | 'vertraege' | 'technik'
  | 'finanzen' | 'logistik' | 'genehmigung';

interface Case {              // cases.json
  id: string;                 // 'F1' … 'F9'
  title: string;
  situation: string;
  domains: Domain[];
  source: 'Interview' | 'Recherche';
}

interface KnowledgeNode {     // knowledge.json
  id: string;
  label: string;
  kind: 'norm' | 'akteur' | 'schritt' | 'risiko' | 'kennzahl';
  domain: Domain;
  summary: string;            // 1–2 Sätze
  caseIds: string[];          // Belegstelle im Fallpaket
  verify?: boolean;           // true = nicht aus dem Konzeptdokument, vor dem Test prüfen
}

interface KnowledgeEdge {
  from: string;
  to: string;
  kind: 'setzt_voraus' | 'verzoegert' | 'verteuert' | 'schliesst_aus';
  note?: string;
}
```

- **Inhaltsregel:** Alles stammt aus dem Konzeptdokument (Fallpaket, Ablauf, Beispiele). Was die Code-KI ergänzt, bekommt `verify: true` und erscheint in der UI als „ungeprüft“.
- **Startumfang:** 25–30 Wissensknoten, rund 40 Kanten.
- **Code und Bezeichner** auf Englisch, alle UI-Texte auf Deutsch.

### Musterregion (`region.json`)

Fiktiver „Musterkreis“ in SVG-Koordinaten (viewBox 1000 × 700), genutzt von C und D. Enthalten sind vier Dörfer (Dorf A–D) mit Abstandspuffer, zwei Umspannwerke (UW Nord, UW Süd) mit Leitungen und die Grenze zwischen Netzbetreiber Nord und Süd. Dazu kommen die alte 110-kV-Leitung ohne Trafo, ein Schutzgebiet, ein Monokultur-Wald und eine Autobahn mit Ortsdurchfahrt durch Dorf C.

| Fläche | Lage | Fall |
| --- | --- | --- |
| W1 | nah an UW Nord | Referenzfläche, „Windpark X“ aus B |
| W2 | am Schutzgebiet | F7 Brutvögel |
| W3 | auf der Netzbetreiber-Grenze | F4 |
| W4 | Kabeltrasse über fremde Flurstücke | F3 |
| W5 | an der alten 110-kV-Leitung | F8 |
| W6 | Zufahrt nur durch Dorf C | F6 |
| W7 | Monokultur-Wald | Ablauf, Schritt 1 |
| W8 | PV-Fläche, 13 km zum nächsten Umspannwerk | F5 |

```ts
interface Region {
  viewBox: [number, number];
  villages: { id: string; name: string; x: number; y: number; bufferRadius: number }[];
  substations: { id: string; name: string; x: number; y: number; operator: 'nord' | 'sued' }[];
  lines: { id: string; points: [number, number][]; kind: 'netz' | 'alt_110kv' | 'autobahn' | 'strasse' }[];
  areas: { id: string; kind: 'schutzgebiet' | 'wald' | 'netzgrenze'; polygon: [number, number][] }[];
  sites: { id: string; name: string; polygon: [number, number][]; caseIds: string[]; tech: 'wind' | 'pv' }[];
}
```

### Gemeinsame Oberfläche

- `Layout` mit Banner, Navigation zu A–E und Feedback-Knopf.
- `FeedbackModal` mit Realismus (1–5), Aha-Moment (Text), Wiederkehr (ja/nein), Zahlungsbereitschaft (Text) und Kommentar; speichert in `feedback` mit Prototyp-Kennung und Tester-Kürzel.
- Tester-Kürzel per URL-Parameter `?t=K1` oder einmalig abgefragt, danach in localStorage.
- Statusfarben als CSS-Variablen `--ok`, `--open`, `--broken`, `--ready`.
- Pro Prototyp ein Knopf „Demo zurücksetzen“, der den lokalen Stand löscht.
- `MusterregionMap` als gemeinsame SVG-Komponente: zeichnet `region.json`, färbt Flächen über eine übergebene Funktion und meldet Klicks.

## Prototyp A – Kreuzen mit vernetzter Bibliothek

Eine Kreuz-Session mit drei Fragetypen; nach jeder Antwort erscheinen Erklärung und eine kleine Wissenskarte. Zielumfang für den Test: 20 Fragen, davon 8 im SCT-Format.

### Bildschirme

1. `/a`: Start mit Session-Wahl (gemischt oder nach Bereich) und zwei Sätzen zum Prinzip.
2. `/a/session`: eine Frage pro Bildschirm. Nach dem Absenden: Ergebnis, Erklärung je Option, Wissenskarte (Cytoscape, 3–6 Knoten, Bereich der Frage hervorgehoben), Knopf „Nächste Frage“.
3. `/a/ergebnis`: Punkte, Verbindungs-Radar, Liste der verpassten Verbindungen mit Links in die Bibliothek.
4. `/a/bibliothek`: alle Wissensknoten, filterbar nach Bereich; ein Klick zeigt Knoten, Nachbarn und die Fragen, die ihn nutzen.
5. `/a/panel?expert=Name`: Expertenmodus nur mit SCT-Fragen, ohne Erklärungen; speichert in `sct_panel`.

### Datenmodell (`a-questions.json`)

```ts
type Question = SingleBest | Sct | Cascade;

interface QuestionBase {
  id: string;
  caseId: string;          // 'F1' … 'F9'
  domains: Domain[];       // erster Eintrag = Hauptbereich der Frage
  nodeIds: string[];       // Wissenskarte, mind. ein Knoten aus anderem Bereich
  verify?: boolean;
}

interface SingleBest extends QuestionBase {
  type: 'single';
  stem: string;
  options: { id: string; text: string; correct: boolean; explanation: string }[]; // genau 5, eine richtig
}

interface Sct extends QuestionBase {
  type: 'sct';
  hypothesis: string;      // „Annahme: …“
  newInfo: string;         // „Neue Information: …“
  explanation: string;
  seedPanel: [number, number, number, number, number]; // Platzhalter-Anzahlen für −2 … +2
}

interface Cascade extends QuestionBase {
  type: 'cascade';
  stem: string;
  correctDomains: Domain[]; // genau 3
  explanation: string;
}
```

### Logik

- **SCT-Wertung:** Punkte für Antwort v = panel\[v\] / max(panel). Genutzt wird das echte Panel aus `sct_panel`, sobald mindestens 5 Experten geantwortet haben; sonst `seedPanel` mit dem Hinweis „Platzhalter-Panel“.
- **Kaskadenfrage:** 1 Punkt pro richtigem Bereich, höchstens 3.
- **Mischen:** zufällige Reihenfolge, aber nie zwei Fragen zum selben Fall direkt hintereinander. Verwechselbare Fälle wie F4 und F5 (beide Netz) stehen bewusst nah beieinander.
- **Wiederholung:** Falsch beantwortete Fragen kommen am Ende der Session einmal wieder.
- **Verbindungs-Radar:** Jede Frage zählt für das Bereichspaar aus `domains[0]` und `domains[1]`; angezeigt wird die Fehlerquote je Paar (Recharts-RadarChart oder Balkenliste).
- **Speicherung:** Session-Verlauf in localStorage; auf dem Server nur Panel-Antworten und Feedback.

### Abnahme

- Eine Session mit 10 Fragen läuft fehlerfrei; jede Wissenskarte zeigt mindestens einen Knoten aus einem anderen Bereich als die Frage.
- Unit-Test SCT: Panel \[0, 2, 6, 2, 0\] für −2 … +2 ergibt für Antwort 0 genau 1,0 Punkte, für −1 rund 0,33 und für −2 null Punkte.
- Der Panel-Modus speichert Antworten; ab 5 Experten wertet die Session gegen das echte Panel.
- Inhalte mit `verify: true` tragen sichtbar das Label „ungeprüft“.

## Prototyp B – Projekt als Beweis

Ein Projekt ist ein Baum aus Knoten mit Status. Die App leitet den Status der oberen Knoten ab, listet die Lücken und spielt Ereignisse und Rechtsänderungen durch; Startinhalt ist „Windpark X“ aus dem Diagramm im Konzeptdokument.

### Bildschirme

1. `/b`: Projektliste mit Demo „Windpark X“, „Neues Projekt aus Vorlage“ und JSON-Import.
2. `/b/:projectId`: links der Baum als eingerückte Liste mit Status-Pillen, aufgebaut wie das Diagramm im Konzeptdokument, umschaltbar auf einen Graphen (Cytoscape, Layout `breadthfirst`); rechts die Infoview des gewählten Knotens.
3. Leiste oben: „Lücken-Report“, „Ereignis auslösen“, „Rechtsstand aktualisieren“, „Rückgängig“, „Exportieren“.

### Datenmodell

```ts
type OwnStatus = 'belegt' | 'sorry' | 'widerlegt' | 'in_arbeit' | 'entfallen';
type ShownStatus = OwnStatus | 'offen' | 'gebrochen' | 'bereit' | 'blockiert';

interface BpNode {
  id: string;
  parentId: string | null;
  title: string;
  kind: 'ziel' | 'teilziel' | 'annahme' | 'schritt' | 'alternative';
  ownStatus?: OwnStatus;      // nur bei 'annahme', 'schritt', 'alternative'
  deps: string[];             // Querabhängigkeiten zusätzlich zu den Kindern
  evidence?: string;          // Beleg, z. B. „Pachtverträge unterschrieben“
  owner?: string;             // Elektroplaner, Gutachter, Jurist …
  damageIfWrong?: number;     // € bei Irrtum
  alternativeFor?: string;    // bei 'alternative': Knoten, den sie ersetzen kann
  adopted?: boolean;          // Alternative übernommen
  hidden?: boolean;           // Alternativen erscheinen erst nach einem Ereignis
  knowledgeIds?: string[];
}

type PatchOp =
  | { op: 'setStatus'; nodeId: string; status: OwnStatus }
  | { op: 'addNode'; node: BpNode }
  | { op: 'reveal'; nodeId: string };

interface Patch {             // Ereignisse im Projekt-JSON, Rechtsstand in b-law-updates.json
  id: string;
  title: string;
  caseId: string;
  ops: PatchOp[];
  explanation: string;
}
```

Demo-Daten wie im Diagramm des Konzeptdokuments, mit fiktivem Schaden bei Irrtum: 1.000.000 € für „Kapazität am Umspannwerk“, 500.000 € für „Trasse über alle Flurstücke“.

### Statuslogik (reine Funktion `derive(nodes)`)

- Voraussetzungen eines Knotens: seine Kinder plus `deps`. Versteckte Knoten und nicht übernommene Alternativen zählen nicht.
- Rangfolge: widerlegt > sorry > in\_arbeit > belegt = entfallen.
- Behälter (`ziel`, `teilziel`) zeigen die schlechteste Voraussetzung: widerlegt ergibt „gebrochen“, sorry oder in\_arbeit ergibt „offen“, sonst „belegt“.
- Schritte mit Voraussetzungen (z. B. EEG-Zuschlag): Sind alle belegt und ist der Schritt selbst nicht belegt, zeigt er „bereit“; ist eine Voraussetzung schlechter, „blockiert“.
- Annahmen ohne Voraussetzungen zeigen ihren eigenen Status.
- Zyklen werden beim Laden erkannt und als Fehlermeldung angezeigt.

### Lücken-Report und „Worauf ruht das?“

- Für jede Annahme mit `sorry`: abhängige Knoten sind alle, die sie direkt oder indirekt voraussetzen. Score = `damageIfWrong` × Anzahl abhängiger Knoten, absteigend sortiert.
- Die Infoview jedes Knotens listet alle `sorry`-Annahmen, auf denen er indirekt ruht; das ist das Gegenstück zu `#print axioms`.

### Ereignisse und Rechtsstand

- **Ereignis F3 „Eigentümer verweigert Flurstück“:** setzt „Trasse über alle Flurstücke“ auf `widerlegt` und blendet drei Alternativen ein: andere Trasse, anderer Mast, gemeinsamer Anschluss mit einer Nachbaranlage (F5).
- **„Alternative übernehmen“:** Der Originalknoten wird `entfallen`, die Alternative zählt ab jetzt als Voraussetzung, zunächst als `sorry`.
- **Rechtsstand-Update F9 „§ 6b WindBG gilt für die Fläche“:** setzt „Artenschutz-Kartierung“ auf `entfallen` und fügt unter „Genehmigung“ die Annahme „Gebietsausweisung hält einer Klage stand“ als `sorry` hinzu.
- Nach jedem Patch bleiben geänderte Knoten bis zum nächsten Klick markiert, die Erklärung steht oben, und „Rückgängig“ nimmt den Patch zurück (Verlauf als Stapel).

### Bearbeiten

- Knoten anlegen (als Kind des gewählten), umbenennen, Status setzen, Beleg, Verantwortliche und Schaden eintragen, Querabhängigkeit per Auswahlliste, löschen.
- Vorlage „Neues Projekt“: Ziel plus die Teilziele Fläche, Netzanschluss, Genehmigung, Transport, EEG-Zuschlag und Wirtschaftlichkeit, jeweils mit 1–2 leeren Annahmen.
- Speichern in localStorage, Export und Import als JSON-Datei.

### Abnahme

- Startzustand der Demo: Ziel „offen“, Netzanschluss „offen“, Genehmigung „belegt“, EEG-Zuschlag „bereit“; im Lücken-Report steht „Kapazität am Umspannwerk“ oben.
- Ereignis F3: Netzanschluss und Ziel werden „gebrochen“, drei Alternativen erscheinen; „Rückgängig“ stellt den Startzustand her.
- Rechtsstand-Update: Artenschutz „entfallen“, neue `sorry`-Annahme unter Genehmigung, Genehmigung „offen“, EEG-Zuschlag „blockiert“.
- Unit-Tests für `derive` mit genau diesen drei Zuständen.
- Ein neues Projekt mit 15 Knoten lässt sich in unter 10 Minuten anlegen, exportieren und wieder importieren.

## Prototyp C – Flächenportfolio und Informationswert

Eine Karte der Musterregion, ein Steckbrief pro Fläche und ein kleines Rechenmodell. Die Rechenlogik ist der Kern und wird zuerst gebaut, gegen die Testwerte unten.

### Bildschirme

1. `/c`: links die Karte mit Ebenen-Schaltern für Ausweisung, Fläche, Netz, Genehmigung, Logistik, Zuschlag und Gesamt; rechts die Portfolio-Tabelle.
2. Klick auf eine Fläche öffnet den Steckbrief: sechs Schieberegler mit Begründungsfeld, Kosten, Wert, Erwartungswert und Tornado-Diagramm.
3. Panel „Netz-Klarheit“: Zeitpunkt (vor Pacht, nach Pacht, nach Gutachten, nach Genehmigung), Schalter Rücktrittsklausel, Regler für die Trefferquote einer Vorhersage (50–100 %).

Ampel je Ebene: rot unter 0,4, gelb unter 0,7, sonst grün. Die Gesamt-Ebene färbt nach P(Erfolg): rot unter 0,1, gelb unter 0,25, sonst grün. Alle Schwellen sind Konstanten. Jede Zahl trägt den Hinweis „fiktive Schätzwerte“.

### Eingaben je Fläche (`c-sites.json`)

```ts
interface Site {
  id: string;                 // 'W1' … 'W8', Polygon aus region.json
  p: { ausweisung: number; flaeche: number; netz: number;
       genehmigung: number; logistik: number; zuschlag: number };
  reasons: Partial<Record<keyof Site['p'], string>>;
  leasePerYear: number;       // L, Pacht pro Jahr
  leaseYears: number;         // T, Laufzeit
  survey: number;             // G, Naturschutzgutachten
  planning: number;           // P, Planung bis zur Genehmigung
  value: number;              // V, Wert der Projektrechte bei Erfolg
}
```

### Rechenmodell (`calc.ts`, reine Funktionen)

Bezeichnungen: p\_N = P(Netz), p\_R = Produkt der anderen fünf Wahrscheinlichkeiten. Stufenkosten c₁ = L·T, c₂ = G, c₃ = P, zusammen C. C\_k ist die Summe der Stufen vor der Netz-Klarheit, mit k = 0 (vor Pacht) bis k = 3 (nach Genehmigung).

```latex
EV_{\text{Start}}(k, p_N) = -C_k + p_N \cdot \max\left(0,\; p_R V - (C - C_k)\right) + (1 - p_N) \cdot R_k
```

```latex
EV(k, p_N) = \max\left(0,\; EV_{\text{Start}}(k, p_N)\right)
```

R\_k ist die Ersparnis durch die Rücktrittsklausel: Ist sie aktiv und die Pacht schon unterschrieben (k ≥ 1), entfällt die Restpacht L · (T − t\_k). Standard für t\_k sind 0,5 / 1,5 / 3 Jahre bei k = 1 / 2 / 3, im Panel änderbar; ohne Klausel ist R\_k = 0.

Eine Vorhersage mit Trefferquote a kommt vor dem Start; die echte Netz-Klarheit kommt weiterhin bei k:

```latex
P(\text{ja}) = a\,p_N + (1-a)(1-p_N), \qquad p_N^{\text{ja}} = \frac{a\,p_N}{P(\text{ja})}, \qquad p_N^{\text{nein}} = \frac{(1-a)\,p_N}{1-P(\text{ja})}
```

```latex
VoI = P(\text{ja})\,EV(k, p_N^{\text{ja}}) + \left(1-P(\text{ja})\right) EV(k, p_N^{\text{nein}}) - EV(k, p_N)
```

- Zweige mit Wahrscheinlichkeit 0 werden übersprungen, damit nicht durch null geteilt wird.
- **P(Erfolg)** = Produkt aller sechs Wahrscheinlichkeiten.
- **Portfolio:** Summe von EV über alle Flächen; erwartete Zahl erfolgreicher Projekte und gebundene Pacht (L·T) über alle Flächen mit EV > 0.
- **Tornado:** jede Wahrscheinlichkeit auf p − 0,2 und p + 0,2 setzen (begrenzt auf 0…1), EV neu rechnen, Balken nach Spannweite sortieren.

### Testwerte (Vitest)

Referenzfläche wie im Konzeptdokument: V = 5 Mio. €, L = 50.000 €, T = 5 Jahre, G = 150.000 €, P = 600.000 € (also C = 1 Mio. €), p\_N = 0,4, p\_R = 0,5.

| Fall | Erwartet |
| --- | --- |
| k = 3, ohne Klausel (entspricht F1) | EV = 0 € |
| k = 0 | EV = 600.000 € |
| k = 1 | EV = 450.000 € |
| k = 2 | EV = 360.000 € |
| k = 1, Klausel, t = 0,5 | EV = 585.000 € |
| k = 3, Klausel, t = 3 | EV = 60.000 € |
| Vorhersage, k = 3, a = 1 | VoI = 600.000 € |
| Vorhersage, k = 3, a = 0,8 | VoI = 360.000 € |
| Vorhersage, k = 3, a = 0,5 | VoI = 0 € |

### Abnahme

- Alle Testwerte grün; die Rechenlogik ist ohne Oberfläche testbar.
- Ebenen-Schalter färben die acht Flächen um; ein Klick öffnet den Steckbrief; Regler ändern Karte, Portfolio und Tornado sofort.
- Der Zeitpunkt-Schalter zeigt sichtbar, wie der Erwartungswert sinkt, je später die Netz-Klarheit kommt.

## Prototyp D – Projekt-Planspiel

Ein rundenbasiertes Solo-Spiel im Browser mit fester Regel-Engine; die KI-Spielleitung ist ein optionaler Zusatz. Jede Folge merkt sich ihre Ursache, damit die Nachbesprechung Kaskaden zeigen kann.

### Bildschirme

1. `/d`: Regeln auf einer Seite, Seed-Feld (gleicher Seed ergibt gleiche Würfe und Ereignisse), Schalter „KI-Spielleitung“.
2. `/d/spiel`: links die Musterregion mit Flächenstatus, rechts Ressourcen (Budget, Monate, Kontakte, Rückhalt), darunter die Aktionen der Runde und das Logbuch.
3. `/d/nachbesprechung`: vier AAR-Fragen als Textfelder, Kaskadenliste je Entscheidung, Kaskadenkarte (Cytoscape) und die teuerste Entscheidung hervorgehoben.
4. `/d/karten`: alle Aktions- und Ereigniskarten druckbar (A4, sechs pro Seite) für die Tischspiel-Variante.

### Spielzustand und Karten

```ts
interface GameState {
  seed: number;
  round: number;               // 1 Runde = 6 Monate, höchstens 12
  months: number;              // inkl. Verzögerungen
  budget: number;              // Start 1.500.000 € (fiktiv)
  contacts: number;            // 0–10
  support: number;             // Rückhalt in der Gemeinde, 0–10
  sites: Record<string, { status: 'frei' | 'gesichert' | 'verloren'; designated: boolean }>;
  grid: 'keine' | 'angefragt' | 'vage' | 'zusage' | 'absage';
  survey: 'keins' | 'laeuft' | 'fertig' | 'problem';
  permit: 'keine' | 'beantragt' | 'erteilt';
  award: boolean;
  log: LogEntry[];
}

interface LogEntry {
  round: number;
  text: string;
  budgetDelta?: number;
  monthsDelta?: number;
  cause: { kind: 'action' | 'event' | 'upkeep'; id: string; round: number };
}

interface ActionCard {
  id: string;
  label: string;
  cost: number;
  target: number;              // Erfolg bei 2W6 ≥ target
  requires: Condition[];
  onSuccess: Effect[];
  onFailure: Effect[];
  reasons: { id: string; text: string; valid: boolean; why: string }[]; // 4–6, davon 2–3 gültig
  knowledgeIds: string[];
}

interface EventCard {
  id: string;
  title: string;
  text: string;
  caseId: string;              // F1 … F9
  when: Condition[];
  weight: number;
  effects: Effect[];
  causedBy?: string;           // Aktion, deren frühere Ausführung das Ereignis möglich macht
}
```

`Condition` und `Effect` sind eine kleine Datensprache, etwa `{ "grid": "vage" }`, `{ "budget": -150000 }` oder `{ "site": "W3", "status": "verloren" }`. Im JSON stehen keine Funktionen.

### Rundenablauf (`engine.ts`, reine Funktionen mit Seed)

1. Bis zu zwei Aktionen wählen, deren Bedingungen erfüllt sind.
2. Begründungen pro Aktion: Im Standardmodus 0–3 aus der Liste wählen; jede gültige senkt den Zielwert um 1, jede ungültige hebt ihn um 1. Mit KI-Spielleitung stattdessen Freitext.
3. Mit 2W6 würfeln (sichtbar) und Effekte anwenden. Ab 7 Kontakten gibt es +1 auf Aktionen mit Eigentümern und Gemeinde.
4. Laufende Kosten: 25.000 € Pacht je gesicherter Fläche und Runde, verbucht mit der Ursache „Fläche sichern, Runde n“.
5. Ein Ereignis ziehen, gewichtet unter allen, deren Bedingungen erfüllt sind, und anwenden.
6. Ende nach Runde 12, bei Budget unter null oder bei Zuschlag plus Netzzusage.

Würfel und Ereignisse nutzen eine einzige Zufallsquelle mit Seed (z. B. mulberry32).

### Mindestinhalt

- **10 Aktionen:** Fläche sichern, Netzanfrage stellen, verbindliche Netzzusage einholen, Eigentümer treffen, Gemeinde informieren, Naturschutzgutachten beauftragen, Genehmigung beantragen, an Ausschreibung teilnehmen, Trasse sichern, Anschluss mit Nachbaranlage teilen.
- **15 Ereignisse** aus F1–F9, darunter: Konkurrent bietet mehr Pacht (F2), Eigentümer verweigert Flurstück (F3), Grenzgebiet zweier Netzbetreiber mit 9 Monaten Verzögerung (F4), Netzbetreiber rechnet mit 100 % Einspeisung (F5), Schwertransport braucht Genehmigungen (F6), Brutvogel im Gutachten (F7), Transformator fehlt (F8), § 6b WindBG tritt in Kraft (F9).
- Jede Karte nennt ihren Fall und 1–2 Wissensknoten. Kosten und Wahrscheinlichkeiten sind fiktiv und so beschriftet.

### KI-Spielleitung (optional, `VITE_LLM_JUDGE=1`)

- `POST /api/judge` mit Aktion, kurzem Spielstand, Freitext-Begründung und den Faktenkarten der Aktion (Texte aus Fallpaket und Wissensknoten).
- Die Funktion ruft die Anthropic Messages API mit einem kleinen, schnellen Modell, z. B. `claude-haiku-5-5`; der Schlüssel liegt nur serverseitig in `ANTHROPIC_API_KEY`.
- Systemprompt: Rolle als Spielleitung; nur die mitgeschickten Fakten verwenden; keine Rechtsfakten ergänzen; bei Unsicherheit „unklar“ sagen.
- Antwort als JSON, per Tool Use mit genau einem Tool erzwungen und mit zod geprüft: `{ "validReasons": 0–3, "feedback": "höchstens 2 Sätze", "missing": "fehlendes Wissen oder leer" }` ([API-Doku](https://docs.claude.com/en/api/overview)).
- Zeitlimit 10 Sekunden; bei Fehlern zurück zum Listenmodus, ohne das Spiel zu blockieren.

### Nachbesprechung

- Pro Entscheidung alle Log-Einträge, deren `cause` auf sie zeigt, mit Summe aus Kosten und Verzögerung; Ereignisse mit `causedBy` hängen an der auslösenden Entscheidung.
- „Teuerste Entscheidung“ ist die mit der größten Summe. Die Kaskadenkarte zeigt Entscheidung → Ereignis → Folgen.
- AAR-Antworten gehen zusammen mit dem Feedback in die Datenbank (Feld `payload`).

### Abnahme

- Gleicher Seed und gleiche Entscheidungen ergeben denselben Verlauf (Unit-Test).
- Ein komplettes Spiel dauert 20–30 Minuten.
- Die Nachbesprechung zeigt für jede Entscheidung mindestens eine Folge mit Ursache.
- Das Spiel läuft vollständig ohne KI; mit KI erscheinen Feedback-Sätze, bei Fehlern eine Fallback-Meldung.

## Prototyp E – Prognose-Liga

Eine Liste von Ja/Nein-Fragen mit Stichtag; Teilnehmende geben Wahrscheinlichkeiten ab und sehen Brier-Score und Kalibrierung. Übungsfragen mit bekanntem Ausgang liefern schon in der ersten Sitzung Rückmeldung.

### Bildschirme

1. `/e`: Beitritt mit Name und Liga-Code (Standard „offen“), danach die Fragenliste mit den Reitern Offen, Übung und Aufgelöst.
2. `/e/frage/:id`: Text, Stichtag, Auflösungsquelle, Schieberegler 0–100 % und Begründung. Community-Median und Begründungen anderer erscheinen erst nach der eigenen Prognose, damit niemand ankert.
3. `/e/ich`: eigener Brier-Score, Vergleich mit dem Community-Median, Kalibrierungskurve, Verlauf.
4. `/e/training`: eine Seite zu Basisraten, Vergleichsklassen und dem Zerlegen von Fragen (Markdown, Inhalt vom Team).

### Logik

- **Nur Ja/Nein-Fragen** im Prototyp; Zahlenfragen werden als Schwelle formuliert („mehr als 10 Anlagen?“).
- **Brier je Frage:** (p − o)² mit der letzten Prognose vor dem Stichtag; der Score ist der Mittelwert über alle aufgelösten Fragen. Übungsfragen zählen getrennt.
- **Community-Median:** Median der jeweils letzten Prognose aller Teilnehmenden.
- **Kalibrierung:** Prognosen in Zehnerklassen; je Klasse mittlere Prognose gegen beobachtete Trefferquote, mit Anzahl; die Diagonale als Referenz (Recharts).
- **Übungsmodus:** Nach dem Absenden sofort Ausgang, Quelle und Brier für diese Frage.
- **Verwaltung:** Fragen anlegen und auflösen im Supabase-Dashboard (Tabelle `questions`, Felder `outcome` und `resolved_at`); ein Admin-Bereich ist nicht nötig.

### Inhalte (`supabase/seed.sql`)

- 10 Zukunftsfragen nach dem Muster des Konzeptdokuments (Ausweisung, Netz, Recht, Markt, Ausbau), mit realen Regionen und öffentlicher Auflösungsquelle.
- 10 Übungsfragen mit bekanntem Ausgang, etwa vergangene Ausschreibungsergebnisse oder das Inkrafttreten von Gesetzen. Ausgang und Quelle recherchiert das Team; die Code-KI legt nur Platzhalter mit `verify = true` an.

### Abnahme

- Unit-Test Brier: Prognose 0,7 bei Eintritt ergibt 0,09, Prognose 0,2 bei Nicht-Eintritt ergibt 0,04, Mittelwert 0,065.
- Unit-Test Median: letzte Prognosen 0,2 / 0,5 / 0,9 ergeben 0,5.
- Zwei Browser mit verschiedenen Namen sehen die Prognosen des jeweils anderen erst nach der eigenen Abgabe.
- Eine Auflösung im Dashboard aktualisiert Score und Kalibrierung beim nächsten Laden.

## Backend und Deployment

Supabase liefert Datenbank und REST-Schnittstelle, Vercel die URL und die eine Serverless-Funktion. Beide haben einen kostenlosen Einstiegstarif; laufende Kosten entstehen vor allem durch die optionale KI-Spielleitung.

### Datenbank (`supabase/schema.sql`)

```sql
create table participants (
  id uuid primary key,                 -- im Browser erzeugt, in localStorage gespeichert
  name text not null,
  league text not null default 'offen',
  created_at timestamptz not null default now()
);

create table questions (
  id text primary key,
  league text not null default 'offen',
  title text not null,
  details text,
  category text,                       -- ausweisung | netz | recht | markt | ausbau
  close_date date not null,
  resolution_source text,
  practice boolean not null default false,
  outcome boolean,                     -- null = noch offen
  resolved_at timestamptz,
  verify boolean not null default false
);

create table forecasts (
  id bigint generated always as identity primary key,
  question_id text not null references questions(id),
  participant_id uuid not null references participants(id),
  probability numeric not null check (probability between 0 and 1),
  reason text,
  created_at timestamptz not null default now()
);

create table sct_panel (
  id bigint generated always as identity primary key,
  item_id text not null,
  expert text not null,
  value int not null check (value between -2 and 2),
  created_at timestamptz not null default now()
);

create table feedback (
  id bigint generated always as identity primary key,
  prototype text not null check (prototype in ('a', 'b', 'c', 'd', 'e')),
  tester text,
  realism int check (realism between 1 and 5),
  aha text,
  would_return boolean,
  willingness_to_pay text,
  comment text,
  payload jsonb,                       -- z. B. AAR-Antworten aus D, Punktestand aus A
  created_at timestamptz not null default now()
);

alter table participants enable row level security;
alter table questions    enable row level security;
alter table forecasts    enable row level security;
alter table sct_panel    enable row level security;
alter table feedback     enable row level security;

create policy read_questions    on questions    for select to anon using (true);
create policy read_participants on participants for select to anon using (true);
create policy add_participant   on participants for insert to anon with check (true);
create policy read_forecasts    on forecasts    for select to anon using (true);
create policy add_forecast      on forecasts    for insert to anon with check (true);
create policy read_panel        on sct_panel    for select to anon using (true);
create policy add_panel         on sct_panel    for insert to anon with check (true);
create policy add_feedback      on feedback     for insert to anon with check (true);
```

- Das reicht für einen Test mit eingeladenen Personen, nicht für die Öffentlichkeit. Dass fremde Prognosen erst nach der eigenen sichtbar werden, regelt nur die Oberfläche.
- Keine echten Projektdaten eintragen; das Supabase-Projekt in einer EU-Region anlegen.

### Umgebungsvariablen

| Variable | Sichtbar für | Wofür |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Browser | Adresse des Supabase-Projekts |
| `VITE_SUPABASE_ANON_KEY` | Browser | öffentlicher Schlüssel, durch die Policies begrenzt |
| `VITE_LLM_JUDGE` | Browser | `1` schaltet die KI-Spielleitung in D ein |
| `ANTHROPIC_API_KEY` | nur Server (`/api/judge`) | Aufrufe an das Sprachmodell |

Der API-Schlüssel darf nie mit `VITE_` beginnen, sonst landet er im Browser.

### Lokal starten (Linux)

1. Node.js LTS installieren, z. B. über nvm; dann `npm install` und `npm run dev`.
2. Supabase-Projekt anlegen, `schema.sql` und `seed.sql` im SQL-Editor ausführen, URL und Anon-Key in `.env.local` eintragen.
3. Die KI-Funktion lokal mit `npx vercel dev` testen.
4. Ohne Supabase laufen B, C und D trotzdem; A nutzt dann das Platzhalter-Panel, E und das Feedback zeigen einen Hinweis.

### Hosting

- Repository auf GitHub, mit Vercel verbinden; jeder Push erzeugt eine neue Version unter derselben URL. `api/judge.ts` wird dort automatisch zur Funktion. Netlify geht genauso, die Funktion liegt dann unter `netlify/functions`.
- Umgebungsvariablen im Hosting-Dashboard setzen.
- Konditionen der kostenlosen Tarife vor dem Start prüfen, auch zur kommerziellen Nutzung.

## Meilensteine und Testlauf

Gebaut wird in sieben Schritten in der Reihenfolge des Konzeptdokuments; nach jedem prüfst du, bevor die Code-KI weitermacht. Mit einer Code-KI sind das grob 8–11 Arbeitstage, plus Zeit für Inhalte.

| Meilenstein | Inhalt | Fertig, wenn | Richtwert |
| --- | --- | --- | --- |
| M0 Gerüst | Repo, Routen, PaperCSS, Banner, Startseite, Feedback, gemeinsame Typen, Musterregion, Fallpaket und Wissensknoten als JSON | Startseite verlinkt fünf leere Bereiche; Feedback landet in Supabase | 1 Tag |
| M1 E | Liga, Übungsmodus, Brier-Score, Kalibrierung | Abnahme E erfüllt; erste echte Fragen eingetragen | 1 Tag |
| M2 C | `calc.ts` mit Tests, Karte, Steckbrief, Portfolio, Tornado | alle Testwerte grün, Abnahme C erfüllt | 1–2 Tage |
| M3 B | `derive`, Baum, Graph, Lücken-Report, Ereignis, Rechtsstand, Editor, Export | Abnahme B erfüllt | 1–2 Tage |
| M4 D | Engine mit Seed, Karten, Spielbildschirm, Nachbesprechung, Druckansicht; zuletzt die KI-Spielleitung | Abnahme D erfüllt | 2 Tage |
| M5 A | Fragen, Session, SCT-Wertung, Wissenskarte, Bibliothek, Panel-Modus | Abnahme A erfüllt | 1–2 Tage |
| M6 Testlauf | `verify`-Einträge prüfen, Deploy, Probelauf mit einer Person | alle `verify`-Einträge geklärt oder sichtbar markiert | 1 Tag |

### Testlauf mit Projektentwicklern

- Pro Person 60–90 Minuten für alle fünf Prototypen, in wechselnder Reihenfolge, damit nicht immer derselbe zuerst kommt.
- Pro Prototyp 10–15 Minuten freies Ausprobieren, dann das Feedback-Formular.
- Nach Problemen und Nutzen fragen, nicht nach Lösungen: Laut Tohidi et al. finden Nutzertests Probleme, liefern aber kaum brauchbare Verbesserungsvorschläge.
- Bei B und C möglichst ein echtes, anonymisiertes Projekt oder eine echte Fläche der Person einspielen.
- Zum Schluss: „Welche Version würdest du nächste Woche wieder öffnen, und warum?“

## Prompt für die Code-KI

Beide Dokumente als Markdown exportieren, der Code-KI geben und diesen Text voranstellen.

```text
Du baust fünf klickbare Prototypen als eine Web-App. Du bekommst zwei Dokumente:
1. „Fünf Prototyp-Versionen für Projektentwickler“: das Konzept (was und warum).
2. „Technischer Umsetzungsplan: Fünf Prototypen“: die Spezifikation (wie).
Bei Widersprüchen gilt Dokument 2.

Regeln:
- Arbeite die Meilensteine M0 bis M6 der Reihe nach ab. Zeige nach jedem Meilenstein, was läuft und wie ich es teste, und warte auf mein OK.
- Halte dich an den Stack aus Dokument 2. Frag, bevor du davon abweichst oder neue Abhängigkeiten hinzufügst.
- Die Oberfläche bleibt bewusst skizzenhaft: PaperCSS, Graustufen, Farbe nur für Status. Investiere keine Zeit in Optik.
- Inhalte nur aus Dokument 1 (Fallpaket F1–F9, Ablauf, Beispiele). Erfinde keine Rechtsfakten, Zahlen oder Quellen. Was du ergänzen musst, bekommt verify: true und erscheint in der Oberfläche als „ungeprüft“.
- Rechenlogik als reine Funktionen mit Vitest-Tests: A SCT-Wertung, B derive, C calc, D engine, E Brier und Median. Nutze die Testwerte aus Dokument 2.
- Code und Bezeichner auf Englisch, alle Texte in der Oberfläche auf Deutsch.
- Ich arbeite unter Linux, nicht unter macOS. Schreibe eine README mit Setup, Supabase-Schritten, Umgebungsvariablen und Deployment auf Vercel.
- B, C und D müssen lokal auch ohne Supabase laufen.

Starte mit M0. Stell mir vorher höchstens drei Rückfragen, falls etwas unklar ist.
```

## Quellen

Fachliche Quellen zu Vorbildern, Fallpaket und Recht stehen im Konzeptdokument: Fünf Prototyp-Versionen für Projektentwickler

- [Tohidi, Buxton, Baecker, Sellen (2006): Getting the Right Design and the Design Right](https://www.microsoft.com/en-us/research/?p=151922)
- [PaperCSS](https://getpapercss.com/) und [Paket auf npm](https://npmjs.com/package/papercss)
- [Anthropic API-Dokumentation](https://docs.claude.com/en/api/overview)
