# Plano: timeline do mapa com início e fim

- Spec: correção pequena, sem spec separada
- Data: 2026-11-23

## Objetivo

O slider do mapa só define o fim ("até o minuto"): o início fica preso em 0. Deve dar para recortar dos dois lados, por exemplo do minuto 14 ao 20, mostrando só eventos e trajeto dentro do intervalo.

## Passos

1. Em `apps/web/src/MatchMap.tsx`, trocar `upTo` por `from`/`to`. São dois `<input type="range">` nativos sobrepostos no mesmo trilho: só os thumbs recebem o ponteiro e um não passa do outro.
2. `shown` e `trail` filtram `from <= minute <= to`. O rótulo mostra `from′–to′`.

## Arquivos

- `apps/web/src/MatchMap.tsx`
- `apps/web/src/index.css` (estilo dos thumbs do slider duplo)

## Verificação

- `pnpm --filter web build` passa.
- No navegador, os dois thumbs se arrastam; os eventos fora do intervalo somem.

## Fora deste plano

- Lib de slider (Radix/shadcn Slider).
