import { NextApiResponse } from "next";
import { AuthenticatedRequest, withAuth } from "@/lib/withAuth";
import { deleteSession } from "@/utils/session";

export default withAuth(handler);

export async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' })

  await deleteSession(req.auth.token)

  res.setHeader('Set-Cookie', 'session_token=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0')

  return res.status(200).json({ success: true })
}