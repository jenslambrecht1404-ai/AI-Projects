import json
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

import anthropic
from dotenv import load_dotenv
from flask import Flask, render_template, request, redirect, url_for, flash, jsonify

import models
import seed_data

load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY", "dev-secret-key")

STATUS_OPTIONS = [
    ("entwurf", "Entwurf"),
    ("gesendet", "Gesendet"),
    ("einladung", "Einladung"),
    ("vorstellungsgespraech", "Vorstellungsgespräch"),
    ("angebot", "Angebot"),
    ("absage", "Absage"),
    ("zurueckgezogen", "Zurückgezogen"),
]

COMPANY_STATUS_OPTIONS = [
    ("recherche", "Recherche"),
    ("kontaktiert", "Kontaktiert"),
    ("beworben", "Beworben"),
    ("interview", "Interview"),
    ("angebot", "Angebot"),
    ("absage", "Absage"),
]

STRATEGY_OPTIONS = [
    ("de_remote", "Deutschland (Remote)"),
    ("es_lokal", "Spanien (Lokal)"),
]

PRIORITY_OPTIONS = [
    ("top", "Top"),
    ("hoch", "Hoch"),
    ("normal", "Normal"),
]

LANGUAGE_OPTIONS = [
    ("de", "Deutsch"),
    ("en", "English"),
    ("es", "Español"),
]

TONALITY_OPTIONS = [
    ("formal", "Formal"),
    ("modern", "Modern"),
    ("kreativ", "Kreativ"),
]


# ---------- KI-Generator ----------

def generate_cover_letter(profile, job, language="de", tonality="formal", strategy="de_remote"):
    """Generate a personalized cover letter using Claude API."""
    client = anthropic.Anthropic()

    strategy_context = ""
    if strategy == "de_remote":
        strategy_context = (
            "STRATEGIE-KONTEXT: Bewerbung auf eine Remote-Position in Deutschland. "
            "Fokus auf Expertise in KI, Cloud und Transformation. "
            "Den Umzugswunsch nach Sevilla NICHT erwähnen – erst im späteren Bewerbungsprozess thematisieren."
        )
    elif strategy == "es_lokal":
        strategy_context = (
            "STRATEGIE-KONTEXT: Bewerbung auf eine lokale Position in Spanien (Sevilla/Madrid). "
            "Klar kommunizieren: Umzug nach Sevilla ab September 2026 geplant – langfristige Absicht, "
            "kein temporärer Aufenthalt. Kulturelle Brückenfunktion (Deutsch/Spanisch) hervorheben. "
            "Betonung: 'Lebensmittelpunkt verlegen'."
        )

    lang_instruction = {
        "de": "Schreibe das Anschreiben auf Deutsch im deutschen Briefformat.",
        "en": "Write the cover letter in English in a professional format.",
        "es": "Escribe la carta de presentación en español en un formato profesional.",
    }.get(language, "Schreibe das Anschreiben auf Deutsch.")

    tone_instruction = {
        "formal": "Ton: Professionell und formal.",
        "modern": "Ton: Modern und dynamisch, aber professionell.",
        "kreativ": "Ton: Kreativ und persönlich, zeige Persönlichkeit.",
    }.get(tonality, "Ton: Professionell und formal.")

    prompt = f"""Du bist ein erstklassiger Bewerbungsberater. Erstelle ein überzeugendes,
individuelles Anschreiben für folgende Bewerbung.

{strategy_context}

**Bewerber-Profil:**
Name: {profile['full_name']}
Titel: {profile.get('title', '')}
Standort: {profile.get('address', '')}
Verfügbar ab: {profile.get('available_from', '')}

Zusammenfassung: {profile.get('summary', '')}

Vollständiger Lebenslauf:
{profile.get('resume_text', 'Nicht angegeben')}

**Stelle:**
Unternehmen: {job.get('company_name', job.get('company', ''))}
Position: {job['position']}
Stellenbeschreibung:
{job.get('job_description', 'Nicht angegeben')}

{lang_instruction}
{tone_instruction}

Beziehe dich KONKRET auf die Stellenbeschreibung und hebe die relevantesten Qualifikationen hervor.
Gib NUR das Anschreiben aus, ohne zusätzliche Erklärungen oder Kommentare."""

    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=2048,
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text


