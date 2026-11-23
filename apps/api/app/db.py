"""Análises salvas no Postgres (DATABASE_URL)."""
import os

import psycopg
from psycopg.types.json import Jsonb

SCHEMA = """CREATE TABLE IF NOT EXISTS analyses (
    match_id text NOT NULL,
    puuid text NOT NULL,
    model text NOT NULL,
    content jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (match_id, puuid)
)"""


# ponytail: uma conexão por chamada, sem pool; trocar por psycopg_pool se ficar lento
def _conn() -> psycopg.Connection:
    url = os.getenv("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL não definida no .env")
    conn = psycopg.connect(url, connect_timeout=5)
    conn.execute(SCHEMA)
    return conn


def get(match_id: str, puuid: str) -> dict | None:
    with _conn() as c:
        row = c.execute(
            "SELECT model, content, created_at FROM analyses WHERE match_id = %s AND puuid = %s", (match_id, puuid)
        ).fetchone()
    return row and {"model": row[0], "content": row[1], "createdAt": row[2].isoformat()}


def save(match_id: str, puuid: str, model: str, content: dict) -> dict:
    with _conn() as c:
        row = c.execute(
            """INSERT INTO analyses (match_id, puuid, model, content) VALUES (%s, %s, %s, %s)
               ON CONFLICT (match_id, puuid) DO UPDATE SET model = EXCLUDED.model, content = EXCLUDED.content, created_at = now()
               RETURNING created_at""",
            (match_id, puuid, model, Jsonb(content)),
        ).fetchone()
    return {"model": model, "content": content, "createdAt": row[0].isoformat()}
