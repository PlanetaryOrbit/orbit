import type { NextApiResponse } from "next"
import axios from "axios"
import Package from "@/package.json"
import prisma from "@/utils/database"
import { AuthenticatedRequest, withAuth } from "@/lib/withAuth"
import { createSession } from "@/utils/session"

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

export default withAuth(handler)

export async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed",
    })
  }

  const { code, error } = req.query

  if (error) {
    console.error("OAuth error:", error)
    return res.redirect("/login?error=oauth_error")
  }

  if (!code) {
    return res.redirect("/login?error=missing_code")
  }

  const originUrl = req.headers.host
  const isLocalhost = originUrl?.includes("localhost")

  const baseUrl = `${isLocalhost ? "http://" : "https://"}${originUrl}`

  let clientId = process.env.DISCORD_APPLICATION_ID
  let clientSecret = process.env.DISCORD_SECRET

  if (!clientId || !clientSecret) {
    try {
      const configs = await prisma.instanceConfig.findMany({
        where: {
          key: {
            in: ["discordAppID", "discordAppSecret"],
          },
        },
      })

      const configMap = configs.reduce((acc, config) => {
        acc[config.key] =
          typeof config.value === "string"
            ? config.value.trim()
            : config.value

        return acc
      }, {} as Record<string, any>)

      clientId ||= configMap.discordAppID
      clientSecret ||= configMap.discordAppSecret
    } catch (err) {
      console.error("Failed fetching OAuth config:", err)
    }
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
        redirect_uri: `${baseUrl}/api/auth/discord/callback`,
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

    const { access_token } = tokenResponse.data

    const userResponse = await axios.get<DiscordUserResponse>(
      "https://discord.com/api/v10/users/@me",
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
          "User-Agent": `orbit/${Package.version}`,
        },
      }
    )

    const discordUser = userResponse.data
    const discordUserIdBig = BigInt(discordUser.id)

    const existingDiscord = await prisma.discordUser.findUnique({
      where: {
        discordUserId: discordUserIdBig,
      },
    })

    if (req.auth?.userId) {
      await prisma.discordUser.upsert({
        where: {
          discordUserId: discordUserIdBig,
        },
        update: {
          username: discordUser.username,
          avatar: discordUser.avatar,
          robloxUserId: req.auth.userId,
        },
        create: {
          discordUserId: discordUserIdBig,
          username: discordUser.username,
          avatar: discordUser.avatar,
          robloxUserId: req.auth.userId,
        },
      })

      return res.redirect("/?action=linked")
    }

    if (!existingDiscord?.robloxUserId) {
      return res.redirect("/login?error=discord-not-linked")
    }

    const ipAddress = (
      req.headers["cf-connecting-ip"] ||
      req.headers["x-real-ip"] ||
      (req.headers["x-forwarded-for"] as string)?.split(",")[0] ||
      req.socket.remoteAddress
    ) as string

    const session = await createSession(
      existingDiscord.robloxUserId,
      ipAddress,
      req.headers["user-agent"]
    )

    res.setHeader(
      "Set-Cookie",
      `session_token=${session.token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${60 * 60 * 24 * 30}`
    )

    return res.redirect("/")
  } catch (err) {
    console.error("OAuth callback error:", err)

    if (axios.isAxiosError(err)) {
      console.error("Response:", err.response?.data)
    }

    return res.redirect("/?error=link-fail")
  }
}