def generate_interview_questions(profile, company_name, position, job_description=""):
    """Generate interview prep questions using Claude API."""
    client = anthropic.Anthropic()

    prompt = f"""Du bist ein erfahrener Interview-Coach. Erstelle eine Interview-Vorbereitung
für folgendes Vorstellungsgespräch.

**Bewerber:** {profile['full_name']} – {profile.get('title', '')}
**Erfahrung:** {profile.get('summary', '')}
**Unternehmen:** {company_name}
**Position:** {position}
**Stellenbeschreibung:** {job_description if job_description else 'Nicht verfügbar'}

Erstelle genau 8 wahrscheinliche Interview-Fragen mit jeweils einem Antwortvorschlag.
Mische: 2 fachliche Fragen, 2 Verhaltensfragen (STAR-Methode), 2 Fragen zur Motivation,
2 unternehmensspezifische Fragen.

Antwort als JSON-Array:
[{{"question": "...", "category": "fachlich|verhalten|motivation|unternehmen", "suggested_answer": "..."}}]

Gib NUR das JSON aus, keine Erklärungen."""

    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4096,
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text


def send_application_email(profile, application, template=None):
    """Send application via SMTP email."""
    smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USERNAME", "")
    smtp_pass = os.getenv("SMTP_PASSWORD", "")

    if not smtp_user or not smtp_pass:
        raise ValueError("SMTP-Zugangsdaten nicht konfiguriert. Bitte .env-Datei prüfen.")

    msg = MIMEMultipart()
    msg["From"] = smtp_user
    msg["To"] = application["contact_email"]

    if template:
        msg["Subject"] = template["subject"].replace("[Position]", application["position"])
    else:
        msg["Subject"] = f"Bewerbung als {application['position']} – {profile['full_name']}"

    body = application.get("cover_letter", "")
    msg.attach(MIMEText(body, "plain", "utf-8"))

    with smtplib.SMTP(smtp_server, smtp_port) as server:
        server.starttls()
        server.login(smtp_user, smtp_pass)
        server.send_message(msg)


# ---------- Routes: Dashboard ----------

@app.route("/")
def index():
    stats = models.get_application_stats()
    apps = models.list_applications()
    companies = models.list_target_companies()
    return render_template("index.html", stats=stats, applications=apps,
                           companies=companies, status_options=STATUS_OPTIONS)


# ---------- Routes: Profile ----------

@app.route("/profile", methods=["GET", "POST"])
def profile():
    if request.method == "POST":
        models.save_profile({
            "full_name": request.form["full_name"],
            "email": request.form.get("email", ""),
            "phone": request.form.get("phone", ""),
            "address": request.form.get("address", ""),
            "title": request.form.get("title", ""),
            "summary": request.form.get("summary", ""),
            "resume_text": request.form.get("resume_text", ""),
            "target_location": request.form.get("target_location", ""),
            "available_from": request.form.get("available_from", ""),
        })
        flash("Profil gespeichert.", "success")
        return redirect(url_for("profile"))
    p = models.get_profile()
    experience = models.get_experience()
    skills = models.get_skills()
    certs = models.get_certifications()
    edu = models.get_education()
    return render_template("profile.html", profile=p, experience=experience,
                           skills=skills, certifications=certs, education=edu)


# ---------- Routes: Target Companies ----------

@app.route("/companies")
def companies():
    strategy = request.args.get("strategy")
    country = request.args.get("country")
    all_companies = models.list_target_companies(strategy=strategy, country=country)
    return render_template("companies.html", companies=all_companies,
                           strategy_options=STRATEGY_OPTIONS, priority_options=PRIORITY_OPTIONS,
                           company_status_options=COMPANY_STATUS_OPTIONS,
                           current_strategy=strategy, current_country=country)


@app.route("/companies/new", methods=["GET", "POST"])
def new_company():
    if request.method == "POST":
        cid = models.create_target_company({
            "name": request.form["name"],
            "city": request.form.get("city", ""),
            "country": request.form.get("country", "Deutschland"),
            "strategy": request.form.get("strategy", "de_remote"),
            "industry": request.form.get("industry", ""),
            "priority": request.form.get("priority", "normal"),
            "notes": request.form.get("notes", ""),
            "career_url": request.form.get("career_url", ""),
            "hr_contact_email": request.form.get("hr_contact_email", ""),
        })
        flash("Zielunternehmen hinzugefügt.", "success")
        return redirect(url_for("companies"))
    return render_template("company_form.html", company=None,
                           strategy_options=STRATEGY_OPTIONS, priority_options=PRIORITY_OPTIONS,
                           company_status_options=COMPANY_STATUS_OPTIONS)


