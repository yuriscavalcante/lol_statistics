# Plano: análise com IA de jogador ou de time

- Spec: `sdd/specs/2026-11-23-analise-jogador-ou-time.md`
- Data: 2026-11-23

## Objetivo

Deixar escolher o alvo da análise: um dos 10 jogadores ou um time inteiro.

## Passos

1. `metrics.py`: nova função pura `team_detail(match, timeline, team_id)` com os jogadores do time e do inimigo, objetivos, série por minuto da soma de ouro/CS/XP (time × inimigo, reusa `_frame_stats`) e eventos (abates, mortes do time e objetivos, com nomes dos campeões).
2. `ai.py`: `analyze` recebe o tipo do alvo; payload e instrução de sistema próprios para time; mesmo schema `Analise`.
3. `db.py`: sem mudança de schema. A coluna `puuid` passa a guardar a chave do alvo: o PUUID do jogador ou `team:100` / `team:200`. Análises antigas continuam válidas.
4. `main.py`: GET/POST `/matches/{id}/analysis` aceitam `puuid=` **ou** `team=` (100/200), exatamente um.
5. `MatchDetail.tsx`: `<select>` nativo no painel de IA (10 jogadores + 2 times); trocar o alvo refaz o GET da análise salva.

## Arquivos

- `apps/api/app/metrics.py`, `apps/api/app/ai.py`, `apps/api/app/main.py`, `apps/api/tests/test_metrics.py`
- `apps/web/src/MatchDetail.tsx`

## Verificação

- `uv run pytest` com teste de `team_detail` (série somada, eventos do time).
- `pnpm --filter web build`.
- Endpoints com partida do cache: `team=100` devolve 404 antes de analisar, `puuid` e `team` juntos dão 400.

## Fora deste plano

- Comparar análises, histórico por alvo, coluna renomeada para `subject`.
