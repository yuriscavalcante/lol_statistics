# Riot API: o que usamos

Portal e chave: https://developer.riotgames.com. Header `X-Riot-Token: <RIOT_API_KEY>`.

## Limites

- Chave de desenvolvimento: **20 req/s e 100 req/2 min**, expira a cada 24 h.
- Para coleta contínua (benchmark por elo), peça uma *Personal API Key* no portal (não expira, mesmo limite).
- 429 vem com `Retry-After` em segundos. O cliente espera e tenta de novo.

## Roteamento

- Regional (`americas`, `europe`, `asia`, `sea`): Account-V1 e Match-V5. BR fica em `americas`.
- Plataforma (`br1`, `na1`, `euw1`, …): League-V4, Summoner-V4.

## Endpoints

| Uso | Endpoint |
|---|---|
| Riot ID → PUUID | `GET https://americas.api.riotgames.com/riot/account/v1/accounts/by-riot-id/{gameName}/{tagLine}` |
| IDs de partidas | `GET https://americas.api.riotgames.com/lol/match/v5/matches/by-puuid/{puuid}/ids?queue=420&count=20` (420 = Solo/Duo, 440 = Flex) |
| Detalhe da partida | `GET https://americas.api.riotgames.com/lol/match/v5/matches/{matchId}` |
| Timeline (minuto a minuto) | `GET https://americas.api.riotgames.com/lol/match/v5/matches/{matchId}/timeline` |
| Elo do jogador | `GET https://br1.api.riotgames.com/lol/league/v4/entries/by-puuid/{puuid}` |
| Jogadores por elo (amostra para benchmark) | `GET https://br1.api.riotgames.com/lol/league/v4/entries/RANKED_SOLO_5x5/{tier}/{division}?page=1` |
| Challenger/GM/Master | `GET https://br1.api.riotgames.com/lol/league/v4/{challenger,grandmaster,master}leagues/by-queue/RANKED_SOLO_5x5` |
| Dados estáticos (campeões, itens, ícones) | Data Dragon: `https://ddragon.leagueoflegends.com/api/versions.json`, sem chave |

## Campos para validar desempenho

**Fim de jogo:** `match.info.participants[]`

- Farm: `totalMinionsKilled` (rota) + `neutralMinionsKilled` (jungle)
- Ouro: `goldEarned`, `goldSpent`
- XP: `champExperience`, `champLevel`
- Abates/mortes: `kills`, `deaths`, `assists`
- Rota: `teamPosition` (`TOP`, `JUNGLE`, `MIDDLE`, `BOTTOM`, `UTILITY`)
- `challenges` já traz métricas derivadas: `laneMinionsFirst10Minutes`, `goldPerMinute`, `killParticipation`, `kda`, `maxCsAdvantageOnLaneOpponent`, `maxLevelLeadLaneOpponent`, `visionScorePerMinute`, `soloKills`. Os campos variam entre patches, então trate todos como opcionais.

**Minuto a minuto:** `timeline.info.frames[n]` (1 frame por minuto)

- `participantFrames[id]`: `minionsKilled`, `jungleMinionsKilled`, `totalGold`, `currentGold`, `xp`, `level`, `position`, `damageStats`
- `events[]`: `CHAMPION_KILL` (`killerId`, `victimId`, `assistingParticipantIds`, `position`), `ELITE_MONSTER_KILL`, `BUILDING_KILL`, `ITEM_PURCHASED`, `WARD_PLACED`, `LEVEL_UP`

`participantId` (1–10) liga a timeline a `match.info.participants[].participantId`. Use `metadata.participants` (PUUIDs) para achar o jogador.

## Benchmark: não existe API pública

Nem a Riot nem OP.GG, U.GG ou Mobalytics expõem uma API pública com médias por elo (CS/min, gold/min…). Os números que circulam em guias divergem muito entre si: Ferro–Ouro aparece como 3–4 CS/min numa fonte e 6–7 em outra. Caminho do projeto:

1. League-V4 `entries/{tier}/{division}` → amostra de PUUIDs por elo.
2. Match-V5 → N partidas recentes de cada um.
3. Mesma função `compute_metrics` → agregação (mediana e p25/p75) por elo e rota.

Isso consome muito rate limit (2 requisições por partida, mais a timeline). Com chave de desenvolvimento, ~100 partidas/elo levam alguns minutos. Precisa de spec própria.

## Tela de detalhe (`match_detail`)

- `match.info.participants[]` completo (todos os campos, incluindo `challenges`, `perks`, `item0..6`).
- `match.info.teams[]`: `bans`, `objectives.{baron,dragon,horde,riftHerald,tower,inhibitor,atakhan,champion}.{first,kills}`.
- Timeline: `participantFrames` de cada minuto (eu e oponente de rota) e eventos `CHAMPION_KILL`, `ELITE_MONSTER_KILL` (`monsterType`, `monsterSubType`, `killerTeamId`) e `BUILDING_KILL` (`buildingType`, `towerType`, `teamId` = time que perdeu a estrutura).
- Mapa: `position {x, y}` dos três eventos acima (todos os jogadores, `mapEvents`) e `participantFrames[pid].position` a cada minuto (`path`, só eu). Coordenadas do jogo, origem no canto inferior esquerdo (base azul), y para cima; o minimapa `ddragon/cdn/{versão}/img/map/map11.png` cobre de -120 a 14870 nos dois eixos. `killerId = 0` em `CHAMPION_KILL` = executado por torre/minion.

## Posicionamento (`positioning`)

Vem de `participantFrames[pid].position` (dos 10 jogadores, também em `paths`) e da `position` dos eventos. Existe só **1 amostra por minuto**: o frame `n` é a foto do minuto `n`, e os eventos dele aconteceram entre `n-1` e `n`. Para um evento, usamos o frame `floor(minuto)`, ou seja, até 59 s antes. O jogador morto continua com `position` e nada indica que ele está morto.

- Zonas (`_zone`, limites aproximados): `base` se `x+y < 4500` ou `> 25240`; `mid` se `|x−y| < 1500`; `top` se `x < 2500` ou `y > 12300`; `bot` se `x > 12300` ou `y < 2500`; o resto é `jungle` (selva + rio).
- Rota: minutos 2–14 na zona da `teamPosition` (`TOP`, `MIDDLE`, `BOTTOM`). Recall (`base`) não conta como saída.
- Raios: isolado se o aliado mais próximo estiver a mais de 3000; "perto" de uma morte é até 2000; "perto" de um objetivo é até 3000.
- `enemiesInvolved` de uma morte = `killerId` (> 0) + `assistingParticipantIds`. Esse é exato, ao contrário das contagens por raio.
