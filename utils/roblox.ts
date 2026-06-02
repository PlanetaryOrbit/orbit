import axios from "axios";
import noblox from "noblox.js";
import { OpenCloud } from '@relatiohq/opencloud'
import packageInfo from '@/package.json'

const TIMEOUT_MS = 12000;

// Rate limiting state for noblox requests
let nobloxRequestCount = 0;
let nobloxRateLimitReset = Date.now();
const NOBLOX_REQUEST_LIMIT = 60;
const NOBLOX_TIME_WINDOW = 60000;

async function withTimeout<T>(promise: Promise<T>, ms = TIMEOUT_MS): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("Request timed out")), ms)
    ),
  ]);
}

async function waitForNobloxRateLimit() {
  const now = Date.now();
  
  if (now - nobloxRateLimitReset >= NOBLOX_TIME_WINDOW) {
    nobloxRequestCount = 0;
    nobloxRateLimitReset = now;
  }
  
  if (nobloxRequestCount >= NOBLOX_REQUEST_LIMIT) {
    const waitTime = NOBLOX_TIME_WINDOW - (now - nobloxRateLimitReset);
    console.warn(`[Roblox] Rate limit reached. Waiting ${waitTime}ms...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
    nobloxRequestCount = 0;
    nobloxRateLimitReset = Date.now();
  }
  
  nobloxRequestCount++;
}

export interface RobloxUserInfo {
  username: string;
  displayName: string;
}

export interface UserRankInfo {
  rank: number;
  roleName: string;
  roleId: string;
}

export async function initiateClient(apiKey: string) {
  const Client = new OpenCloud({
    apiKey,
    userAgent: `${packageInfo.name}/${packageInfo.version}`
  });

  return Client
}

async function listAllGroupRolesForGroup(client: any, groupId: string) {
  const all: any[] = [];
  const seen = new Set<string>();
  let pageToken: string | undefined;

  while (true) {
    const res: any = await withTimeout(
      client.groups.listGroupRoles(groupId, {
        maxPageSize: 20,
        ...(pageToken ? { pageToken } : {}),
      })
    );

    const roles =
      res.groupRoles ??
      res.roles ??
      res.data?.groupRoles ??
      [];

    for (const role of roles) {
      if (!role?.id) continue;
      if (seen.has(role.id)) continue;

      seen.add(role.id);
      all.push(role);
    }

    const next =
      res.nextPageToken ??
      res.data?.nextPageToken;

    if (!next || next === pageToken) break;

    pageToken = next;
  }

  return all;
}

function robloxRankNum(roleLike: { rank?: unknown }): number {
  return Number(roleLike.rank);
}

export async function getUserRank(
  userid: bigint,
  groupid: bigint,
  apiKey?: string
): Promise<UserRankInfo | null> {
  const Client = apiKey ? await initiateClient(apiKey) : undefined;

  try {
    if (Client) {
      const memberships = await withTimeout<any>(
        Client.groups.listGroupMemberships(groupid.toString(), {
          filter: `user == 'users/${userid}'`,
        })
      );

      if (!memberships.groupMemberships?.length) return null;

      const membership = memberships.groupMemberships[0];
      const roleId = membership.role.split("/").pop();
      if (!roleId) return null;

      const groupRole = await withTimeout<any>(
        Client.groups.getGroupRole(groupid.toString(), roleId)
      );

      return {
        rank: groupRole.rank,
        roleName: groupRole.displayName ?? groupRole.name ?? "Unknown",
        roleId: roleId,
      };

    } else {
      const [rank, roles] = await withTimeout<any>(
        Promise.all([
          noblox.getRankInGroup(Number(groupid), Number(userid)),
          noblox.getRoles(Number(groupid)),
        ])
      );

      const role = roles.find((r: any) => r.rank === rank);

      return {
        rank,
        roleName: role?.name ?? "Unknown",
        roleId: role?.id?.toString() ?? "",
      };
    }
  } catch (error) {
    console.error(
      `Error getting rank for user ${userid} in group ${groupid}:`,
      error
    );
    return null;
  }
}

function userInfoFromNobloxPayload(userInfo: any): RobloxUserInfo {
  const username = userInfo?.Username ?? userInfo?.name ?? "Unknown User";
  const displayName =
    userInfo?.displayName ??
    userInfo?.DisplayName ??
    userInfo?.Username ??
    userInfo?.name ??
    "Unknown User";
  return { username, displayName };
}

export async function getRobloxUserInfo(id: number | bigint, apiKey?: string): Promise<RobloxUserInfo> {
  const fromNoblox = async () => {
    await waitForNobloxRateLimit();
    const userInfo = await withTimeout<any>(noblox.getUserInfo(Number(id)));
    return userInfoFromNobloxPayload(userInfo);
  };

  if (!apiKey) {
    try {
      return await fromNoblox();
    } catch (error) {
      console.error(`Error getting user info for user ${id}:`, error);
      return { username: "Unknown User", displayName: "Unknown User" };
    }
  }

  try {
    const Client = await initiateClient(apiKey);
    const userInfo = await withTimeout<any>(Client.users.get(id.toString()));
    return {
      username: userInfo.name ?? "Unknown User",
      displayName: userInfo.displayName ?? userInfo.name ?? "Unknown User",
    };
  } catch (openCloudError) {
    try {
      return await fromNoblox();
    } catch (nobloxError) {
      console.error(
        `[getRobloxUserInfo] user ${id} failed after noblox fallback:`,
        nobloxError
      );
      return { username: "Unknown User", displayName: "Unknown User" };
    }
  }
}

async function getAllRoles(groupId: number, apiKey: string) {
  const roles: any[] = [];
  let pageToken: string | undefined = undefined;
  const seen = new Set<string>();

  do {
    const res = await axios.get(
      `https://apis.roblox.com/cloud/v2/groups/${groupId}/roles`,
      {
        params: {
          maxPageSize: 20,
          pageToken,
        },
        headers: {
          "x-api-key": apiKey,
        },
      }
    );

    const data: any = res.data;

    for (const role of data.groupRoles || []) {
      if (seen.has(role.id)) continue;
      seen.add(role.id);
      roles.push(role);
    }

    pageToken = data.nextPageToken;

    if (!pageToken) break;

  } while (true);

  return roles;
}

