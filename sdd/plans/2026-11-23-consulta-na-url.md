# Plano: consulta na URL

- Spec: `sdd/specs/2026-11-23-consulta-na-url.md`
- Data: 2026-11-23

## Objetivo

Guardar `player`, `queue` e `match` na query string para compartilhar partidas. Sem backend novo e sem dependência: `URLSearchParams` + `history.pushState` + `popstate`.

## Passos

1. Em `apps/web/src/App.tsx`, separar o fetch das partidas em `load(player, queue)`, com a validação `Nome#TAG`.
2. Trocar `selected: Metrics` por `selectedId: string`. O `puuid` vem de `rows[0]` (todas as linhas são do mesmo jogador), então o link não precisa do puuid e funciona mesmo se a partida não estiver entre as recentes.
3. Analisar faz `pushState` com `player` e `queue`; clicar numa partida faz `pushState` com `match`; o botão Voltar faz `pushState` sem `match`.
4. `fromUrl()` lê a query no carregamento e no `popstate`: preenche input e fila, define `selectedId` e só refaz o fetch se jogador/fila mudaram (ref com a última chave carregada).

## Arquivos

- `apps/web/src/App.tsx`

## Verificação

- `pnpm --filter web build` sem erros.
- No navegador: buscar, abrir partida, copiar URL, abrir em aba nova → detalhe aparece; voltar/avançar do navegador alterna lista/detalhe.

## Fora deste plano

- Roteador, URL para alvo da IA ou métrica do gráfico.
