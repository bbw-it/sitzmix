# SitzMix

Modernes Sitzplan-Tool für Lehrpersonen zum wöchentlichen Generieren und Mischen von Sitzordnungen.

![SitzMix](https://img.shields.io/badge/version-1.0-green) ![Docker](https://img.shields.io/badge/docker-ready-blue)

## Funktionen

### Sitzplan Generator
- Klasse und Zimmer auswählen, Sitzplan per Klick generieren
- Zufällige Zuteilung der Lernenden auf die definierten Sitzplätze
- Berücksichtigung von Regeln (wer **nicht** nebeneinander sitzen darf)
- Sitzplan als **PNG exportieren** oder in der **Lightbox-Grossansicht** (mit Vollbild) betrachten
- Jederzeit neu mischen mit einem Klick

### Klassenverwaltung
- Klassen erstellen und benennen
- Lernende hinzufügen (einzeln oder mehrere auf einmal via Textfeld)
- Regeln definieren: Paare festlegen, die nicht nebeneinander sitzen sollen

### Zimmerverwaltung
- Zimmer erstellen und Grundriss-Bild hochladen (PNG/JPEG)
- Sitzplätze per Drag & Drop auf dem Grundriss platzieren
- Snap-to-Grid-Raster für saubere Ausrichtung
- Sitzplätze verschieben oder entfernen

### Einstellungen
- Datenbankverbindung konfigurieren und testen

## Tech Stack

| Komponente | Technologie |
|---|---|
| Frontend | React 18, Vite, TailwindCSS |
| Backend | Node.js, Express, Sequelize ORM |
| Datenbank | MariaDB 11 |
| Deployment | Docker, Docker Compose |

## Schnellstart mit Docker

### Voraussetzungen

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installiert

### Starten

```bash
# Repository klonen
git clone https://github.com/dein-user/sitzmix.git
cd sitzmix

# App starten (baut beim ersten Mal automatisch)
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

## Konfiguration

Die Standardkonfiguration in `docker-compose.yml`:

| Variable | Wert | Beschreibung |
|---|---|---|
| `DB_HOST` | `db` | Hostname der Datenbank (Docker-intern) |
| `DB_PORT` | `3306` | Datenbank-Port (Docker-intern) |
| `DB_USER` | `user1` | Datenbank-Benutzer |
| `DB_PASSWORD` | `user123` | Datenbank-Passwort |
| `PORT` | `3001` | Port der Web-App |

### Port ändern

Um die App auf einem anderen Port zu starten (z.B. 8080), in `docker-compose.yml` ändern:

```yaml
ports:
  - "8080:3001"
```

## Projektstruktur

```
sitzmix/
├── docker-compose.yml      # Docker Compose Konfiguration
├── Dockerfile              # Multi-Stage Build (Frontend + Backend)
├── database/
│   └── init.sql            # Datenbank-Schema
├── backend/
│   ├── server.js           # Express Server
│   ├── config/             # Datenbank-Konfiguration
│   ├── models/             # Sequelize Models
│   ├── routes/             # API-Routen
│   ├── services/           # Sitzplan-Algorithmus
│   └── uploads/            # Hochgeladene Grundrisse
└── frontend/
    └── src/
        ├── components/     # React-Komponenten
        └── api/            # API-Client
```

## Lizenz

Dieses Projekt ist für den schulischen Einsatz bestimmt.
