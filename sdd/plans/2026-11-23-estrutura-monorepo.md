# Plano: Estrutura do monorepo

- Spec: `sdd/specs/2026-11-23-fundacao-monorepo.md` e `sdd/specs/2026-11-23-metricas-desempenho.md`
- Data: 2026-11-23

## Objetivo

Deixar o repositório pronto para trabalhar no fluxo SDD, com web e api rodando e o cálculo de métricas testado.

## Passos

1. Raiz: `CLAUDE.md` (regras SDD + convenções), `README.md`, `.gitignore`, `.env.example`, `package.json` + `pnpm-workspace.yaml`.
2. `docs/riot-api.md` com endpoints, campos e limites da Riot API.
3. `apps/api` (uv, Python 3.12): FastAPI, httpx, pandas. Módulos `riot.py` (cliente + cache em disco + 429), `metrics.py` (função pura), `main.py` (rotas). Teste em `tests/test_metrics.py`.
4. `apps/web`: Vite React TS + Tailwind + `shadcn init` + componentes `table`, `card`, `input`, `button`. Tela única: busca Riot ID e lista métricas por partida.
5. Rodar o teste da api e o build do web.

## Arquivos

- `CLAUDE.md`, `README.md`, `.gitignore`, `.env.example`, `package.json`, `pnpm-workspace.yaml`
- `docs/riot-api.md`
- `apps/api/{pyproject.toml, app/main.py, app/riot.py, app/metrics.py, tests/test_metrics.py}`
- `apps/web/**` (gerado pelo Vite/shadcn) + `src/App.tsx`

## Verificação

- `cd apps/api && uv run pytest`
- `pnpm --filter web build`

Resultado (2026-11-23): 2 testes passando, build do web ok. Desvio: `shadcn@2.10` falhou no init com Tailwind v4; usado `shadcn@3.5.0`. Sem `RIOT_API_KEY`, a api responde 503 com mensagem clara.

## Fora deste plano

- Coleta de benchmark por elo, notebooks, banco de dados, deploy.
