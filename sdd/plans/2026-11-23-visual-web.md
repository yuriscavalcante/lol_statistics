# Plano: melhorar o visual do front

- Spec: correção pequena, sem spec separada
- Data: 2026-11-23

## Objetivo

Deixar a tela de análise mais legível e com identidade visual, sem mudar dados nem chamadas à API:

- tema escuro por padrão com acento dourado;
- cabeçalho com título e subtítulo;
- cards de resumo com rótulos em português, ícone e taxa de vitória;
- tabela dentro de card, números alinhados (`tabular-nums`), faixa lateral verde/vermelha por vitória/derrota;
- estado vazio e mensagem de erro destacada.

## Passos

1. `index.html`: `lang="pt-BR"`, classe `dark` no `<html>`, título "Riot Statistics".
2. `src/index.css`: trocar `--primary`/`--ring` do tema escuro por dourado; remover `@apply` duplicados.
3. `src/App.tsx`: novo layout (cabeçalho, busca com ícone, cards de resumo com winrate, tabela em card, estado vazio).

## Arquivos

- `apps/web/index.html`
- `apps/web/src/index.css`
- `apps/web/src/App.tsx`

## Verificação

- `pnpm --filter web build` sem erros.

## Adendo (2026-11-23): tema claro/escuro e ícones de campeão

4. `index.html`: script inline que aplica `dark` conforme `localStorage.theme` (padrão escuro), sem piscar.
5. `src/index.css`: `--primary`/`--ring` do tema claro em dourado escuro (contraste no branco).
6. `src/App.tsx`: botão sol/lua no cabeçalho que alterna a classe `dark` e salva em `localStorage`; cores verde/vermelho com variante `dark:`.
7. `src/App.tsx`: busca a versão atual em `https://ddragon.leagueoflegends.com/api/versions.json` (estático, sem chave, ver `docs/riot-api.md`) e mostra `cdn/{versão}/img/champion/{championName}.png` ao lado do campeão; se a imagem falhar, some.

## Fora deste plano

- Gráficos.
