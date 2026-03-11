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
            email TEXT NOT NULL,
            phone TEXT,
            address TEXT,
            resume_text TEXT,
            updated_at TEXT
        );

        CREATE TABLE IF NOT EXISTS applications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            company TEXT NOT NULL,
            position TEXT NOT NULL,
            job_description TEXT,
            contact_email TEXT,
            cover_letter TEXT,
            status TEXT NOT NULL DEFAULT 'entwurf',
            notes TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
    """)
    conn.commit()
    conn.close()


# --- Profile ---

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
            "UPDATE profile SET full_name=?, email=?, phone=?, address=?, resume_text=?, updated_at=? WHERE id=1",
            (data["full_name"], data["email"], data.get("phone", ""),
             data.get("address", ""), data.get("resume_text", ""), now),
        )
    else:
        conn.execute(
            "INSERT INTO profile (id, full_name, email, phone, address, resume_text, updated_at) VALUES (1,?,?,?,?,?,?)",
            (data["full_name"], data["email"], data.get("phone", ""),
             data.get("address", ""), data.get("resume_text", ""), now),
        )
    conn.commit()
    conn.close()


# --- Applications ---

def list_applications():
    conn = get_db()
    rows = conn.execute("SELECT * FROM applications ORDER BY updated_at DESC").fetchall()
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
        "INSERT INTO applications (company, position, job_description, contact_email, cover_letter, status, notes, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)",
        (data["company"], data["position"], data.get("job_description", ""),
         data.get("contact_email", ""), data.get("cover_letter", ""),
         data.get("status", "entwurf"), data.get("notes", ""), now, now),
    )
    conn.commit()
    app_id = cur.lastrowid
    conn.close()
    return app_id


def update_application(app_id, data):
    conn = get_db()
    now = datetime.now().isoformat()
    fields = []
    values = []
    for key in ("company", "position", "job_description", "contact_email", "cover_letter", "status", "notes"):
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
