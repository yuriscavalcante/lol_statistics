# Spec: consulta na URL

## Problema

A busca e a partida aberta vivem só no estado do React. Não dá para mandar o link de uma partida específica para alguém.

## Resultado esperado

- A URL reflete a consulta: `?player=Nome%23TAG&queue=420` e, com uma partida aberta, `&match=BR1_123`.
- Abrir esse link carrega o jogador, a fila e, se houver `match`, abre o detalhe da partida direto.
- Voltar/avançar do navegador alterna entre lista e partida.

## Fora de escopo

- Roteador (react-router etc.), rotas por path.
- Guardar na URL o alvo da análise de IA (jogador/time) ou a métrica do gráfico.

## Critérios de aceite

- [ ] Analisar atualiza a URL com `player` e `queue`.
- [ ] Clicar numa partida adiciona `match`; Voltar remove.
- [ ] Colar a URL com `match` numa aba nova abre o detalhe dessa partida.
- [ ] Botões voltar/avançar do navegador funcionam.
