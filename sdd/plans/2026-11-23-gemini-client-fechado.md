# Plano: corrigir "Cannot send a request, as the client has been closed" na análise com IA

- Spec: correção pequena, sem spec separada
- Data: 2026-11-23

## Objetivo

`POST /matches/{id}/analysis` falha com `Cannot send a request, as the client has been closed.`. Causa: em `app/ai.py`, `genai.Client(api_key=key).models.generate_content(...)` cria o `Client` como temporário; sem referência, ele é coletado e o `__del__` do google-genai 3.x fecha o cliente HTTP antes da requisição. A análise deve voltar a funcionar.

## Passos

1. `app/ai.py`: usar `with genai.Client(api_key=key) as client:` e chamar `client.models.generate_content(...)` dentro do bloco.

## Arquivos

- `apps/api/app/ai.py`

## Verificação

- `cd apps/api && uv run pytest`
- Clicar "Analisar com IA" numa partida: a análise aparece.

## Fora deste plano

- Reaproveitar um `Client` global entre requisições.
