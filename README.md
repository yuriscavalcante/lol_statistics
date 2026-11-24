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

## Vídeos de referência para a IA

`pnpm video <link> [outro link...]` no terminal (mostra a % de redução) ou `POST /videos?url=<link>` no Swagger baixa a legenda sem IA, salva a transcrição inteira
(`videos`) e um resumo por regras (`video_trechos`: blocos de 60 s limpos, só os com termos de jogo). Na análise, os
5 blocos mais relevantes para os campeões/rotas da partida vão junto para o Gemini. O YouTube pode bloquear o download
da legenda a partir do IP da VPS; nesse caso, cadastre os vídeos rodando a API local apontando para o banco de prod.

```bash
pnpm video "<link>"           # aspas: o zsh quebra links com ? e &
pnpm video --reprocessar      # refaz os resumos de todos os vídeos a partir da transcrição salva (sem YouTube)
curl -X POST -G localhost:8000/perguntar --data-urlencode "pergunta=como controlar a wave de assassino?"
```
