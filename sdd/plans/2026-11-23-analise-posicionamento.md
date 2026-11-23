# Plano: análise de posicionamento

- Spec: `sdd/specs/2026-11-23-analise-posicionamento.md`
- Data: 2026-11-23

## Objetivo

Transformar as posições por minuto da timeline em métricas de posicionamento (zona, rota, isolamento, contexto de mortes e objetivos) e enviá-las à IA nas análises individual e do time.

## Passos

1. `apps/api/app/metrics.py`:
   - `_zone(x, y) -> str`, com geometria aproximada e um comentário `ponytail:` dizendo que os limites são aproximados:
     - `base`: `x + y < 4500` (azul) ou `x + y > 25240` (vermelha, simétrico);
     - `mid`: `|x - y| < 1500` (checado antes de top/bot: na timeline real o mid vermelho em (12423, 12166) cairia em `bot`);
     - `top`: `x < 2500` ou `y > 12300`;
     - `bot`: `x > 12300` ou `y < 2500`;
     - o resto é `jungle` (selva + rio).
   - `LANE_ZONE = {"TOP": "top", "MIDDLE": "mid", "BOTTOM": "bot"}`.
   - `_positions(timeline, minute) -> {pid: (x, y)}`, a partir do frame do minuto.
   - `positioning(match, timeline, pids) -> dict[pid, dict]`. Para cada pid:
     - `zones`: lista com a zona em cada minuto;
     - `laneMinutes` e `firstLeftLane`: minutos 2–14 (no minuto 1 ainda tem leash/caminhada), só se `teamPosition` estiver em `LANE_ZONE`; `base` (recall) não conta como saída de rota;
     - `avgNearestAlly`: distância média até o aliado mais próximo;
     - `isolatedMinutes`: minutos com o aliado mais próximo a mais de 3000 unidades;
     - `deaths`: lista `[{minute, zone, alliesNear, enemiesNear, enemiesInvolved, isolated}]` (`enemiesInvolved` = quem matou + assistências, exato; adicionado porque, nas partidas reais, `enemiesNear` muitas vezes dá 0, já que a foto é de até 59 s antes), com raio de 2000 e posições do frame `floor(minute)`, contadas a partir da `position` do evento;
     - fora do dict por pid, `objectives`: lista `[{minute, monsterType, killerTeamId, teamNear, enemyNear}]` com todos os `ELITE_MONSTER_KILL` do jogo e um raio de 3000. `teamNear` conta os jogadores do time dos `pids`; `enemyNear`, os do outro time. Retorno: `{"players": {pid: ...}, "objectives": [...]}`.
   - Conferido na timeline real (`BR1_3233021673`): o frame `n` é a foto no minuto `n` e os eventos dele aconteceram entre `n-1` e `n`, então `floor(minuto)` é a foto anterior ao evento. O morto continua com `position` no frame e não há marcação de morto: aceito o ruído (aliado morto pode contar como "perto") com comentário `ponytail:`.
   - Isolamento ignora o minuto 0 (todos na fonte).
   - `match_detail`: passa a devolver `positioning` (só o meu pid) e `paths` (`{pid: [{minute, x, y}]}` dos 10 jogadores).
   - `team_detail`: passa a devolver `positioning` dos 5 pids do time.
2. `apps/api/tests/test_metrics.py`: fixture pequena com frames e posições escolhidas à mão, e testes para `_zone` (um ponto por zona), `laneMinutes`, `isolatedMinutes`, contexto de morte e contexto de objetivo.
3. `apps/api/app/ai.py`:
   - `_payload` inclui `"posicionamento"`, com os campos acima menos `zones` (trocado por uma contagem de minutos por zona);
   - `_team_payload` inclui `"posicionamento"` por campeão;
   - `SYSTEM` e `SYSTEM_TEAM` ganham uma frase pedindo análise de posicionamento (isolamento antes das mortes, saída de rota, presença em objetivos) e lembrando que a amostra é de 1 por minuto.
4. `docs/riot-api.md`: zonas, raios (2000 e 3000) e o limite de 1 amostra por minuto.

## Arquivos

- `apps/api/app/metrics.py`, `apps/api/tests/test_metrics.py`
- `apps/api/app/ai.py`
- `docs/riot-api.md`

## Verificação

- `cd apps/api && uv run pytest`
- `pnpm --filter web build` (os tipos da web não mudam; só confirma que nada quebrou)
- `pnpm dev`, gerar uma nova análise de uma partida (individual e do time) e conferir se o texto cita posicionamento com minutos.
- Conferir `_zone` numa partida real: as posições do minuto 5 do top, do mid e do bot de cada time devem cair nas próprias rotas.

## Fora deste plano

- Desenhar os trajetos dos 10 jogadores no `MatchMap.tsx` (`paths` já fica disponível para isso).
- Wards, mapa de calor, interpolação, agregação entre partidas.
