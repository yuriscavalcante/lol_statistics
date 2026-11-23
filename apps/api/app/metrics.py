"""Métricas de desempenho por partida. Função pura, sem rede (spec 2026-11-23-metricas-desempenho)."""
import math
from statistics import mean

MARKS = (10, 15)


def _frame_stats(timeline: dict, pid: int, minute: int) -> dict | None:
    frames = timeline["info"]["frames"]
    if minute >= len(frames):
        return None
    f = frames[minute]["participantFrames"][str(pid)]
    return {"cs": f["minionsKilled"] + f["jungleMinionsKilled"], "gold": f["totalGold"], "xp": f["xp"]}


def compute_metrics(match: dict, timeline: dict, puuid: str) -> dict:
    info = match["info"]
    players = info["participants"]
    me = next(p for p in players if p["puuid"] == puuid)
    opp = _opponent(players, me)
    minutes = info["gameDuration"] / 60
    cs = me["totalMinionsKilled"] + me["neutralMinionsKilled"]
    team_kills = sum(p["kills"] for p in players if p["teamId"] == me["teamId"])

    out = {
        "matchId": match["metadata"]["matchId"],
        "puuid": puuid,
        "champion": me["championName"],
        "position": me["teamPosition"] or None,
        "win": me["win"],
        "remake": me.get("gameEndedInEarlySurrender", False),
        "durationMin": round(minutes, 1),
        "kills": me["kills"],
        "deaths": me["deaths"],
        "assists": me["assists"],
        "kda": round((me["kills"] + me["assists"]) / max(me["deaths"], 1), 2),
        "killParticipation": round((me["kills"] + me["assists"]) / team_kills, 2) if team_kills else 0.0,
        "cs": cs,
        "csPerMin": round(cs / minutes, 2),
        "goldPerMin": round(me["goldEarned"] / minutes, 1),
        "xpPerMin": round(me["champExperience"] / minutes, 1),
    }

    for m in MARKS:
        mine = _frame_stats(timeline, me["participantId"], m)
        theirs = _frame_stats(timeline, opp["participantId"], m) if opp else None
        for k in ("cs", "gold", "xp"):
            out[f"{k}At{m}"] = mine[k] if mine else None
            out[f"{k}DiffAt{m}"] = mine[k] - theirs[k] if mine and theirs else None

    out["deathsBefore15"] = sum(
        1
        for fr in timeline["info"]["frames"]
        for e in fr["events"]
        if e["type"] == "CHAMPION_KILL" and e["victimId"] == me["participantId"] and e["timestamp"] < 15 * 60_000
    )
    return out


def _opponent(players: list[dict], me: dict) -> dict | None:
    return next(
        (p for p in players if p["teamId"] != me["teamId"] and me["teamPosition"] and p["teamPosition"] == me["teamPosition"]),
        None,
    )


EVENT_TYPES = ("CHAMPION_KILL", "ELITE_MONSTER_KILL", "BUILDING_KILL")

# Posicionamento (spec 2026-11-23-analise-posicionamento). Unidades do jogo; o mapa tem ~14870 de lado.
LANE_ZONE = {"TOP": "top", "MIDDLE": "mid", "BOTTOM": "bot"}
ISOLATED = 3000  # aliado mais próximo além disso = isolado
NEAR_DEATH = 2000
NEAR_OBJECTIVE = 3000


def _zone(x: float, y: float) -> str:
    # ponytail: limites a olho no minimapa; trocar por polígonos (lol_gis/sr_layout.py) se classificar errado demais
    if x + y < 4500 or x + y > 25240:
        return "base"
    if abs(x - y) < 1500:  # antes de top/bot: o fim do mid encosta em x/y > 12300
        return "mid"
    if x < 2500 or y > 12300:
        return "top"
    if x > 12300 or y < 2500:
        return "bot"
    return "jungle"


def _snapshots(timeline: dict) -> list[dict[int, tuple[float, float]]]:
    """Posição de cada pid em cada minuto. O frame n é a foto do minuto n."""
    return [
        {int(k): (v["position"]["x"], v["position"]["y"]) for k, v in fr["participantFrames"].items() if "position" in v}
        for fr in timeline["info"]["frames"]
    ]


def _near(snap: dict, center: tuple, ids, radius: float) -> int:
    return sum(1 for pid in ids if pid in snap and math.dist(snap[pid], center) <= radius)


