import type { NextApiRequest, NextApiResponse } from 'next'
import prisma, { document } from '@/utils/database';
import { withPermissionCheck } from '@/utils/permissionsManager'
import axios from 'axios';
import PackageInfo from '@/package.json'

type Data = {
  success: boolean
  error?: string
  experiences?: any[]
}

interface GroupExperience {
  id: number,
  name: string,
  description: string
}

interface ExperiencesResponse {
  data: GroupExperience[]
}

export default withPermissionCheck(handler);

export async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const id = parseInt(req.query.id as string);
  if (isNaN(id)) return res.status(400).json({ success: false, error: 'Invalid group ID' });

  try {
    const experiences = await axios.get<ExperiencesResponse>(`https://games.roblox.com/v2/groups/${id}/gamesV2?accessFilter=2&limit=100&sortOrder=Asc`, {
      headers: {
        "User-Agent": `${PackageInfo.name}/${PackageInfo.version}`,
        Accept: "application/json"
      }
    });

    const universeIds = experiences.data.data.map(exp => exp.id).join(',');

    const thumbRes = await axios.get(`https://thumbnails.roblox.com/v1/games/multiget/thumbnails?universeIds=${universeIds}&countPerUniverse=1&defaults=true&size=768x432&format=Png&isCircular=false`, {
      headers: {
        "User-Agent": `${PackageInfo.name}/${PackageInfo.version}`,
        Accept: "application/json"
      }
    });

    const thumbMap = new Map<number, string | null>();
    for (const entry of thumbRes.data.data) {
      const imageUrl = entry.thumbnails?.[0]?.imageUrl ?? null;
      thumbMap.set(entry.universeId, imageUrl);
    }

    const experiencesMapped = experiences.data.data.map(exp => ({
      ...exp,
      thumbnailUrl: thumbMap.get(exp.id) ?? null,
    }));

    return res.status(200).json({
      success: true,
      experiences: experiencesMapped
    });

  } catch (e: any) {
    return res.status(500).json({ success: false, error: e?.message ?? 'Internal server error' });
  }
}