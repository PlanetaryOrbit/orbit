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
  id_token?: string
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
    return res.status(405).json({
      error: 'Method not allowed',
    })
  }

  const { code, state, error } = req.query

  if (error) {
    console.error('OAuth error:', error)
    return res.redirect('/login?error=oauth_error')
  }

  if (!code || !state) {
    return res.redirect('/login?error=missing_params')
  }

  if (state !== req.session.oauthState) {
    console.error('OAuth state mismatch')
    return res.redirect('/login?error=state_mismatch')
  }

  // clear state immediately after validation
  delete req.session.oauthState
  await req.session.save()

  let clientId = process.env.ROBLOX_CLIENT_ID
  let clientSecret = process.env.ROBLOX_CLIENT_SECRET
  let redirectUri = process.env.ROBLOX_REDIRECT_URI

  if (!clientId || !clientSecret || !redirectUri) {
    try {
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

      const configMap = configs.reduce((acc, config) => {
        acc[config.key] =
          typeof config.value === 'string'
            ? config.value.trim()
            : config.value

        return acc
      }, {} as Record<string, any>)

      clientId = clientId || configMap.robloxClientId
      clientSecret =
        clientSecret || configMap.robloxClientSecret
      redirectUri =
        redirectUri || configMap.robloxRedirectUri
    } catch (error) {
      console.error(
        'Failed to fetch OAuth config from database:',
        error
      )
    }
  }

  if (!clientId || !clientSecret || !redirectUri) {
    console.error('Missing Roblox OAuth configuration')

    return res.redirect('/login?error=config_error')
  }

  try {
    const tokenResponse =
      await axios.post<RobloxTokenResponse>(
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
            'Content-Type':
              'application/x-www-form-urlencoded',
          },
        }
      )

    const { access_token } = tokenResponse.data

    const userResponse =
      await axios.get<RobloxUserInfo>(
        'https://apis.roblox.com/oauth/v1/userinfo',
        {
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        }
      )

    const userInfo = userResponse.data

    const userId = parseInt(userInfo.sub, 10)

    if (!userId || isNaN(userId)) {
      console.error(
        'Invalid user ID from Roblox:',
        userInfo.sub
      )

      return res.redirect('/login?error=invalid_user')
    }

    const thumbnail =
      (await getRobloxThumbnail(userId)) || undefined

    const username =
      userInfo.preferred_username || userInfo.name

    await prisma.user.upsert({
      where: {
        userid: BigInt(userId),
      },
      update: {
        username,
        picture: thumbnail,
        registered: true,
      },
      create: {
        userid: BigInt(userId),
        username,
        picture: thumbnail,
        registered: true,
      },
    })

    // create real auth session
    const ipAddress =
      (req.headers['cf-connecting-ip'] as string) ||
      (req.headers['x-real-ip'] as string) ||
      (req.headers['x-forwarded-for'] as string)
        ?.split(',')[0] ||
      req.socket.remoteAddress ||
      'unknown'

    const session = await createSession(
      BigInt(userId),
      ipAddress,
      req.headers['user-agent']
    )

    // set auth cookie
    res.setHeader(
      'Set-Cookie',
      [
        `session_token=${session.token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${
          60 * 60 * 24 * 30
        }; ${
          process.env.NODE_ENV === 'production'
            ? 'Secure;'
            : ''
        }`,
      ]
    )

    return res.redirect('/')
  } catch (error) {
    console.error('OAuth callback error:', error)

    if (axios.isAxiosError(error)) {
      console.error(
        'Response data:',
        error.response?.data
      )

      console.error(
        'Response status:',
        error.response?.status
      )
    }

    return res.redirect('/login?error=oauth_failed')
  }
}