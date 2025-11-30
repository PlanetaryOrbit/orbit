import workspace from "@/layouts/workspace"
import type { pageWithLayout } from "@/layoutTypes"
import { useRouter } from "next/router"
import { useEffect, useState } from "react"
import Button from "@/components/button"
import clsx from "clsx"
import { IconRefresh, IconServer, IconAlertCircle } from "@tabler/icons-react"

const Live: pageWithLayout = () => {
  const router = useRouter()
  const { id } = router.query
  const [loading, setLoading] = useState(false)
  const [games, setGames] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)

  const fetchLive = async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/workspace/${id}/live`, { method: 'GET' })
      if (!res.ok) throw new Error('Failed')
      const d = await res.json()
      if (d && d.success) setGames(d.games || [])
      else setError('Failed to load live data')
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchLive() }, [id])

  return (
    <div className="pagePadding">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white">Live</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Monitor which servers your staff are currently active in. Results are saved for 5 minutes.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={fetchLive}>Refresh</Button>
            <Button onClick={() => router.push(`/workspace/${id}/settings`)}>Configure</Button>
          </div>
        </div>

        {loading && <div className="p-6 bg-white dark:bg-zinc-800 rounded-lg">Loading…</div>}

        {!loading && error && (
          <div className="p-6 bg-red-50 dark:bg-red-900/30 rounded-lg text-red-700 dark:text-red-300">{error}</div>
        )}

        {!loading && !error && games.length === 0 && (
          <div className="p-6 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-100 dark:border-zinc-700 text-center">
            <IconAlertCircle className="mx-auto w-8 h-8 text-zinc-400 dark:text-zinc-400 mb-3" />
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">No games configured</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Add games in the workspace settings to start monitoring active servers.</p>
            <div className="mt-4"><Button onClick={() => router.push(`/workspace/${id}/settings`)}>Open Settings</Button></div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {games.map((g, idx) => (
            <div key={idx} className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-4 border border-zinc-100 dark:border-zinc-700">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center"><IconServer className="w-5 h-5 text-primary"/></div>
                  <div>
                    <div className="font-medium text-zinc-900 dark:text-white">{g.name || `Place ${g.placeId}`}</div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">Place ID: {g.placeId}</div>
                  </div>
                </div>
                <div>
                  <a className="text-sm text-primary" target="_blank" rel="noreferrer" href={`https://www.roblox.com/games/${g.placeId}`}>Open</a>
                </div>
              </div>

              {g.servers && g.servers.length > 0 ? (
                <div className="space-y-2">
                  {g.servers.map((s: any) => (
                    <div key={s.id} className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded flex items-center justify-between border border-zinc-100 dark:border-zinc-700">
                      <div>
                        <div className="font-medium text-zinc-900 dark:text-white">{s.name || s.id}</div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">Players: {s.playing || 0}</div>
                      </div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">{s.startedAt ? new Date(s.startedAt).toLocaleTimeString() : ''}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 text-sm text-zinc-500 dark:text-zinc-400">No active servers found for this game.</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

Live.layout = workspace

export default Live