export async function terminateUser(userid: number, groupid: number, apiKey: string) {
  const Client = await initiateClient(apiKey);

  try {
    const groupRolesList = await getAllRoles(groupid, apiKey)
    const targetRole = groupRolesList.find((grole) => Number(grole.rank) === 1);
    if (!targetRole) {
      console.log("[Integrated Ranking]: Couldn't find role with rank 1.");
      return { success: false, error: "No rank 1 role found." };
    }

    await Client.groups.updateGroupMembership(
      groupid.toString(),
      userid.toString(),
      targetRole.id
    );

    return { success: true, message: "User ranked successfully." };

  } catch (err) {
    console.log("[Integrated Ranking]: Error:", err);
    return { success: false, error: "Unexpected error" };
  }
}

export async function promoteUser(
  userid: number,
  groupid: number,
  apiKey: string,
  opts?: { maxPromotionRank?: number | null }
) {
  const Client = await initiateClient(apiKey);

  try {
    const userRoles = await Client.groups.listGroupMemberships(groupid.toString(), {
      filter: `user == 'users/${userid}'`
    });

    const groupRolesList = await getAllRoles(groupid, apiKey)

    if (userRoles.groupMemberships.length === 0) {
      return {
        success: false,
        error: "User not in group."
      };
    }

    const user = userRoles.groupMemberships[0];
    const roleId = user.role.split('/').pop();

    if (!roleId) {
      return {
        success: false,
        error: "Invalid role format."
      };
    }

    const groupRole = await Client.groups.getGroupRole(groupid.toString(), roleId);
    const currentRank = robloxRankNum(groupRole);

    const nextRole = groupRolesList
      .filter((r) => robloxRankNum(r) > currentRank)
      .sort((a, b) => robloxRankNum(a) - robloxRankNum(b))[0];

    if (!nextRole) {
      return {
        success: false,
        error: "User is already at highest rank."
      };
    }

    if (
      opts?.maxPromotionRank != null &&
      robloxRankNum(nextRole) > opts.maxPromotionRank
    ) {
      return {
        success: false,
        error: `Integrated Ranking cannot promote past rank ${opts.maxPromotionRank}.`,
      };
    }

    await Client.groups.updateGroupMembership(groupid.toString(), userid.toString(), nextRole.id);

    return {
      success: true,
      message: "User ranked successfully."
    };

  } catch (err) {
    console.error("[Integrated Ranking]:", err);
    return {
      success: false,
      message: "An error occurred while promoting user."
    };
  }
}

