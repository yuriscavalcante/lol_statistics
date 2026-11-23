# Plano: tamanho do select de fila

- Spec: correção pequena, sem spec separada
- Data: 2026-11-23

## Objetivo

O select de fila usa `text-sm` fixo e a largura intrínseca (~106px). Abaixo de `md`, o input ao lado é `text-base` (16px), então o select fica visualmente menor e justo para "Swiftplay".

## Passos

1. Em `apps/web/src/App.tsx`, o `<select>` da fila usa a escala do input (`text-base md:text-sm`). A largura segue o rótulo selecionado (um `<span>` invisível com a mesma borda, senão o texto perde 2px e corta). A seta nativa some (`appearance-none`) e um `ChevronDown` fica no fim desse rótulo. O `pr` do span é maior que o do select, senão a caixa útil fica igual ao texto e a última letra corta.

## Arquivos

- `apps/web/src/App.tsx`

## Verificação

- No navegador, o rótulo inteiro aparece e a seta fica logo depois dele.

## Fora deste plano

- Componente de select do shadcn.
