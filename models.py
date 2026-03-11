import sqlite3
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "applications.db")


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS profile (
            id INTEGER PRIMARY KEY,
            full_name TEXT NOT NULL,
            email TEXT,
            phone TEXT,
            address TEXT,
            title TEXT,
            summary TEXT,
            resume_text TEXT,
            target_location TEXT,
            available_from TEXT,
            updated_at TEXT
        );

        CREATE TABLE IF NOT EXISTS experience (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            profile_id INTEGER DEFAULT 1,
            job_title TEXT NOT NULL,
            company TEXT NOT NULL,
            start_date TEXT,
            end_date TEXT,
            description TEXT,
            sort_order INTEGER DEFAULT 0,
            FOREIGN KEY (profile_id) REFERENCES profile(id)
        );

        CREATE TABLE IF NOT EXISTS skills (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            profile_id INTEGER DEFAULT 1,
            category TEXT NOT NULL,
            name TEXT NOT NULL,
            level TEXT,
            FOREIGN KEY (profile_id) REFERENCES profile(id)
        );

        CREATE TABLE IF NOT EXISTS certifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            profile_id INTEGER DEFAULT 1,
            name TEXT NOT NULL,
            issuer TEXT,
            date TEXT,
            description TEXT,
            FOREIGN KEY (profile_id) REFERENCES profile(id)
        );

        CREATE TABLE IF NOT EXISTS education (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            profile_id INTEGER DEFAULT 1,
            degree TEXT NOT NULL,
            institution TEXT,
            period TEXT,
            focus TEXT,
            details TEXT,
            FOREIGN KEY (profile_id) REFERENCES profile(id)
        );

        CREATE TABLE IF NOT EXISTS target_companies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            city TEXT,
            country TEXT NOT NULL DEFAULT 'Deutschland',
            strategy TEXT NOT NULL DEFAULT 'de_remote',
            industry TEXT,
            priority TEXT DEFAULT 'normal',
            notes TEXT,
            career_url TEXT,
            hr_contact_email TEXT,
            status TEXT NOT NULL DEFAULT 'recherche',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS applications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            company_id INTEGER,
            company_name TEXT NOT NULL,
            position TEXT NOT NULL,
            job_description TEXT,
            contact_email TEXT,
            cover_letter TEXT,
            language TEXT DEFAULT 'de',
            tonality TEXT DEFAULT 'formal',
            strategy TEXT DEFAULT 'de_remote',
            status TEXT NOT NULL DEFAULT 'entwurf',
            notes TEXT,
            interview_date TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (company_id) REFERENCES target_companies(id)
        );

        CREATE TABLE IF NOT EXISTS email_templates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            subject TEXT NOT NULL,
            body TEXT NOT NULL,
            language TEXT NOT NULL DEFAULT 'de',
            category TEXT NOT NULL DEFAULT 'initial',
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS interview_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            application_id INTEGER,
            company_name TEXT NOT NULL,
            position TEXT NOT NULL,
            questions_json TEXT,
            notes TEXT,
            session_date TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (application_id) REFERENCES applications(id)
        );
    """)
    conn.commit()
    conn.close()


# ---------- Profile ----------

def get_profile():
    conn = get_db()
    row = conn.execute("SELECT * FROM profile WHERE id = 1").fetchone()
    conn.close()
    return dict(row) if row else None


def save_profile(data):
    conn = get_db()
    existing = conn.execute("SELECT id FROM profile WHERE id = 1").fetchone()
    now = datetime.now().isoformat()
    if existing:
        conn.execute(
            """UPDATE profile SET full_name=?, email=?, phone=?, address=?, title=?,
               summary=?, resume_text=?, target_location=?, available_from=?, updated_at=?
               WHERE id=1""",
            (data["full_name"], data.get("email", ""), data.get("phone", ""),
             data.get("address", ""), data.get("title", ""), data.get("summary", ""),
             data.get("resume_text", ""), data.get("target_location", ""),
             data.get("available_from", ""), now),
        )
    else:
        conn.execute(
            """INSERT INTO profile (id, full_name, email, phone, address, title,
               summary, resume_text, target_location, available_from, updated_at)
               VALUES (1,?,?,?,?,?,?,?,?,?,?)""",
            (data["full_name"], data.get("email", ""), data.get("phone", ""),
             data.get("address", ""), data.get("title", ""), data.get("summary", ""),
             data.get("resume_text", ""), data.get("target_location", ""),
             data.get("available_from", ""), now),
        )
    conn.commit()
    conn.close()


def get_experience():
    conn = get_db()
    rows = conn.execute("SELECT * FROM experience WHERE profile_id=1 ORDER BY sort_order").fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_skills():
    conn = get_db()
    rows = conn.execute("SELECT * FROM skills WHERE profile_id=1 ORDER BY category, name").fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_certifications():
    conn = get_db()
    rows = conn.execute("SELECT * FROM certifications WHERE profile_id=1 ORDER BY date DESC").fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_education():
    conn = get_db()
    rows = conn.execute("SELECT * FROM education WHERE profile_id=1").fetchall()
    conn.close()
    return [dict(r) for r in rows]


# ---------- Target Companies ----------

def list_target_companies(strategy=None, country=None):
    conn = get_db()
    query = "SELECT * FROM target_companies WHERE 1=1"
    params = []
    if strategy:
        query += " AND strategy = ?"
        params.append(strategy)
    if country:
        query += " AND country = ?"
        params.append(country)
    query += " ORDER BY CASE priority WHEN 'top' THEN 0 WHEN 'hoch' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END, name"
    rows = conn.execute(query, params).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_target_company(company_id):
    conn = get_db()
    row = conn.execute("SELECT * FROM target_companies WHERE id = ?", (company_id,)).fetchone()
    conn.close()
    return dict(row) if row else None


def create_target_company(data):
    conn = get_db()
    now = datetime.now().isoformat()
    cur = conn.execute(
        """INSERT INTO target_companies (name, city, country, strategy, industry, priority,
           notes, career_url, hr_contact_email, status, created_at, updated_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
        (data["name"], data.get("city", ""), data.get("country", "Deutschland"),
         data.get("strategy", "de_remote"), data.get("industry", ""),
         data.get("priority", "normal"), data.get("notes", ""),
         data.get("career_url", ""), data.get("hr_contact_email", ""),
         data.get("status", "recherche"), now, now),
    )
    conn.commit()
    cid = cur.lastrowid
    conn.close()
    return cid


