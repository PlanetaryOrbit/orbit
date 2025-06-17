import NodeCache from "node-cache";
import * as noblox from 'noblox.js'
import { getRobloxUsername, getRobloxThumbnail, getRobloxDisplayName } from "@/utils/roblox";

const usernames = new NodeCache();
const displaynames = new NodeCache();

export async function getUsername(userId: number | bigint) {
	const cachedUsername = usernames.get(Number(userId));
	if (cachedUsername) {
		return cachedUsername as string;
	} else {
		const username = await getRobloxUsername(Number(userId));
		usernames.set(Number(userId), username);
		return username as string;
	}
}

export async function getThumbnail(userId: number | bigint): Promise<string> {
  return `/api/workspace/[id]/avatar/${userId}`;
}

export async function getDisplayName(userId: number | bigint): Promise<string> {
	const cachedDisplayName = displaynames.get(Number(userId));
	if (cachedDisplayName) {
		return cachedDisplayName as string;
	} else {
		const displayName = await getRobloxDisplayName(Number(userId));
		displaynames.set(Number(userId), displayName);
		return displayName as string;
	}
}

export { getRobloxUsername };