# Plano: Swagger da API

- Spec: correção pequena, sem spec separada
- Data: 2026-11-24

## Objetivo

Swagger acessível em dev (`http://localhost:8000/docs`) e em prod. A API passa a ser exposta no host em prod (`${API_PORT:-8000}`), e o Swagger fica em `http://<vps>:8000/docs`, igual ao dev.

Antes cogitamos usar `--root-path /api` para servir o Swagger via nginx em `/api/docs`. Descartado: com a flag, o `/docs` acessado direto na porta da API busca `/api/openapi.json` e recebe 404.

## Passos

1. Expor a API no `docker-compose.prod.yml`: `ports: "${API_PORT:-8000}:8000"`.
2. Manter o `CMD` do `apps/api/Dockerfile` sem `--root-path`.

## Arquivos

- `docker-compose.prod.yml`
- `apps/api/Dockerfile`

## Verificação

- Dev: `GET http://localhost:8000/docs` e `/openapi.json` respondem 200.
- Prod: `http://<vps>:8000/docs` carrega e o "Try it out" funciona; o app em `:8085` continua chamando `/api/...` pelo nginx.

## Fora deste plano

- Swagger em `/api/docs` pelo nginx.
- Descrições, tags ou exemplos nos endpoints.
