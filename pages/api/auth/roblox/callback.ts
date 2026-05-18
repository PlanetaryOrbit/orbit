import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/utils/database'
import axios from 'axios'
import { getRobloxThumbnail } from '@/utils/roblox'
import { createSession } from '@/utils/session'

interface RobloxTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  scope: string
}

interface RobloxUserInfo {
  sub: string
  name: string
  nickname: string
  preferred_username: string
  profile: string
  picture: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { code, state, error } = req.query

  if (error) {
    return res.redirect('/login?error=oauth_error')
  }

  if (!code || !state || typeof state !== 'string') {
    return res.redirect('/login?error=missing_params')
  }

  const oauthState = await prisma.oAuthState.findUnique({
    where: { state },
  })

  if (!oauthState) {
    return res.redirect('/login?error=invalid_state')
  }

  if (oauthState.expiresAt < new Date()) {
    await prisma.oAuthState.delete({
      where: { state },
    })

    return res.redirect('/login?error=expired_state')
  }

  await prisma.oAuthState.delete({
    where: { state },
  })

  let clientId = process.env.ROBLOX_CLIENT_ID
  let clientSecret = process.env.ROBLOX_CLIENT_SECRET
  let redirectUri = process.env.ROBLOX_REDIRECT_URI

  if (!clientId || !clientSecret || !redirectUri) {
    const configs = await prisma.instanceConfig.findMany({
      where: {
        key: {
          in: [
            'robloxClientId',
            'robloxClientSecret',
            'robloxRedirectUri',
          ],
        },
      },
    })

    const map = configs.reduce((acc, c) => {
      acc[c.key] =
        typeof c.value === 'string'
          ? c.value.trim()
          : c.value
      return acc
    }, {} as Record<string, any>)

    clientId ||= map.robloxClientId
    clientSecret ||= map.robloxClientSecret
    redirectUri ||= map.robloxRedirectUri
  }

  if (!clientId || !clientSecret || !redirectUri) {
    return res.redirect('/login?error=config_error')
  }

  try {
    const tokenResponse = await axios.post<RobloxTokenResponse>(
      'https://apis.roblox.com/oauth/v1/token',
      new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code: code as string,
        redirect_uri: redirectUri,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    )

    const accessToken = tokenResponse.data.access_token

    const userResponse = await axios.get<RobloxUserInfo>(
      'https://apis.roblox.com/oauth/v1/userinfo',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    const userInfo = userResponse.data
    const userId = BigInt(userInfo.sub)

    if (!userId) {
      return res.redirect('/login?error=invalid_user')
    }

    const thumbnail =
      (await getRobloxThumbnail(Number(userId))) || undefined

    const username =
      userInfo.preferred_username || userInfo.name

    await prisma.user.upsert({
      where: { userid: userId },
      update: {
        username,
        picture: thumbnail,
        registered: true,
      },
      create: {
        userid: userId,
        username,
        picture: thumbnail,
        registered: true,
      },
    })

    const ipAddress =
      (req.headers['cf-connecting-ip'] as string) ||
      (req.headers['x-real-ip'] as string) ||
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      req.socket.remoteAddress ||
      'unknown'

    const session = await createSession(
      userId,
      ipAddress,
      req.headers['user-agent']
    )

    res.setHeader(
      'Set-Cookie',
      `session_token=${session.token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${
        60 * 60 * 24 * 30
      }; ${process.env.NODE_ENV === 'production' ? 'Secure;' : ''}`
    )

    return res.redirect('/')
  } catch (err) {
    console.error('OAuth callback error:', err)

    if (axios.isAxiosError(err)) {
      console.error(err.response?.data)
    }

    return res.redirect('/login?error=oauth_failed')
  }
}