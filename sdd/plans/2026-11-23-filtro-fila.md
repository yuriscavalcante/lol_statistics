# Plano: filtro de fila na busca

- Spec: `sdd/specs/2026-11-23-filtro-fila.md`
- Data: 2026-11-23

## Objetivo

Deixar escolher a fila na tela. A API já aceita `queue` em `GET /players/{game}/{tag}/matches` (padrão 420) e `riot.match_ids` já repassa o parâmetro. Nenhuma mudança no backend.

## Passos

1. Em `apps/web/src/App.tsx`, `<select>` nativo com as cinco filas da spec, estado inicial 420.
2. Incluir `?queue=` na URL do `fetch` no submit. Trocar o select não busca sozinho.

## Arquivos

- `apps/web/src/App.tsx`

## Verificação

- `pnpm --filter web build` sem erros.
- No navegador: o select existe, Solo/Duo é o padrão, e o pedido de Analisar leva `queue` da opção escolhida.

## Fora deste plano

- Novas filas, opção "todas", componente de select do shadcn.
