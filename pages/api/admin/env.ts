import { NextApiResponse, NextApiRequest } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const requiredVars = ['DATABASE_URL', 'NEXTAUTH_URL', 'SESSION_SECRET'];
  const missing = requiredVars.filter((v) => !process.env[v]);
  return res.status(200).json({ missing });
}
