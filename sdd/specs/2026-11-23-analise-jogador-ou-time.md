# Spec: Escolher o alvo da análise com IA (jogador ou time)

## Problema

A análise com IA só avalia o jogador buscado. Não dá para analisar outro jogador da partida nem o desempenho coletivo de um time.

## Resultado esperado

No painel de IA do detalhe da partida, um seletor escolhe o alvo:

- qualquer um dos 10 jogadores (padrão: o jogador buscado);
- seu time ou o time inimigo inteiro.

Análise de jogador segue como hoje. Análise de time olha os 5 jogadores juntos: diferença de ouro/XP do time por minuto, lutas, mortes, objetivos e quem pesou em cada erro. O formato da resposta é o mesmo (resumo, erros com momento, acertos, melhorias).

Cada alvo tem sua análise salva no Postgres; trocar o seletor mostra a análise salva daquele alvo, se existir.

## Fora de escopo

- Analisar dois alvos juntos ou comparar análises.
- Histórico de várias análises do mesmo alvo.

## Critérios de aceite

- [ ] O seletor lista os 10 jogadores e os 2 times, com o jogador buscado selecionado.
- [ ] Trocar o alvo carrega a análise salva dele ou mostra "Ainda não analisada".
- [ ] Analisar um time gera análise coletiva e salva separada das análises de jogadores.
- [ ] Análises já salvas de jogadores continuam aparecendo.
