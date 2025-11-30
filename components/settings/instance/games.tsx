"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/router"
import clsx from "clsx"
import Button from "@/components/button"
import { toast } from "react-hot-toast"

interface GameEntry {
  id?: string
  name: string
  placeId: string
}

const GamesSettings: React.FC & { title: string } = () => {
  const router = useRouter()
  const { id: workspaceId } = router.query

  const [games, setGames] = useState<GameEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!workspaceId) return
    setIsLoading(true)
    fetch(`/api/workspace/${workspaceId}/settings/games`)
      .then((r) => r.json())
      .then((d) => {
        if (d && d.success && Array.isArray(d.games)) setGames(d.games)
      })
      .catch((e) => console.error(e))
      .finally(() => setIsLoading(false))
  }, [workspaceId])

  const handleAdd = () => setGames((s) => [...s, { name: "", placeId: "" }])

  const handleChange = (idx: number, key: keyof GameEntry, value: string) => {
    setGames((prev) => prev.map((g, i) => (i === idx ? { ...g, [key]: value } : g)))
  }

  const handleRemove = (idx: number) => setGames((prev) => prev.filter((_, i) => i !== idx))

  const handleSave = async () => {
    if (!workspaceId) return
    setIsSaving(true)
    try {
      const res = await fetch(`/api/workspace/${workspaceId}/settings/games`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ games }),
      })
      if (!res.ok) throw new Error("Save failed")
      toast.success("Games saved")
    } catch (err) {
      console.error(err)
      toast.error("Failed to save games")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-medium text-zinc-900 dark:text-white mb-2">Live Games</h4>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
          Add the games (place IDs) you want the live server dashboard to monitor. Servers on these games will be fetched from Roblox and displayed in the live dashboard.
        </p>

        <div className="space-y-3">
          {isLoading && <div className="text-sm text-zinc-500">Loading…</div>}
          {games.map((g, i) => (
            <div key={i} className="flex gap-2 items-start">
              <input
                value={g.name}
                onChange={(e) => handleChange(i, "name", e.target.value)}
                placeholder="Game name"
                className={clsx(
                  "flex-1 px-3 py-2 rounded-lg bg-white dark:bg-zinc-800 text-sm",
                  "text-zinc-900 dark:text-white",
                  "placeholder:text-zinc-400 dark:placeholder:text-zinc-500",
                  "border border-zinc-200 dark:border-zinc-700"
                )}
              />
              <input
                value={g.placeId}
                onChange={(e) => handleChange(i, "placeId", e.target.value)}
                placeholder="Place ID"
                className={clsx(
                  "w-36 px-3 py-2 rounded-lg bg-white dark:bg-zinc-800 text-sm",
                  "text-zinc-900 dark:text-white",
                  "placeholder:text-zinc-400 dark:placeholder:text-zinc-500",
                  "border border-zinc-200 dark:border-zinc-700"
                )}
              />
              <button className="text-sm text-red-600" onClick={() => handleRemove(i)}>Remove</button>
            </div>
          ))}

          <div>
            <button onClick={handleAdd} className="text-primary text-sm">+ Add game</button>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-zinc-200 dark:border-zinc-700">
        <Button onClick={handleSave} disabled={isSaving}>{isSaving ? "Saving…" : "Save Games"}</Button>
      </div>
    </div>
  )
}

GamesSettings.title = "Games"

export default GamesSettings