@app.route("/companies/<int:cid>", methods=["GET", "POST"])
def edit_company(cid):
    company = models.get_target_company(cid)
    if not company:
        flash("Unternehmen nicht gefunden.", "error")
        return redirect(url_for("companies"))
    if request.method == "POST":
        models.update_target_company(cid, {
            "name": request.form["name"],
            "city": request.form.get("city", ""),
            "country": request.form.get("country", "Deutschland"),
            "strategy": request.form.get("strategy", "de_remote"),
            "industry": request.form.get("industry", ""),
            "priority": request.form.get("priority", "normal"),
            "notes": request.form.get("notes", ""),
            "career_url": request.form.get("career_url", ""),
            "hr_contact_email": request.form.get("hr_contact_email", ""),
            "status": request.form.get("status", "recherche"),
        })
        flash("Unternehmen aktualisiert.", "success")
        return redirect(url_for("edit_company", cid=cid))
    return render_template("company_form.html", company=company,
                           strategy_options=STRATEGY_OPTIONS, priority_options=PRIORITY_OPTIONS,
                           company_status_options=COMPANY_STATUS_OPTIONS)


@app.route("/companies/<int:cid>/delete", methods=["POST"])
def delete_company(cid):
    models.delete_target_company(cid)
    flash("Unternehmen gelöscht.", "success")
    return redirect(url_for("companies"))


# ---------- Routes: Applications ----------

@app.route("/applications")
def applications_list():
    status = request.args.get("status")
    apps = models.list_applications(status=status)
    return render_template("applications.html", applications=apps,
                           status_options=STATUS_OPTIONS, current_status=status)


@app.route("/applications/new", methods=["GET", "POST"])
def new_application():
    if request.method == "POST":
        app_id = models.create_application({
            "company_name": request.form["company_name"],
            "position": request.form["position"],
            "job_description": request.form.get("job_description", ""),
            "contact_email": request.form.get("contact_email", ""),
            "language": request.form.get("language", "de"),
            "tonality": request.form.get("tonality", "formal"),
            "strategy": request.form.get("strategy", "de_remote"),
            "notes": request.form.get("notes", ""),
        })
        flash("Bewerbung erstellt.", "success")
        return redirect(url_for("edit_application", app_id=app_id))
    companies = models.list_target_companies()
    return render_template("application_form.html", app=None, companies=companies,
                           status_options=STATUS_OPTIONS, strategy_options=STRATEGY_OPTIONS,
                           language_options=LANGUAGE_OPTIONS, tonality_options=TONALITY_OPTIONS)


@app.route("/applications/<int:app_id>", methods=["GET", "POST"])
def edit_application(app_id):
    application = models.get_application(app_id)
    if not application:
        flash("Bewerbung nicht gefunden.", "error")
        return redirect(url_for("applications_list"))
    if request.method == "POST":
        models.update_application(app_id, {
            "company_name": request.form["company_name"],
            "position": request.form["position"],
            "job_description": request.form.get("job_description", ""),
            "contact_email": request.form.get("contact_email", ""),
            "cover_letter": request.form.get("cover_letter", ""),
            "language": request.form.get("language", "de"),
            "tonality": request.form.get("tonality", "formal"),
            "strategy": request.form.get("strategy", "de_remote"),
            "status": request.form.get("status", "entwurf"),
            "notes": request.form.get("notes", ""),
        })
        flash("Bewerbung aktualisiert.", "success")
        return redirect(url_for("edit_application", app_id=app_id))
    companies = models.list_target_companies()
    return render_template("application_form.html", app=application, companies=companies,
                           status_options=STATUS_OPTIONS, strategy_options=STRATEGY_OPTIONS,
                           language_options=LANGUAGE_OPTIONS, tonality_options=TONALITY_OPTIONS)


@app.route("/applications/<int:app_id>/delete", methods=["POST"])
def delete_application(app_id):
    models.delete_application(app_id)
    flash("Bewerbung gelöscht.", "success")
    return redirect(url_for("applications_list"))


@app.route("/applications/<int:app_id>/generate", methods=["POST"])
def generate(app_id):
    p = models.get_profile()
    if not p:
        return jsonify({"error": "Bitte zuerst ein Profil anlegen."}), 400
    application = models.get_application(app_id)
    if not application:
        return jsonify({"error": "Bewerbung nicht gefunden."}), 404
    try:
        letter = generate_cover_letter(
            p, application,
            language=application.get("language", "de"),
            tonality=application.get("tonality", "formal"),
            strategy=application.get("strategy", "de_remote"),
        )
        models.update_application(app_id, {"cover_letter": letter})
        return jsonify({"cover_letter": letter})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/applications/<int:app_id>/send", methods=["POST"])
