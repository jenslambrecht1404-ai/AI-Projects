# Bewerbungs-Manager

Umfassende Web-Anwendung zur Automatisierung von Bewerbungen mit KI-gestützter Anschreiben-Generierung, dualer Bewerbungsstrategie (Deutschland Remote / Spanien Lokal) und komplettem Application-Tracking.

## Features

- **Dashboard** – Übersicht aller Bewerbungen mit Statistiken
- **Profil & Skills** – Berufserfahrung, Kompetenzen, Zertifikate, Ausbildung
- **Zielunternehmen** – Datenbank mit Prioritäten, Strategie-Zuordnung und Status-Tracking
- **Bewerbungen** – Vollständiges Tracking von Entwurf bis Angebot/Absage
- **KI-Anschreiben Generator** – Personalisierte Anschreiben per Claude API (DE/EN/ES, Strategie-aware)
- **E-Mail Vorlagen** – Mehrsprachige Templates (Initial, Follow-up, Thank You)
- **Interview-Vorbereitung** – KI-generierte Fragen mit Antwortvorschlägen
- **Strategie** – Duale Bewerbungsstrategie Deutschland/Spanien mit Zeitplan
- **Analytics** – Dashboard mit Status- und Strategie-Verteilung
- **E-Mail-Versand** – Bewerbungen direkt per SMTP versenden

## Setup

```bash
pip install -r requirements.txt
cp .env.example .env
# .env-Datei mit eigenen Werten ausfüllen
python app.py
```

Die App läuft dann unter `http://localhost:5000`.

Das Profil, Berufserfahrung, Skills, Zielunternehmen und E-Mail-Vorlagen werden beim ersten Start automatisch befüllt.

## Konfiguration (.env)

| Variable | Beschreibung |
|---|---|
| `ANTHROPIC_API_KEY` | API-Key für Claude (Anschreiben + Interview-Generierung) |
| `SECRET_KEY` | Flask Session Secret |
| `SMTP_SERVER` | SMTP-Server (z.B. smtp.gmail.com) |
| `SMTP_PORT` | SMTP-Port (z.B. 587) |
| `SMTP_USERNAME` | E-Mail-Adresse für den Versand |
| `SMTP_PASSWORD` | App-Passwort für den E-Mail-Versand |
