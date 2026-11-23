import { useEffect, useState, type FormEvent } from 'react'
import { ChevronDown, Coins, LoaderCircle, Moon, Search, Skull, Sun, Swords, Trophy, Wheat } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { MatchDetail } from '@/MatchDetail'

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

type Metrics = {
  matchId: string
  puuid: string
  champion: string
  position: string | null
  win: boolean
  remake: boolean
  kills: number
  deaths: number
  assists: number
  kda: number
  csPerMin: number
  goldPerMin: number
  xpPerMin: number
  csDiffAt10: number | null
  goldDiffAt10: number | null
  xpDiffAt10: number | null
  deathsBefore15: number
}

const diff = (v: number | null) =>
  v === null ? (
    <span className="text-muted-foreground">—</span>
  ) : (
    <span className={v >= 0 ? WIN : LOSS}>{v > 0 ? `+${v}` : v}</span>
  )

const WIN = 'text-emerald-600 dark:text-emerald-400'
const LOSS = 'text-red-600 dark:text-red-400'
const DDRAGON = 'https://ddragon.leagueoflegends.com'

const avg = (rows: Metrics[], k: keyof Metrics) =>
  rows.length ? (rows.reduce((s, r) => s + Number(r[k]), 0) / rows.length).toFixed(2) : '—'

const STATS = [
  { k: 'csPerMin', label: 'CS/min', icon: Wheat },
  { k: 'goldPerMin', label: 'Gold/min', icon: Coins },
  { k: 'kda', label: 'KDA', icon: Swords },
  { k: 'deathsBefore15', label: 'Mortes antes dos 15', icon: Skull },
] as const

const QUEUES = [
  { id: 420, label: 'Solo/Duo' },
  { id: 440, label: 'Flex' },
  { id: 490, label: 'Normal' },
  { id: 480, label: 'Swiftplay' },
  { id: 450, label: 'ARAM' },
] as const

