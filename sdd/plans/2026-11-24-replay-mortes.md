# Plano: mortes no replay

- Data: 2026-11-24

## Objetivo

No replay, o campeão abatido continua "andando" porque a posição é interpolada entre amostras de minuto. Critério de aceite:

- do abate até o respawn, o ícone fica parado no local da morte, em preto e branco e com um X;
- no respawn, o ícone aparece na fonte do time e segue interpolando até a próxima amostra;
- o replay tem velocidades mais lentas (0,25× e 0,5×).

## Passos

1. `metrics.py`: função pura `death_windows(match, timeline)` → `{pid: [{start, end, x, y}]}` em minutos. `end` = abate + tempo de morte estimado (BRW por nível do frame + fator de tempo de jogo, wiki do LoL). Incluir como `deaths` em `match_detail`.
2. Teste em `test_metrics.py` do tempo de morte e da janela.
3. `MatchDetail.tsx`: tipar `deaths` e passar para `MatchMap`.
4. `MatchMap.tsx`: posição do replay usa a janela de morte (parado no local, depois parte da fonte); ícone morto com `filter: grayscale` + X; velocidades 0,25×, 0,5×, 1×, 2×, 4×.

## Arquivos

- `apps/api/app/metrics.py`, `apps/api/tests/test_metrics.py`
- `apps/web/src/MatchDetail.tsx`, `apps/web/src/MatchMap.tsx`

## Verificação

- `cd apps/api && uv run pytest` e `pnpm --filter web build` passam.

## Fora deste plano

- Tempo de morte exato (a timeline não traz respawn; é estimativa).
