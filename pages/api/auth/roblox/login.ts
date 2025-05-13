import oidcConfig, { getHostUrl } from "@/lib/oidcConfig";
import { NextApiRequest, NextApiResponse } from "next";
import { randomPKCECodeVerifier, randomNonce, buildAuthorizationUrl, calculatePKCECodeChallenge } from 'openid-client'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	const oidc = await oidcConfig();
	if (!oidc) return res.status(400).json({ success: false, error: 'OIDC config not found', code: 400 })

	const pkce = randomPKCECodeVerifier();
	const nonce = randomNonce();
	const code_challenge = await calculatePKCECodeChallenge(pkce)
	const dbRecord = await prisma.verificationToken.create({
		data: {
			pkce,
			nonce,
			expires: new Date(new Date().getTime() + 300000)
		}
	})
	res.setHeader('Set-Cookie', `verificationToken=${dbRecord.id}; HttpOnly; SameSite=Lax; Path=/; Max-Age=600`)
	res.redirect(buildAuthorizationUrl(oidc, {
		nonce,
		code_challenge,
		code_challenge_method: "S256",
		redirect_uri: new URL('/api/auth/roblox/callback', getHostUrl(req)).toString(),
		scope: 'openid',
		response_type: 'code',
		state: dbRecord.id,
	}).toString())
}