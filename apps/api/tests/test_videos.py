from app.videos import clean, search_terms, summarize, video_id


def test_video_id():
    vid = "dQw4w9WgXcQ"
    for url in (f"https://www.youtube.com/watch?v={vid}&t=10", f"https://youtu.be/{vid}", f"https://youtube.com/shorts/{vid}"):
        assert video_id(url) == vid
    assert video_id("https://example.com/watch?v=" + vid) is None
    assert video_id("https://youtube.com/watch?v=curto") is None


def test_clean_tira_muletas_e_repeticao():
    assert clean("Então, tipo, empurra empurra a WAVE né") == "empurra wave"


def test_clean_mantem_negacao():
    assert clean("você não pode empurrar sem visão") == "não pode empurrar sem visão"


def test_summarize_blocos_filtro_e_duplicata():
    segs = [
        {"text": "salve galera", "start": 0},
        {"text": "inscreva-se no canal", "start": 30},
        {"text": "segura a wave perto da torre", "start": 65},
        {"text": "segura a wave perto da torre", "start": 70},
        {"text": "e dá recall", "start": 100},
    ]
    assert summarize(segs) == [{"minuto": 1, "texto": "segura wave perto torre dá recall"}]


def test_search_terms():
    assert search_terms(["Ahri", "Zed"], ["MIDDLE", "MIDDLE"]) == ["Ahri", "Zed", "mid"]
