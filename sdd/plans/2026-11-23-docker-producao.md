# Plano: Docker para produção

- Spec: correção pequena, sem spec separada
- Data: 2026-11-23

## Objetivo

Subir API, web e Postgres em produção com um comando: `docker compose -f docker-compose.prod.yml up -d --build`. Web acessível em `http://<host>:8080`, API servida no mesmo host sob `/api` (sem CORS).

## Passos

1. `apps/api/Dockerfile`: python:3.12-slim + uv, `uv sync --frozen --no-dev`, `fastapi run`. Código em `/srv/apps/api` para `riot.py` achar `ROOT=/srv` (cache em `/srv/data/raw`).
2. `apps/web/Dockerfile`: build com pnpm (contexto na raiz por causa do lockfile/workspace), `VITE_API_URL=/api`, servido por nginx.
3. `apps/web/nginx.conf`: SPA + `location /api/` → `http://api:8000/` (timeout maior por causa do Gemini).
4. `.dockerignore` na raiz: fora `node_modules`, `.venv`, `dist`, `data`, `.env`.
5. `docker-compose.prod.yml`: db (sem porta exposta), api (`env_file: .env`, `DATABASE_URL` apontando para `db`, volume para `data/raw`), web (porta 8080).

## Arquivos

- `apps/api/Dockerfile`, `apps/web/Dockerfile`, `apps/web/nginx.conf`, `.dockerignore`, `docker-compose.prod.yml`, `README.md` (comando).

## Verificação

- `docker compose -f docker-compose.prod.yml build` sem erro.
- `up -d`, `curl localhost:8080` devolve o HTML e `curl localhost:8080/api/docs` responde 200.

## Fora deste plano

- HTTPS/TLS (colocar atrás de um proxy reverso do host).
- CI/registry de imagens.
