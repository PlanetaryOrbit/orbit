import type { NextApiRequest, NextApiResponse } from "next"
import axios from "axios"
import prisma from "@/utils/database"
import Package from "@/package.json"
import * as cookie from 'cookie'
import { createSession, getSessionByToken } from "@/utils/session"
import { AuthenticatedRequest } from "@/lib/withAuth"

type DiscordTokenResponse = {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token: string
}

type DiscordUserResponse = {
  id: string
  username: string
  avatar: string
}

export default async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  const { code, state, error } = req.query

  if (error) {
    return res.redirect("/login?error=oauth_error")
  }

  if (!code || !state || typeof state !== "string") {
    return res.redirect("/login?error=missing_params")
  }

  const oauthState = await prisma.oAuthState.findUnique({
    where: { state },
  })

  if (!oauthState) {
    return res.redirect("/login?error=invalid_state")
  }

  if (oauthState.expiresAt < new Date()) {
    await prisma.oAuthState.delete({ where: { state } })
    return res.redirect("/login?error=expired_state")
  }

  await prisma.oAuthState.delete({ where: { state } })

  let clientId = process.env.DISCORD_APPLICATION_ID
  let clientSecret = process.env.DISCORD_SECRET

  if (!clientId || !clientSecret) {
    const configs = await prisma.instanceConfig.findMany({
      where: {
        key: {
          in: ["discordAppID", "discordAppSecret"],
        },
      },
    })

    const map = configs.reduce((acc, c) => {
      acc[c.key] =
        typeof c.value === "string" ? c.value.trim() : c.value
      return acc
    }, {} as Record<string, any>)

    clientId ||= map.discordAppID
    clientSecret ||= map.discordAppSecret
  }

  if (!clientId || !clientSecret) {
    return res.redirect("/login?error=config_error")
  }

  try {
    const tokenResponse = await axios.post<DiscordTokenResponse>(
      "https://discord.com/api/v10/oauth2/token",
      new URLSearchParams({
        grant_type: "authorization_code",
        code: code as string,
        redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/discord/callback`,
        client_id: clientId,
        client_secret: clientSecret,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": `orbit/${Package.version}`,
        },
      }
    )

    const accessToken = tokenResponse.data.access_token

    const userResponse = await axios.get<DiscordUserResponse>(
      "https://discord.com/api/v10/users/@me",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "User-Agent": `orbit/${Package.version}`,
        },
      }
    )

    const discordUser = userResponse.data
    const discordUserId = BigInt(discordUser.id)

    const existingDiscord = await prisma.discordUser.findUnique({
      where: { discordUserId },
    });


    const cookies = cookie.parse(req.headers.cookie || "")
    const sessionToken = cookies.session_token

    if (sessionToken) {
      const info = await getSessionByToken(sessionToken)

      if (info) {
        await prisma.discordUser.upsert({
          where: { discordUserId },
          update: {
            username: discordUser.username,
            avatar: discordUser.avatar,
            robloxUserId: info.userId,
          },
          create: {
            discordUserId,
            username: discordUser.username,
            avatar: discordUser.avatar,
            robloxUserId: info.userId,
          },
        })

        return res.redirect("/?action=linked")
      }
    }

    if (!existingDiscord?.robloxUserId) {
      return res.redirect("/login?error=not_linked")
    }

    const ipAddress =
      (req.headers["cf-connecting-ip"] as string) ||
      (req.headers["x-real-ip"] as string) ||
      (req.headers["x-forwarded-for"] as string)
        ?.split(",")[0]
        ?.trim() ||
      req.socket.remoteAddress ||
      "unknown"

    const session = await createSession(
      existingDiscord.robloxUserId,
      ipAddress,
      req.headers["user-agent"]
    )

    res.setHeader(
      "Set-Cookie",
      `session_token=${session.token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${60 * 60 * 24 * 7
      }; ${process.env.NODE_ENV === "production" ? "Secure;" : ""}`
    )

    return res.redirect("/")
  } catch (err) {
    console.error("Discord OAuth error:", err)

    if (axios.isAxiosError(err)) {
      console.error(err.response?.data)
    }

    return res.redirect("/login?error=oauth_failed")
  }
}