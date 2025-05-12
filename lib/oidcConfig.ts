import { discovery } from "openid-client";

export default async function oidcConfig() {
	if (!process.env.RBX_CLIENT_ID || !process.env.RBX_CLIENT_SECRET) return null;
	return await discovery(new URL("https://apis.roblox.com/oauth"), process.env.RBX_CLIENT_ID, process.env.RBX_CLIENT_SECRET)
}
