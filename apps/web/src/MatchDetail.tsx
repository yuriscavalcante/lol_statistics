import { useEffect, useState } from 'react'
import { ArrowLeft, Bot, LoaderCircle, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { MatchMap, type MapEvent } from './MatchMap'

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
const DDRAGON = 'https://ddragon.leagueoflegends.com'
const WIN = 'text-emerald-600 dark:text-emerald-400'
const LOSS = 'text-red-600 dark:text-red-400'

// Campos da Riot variam entre patches: tudo opcional, lido por nome.
type Participant = Record<string, unknown> & {
  participantId: number
  teamId: number
  championName: string
  riotIdGameName?: string
  teamPosition: string
  kills: number
  deaths: number
  assists: number
  win: boolean
  isMe: boolean
  isOpponent: boolean
  grade?: number
  challenges?: Record<string, unknown>
}
type Stats = { cs: number; gold: number; xp: number } | null
type GameEvent = {
  minute: number
  role: 'kill' | 'death' | 'assist' | 'objective'
  type: string
  monsterType?: string
  monsterSubType?: string
  buildingType?: string
  towerType?: string
  killerTeamId?: number
  teamId?: number
}
type Team = { teamId: number; win: boolean; bans: { championId: number }[]; objectives: Record<string, { first: boolean; kills: number }> }
type Detail = {
  durationMin: number
  participants: Participant[]
  teams: Team[]
  series: { minute: number; me: Stats; opponent: Stats }[]
  events: GameEvent[]
  mapEvents: MapEvent[]
  path: { minute: number; x: number; y: number }[]
  paths: Record<number, { minute: number; x: number; y: number }[]>
}
type Analysis = {
  model: string
  createdAt: string
  content: {
    resumo: string
    erros: { momento: string; problema: string; impacto: string }[]
    acertos: string[]
    melhorias: string[]
  }
}

const num = (v: unknown) =>
  typeof v === 'number' ? (Number.isInteger(v) ? v.toLocaleString('pt-BR') : v.toFixed(2)) : String(v ?? '—')
const words = (k: string) => k.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase())
const cs = (p: Participant) => Number(p.totalMinionsKilled ?? 0) + Number(p.neutralMinionsKilled ?? 0)

const GROUPS: { title: string; keys: string[] }[] = [
  {
    title: 'Combate',
    keys: ['kills', 'deaths', 'assists', 'largestKillingSpree', 'largestMultiKill', 'doubleKills', 'tripleKills', 'quadraKills', 'pentaKills', 'longestTimeSpentLiving', 'totalTimeSpentDead', 'timeCCingOthers', 'totalTimeCCDealt'],
  },
  {
    title: 'Farm e ouro',
    keys: ['totalMinionsKilled', 'neutralMinionsKilled', 'totalAllyJungleMinionsKilled', 'totalEnemyJungleMinionsKilled', 'goldEarned', 'goldSpent', 'champLevel', 'champExperience', 'consumablesPurchased', 'itemsPurchased'],
  },
  {
    title: 'Dano',
    keys: ['totalDamageDealtToChampions', 'physicalDamageDealtToChampions', 'magicDamageDealtToChampions', 'trueDamageDealtToChampions', 'totalDamageTaken', 'damageSelfMitigated', 'totalHeal', 'totalHealsOnTeammates', 'totalDamageShieldedOnTeammates', 'largestCriticalStrike'],
  },
  {
    title: 'Visão',
    keys: ['visionScore', 'wardsPlaced', 'wardsKilled', 'detectorWardsPlaced', 'visionWardsBoughtInGame', 'sightWardsBoughtInGame'],
  },
  {
    title: 'Objetivos',
    keys: ['damageDealtToObjectives', 'damageDealtToBuildings', 'damageDealtToEpicMonsters', 'turretKills', 'turretTakedowns', 'inhibitorTakedowns', 'dragonKills', 'baronKills', 'objectivesStolen', 'firstBloodKill', 'firstTowerKill'],
  },
]

