import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (!process.env.RBX_CLIENT_ID || !process.env.RBX_CLIENT_SECRET) return res.status(400).json({ success: false, error: "OIDC config not found", code: 400 });
	res.status(200).json({ success: true });
}