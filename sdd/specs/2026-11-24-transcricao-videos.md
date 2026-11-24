# Spec: Transcrição de vídeos como referência para a IA

## Problema

A análise com IA usa só os dados da partida. Vídeos de coaching sobre o assunto têm conhecimento útil, mas o vídeo inteiro custaria tokens demais para mandar ao Gemini.

## Resultado esperado

`POST /videos?url=<link do YouTube>` baixa a legenda do vídeo (manual ou automática, pt ou en) **sem IA**, só com Python:

1. Salva a transcrição inteira no Postgres (trechos com tempo).
2. Gera o modo resumido também sem IA: junta os trechos em blocos de 60 s, tira muletas ("né", "tipo", "então"...) e repetições, descarta blocos sem nenhum termo de jogo (glossário fixo) e salva os blocos com o minuto do vídeo.
3. Responde com o tamanho original e o resumido (em caracteres) e os blocos salvos.

Reenviar o mesmo vídeo sobrescreve.

Na análise (jogador ou time), a API busca no Postgres (busca de texto completo, `portuguese`) os 5 blocos mais relevantes para os campeões/rotas da partida e manda só eles ao Gemini como `trechosDeVideos`. A IA é usada só aí.

### Revisão de tokens (2026-11-24)

Com 10 vídeos reais, o resumo cortava só 11%. Medido: tirar palavras vazias do português (mantendo negações como "não", "nunca", "sem") leva a 46%. O resumo passa a tirá-las. Os trechos vão ao Gemini só como texto (sem URL repetida). Mudar a regra não exige baixar de novo: `pnpm video --reprocessar` refaz os resumos a partir das transcrições inteiras salvas.

### Perguntar à base

`POST /perguntar?pergunta=...` (para usar com curl) busca os 8 blocos mais relevantes para as palavras da pergunta e pede ao Gemini uma resposta baseada só neles. Devolve `resposta` e `fontes` (link do vídeo já no minuto do bloco).

## Fora de escopo

- Vídeo sem legenda (exigiria reconhecimento de voz) e vídeo fora do YouTube.
- Playlist ou canal inteiro de uma vez.
- Tela no web para cadastrar vídeos (cadastro pelo Swagger).
- Embeddings / pgvector.

## Critérios de aceite

- [ ] `POST /videos` com link válido salva transcrição inteira e blocos resumidos; o resumo é menor que o original.
- [ ] Link inválido → 400; vídeo sem legenda ou bloqueado pelo YouTube → 502 com mensagem.
- [ ] Limpeza, blocos e filtro do resumo são funções puras testadas sem rede.
- [ ] Análise com vídeos cadastrados envia no máximo 5 blocos ao Gemini; sem vídeos, funciona como antes.
- [ ] Resumo sem palavras vazias, com negações preservadas; `--reprocessar` atualiza todos os vídeos salvos e mostra a %.
- [ ] `curl -X POST -G localhost:8000/perguntar --data-urlencode "pergunta=..."` responde com base nos vídeos e lista as fontes; sem bloco relevante, responde que a base não cobre o assunto sem chamar o Gemini.
