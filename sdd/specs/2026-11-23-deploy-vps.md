# Spec: Deploy automático na VPS

## Problema

Produção sobe à mão com `docker compose -f docker-compose.prod.yml up -d --build`. Push em `main` deveria publicar sozinho na VPS.

## Resultado esperado

Workflow do GitHub Actions que, em push na `main`:

1. Roda os testes da API.
2. Entra na VPS por SSH, faz `git pull --ff-only` e recria os containers com o compose de produção.

Chave SSH e host ficam nos Secrets do repositório. O `.env` continua só na VPS.

## Fora de escopo

- Provisionar a VPS (Docker, clone, `.env`, chaves): checklist no plano, uma vez, manual.
- Build da imagem no GitHub ou registry. O build segue na VPS.
- HTTPS, domínio, proxy reverso.
- Outras branches.

## Critérios de aceite

- [ ] `.github/workflows/deploy.yml` dispara em `push` na `main` e em `workflow_dispatch`.
- [ ] Deploy só roda se `pytest` da API passar.
- [ ] Comando remoto: `git pull --ff-only` e `docker compose -f docker-compose.prod.yml up -d --build` em `/opt/riot-statistics`.
- [ ] Host, usuário, chave e known_hosts vêm de secrets.
- [ ] Dois pushes seguidos não disparam dois deploys ao mesmo tempo.
