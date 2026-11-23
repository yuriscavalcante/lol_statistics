# Spec: Detalhe da partida e análise com IA

## Problema

A lista mostra só um resumo por partida. Não dá para ver tudo o que aconteceu num jogo, nem saber o que foi feito de errado e onde melhorar.

## Resultado esperado

Clicar numa partida abre uma tela com todas as estatísticas que a Riot devolve dela: placar dos 10 jogadores, objetivos dos times, todas as estatísticas do jogador (incluindo `challenges`), evolução minuto a minuto contra o oponente de rota e linha do tempo de abates, mortes e objetivos.

Um botão "Analisar com IA" envia os dados ao Gemini, que devolve resumo, erros (com o momento), acertos e melhorias. A análise é salva no Postgres e volta ao reabrir a partida, sem nova chamada à IA. Reanalisar sobrescreve.

## Fora de escopo

- Histórico de várias análises da mesma partida.
- Análise de várias partidas juntas, benchmark por elo, chat com a IA.
- Autenticação.

## Critérios de aceite

- [ ] Clicar numa linha da tabela abre o detalhe; Voltar retorna à lista sem nova busca.
- [ ] O detalhe mostra os 10 jogadores, objetivos dos times, todos os `challenges` do jogador, gráfico de diferença por minuto e linha do tempo.
- [ ] "Analisar com IA" gera e mostra resumo, erros, acertos e melhorias.
- [ ] Reabrir a partida mostra a análise salva sem chamar o Gemini.
- [ ] Falta de `GEMINI_API_KEY` ou banco fora do ar vira mensagem de erro na tela, sem quebrar o detalhe.
