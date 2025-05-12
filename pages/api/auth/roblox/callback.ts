import * as noblox from "noblox.js";
import { NextApiRequest, NextApiResponse } from "next";
import oidcConfig from "@/lib/oidcConfig";
import { authorizationCodeGrant, fetchUserInfo, tokenIntrospection } from "openid-client";
import { withSessionRoute } from "@/lib/withSession";
import { getRobloxThumbnail } from "@/utils/roblox";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const oidc = await oidcConfig();
  if (!oidc)
    return res
      .status(400)
      .json({ success: false, error: "OIDC config not found", code: 400 });
  if (!req.cookies.verificationToken)
    return res.redirect("/api/auth/roblox/login");
  const dbRecord = await prisma.verificationToken.findUnique({
    where: {
      id: req.cookies.verificationToken,
    },
  });
  if (!dbRecord) return res.redirect("/api/auth/roblox/login");
  let currentUrl: URL = new URL(req.url!, process.env.VERCEL_URL ?? process.env.HOST_URL);
  let tokens = await authorizationCodeGrant(oidc, currentUrl, {
    pkceCodeVerifier: dbRecord.pkce,
    expectedNonce: dbRecord.nonce,
    idTokenExpected: true,
  });
  let ti = tokens.claims();
  if (!ti) return res.redirect("/api/auth/roblox/login");
  req.session.userid = parseInt(ti.sub);
  await req.session.save();

  const user = await prisma.user.findMany({
    where: {
      userid: parseInt(ti.sub),
    },
  });
  if (!user) {
    let [rbxUser, thumbnail] = await Promise.all([
      noblox.getPlayerInfo(parseInt(ti.sub)),
      getRobloxThumbnail(parseInt(ti.sub)),
    ]);
    if (!rbxUser) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid user", code: 400 });
    }
    if (!thumbnail) thumbnail = undefined;
    await prisma.user.upsert({
      where: {
        userid: BigInt(ti.sub),
      },
      update: {
        username: rbxUser.username || undefined,
        picture: thumbnail,
        registered: true,
      },
      create: {
        userid: BigInt(ti.sub),
        username: rbxUser.username || undefined,
        picture: thumbnail,
        registered: true, // Explicitly set registered to true
      },
    });
  }

  res.redirect("/");
}

export default withSessionRoute(handler);