const OBJECTIVES = ['champion', 'tower', 'inhibitor', 'dragon', 'horde', 'riftHerald', 'baron', 'atakhan'] as const
const OBJ_LABEL: Record<string, string> = {
  champion: 'Abates',
  tower: 'Torres',
  inhibitor: 'Inibidores',
  dragon: 'Dragões',
  horde: 'Vastilarvas',
  riftHerald: 'Arauto',
  baron: 'Barão',
  atakhan: 'Atakhan',
}

const METRICS = [
  { k: 'gold', label: 'Ouro' },
  { k: 'cs', label: 'CS' },
  { k: 'xp', label: 'XP' },
] as const

function DiffChart({ series }: { series: Detail['series'] }) {
  const [metric, setMetric] = useState<'gold' | 'cs' | 'xp'>('gold')
  const pts = series.filter((s) => s.me && s.opponent).map((s) => ({ m: s.minute, v: s.me![metric] - s.opponent![metric] }))
  if (pts.length < 2) return <p className="text-sm text-muted-foreground">Sem oponente de rota para comparar.</p>
  const W = 600
  const H = 180
  const max = Math.max(1, ...pts.map((p) => Math.abs(p.v)))
  const x = (m: number) => (m / pts[pts.length - 1].m) * W
  const y = (v: number) => H / 2 - (v / max) * (H / 2 - 8)
  const last = pts[pts.length - 1].v
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {METRICS.map(({ k, label }) => (
          <Button key={k} size="sm" variant={metric === k ? 'default' : 'outline'} onClick={() => setMetric(k)}>
            {label}
          </Button>
        ))}
        <span className={`ml-auto text-sm tabular-nums ${last >= 0 ? WIN : LOSS}`}>
          final: {last > 0 ? '+' : ''}
          {last}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-44 w-full overflow-visible" role="img" aria-label={`Diferença de ${metric} contra o oponente por minuto`}>
        <line x1={0} x2={W} y1={H / 2} y2={H / 2} className="stroke-border" strokeDasharray="4 4" />
        <polyline
          fill="none"
          strokeWidth={2}
          className="stroke-primary"
          vectorEffect="non-scaling-stroke"
          points={pts.map((p) => `${x(p.m)},${y(p.v)}`).join(' ')}
        />
        {pts.map((p) => (
          <circle key={p.m} cx={x(p.m)} cy={y(p.v)} r={3} className={p.v >= 0 ? 'fill-emerald-500' : 'fill-red-500'}>
            <title>{`min ${p.m}: ${p.v > 0 ? '+' : ''}${p.v}`}</title>
          </circle>
        ))}
      </svg>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>0 min</span>
        <span>+{max} / −{max}</span>
        <span>{pts[pts.length - 1].m} min</span>
      </div>
    </div>
  )
}

function eventLabel(e: GameEvent, myTeam: number) {
  if (e.role === 'kill') return { text: 'Você abateu um inimigo', cls: WIN }
  if (e.role === 'death') return { text: 'Você morreu', cls: LOSS }
  if (e.role === 'assist') return { text: 'Assistência', cls: '' }
  // BUILDING_KILL.teamId = time que perdeu a estrutura; ELITE_MONSTER_KILL.killerTeamId = time que pegou
  const ours = e.type === 'BUILDING_KILL' ? e.teamId !== myTeam : e.killerTeamId === myTeam
  const what =
    e.type === 'BUILDING_KILL'
      ? (e.towerType ?? e.buildingType ?? 'Estrutura').replace(/_/g, ' ').toLowerCase()
      : (e.monsterSubType ?? e.monsterType ?? 'Monstro').replace(/_/g, ' ').toLowerCase()
  return { text: `${ours ? 'Seu time' : 'Inimigos'}: ${what}`, cls: ours ? WIN : LOSS }
}

