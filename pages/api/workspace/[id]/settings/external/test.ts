import axios from 'axios';
import type { NextApiRequest, NextApiResponse } from 'next';

import prisma from '@/utils/database';
import { withPermissionCheck } from '@/utils/permissionsManager';

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

async function testOpenCloudKey(keyTrimmed: string) {
  const ocres = await axios.post<OpenCloudKeyRes>(
    'https://apis.roblox.com/api-keys/v1/introspect',
    { apiKey: keyTrimmed },
    { headers: { 'Content-Type': 'application/json' } },
  );

  const { enabled, expired, scopes } = ocres.data;

  if (expired) {
    return { ok: false as const, error: 'API key has expired' };
  }

  if (!enabled) {
    return { ok: false as const, error: 'API key is disabled' };
  }

  const groupScope = scopes.find((s) => s.name === 'group');
  if (!groupScope) {
    return { ok: false as const, error: "API key is missing the 'group' scope" };
  }

  const ops = groupScope.operations ?? [];
  if (!ops.includes('read') || !ops.includes('write')) {
    return {
      ok: false as const,
      error: 'API key requires group read and write (scopes)',
    };
  }

  return { ok: true as const, message: 'API key is valid.' };
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const id = req.query.id;
  const workspaceGroupId = typeof id === 'string' ? parseInt(id, 10) : Number.NaN;
  if (!Number.isInteger(workspaceGroupId) || workspaceGroupId <= 0) {
    return res.status(400).json({ success: false, error: 'Invalid workspace ID' });
  }

  const body = req.body as {
    provider?: string;
    rankingToken?: string;
    rankingWorkspaceId?: string;
  };

  try {
    if (body.provider === 'rankgun') {
      let token = typeof body.rankingToken === 'string' ? body.rankingToken.trim() : '';
      let wid = typeof body.rankingWorkspaceId === 'string' ? body.rankingWorkspaceId.trim() : '';

      const stored = await prisma.workspaceExternalServices.findFirst({
        where: { workspaceGroupId },
      });
      if (!token && stored?.rankingToken) {
        token = stored.rankingToken;
      }
      if (!wid && stored?.rankingWorkspaceId) {
        wid = String(stored.rankingWorkspaceId);
      }

      if (!token || !wid) {
        return res.status(400).json({
          success: false,
          error: 'RankGun requires API key and workspace ID to test.',
        });
      }

      try {
        const probe = await axios.post(
          'https://api.rankgun.works/roblox/promote',
          { user_id: 999999991, workspace_id: wid },
          {
            headers: {
              'api-token': token,
              'Content-Type': 'application/json',
            },
            validateStatus: () => true,
            timeout: 15000,
          },
        );

        if (probe.status === 401 || probe.status === 403) {
          return res.status(400).json({ success: false, error: 'Invalid RankGun API key' });
        }

        return res.status(200).json({
          success: true,
          message: 'RankGun credentials accepted.',
        });
      } catch {
        return res.status(400).json({
          success: false,
          error: 'Could not reach RankGun.',
        });
      }
    }

    if (body.provider === 'opencloudranking') {
      let keyToTest = '';
      const tokenFromBody = typeof body.rankingToken === 'string' ? body.rankingToken.trim() : '';

      if (tokenFromBody) {
        keyToTest = tokenFromBody;
      } else {
        const stored = await prisma.workspaceExternalServices.findFirst({
          where: { workspaceGroupId },
        });
        if (stored?.rankingProvider === 'opencloudranking' && stored.rankingToken?.trim()) {
          keyToTest = stored.rankingToken.trim();
        }
      }

      if (!keyToTest) {
        return res.status(400).json({
          success: false,
          error:
            'Paste an Integrated Ranking API key to test, or save one on this workspace first.',
        });
      }

      try {
        const r = await testOpenCloudKey(keyToTest);
        if (!r.ok) {
          return res.status(400).json({ success: false, error: r.error });
        }
        return res.status(200).json({ success: true, message: r.message });
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 401) {
          return res.status(400).json({ success: false, error: 'Invalid API key' });
        }
        console.error('Integrated ranking key test:', err);
        return res.status(500).json({
          success: false,
          error: err instanceof Error ? err.message : 'Test failed',
        });
      }
    }

    return res.status(400).json({ success: false, error: 'Unknown provider.' });
  } catch (e) {
    console.error('external test:', e);
    return res.status(500).json({ success: false, error: 'Internal error' });
  }
}

export default withPermissionCheck(handler, 'admin');
