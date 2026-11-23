# Plano: nota 0–10 dos jogadores

- Spec: `sdd/specs/2026-11-23-nota-jogadores.md`
- Data: 2026-11-23

## Objetivo

Calcular uma nota relativa à partida para os 10 jogadores e mostrá-la na tabela do detalhe.

## Passos

1. `apps/api/app/metrics.py`: função pura `grades(participants) -> {participantId: nota}` com os pesos da spec.
2. `match_detail`: incluir `grade` em cada item de `participants`.
3. `apps/api/tests/test_metrics.py`: teste cobrindo todos iguais = 5, acima/abaixo da média, suporte sem CS e limites 0–10.
4. `apps/web/src/MatchDetail.tsx`: `grade?: number` no tipo `Participant`, coluna "Nota" na tabela, destaque na maior nota da partida.

## Arquivos

- `apps/api/app/metrics.py`
- `apps/api/tests/test_metrics.py`
- `apps/web/src/MatchDetail.tsx`

## Verificação

- `cd apps/api && uv run pytest`
- `pnpm --filter web build`

## Fora deste plano

- Nota na lista de partidas, na análise de time e no prompt do Gemini.
