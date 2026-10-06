import * as noblox from 'noblox.js';

import { getConfig } from '@/utils/configEngine';
import prisma from '@/utils/database';

export const recommendationConfigKey = 'recommendations';
export const recommendationStatus = ['pending', 'approved', 'rejected', 'cancelled'] as const;

export type RecommendationStatus = (typeof recommendationStatus)[number];

export type RecommendationConfig = {
  enabled: boolean;
  ranks: number[];
};

export type RecommendationEligibility = {
  enabled: boolean;
  hasPermission: boolean;
  recommenderRank: number;
  targetRank: number;
  canRecommend: boolean;
  reason: string | null;
};

export function parseRecommendationConfig(value: unknown): RecommendationConfig {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {
      enabled: false,
      ranks: [],
    };
  }

  const raw = value as Record<string, unknown>;

  const ranks = Array.isArray(raw.ranks)
    ? raw.ranks
        .filter((rank): rank is number => typeof rank === 'number' && Number.isInteger(rank))
        .filter((rank) => rank >= 1 && rank <= 255)
    : [];

  return {
    enabled: raw.enabled === true,
    ranks: [...new Set(ranks)].sort((a, b) => a - b),
  };
}

export async function getRecommendationConfig(
  workspaceGroupId: number,
): Promise<RecommendationConfig> {
  const config = await getConfig(recommendationConfigKey, workspaceGroupId);
  return parseRecommendationConfig(config);
}

export async function hasRecommendationPermission(
  userId: bigint,
  workspaceGroupId: number,
  permission: 'recommend_promotions' | 'manage_recommendations',
): Promise<boolean> {
  const user = await prisma.user.findFirst({
    where: {
      userid: userId,
    },
    include: {
      roles: {
        where: {
          workspaceGroupId,
        },
        select: {
          permissions: true,
        },
      },
      workspaceMemberships: {
        where: {
          workspaceGroupId,
        },
        select: {
          isAdmin: true,
        },
      },
    },
  });

  if (!user) return false;

  if (user.workspaceMemberships[0]?.isAdmin) {
    return true;
  }

  return user.roles.some((role) => role.permissions.includes(permission));
}

export async function getRobloxRank(
  userId: bigint,
  workspaceGroupId: number,
): Promise<number> {
  try {
    return await noblox.getRankInGroup(workspaceGroupId, Number(userId));
  } catch {
    return 0;
  }
}

export async function getRecommendationEligibility(
  recommenderId: bigint,
  targetId: bigint,
  workspaceGroupId: number,
): Promise<RecommendationEligibility> {
  const config = await getRecommendationConfig(workspaceGroupId);

  const hasPermission = await hasRecommendationPermission(
    recommenderId,
    workspaceGroupId,
    'recommend_promotions',
  );

  const recommenderRank = await getRobloxRank(recommenderId, workspaceGroupId);
  const targetRank = await getRobloxRank(targetId, workspaceGroupId);

  if (!config.enabled) {
    return {
      enabled: false,
      hasPermission,
      recommenderRank,
      targetRank,
      canRecommend: false,
      reason: 'Promotion recommendations are disabled.',
    };
  }

  if (!hasPermission) {
    return {
      enabled: true,
      hasPermission: false,
      recommenderRank,
      targetRank,
      canRecommend: false,
      reason: 'You do not have permission to submit promotion recommendations.',
    };
  }

  if (!config.ranks.includes(recommenderRank)) {
    return {
      enabled: true,
      hasPermission: true,
      recommenderRank,
      targetRank,
      canRecommend: false,
      reason: 'Your Roblox rank is not allowed to submit promotion recommendations.',
    };
  }

  if (recommenderId === targetId) {
    return {
      enabled: true,
      hasPermission: true,
      recommenderRank,
      targetRank,
      canRecommend: false,
      reason: 'You cannot recommend yourself.',
    };
  }

  if (targetRank <= 0) {
    return {
      enabled: true,
      hasPermission: true,
      recommenderRank,
      targetRank,
      canRecommend: false,
      reason: 'This user is not currently a member of the Roblox group.',
    };
  }

  if (targetRank >= recommenderRank) {
    return {
      enabled: true,
      hasPermission: true,
      recommenderRank,
      targetRank,
      canRecommend: false,
      reason: 'You can only recommend users below your current Roblox rank.',
    };
  }

  return {
    enabled: true,
    hasPermission: true,
    recommenderRank,
    targetRank,
    canRecommend: true,
    reason: null,
  };
}
