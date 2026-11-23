import { useState } from 'react'
import { Button } from '@/components/ui/button'

// Coordenadas da timeline (mesmas do lol_gis): origem no canto inferior esquerdo (base azul), y para cima.
// Limites do minimapa map11.png do Data Dragon.
const MIN = -120
const MAX = 14870
const S = 512
const px = (x: number) => ((x - MIN) / (MAX - MIN)) * S
const py = (y: number) => S - ((y - MIN) / (MAX - MIN)) * S

export type MapEvent = {
  type: string
  minute: number
  timestamp?: number
  position: { x: number; y: number }
  killerId?: number
  victimId?: number
  assistingParticipantIds?: number[]
  killerTeamId?: number
  teamId?: number
  monsterType?: string
  monsterSubType?: string
  buildingType?: string
  towerType?: string
}
type Player = { participantId: number; teamId: number; championName: string; riotIdGameName?: string }

// cls = marcador no SVG, bg = fundo do tooltip (mesma cor)
const CATS = {
  death: { label: 'Suas mortes', cls: 'fill-red-500', bg: 'bg-red-500' },
  kill: { label: 'Seus abates/assist.', cls: 'fill-emerald-400', bg: 'bg-emerald-400' },
  ally: { label: 'Abates do seu time', cls: 'fill-sky-400', bg: 'bg-sky-400' },
  enemy: { label: 'Abates do inimigo', cls: 'fill-orange-400', bg: 'bg-orange-400' },
  objective: { label: 'Objetivos', cls: 'fill-fuchsia-400', bg: 'bg-fuchsia-400' },
  structure: { label: 'Estruturas', cls: 'fill-yellow-300', bg: 'bg-yellow-300' },
  path: { label: 'Seu trajeto', cls: 'fill-white', bg: 'bg-white' },
} as const
type Cat = keyof typeof CATS

const pretty = (s?: string) => (s ?? '').replace(/_/g, ' ').toLowerCase()