export async function demoteUser(userid: number, groupid: number, apiKey: string) {
  const Client = await initiateClient(apiKey);

  try {
    const userRoles = await Client.groups.listGroupMemberships(groupid.toString(), {
      filter: `user == 'users/${userid}'`
    });

    const groupRolesList = await getAllRoles(groupid, apiKey)

    if (userRoles.groupMemberships.length === 0) {
      return {
        success: false,
        error: "User not in group."
      };
    }

    const user = userRoles.groupMemberships[0];
    const roleId = user.role.split('/').pop();

    if (!roleId) {
      return {
        success: false,
        error: "Invalid role format."
      };
    }

    const groupRole = await Client.groups.getGroupRole(groupid.toString(), roleId);
    const currentRank = robloxRankNum(groupRole);

    const nextRole = groupRolesList
      .filter((r) => robloxRankNum(r) < currentRank)
      .sort((a, b) => robloxRankNum(b) - robloxRankNum(a))[0];

    if (!nextRole) {
      return {
        success: false,
        error: "User is already at lowest rank."
      };
    }

    await Client.groups.updateGroupMembership(groupid.toString(), userid.toString(), nextRole.id);

    return {
      success: true,
      message: "User ranked successfully."
    };

  } catch (err) {
    console.error("[Integrated Ranking]:", err);
    return {
      success: false,
      message: "An error occurred while promoting user."
    };
  }
}

export async function rankChange(
  userid: number,
  groupid: number,
  rankid: number,
  apiKey: string,
  opts?: { maxPromotionRank?: number | null }
) {
  const Client = await initiateClient(apiKey);

  try {
    const groupRolesList = await getAllRoles(groupid, apiKey)
    const TargetRole = groupRolesList.find((grole) => Number(grole.rank) === rankid);

    if (!TargetRole) {
      return {
        success: false,
        error: "Target role is non existent."
      }
    }

    if (
      opts?.maxPromotionRank != null &&
      robloxRankNum(TargetRole) > opts.maxPromotionRank
    ) {
      return {
        success: false,
        error: `Integrated Ranking cannot set rank above ${opts.maxPromotionRank}.`,
      };
    }

    await Client.groups.updateGroupMembership(groupid.toString(), userid.toString(), TargetRole.id);

    return {
      success: true,
      message: "User ranked successfully."
    };

  } catch (err) {
    console.error("[Integrated Ranking]:", err);
    return {
      success: false,
      message: "An error occurred while promoting user."
    };
  }
}

export async function getRobloxThumbnail(id: number | bigint): Promise<string | null> {
  try {
    const thumbnail = await axios.get(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${id}&size=720x720&format=Png&isCircular=false`)
    return thumbnail.data.data[0].state == "Completed" ? thumbnail.data.data[0].imageUrl : ""
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
    const safeGroupId = Number(groupid);
    const safeRoleId = Number(roleid);
    if (
      !Number.isSafeInteger(safeGroupId) ||
      !Number.isSafeInteger(safeRoleId) ||
      safeGroupId <= 0 ||
      safeRoleId <= 0
    ) {
      return { success: false, message: "Invalid group or role id", data: [] };
    }

    let allUsers: any[] = [];
    let pageToken = "";
    const rolePath = `groups/${safeGroupId}/roles/${safeRoleId}`;

    do {
      const res = await axios.get(
        `https://apis.roblox.com/cloud/v2/groups/${safeGroupId}/memberships`,
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

export const getRobloxUsername = async (id: number | bigint, apiKey?: string) =>
  (await getRobloxUserInfo(id, apiKey ? apiKey : undefined)).username;

export const getRobloxDisplayName = async (id: number | bigint, apiKey?: string) =>
  (await getRobloxUserInfo(id, apiKey ? apiKey : undefined)).displayName;