export function MatchDetail({
  matchId,
  puuid,
  ddVersion,
  onBack,
}: {
  matchId: string
  puuid: string
  ddVersion: string
  onBack: () => void
}) {
  const [detail, setDetail] = useState<Detail | null>(null)
  const [error, setError] = useState('')
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [aiError, setAiError] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  // alvo da análise: query `puuid=...` (jogador) ou `team=100|200` (time inteiro)
  const [subject, setSubject] = useState(`puuid=${encodeURIComponent(puuid)}`)

  useEffect(() => {
    fetch(`${API}/matches/${matchId}?puuid=${encodeURIComponent(puuid)}`)
      .then(async (r) => (r.ok ? setDetail(await r.json()) : setError((await r.json()).detail ?? r.statusText)))
      .catch((e) => setError(String(e)))
  }, [matchId, puuid])

  useEffect(() => {
    let stale = false
    setAnalysis(null)
    setAiError('')
    fetch(`${API}/matches/${matchId}/analysis?${subject}`)
      .then(async (r) => {
        if (stale) return
        if (r.ok) setAnalysis(await r.json())
        else if (r.status !== 404) setAiError((await r.json()).detail ?? r.statusText)
      })
      .catch((e) => !stale && setAiError(String(e)))
    return () => {
      stale = true
    }
  }, [matchId, subject])

  async function analyze() {
    setAnalyzing(true)
    setAiError('')
    try {
      const r = await fetch(`${API}/matches/${matchId}/analysis?${subject}`, { method: 'POST' })
      if (!r.ok) throw new Error((await r.json()).detail ?? r.statusText)
      setAnalysis(await r.json())
    } catch (e) {
      setAiError(String(e))
    } finally {
      setAnalyzing(false)
    }
  }

  const back = (
    <Button variant="outline" onClick={onBack}>
      <ArrowLeft /> Voltar
    </Button>
  )
  if (error) return <div className="space-y-4">{back}<p className={`text-sm ${LOSS}`}>{error}</p></div>
  if (!detail)
    return (
      <div className="space-y-4">
        {back}
        <p className="flex items-center gap-2 text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin" /> Carregando partida…
        </p>
      </div>
    )

  const me = detail.participants.find((p) => p.isMe)!
  const bestGrade = Math.max(...detail.participants.map((p) => p.grade ?? -1))
  const champImg = (name: string) => ddVersion && `${DDRAGON}/cdn/${ddVersion}/img/champion/${name}.png`
  const scalars = Object.entries(me).filter(([, v]) => v === null || typeof v !== 'object').sort(([a], [b]) => a.localeCompare(b))
  const challenges = Object.entries(me.challenges ?? {})
    .filter(([, v]) => typeof v === 'number')
    .sort(([a], [b]) => a.localeCompare(b))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        {back}
        {champImg(me.championName) && <img src={champImg(me.championName)} alt="" className="size-12 rounded-md" />}
        <div>
          <p className="text-xl font-semibold">
            {me.championName}{' '}
            <Badge variant="outline" className={me.win ? WIN : LOSS}>
              {me.win ? 'Vitória' : 'Derrota'}
            </Badge>
          </p>
          <p className="text-sm text-muted-foreground">
            {me.teamPosition || '—'} · {detail.durationMin} min · {me.kills}/{me.deaths}/{me.assists}
          </p>
        </div>
      </div>

      <Card className="border-primary/40">
        <CardHeader className="flex flex-row flex-wrap items-center gap-3">
          <CardTitle className="mr-auto flex items-center gap-2">
            <Bot className="size-5 text-primary" /> Análise com IA
          </CardTitle>
          <select
            aria-label="Alvo da análise"
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm dark:bg-input/30"
            value={subject}
            disabled={analyzing}
            onChange={(e) => setSubject(e.target.value)}
          >
            {[me.teamId, me.teamId === 100 ? 200 : 100].map((t) => (
              <optgroup key={t} label={t === me.teamId ? 'Seu time' : 'Time inimigo'}>
                <option value={`team=${t}`}>{t === me.teamId ? 'Seu time inteiro' : 'Time inimigo inteiro'}</option>
                {detail.participants
                  .filter((p) => p.teamId === t)
                  .map((p) => (
                    <option key={p.participantId} value={`puuid=${encodeURIComponent(String(p.puuid))}`}>
                      {p.isMe ? 'Você' : p.riotIdGameName || p.championName} ({p.championName})
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
          <Button onClick={analyze} disabled={analyzing}>
            {analyzing ? <LoaderCircle className="animate-spin" /> : analysis ? <RefreshCw /> : <Bot />}
            {analyzing ? 'Analisando…' : analysis ? 'Reanalisar' : 'Analisar com IA'}
          </Button>
        </CardHeader>
        <CardContent className="space-y-5">
          {aiError && <p className={`text-sm ${LOSS}`}>{aiError}</p>}
          {!analysis && !aiError && !analyzing && (
            <p className="text-sm text-muted-foreground">Ainda não analisada. A análise fica salva para as próximas visitas.</p>
          )}
          {analysis && (
            <>
              <p>{analysis.content.resumo}</p>
              <section className="space-y-2">
                <h3 className={`font-semibold ${LOSS}`}>O que deu errado</h3>
                <ul className="space-y-2">
                  {analysis.content.erros.map((e, i) => (
                    <li key={i} className="rounded-md border p-3 text-sm">
                      <Badge variant="outline" className="mr-2">{e.momento}</Badge>
                      <span className="font-medium">{e.problema}</span>
                      <p className="mt-1 text-muted-foreground">{e.impacto}</p>
                    </li>
                  ))}
                </ul>
              </section>
              <div className="grid gap-5 md:grid-cols-2">
                <section className="space-y-2">
                  <h3 className={`font-semibold ${WIN}`}>O que foi bem</h3>
                  <ul className="list-disc space-y-1 pl-5 text-sm">{analysis.content.acertos.map((a, i) => <li key={i}>{a}</li>)}</ul>
                </section>
                <section className="space-y-2">
                  <h3 className="font-semibold text-primary">Onde melhorar</h3>
                  <ul className="list-disc space-y-1 pl-5 text-sm">{analysis.content.melhorias.map((a, i) => <li key={i}>{a}</li>)}</ul>
                </section>
              </div>
              <p className="text-xs text-muted-foreground">
                {analysis.model} · {new Date(analysis.createdAt).toLocaleString('pt-BR')}
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {detail.teams.map((t) => (
        <Card key={t.teamId} className="overflow-hidden py-0">
          <div className={`flex flex-wrap gap-x-4 gap-y-1 border-b px-4 py-3 text-sm ${t.win ? WIN : LOSS}`}>
            <span className="font-semibold">{t.teamId === me.teamId ? 'Seu time' : 'Time inimigo'} · {t.win ? 'Vitória' : 'Derrota'}</span>
            {OBJECTIVES.filter((o) => t.objectives?.[o]).map((o) => (
              <span key={o} className="text-muted-foreground">
                {OBJ_LABEL[o]}: <span className="text-foreground tabular-nums">{t.objectives[o].kills}</span>
                {t.objectives[o].first && ' ★'}
              </span>
            ))}
          </div>
          <Table className="tabular-nums">
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="pl-4">Jogador</TableHead>
                <TableHead className="text-right">Nota</TableHead>
                <TableHead>K/D/A</TableHead>
                <TableHead className="text-right">CS</TableHead>
                <TableHead className="text-right">Ouro</TableHead>
                <TableHead className="text-right">Dano</TableHead>
                <TableHead className="text-right">Visão</TableHead>
                <TableHead className="pr-4">Itens</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {detail.participants
                .filter((p) => p.teamId === t.teamId)
                .map((p) => (
                  <TableRow key={p.participantId} className={p.isMe ? 'bg-primary/10' : p.isOpponent ? 'bg-muted/40' : ''}>
                    <TableCell className="pl-4">
                      <div className="flex items-center gap-2">
                        {champImg(p.championName) && <img src={champImg(p.championName)} alt="" className="size-7 rounded" loading="lazy" />}
                        <div>
                          <p className="font-medium">{p.riotIdGameName || p.championName}</p>
                          <p className="text-xs text-muted-foreground">
                            {p.championName} · {p.teamPosition || '—'}
                            {p.isOpponent && ' · oponente'}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {p.grade == null ? '—' : p.grade === bestGrade ? (
                        <Badge title="Maior nota da partida">{p.grade.toFixed(1)}</Badge>
                      ) : (
                        p.grade.toFixed(1)
                      )}
                    </TableCell>
                    <TableCell>{p.kills}/{p.deaths}/{p.assists}</TableCell>
                    <TableCell className="text-right">{cs(p)}</TableCell>
                    <TableCell className="text-right">{num(p.goldEarned)}</TableCell>
                    <TableCell className="text-right">{num(p.totalDamageDealtToChampions)}</TableCell>
                    <TableCell className="text-right">{num(p.visionScore)}</TableCell>
                    <TableCell className="pr-4">
                      <div className="flex gap-0.5">
                        {[0, 1, 2, 3, 4, 5, 6].map((i) => {
                          const id = Number(p[`item${i}`] ?? 0)
                          return id && ddVersion ? (
                            <img key={i} src={`${DDRAGON}/cdn/${ddVersion}/img/item/${id}.png`} alt="" className="size-6 rounded" loading="lazy" />
                          ) : (
                            <span key={i} className="size-6 rounded bg-muted" />
                          )
                        })}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </Card>
      ))}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Diferença contra o oponente por minuto</CardTitle>
          </CardHeader>
          <CardContent>
            <DiffChart series={detail.series} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Linha do tempo</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="max-h-64 space-y-1 overflow-y-auto text-sm">
              {detail.events.map((e, i) => {
                const { text, cls } = eventLabel(e, me.teamId)
                return (
                  <li key={i} className="flex gap-3">
                    <span className="w-12 shrink-0 text-right tabular-nums text-muted-foreground">{e.minute}′</span>
                    <span className={cls}>{text}</span>
                  </li>
                )
              })}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mapa</CardTitle>
        </CardHeader>
        <CardContent>
          <MatchMap events={detail.mapEvents ?? []} path={detail.path ?? []} paths={detail.paths ?? {}} players={detail.participants} me={me} ddVersion={ddVersion} />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {GROUPS.map((g) => (
          <Card key={g.title} className="gap-3">
            <CardHeader>
              <CardTitle className="text-base">{g.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-1 text-sm">
                {g.keys.filter((k) => k in me).map((k) => (
                  <div key={k} className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">{words(k)}</dt>
                    <dd className="tabular-nums">{num(me[k])}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        ))}
      </div>

      {challenges.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Desafios ({challenges.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-x-8 gap-y-1 text-sm sm:grid-cols-2 lg:grid-cols-3">
              {challenges.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-b border-border/40 py-1">
                  <dt className="truncate text-muted-foreground" title={k}>{words(k)}</dt>
                  <dd className="tabular-nums">{num(v)}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      )}

      <details className="rounded-xl border p-4">
        <summary className="cursor-pointer font-medium">Todos os campos brutos ({scalars.length})</summary>
        <dl className="mt-3 grid gap-x-8 gap-y-1 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {scalars.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 border-b border-border/40 py-1">
              <dt className="truncate text-muted-foreground" title={k}>{k}</dt>
              <dd className="truncate tabular-nums">{num(v)}</dd>
            </div>
          ))}
        </dl>
      </details>
    </div>
  )
}
