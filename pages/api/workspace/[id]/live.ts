import type { NextApiRequest, NextApiResponse } from "next";
import { getConfig } from "@/utils/configEngine";

// Simple in-memory cache: Map<workspaceId, { expiresAt: number, data: any }>
const cache = new Map<string, { expiresAt: number; data: any }>()

// Fetch helper with timeout
async function fetchWithTimeout(input: RequestInfo, init?: RequestInit, timeout = 10000) {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeout)
  try {
    const res = await fetch(input, { ...init, signal: controller.signal })
    clearTimeout(id)
    return res
  } catch (err) {
    clearTimeout(id)
    throw err
  }
}

// Get public servers for a universe
async function getServersForUniverse(universeId: number | string) {
  const url = `https://games.roblox.com/v1/games/${universeId}/servers/Public?sortOrder=Desc&limit=50`
  const res = await fetchWithTimeout(url, undefined, 10000)
  if (!res.ok) throw new Error(`Servers request failed: ${res.status}`)
  const body = await res.json()
console.log(body)
  // body.data expected
  const servers = Array.isArray(body.data) ? body.data.map((s: any) => ({
    id: s.id,
    playing: s.playing,
    maxPlayers: s.maxPlayers
  })) : []
  console.log(`Fetched ${servers.length} servers for universe ${universeId}`)
  return servers
}

// Resolve placeId -> universeId using apis.roblox.com (non-fatal)
async function resolveUniverseIdFromPlace(placeId: string): Promise<number | null> {
  try {
    const url = `https://apis.roblox.com/universes/v1/places/${encodeURIComponent(placeId)}/universe`
    const res = await fetchWithTimeout(url, undefined, 8000)
    if (!res.ok) {
      throw new Error(`resolve failed: ${res.status}`)
    }
    const body = await res.json()
    if (body && (body.universeId || body.universeId === 0)) return Number(body.universeId)
    return null
  } catch (err) {
    console.warn('resolveUniverseIdFromPlace failed for', placeId, err && (err as any).message ? (err as any).message : err)
    return null
  }
}

// Optionally fetch universe metadata from develop.roblox.com (may require auth)
async function fetchUniverseDetails(universeId: number | string) {
  try {
    const url = `https://develop.roblox.com/v1/universes/${encodeURIComponent(String(universeId))}`
    const res = await fetchWithTimeout(url, undefined, 8000)
    if (!res.ok) throw new Error(`universe details failed: ${res.status}`)
    return await res.json()
  } catch (err) {
    console.warn('fetchUniverseDetails failed for', universeId, err && (err as any).message ? (err as any).message : err)
    return null
  }
}

// Live endpoint: returns configured games and their active servers (queried from Roblox)
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id: workspaceId } = req.query;
  if (!workspaceId || typeof workspaceId !== "string") return res.status(400).json({ success: false, error: 'Invalid workspace id' });
  const gid = parseInt(workspaceId)

  // Return cached results if fresh (TTL: 5 minutes)
  const cached = cache.get(workspaceId)
  if (cached && cached.expiresAt > Date.now()) {
    try {
      return res.status(200).json({ success: true, games: cached.data })
    } catch (err) {
      // Fall through to refetch on any unexpected error
      console.warn('Failed to return cached live results, refetching', err)
    }
  }

  try {
    const games = (await getConfig("live_games", gid)) || []

    const results = await Promise.all(games.map(async (g: any) => {
      const configuredId = String(g.placeId || "").trim()
      const name = g.name || null
      if (!configuredId) return { name, placeId: configuredId, servers: [], error: 'No id configured' }

      try {
        // Try to resolve a universeId from the configured id (treat configuredId as a place id)
        let universeId: number | string | null = await resolveUniverseIdFromPlace(configuredId)
        if (universeId == null) {
          // If resolution failed, assume the configured id is already a universe id
          universeId = Number(configuredId) || configuredId
        }

        // Optionally fetch universe metadata for a nicer name (non-fatal)
        const meta = await fetchUniverseDetails(universeId)
        const resolvedName = meta?.name || name ||  `Universe ${universeId}`

        const servers = await getServersForUniverse(configuredId)
        return { name: resolvedName, placeId: configuredId, universeId, servers }
      } catch (err: any) {
        console.error(`Failed to fetch live info for id ${configuredId}:`, err && err.message ? err.message : err)
        return { name, placeId: configuredId, servers: [], error: err && err.message ? err.message : 'Failed to fetch' }
      }
    }))

    // Store results in cache for 5 minutes
    try {
      cache.set(workspaceId, { expiresAt: Date.now() + 5 * 60 * 1000, data: results })
    } catch (err) {
      console.warn('Failed to cache live results', err)
    }

    return res.status(200).json({ success: true, games: results })
  } catch (err) {
    console.error('live api error', err)
    return res.status(500).json({ success: false, error: 'Internal error' })
  }
}
