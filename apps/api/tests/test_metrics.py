from app.metrics import compute_metrics


def player(pid, puuid, team, pos, k=0, d=0, a=0):
    return {
        "participantId": pid, "puuid": puuid, "teamId": team, "teamPosition": pos, "championName": "Ahri",
        "win": team == 100, "kills": k, "deaths": d, "assists": a, "totalMinionsKilled": 250,
        "neutralMinionsKilled": 50, "goldEarned": 15000, "champExperience": 18000,
    }


def frame(minute, me_cs, opp_cs, events=()):
    pf = lambda cs: {"minionsKilled": cs, "jungleMinionsKilled": 0, "totalGold": cs * 20, "xp": cs * 50}
    return {"participantFrames": {"1": pf(me_cs), "2": pf(opp_cs), "3": pf(0)}, "events": list(events)}


def build(my_pos="MIDDLE", opp_pos="MIDDLE"):
    match = {
        "metadata": {"matchId": "BR1_1"},
        "info": {"gameDuration": 1800, "participants": [
            player(1, "me", 100, my_pos, k=4, d=0, a=6),
            player(2, "opp", 200, opp_pos, k=2),
            player(3, "ally", 100, "TOP", k=6),
        ]},
    }
    death = {"type": "CHAMPION_KILL", "victimId": 1, "timestamp": 5 * 60_000}
    late = {"type": "CHAMPION_KILL", "victimId": 1, "timestamp": 20 * 60_000}
    frames = [frame(m, m * 8, m * 7, [death] if m == 5 else [late] if m == 20 else []) for m in range(31)]
    return match, {"info": {"frames": frames}}


def test_metrics():
    m = compute_metrics(*build(), "me")
    assert m["csPerMin"] == 10.0  # 300 cs / 30 min
    assert m["kda"] == 10.0  # 0 mortes não divide por zero
    assert m["killParticipation"] == 1.0  # (4+6) / 10
    assert m["csAt10"] == 80 and m["csDiffAt10"] == 10
    assert m["goldDiffAt15"] == 300  # (120 - 105) cs * 20 gold
    assert m["deathsBefore15"] == 1


def test_no_lane_opponent():
    m = compute_metrics(*build(opp_pos="JUNGLE"), "me")
    assert m["csAt10"] == 80
    assert m["csDiffAt10"] is None


def test_match_detail():
    from app.metrics import match_detail

    d = match_detail(*build(), "me")
    assert [p["isMe"] for p in d["participants"]] == [True, False, False]
    assert d["participants"][1]["isOpponent"]
    assert d["series"][10] == {"minute": 10, "me": {"cs": 80, "gold": 1600, "xp": 4000},
                               "opponent": {"cs": 70, "gold": 1400, "xp": 3500}}
    assert [(e["role"], e["minute"]) for e in d["events"]] == [("death", 5.0), ("death", 20.0)]


def test_match_detail_mapa():
    from app.metrics import match_detail

    match, tl = build()
    tl["info"]["frames"][3]["participantFrames"]["1"]["position"] = {"x": 100, "y": 200}
    tl["info"]["frames"][5]["events"][0] = {**tl["info"]["frames"][5]["events"][0], "killerId": 3,
                                            "position": {"x": 7000, "y": 7000}}
    d = match_detail(match, tl, "me")
    assert d["path"] == [{"minute": 3, "x": 100, "y": 200}]
    assert [(e["minute"], e["position"]) for e in d["mapEvents"]] == [(5.0, {"x": 7000, "y": 7000})]


def test_match_detail_sem_oponente():
    from app.metrics import match_detail

    d = match_detail(*build(opp_pos="TOP"), "me")
    assert d["series"][10]["opponent"] is None


def test_team_detail():
    from app.metrics import team_detail

    d = team_detail(*build(), 100)
    assert [p["participantId"] for p in d["players"]] == [1, 3]
    assert d["series"][10] == {"minute": 10, "team": {"cs": 80, "gold": 1600, "xp": 4000},
                               "enemy": {"cs": 70, "gold": 1400, "xp": 3500}}
    assert [(e["role"], e["victim"]) for e in d["events"]] == [("death", "Ahri"), ("death", "Ahri")]


def test_zone():
    from app.metrics import _zone

    # posições reais do minuto 5/8 de BR1_3233021673
    assert _zone(1567, 10823) == "top"
    assert _zone(12423, 12166) == "mid"  # perto da torre do mid vermelho, não "bot"
    assert _zone(13281, 2565) == "bot"
    assert _zone(8253, 10153) == "jungle"
    assert _zone(14036, 13428) == "base"
    assert _zone(1000, 1000) == "base"


