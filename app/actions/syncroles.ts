"use server"
import { syncRobloxData } from "@/lib/crons/sync"

export async function sync(userId: string, robloxId: bigint) {
  syncRobloxData(userId, robloxId)
}
