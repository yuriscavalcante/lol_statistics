# Spec: Replay no mapa e dano do abate

## Problema

O mapa mostra eventos parados. Não dá para ver como os 10 campeões se moveram até uma luta, e o tooltip do abate não diz com o que o jogador morreu.

## Resultado esperado

- Botão "Replay" no card do mapa: o ícone de cada campeão anda pelo mapa dentro do intervalo `from′–to′` já escolhido. A posição vem de `paths` (1 amostra por minuto) com interpolação linear entre minutos, então o trajeto é aproximado. Os eventos aparecem conforme o tempo passa.
- Controles: tocar/pausar, velocidade (1×, 2×, 4× = minutos de jogo por segundo), barra para arrastar o tempo e o relógio `mm:ss`.
- O tooltip de `CHAMPION_KILL` mostra o dano recebido pela vítima (`victimDamageReceived`), agrupado por quem causou: Q/W/E/R, Passiva, Ataque básico, Ignite, Smite, item ativo e o total.

## Fora de escopo

- Flash e outros feitiços que não causam dano: a timeline não registra o uso.
- Saber quem está morto: a timeline não marca. O ícone continua no mapa.
- Trajeto real entre os minutos (só existe 1 amostra por minuto).
- Ícones das habilidades (exigiria o JSON de cada campeão no Data Dragon).

## Critérios de aceite

- [x] O replay move os 10 ícones, com o anel na cor do time (o seu em destaque), e respeita o intervalo.
- [x] Pausar, mudar a velocidade e arrastar a barra funcionam; ao sair do replay o mapa volta ao estado estático.
- [x] O tooltip do abate lista o dano por fonte quando `victimDamageReceived` existe.
- [x] `pnpm --filter web build` passa.