def build_pos():
    match, tl = build()
    mid, top, opp = (7000, 7000), (1500, 10000), (7500, 7500)
    for m, fr in enumerate(tl["info"]["frames"][:16]):
        me = {4: (1000, 1000), 6: (5000, 9000)}.get(m, mid)  # 4: recall, 6: foi para a selva
        o = (9000, 5000) if m == 10 else opp
        for pid, (x, y) in ((1, me), (2, o), (3, top)):
            fr["participantFrames"][str(pid)]["position"] = {"x": x, "y": y}
    tl["info"]["frames"][9]["events"].append(
        {"type": "CHAMPION_KILL", "victimId": 1, "killerId": 2, "timestamp": 8.5 * 60_000, "position": {"x": 7000, "y": 7000}})
    tl["info"]["frames"][11]["events"].append(
        {"type": "ELITE_MONSTER_KILL", "monsterType": "DRAGON", "killerTeamId": 200, "timestamp": 10.2 * 60_000,
         "position": {"x": 9800, "y": 4400}})
    return match, tl


def test_positioning():
    from app.metrics import positioning

    pos = positioning(*build_pos(), [1])
    me = pos["players"][1]
    assert me["zones"][:7] == ["mid", "mid", "mid", "mid", "base", "mid", "jungle"]
    assert me["laneMinutes"] == 11  # minutos 2–14, menos o recall (4) e a selva (6)
    assert me["firstLeftLane"] == 6  # recall não conta como saída
    assert me["isolatedMinutes"] == 15  # top sempre a >3000
    assert me["deaths"] == [{"minute": 8.5, "zone": "mid", "alliesNear": 0, "enemiesNear": 1,
                            "enemiesInvolved": 1, "isolated": True}]
    assert pos["objectives"] == [{"minute": 10.2, "monsterType": "DRAGON", "killerTeamId": 200, "teamNear": 0, "enemyNear": 1}]


def test_positioning_sem_rota_e_sem_posicao():
    from app.metrics import positioning

    pos = positioning(*build(my_pos="JUNGLE"), [1])  # fixture sem position nenhuma
    me = pos["players"][1]
    assert me["laneMinutes"] is None and me["avgNearestAlly"] is None and me["deaths"] == []


def test_detail_e_payload_com_posicionamento():
    from app.ai import _payload, _team_payload
    from app.metrics import match_detail, team_detail

    d = match_detail(*build_pos(), "me")
    assert d["paths"][2][10] == {"minute": 10, "x": 9000, "y": 5000}
    p = _payload(d)["posicionamento"]
    assert "zones" not in p["jogador"] and p["jogador"]["minutosPorZona"]["jungle"] == 1

    t = team_detail(*build_pos(), 100)
    assert set(t["positioning"]["players"]) == {1, 3}
    assert set(_team_payload(t)["posicionamento"]["porCampeao"]) == {"Ahri"}  # fixture: todos são Ahri


def test_grades():
    from app.metrics import grades

    base = {"teamPosition": "MIDDLE", "kills": 2, "deaths": 2, "assists": 2, "totalDamageDealtToChampions": 10000,
            "goldEarned": 10000, "totalMinionsKilled": 150, "neutralMinionsKilled": 0, "visionScore": 20}
    ps = [{**base, "participantId": i, "teamId": 100 if i <= 5 else 200} for i in range(1, 11)]
    assert set(grades(ps).values()) == {5.0}

    ps[0] |= {"kills": 10, "deaths": 0, "totalDamageDealtToChampions": 30000}
    ps[1] |= {"kills": 0, "deaths": 9, "assists": 0, "totalDamageDealtToChampions": 2000}
    g = grades(ps)
    assert g[1] > 5 > g[2]
    assert all(0 <= v <= 10 for v in g.values())

    ps[4] |= {"teamPosition": "UTILITY", "totalMinionsKilled": 0}
    ps[3] |= {"totalMinionsKilled": 0}
    g = grades(ps)
    assert g[5] > g[4]  # suporte sem CS não é punido


def test_death_windows():
    from app.metrics import death_timer, death_windows, match_detail

    assert death_timer(1, 5) == 6 and death_timer(18, 10) == 52.5
    assert death_timer(10, 20) == 32.5 * (1 + 0.00425 * 10)
    assert death_timer(18, 60) == 52.5 * 1.5  # fator limitado a 50%

    match, tl = build_pos()
    tl["info"]["frames"][8]["participantFrames"]["1"]["level"] = 5
    assert death_windows(tl) == {1: [{"start": 8.5, "end": round(8.5 + 10 / 60, 4), "x": 7000, "y": 7000}]}
    assert match_detail(match, tl, "me")["deaths"][1][0]["start"] == 8.5
