import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from google.genai import errors as genai_errors
from psycopg import OperationalError

from app import ai, db, riot
from app.metrics import compute_metrics, match_detail, team_detail

app = FastAPI(title="riot-statistics")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173"], allow_methods=["GET", "POST"])


def _riot(fn, *args):
    try:
        return fn(*args)
    except httpx.HTTPStatusError as e:
        raise HTTPException(e.response.status_code, e.response.text)
    except RuntimeError as e:
        raise HTTPException(503, str(e))


@app.get("/players/{game_name}/{tag_line}/matches")
def player_matches(game_name: str, tag_line: str, count: int = 10, queue: int | None = 420):
    if not 1 <= count <= 50:
        raise HTTPException(400, "count deve estar entre 1 e 50")

    def run():
        puuid = riot.account(game_name, tag_line)["puuid"]
        return [compute_metrics(riot.match(mid), riot.timeline(mid), puuid) for mid in riot.match_ids(puuid, count, queue)]

    return _riot(run)


def _detail(match_id: str, puuid: str) -> dict:
    match = _riot(riot.match, match_id)
    if puuid not in match["metadata"]["participants"]:
        raise HTTPException(404, "jogador não está nesta partida")
    return match_detail(match, _riot(riot.timeline, match_id), puuid)


@app.get("/matches/{match_id}")
def get_match(match_id: str, puuid: str):
    return _detail(match_id, puuid)


def _subject(puuid: str | None, team: int | None) -> str:
    """Chave salva na coluna `puuid`: o PUUID do jogador ou `team:100` / `team:200`."""
    if (puuid is None) == (team is None):
        raise HTTPException(400, "informe puuid ou team, não os dois")
    if team is not None and team not in (100, 200):
        raise HTTPException(400, "team deve ser 100 ou 200")
    return puuid or f"team:{team}"


@app.get("/matches/{match_id}/analysis")
def get_analysis(match_id: str, puuid: str | None = None, team: int | None = None):
    subject = _subject(puuid, team)
    try:
        saved = db.get(match_id, subject)
    except (OperationalError, RuntimeError) as e:
        raise HTTPException(503, f"Banco indisponível: {e}")
    if not saved:
        raise HTTPException(404, "ainda não analisada")
    return saved


@app.post("/matches/{match_id}/analysis")
def create_analysis(match_id: str, puuid: str | None = None, team: int | None = None):
    subject = _subject(puuid, team)
    if team is None:
        detail = _detail(match_id, puuid)
    else:
        detail = team_detail(_riot(riot.match, match_id), _riot(riot.timeline, match_id), team)
    try:
        content = ai.analyze(detail, team=team is not None)
    except RuntimeError as e:
        raise HTTPException(503, str(e))
    except (genai_errors.APIError, ValueError) as e:
        raise HTTPException(502, f"Falha no Gemini: {e}")
    try:
        return db.save(match_id, subject, ai.model(), content)
    except (OperationalError, RuntimeError) as e:
        raise HTTPException(503, f"Banco indisponível: {e}")
