# Spec: nota 0–10 dos jogadores na partida

## Problema

A tabela da partida mostra K/D/A, CS, ouro, dano e visão, mas não dá uma leitura rápida de quem jogou bem. Falta um número único por jogador para comparar os 10.

## Resultado esperado

- Cada um dos 10 participantes do detalhe da partida (`GET /matches/{id}`) recebe `grade`: nota de 0 a 10, uma casa decimal.
- A nota é relativa à própria partida: 5 = jogador médio daquela partida.
- Cálculo: para cada estatística, razão entre o valor do jogador e a média dos 10, limitada a [0, 2]. Nota = 5 × soma ponderada das razões, limitada a [0, 10].
  - Estatísticas: KDA `(k+a)/max(d,1)`, participação em abates, dano a campeões, ouro, CS (rota + selva), placar de visão.
  - Pesos padrão: KDA 0,25 · KP 0,20 · dano 0,20 · ouro 0,15 · CS 0,10 · visão 0,10.
  - Suporte (`UTILITY`): KDA 0,25 · KP 0,25 · dano 0,10 · ouro 0,05 · CS 0 · visão 0,35.
  - Média zero numa estatística: razão 1 para todos.
- Função pura em `apps/api/app/metrics.py`, testada sem rede.
- Nova coluna "Nota" na tabela de jogadores da tela de detalhe; a maior nota da partida ganha destaque.

## Fora de escopo

- Nota na lista de partidas e na análise de time.
- Comparação com benchmark por elo.
- Nota dada pelo Gemini.
- Bônus por vitória ou objetivos.

## Critérios de aceite

- [ ] Partida com todos iguais: todos têm nota 5,0.
- [ ] Jogador com estatísticas acima da média tem nota > 5; abaixo, < 5.
- [ ] Suporte não é punido por CS baixo (peso 0).
- [ ] Nota fica entre 0 e 10.
- [ ] `uv run pytest` e `pnpm --filter web build` passam.
