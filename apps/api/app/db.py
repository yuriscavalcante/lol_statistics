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
);
CREATE TABLE IF NOT EXISTS videos (
    video_id text PRIMARY KEY,
    url text NOT NULL,
    idioma text NOT NULL,
    transcricao jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS video_trechos (
    video_id text NOT NULL REFERENCES videos ON DELETE CASCADE,
    minuto int NOT NULL,
    texto text NOT NULL,
    busca tsvector GENERATED ALWAYS AS (to_tsvector('portuguese', texto)) STORED,
    PRIMARY KEY (video_id, minuto)
);
CREATE INDEX IF NOT EXISTS video_trechos_busca ON video_trechos USING gin (busca)"""


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


def save_video(video_id: str, url: str, idioma: str, transcricao: list[dict], trechos: list[dict]) -> None:
    with _conn() as c:
        c.execute(
            """INSERT INTO videos (video_id, url, idioma, transcricao) VALUES (%s, %s, %s, %s)
               ON CONFLICT (video_id) DO UPDATE SET url = EXCLUDED.url, idioma = EXCLUDED.idioma,
               transcricao = EXCLUDED.transcricao, created_at = now()""",
            (video_id, url, idioma, Jsonb(transcricao)),
        )
        _save_trechos(c, video_id, trechos)


def _save_trechos(c: psycopg.Connection, video_id: str, trechos: list[dict]) -> None:
    c.execute("DELETE FROM video_trechos WHERE video_id = %s", (video_id,))
    c.cursor().executemany(
        "INSERT INTO video_trechos (video_id, minuto, texto) VALUES (%s, %s, %s)",
        [(video_id, t["minuto"], t["texto"]) for t in trechos],
    )


def resumir_todos(summarize) -> list[tuple[str, int, int, int]]:
    """Refaz os resumos de todos os vídeos a partir da transcrição salva → (video_id, blocos, original, resumo)."""
    out = []
    with _conn() as c:
        for vid, segs in c.execute("SELECT video_id, transcricao FROM videos ORDER BY created_at").fetchall():
            t = summarize(segs)
            _save_trechos(c, vid, t)
            out.append((vid, len(t), sum(len(s["text"]) for s in segs), sum(len(x["texto"]) for x in t)))
    return out


def trechos(termos: list[str], limite: int = 5) -> list[dict]:
    """Blocos mais relevantes para qualquer um dos termos (busca de texto completo)."""
    if not termos:
        return []
    with _conn() as c:
        rows = c.execute(
            """SELECT t.video_id, t.minuto, t.texto FROM video_trechos t,
                      websearch_to_tsquery('portuguese', %s) q
               WHERE t.busca @@ q ORDER BY ts_rank(t.busca, q) DESC LIMIT %s""",
            (" or ".join(termos), limite),
        ).fetchall()
    return [{"videoId": r[0], "minuto": r[1], "texto": r[2]} for r in rows]
