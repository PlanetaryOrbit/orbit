import prisma from '@/utils/database';
import { checkRateLimit, sendRateLimitExceeded } from '@/utils/rateLimit';
import { getSessionByToken } from '@/utils/session';
import { isSetupRequestAllowed } from '@/utils/setup';
import axios from 'axios';
import * as cookie from 'cookie';
import type { NextApiRequest, NextApiResponse } from 'next';

interface OpenCloudKeyRes {
  name: string;
  authorizedUserId: number;
  scopes: {
    name: string;
    operations: string[] | null;
  }[];
  enabled: boolean;
  expired: boolean;
}

export default handler;

export async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const cookies = cookie.parse(req.headers.cookie || '');
  const session = cookies.session_token ? await getSessionByToken(cookies.session_token) : null;

  const [owner, userCount] = await Promise.all([
    session
      ? prisma.user.findUnique({
          where: { userid: BigInt(session.userId) },
          select: { isOwner: true },
        })
      : Promise.resolve(null),
    prisma.user.count(),
  ]);

  const setupAllowed = userCount === 0 && isSetupRequestAllowed(req);
  if (!owner?.isOwner && !setupAllowed) {
    return res
      .status(403)
      .json({ success: false, error: 'Access denied. Owner privileges required.' });
  }

  if (!(await checkRateLimit(req, 'opencloudtest', 10, 60_000))) {
    return sendRateLimitExceeded(res);
  }

  const { key } = req.body as { key?: string };
  if (!key || !key.trim()) {
    return res.status(400).json({ success: false, error: 'OpenCloud key is required' });
  }

  try {
    const ocres = await axios.post<OpenCloudKeyRes>(
      'https://apis.roblox.com/api-keys/v1/introspect',
      { apiKey: key.trim() },
      { headers: { 'Content-Type': 'application/json' }, timeout: 10_000 },
    );

    const { enabled, expired, scopes } = ocres.data;

    if (expired) {
      return res.status(400).json({ success: false, code: 3, error: 'API key has expired' });
    }

    if (!enabled) {
      return res.status(400).json({ success: false, code: 4, error: 'API key is disabled' });
    }

    const groupScope = scopes.find((s) => s.name === 'group');
    if (!groupScope) {
      return res
        .status(400)
        .json({ success: false, code: 1, error: "API key is missing the 'group' scope" });
    }

    const ops = groupScope.operations ?? [];
    if (!ops.includes('read') || !ops.includes('write')) {
      return res.status(400).json({
        success: false,
        code: 2,
        error: "API key requires both read and write operations on the 'group' scope",
      });
    }

    return res.status(200).json({ success: true, message: 'API key is valid.' });
  } catch (error) {
    const status = axios.isAxiosError(error) ? error.response?.status : undefined;
    if (axios.isAxiosError(error) && error.code === 'ECONNABORTED') {
      return res.status(504).json({ success: false, error: 'Validation timed out' });
    }
    if (status === 401) {
      return res.status(400).json({ success: false, code: 5, error: 'Invalid API key' });
    }

    // Never log the key, request config, or upstream response body.
    console.error('Error testing Open Cloud key:', { status });
    return res.status(500).json({
      success: false,
      error: 'Failed to validate API key',
    });
  }
}
