# Spec: Filtro de fila na busca

## Problema

A análise sempre pede partidas da fila 420 (Solo/Duo). Quem joga Flex, Normal, Swiftplay ou ARAM não consegue ver as próprias estatísticas.

## Resultado esperado

Na busca, um seletor escolhe a fila. O pedido à API manda `queue` com o id da Riot. O padrão continua Solo/Duo.

| Rótulo | `queue` |
|---|---|
| Solo/Duo | 420 |
| Flex | 440 |
| Normal | 490 |
| Swiftplay | 480 |
| ARAM | 450 |

## Fora de escopo

- Todas as filas de uma vez, modos rotativos e TFT.
- Lista de filas vinda da API.

## Critérios de aceite

- [x] O seletor aparece junto da busca, com Solo/Duo selecionado.
- [x] Analisar envia `?queue=` igual à opção escolhida.
- [x] Trocar a fila sem clicar em Analisar não dispara outra coleta.
