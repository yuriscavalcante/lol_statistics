"""Análise de partida com Gemini (GEMINI_API_KEY, GEMINI_MODEL)."""
import json
import os
from collections import Counter

from google import genai
from google.genai import types
from pydantic import BaseModel


def model() -> str:
    return os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

SYSTEM = """Você é um coach de League of Legends analisando UMA partida de um jogador.
Use só os dados recebidos. Seja específico: cite minutos, números e comparações com o oponente de rota.
Aponte erros de verdade (mortes evitáveis, farm perdido, visão baixa, objetivos cedidos, build), o que foi bem
e melhorias práticas para os próximos jogos. Comente o posicionamento: mortes isoladas ou em desvantagem numérica,
saída cedo da rota, distância do time e presença nos objetivos. As posições são 1 amostra por minuto, então
fale de tendências, não de movimentos dentro das lutas. Responda em português do Brasil."""

SYSTEM_TEAM = """Você é um coach de League of Legends analisando o desempenho coletivo de UM time numa partida.
Use só os dados recebidos. Olhe a diferença de ouro/XP do time por minuto, as lutas (quem morreu, para quem, em que minuto),
o controle de objetivos e a distribuição de ouro e dano entre os 5. Em cada erro, diga em que minuto foi e quais campeões
pesaram. Analise o posicionamento coletivo: quem morreu isolado, quem ficou longe do time, quantos de cada lado estavam
perto de cada objetivo. As posições são 1 amostra por minuto, então fale de tendências.
Aponte o que o time fez bem e melhorias práticas de jogo em equipe. Responda em português do Brasil."""

_COMPACT = ("championName", "teamPosition", "kills", "deaths", "assists", "goldEarned", "totalDamageDealtToChampions",
            "visionScore", "totalMinionsKilled", "neutralMinionsKilled", "champLevel", "totalTimeSpentDead")


class Erro(BaseModel):
    momento: str
    problema: str
    impacto: str


class Analise(BaseModel):
    resumo: str
    erros: list[Erro]
    acertos: list[str]
    melhorias: list[str]


def _pos_summary(p: dict) -> dict:
    """Troca a zona de cada minuto por minutos por zona: o modelo não precisa da lista inteira."""
    return {**{k: v for k, v in p.items() if k != "zones"}, "minutosPorZona": dict(Counter(z for z in p["zones"] if z))}


def _payload(detail: dict) -> dict:
    """Resumo enxuto do match_detail: o modelo não precisa dos 10 jogadores completos."""
    ps = detail["participants"]
    me = next(p for p in ps if p["isMe"])
    opp = next((p for p in ps if p["isOpponent"]), None)
    teams = {
        t: {k: sum(p.get(k, 0) for p in ps if p["teamId"] == t) for k in ("kills", "goldEarned", "totalDamageDealtToChampions", "visionScore")}
        for t in {p["teamId"] for p in ps}
    }
    return {
        "duracaoMin": detail["durationMin"],
        "jogador": me,
        "oponenteDeRota": opp,
        "aliados": [{k: p.get(k) for k in ("championName", "teamPosition", "kills", "deaths", "assists")} for p in ps if p["teamId"] == me["teamId"] and not p["isMe"]],
        "totaisPorTime": teams,
        "objetivosPorTime": [{"teamId": t["teamId"], "win": t["win"], "objectives": t["objectives"]} for t in detail["teams"]],
        "porMinuto": detail["series"],
        "eventos": [{k: e.get(k) for k in ("minute", "role", "type", "monsterType", "buildingType", "killerTeamId", "position")} for e in detail["events"]],
        "posicionamento": {
            "jogador": _pos_summary(detail["positioning"]["players"][me["participantId"]]),
            "objetivos": detail["positioning"]["objectives"],
        },
    }


def _team_payload(td: dict) -> dict:
    keep = ("kda", "killParticipation", "teamDamagePercentage", "damagePerMinute", "goldPerMinute", "visionScorePerMinute",
            "controlWardsPlaced", "laneMinionsFirst10Minutes", "maxCsAdvantageOnLaneOpponent")
    return {
        "duracaoMin": td["durationMin"],
        "vitoria": td["win"],
        "time": [{**{k: p.get(k) for k in _COMPACT}, **{k: p.get("challenges", {}).get(k) for k in keep}} for p in td["players"]],
        "inimigos": [{k: p.get(k) for k in _COMPACT} for p in td["enemies"]],
        "objetivosPorTime": [{"teamId": t["teamId"], "win": t["win"], "objectives": t["objectives"]} for t in td["teams"]],
        "seuTeamId": td["teamId"],
        "porMinuto": td["series"],
        "eventos": [{k: e.get(k) for k in ("minute", "role", "type", "killer", "victim", "assists", "monsterType", "buildingType", "killerTeamId", "teamId")} for e in td["events"]],
        "posicionamento": {
            "porCampeao": {p["championName"]: _pos_summary(td["positioning"]["players"][p["participantId"]]) for p in td["players"]},
            "objetivos": td["positioning"]["objectives"],
        },
    }


VIDEOS_HINT = """
Se vier `trechosDeVideos` (falas transcritas de vídeos de coaching, sem pontuação nem palavras vazias), use como referência de boas práticas
quando forem relevantes para esta partida; ignore os que não forem."""


SYSTEM_ASK = """Você responde dúvidas de League of Legends usando SÓ os trechos numerados recebidos: falas transcritas
de vídeos de coaching, sem pontuação nem palavras vazias. Responda em português do Brasil, direto e prático,
citando os trechos usados como [n]. Reescreva com suas palavras, nunca copie o texto dos trechos. Se os trechos não respondem a pergunta, diga isso em uma frase."""


def _client() -> genai.Client:
    key = os.getenv("GEMINI_API_KEY")
    if not key:
        raise RuntimeError("GEMINI_API_KEY não definida no .env")
    return genai.Client(api_key=key, http_options=types.HttpOptions(api_version="v1beta"))


def ask(pergunta: str, textos: list[str]) -> str:
    contents = "\n".join([f"[{i}] {t}" for i, t in enumerate(textos, 1)] + [f"Pergunta: {pergunta}"])
    with _client() as client:
        r = client.models.generate_content(
            model=model(), contents=contents, config=types.GenerateContentConfig(system_instruction=SYSTEM_ASK)
        )
    return r.text or ""


def analyze(detail: dict, team: bool = False, trechos: list[str] | None = None) -> dict:
    # Client precisa de referência viva: como temporário, o __del__ fecha o HTTP antes da requisição
    # v1beta: no google-genai 3.6 o padrão virou v1, que recusa system_instruction
    payload = _team_payload(detail) if team else _payload(detail)
    if trechos:
        payload["trechosDeVideos"] = trechos
    with _client() as client:
        r = client.models.generate_content(
            model=model(),
            contents=json.dumps(payload, ensure_ascii=False),
            config=types.GenerateContentConfig(
                system_instruction=(SYSTEM_TEAM if team else SYSTEM) + VIDEOS_HINT,
                response_mime_type="application/json",
                response_schema=Analise,
            ),
        )
    if r.parsed is None:
        raise ValueError(f"Gemini não devolveu análise válida: {r.text!r:.300}")
    return r.parsed.model_dump()