def update_target_company(company_id, data):
    conn = get_db()
    now = datetime.now().isoformat()
    fields, values = [], []
    for key in ("name", "city", "country", "strategy", "industry", "priority",
                "notes", "career_url", "hr_contact_email", "status"):
        if key in data:
            fields.append(f"{key} = ?")
            values.append(data[key])
    fields.append("updated_at = ?")
    values.append(now)
    values.append(company_id)
    conn.execute(f"UPDATE target_companies SET {', '.join(fields)} WHERE id = ?", values)
    conn.commit()
    conn.close()


def delete_target_company(company_id):
    conn = get_db()
    conn.execute("DELETE FROM target_companies WHERE id = ?", (company_id,))
    conn.commit()
    conn.close()


# ---------- Applications ----------

def list_applications(status=None):
    conn = get_db()
    query = "SELECT * FROM applications"
    params = []
    if status:
        query += " WHERE status = ?"
        params.append(status)
    query += " ORDER BY updated_at DESC"
    rows = conn.execute(query, params).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_application(app_id):
    conn = get_db()
    row = conn.execute("SELECT * FROM applications WHERE id = ?", (app_id,)).fetchone()
    conn.close()
    return dict(row) if row else None


def create_application(data):
    conn = get_db()
    now = datetime.now().isoformat()
    cur = conn.execute(
        """INSERT INTO applications (company_id, company_name, position, job_description,
           contact_email, cover_letter, language, tonality, strategy, status, notes,
           created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        (data.get("company_id"), data["company_name"], data["position"],
         data.get("job_description", ""), data.get("contact_email", ""),
         data.get("cover_letter", ""), data.get("language", "de"),
         data.get("tonality", "formal"), data.get("strategy", "de_remote"),
         data.get("status", "entwurf"), data.get("notes", ""), now, now),
    )
    conn.commit()
    app_id = cur.lastrowid
    conn.close()
    return app_id


def update_application(app_id, data):
    conn = get_db()
    now = datetime.now().isoformat()
    fields, values = [], []
    for key in ("company_name", "position", "job_description", "contact_email",
                "cover_letter", "language", "tonality", "strategy", "status",
                "notes", "interview_date"):
        if key in data:
            fields.append(f"{key} = ?")
            values.append(data[key])
    fields.append("updated_at = ?")
    values.append(now)
    values.append(app_id)
    conn.execute(f"UPDATE applications SET {', '.join(fields)} WHERE id = ?", values)
    conn.commit()
    conn.close()


def delete_application(app_id):
    conn = get_db()
    conn.execute("DELETE FROM applications WHERE id = ?", (app_id,))
    conn.commit()
    conn.close()


def get_application_stats():
    conn = get_db()
    total = conn.execute("SELECT COUNT(*) FROM applications").fetchone()[0]
    sent = conn.execute("SELECT COUNT(*) FROM applications WHERE status='gesendet'").fetchone()[0]
    interview = conn.execute("SELECT COUNT(*) FROM applications WHERE status IN ('einladung','vorstellungsgespraech')").fetchone()[0]
    offers = conn.execute("SELECT COUNT(*) FROM applications WHERE status='angebot'").fetchone()[0]
    conn.close()
    return {"total": total, "sent": sent, "interview": interview, "offers": offers}


# ---------- Email Templates ----------

def list_email_templates(language=None):
    conn = get_db()
    if language:
        rows = conn.execute("SELECT * FROM email_templates WHERE language=? ORDER BY category", (language,)).fetchall()
    else:
        rows = conn.execute("SELECT * FROM email_templates ORDER BY language, category").fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_email_template(template_id):
    conn = get_db()
    row = conn.execute("SELECT * FROM email_templates WHERE id = ?", (template_id,)).fetchone()
    conn.close()
    return dict(row) if row else None


# ---------- Interview Sessions ----------

def list_interview_sessions():
    conn = get_db()
    rows = conn.execute("SELECT * FROM interview_sessions ORDER BY created_at DESC").fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_interview_session(session_id):
    conn = get_db()
    row = conn.execute("SELECT * FROM interview_sessions WHERE id = ?", (session_id,)).fetchone()
    conn.close()
    return dict(row) if row else None


def create_interview_session(data):
    conn = get_db()
    now = datetime.now().isoformat()
    cur = conn.execute(
        """INSERT INTO interview_sessions (application_id, company_name, position,
           questions_json, notes, session_date, created_at) VALUES (?,?,?,?,?,?,?)""",
        (data.get("application_id"), data["company_name"], data["position"],
         data.get("questions_json", ""), data.get("notes", ""),
         data.get("session_date", ""), now),
    )
    conn.commit()
    sid = cur.lastrowid
    conn.close()
    return sid


def update_interview_session(session_id, data):
    conn = get_db()
    fields, values = [], []
    for key in ("questions_json", "notes", "session_date"):
        if key in data:
            fields.append(f"{key} = ?")
            values.append(data[key])
    values.append(session_id)
    if fields:
        conn.execute(f"UPDATE interview_sessions SET {', '.join(fields)} WHERE id = ?", values)
        conn.commit()
    conn.close()
