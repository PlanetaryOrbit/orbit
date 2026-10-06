import type { NextApiRequest, NextApiResponse } from 'next';

import { withAuth } from '@/lib/withAuth';
import prisma from '@/utils/database';
import { logAudit } from '@/utils/logs';
import {
  getRecommendationEligibility,
  hasRecommendationPermission,
  recommendationStatus,
  type RecommendationStatus,
} from '@/utils/recommendations';
import { withPermissionCheck } from '@/utils/permissionsManager';

type RecommendationResponse = {
  id: string;
  workspaceGroupId: number;
  recommender: {
    userid: string;
    username: string | null;
  };
  target: {
    userid: string;
    username: string | null;
  };
  recommenderRank: number;
  targetRank: number;
  reason: string;
  status: RecommendationStatus;
  reviewer: {
    userid: string;
    username: string | null;
  } | null;
  reviewReason: string | null;
  createdAt: string;
  updatedAt: string;
  reviewedAt: string | null;
};

type Data = {
  success: boolean;
  error?: string;
  recommendation?: RecommendationResponse;
  recommendations?: RecommendationResponse[];
  count?: number;
};

function serializeRecommendation(
  recommendation: any,
): RecommendationResponse {
  return {
    id: recommendation.id,
    workspaceGroupId: recommendation.workspaceGroupId,
    recommender: {
      userid: recommendation.recommender.userid.toString(),
      username: recommendation.recommender.username,
    },
    target: {
      userid: recommendation.target.userid.toString(),
      username: recommendation.target.username,
    },
    recommenderRank: recommendation.recommenderRank,
    targetRank: recommendation.targetRank,
    reason: recommendation.reason,
    status: recommendation.status as RecommendationStatus,
    reviewer: recommendation.reviewer
      ? {
          userid: recommendation.reviewer.userid.toString(),
          username: recommendation.reviewer.username,
        }
      : null,
    reviewReason: recommendation.reviewReason,
    createdAt: recommendation.createdAt.toISOString(),
    updatedAt: recommendation.updatedAt.toISOString(),
    reviewedAt: recommendation.reviewedAt
      ? recommendation.reviewedAt.toISOString()
      : null,
  };
}

