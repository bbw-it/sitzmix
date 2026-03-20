# SitzMix

Modernes Sitzplan-Tool für Lehrpersonen — generiert faire, regelbasierte Sitzordnungen per Klick.

![Version](https://img.shields.io/badge/version-1.0-green)
![Docker](https://img.shields.io/badge/docker-ready-blue)
![Node](https://img.shields.io/badge/node-22-brightgreen)
![React](https://img.shields.io/badge/react-19-61DAFB)

---

## Übersicht

SitzMix unterstützt Lehrpersonen beim wöchentlichen Mischen von Sitzordnungen. Klassen und Zimmer werden einmalig erfasst, danach genügt ein Klick, um eine neue, zufällige Sitzordnung zu erzeugen — unter Berücksichtigung definierter Regeln (z.B. welche Lernende nicht nebeneinander sitzen dürfen).

## Funktionen

### Sitzplan-Generator

- Klasse und Zimmer auswählen, Sitzplan per Klick generieren
- Zufällige Zuteilung der Lernenden auf definierte Sitzplätze
- Zwei Verteilmodi:
  - **Sequenziell** — Plätze werden der Reihe nach befüllt
  - **Pro Tischgruppe** — Lernende gleichmässig auf Tischgruppen verteilen, mit Abstandsoptimierung
- Berücksichtigung von Regeln (wer **nicht** nebeneinander sitzen darf)
- Sitzplan als **PNG exportieren** oder in der **Vollbild-Lightbox** betrachten
- Jederzeit neu mischen mit einem Klick

### Klassenverwaltung

- Klassen erstellen und benennen
- Lernende einzeln oder im Bulk (Textfeld, ein Name pro Zeile) hinzufügen
- Individuelle Farben pro Lernende (Pastell-Palette) für visuelle Unterscheidung
- Regeln definieren: Paare festlegen, die nicht nebeneinander sitzen sollen
- Klassen bearbeiten und löschen

### Zimmerverwaltung

- Zimmer erstellen und Grundriss-Bild hochladen (PNG/JPEG)
- Tischgruppen (Areas) mit Position, Grösse und Farbe definieren
- Sitzplätze per **Drag & Drop** auf dem Grundriss platzieren
- **Snap-to-Grid** (2%-Raster) für saubere Ausrichtung
- Sitzplätze verschieben, Tischgruppen zuweisen oder per Tastatur (Delete/Backspace) entfernen

### Datenmanagement

- Gesamte Datenbank als **JSON exportieren** (Backup)
- JSON-Backup wieder **importieren** (Restore)

---

## Tech Stack

| Komponente | Technologie |
|---|---|
| Frontend | React 19, Vite 7, TailwindCSS 4 |
| Backend | Node.js 22, Express 4, Sequelize 6 |
| Datenbank | MariaDB 11 |
| Bildexport | html-to-image |
| Deployment | Docker, Docker Compose (Multi-Stage Build) |

---

## Schnellstart mit Docker

### Voraussetzungen

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installiert

### Starten

```bash
git clone https://github.com/dein-user/sitzmix.git
cd sitzmix
docker compose up -d
```

Die App ist danach erreichbar unter: **http://localhost:3001**

### Stoppen

```bash
docker compose down
```

### Aktualisieren (nach Code-Änderungen)

```bash
docker compose up -d --build
```

### Daten zurücksetzen

```bash
# Alle Container und Volumes löschen (Daten gehen verloren!)
docker compose down -v
```

---

## Lokale Entwicklung (ohne Docker)

### Voraussetzungen

- Node.js 22+
- MariaDB 11 (lokal oder via Docker)

### Backend starten

```bash
cd backend
cp .env.example .env   # DB-Credentials anpassen
npm install
npm run dev             # Startet mit Nodemon auf Port 3001
```

### Frontend starten

```bash
cd frontend
npm install
npm run dev             # Startet Vite auf Port 5173
```

Das Frontend leitet `/api`-Requests automatisch an `http://localhost:3001` weiter (Vite Proxy).

---

## Konfiguration

### Umgebungsvariablen

| Variable | Standard | Beschreibung |
|---|---|---|
| `DB_HOST` | `db` (Docker) / `127.0.0.1` (lokal) | Datenbank-Host |
| `DB_PORT` | `3306` (Docker) / `3307` (lokal) | Datenbank-Port |
| `DB_USER` | `user1` | Datenbank-Benutzer |
| `DB_PASSWORD` | `user123` | Datenbank-Passwort |
| `DB_NAME` | `sitzmix` | Datenbankname |
| `PORT` | `3001` | Port der Web-App |

### Port ändern (Docker)

In `docker-compose.yml` den Host-Port anpassen:

```yaml
ports:
  - "8080:3001"
```

---

## Projektstruktur

```
sitzmix/
├── docker-compose.yml          # Docker Compose Orchestration
├── Dockerfile                  # Multi-Stage Build (Frontend + Backend)
├── database/
│   └── init.sql                # Schema + Seed-Daten
├── backend/
│   ├── server.js               # Express Entry Point
│   ├── config/
│   │   └── database.js         # Sequelize-Konfiguration
│   ├── models/                 # Datenmodelle
│   │   ├── Class.js
│   │   ├── Student.js
│   │   ├── Rule.js
│   │   ├── Room.js
│   │   ├── Seat.js
│   │   └── Area.js
│   ├── routes/                 # REST-API Endpunkte
│   │   ├── classes.js
│   │   ├── students.js
│   │   ├── rules.js
│   │   ├── rooms.js
│   │   ├── seats.js
│   │   ├── areas.js
│   │   ├── generator.js
│   │   └── export.js
│   ├── services/
│   │   └── seatingAlgorithm.js # Sitzplan-Algorithmus
│   ├── middleware/
│   │   └── upload.js           # Multer File-Upload
│   └── uploads/                # Hochgeladene Grundrisse
└── frontend/
    ├── vite.config.js          # Vite + TailwindCSS + Proxy
    └── src/
        ├── main.jsx            # React Entry Point
        ├── App.jsx             # Routing & Toast-Context
        ├── api/
        │   └── client.js       # Axios-Instanz
        └── components/
            ├── layout/         # Navbar
            ├── generator/      # Sitzplan-Generator UI
            ├── classes/        # Klassenverwaltung
            ├── rooms/          # Zimmerverwaltung + Grundriss-Editor
            ├── settings/       # Import/Export
            └── common/         # Toast, SearchableSelect
```

---

## API-Endpunkte

| Methode | Pfad | Beschreibung |
|---|---|---|
| `GET/POST` | `/api/classes` | Klassen auflisten / erstellen |
| `GET/PUT/DELETE` | `/api/classes/:id` | Klasse lesen / bearbeiten / löschen |
| `GET/POST/DELETE` | `/api/students` | Lernende verwalten |
| `GET/POST/DELETE` | `/api/rules` | Regeln (verbotene Paare) verwalten |
| `GET/POST` | `/api/rooms` | Zimmer auflisten / erstellen |
| `GET/PUT/DELETE` | `/api/rooms/:id` | Zimmer lesen / bearbeiten / löschen |
| `GET/POST/DELETE` | `/api/seats` | Sitzplätze verwalten |
| `GET/POST/PUT/DELETE` | `/api/areas` | Tischgruppen verwalten |
| `POST` | `/api/generator/generate` | Sitzplan generieren |
| `GET` | `/api/export` | Datenbank als JSON exportieren |
| `POST` | `/api/import` | JSON-Backup importieren |
| `GET` | `/api/health` | Health Check (Docker) |

---

## Sitzplan-Algorithmus

Der Algorithmus verwendet **Backtracking mit Constraint Solving**:

1. **Sequenzieller Modus**: Lernende werden zufällig auf Plätze verteilt. Per Backtracking wird sichergestellt, dass verbotene Paare weder im selben Bereich noch auf physisch benachbarten Plätzen landen.

2. **Tischgruppen-Modus** (empfohlen):
   - Berechnet optimale Verteilung (z.B. 24 Lernende auf 6 Tische → 4 pro Tisch)
   - Weist Lernende per Backtracking den Tischgruppen zu (verbotene Paare nie am gleichen Tisch)
   - Optimiert über bis zu 60 Durchläufe den Abstand zwischen verbotenen Paaren
   - Fallback auf sequenziellen Modus, falls keine Lösung gefunden wird

**Nachbarschaftserkennung**: Plätze gelten als benachbart, wenn ihr Abstand unter 15% der Grundrissdimensionen liegt.

---

## Seed-Daten

Die Datenbank wird beim ersten Start mit Beispieldaten befüllt:

- 1 Klasse mit 24 Lernenden
- 1 Zimmer mit 6 Tischgruppen à 4 Plätzen
- Grundriss-Bild mit vorplatzierten Sitzen

---

## Lizenz

Dieses Projekt ist für den schulischen Einsatz bestimmt.
