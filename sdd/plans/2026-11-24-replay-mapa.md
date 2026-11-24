# Plano: replay no mapa e dano do abate

- Spec: `sdd/specs/2026-11-24-replay-mapa.md`
- Data: 2026-11-24

## Objetivo

Replay dos 10 campeões no mapa e dano por fonte no tooltip do abate. A API não muda: `paths` e `mapEvents` (evento completo, com `victimDamageReceived`) já vêm em `GET /matches/{id}`.

## Passos

1. `MatchDetail.tsx`: tipar `paths` em `Detail` e passar para `MatchMap`.
2. `MatchMap.tsx`, replay:
   - estado `t` (minuto, `null` = fora do replay), `playing`, `speed`; laço com `requestAnimationFrame` que avança `t` até `to`.
   - durante o replay, eventos e trajeto filtram `from <= minuto <= t`; os ícones (`<image>` com `clipPath` circular e anel da cor do time) ficam na posição interpolada entre os minutos e não pegam o ponteiro.
   - controles: Replay/Pausar, 1×/2×/4×, `<input type="range">` de `from` a `to`, relógio, Sair.
3. `MatchMap.tsx`, tooltip: agrupar `victimDamageReceived` por `participantId` e fonte. A fonte sai do `spellSlot`/`spellName`: 0–3 = Q/W/E/R; `summonerdot` = Ignite; `*smite*` = Smite; `NNNNactive` = ícone do item; `basic` ou `*attack*` = Ataque básico; 63 = Passiva; o resto = Outros. Minion/torre/monstro ficam agrupados pelo `type`.

## Arquivos

- `apps/web/src/MatchMap.tsx`
- `apps/web/src/MatchDetail.tsx`

## Verificação

- `pnpm --filter web build` passa.
- No navegador: o replay anda, pausa, muda de velocidade e a barra arrasta; o tooltip de um abate mostra o dano.

## Fora deste plano

- Flash, estado de morto e ícones das habilidades (ver spec).
