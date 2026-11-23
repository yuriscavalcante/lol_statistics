"""Cliente da Riot API. Toda chamada passa por aqui: cache em disco + respeito ao 429."""
import json
import os
import time
from pathlib import Path
from urllib.parse import quote

import httpx
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[3]
load_dotenv(ROOT / ".env")

REGION = os.getenv("RIOT_REGION", "americas")
CACHE = ROOT / "data" / "raw"

_client = httpx.Client(timeout=20)


def _get(url: str, params: dict | None = None) -> dict | list:
    key = os.getenv("RIOT_API_KEY")
    if not key:
        raise RuntimeError("RIOT_API_KEY não definida no .env")
    # ponytail: sem limiter proativo, só reage ao 429; adicionar token bucket quando a coleta de benchmark existir
    for _ in range(5):
        r = _client.get(url, params=params, headers={"X-Riot-Token": key})
        if r.status_code == 429:
            time.sleep(int(r.headers.get("Retry-After", 1)))
            continue
        r.raise_for_status()
        return r.json()
    raise RuntimeError(f"Rate limit persistente em {url}")


def _cached(name: str, url: str) -> dict:
    """Partidas e timelines não mudam depois de terminadas: cache permanente."""
    path = CACHE / f"{name}.json"
    if path.exists():
        return json.loads(path.read_text())
    data = _get(url)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data))
    return data


def account(game_name: str, tag_line: str) -> dict:
    return _get(f"https://{REGION}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/{quote(game_name)}/{quote(tag_line)}")


def match_ids(puuid: str, count: int = 20, queue: int | None = 420) -> list[str]:
    params = {"count": count, **({"queue": queue} if queue else {})}
    return _get(f"https://{REGION}.api.riotgames.com/lol/match/v5/matches/by-puuid/{puuid}/ids", params)


def match(match_id: str) -> dict:
    return _cached(f"match/{match_id}", f"https://{REGION}.api.riotgames.com/lol/match/v5/matches/{match_id}")


def timeline(match_id: str) -> dict:
    return _cached(f"timeline/{match_id}", f"https://{REGION}.api.riotgames.com/lol/match/v5/matches/{match_id}/timeline")
