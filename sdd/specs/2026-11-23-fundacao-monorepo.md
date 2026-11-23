# Spec: Fundação do monorepo de estudo de desempenho no LoL

## Problema

Quero estudar minhas partidas de League of Legends com dados, não com impressão. Hoje não há onde coletar partidas da API da Riot, calcular métricas de desempenho (farm, gold, xp, abates/mortes) e compará-las com uma referência por elo.

## Resultado esperado

Monorepo com:

- `apps/api`: backend Python (FastAPI) que busca na Riot API a conta (Riot ID → PUUID), a lista de partidas, o detalhe e a timeline de cada partida, e calcula as métricas da spec `2026-11-23-metricas-desempenho.md`.
- `apps/web`: frontend React + TypeScript + shadcn/ui que consome a API.
- `sdd/`: specs e planos.
- `docs/riot-api.md`: endpoints e campos da Riot API usados no projeto.
- Respostas cruas da Riot guardadas em disco (`data/raw/`) para não estourar o rate limit e permitir análise offline (pandas/notebook).

## Fora de escopo

- Login de usuário e multi-tenant.
- Banco de dados (arquivos JSON bastam até o volume pedir outra coisa).
- Deploy.
- Coleta de benchmark por elo (spec própria depois).

## Critérios de aceite

- [ ] `pnpm dev` na raiz sobe web e api.
- [ ] `GET /players/{gameName}/{tagLine}/matches` devolve as métricas por partida.
- [ ] A chave da Riot vem de `RIOT_API_KEY` no `.env`, nunca do código.
- [ ] Respostas 429 da Riot são respeitadas (espera `Retry-After`).
- [ ] O cálculo de métricas tem teste executável sem rede.
