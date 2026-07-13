# SitzMix

**Faire, regelbasierte Sitzordnungen per Klick — ohne dass Klassen- oder Schülerdaten je den Browser verlassen.**

![Version](https://img.shields.io/badge/version-2.0-green)
![Docker](https://img.shields.io/badge/docker-ready-blue)
![React](https://img.shields.io/badge/react-19-61DAFB)

---

## Warum SitzMix?

Sitzordnungen regelmässig zu wechseln ist pädagogisch sinnvoll — aber von Hand mühsam: Wer sass schon vorne? Welche zwei dürfen auf keinen Fall nebeneinander? Wie wird es fair und nicht jedes Mal dieselbe Konstellation?

SitzMix nimmt Ihnen genau diese Arbeit ab:

- **Ein Klick statt Zettelwirtschaft.** Klasse und Zimmer einmal erfassen — danach erzeugt SitzMix in Sekunden eine neue, faire Sitzordnung. Gefällt sie nicht, einfach neu mischen.
- **Ihre Regeln werden eingehalten.** Legen Sie fest, welche Lernenden *nicht* nebeneinander sitzen sollen. SitzMix berücksichtigt das automatisch und hält solche Paare auf Abstand.
- **Flexibel im Schulalltag.** Jemand ist krank? Als abwesend markieren — der Platz bleibt frei und beim nächsten Mischen aussen vor. Sie möchten zwei Lernende tauschen? Per Drag & Drop direkt im Plan.
- **Für die Tafelseite gedacht.** Mit einem Klick (oder Taste **L**) drehen Sie den Plan in die **Lernenden-Sicht** — so sehen Sie die Sitzordnung genau so, wie sie von vorne in der Klasse aussieht.
- **Zum Mitnehmen.** Sitzplan als Bild (PNG) exportieren, ausdrucken oder im Vollbild an die Wand werfen.
- **Datenschutz ohne Kompromiss.** Namen, Klassen und Regeln werden **nur lokal in Ihrem Browser** gespeichert — nie auf einem Server. Niemand ausser Ihnen sieht diese Daten (siehe [Datenschutz](#datenschutz--eingebaut-nicht-nachgerüstet)).
- **Keine Installation, kein Login.** SitzMix läuft als Website direkt im Browser. Kein Konto, kein Setup, keine App.

---

## In 3 Schritten zum Sitzplan

1. **Klasse erfassen** — Klasse anlegen, Lernende eintippen (auch alle auf einmal, durch Komma oder Zeilenumbruch getrennt) und optional Regeln definieren (wer nicht nebeneinander sitzen darf).
2. **Zimmer einrichten** — Grundriss-Bild hochladen, Tischgruppen festlegen und Sitzplätze platzieren. Das macht man pro Zimmer nur einmal.
3. **Generieren & anpassen** — Klasse + Zimmer wählen, **Sitzplan generieren** klicken. Nach Belieben neu mischen, Abwesende markieren, einzelne Lernende verschieben und das Ergebnis als PNG sichern.

> Beim ersten Start ist bereits ein **Beispiel** (eine Klasse, ein Zimmer) vorhanden — so können Sie sofort ausprobieren, ohne etwas erfassen zu müssen.

---

## Datenschutz – eingebaut, nicht nachgerüstet

SitzMix verarbeitet **keine** personenbezogenen Daten auf dem Server. Klassenbezeichnungen, Schülernamen, Sitz-Regeln sowie Grundriss-Bilder bleiben **ausschliesslich lokal im Browser** der Lehrperson (gespeichert in der IndexedDB des Geräts). Es findet kein Upload statt — der Server liefert nur das Programm selbst aus und sieht die Daten der Nutzerinnen und Nutzer nie. Die datenschutzrechtliche Vorgabe ist damit baulich erfüllt.

Damit dabei nichts verloren geht:

- Beim ersten Start fordert die App **Persistent Storage** an, damit der Browser den Speicher nicht automatisch verdrängt.
- Ein dezenter Banner erinnert daran, regelmässig zu sichern (und erscheint nach jeder Änderung erneut).
- Über **Einstellungen → Daten exportieren** erstellen Sie jederzeit eine **JSON-Sicherung** (inkl. Grundriss-Bilder). Diese lässt sich nach dem Leeren des Browser-Speichers oder auf einem anderen Gerät wieder importieren.

---

## Was SitzMix kann

### Sitzpläne erstellen & live anpassen

- Klasse und Zimmer wählen, Sitzplan **per Klick generieren** (die Berechnung läuft im Browser).
- Zwei Verteilmodi:
  - **Alle Plätze auffüllen** — Lernende werden der Reihe nach auf alle Plätze verteilt.
  - **Pro Bereich** — Lernende werden gleichmässig auf die Tischgruppen verteilt (Anzahl pro Bereich wählbar), mit Optimierung des Abstands zwischen verbotenen Paaren.
- **Regeln werden eingehalten:** definierte Paare landen weder am selben Tisch noch direkt nebeneinander.
- **Abwesende markieren:** Lernende mit `×` als abwesend setzen — der Platz wird frei, die Person erscheint in einer immer sichtbaren Leiste oben. Beim **Neu mischen** bleiben Abwesende abwesend. Zurückholen per Klick (nächster freier Platz) oder per Drag auf einen freien Platz.
- **Manuell umordnen:** Lernende per **Drag & Drop** verschieben oder tauschen, mit klarem visuellem Feedback.
- **Perspektive umschalten:** zwischen **Lehrpersonen-Sicht** (Standard) und **Lernenden-Sicht** (um 180° gedreht, wie von vorne in der Klasse). Wer neben wem sitzt bleibt gleich, Namen bleiben aufrecht lesbar.
- Sitzplan als **PNG exportieren** oder in der **Vollbild-Ansicht** zeigen.

### Klassen & Regeln

- Klassen anlegen, benennen, bearbeiten, löschen.
- Lernende einzeln oder **gesammelt** hinzufügen (Textfeld, getrennt durch Zeilenumbruch / Komma / Semikolon).
- Automatische Pastellfarbe pro Lernende für die visuelle Unterscheidung im Plan.
- **Regeln** definieren: Paare festlegen, die nicht nebeneinander sitzen sollen.

### Zimmer & Grundriss

- **Bild auswählen** — ein Grundriss-Bild (beliebiges Bildformat) hochladen. Es wird lokal im Browser abgelegt.
- **Tischgruppen** (Bereiche) mit Position, Grösse und Farbe definieren.
- **Sitzplätze** per Drag & Drop auf dem Grundriss platzieren, mit Raster-Einrasten; verschieben, Tischgruppen automatisch zuweisen oder per `Delete`/`Backspace` entfernen.

### Erscheinungsbild

- Über **Zahnrad → Erscheinungsbild** ein **Theme** wählen — Farb- und Schrift-Kombinationen, benannt nach Schweizer Städten: **Winterthur** (Standard, Grün), **Zürich** (Blau), **Bern** (Rot), **Genève** (Petrol), **Lugano** (Terracotta) — oder **Eigenes** mit frei wählbarer Akzentfarbe und Schrift.
- Die Auswahl wird lokal im Browser gespeichert und ist im Daten-Export/-Import enthalten.

### Sichern & auf andere Geräte übertragen

- Gesamten Datenbestand als **JSON exportieren** (Backup inkl. Grundriss-Bildern).
- JSON-Backup wieder **importieren** (auch ältere Export-Versionen werden gelesen).

### Tastenkürzel

| Taste | Funktion |
|---|---|
| **L** | Perspektive wechseln (Lehrpersonen- ↔ Lernenden-Sicht) |
| **F** | Vollbild-Ansicht öffnen/schliessen |
| **Delete** / **Backspace** | Ausgewählten Sitzplatz löschen |

---

# Für IT & Betrieb

Der folgende Teil richtet sich an Personen, die SitzMix bereitstellen oder weiterentwickeln. Für die Nutzung im Unterricht ist er nicht nötig.

## Schnellstart (Docker)

**Voraussetzungen:** [Docker](https://docs.docker.com/engine/install/) mit Compose v2 (Betrieb) — alternativ Node.js 22+ (Entwicklung).

```bash
git clone <REPO-URL> sitzmix
cd sitzmix
./setup.sh
```

Das Skript prüft Docker/Compose, baut das Image und startet den Container. SitzMix ist danach erreichbar unter **http://localhost:3001**.

Alternativ manuell:

```bash
docker compose up -d --build   # bauen & starten
docker compose down            # stoppen
```

Der Port lässt sich über die Umgebungsvariable `SITZMIX_PORT` ändern (Standard `3001`):

```bash
SITZMIX_PORT=8090 ./setup.sh
```

`setup.sh` ist **idempotent** — ein erneuter Aufruf baut neu und aktualisiert die laufende Instanz. So lässt sich nach einem `git pull` einfach die neueste Version ausrollen.

### Öffentliche Domain (z.B. sitzmix.ch)

Einen Reverse-Proxy (nginx/Caddy/Traefik) auf den SitzMix-Port richten und dort TLS terminieren. Der Container liefert intern nur HTTP auf Port 80 bzw. den gemappten Host-Port.

Am Proxy zusätzlich HSTS setzen (gehört zur TLS-Terminierung, nicht in den Container):

```nginx
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains" always;
```

## Sicherheit & Härtung

SitzMix hat keine Serverlogik, keine Datenbank und keine Benutzerkonten — der Server liefert nur statische Dateien aus. Die Angriffsfläche beschränkt sich damit auf den Browser. `nginx.conf` härtet die Auslieferung zusätzlich:

| Header | Zweck |
|---|---|
| `Content-Security-Policy` | `connect-src 'self' blob:` — die App **kann** keine Daten an Dritte senden; `script-src 'self'` verbietet Inline-Skripte |
| `X-Frame-Options` / `frame-ancestors 'none'` | kein Einbetten in fremde Seiten (Clickjacking) |
| `X-Content-Type-Options: nosniff` | kein MIME-Sniffing |
| `Referrer-Policy: no-referrer` | keine URL-Weitergabe an Dritte |
| `Cross-Origin-Opener/Resource-Policy` | Isolation gegenüber anderen Herkünften |
| `Permissions-Policy` | Geolocation/Kamera/Mikrofon aus; Fullscreen bleibt erlaubt |

Die CSP macht die Datenschutz-Zusage **technisch durchsetzbar**: Selbst wenn über eine Backup-Datei oder eine Abhängigkeit fremder Code in die Seite käme, blockiert der Browser jeden Netzwerkzugriff auf fremde Hosts. Nachgewiesen mit einem Test gegen den echten Container: `fetch()` und Bild-Beacons auf externe Domains werden mit `connect-src`- bzw. `img-src`-Verstoss abgewiesen, Inline-Skripte mit `script-src-elem`.

Beim Import einer Backup-Datei werden Bilder strikt auf `image/*` begrenzt und Farben auf `#rrggbb` normalisiert; beschädigte Dateien werden abgelehnt, **bevor** Daten angelegt werden.

## Lokale Entwicklung

```bash
cd frontend
npm install
npm run dev      # Vite-Dev-Server auf http://localhost:5173
npm test         # Unit-/Integrationstests (Vitest)
npm run build    # Produktions-Build nach dist/
```

Kein Backend, keine Datenbank — die App läuft vollständig im Browser.

## Tech-Stack

| Komponente | Technologie |
|---|---|
| Frontend | React 19, Vite 7, TailwindCSS 4, React Router 7 |
| Datenhaltung | IndexedDB (im Browser) |
| Grafik | html-to-image (PNG-Export) |
| Tests | Vitest, fake-indexeddb |
| Deployment | Docker + Nginx (statisch) |

## Projektstruktur

```
sitzmix/
├── docker-compose.yml          # Ein Service (Nginx, statisch)
├── Dockerfile                  # Multi-Stage: Vite-Build → Nginx
├── nginx.conf                  # Statisches Hosting + SPA-Fallback
├── setup.sh                    # Deployment-Skript (idempotent)
└── frontend/
    ├── vite.config.js
    ├── vitest.config.js
    ├── public/
    │   └── default-floorplan.webp  # Beispiel-Grundriss (Seed)
    └── src/
        ├── main.jsx                # Entry Point (mountet StoreProvider)
        ├── App.jsx                 # Routing & Toast-Context
        ├── lib/
        │   ├── db.js               # IndexedDB-Wrapper (Snapshot + Bild-Blobs)
        │   ├── store.js            # In-Memory-Store, CRUD, Generate, Persistenz
        │   ├── exportImport.js     # JSON Export/Import (v1 + v2)
        │   ├── seatingAlgorithm.js # Sitzplan-Algorithmus (Backtracking)
        │   ├── seatingPlan.js      # Reine Helfer fürs Umordnen/Abwesend
        │   └── seedData.js         # Beispieldaten beim ersten Start
        ├── store/
        │   └── StoreProvider.jsx   # React-Context + useStore()-Hook
        └── components/
            ├── layout/             # Navbar + Datenschutz-Banner
            ├── generator/          # GeneratorPage, AbsentList
            ├── classes/            # Klassen-Liste & -Editor
            ├── rooms/              # Zimmer-Editor, SeatPlacer
            ├── settings/           # Import/Export-Modals
            └── common/             # Toast, SearchableSelect, Button
```

## Datenmodell (im Browser)

Ein Snapshot-Objekt in IndexedDB (Object-Store `app`, Key `snapshot`); Grundriss-Bilder als separate Blobs (Object-Store `images`):

```js
{
  schemaVersion: 2,
  classes: [
    { id, name,
      students: [{ id, name, color }],
      rules:    [{ id, student_a_id, student_b_id }] }
  ],
  rooms: [
    { id, name, image_width, image_height,
      floorplan_image_path,   // = imageId des Blobs, oder null
      areas: [{ id, name, color, sort_order, x_pos, y_pos, width_pct, height_pct }],
      seats: [{ id, seat_number, x_position, y_position, area_id }] }
  ]
}
```

- IDs sind UUIDs (`crypto.randomUUID()`). Nach jeder Änderung wird der vollständige Snapshot persistiert.
- Grundriss-Bilder liegen als separate Blobs im Object-Store `images`; `floorplan_image_path` verweist darauf.

### Datei-Format

- **App-Backup:** `{ type: "sitzmix-export", version: 2, classes, rooms }` (Grundriss-Bilder als Base64). Ältere Exporte mit eingebetteten Skizzen werden weiterhin importiert (die Skizze wird dabei ignoriert).

## Sitzplan-Algorithmus

**Backtracking mit Constraint Solving**, vollständig im Browser:

1. **Alle Plätze auffüllen**: Lernende werden zufällig verteilt; Backtracking stellt sicher, dass verbotene Paare weder im selben Bereich noch auf physisch benachbarten Plätzen landen.
2. **Pro Bereich** (empfohlen):
   - Berechnet eine gleichmässige Verteilung (z.B. 24 Lernende auf 6 Tische → 4 pro Tisch).
   - Weist Lernende per Backtracking den Tischgruppen zu (verbotene Paare nie am gleichen Tisch).
   - Optimiert über bis zu 60 Durchläufe den Abstand zwischen verbotenen Paaren.
   - Fällt auf den sequenziellen Modus zurück, falls keine Lösung gefunden wird.

**Nachbarschaftserkennung:** Plätze gelten als benachbart, wenn ihr Abstand unter 15 % der Grundrissdimensionen liegt.

## Beispieldaten

Beim allerersten Start (leerer Browser-Speicher) wird ein Beispieldatensatz angelegt:

- 1 Klasse mit 24 Lernenden
- 1 Zimmer mit 6 Tischgruppen à 4 Plätzen
- Grundriss-Bild mit vorplatzierten Sitzen

Über das Daten-Backup oder durch Löschen des Browser-Speichers lässt sich dieser Zustand zurücksetzen.

---

## Lizenz

Dieses Projekt ist für den schulischen Einsatz bestimmt.