def send_email(app_id):
    p = models.get_profile()
    if not p:
        flash("Bitte zuerst ein Profil anlegen.", "error")
        return redirect(url_for("edit_application", app_id=app_id))
    application = models.get_application(app_id)
    if not application:
        flash("Bewerbung nicht gefunden.", "error")
        return redirect(url_for("applications_list"))
    if not application.get("contact_email"):
        flash("Keine Kontakt-E-Mail angegeben.", "error")
        return redirect(url_for("edit_application", app_id=app_id))
    try:
        send_application_email(p, application)
        models.update_application(app_id, {"status": "gesendet"})
        flash("Bewerbung erfolgreich versendet!", "success")
    except Exception as e:
        flash(f"Fehler beim Versenden: {e}", "error")
    return redirect(url_for("edit_application", app_id=app_id))


# ---------- Routes: KI-Generator (standalone) ----------

@app.route("/generator", methods=["GET", "POST"])
def ki_generator():
    result = None
    if request.method == "POST":
        p = models.get_profile()
        if not p:
            flash("Bitte zuerst ein Profil anlegen.", "error")
            return redirect(url_for("ki_generator"))
        job = {
            "company_name": request.form.get("company", ""),
            "position": request.form.get("position", ""),
            "job_description": request.form["job_description"],
        }
        language = request.form.get("language", "de")
        tonality = request.form.get("tonality", "formal")
        strategy = request.form.get("strategy", "de_remote")
        try:
            result = generate_cover_letter(p, job, language, tonality, strategy)
        except Exception as e:
            flash(f"Fehler bei der Generierung: {e}", "error")
    return render_template("generator.html", result=result,
                           language_options=LANGUAGE_OPTIONS,
                           tonality_options=TONALITY_OPTIONS,
                           strategy_options=STRATEGY_OPTIONS)


# ---------- Routes: Email Templates ----------

@app.route("/templates")
def email_templates():
    lang = request.args.get("language")
    templates = models.list_email_templates(language=lang)
    return render_template("email_templates.html", templates=templates,
                           language_options=LANGUAGE_OPTIONS, current_language=lang)


# ---------- Routes: Interview Prep ----------

@app.route("/interview")
def interview_list():
    sessions = models.list_interview_sessions()
    return render_template("interview.html", sessions=sessions)


@app.route("/interview/new", methods=["GET", "POST"])
def new_interview():
    if request.method == "POST":
        p = models.get_profile()
        if not p:
            flash("Bitte zuerst ein Profil anlegen.", "error")
            return redirect(url_for("interview_list"))
        company_name = request.form["company_name"]
        position = request.form["position"]
        job_description = request.form.get("job_description", "")
        try:
            questions_json = generate_interview_questions(p, company_name, position, job_description)
            sid = models.create_interview_session({
                "company_name": company_name,
                "position": position,
                "questions_json": questions_json,
            })
            flash("Interview-Vorbereitung erstellt!", "success")
            return redirect(url_for("view_interview", session_id=sid))
        except Exception as e:
            flash(f"Fehler: {e}", "error")
    return render_template("interview_form.html")


@app.route("/interview/<int:session_id>")
def view_interview(session_id):
    session = models.get_interview_session(session_id)
    if not session:
        flash("Session nicht gefunden.", "error")
        return redirect(url_for("interview_list"))
    questions = []
    if session.get("questions_json"):
        try:
            raw = session["questions_json"].strip()
            if raw.startswith("```"):
                raw = raw.split("\n", 1)[1] if "\n" in raw else raw[3:]
                raw = raw.rsplit("```", 1)[0]
            questions = json.loads(raw)
        except (json.JSONDecodeError, IndexError):
            questions = []
    return render_template("interview_detail.html", session=session, questions=questions)


# ---------- Routes: Analytics ----------

@app.route("/analytics")
def analytics():
    stats = models.get_application_stats()
    apps = models.list_applications()
    companies = models.list_target_companies()

    # Strategy breakdown
    de_count = len([c for c in companies if c["strategy"] == "de_remote"])
    es_count = len([c for c in companies if c["strategy"] == "es_lokal"])

    # Status breakdown
    status_counts = {}
    for a in apps:
        s = a["status"]
        status_counts[s] = status_counts.get(s, 0) + 1

    return render_template("analytics.html", stats=stats, applications=apps,
                           companies=companies, de_count=de_count, es_count=es_count,
                           status_counts=status_counts, status_options=STATUS_OPTIONS)


# ---------- Routes: Strategy ----------

@app.route("/strategy")
def strategy():
    return render_template("strategy.html")


if __name__ == "__main__":
    models.init_db()
    seed_data.seed()
    app.run(debug=True, port=5000)
