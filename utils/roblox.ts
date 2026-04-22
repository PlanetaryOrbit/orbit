import axios from "axios";
import noblox from "noblox.js";
import { OpenCloud } from '@relatiohq/opencloud'
import packageInfo from '@/package.json'

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

export async function terminateUser(userid: number, groupid: number, apiKey: string) {
  const Client = await initiateClient(apiKey);
  try {
    // read group ranks
    const roles = await Client.groups.listGroupRoles(groupid.toString());
    const targetRole = roles.groupRoles.find((grole) => grole.rank == 1) // guest role;
    if (!targetRole) {
      console.log("[Integrated Ranking]: Couldn't find role with rank id 1.")
      return {
        success: false,
        error: "Couldn't find role with rank id 1."
      }
    }
    await Client.groups.updateGroupMembership(groupid.toString(), userid.toString(), targetRole.id);
    return {
      success: true,
      message: "User ranked successfully."
    }
  } catch (err) {
    console.log("[Integrated Ranking]: An issue occured while ")
  }
}

export async function promoteUser(userid: number, groupid: number, apiKey: string) {
  const Client = await initiateClient(apiKey);

  try {
    const userRoles = await Client.groups.listGroupMemberships(groupid.toString(), {
      filter: `user == 'users/${userid}'`
    });

    const GroupRoles = await Client.groups.listGroupRoles(groupid.toString());

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

    const nextRole = GroupRoles.groupRoles
      .filter((r) => r.rank > groupRole.rank)
      .sort((a, b) => a.rank - b.rank)[0]; // sort in ascending order

    if (!nextRole) {
      return {
        success: false,
        error: "User is already at highest rank."
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

    const GroupRoles = await Client.groups.listGroupRoles(groupid.toString());

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

    const nextRole = GroupRoles.groupRoles
      .filter((r) => r.rank < groupRole.rank)
      .sort((a, b) => b.rank - a.rank)[0]; // sort in descending order

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

export async function rankChange(userid: number, groupid: number, rankid: number, apiKey: string) {
  const Client = await initiateClient(apiKey);

  try {
    const GroupRoles = await Client.groups.listGroupRoles(groupid.toString());
    const TargetRole = GroupRoles.groupRoles.find((grole) => grole.rank == rankid);

    if (!TargetRole) {
      return {
        success: false,
        error: "Target role is non existent."
      }
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

// Keep individual exports
export const getRobloxUsername = async (id: number | bigint, apiKey?: string) =>
  (await getRobloxUserInfo(id, apiKey ? apiKey : undefined)).username;

export const getRobloxDisplayName = async (id: number | bigint, apiKey?: string) =>
  (await getRobloxUserInfo(id, apiKey ? apiKey : undefined)).displayName;