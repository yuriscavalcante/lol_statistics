"""Legendas do YouTube sem IA: transcrição inteira + resumo por regras (limpeza, blocos de 60 s, glossário)."""
import re
from urllib.parse import parse_qs, urlparse

from youtube_transcript_api import YouTubeTranscriptApi

LANGS = ("pt", "pt-BR", "en")
BLOCK_SECONDS = 60

# Palavras vazias e muletas: a IA entende o texto sem elas (−46% medido). Negações ("não", "nunca", "sem") ficam.
STOPWORDS = set("""
o a os as um uma uns umas de do da dos das no na nos nas em ao aos à às pelo pela pelos pelas por para pra pro com
que se e ou mas eu tu ele ela nós vocês eles elas você te me lhe isso isto aquilo esse essa este esta aquele aquela
esses essas aqui ali lá já também tão muito bem bom ser estar tá tô foi era é são está estou vai vou vamos tem ter
tenho quando onde como porque pq então daí aí assim coisa gente pessoal galera vez agora até sobre meu minha seu sua
dele dela num numa sabe olha vê ver beleza certo enfim realmente basicamente literalmente né tipo cara mano ok ah eh
hum uh
""".split())

# ponytail: glossário fixo decide se o bloco fica no resumo; ampliar quando vídeos bons perderem blocos
GLOSSARIO = {
    "wave", "minion", "minions", "farm", "cs", "recall", "base", "trade", "troca", "all-in", "poke", "freeze", "push",
    "slow", "roam", "gank", "jungle", "jungler", "caçador", "selva", "mid", "top", "bot", "adc", "atirador", "suporte",
    "support", "dragão", "drake", "barão", "baron", "arauto", "herald", "grubs", "larvas", "torre", "torres", "inibidor",
    "visão", "ward", "wards", "sentinela", "controle", "objetivo", "objetivos", "lane", "rota", "nível", "level", "item",
    "build", "runa", "runas", "flash", "ult", "ultimate", "teamfight", "luta", "split", "rotação", "rotacionar", "tempo",
    "prioridade", "matchup", "kite", "dano", "ouro", "gold", "kill", "abate", "morte", "morrer", "posicionamento",
}

ROLE_WORDS = {
    "TOP": ["top"], "JUNGLE": ["jungle", "caçador"], "MIDDLE": ["mid"], "BOTTOM": ["adc", "atirador"],
    "UTILITY": ["suporte", "support"],
}


def video_id(url: str) -> str | None:
    u = urlparse(url.strip())
    host = (u.hostname or "").removeprefix("www.").removeprefix("m.")
    if host == "youtu.be":
        vid = u.path.lstrip("/").split("/")[0]
    elif host == "youtube.com":
        parts = u.path.strip("/").split("/")
        vid = parts[1] if parts[0] in ("shorts", "live", "embed") and len(parts) > 1 else parse_qs(u.query).get("v", [""])[0]
    else:
        return None
    return vid if re.fullmatch(r"[\w-]{11}", vid) else None


def fetch(vid: str) -> tuple[str, list[dict]]:
    """Legenda (manual ou automática) → (idioma, [{text, start, duration}])."""
    t = YouTubeTranscriptApi().fetch(vid, languages=LANGS)
    return t.language_code, t.to_raw_data()


def clean(text: str) -> str:
    words = [w for w in re.findall(r"[\wÀ-ÿ'-]+", text.lower()) if w not in STOPWORDS]
    return " ".join(w for i, w in enumerate(words) if i == 0 or w != words[i - 1])


def summarize(segments: list[dict]) -> list[dict]:
    """Blocos de 60 s limpos; descarta legenda repetida e blocos sem termo de jogo."""
    blocks: dict[int, list[str]] = {}
    seen: set[str] = set()
    for s in segments:
        line = clean(s["text"])
        if line and line not in seen:  # legenda automática repete linhas
            seen.add(line)
            blocks.setdefault(int(s["start"] // BLOCK_SECONDS), []).append(line)
    return [
        {"minuto": m, "texto": " ".join(lines)}
        for m, lines in sorted(blocks.items())
        if GLOSSARIO & set(" ".join(lines).split())
    ]


def ingest(url: str) -> dict:
    """Baixa, salva inteira + resumo e devolve as contas. ValueError se o link não for do YouTube."""
    from app import db

    vid = video_id(url)
    if not vid:
        raise ValueError("link do YouTube inválido")
    idioma, segs = fetch(vid)
    trechos = summarize(segs)
    db.save_video(vid, url, idioma, segs, trechos)
    original = sum(len(s["text"]) for s in segs)
    resumo = sum(len(t["texto"]) for t in trechos)
    return {
        "videoId": vid, "idioma": idioma, "caracteresOriginal": original, "caracteresResumo": resumo,
        "reducaoPct": round(100 * (1 - resumo / original), 1) if original else 0.0, "trechos": trechos,
    }


def search_terms(champions: list[str], roles: list[str]) -> list[str]:
    return list(dict.fromkeys([*champions, *(w for r in roles for w in ROLE_WORDS.get(r, []))]))


if __name__ == "__main__":
    import sys

    from app import riot  # noqa: F401  carrega o .env da raiz

    if len(sys.argv) < 2:
        sys.exit('uso: pnpm video "<link do YouTube>" [outro link...]  |  pnpm video --reprocessar')
    if sys.argv[1] == "--reprocessar":
        from app import db

        rs = db.resumir_todos(summarize)
        for vid, n, orig, res in rs:
            print(f"✓ {vid}: {n} blocos, {orig} → {res} caracteres ({round(100 * (1 - res / orig), 1) if orig else 0}% menor)")
        orig, res = sum(r[2] for r in rs), sum(r[3] for r in rs)
        print(f"total: {orig} → {res} caracteres ({round(100 * (1 - res / orig), 1) if orig else 0}% menor)")
        sys.exit()
    for url in sys.argv[1:]:
        try:
            r = ingest(url)
        except Exception as e:  # um link ruim não para os outros
            print(f"✗ {url}: {type(e).__name__}: {e}")
            continue
        print(f"✓ {r['videoId']} ({r['idioma']}): {len(r['trechos'])} blocos, "
              f"{r['caracteresOriginal']} → {r['caracteresResumo']} caracteres ({r['reducaoPct']}% menor)")
