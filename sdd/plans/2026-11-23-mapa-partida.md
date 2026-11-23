# Plano: mapa da partida com mortes, abates e objetivos

- Spec: `sdd/specs/2026-11-23-mapa-partida.md`
- Data: 2026-11-23

## Objetivo

Levar para o app o que o `lol_gis/riot_to_gis.py` faz com a timeline (eventos com posição + trajeto), mostrando num mapa SVG no detalhe da partida em vez de gerar arquivos GIS.

## Passos

1. `apps/api/app/metrics.py` → `match_detail` ganha:
   - `mapEvents`: todos os eventos `EVENT_TYPES` com `position`, com `minute` (sem filtrar por jogador).
   - `path`: `[{minute, x, y}]` do meu `participantFrame` em cada frame que tiver `position`.
2. `apps/api/tests/test_metrics.py`: fixture com `position` num evento e num frame; testar `mapEvents` e `path`.
3. `apps/web/src/MatchMap.tsx` (novo): SVG com `<image>` do `map11.png` (Data Dragon, `ddVersion` que já existe). Conversão: `px = (x - MIN) / (MAX - MIN)`, `py = 1 - (y - MIN) / (MAX - MIN)`, com limites do minimapa `MIN = -120`, `MAX = 14870`. Categorias: minhas mortes, meus abates/assistências, abates do meu time, abates do inimigo, objetivos, estruturas, meu trajeto. Botões liga/desliga por categoria (`Button` do shadcn), `<input type="range">` para o minuto, `<title>` como tooltip.
4. `apps/web/src/MatchDetail.tsx`: tipos `mapEvents`/`path` em `Detail` e o card "Mapa" ao lado da linha do tempo.
5. `docs/riot-api.md`: citar `position` dos eventos e dos `participantFrames` e o sistema de coordenadas.

6. Tooltip próprio (substitui o `<title>`): ao passar o mouse num ponto, card HTML posicionado sobre o mapa, com fundo da cor do indicador, mostrando o minuto, foto + nome do campeão que abateu → foto + nome da vítima, e as assistências (foto + nome). Objetivos/estruturas: minuto, texto e foto de quem pegou, se houver. Fotos via Data Dragon (`img/champion/{championName}.png`).

## Arquivos

- `apps/api/app/metrics.py`, `apps/api/tests/test_metrics.py`
- `apps/web/src/MatchMap.tsx` (novo), `apps/web/src/MatchDetail.tsx`
- `docs/riot-api.md`

## Verificação

- `cd apps/api && uv run pytest`
- `pnpm --filter web build`
- `pnpm dev`, abrir uma partida: pontos no mapa, filtros e minuto funcionando.

## Fora deste plano

- Exportação GIS, mapa de calor, várias partidas, trajeto dos outros jogadores, camadas do `sr_layout.py`.
- Mexer na pasta `lol_gis/` (continua como script avulso).
