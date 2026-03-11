import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

import anthropic
from dotenv import load_dotenv
from flask import Flask, render_template, request, redirect, url_for, flash, jsonify

import models

load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY", "dev-secret-key")


# ---------- helpers ----------

def generate_cover_letter(profile, job):
    """Generate a cover letter using Claude API."""
    client = anthropic.Anthropic()
    prompt = f"""Du bist ein professioneller Bewerbungsberater. Erstelle ein überzeugendes,
individuelles Anschreiben auf Deutsch für folgende Bewerbung.

**Bewerber:**
Name: {profile['full_name']}
E-Mail: {profile['email']}
Telefon: {profile.get('phone', '')}
Adresse: {profile.get('address', '')}
Lebenslauf / Qualifikationen:
{profile.get('resume_text', 'Nicht angegeben')}

**Stelle:**
Unternehmen: {job['company']}
Position: {job['position']}
Stellenbeschreibung:
{job.get('job_description', 'Nicht angegeben')}

Schreibe ein professionelles Anschreiben im deutschen Briefformat.
Beziehe dich konkret auf die Stellenbeschreibung und hebe relevante Qualifikationen hervor.
Gib NUR das Anschreiben aus, ohne zusätzliche Erklärungen."""

    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=2048,
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text


def send_application_email(profile, application):
    """Send the application via SMTP email."""
    smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USERNAME", "")
    smtp_pass = os.getenv("SMTP_PASSWORD", "")

    if not smtp_user or not smtp_pass:
        raise ValueError("SMTP-Zugangsdaten nicht konfiguriert. Bitte .env-Datei prüfen.")

    msg = MIMEMultipart()
    msg["From"] = smtp_user
    msg["To"] = application["contact_email"]
    msg["Subject"] = f"Bewerbung als {application['position']} – {profile['full_name']}"

    body = application.get("cover_letter", "")
    msg.attach(MIMEText(body, "plain", "utf-8"))

    with smtplib.SMTP(smtp_server, smtp_port) as server:
        server.starttls()
        server.login(smtp_user, smtp_pass)
        server.send_message(msg)


# ---------- routes ----------

STATUS_OPTIONS = [
    ("entwurf", "Entwurf"),
    ("gesendet", "Gesendet"),
    ("einladung", "Einladung"),
    ("vorstellungsgespraech", "Vorstellungsgespräch"),
    ("angebot", "Angebot"),
    ("absage", "Absage"),
    ("zurueckgezogen", "Zurückgezogen"),
]


@app.route("/")
def index():
    apps = models.list_applications()
    return render_template("index.html", applications=apps, status_options=STATUS_OPTIONS)


@app.route("/profile", methods=["GET", "POST"])
def profile():
    if request.method == "POST":
        models.save_profile({
            "full_name": request.form["full_name"],
            "email": request.form["email"],
            "phone": request.form.get("phone", ""),
            "address": request.form.get("address", ""),
            "resume_text": request.form.get("resume_text", ""),
        })
        flash("Profil gespeichert.", "success")
        return redirect(url_for("profile"))
    p = models.get_profile()
    return render_template("profile.html", profile=p)


@app.route("/applications/new", methods=["GET", "POST"])
def new_application():
    if request.method == "POST":
        app_id = models.create_application({
            "company": request.form["company"],
            "position": request.form["position"],
            "job_description": request.form.get("job_description", ""),
            "contact_email": request.form.get("contact_email", ""),
            "notes": request.form.get("notes", ""),
        })
        flash("Bewerbung erstellt.", "success")
        return redirect(url_for("edit_application", app_id=app_id))
    return render_template("application_form.html", app=None, status_options=STATUS_OPTIONS)


@app.route("/applications/<int:app_id>", methods=["GET", "POST"])
def edit_application(app_id):
    application = models.get_application(app_id)
    if not application:
        flash("Bewerbung nicht gefunden.", "error")
        return redirect(url_for("index"))
    if request.method == "POST":
        models.update_application(app_id, {
            "company": request.form["company"],
            "position": request.form["position"],
            "job_description": request.form.get("job_description", ""),
            "contact_email": request.form.get("contact_email", ""),
            "cover_letter": request.form.get("cover_letter", ""),
            "status": request.form.get("status", "entwurf"),
            "notes": request.form.get("notes", ""),
        })
        flash("Bewerbung aktualisiert.", "success")
        return redirect(url_for("edit_application", app_id=app_id))
    return render_template("application_form.html", app=application, status_options=STATUS_OPTIONS)


@app.route("/applications/<int:app_id>/delete", methods=["POST"])
def delete_application(app_id):
    models.delete_application(app_id)
    flash("Bewerbung gelöscht.", "success")
    return redirect(url_for("index"))


@app.route("/applications/<int:app_id>/generate", methods=["POST"])
def generate(app_id):
    p = models.get_profile()
    if not p:
        return jsonify({"error": "Bitte zuerst ein Profil anlegen."}), 400
    application = models.get_application(app_id)
    if not application:
        return jsonify({"error": "Bewerbung nicht gefunden."}), 404
    try:
        letter = generate_cover_letter(p, application)
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
        return redirect(url_for("index"))
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


if __name__ == "__main__":
    models.init_db()
    app.run(debug=True, port=5000)