export default function App() {
  const [riotId, setRiotId] = useState('')
  const [queue, setQueue] = useState<number>(QUEUES[0].id)
  const [rows, setRows] = useState<Metrics[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))
  const [ddVersion, setDdVersion] = useState('')
  const [selected, setSelected] = useState<Metrics | null>(null)

  useEffect(() => {
    fetch(`${DDRAGON}/api/versions.json`)
      .then((r) => r.json())
      .then((v: string[]) => setDdVersion(v[0]))
      .catch(() => {}) // sem ícones se o Data Dragon falhar
  }, [])

  function toggleTheme() {
    document.documentElement.classList.toggle('dark', !dark)
    try {
      localStorage.theme = dark ? 'light' : 'dark'
    } catch {
      /* armazenamento bloqueado: tema vale só nesta sessão */
    }
    setDark(!dark)
  }

  async function search(e: FormEvent) {
    e.preventDefault()
    const [name, tag] = riotId.split('#')
    if (!name || !tag) return setError('Use o formato Nome#TAG')
    setLoading(true)
    setError('')
    setSelected(null)
    try {
      const r = await fetch(
        `${API}/players/${encodeURIComponent(name)}/${encodeURIComponent(tag)}/matches?queue=${queue}`,
      )
      if (!r.ok) throw new Error((await r.json()).detail ?? r.statusText)
      setRows(await r.json())
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  const valid = rows.filter((r) => !r.remake)
  const wins = valid.filter((r) => r.win).length

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">
            Riot <span className="text-primary">Statistics</span>
          </h1>
          <p className="text-muted-foreground">Desempenho nas últimas partidas do League of Legends.</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={toggleTheme}
          aria-label={dark ? 'Usar tema claro' : 'Usar tema escuro'}
        >
          {dark ? <Sun /> : <Moon />}
        </Button>
      </header>

      <form onSubmit={search} className="flex gap-2">
        <div className="relative shrink-0">
          <span aria-hidden="true" className="invisible block h-11 border border-transparent pl-3 pr-10 text-base whitespace-nowrap md:text-sm">
            {QUEUES.find((q) => q.id === queue)?.label}
          </span>
          <select
            aria-label="Fila"
            className="absolute inset-0 appearance-none rounded-md border border-input bg-transparent pl-3 pr-8 text-base md:text-sm dark:bg-input/30"
            value={queue}
            onChange={(e) => setQueue(Number(e.target.value))}
          >
            {QUEUES.map((q) => (
              <option key={q.id} value={q.id}>
                {q.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        </div>
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-11 pl-9"
            placeholder="Nome#BR1"
            aria-label="Riot ID"
            value={riotId}
            onChange={(e) => setRiotId(e.target.value)}
          />
        </div>
        <Button className="h-11 px-6" disabled={loading}>
          {loading && <LoaderCircle className="animate-spin" />}
          {loading ? 'Buscando…' : 'Analisar'}
        </Button>
      </form>

      {error && (
        <p className={`rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm ${LOSS}`}>{error}</p>
      )}

      {valid.length > 0 && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          <Card className="gap-0 border-primary/40 py-5">
            <CardContent className="space-y-2">
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Trophy className="size-4 text-primary" /> Vitórias
              </p>
              <p className="text-3xl font-semibold tabular-nums text-primary">
                {Math.round((wins / valid.length) * 100)}%
              </p>
              <p className="text-xs text-muted-foreground">
                {wins}V {valid.length - wins}D
              </p>
            </CardContent>
          </Card>
          {STATS.map(({ k, label, icon: Icon }) => (
            <Card key={k} className="gap-0 py-5">
              <CardContent className="space-y-2">
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Icon className="size-4" /> {label}
                </p>
                <p className="text-3xl font-semibold tabular-nums">{avg(valid, k)}</p>
                <p className="text-xs text-muted-foreground">média de {valid.length} partidas</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selected ? (
        <MatchDetail
          matchId={selected.matchId}
          puuid={selected.puuid}
          ddVersion={ddVersion}
          onBack={() => setSelected(null)}
        />
      ) : rows.length > 0 ? (
        <Card className="overflow-hidden py-0">
          <Table className="tabular-nums">
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="pl-4">Campeão</TableHead>
                <TableHead>K/D/A</TableHead>
                <TableHead className="text-right">CS/min</TableHead>
                <TableHead className="text-right">Gold/min</TableHead>
                <TableHead className="text-right">XP/min</TableHead>
                <TableHead className="text-right">CS @10</TableHead>
                <TableHead className="text-right">Gold @10</TableHead>
                <TableHead className="text-right">XP @10</TableHead>
                <TableHead className="pr-4 text-right">Mortes &lt;15</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow
                  key={r.matchId}
                  tabIndex={0}
                  onClick={() => setSelected(r)}
                  onKeyDown={(e) => e.key === 'Enter' && setSelected(r)}
                  className={`cursor-pointer border-l-4 ${r.remake ? 'border-l-transparent opacity-40' : r.win ? 'border-l-emerald-500' : 'border-l-red-500'}`}
                >
                  <TableCell className="pl-4">
                    <div className="flex items-center gap-3">
                      <Badge
                        variant="outline"
                        className={
                          r.remake ? '' : r.win ? `border-emerald-500/40 ${WIN}` : `border-red-500/40 ${LOSS}`
                        }
                      >
                        {r.remake ? 'R' : r.win ? 'V' : 'D'}
                      </Badge>
                      {ddVersion && (
                        // ponytail: championName bate com o nome do arquivo no Data Dragon quase sempre; se algum falhar, a imagem só some
                        <img
                          src={`${DDRAGON}/cdn/${ddVersion}/img/champion/${r.champion}.png`}
                          alt=""
                          className="size-9 rounded-md"
                          loading="lazy"
                          onError={(e) => (e.currentTarget.style.display = 'none')}
                        />
                      )}
                      <div>
                        <p className="font-medium">{r.champion}</p>
                        <p className="text-xs text-muted-foreground">{r.position || '—'}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p>
                      {r.kills} / <span className={LOSS}>{r.deaths}</span> / {r.assists}
                    </p>
                    <p className="text-xs text-muted-foreground">{r.kda} KDA</p>
                  </TableCell>
                  <TableCell className="text-right">{r.csPerMin}</TableCell>
                  <TableCell className="text-right">{r.goldPerMin}</TableCell>
                  <TableCell className="text-right">{r.xpPerMin}</TableCell>
                  <TableCell className="text-right">{diff(r.csDiffAt10)}</TableCell>
                  <TableCell className="text-right">{diff(r.goldDiffAt10)}</TableCell>
                  <TableCell className="text-right">{diff(r.xpDiffAt10)}</TableCell>
                  <TableCell className="pr-4 text-right">{r.deathsBefore15}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : (
        !loading && (
          <div className="rounded-xl border border-dashed py-16 text-center text-muted-foreground">
            Digite um Riot ID para ver as métricas das partidas.
          </div>
        )
      )}
    </main>
  )
}
