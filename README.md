# riot-statistics

Estudo de desempenho no League of Legends com dados da Riot API: farm, ouro, xp, abates/mortes e diferença contra o oponente de rota aos 10 e 15 minutos.

```
apps/api   FastAPI (Python 3.12, uv): coleta na Riot + cálculo de métricas
apps/web   React + Vite + shadcn/ui
docs/      referência da Riot API (endpoints, campos, limites)
sdd/       specs e planos (spec → plano → execução)
data/raw/  cache das partidas (fora do git, pronto para pandas)
```

## Rodar

```bash
cp .env.example .env          # RIOT_API_KEY (developer.riotgames.com) e GEMINI_API_KEY (aistudio.google.com)
docker compose up -d          # Postgres das análises de IA
pnpm install
pnpm dev                      # api :8000, web :5173
pnpm test                     # testes da api
```

## Produção

```bash
cp .env.example .env          # mesmas chaves; DATABASE_URL é sobrescrita pelo compose
docker compose -f docker-compose.prod.yml up -d --build   # web + api em :8080 (api em /api)
```

## Análise offline

Partidas e timelines ficam em `data/raw/{match,timeline}/*.json`. Exemplo:

```python
import json, pathlib, pandas as pd
from app.metrics import compute_metrics
rows = [compute_metrics(json.loads(m.read_text()), json.loads((m.parent.parent / "timeline" / m.name).read_text()), PUUID)
        for m in pathlib.Path("../../data/raw/match").glob("*.json")]
pd.DataFrame(rows).describe()
```
