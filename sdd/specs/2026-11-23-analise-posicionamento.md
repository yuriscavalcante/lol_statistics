# Spec: Análise de posicionamento

## Problema

A timeline traz a posição de cada um dos 10 jogadores a cada minuto (`participantFrames[pid].position`) e a posição exata de abates e objetivos. Hoje isso só aparece no mapa: o trajeto é só do jogador analisado e nada disso chega à IA. Por isso a análise não diz se a morte aconteceu porque o jogador estava sozinho e longe do time, se ele saiu da rota cedo demais ou se o time não estava perto do dragão.

Limite da Riot: só existe **1 amostra por minuto** por jogador. Dá para ver tendências (rota, rotações, agrupamento, lado do mapa), mas não o posicionamento dentro de uma luta.

## Resultado esperado

Uma função pura em `metrics.py` transforma as posições em números que a IA consegue usar, tanto na análise individual quanto na do time:

- **Zona por minuto** de cada jogador: `base`, `top`, `mid`, `bot`, `jungle` (selva + rio), por uma geometria aproximada do mapa.
- **Fase de rotas (minutos 1–14)**: em quantos minutos o jogador estava na própria rota (só para `TOP`, `MIDDLE` e `BOTTOM`) e em qual minuto ele saiu da rota pela primeira vez.
- **Isolamento**: distância média até o aliado vivo mais próximo e em quantos minutos ele estava a mais de 3000 unidades de qualquer aliado.
- **Contexto de cada morte**: zona da morte, quantos aliados e quantos inimigos estavam a até 2000 unidades no frame anterior e se o jogador estava isolado.
- **Contexto de cada objetivo** (dragão, arauto, barão, Vastilarvas): quantos jogadores de cada time estavam a até 3000 unidades do local no frame anterior.

O detalhe da partida também devolve o trajeto dos 10 jogadores (`paths`), para uso futuro no mapa.

A IA recebe só esse resumo, sem os pontos brutos, e os prompts pedem que ela comente o posicionamento citando minutos.

## Fora de escopo

- Mudanças no mapa da web (desenhar os trajetos dos 10, mapa de calor).
- Posição de wards (`WARD_PLACED` não traz `position`).
- Interpolação entre frames ou estimativa de posição dentro de lutas.
- Agregar o posicionamento entre várias partidas.

## Critérios de aceite

- [x] `positioning(match, timeline, pids)` em `metrics.py` é pura e coberta por testes sem rede: zona, minutos na rota, isolamento, contexto de morte e de objetivo.
- [x] `GET /matches/{id}?puuid=` devolve `positioning` (do jogador) e `paths` (dos 10 jogadores); o `path` atual continua igual.
- [x] O `team_detail` devolve `positioning` dos 5 jogadores do time.
- [x] Os payloads da IA (individual e time) incluem o resumo de posicionamento, e os prompts pedem análise de posicionamento.
- [x] `docs/riot-api.md` explica as zonas e os raios usados.
- [x] `uv run pytest` e `pnpm --filter web build` passam.
