"""SQLite persistence for demo assessments and patient histories (moved from ambulance_system/app.py)."""

import json
import os
import sqlite3

from ai.emergency_prediction_30 import generate_assessment
from config import Config
from services.patient_data import HISTORICAL_PATIENT_RECORDS, build_patient_history

DATABASE_PATH = Config.DATABASE_PATH


def get_db_connection():
    os.makedirs(os.path.dirname(DATABASE_PATH), exist_ok=True)
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    return connection


# ----------------------------
# Demo assessments
# ----------------------------
def init_demo_assessments_table():
    """Create a separate table for timestamped synthetic demo assessments."""
    with get_db_connection() as connection:
        connection.execute("""
            CREATE TABLE IF NOT EXISTS demo_assessments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                assessment_id TEXT UNIQUE NOT NULL,
                timestamp TEXT NOT NULL,
                assessment_json TEXT NOT NULL
            )
        """)
        connection.commit()


def save_demo_assessment(assessment):
    with get_db_connection() as connection:
        connection.execute("""
            INSERT INTO demo_assessments
                (assessment_id, timestamp, assessment_json)
            VALUES (?, ?, ?)
        """, (
            assessment["assessment_id"],
            assessment["timestamp"],
            json.dumps(assessment)
        ))
        connection.commit()


def get_latest_demo_assessment():
    with get_db_connection() as connection:
        row = connection.execute("""
            SELECT assessment_json
            FROM demo_assessments
            ORDER BY id DESC
            LIMIT 1
        """).fetchone()
    return json.loads(row["assessment_json"]) if row else None


def create_new_demo_assessment():
    assessment = generate_assessment()
    save_demo_assessment(assessment)
    return assessment


def get_or_create_latest_assessment():
    assessment = get_latest_demo_assessment()
    return assessment if assessment is not None else create_new_demo_assessment()


# ----------------------------
# Patient histories
# ----------------------------
def init_patient_database():
    os.makedirs(os.path.dirname(DATABASE_PATH), exist_ok=True)
    with get_db_connection() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS patient_histories (
                patient_id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                date TEXT NOT NULL,
                condition TEXT NOT NULL,
                status TEXT NOT NULL,
                accuracy INTEGER NOT NULL,
                response_time INTEGER NOT NULL,
                patient_summary_json TEXT NOT NULL,
                medications_json TEXT NOT NULL,
                vitals_json TEXT NOT NULL,
                event_log_json TEXT NOT NULL,
                visualization_json TEXT NOT NULL
            )
            """
        )

        existing_count = connection.execute("SELECT COUNT(*) AS count FROM patient_histories").fetchone()["count"]
        if existing_count == 0:
            for record in HISTORICAL_PATIENT_RECORDS:
                history = build_patient_history(record)
                connection.execute(
                    """
                    INSERT INTO patient_histories (
                        patient_id, name, date, condition, status, accuracy, response_time,
                        patient_summary_json, medications_json, vitals_json, event_log_json, visualization_json
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        history["patient_id"],
                        history["name"],
                        history["date"],
                        history["condition"],
                        history["status"],
                        history["prediction_accuracy"],
                        history["response_time"],
                        json.dumps(history["patient_summary"]),
                        json.dumps(history["medications"]),
                        json.dumps(history["vitals"]),
                        json.dumps(history["event_log"]),
                        json.dumps(history["chart_data"])
                    )
                )
        connection.commit()


def fetch_all_patient_records():
    with get_db_connection() as connection:
        rows = connection.execute(
            """
            SELECT patient_id, name, date, condition, accuracy, response_time, status
            FROM patient_histories
            ORDER BY date DESC
            """
        ).fetchall()
    return [dict(row) for row in rows]


def fetch_patient_history(patient_id):
    with get_db_connection() as connection:
        row = connection.execute(
            """
            SELECT patient_id, name, date, condition, status, accuracy, response_time,
                   patient_summary_json, medications_json, vitals_json, event_log_json, visualization_json
            FROM patient_histories
            WHERE patient_id = ?
            """,
            (patient_id,)
        ).fetchone()

    if not row:
        return None

    return {
        "patient_id": row["patient_id"],
        "name": row["name"],
        "date": row["date"],
        "condition": row["condition"],
        "status": row["status"],
        "prediction_accuracy": row["accuracy"],
        "response_time": row["response_time"],
        "patient_summary": json.loads(row["patient_summary_json"]),
        "medications": json.loads(row["medications_json"]),
        "vitals": json.loads(row["vitals_json"]),
        "event_log": json.loads(row["event_log_json"]),
        "chart_data": json.loads(row["visualization_json"])
    }


def init_databases():
    init_patient_database()
    init_demo_assessments_table()
