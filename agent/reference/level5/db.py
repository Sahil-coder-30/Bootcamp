"""
db.py
=====
psycopg2 writers for the Level-2 Supabase staging tables. After each insert we
read back the trigger's status (the THIRD validation gate).

`psycopg2` is imported lazily so the rest of the package (and the offline tests)
load even when the driver isn't installed.

Column lists below come from fixed, trusted constants (never user input), so the
f-string column interpolation is safe; all *values* are parameterized.
"""

import json

from . import config
from .columns import COLUMNS

SKILL_COLUMNS = [
    "companies", "coding", "data_structures_and_algorithms",
    "object_oriented_programming_and_design", "aptitude_and_problem_solving",
    "communication_skills", "ai_native_engineering", "devops_and_cloud",
    "sql_and_design", "software_engineering", "system_design_and_architecture",
    "computer_networking", "operating_system",
]


def _connect():
    import psycopg2  # lazy
    url = config.get_env("SUPABASE_DB_URL")
    return psycopg2.connect(url)


def resolve_company_id(name: str, explicit: int | None = None) -> int:
    if explicit is not None:
        return explicit
    with _connect() as conn, conn.cursor() as cur:
        cur.execute("SELECT company_id FROM companies WHERE LOWER(name) = LOWER(%s)", (name,))
        row = cur.fetchone()
        if row:
            return row[0]
        cur.execute("SELECT COALESCE(MAX(company_id), 116) + 1 FROM staging_company")
        return cur.fetchone()[0]


def insert_staging_company(record: dict, company_id: int) -> tuple[str, str | None]:
    """Insert one row; the AFTER-INSERT trigger normalizes + builds company_json.
    Returns (processing_status, error_message)."""
    cols = ["company_id"] + COLUMNS
    values = [company_id] + [record.get(c) for c in COLUMNS]
    col_sql = ", ".join(cols)
    ph_sql = ", ".join(["%s"] * len(cols))
    with _connect() as conn, conn.cursor() as cur:
        cur.execute(
            f"INSERT INTO staging_company ({col_sql}) VALUES ({ph_sql}) RETURNING staging_id",
            values,
        )
        staging_id = cur.fetchone()[0]
        conn.commit()
        cur.execute(
            "SELECT processing_status, error_message FROM staging_company WHERE staging_id = %s",
            (staging_id,),
        )
        status, error = cur.fetchone()
    return status, error


def insert_skill_levels(row: dict) -> tuple[bool, str | None]:
    """Insert one expectation-matrix row; trigger maps it to company_skill_levels.
    Returns (processed, error_message)."""
    values = [row.get(c) for c in SKILL_COLUMNS]
    col_sql = ", ".join(SKILL_COLUMNS)
    ph_sql = ", ".join(["%s"] * len(SKILL_COLUMNS))
    with _connect() as conn, conn.cursor() as cur:
        cur.execute(
            f"INSERT INTO staging_company_skill_levels ({col_sql}) VALUES ({ph_sql}) RETURNING id",
            values,
        )
        new_id = cur.fetchone()[0]
        conn.commit()
        cur.execute(
            "SELECT processed, error_message FROM staging_company_skill_levels WHERE id = %s",
            (new_id,),
        )
        processed, error = cur.fetchone()
    return processed, error


# None of the Level-2 scripts create this table, so the hiring write used to fail
# with 'relation "job_role_details_json" does not exist'. We create it on demand
# (idempotent); sql/create_job_role_details_json.sql is the same DDL plus RLS.
JOB_ROLE_DDL = """
CREATE TABLE IF NOT EXISTS job_role_details_json (
    id            SERIAL PRIMARY KEY,
    company_id    INTEGER NOT NULL,
    company_name  TEXT    NOT NULL,
    job_role_json JSONB   NOT NULL,
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
"""


def insert_hiring(company_id: int, company_name: str, job_role_json: dict) -> int:
    """Insert the hiring-rounds JSON; returns the new row id."""
    from psycopg2.extras import Json
    with _connect() as conn, conn.cursor() as cur:
        cur.execute(JOB_ROLE_DDL)
        cur.execute(
            "INSERT INTO job_role_details_json (company_id, company_name, job_role_json) "
            "VALUES (%s, %s, %s) RETURNING id",
            (company_id, company_name, Json(job_role_json)),
        )
        new_id = cur.fetchone()[0]
        conn.commit()
    return new_id