export function MatchMap({
  events,
  path,
  players,
  me,
  ddVersion,
}: {
  events: MapEvent[]
  path: { minute: number; x: number; y: number }[]
  players: Player[]
  me: Player
  ddVersion: string
}) {
  const [on, setOn] = useState<Record<Cat, boolean>>({ death: true, kill: true, ally: true, enemy: true, objective: true, structure: true, path: false })
  const last = Math.ceil(Math.max(1, ...events.map((e) => e.minute), ...path.map((p) => p.minute)))
  const [upTo, setUpTo] = useState(last)
  const [hover, setHover] = useState<{ e: MapEvent; cat: Cat } | null>(null)

  const byId = new Map(players.map((p) => [p.participantId, p]))
  const name = (id?: number) => (id && byId.get(id)?.championName) || 'minion/torre'

  const champ = (id?: number, small?: boolean) => {
    const p = id ? byId.get(id) : undefined
    const size = small ? 'size-6' : 'size-9'
    return (
      <div className="flex flex-col items-center gap-0.5">
        {p && ddVersion ? (
          <img src={`https://ddragon.leagueoflegends.com/cdn/${ddVersion}/img/champion/${p.championName}.png`} alt="" className={`${size} rounded border border-black/30`} />
        ) : (
          <span className={`${size} rounded border border-black/30 bg-black/20`} />
        )}
        <span className={`max-w-20 truncate font-medium ${small ? 'text-[10px]' : 'text-xs'}`}>{p?.championName ?? 'Minion/Torre'}</span>
      </div>
    )
  }

  const classify = (e: MapEvent): Cat => {
    if (e.type === 'ELITE_MONSTER_KILL') return 'objective'
    if (e.type === 'BUILDING_KILL') return 'structure'
    if (e.victimId === me.participantId) return 'death'
    if (e.killerId === me.participantId || e.assistingParticipantIds?.includes(me.participantId)) return 'kill'
    // killerId 0 = executado por torre/minion: crédito vai para o time da vítima oposto
    const killerTeam = byId.get(e.killerId ?? 0)?.teamId ?? (byId.get(e.victimId ?? 0)?.teamId === 100 ? 200 : 100)
    return killerTeam === me.teamId ? 'ally' : 'enemy'
  }

  const tip = (e: MapEvent) => {
    if (e.type === 'CHAMPION_KILL') {
      const assists = e.assistingParticipantIds?.map(name).join(', ')
      return `${name(e.killerId)} abateu ${name(e.victimId)}${assists ? ` (assist.: ${assists})` : ''}`
    }
    if (e.type === 'ELITE_MONSTER_KILL')
      return `${e.killerTeamId === me.teamId ? 'Seu time' : 'Inimigo'}: ${pretty(e.monsterSubType || e.monsterType)}`
    // BUILDING_KILL.teamId = time que perdeu a estrutura
    return `${e.teamId === me.teamId ? 'Perdemos' : 'Destruímos'}: ${pretty(e.towerType || e.buildingType)}`
  }
  const time = (e: MapEvent) => {
    const s = Math.floor((e.timestamp ?? e.minute * 60_000) / 1000)
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
  }

  const tooltip = (h: { e: MapEvent; cat: Cat }) => {
    const { e, cat } = h
    const x = px(e.position.x) / S
    const y = py(e.position.y) / S
    // evita sair do mapa: abre para baixo perto do topo e encosta nas bordas laterais
    const tx = x < 0.25 ? '0%' : x > 0.75 ? '-100%' : '-50%'
    const ty = y < 0.35 ? '14px' : 'calc(-100% - 14px)'
    const assists = e.assistingParticipantIds ?? []
    return (
      <div
        role="tooltip"
        className={`pointer-events-none absolute z-10 w-max max-w-64 rounded-md p-2 text-neutral-950 shadow-lg ${CATS[cat].bg}`}
        style={{ left: `${x * 100}%`, top: `${y * 100}%`, transform: `translate(${tx}, ${ty})` }}
      >
        <p className="mb-1 text-xs font-semibold tabular-nums">
          {time(e)} · {CATS[cat].label}
        </p>
        {e.type === 'CHAMPION_KILL' ? (
          <>
            <div className="flex items-center gap-2">
              {champ(e.killerId)}
              <span className="text-lg font-bold">→</span>
              {champ(e.victimId)}
            </div>
            {assists.length > 0 && (
              <div className="mt-1.5 border-t border-black/20 pt-1">
                <p className="text-[10px] font-semibold uppercase">Assistências</p>
                <div className="mt-0.5 flex flex-wrap gap-1.5">{assists.map((a) => <div key={a}>{champ(a, true)}</div>)}</div>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center gap-2">
            {e.killerId ? champ(e.killerId) : null}
            <span className="text-sm font-medium capitalize">{tip(e)}</span>
          </div>
        )}
      </div>
    )
  }

  const shown = events.map((e) => ({ e, cat: classify(e) })).filter(({ e, cat }) => on[cat] && e.minute <= upTo)
  const trail = path.filter((p) => p.minute <= upTo)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {(Object.keys(CATS) as Cat[]).map((c) => (
          <Button key={c} size="sm" variant={on[c] ? 'default' : 'outline'} onClick={() => setOn({ ...on, [c]: !on[c] })}>
            <svg viewBox="0 0 10 10" className="size-2.5" aria-hidden>
              <circle cx={5} cy={5} r={5} className={CATS[c].cls} />
            </svg>
            {CATS[c].label}
          </Button>
        ))}
      </div>
      <div className="relative mx-auto w-full max-w-xl">
      <svg viewBox={`0 0 ${S} ${S}`} className="w-full rounded-md bg-muted" aria-label="Mapa da partida com abates, objetivos e estruturas">
        {ddVersion && <image href={`https://ddragon.leagueoflegends.com/cdn/${ddVersion}/img/map/map11.png`} width={S} height={S} />}
        {on.path && trail.length > 1 && (
          <polyline
            points={trail.map((p) => `${px(p.x)},${py(p.y)}`).join(' ')}
            fill="none"
            strokeWidth={1.5}
            strokeDasharray="3 3"
            className="stroke-white/80"
          />
        )}
        {shown.map(({ e, cat }, i) => {
          const x = px(e.position.x)
          const y = py(e.position.y)
          const cls = `${CATS[cat].cls} stroke-black/70`
          return (
            <g
              key={i}
              tabIndex={0}
              aria-label={`${time(e)} ${tip(e)}`}
              className="cursor-pointer outline-none"
              onMouseEnter={() => setHover({ e, cat })}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover({ e, cat })}
              onBlur={() => setHover(null)}
            >
              {cat === 'objective' ? (
                <rect x={x - 6} y={y - 6} width={12} height={12} transform={`rotate(45 ${x} ${y})`} className={cls} />
              ) : cat === 'structure' ? (
                <rect x={x - 5} y={y - 5} width={10} height={10} className={cls} />
              ) : (
                <circle cx={x} cy={y} r={cat === 'death' ? 6 : 5} className={cls} />
              )}
            </g>
          )
        })}
      </svg>
      {hover && tooltip(hover)}
      </div>
      <label className="flex items-center gap-3 text-sm">
        <span className="text-muted-foreground">Até o minuto</span>
        <input type="range" min={0} max={last} value={upTo} onChange={(e) => setUpTo(Number(e.target.value))} className="flex-1 accent-primary" />
        <span className="w-10 text-right tabular-nums">{upTo}′</span>
      </label>
    </div>
  )
}
