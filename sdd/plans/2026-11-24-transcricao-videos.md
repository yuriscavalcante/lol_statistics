# Plano: Transcrição de vídeos como referência para a IA

- Spec: `sdd/specs/2026-11-24-transcricao-videos.md`
- Data: 2026-11-24

## Objetivo

Baixar legendas do YouTube, salvar inteiras e resumidas (sem IA) e injetar os blocos relevantes na análise do Gemini.

## Passos

1. `uv add youtube-transcript-api` em `apps/api`.
2. `apps/api/app/videos.py`:
   - `video_id(url)`: aceita `watch?v=`, `youtu.be/`, `shorts/`; `None` se inválido.
   - `fetch(video_id)`: `YouTubeTranscriptApi().fetch(id, languages=["pt", "pt-BR", "en"])` → lista `{text, start, duration}`.
   - Puras: `clean(texto)` (minúsculas, tira muletas, colapsa palavras repetidas em sequência), `summarize(segmentos)` → blocos de 60 s `{minuto, texto}` limpos, sem frase repetida, só os que têm termo do `GLOSSARIO`.
   - `search_terms(campeoes, rotas)`: nomes dos campeões + palavras da rota (MIDDLE→mid, BOTTOM→adc, UTILITY→suporte...).
3. `apps/api/app/db.py`: tabelas `videos (video_id pk, url, idioma, transcricao jsonb, created_at)` e `video_trechos (video_id, minuto, texto, busca tsvector gerado com 'portuguese', PK(video_id, minuto))` + índice GIN. Funções `save_video(...)` (sobrescreve trechos) e `trechos(termos, limite=5)` com `websearch_to_tsquery` + `ts_rank`.
4. `apps/api/app/main.py`: `POST /videos?url=`. Na `create_analysis`, buscar trechos pelos campeões/rotas do detalhe e passar a `ai.analyze`.
5. `apps/api/app/ai.py`: `analyze(..., trechos=[])` adiciona `trechosDeVideos` ao payload quando houver; uma frase nos prompts para usar como referência.
6. `apps/api/tests/test_videos.py`: `video_id`, `clean`, `summarize`.
7. Documentar no `README.md` (seção curta).
8. Comando no terminal: `ingest(url)` em `videos.py` (usado pelo endpoint e pelo terminal) e `__main__` que aceita um ou mais links e imprime idioma, blocos, caracteres original → resumo e % de redução. Atalho `pnpm video <link>` no `package.json` da raiz.
9. Tokens: `STOPWORDS` em `videos.py` aplicadas no `clean` (negações ficam). `ai.py` manda `trechosDeVideos` como lista de strings. `--reprocessar` no terminal: `db.transcricoes()` + `summarize` + `db.save_trechos` para todos os vídeos, sem rede para o YouTube.
10. `POST /perguntar?pergunta=`: termos = `clean(pergunta)`; `db.trechos(termos, 8)` (passa a devolver `video_id`); sem trechos → resposta fixa sem chamar o Gemini; com trechos → `ai.ask(pergunta, textos)` em texto livre. `fontes` = `https://youtu.be/<id>?t=<minuto*60>`.
11. Testes: stopwords/negação no `clean`.

## Arquivos

- `apps/api/pyproject.toml`, `apps/api/uv.lock`
- `apps/api/app/videos.py` (novo), `db.py`, `main.py`, `ai.py`
- `apps/api/tests/test_videos.py` (novo)
- `README.md`

## Verificação

- `cd apps/api && uv run pytest`.
- Com Postgres de pé: `POST /videos` com um vídeo real de coaching; conferir original vs resumido e as linhas em `video_trechos`.

## Fora deste plano

- Whisper/vídeos sem legenda, playlists, tela no web, embeddings.
- O YouTube pode bloquear o download da legenda a partir do IP da VPS; se acontecer, cadastrar rodando a API local.
