# Bewerbungs-Manager

Web-Anwendung zur Automatisierung von Bewerbungen mit KI-gestützter Anschreiben-Generierung.

## Features

- **Dashboard** – Übersicht aller Bewerbungen mit Status-Tracking
- **Anschreiben-Generator** – Personalisierte Anschreiben per Claude API
- **E-Mail-Versand** – Bewerbungen direkt aus der App versenden
- **Profilverwaltung** – Lebenslauf und Kontaktdaten zentral pflegen

## Setup

```bash
pip install -r requirements.txt
cp .env.example .env
# .env-Datei mit eigenen Werten ausfüllen
python app.py
```

Die App läuft dann unter `http://localhost:5000`.

## Konfiguration (.env)

| Variable | Beschreibung |
|---|---|
| `ANTHROPIC_API_KEY` | API-Key für Claude (Anschreiben-Generierung) |
| `SECRET_KEY` | Flask Session Secret |
| `SMTP_SERVER` | SMTP-Server (z.B. smtp.gmail.com) |
| `SMTP_PORT` | SMTP-Port (z.B. 587) |
| `SMTP_USERNAME` | E-Mail-Adresse für den Versand |
| `SMTP_PASSWORD` | App-Passwort für den E-Mail-Versand |
