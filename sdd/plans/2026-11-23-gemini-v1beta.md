# Plano: corrigir "Developer instruction is not enabled for api version v1"

- Spec: correção pequena, sem spec separada
- Data: 2026-11-23

## Objetivo

`POST /matches/{id}/analysis` falha com `400 INVALID_ARGUMENT: Developer instruction is not enabled for api version v1. Use api version v1beta instead.`. Causa: no google-genai 3.6.1, a versão padrão da Gemini API passou a ser `v1` (`GOOGLE_AI_API_DEFAULT_VERSION = 'v1'` em `_api_client.py`), e a `v1` não aceita `system_instruction`. A análise deve voltar a funcionar.

## Passos

1. `app/ai.py`: `genai.Client(api_key=key, http_options=types.HttpOptions(api_version="v1beta"))`.

## Arquivos

- `apps/api/app/ai.py`

## Verificação

- `cd apps/api && uv run pytest`
- Clicar "Analisar com IA" numa partida: a análise aparece.

## Fora deste plano

- Fixar a versão do google-genai no `pyproject.toml`.
