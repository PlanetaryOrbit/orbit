import type { NextApiRequest, NextApiResponse } from 'next';
// import { withAuth } from '@/lib/withSession';
import { google } from 'googleapis';
import prisma from '@/utils/database';
import { AuthenticatedRequest } from '@/lib/withAuth';
import { createSession, getSessionByToken } from '@/utils/session';
import cookie from "cookie"

export default async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({
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

  let clientId = process.env.GOOGLE_APP_ID
  let clientSecret = process.env.GOOGLE_SECRET
  let emailFiltration = process.env.GOOGLE_EMAIL_FILTRATION

  if (!clientId || !clientSecret) {
    try {
      const configs = await prisma.instanceConfig.findMany({
        where: {
          key: {
            in: [
              "google_id",
              "google_secret",
              "google_email_filtration",
            ],
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

      clientId ||= configMap.google_id
      clientSecret ||= configMap.google_secret
      emailFiltration ||= configMap.google_email_filtration
    } catch (err) {
      console.error("Failed to fetch OAuth config:", err)
    }
  }

  if (!clientId || !clientSecret) {
    return res.redirect("/login?error=config_error")
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    `${baseUrl}/api/auth/google/callback`
  )

  try {
    const { tokens } = await oauth2Client.getToken(code as string)

    if (!tokens.access_token) {
      throw new Error("No access token returned")
    }

    oauth2Client.setCredentials(tokens)

    const peopleService = google.people({
      version: "v1",
      auth: oauth2Client,
    })

    const profileResponse = await peopleService.people.get({
      resourceName: "people/me",
      personFields: "names,photos,emailAddresses",
    })

    const profile = profileResponse.data

    const googleId =
      profile.resourceName?.replace("people/", "")

    if (!googleId) {
      throw new Error("Could not extract Google ID")
    }

    const displayName =
      profile.names?.[0]?.displayName ?? "Unknown"

    const avatar =
      profile.photos?.[0]?.url ?? null

    const email =
      profile.emailAddresses?.[0]?.value ?? null

    if (emailFiltration) {
      if (!email?.includes(emailFiltration)) {
        return res.redirect(
          "/login?error=unauthorized-domain"
        )
      }
    }

    const existingGoogle = await prisma.googleUser.findUnique({
      where: {
        googleUserId: googleId,
      },
    })

    const cookies = cookie.parse(req.headers.cookie || "")
    const sessionToken = cookies.session_token

    if (sessionToken) {
      const info = await getSessionByToken(sessionToken);
      if (info) {
        await prisma.googleUser.upsert({
          where: {
            googleUserId: googleId,
          },
          update: {
            username: displayName,
            avatar,
            email,
            robloxUserId: req.auth.userId,
          },
          create: {
            googleUserId: googleId,
            username: displayName,
            avatar,
            email,
            robloxUserId: req.auth.userId,
          },
        })

        return res.redirect("/?action=linked")
      }
    }

    if (!existingGoogle?.robloxUserId) {
      return res.redirect(
        "/login?error=google-not-linked"
      )
    }

    const ipAddress = (
      req.headers["cf-connecting-ip"] ||
      req.headers["x-real-ip"] ||
      (req.headers["x-forwarded-for"] as string)?.split(",")[0] ||
      req.socket.remoteAddress
    ) as string

    const session = await createSession(
      existingGoogle.robloxUserId,
      ipAddress,
      req.headers["user-agent"]
    )

    res.setHeader(
      "Set-Cookie",
      `session_token=${session.token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${60 * 60 * 24 * 30}`
    )

    return res.redirect("/")
  } catch (err) {
    console.error("Google OAuth callback error:", err)

    return res.redirect("/?error=link-fail")
  }
}