# Plano: Deploy automático na VPS

- Spec: `sdd/specs/2026-11-23-deploy-vps.md`
- Data: 2026-11-23

## Objetivo

Workflow que testa e publica `main` na VPS por SSH, reusando `docker-compose.prod.yml`. A imagem continua sendo buildada na VPS.

## Como funciona

```
push main (ou workflow_dispatch)
  → job test: uv run --frozen pytest em apps/api
  → job deploy (environment lol_statistics, SSH), só se o teste passou:
       cd /opt/riot-statistics
       git pull --ff-only
       docker compose -f docker-compose.prod.yml up -d --build
```

Volume `pgdata` e `./data` permanecem. `.env` está no `.gitignore` e não é sobrescrito pelo pull.

`concurrency` no grupo `deploy` com `cancel-in-progress: false`: um deploy termina antes do próximo começar.

## O que a VPS precisa (uma vez)

1. Docker Engine + plugin Compose. Usuário de deploy no grupo `docker` (o workflow não usa sudo).
2. `/opt/riot-statistics`: clone com deploy key read-only no GitHub, para `git pull` sem senha. Essa chave é da VPS → GitHub, separada da chave do Actions.
3. `.env` nesse diretório: `RIOT_API_KEY`, `GEMINI_API_KEY`, `POSTGRES_PASSWORD`. O compose sobrescreve `DATABASE_URL`.
4. Porta `${WEB_PORT:-8080}` aberta para quem usa o site. SSH (22, ou `VPS_PORT`) alcançável pelos runners do GitHub.
5. Segundo par de chaves, só para o Actions entrar na VPS:
   - pública em `~/.ssh/authorized_keys` do usuário de deploy
   - privada no secret `VPS_SSH_KEY` (PEM completo, com quebras de linha)
6. `ssh-keyscan -H <host>` → secret `VPS_KNOWN_HOSTS`.

Secrets no environment `lol_statistics` (o job `deploy` declara `environment: lol_statistics`; secret de environment não chega no job sem isso):

| Secret | Conteúdo |
| --- | --- |
| `VPS_HOST` | IP ou domínio |
| `VPS_USER` | usuário de deploy |
| `VPS_SSH_KEY` | chave privada PEM |
| `VPS_KNOWN_HOSTS` | saída de `ssh-keyscan -H` |
| `VPS_PORT` | opcional; vazio = 22 |

Bootstrap na VPS, como o usuário de deploy:

```bash
sudo mkdir -p /opt/riot-statistics && sudo chown "$USER" /opt/riot-statistics
git clone git@github.com:<dono>/riot-statistics.git /opt/riot-statistics
# .env já preenchido, fora do git
cd /opt/riot-statistics && docker compose -f docker-compose.prod.yml up -d --build
```

## Passos

1. Criar `.github/workflows/deploy.yml` com os dois jobs, `environment: lol_statistics` no deploy, e os secrets acima.

## Arquivos

- `.github/workflows/deploy.yml`

## Verificação

- Nenhum secret no arquivo.
- Comando remoto é o mesmo do README de produção, precedido de `git pull --ff-only`.
- O SSH de verdade só roda depois dos secrets e do clone na VPS.

## Fora deste plano

- Criar os secrets e preparar a VPS (checklist acima).
- Registry, HTTPS, rollback automático.