def positioning(match: dict, timeline: dict, pids) -> dict:
    """Zona, rota, isolamento e contexto de mortes/objetivos dos `pids` (todos do mesmo time).

    ponytail: a timeline não marca quem está morto, então um aliado morto pode contar como "perto";
    tirar isso exige estimar o tempo de renascimento.
    """
    team = {p["participantId"]: p["teamId"] for p in match["info"]["participants"]}
    role = {p["participantId"]: p["teamPosition"] for p in match["info"]["participants"]}
    snaps = _snapshots(timeline)
    events = [e for fr in timeline["info"]["frames"] for e in fr["events"] if "position" in e]
    allies = lambda pid: [q for q in team if team[q] == team[pid] and q != pid]
    enemies = lambda pid: [q for q in team if team[q] != team[pid]]
    snap_at = lambda e: snaps[min(int(e["timestamp"] // 60_000), len(snaps) - 1)]
    center = lambda e: (e["position"]["x"], e["position"]["y"])

    players = {}
    for pid in pids:
        zones = [_zone(*s[pid]) if pid in s else None for s in snaps]
        nearest = [
            min(math.dist(s[pid], s[a]) for a in allies(pid) if a in s)
            for s in snaps[1:]  # minuto 0: todos na fonte
            if pid in s and any(a in s for a in allies(pid))
        ]
        lane = LANE_ZONE.get(role[pid])
        early = list(enumerate(zones[2:15], 2))  # minuto 1 ainda é leash/caminhada
        deaths = []
        for e in events:
            if e["type"] == "CHAMPION_KILL" and e.get("victimId") == pid:
                s, c = snap_at(e), center(e)
                deaths.append({
                    "minute": round(e["timestamp"] / 60_000, 1),
                    "zone": _zone(*c),
                    "alliesNear": _near(s, c, allies(pid), NEAR_DEATH),
                    "enemiesNear": _near(s, c, enemies(pid), NEAR_DEATH),
                    # exato, ao contrário de *Near (foto de até 59 s antes): quem matou + assistências
                    "enemiesInvolved": (e.get("killerId", 0) > 0) + len(e.get("assistingParticipantIds", [])),
                    "isolated": _near(s, c, allies(pid), ISOLATED) == 0,
                })
        players[pid] = {
            "zones": zones,
            "laneMinutes": sum(z == lane for _, z in early) if lane else None,
            "firstLeftLane": next((m for m, z in early if z not in (lane, "base")), None) if lane else None,
            "avgNearestAlly": round(mean(nearest)) if nearest else None,
            "isolatedMinutes": sum(d > ISOLATED for d in nearest),
            "deaths": deaths,
        }

    ours = {q for q in team if team[q] == team[next(iter(pids))]} if pids else set()
    objectives = [
        {
            "minute": round(e["timestamp"] / 60_000, 1),
            "monsterType": e.get("monsterType"),
            "killerTeamId": e.get("killerTeamId"),
            "teamNear": _near(snap_at(e), center(e), ours, NEAR_OBJECTIVE),
            "enemyNear": _near(snap_at(e), center(e), set(team) - ours, NEAR_OBJECTIVE),
        }
        for e in events
        if e["type"] == "ELITE_MONSTER_KILL"
    ]
    return {"players": players, "objectives": objectives}


# Nota 0–10 relativa à partida (spec 2026-11-23-nota-jogadores). 5 = média dos 10.
GRADE_WEIGHTS = {"kda": 0.25, "kp": 0.20, "dmg": 0.20, "gold": 0.15, "cs": 0.10, "vision": 0.10}
GRADE_WEIGHTS_SUPPORT = {"kda": 0.25, "kp": 0.25, "dmg": 0.10, "gold": 0.05, "cs": 0.0, "vision": 0.35}


def grades(participants: list[dict]) -> dict[int, float]:
    team_kills = {t: sum(p["kills"] for p in participants if p["teamId"] == t) for t in {p["teamId"] for p in participants}}
    stats = {
        p["participantId"]: {
            "kda": (p["kills"] + p["assists"]) / max(p["deaths"], 1),
            "kp": (p["kills"] + p["assists"]) / team_kills[p["teamId"]] if team_kills[p["teamId"]] else 0,
            "dmg": p.get("totalDamageDealtToChampions", 0),
            "gold": p.get("goldEarned", 0),
            "cs": p.get("totalMinionsKilled", 0) + p.get("neutralMinionsKilled", 0),
            "vision": p.get("visionScore", 0),
        }
        for p in participants
    }
    avg = {k: mean(s[k] for s in stats.values()) for k in GRADE_WEIGHTS}
    out = {}
    for p in participants:
        w = GRADE_WEIGHTS_SUPPORT if p["teamPosition"] == "UTILITY" else GRADE_WEIGHTS
        s = stats[p["participantId"]]
        score = sum(w[k] * (min(s[k] / avg[k], 2) if avg[k] else 1) for k in w)
        out[p["participantId"]] = round(min(5 * score, 10), 1)
    return out


def match_detail(match: dict, timeline: dict, puuid: str) -> dict:
    """Tudo da partida para a tela de detalhe e para a IA."""
    info = match["info"]
    players = info["participants"]
    me = next(p for p in players if p["puuid"] == puuid)
    opp = _opponent(players, me)
    mid, oid = me["participantId"], opp["participantId"] if opp else None

    series = []
    for minute in range(len(timeline["info"]["frames"])):
        mine = _frame_stats(timeline, mid, minute)
        theirs = _frame_stats(timeline, oid, minute) if oid else None
        series.append({"minute": minute, "me": mine, "opponent": theirs})

    events, map_events, path = [], [], []
    for i, fr in enumerate(timeline["info"]["frames"]):
        if pos := fr["participantFrames"].get(str(mid), {}).get("position"):
            path.append({"minute": i, **pos})
        for e in fr["events"]:
            if e["type"] not in EVENT_TYPES:
                continue
            if "position" in e:
                map_events.append({**e, "minute": round(e["timestamp"] / 60_000, 1)})
            if e["type"] == "CHAMPION_KILL":
                if e.get("killerId") == mid:
                    role = "kill"
                elif e.get("victimId") == mid:
                    role = "death"
                elif mid in e.get("assistingParticipantIds", []):
                    role = "assist"
                else:
                    continue
            else:
                role = "objective"
            events.append({**e, "minute": round(e["timestamp"] / 60_000, 1), "role": role})

    return {
        "metrics": compute_metrics(match, timeline, puuid),
        "durationMin": round(info["gameDuration"] / 60, 1),
        "participants": [{**p, "isMe": p is me, "isOpponent": p is opp, "grade": g[p["participantId"]]}
                         for g in [grades(players)] for p in players],
        "teams": info.get("teams", []),
        "series": series,
        "events": events,
        "mapEvents": map_events,
        "path": path,
        "paths": {
            p["participantId"]: [{"minute": m, "x": s[p["participantId"]][0], "y": s[p["participantId"]][1]}
                                 for m, s in enumerate(_snapshots(timeline)) if p["participantId"] in s]
            for p in players
        },
        "positioning": positioning(match, timeline, [mid]),
    }


def team_detail(match: dict, timeline: dict, team_id: int) -> dict:
    """Visão do time inteiro para a análise coletiva."""
    info = match["info"]
    players = info["participants"]
    ours = {p["participantId"] for p in players if p["teamId"] == team_id}
    if not ours:
        raise ValueError(f"time {team_id} não está na partida")
    theirs = {p["participantId"] for p in players} - ours
    champ = {p["participantId"]: p["championName"] for p in players}

    def total(minute: int, ids: set[int]) -> dict:
        stats = [_frame_stats(timeline, pid, minute) for pid in ids]
        return {k: sum(s[k] for s in stats) for k in ("cs", "gold", "xp")}

    series = [
        {"minute": m, "team": total(m, ours), "enemy": total(m, theirs)} for m in range(len(timeline["info"]["frames"]))
    ]

    events = []
    for fr in timeline["info"]["frames"]:
        for e in fr["events"]:
            if e["type"] not in EVENT_TYPES:
                continue
            if e["type"] == "CHAMPION_KILL":
                role = "kill" if e.get("killerId") in ours else "death"
                extra = {
                    "killer": champ.get(e.get("killerId"), "torre/minion"),
                    "victim": champ.get(e.get("victimId")),
                    "assists": [champ[a] for a in e.get("assistingParticipantIds", []) if a in champ],
                }
            else:
                role, extra = "objective", {}
            events.append({**e, **extra, "minute": round(e["timestamp"] / 60_000, 1), "role": role})

    return {
        "teamId": team_id,
        "durationMin": round(info["gameDuration"] / 60, 1),
        "win": next(p["win"] for p in players if p["teamId"] == team_id),
        "players": [p for p in players if p["teamId"] == team_id],
        "enemies": [p for p in players if p["teamId"] != team_id],
        "teams": info.get("teams", []),
        "series": series,
        "events": events,
        "positioning": positioning(match, timeline, sorted(ours)),
    }
