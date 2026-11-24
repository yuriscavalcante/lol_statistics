import { useEffect, useState } from 'react'
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
  victimDamageReceived?: Dmg[]
}
type Dmg = {
  participantId: number
  name: string
  spellName: string
  spellSlot: number
  basic: boolean
  type: string
  physicalDamage: number
  magicDamage: number
  trueDamage: number
}
type Pt = { minute: number; x: number; y: number }
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

// Fonte do dano a partir de spellSlot/spellName (0–3 = Q/W/E/R, 4/5 = feitiços, 6+ = itens, 63 = passiva, 64+ = ataque).
// Flash não aparece: não causa dano e a timeline não registra o uso.
const source = (d: Dmg) => {
  const s = d.spellName.toLowerCase()
  if (s === 'summonerdot') return 'Ignite'
  if (s.includes('smite')) return 'Smite'
  if (/^\d+active$/.test(s)) return `item:${parseInt(s)}`
  if (d.basic || s.includes('attack')) return 'Ataque básico'
  if (d.spellSlot === 63 || s.includes('passive')) return 'Passiva'
  if (s !== 'burning' && d.spellSlot >= 0 && d.spellSlot <= 3) return 'QWER'[d.spellSlot]
  return 'Outros'
}
const NON_CHAMP: Record<string, string> = { MINION: 'Minions', TOWER: 'Torre', MONSTER: 'Monstros' }

const damage = (e: MapEvent) => {
  const by = new Map<string, { id: number; name: string; total: number; parts: Map<string, number> }>()
  for (const d of e.victimDamageReceived ?? []) {
    const v = d.physicalDamage + d.magicDamage + d.trueDamage
    if (!v) continue
    const k = d.participantId ? String(d.participantId) : d.type
    const g = by.get(k) ?? { id: d.participantId, name: d.participantId ? d.name : (NON_CHAMP[d.type] ?? 'Outros'), total: 0, parts: new Map() }
    g.total += v
    const src = d.participantId ? source(d) : 'Ataque básico'
    g.parts.set(src, (g.parts.get(src) ?? 0) + v)
    by.set(k, g)
  }
  return [...by.values()].sort((a, b) => b.total - a.total)
}

