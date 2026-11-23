# Plano: popup do select no tema escuro

- Spec: correção pequena, sem spec separada
- Data: 2026-11-23

## Objetivo

No Windows e no Linux o menu nativo do `<select>` ignora as cores CSS e sai claro com o app no tema escuro. Declarar `color-scheme` no tema faz o navegador pintar esse menu (fila e alvo da análise) no mesmo esquema da página.

## Passos

1. Em `apps/web/src/index.css`, `color-scheme: light` em `:root` e `color-scheme: dark` em `.dark`.

## Arquivos

- `apps/web/src/index.css`

## Verificação

- Com a classe `dark` no `<html>`, o `color-scheme` computado do select da fila é `dark`; no tema claro, `light`.

## Fora deste plano

- Trocar o select nativo por um menu customizado.
