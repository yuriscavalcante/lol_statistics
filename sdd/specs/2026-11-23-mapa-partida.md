# Spec: Mapa da partida (abates, objetivos e estruturas)

## Problema

O detalhe da partida mostra a linha do tempo só como lista. Não dá para ver **onde** as mortes, abates e objetivos aconteceram. A pasta `lol_gis/` já mostra como tirar isso da timeline: todo `CHAMPION_KILL`, `ELITE_MONSTER_KILL` e `BUILDING_KILL` traz `position {x, y}` em coordenadas do jogo (0 a ~15000, origem no canto inferior esquerdo, base azul) e cada `participantFrame` traz a posição do jogador a cada minuto.

## Resultado esperado

No detalhe da partida, um card "Mapa" com o minimapa do Summoner's Rift (Data Dragon `map11.png`) e, por cima:

- todos os abates de campeão da partida: suas mortes, seus abates/assistências, outros do seu time e do time inimigo, com cores diferentes;
- objetivos (dragão, arauto, barão etc.) e estruturas destruídas;
- seu trajeto (posição a cada minuto), opcional.

Filtros por categoria e um controle "até o minuto N". Passar o mouse num ponto mostra minuto, quem matou e quem morreu.

## Fora de escopo

- Exportar GPKG/shapefile (fica no script `lol_gis/riot_to_gis.py`).
- Mapa de calor, várias partidas no mesmo mapa, trajeto dos outros 9 jogadores.
- Camadas esquemáticas do `sr_layout.py` (o minimapa oficial já mostra rotas, rio e torres).

## Critérios de aceite

- [x] `GET /matches/{id}?puuid=` devolve `mapEvents` (todos os eventos acima que têm posição) e `path` (minha posição por minuto).
- [ ] O card aparece no detalhe com os pontos nas posições certas (morte na base inimiga cai no canto superior direito para quem é azul).
- [ ] Os filtros e o controle de minuto escondem/mostram pontos.
- [x] `uv run pytest` e `pnpm --filter web build` passam.
