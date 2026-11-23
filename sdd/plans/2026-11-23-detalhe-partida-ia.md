# Plano: detalhe da partida + análise com IA (Gemini) salva em Postgres

- Spec: `sdd/specs/2026-11-23-detalhe-partida-ia.md`
- Data: 2026-11-23

## Contexto

Hoje a tela lista partidas com ~15 métricas. Falta: clicar numa partida e ver tudo o que a Riot devolve dela, e pedir a uma IA o que foi feito de errado e onde melhorar. A análise fica salva no Postgres para não gastar chamada de novo.

Decisões do usuário: IA = **Gemini**; Postgres via **docker-compose**.

## Passo 0 (SDD, antes de qualquer código)

- Spec `sdd/specs/2026-11-23-detalhe-partida-ia.md` (problema, resultado, fora de escopo, critérios de aceite abaixo).
- Plano `sdd/plans/2026-11-23-detalhe-partida-ia.md` com o conteúdo deste arquivo.

## Backend (`apps/api`)

Dependências: `uv add google-genai "psycopg[binary]"`.

1. **`app/metrics.py`** (puro, testado):
   - `compute_metrics` passa a incluir `"puuid"` no retorno (o front precisa dele para abrir o detalhe).
   - Nova `match_detail(match, timeline, puuid) -> dict`:
     - `metrics`: o que `compute_metrics` já devolve.
     - `participants`: os 10 jogadores com os campos brutos da Riot (inclui `challenges`, itens, dano, visão, objetivos, runas), marcando `isMe` e `isOpponent`.
     - `teams`: `info.teams` (bans, objetivos: dragão, barão, torres, arauto).
     - `series`: por minuto, `cs`, `gold`, `xp` meu e do oponente (reusa `_frame_stats`).
     - `events`: meus `CHAMPION_KILL` (abate/morte/assistência), `ELITE_MONSTER_KILL` e `BUILDING_KILL` do jogo, com minuto e posição.
2. **`app/db.py`** (novo, ~25 linhas): `psycopg` com `DATABASE_URL`; `CREATE TABLE IF NOT EXISTS analyses (match_id text, puuid text, model text, content jsonb, created_at timestamptz default now(), primary key (match_id, puuid))` na subida; `get(match_id, puuid)` e `save(...)` com `ON CONFLICT DO UPDATE` (reanalisar sobrescreve).
   - `# ponytail: uma conexão por chamada, sem pool; trocar por psycopg_pool se ficar lento`
3. **`app/ai.py`** (novo): `google.genai.Client(api_key=GEMINI_API_KEY)`, modelo de `GEMINI_MODEL` (padrão `gemini-2.5-flash`). Prompt em português de coach de LoL com o `match_detail` resumido (meu jogador completo, oponente de rota, totais dos times, séries a cada minuto e eventos). Saída estruturada via `response_schema` (Pydantic): `resumo: str`, `erros: list[{momento, problema, impacto}]`, `acertos: list[str]`, `melhorias: list[str]`.
4. **`app/main.py`**:
   - `GET /matches/{match_id}?puuid=` → `match_detail` (usa `riot.match`/`riot.timeline`, já cacheados).
   - `GET /matches/{match_id}/analysis?puuid=` → análise salva ou 404.
   - `POST /matches/{match_id}/analysis?puuid=` → gera com Gemini, salva, devolve.
   - CORS: liberar `POST`. Erros do Gemini → 502; banco fora → 503.

## Infra

- `docker-compose.yml` na raiz: `postgres:17`, volume nomeado, porta 5432.
- `.env.example`: `GEMINI_API_KEY`, `GEMINI_MODEL`, `DATABASE_URL=postgresql://riot:riot@localhost:5432/riot`.
- README: `docker compose up -d` antes de `pnpm dev`.

## Frontend (`apps/web/src`)

1. `App.tsx`: linha da tabela clicável (`cursor-pointer`, `onClick`) → estado `selected`; com partida selecionada, renderiza `<MatchDetail>` no lugar da tabela, com botão Voltar. Sem router.
2. `MatchDetail.tsx` (novo), com os componentes shadcn já instalados (Card, Table, Badge, Button):
   - Cabeçalho: resultado, campeão, rota, duração.
   - Placar dos 2 times: campeão, K/D/A, CS, ouro, dano a campeões, visão, itens (ícones Data Dragon). Minha linha destacada.
   - Minhas estatísticas agrupadas (combate, farm/ouro, dano, visão, objetivos) + grade com **todos** os campos de `challenges`.
   - Gráfico por minuto da diferença de ouro/CS/XP contra o oponente: SVG inline, sem lib nova.
   - Linha do tempo dos meus abates/mortes e dos objetivos.
   - Painel IA: no carregamento faz GET da análise salva; botão "Analisar com IA" (ou "Reanalisar") faz POST, com loading. Mostra resumo, erros (com minuto), acertos e melhorias.

## Arquivos

- `apps/api/app/metrics.py`, `apps/api/app/main.py`, `apps/api/app/db.py` (novo), `apps/api/app/ai.py` (novo), `apps/api/pyproject.toml`, `apps/api/tests/test_metrics.py`
- `apps/web/src/App.tsx`, `apps/web/src/MatchDetail.tsx` (novo)
- `docker-compose.yml`, `.env.example`, `README.md`, `docs/riot-api.md` (citar `info.teams` e eventos usados)

## Verificação

- `cd apps/api && uv run pytest`: teste novo de `match_detail` (séries com oponente, `isMe`, eventos de morte) com os fixtures de `test_metrics.py`.
- `pnpm --filter web build` sem erros.
- `docker compose up -d`, `pnpm dev`, buscar um Riot ID, clicar numa partida: placar com 10 jogadores, challenges, gráfico. Clicar "Analisar com IA" → análise aparece; recarregar a página e abrir a mesma partida → análise vem do banco sem chamar o Gemini (`SELECT * FROM analyses` confirma a linha).

## Fora deste plano

- Histórico de várias análises por partida (reanalisar sobrescreve).
- Análise comparando várias partidas, benchmark por elo, chat com a IA.
- Migrações (alembic), pool de conexões, autenticação.
