# Spec: Métricas de desempenho por partida

## Problema

Para evoluir é preciso saber onde se perde vantagem: farm, ouro, experiência ou mortes. Totais de fim de jogo escondem o early game, então a análise também precisa de marcos de tempo (10 e 15 min) e da comparação com o oponente direto de rota.

## Resultado esperado

Para cada partida do jogador, calcular:

| Métrica | Fonte (Match-V5) | Cálculo |
|---|---|---|
| CS total | `info.participants[].totalMinionsKilled + neutralMinionsKilled` | soma |
| CS/min | idem + `info.gameDuration` (segundos) | cs / (duração/60) |
| Gold/min | `goldEarned` | gold / min |
| XP/min | `champExperience` | xp / min |
| KDA | `kills`, `deaths`, `assists` | (k+a) / max(d,1) |
| Kill participation | `kills+assists` / kills do time | razão |
| CS@10, CS@15 | timeline `frames[n].participantFrames[id].minionsKilled + jungleMinionsKilled` | valor no frame do minuto |
| Gold@10, Gold@15 | timeline `totalGold` | idem |
| XP@10, XP@15 | timeline `xp` | idem |
| Diferença @10/@15 (CS, gold, xp) | oponente = mesmo `teamPosition`, time adversário | jogador − oponente |
| Mortes antes dos 15 min | timeline `events` tipo `CHAMPION_KILL` com `victimId` | contagem |

Regras:

- Partidas remake (`gameEndedInEarlySurrender`) ficam fora das médias.
- Se o oponente de rota não existir (posição vazia), as diferenças ficam `null`.
- Os frames da timeline vêm 1 por minuto (`frameInterval` = 60000 ms): frame `n` = minuto `n`.

## Fora de escopo

- Benchmark por elo (próxima spec: amostrar jogadores via League-V4 e agregar estas mesmas métricas).
- Visão, dano e objetivos (podem entrar depois, os campos já existem em `participants[].challenges`).

## Critérios de aceite

- [ ] Função pura `compute_metrics(match, timeline, puuid)` sem rede.
- [ ] Teste com fixture mínima cobrindo CS/min, KDA com 0 mortes, diferença @10 e oponente ausente.