async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  const userId = (req as any).auth?.userId as bigint | undefined;

  if (!userId) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
    });
  }

  const workspaceGroupId = Number.parseInt(req.query.id as string, 10);

  if (!Number.isSafeInteger(workspaceGroupId) || workspaceGroupId <= 0) {
    return res.status(400).json({
      success: false,
      error: 'Invalid workspace ID',
    });
  }

  if (req.method === 'GET') {
    const canManage = await hasRecommendationPermission(
      userId,
      workspaceGroupId,
      'manage_recommendations',
    );

    const canRecommend = await hasRecommendationPermission(
      userId,
      workspaceGroupId,
      'recommend_promotions',
    );

    if (!canManage && !canRecommend) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
      });
    }

    if (req.query.count === 'pending') {
      if (!canManage) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions',
        });
      }

      const count = await prisma.promotionRecommendation.count({
        where: {
          workspaceGroupId,
          status: 'pending',
        },
      });

      return res.status(200).json({
        success: true,
        count,
      });
    }

    const status =
      typeof req.query.status === 'string' &&
      recommendationStatus.includes(req.query.status as RecommendationStatus)
        ? (req.query.status as RecommendationStatus)
        : undefined;

    const recommendations = await prisma.promotionRecommendation.findMany({
      where: canManage
        ? {
            workspaceGroupId,
            ...(status ? { status } : {}),
          }
        : {
            workspaceGroupId,
            recommenderId: userId,
            ...(status ? { status } : {}),
          },
      include: {
        recommender: {
          select: {
            userid: true,
            username: true,
          },
        },
        target: {
          select: {
            userid: true,
            username: true,
          },
        },
        reviewer: {
          select: {
            userid: true,
            username: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100,
    });

    return res.status(200).json({
      success: true,
      recommendations: recommendations.map(serializeRecommendation),
    });
  }

  if (req.method === 'POST') {
    return withPermissionCheck(
      async (request: NextApiRequest, response: NextApiResponse<Data>) => {
        const body = request.body as {
          targetId?: unknown;
          reason?: unknown;
        };

        const targetId = Number(body.targetId);
        const reason =
          typeof body.reason === 'string' ? body.reason.trim() : '';

        if (!Number.isSafeInteger(targetId) || targetId <= 0) {
          return response.status(400).json({
            success: false,
            error: 'Invalid target user.',
          });
        }

        if (reason.length < 10) {
          return response.status(400).json({
            success: false,
            error: 'A recommendation reason must be at least 10 characters.',
          });
        }

        if (reason.length > 2000) {
          return response.status(400).json({
            success: false,
            error: 'A recommendation reason cannot exceed 2000 characters.',
          });
        }

        const targetUserId = BigInt(targetId);

        const eligibility = await getRecommendationEligibility(
          userId,
          targetUserId,
          workspaceGroupId,
        );

        if (!eligibility.canRecommend) {
          return response.status(403).json({
            success: false,
            error: eligibility.reason || 'You cannot recommend this user.',
          });
        }

        const existing = await prisma.promotionRecommendation.findFirst({
          where: {
            workspaceGroupId,
            recommenderId: userId,
            targetId: targetUserId,
            status: 'pending',
          },
        });

        if (existing) {
          return response.status(409).json({
            success: false,
            error: 'You already have a pending recommendation for this user.',
          });
        }

        const recommendation =
          await prisma.promotionRecommendation.create({
            data: {
              workspaceGroupId,
              recommenderId: userId,
              targetId: targetUserId,
              recommenderRank: eligibility.recommenderRank,
              targetRank: eligibility.targetRank,
              reason,
              status: 'pending',
            },
            include: {
              recommender: {
                select: {
                  userid: true,
                  username: true,
                },
              },
              target: {
                select: {
                  userid: true,
                  username: true,
                },
              },
              reviewer: {
                select: {
                  userid: true,
                  username: true,
                },
              },
            },
          });

        await logAudit(
          workspaceGroupId,
          userId,
          'recommendation.create',
          `recommendation:${recommendation.id}`,
          {
            targetId: targetId.toString(),
            recommenderRank: eligibility.recommenderRank,
            targetRank: eligibility.targetRank,
          },
        );

        return response.status(201).json({
          success: true,
          recommendation: serializeRecommendation(recommendation),
        });
      },
      'recommend_promotions',
    )(req, res);
  }

  if (req.method === 'PATCH') {
    return withPermissionCheck(
      async (request: NextApiRequest, response: NextApiResponse<Data>) => {
        const body = request.body as {
          id?: unknown;
          status?: unknown;
          reviewReason?: unknown;
        };

        const id = typeof body.id === 'string' ? body.id : '';
        const status =
          typeof body.status === 'string'
            ? body.status
            : '';

        const reviewReason =
          typeof body.reviewReason === 'string'
            ? body.reviewReason.trim()
            : '';

        if (!id) {
          return response.status(400).json({
            success: false,
            error: 'Recommendation ID is required.',
          });
        }

        if (status !== 'approved' && status !== 'rejected') {
          return response.status(400).json({
            success: false,
            error: 'Recommendations can only be approved or rejected.',
          });
        }

        if (reviewReason.length > 2000) {
          return response.status(400).json({
            success: false,
            error: 'Review reason cannot exceed 2000 characters.',
          });
        }

        const recommendation =
          await prisma.promotionRecommendation.findFirst({
            where: {
              id,
              workspaceGroupId,
            },
          });

        if (!recommendation) {
          return response.status(404).json({
            success: false,
            error: 'Recommendation not found.',
          });
        }

        if (recommendation.status !== 'pending') {
          return response.status(409).json({
            success: false,
            error: 'This recommendation has already been reviewed.',
          });
        }

        if (recommendation.recommenderId === userId) {
          return response.status(403).json({
            success: false,
            error: 'You cannot review your own recommendation.',
          });
        }

        const updated =
          await prisma.promotionRecommendation.update({
            where: {
              id,
            },
            data: {
              status,
              reviewerId: userId,
              reviewReason: reviewReason || null,
              reviewedAt: new Date(),
            },
            include: {
              recommender: {
                select: {
                  userid: true,
                  username: true,
                },
              },
              target: {
                select: {
                  userid: true,
                  username: true,
                },
              },
              reviewer: {
                select: {
                  userid: true,
                  username: true,
                },
              },
            },
          });

        await logAudit(
          workspaceGroupId,
          userId,
          `recommendation.${status}`,
          `recommendation:${id}`,
          {
            recommenderId: recommendation.recommenderId.toString(),
            targetId: recommendation.targetId.toString(),
            reviewReason: reviewReason || null,
          },
        );

        return response.status(200).json({
          success: true,
          recommendation: serializeRecommendation(updated),
        });
      },
      'manage_recommendations',
    )(req, res);
  }

  if (req.method === 'DELETE') {
    const body = req.body as {
      id?: unknown;
    };

    const id = typeof body.id === 'string' ? body.id : '';

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Recommendation ID is required.',
      });
    }

    const recommendation =
      await prisma.promotionRecommendation.findFirst({
        where: {
          id,
          workspaceGroupId,
        },
      });

    if (!recommendation) {
      return res.status(404).json({
        success: false,
        error: 'Recommendation not found.',
      });
    }

    const canManage = await hasRecommendationPermission(
      userId,
      workspaceGroupId,
      'manage_recommendations',
    );

    const canCancel =
      recommendation.recommenderId === userId || canManage;

    if (!canCancel) {
      return res.status(403).json({
        success: false,
        error: 'You cannot cancel this recommendation.',
      });
    }

    if (recommendation.status !== 'pending') {
      return res.status(409).json({
        success: false,
        error: 'Only pending recommendations can be cancelled.',
      });
    }

    const updated =
      await prisma.promotionRecommendation.update({
        where: {
          id,
        },
        data: {
          status: 'cancelled',
          reviewerId: canManage && recommendation.recommenderId !== userId
            ? userId
            : null,
          reviewedAt: new Date(),
        },
        include: {
          recommender: {
            select: {
              userid: true,
              username: true,
            },
          },
          target: {
            select: {
              userid: true,
              username: true,
            },
          },
          reviewer: {
            select: {
              userid: true,
              username: true,
            },
          },
        },
      });

    await logAudit(
      workspaceGroupId,
      userId,
      'recommendation.cancel',
      `recommendation:${id}`,
      {
        targetId: recommendation.targetId.toString(),
      },
    );

    return res.status(200).json({
      success: true,
      recommendation: serializeRecommendation(updated),
    });
  }

  return res.status(405).json({
    success: false,
    error: 'Method not allowed',
  });
}

export default withAuth(handler);
