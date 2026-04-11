import axios from "axios";
import noblox from "noblox.js";
import { OpenCloud } from '@relatiohq/opencloud'
import packageInfo from '@/package.json'
import apiKeys from "@/pages/api/workspace/[id]/settings/api-keys";

const TIMEOUT_MS = 12000;

async function withTimeout<T>(promise: Promise<T>, ms = TIMEOUT_MS): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("Request timed out")), ms)
    ),
  ]);
}

export interface RobloxUserInfo {
  username: string;
  displayName: string;
}

export async function initiateClient(apiKey: string) {
  const Client = new OpenCloud({
    apiKey,
    userAgent: `${packageInfo.name}/${packageInfo.version}`
  });

  return Client
}

export async function getRobloxUserInfo(id: number | bigint, apiKey?: string): Promise<RobloxUserInfo> {
  const Client = apiKey ? await initiateClient(apiKey) : undefined;
  try {
    const userInfo = await withTimeout<any>(
      Client
        ? Client.users.get(id.toString()) 
        : noblox.getUserInfo(Number(id))
    );
    return {
      username: userInfo.name ?? "Unknown User",
      displayName: userInfo.displayName ?? userInfo.name ?? "Unknown User",
    };
  } catch (error) {
    console.error(`Error getting user info for user ${id}:`, error);
    return { username: "Unknown User", displayName: "Unknown User" };
  }
}

export async function getRobloxThumbnail(id: number | bigint): Promise<string | null> {
  try {
    const thumbnails = await withTimeout(
      noblox.getPlayerThumbnail(Number(id), "720x720", "png", false, "headshot")
    );
    return thumbnails[0]?.imageUrl ?? "";
  } catch (error) {
    console.error(`Error getting thumbnail for user ${id}:`, error);
    return null;
  }
}

export async function getUsersWithinAGroupRoleset(
    groupid: number,
    roleid: number,
    apiKey: string
) {
    try {
        let allUsers: any[] = [];
        let pageToken = "";
        const rolePath = `groups/${groupid}/roles/${roleid}`;

        do {
            const res = await axios.get(
                `https://apis.roblox.com/cloud/v2/groups/${groupid}/memberships`,
                {
                    params: {
                        maxPageSize: 1000,
                        filter: `role == '${rolePath}'`,
                        ...(pageToken ? { pageToken } : {}),
                    },
                    headers: {
                        "x-api-key": apiKey,
                    },
                }
            );

            if (res.status !== 200) {
                return { success: false, message: "Non-200 response", data: [] };
            }

            const { groupMemberships, nextPageToken } = res.data;
            allUsers = allUsers.concat(groupMemberships || []);
            pageToken = nextPageToken || "";

        } while (pageToken !== "");

        return { success: true, data: allUsers };
    } catch (err) {
        console.log(`ROBLOX API Error: ${err}`);
        return { success: false, message: err, data: [] };
    }
}

export async function getRobloxUserId(username: string): Promise<number> {
  try {
    return await withTimeout(noblox.getIdFromUsername(username));
  } catch (error) {
    console.error(`Error getting user ID for username ${username}:`, error);
    throw error;
  }
}

// Keep individual exports
export const getRobloxUsername = async (id: number | bigint, apiKey?: string) =>
  (await getRobloxUserInfo(id, apiKey ? apiKey : undefined)).username;

export const getRobloxDisplayName = async (id: number | bigint, apiKey?: string) =>
  (await getRobloxUserInfo(id, apiKey ? apiKey : undefined)).displayName;