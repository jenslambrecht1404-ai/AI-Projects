"""Seed the database with Jens Lambrecht's profile and initial data."""
import json
from datetime import datetime
import models


def seed():
    conn = models.get_db()
    now = datetime.now().isoformat()

    # --- Profile ---
    existing = conn.execute("SELECT id FROM profile WHERE id=1").fetchone()
    if not existing:
        conn.execute(
            """INSERT INTO profile (id, full_name, email, phone, address, title, summary,
               resume_text, target_location, available_from, updated_at)
               VALUES (1,?,?,?,?,?,?,?,?,?,?)""",
            ("Jens Lambrecht", "", "", "München / Sevilla",
             "Digital Transformation & AI Strategy",
             "TÜV-zertifizierter AI-Consultant mit über 20 Jahren Erfahrung in IT, Cloud und KI. "
             "Spezialisiert auf digitale Transformation, KI-gestützte Automatisierung und "
             "strategische Portfolio-Entwicklung.",
             # resume_text - comprehensive
             """BERUFSERFAHRUNG:

• TÜV-zertifizierter AI-Consultant | Selbstständig | Seit 10/2025
  KI-Beratung und -Implementierung für Unternehmen verschiedener Branchen.
  Fokus auf KI-Potenzialanalysen, Prozessautomatisierung und Entwicklung KI-gestützter Lösungen.

• Senior Offerings Manager Hybrid IT & Cloud | Fujitsu Services / Manage Now GmbH | 02/2024 - 12/2024
  Strategischer Aufbau eines Hybrid IT & Cloud Service-Portfolios mit Fokus auf Datenhoheit und Enterprise-Kunden.
  - Identifikation und Management strategischer Technologiepartner
  - Marktanalyse und Sales-Schulungen für erfolgreiche Markteinführung

• Senior Offerings Manager & Portfolio Lead UVANCE | Fujitsu Services | 04/2023 - 01/2024
  Portfolio Lead für Fujitsu Cloud Managed Services in Deutschland.
  4 Mio. € F&E-Budget verwaltet, Marktanteil um 2% gesteigert durch Innovationsprojekte.

KERNKOMPETENZEN:
- Digitale Transformation (Expert)
- KI-Strategie & Implementierung (Advanced)
- Cloud Computing Hybrid/Multi (Expert)
- Change Management (Expert)

TECHNOLOGIEN & METHODEN:
Generative AI, LLMs, Cloud Architecture, Agile Leadership, Scrum, Kanban, ITIL,
Mainframe Modernization, Hybrid Cloud, Data Strategy, Stakeholder Management,
Intercultural Communication

SPRACHEN:
- Deutsch: Muttersprache
- Englisch: C1 – Verhandlungssicher
- Spanisch: C1 – Fließend

ZERTIFIKATE:
- TÜV-zertifizierter AI-Consultant, AI Training Institute (09/2025)
- KI-Manager & KI-Consultant, Digital Beat & Gründer.de (04/2025)
- Professional Scrum Master I (PSM I), scrum.org (11/2023)
- Leading SAFe 6.0, Scaled Agile Inc. (04/2023)
- Microsoft Azure Fundamentals (AZ-900), Microsoft (11/2022)

AUSBILDUNG:
- Diplom-Kaufmann, Leuphana Universität Lüneburg (1990-1998)
  Schwerpunkt: Marketing & Technologiemanagement""",
             "Sevilla (oder Remote aus Deutschland)",
             "September 2026",
             now),
        )

    # --- Experience ---
    if not conn.execute("SELECT id FROM experience LIMIT 1").fetchone():
        experiences = [
            ("TÜV-zertifizierter AI-Consultant", "Selbstständig", "10/2025", None,
             "KI-Beratung und -Implementierung für Unternehmen verschiedener Branchen. "
             "Fokus auf KI-Potenzialanalysen, Prozessautomatisierung und Entwicklung KI-gestützter Lösungen.", 1),
            ("Senior Offerings Manager Hybrid IT & Cloud", "Fujitsu Services / Manage Now GmbH",
             "02/2024", "12/2024",
             "Strategischer Aufbau eines Hybrid IT & Cloud Service-Portfolios mit Fokus auf Datenhoheit "
             "und Enterprise-Kunden.\n• Identifikation und Management strategischer Technologiepartner\n"
             "• Marktanalyse und Sales-Schulungen für erfolgreiche Markteinführung", 2),
            ("Senior Offerings Manager & Portfolio Lead UVANCE", "Fujitsu Services",
             "04/2023", "01/2024",
             "Portfolio Lead für Fujitsu Cloud Managed Services in Deutschland. "
             "4 Mio. € F&E-Budget verwaltet, Marktanteil um 2% gesteigert durch Innovationsprojekte.", 3),
        ]
        for title, company, start, end, desc, order in experiences:
            conn.execute(
                "INSERT INTO experience (profile_id, job_title, company, start_date, end_date, description, sort_order) "
                "VALUES (1,?,?,?,?,?,?)", (title, company, start, end, desc, order))

    # --- Skills ---
    if not conn.execute("SELECT id FROM skills LIMIT 1").fetchone():
        skill_data = [
            ("Kernkompetenz", "Digitale Transformation", "Expert"),
            ("Kernkompetenz", "KI-Strategie & Implementierung", "Advanced"),
            ("Kernkompetenz", "Cloud Computing (Hybrid/Multi)", "Expert"),
            ("Kernkompetenz", "Change Management", "Expert"),
            ("Technologie", "Generative AI", None),
            ("Technologie", "LLMs", None),
            ("Technologie", "Cloud Architecture", None),
            ("Technologie", "Agile Leadership", None),
            ("Technologie", "Scrum", None),
            ("Technologie", "Kanban", None),
            ("Technologie", "ITIL", None),
            ("Technologie", "Mainframe Modernization", None),
            ("Technologie", "Hybrid Cloud", None),
            ("Technologie", "Data Strategy", None),
            ("Technologie", "Stakeholder Management", None),
            ("Technologie", "Intercultural Communication", None),
            ("Sprache", "Deutsch", "Muttersprache"),
            ("Sprache", "Englisch", "C1 – Verhandlungssicher"),
            ("Sprache", "Spanisch", "C1 – Fließend"),
        ]
        for cat, name, level in skill_data:
            conn.execute("INSERT INTO skills (profile_id, category, name, level) VALUES (1,?,?,?)",
                         (cat, name, level))

    # --- Certifications ---
    if not conn.execute("SELECT id FROM certifications LIMIT 1").fetchone():
        certs = [
            ("TÜV-zertifizierter AI-Consultant", "AI Training Institute", "09/2025",
             "KI-Potenzialanalysen, Chatbot-Entwicklung, Prozessautomatisierung"),
            ("KI-Manager & KI-Consultant", "Digital Beat & Gründer.de", "04/2025", ""),
            ("Professional Scrum Master I (PSM I)", "scrum.org", "11/2023", ""),
            ("Leading SAFe 6.0", "Scaled Agile Inc.", "04/2023", ""),
            ("Microsoft Azure Fundamentals (AZ-900)", "Microsoft", "11/2022", ""),
        ]
        for name, issuer, date, desc in certs:
            conn.execute("INSERT INTO certifications (profile_id, name, issuer, date, description) VALUES (1,?,?,?,?)",
                         (name, issuer, date, desc))

    # --- Education ---
    if not conn.execute("SELECT id FROM education LIMIT 1").fetchone():
        conn.execute(
            "INSERT INTO education (profile_id, degree, institution, period, focus, details) VALUES (1,?,?,?,?,?)",
            ("Diplom-Kaufmann", "Leuphana Universität Lüneburg", "1990-1998",
             "Marketing & Technologiemanagement",
             'Diplomarbeit: "Analyse und Segmentierung des Projektoren Marktes" in Zusammenarbeit mit iiyama Electric GmbH'))

    # --- Target Companies (from portal screenshots) ---
    if not conn.execute("SELECT id FROM target_companies LIMIT 1").fetchone():
        companies = [
            ("Airbus Defence and Space", "Sevilla", "Spanien", "es_lokal", "Luft- & Raumfahrt", "top",
             "Top-Priorität! Starker Fokus auf Digitalisierung in Sevilla."),
            ("Airbus Defence and Space", "München", "Deutschland", "de_remote", "Luft- & Raumfahrt", "top",
             "Starke Achse München-Sevilla nutzen."),
            ("Accenture Deutschland", "Köln", "Deutschland", "de_remote", "IT-Beratung", "hoch", ""),
            ("BMW Group", "München", "Deutschland", "de_remote", "Automotive", "hoch", ""),
            ("Bosch GmbH", "Stuttgart", "Deutschland", "de_remote", "Technologie", "hoch", ""),
            ("SAP SE", "Walldorf", "Deutschland", "de_remote", "Software", "hoch", ""),
            ("Siemens AG", "München", "Deutschland", "de_remote", "Technologie", "hoch", ""),
        ]
        for name, city, country, strategy, industry, priority, notes in companies:
            conn.execute(
                """INSERT INTO target_companies (name, city, country, strategy, industry, priority,
                   notes, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)""",
                (name, city, country, strategy, industry, priority, notes, "recherche", now, now))

    # --- Email Templates ---
    if not conn.execute("SELECT id FROM email_templates LIMIT 1").fetchone():
        templates = [
            # English
            ("Initial Application (LinkedIn)", "Application for Senior Manager Digital Transformation - Jens Lambrecht",
             """Dear Mr./Ms. [Name],

I came across your profile and noticed that you are responsible for [Area] at [Company].

With over 20 years of experience in IT, Cloud, and AI Strategy (most recently at Fujitsu), I am currently looking for a new challenge where I can translate technological innovation into business value.

Your company is pursuing exciting approaches in [Topic], which align very well with my profile. Would you be open to a brief exchange?

Best regards,
Jens Lambrecht""", "en", "initial"),

            ("Follow-up (after 1 week)", "Re: Application for Senior Manager Digital Transformation - Jens Lambrecht",
             """Dear Mr./Ms. [Name],

I wanted to briefly follow up to see if you have had a chance to review my application.

I remain very interested in the position and your company, and I am convinced that my experience in [relevant skill] would allow me to make a valuable contribution.

If you require any further information, please do not hesitate to contact me.

Best regards,
Jens Lambrecht""", "en", "followup"),

            ("Thank You Note (after Interview)", "Thank you for the conversation",
             """Dear Mr./Ms. [Name],

Thank you very much for the pleasant and inspiring conversation today.

Our exchange has further strengthened my interest in the position and in [Company]. I was particularly impressed by [aspect from the conversation].

I am convinced that with my expertise in [Skill], I can make a meaningful contribution to your team.

Best regards,
Jens Lambrecht""", "en", "thankyou"),

            # Deutsch
            ("Erstbewerbung", "Bewerbung als [Position] – Jens Lambrecht",
             """Sehr geehrte Damen und Herren,

mit großem Interesse habe ich Ihre Stellenausschreibung als [Position] bei [Unternehmen] gelesen.

Als TÜV-zertifizierter AI-Consultant mit über 20 Jahren Erfahrung in IT, Cloud und digitaler Transformation bringe ich genau die strategische und operative Kompetenz mit, die Sie für diese Rolle suchen.

Bei Fujitsu habe ich als Senior Manager erfolgreich Hybrid IT & Cloud Portfolios aufgebaut und KI-Innovationsprojekte mit Budgets von 4 Mio. € gesteuert. Meine Kernkompetenzen in [relevanter Bereich] decken sich hervorragend mit Ihrem Anforderungsprofil.

Gerne erläutere ich Ihnen in einem persönlichen Gespräch, wie ich konkrete Mehrwerte für [Unternehmen] schaffen kann.

Mit freundlichen Grüßen,
Jens Lambrecht""", "de", "initial"),

            ("Nachfassen (1 Woche)", "Re: Bewerbung als [Position] – Jens Lambrecht",
             """Sehr geehrte/r Frau/Herr [Name],

ich möchte mich kurz nach dem Stand meiner Bewerbung erkundigen.

Mein Interesse an der Position und Ihrem Unternehmen ist weiterhin sehr groß. Ich bin überzeugt, dass meine Erfahrung in [relevanter Bereich] einen wertvollen Beitrag leisten kann.

Für Rückfragen stehe ich Ihnen jederzeit gerne zur Verfügung.

Mit freundlichen Grüßen,
Jens Lambrecht""", "de", "followup"),

            # Español
            ("Candidatura inicial", "Candidatura como [Posición] – Jens Lambrecht",
             """Estimado/a Sr./Sra.,

Le escribo con gran interés respecto a la posición de [Posición] en [Empresa].

Con más de 20 años de experiencia como Senior Manager en Fujitsu, una certificación TÜV como "AI Manager" y un dominio fluido del español (C1), estoy convencido de ser el candidato ideal para su equipo en España.

A partir de septiembre de 2026, trasladaré mi residencia a Sevilla – no para una estancia temporal, sino para vivir y trabajar allí a largo plazo. No solo aporto experiencia técnica, sino también una comprensión profunda de la cultura española y el mercado español.

Quedo a su disposición para conversar sobre cómo puedo contribuir al éxito de su empresa.

Atentamente,
Jens Lambrecht""", "es", "initial"),

            ("Seguimiento (1 semana)", "Re: Candidatura como [Posición] – Jens Lambrecht",
             """Estimado/a Sr./Sra. [Nombre],

Me permito hacer un breve seguimiento de mi candidatura.

Sigo muy interesado en la posición y en su empresa, y estoy convencido de que mi experiencia en [área relevante] me permitiría hacer una valiosa contribución.

Quedo a su disposición para cualquier consulta.

Atentamente,
Jens Lambrecht""", "es", "followup"),
        ]
        for name, subject, body, lang, category in templates:
            conn.execute(
                "INSERT INTO email_templates (name, subject, body, language, category, created_at) VALUES (?,?,?,?,?,?)",
                (name, subject, body, lang, category, now))

    conn.commit()
    conn.close()


if __name__ == "__main__":
    seed()
    print("Datenbank erfolgreich befüllt!")
