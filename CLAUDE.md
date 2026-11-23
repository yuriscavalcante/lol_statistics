# riot-statistics

Monorepo para estudo de desempenho no League of Legends com dados da Riot API.

- `apps/api`: Python 3.12, FastAPI, gerenciado com `uv`.
- `apps/web`: React + TypeScript + Vite + shadcn/ui, gerenciado com `pnpm`.
- `docs/riot-api.md`: endpoints e campos da Riot usados. Leia antes de mexer em coleta ou métricas.
- `data/raw/`: cache das respostas da Riot (fora do git).

## SDD (obrigatório)

Ordem fixa: spec → plano salvo em disco → execução.

- Todo plano vai para `sdd/plans/YYYY-MM-DD-assunto-curto.md` (modelo `sdd/templates/plan.md`) **antes** de editar código, criar arquivo ou rodar comando que altere o projeto. Vale para feature, correção, refactor e plano feito no modo Plan.
- Comportamento novo ou critério de aceite: spec em `sdd/specs/` (modelo `sdd/templates/spec.md`) antes do plano. Correção pequena: a spec pode ser a seção Objetivo do plano.
- Implemente só o que o plano descreve. Mudou o rumo? Atualize o plano e só então continue.
- Responder pergunta sem alterar o projeto não exige plano.
- Specs e planos em português.

## Convenções

- Chave da Riot só via `RIOT_API_KEY` (`.env` na raiz). Nunca commitar.
- Toda chamada à Riot passa por `apps/api/app/riot.py` (cache em disco + tratamento de 429).
- Cálculo de métricas é função pura em `apps/api/app/metrics.py`, testado sem rede.
- Comandos: `pnpm dev` (tudo), `cd apps/api && uv run pytest`, `pnpm --filter web build`.