// posição entre duas amostras de minuto (a timeline só tem 1 por minuto)
const at = (pts: Pt[], m: number) => {
  const i = pts.findIndex((p) => p.minute > m)
  if (i === -1) return pts[pts.length - 1]
  if (i === 0) return pts[0]
  const a = pts[i - 1]
  const b = pts[i]
  const k = (m - a.minute) / (b.minute - a.minute)
  return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }
}
const clock = (m: number) => {
  const s = Math.floor(m * 60)
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

export function MatchMap({
  events,
  path,
  paths,
  players,
  me,
  ddVersion,
}: {
  events: MapEvent[]
  path: Pt[]
  paths: Record<number, Pt[]>
  players: Player[]
  me: Player
  ddVersion: string
}) {
  const [on, setOn] = useState<Record<Cat, boolean>>({ death: true, kill: true, ally: true, enemy: true, objective: true, structure: true, path: false })
  const last = Math.ceil(Math.max(1, ...events.map((e) => e.minute), ...path.map((p) => p.minute)))
  const [from, setFrom] = useState(0)
  const [to, setTo] = useState(last)
  // replay: t = minuto atual (null = mapa estático)
  const [t, setT] = useState<number | null>(null)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  useEffect(() => {
    if (!playing) return
    let raf = 0
    let prev = performance.now()
    const step = (now: number) => {
      const dt = (now - prev) / 1000
      prev = now
      setT((cur) => Math.min((cur ?? from) + dt * speed, to))
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [playing, speed, from, to])
  useEffect(() => {
    if (t !== null && t >= to) setPlaying(false)
  }, [t, to])
  const play = () => {
    if (t === null || t >= to || t < from) setT(from)
    setPlaying(!playing)
  }
  const end = t ?? to
  const inRange = (m: number) => m >= from && m <= end
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
    const dmg = damage(e)
    return (
      <div
        role="tooltip"
        className={`pointer-events-none absolute z-10 w-max max-w-72 rounded-md p-2 text-neutral-950 shadow-lg ${CATS[cat].bg}`}
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
            {dmg.length > 0 && (
              <div className="mt-1.5 border-t border-black/20 pt-1">
                <p className="text-[10px] font-semibold uppercase">Dano recebido</p>
                {dmg.map((g) => (
                  <div key={g.id || g.name} className="mt-0.5 flex items-start gap-1.5 text-[11px]">
                    {g.id && ddVersion ? (
                      <img src={`https://ddragon.leagueoflegends.com/cdn/${ddVersion}/img/champion/${byId.get(g.id)?.championName}.png`} alt={g.name} className="size-4 rounded" />
                    ) : (
                      <span className="font-medium">{g.name}</span>
                    )}
                    <span className="font-bold tabular-nums">{g.total}</span>
                    <span className="flex flex-wrap gap-x-1.5 tabular-nums">
                      {[...g.parts].sort((a, b) => b[1] - a[1]).map(([s, v]) => (
                        <span key={s} className="inline-flex items-center gap-0.5">
                          {s.startsWith('item:') && ddVersion ? (
                            <img src={`https://ddragon.leagueoflegends.com/cdn/${ddVersion}/img/item/${s.slice(5)}.png`} alt="item" className="size-3.5 rounded-sm" />
                          ) : (
                            <span className="font-semibold">{s}</span>
                          )}
                          {v}
                        </span>
                      ))}
                    </span>
                  </div>
                ))}
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

  const shown = events.map((e) => ({ e, cat: classify(e) })).filter(({ e, cat }) => on[cat] && inRange(e.minute))
  const trail = path.filter((p) => inRange(p.minute))

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
        {t !== null && (
          <g className="pointer-events-none">
            <defs>
              <clipPath id="champ-clip" clipPathUnits="objectBoundingBox">
                <circle cx={0.5} cy={0.5} r={0.5} />
              </clipPath>
            </defs>
            {players.map((p) => {
              const pts = paths[p.participantId]
              if (!pts?.length || !ddVersion) return null
              const pos = at(pts, t)
              const x = px(pos.x)
              const y = py(pos.y)
              const ring = p.participantId === me.participantId ? 'stroke-yellow-300' : p.teamId === me.teamId ? 'stroke-sky-400' : 'stroke-red-500'
              return (
                <g key={p.participantId}>
                  <image
                    href={`https://ddragon.leagueoflegends.com/cdn/${ddVersion}/img/champion/${p.championName}.png`}
                    x={x - 11}
                    y={y - 11}
                    width={22}
                    height={22}
                    clipPath="url(#champ-clip)"
                  />
                  <circle cx={x} cy={y} r={11} fill="none" strokeWidth={2} className={ring} />
                </g>
              )
            })}
          </g>
        )}
      </svg>
      {hover && tooltip(hover)}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Button size="sm" onClick={play}>
          {playing ? '❚❚ Pausar' : '▶ Replay'}
        </Button>
        {[1, 2, 4].map((v) => (
          <Button key={v} size="sm" variant={speed === v ? 'default' : 'outline'} onClick={() => setSpeed(v)} aria-label={`Velocidade ${v}×`}>
            {v}×
          </Button>
        ))}
        {t !== null && (
          <>
            <input
              type="range"
              aria-label="Tempo do replay"
              className="min-w-24 flex-1 accent-primary"
              min={from}
              max={to}
              step={1 / 60}
              value={Math.max(from, t)}
              onChange={(e) => setT(Number(e.target.value))}
            />
            <span className="w-12 text-right tabular-nums">{clock(t)}</span>
            <Button size="sm" variant="outline" onClick={() => { setPlaying(false); setT(null) }}>
              Sair
            </Button>
          </>
        )}
      </div>
      <div className="flex items-center gap-3 text-sm">
        <span className="text-muted-foreground">Minutos</span>
        {/* dois ranges nativos no mesmo trilho; só os thumbs pegam o ponteiro (index.css .dual-range) */}
        <div className="dual-range relative h-5 flex-1">
          <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded bg-muted" />
          <div
            className="absolute top-1/2 h-1 -translate-y-1/2 rounded bg-primary"
            style={{ left: `${(from / last) * 100}%`, right: `${100 - (to / last) * 100}%` }}
          />
          <input type="range" aria-label="Minuto inicial" min={0} max={last} value={from} onChange={(e) => setFrom(Math.min(Number(e.target.value), to))} />
          <input type="range" aria-label="Minuto final" min={0} max={last} value={to} onChange={(e) => setTo(Math.max(Number(e.target.value), from))} />
        </div>
        <span className="w-16 text-right tabular-nums">
          {from}′–{to}′
        </span>
      </div>
    </div>
  )
}
