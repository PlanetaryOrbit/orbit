import Workspace from '@/layouts/workspace';
import type { pageWithLayout } from '@/layoutTypes';
import { withPermissionCheckSsr } from '@/utils/permissionsManager';
import { IconArrowUp, IconCheck, IconExternalLink, IconX } from '@tabler/icons-react';
import axios from 'axios';
import clsx from 'clsx';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

type Recommendation = {
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
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  reviewer: {
    userid: string;
    username: string | null;
  } | null;
  reviewReason: string | null;
  createdAt: string;
  updatedAt: string;
  reviewedAt: string | null;
};

type PageProps = {
  canManage: boolean;
};

const RecommendationsPage: pageWithLayout<PageProps> = ({ canManage }) => {
  const router = useRouter();
  const workspaceId = router.query.id as string;

  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'pending' | 'all'>(canManage ? 'pending' : 'all');
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [reviewReason, setReviewReason] = useState('');

  const load = async () => {
    if (!workspaceId) return;

    setLoading(true);

    try {
      const response = await axios.get(`/api/workspace/${workspaceId}/recommendations`, {
        params: {
          ...(canManage && status !== 'all' ? { status } : {}),
        },
      });

      if (response.data.success) {
        setRecommendations(response.data.recommendations || []);
      }
    } catch {
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [workspaceId, status]);

  const review = async (recommendationId: string, nextStatus: 'approved' | 'rejected') => {
    try {
      await axios.patch(`/api/workspace/${workspaceId}/recommendations`, {
        id: recommendationId,
        status: nextStatus,
        reviewReason: reviewReason.trim(),
      });

      setReviewing(null);
      setReviewReason('');
      await load();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        window.alert(error.response?.data?.error || 'Failed to review recommendation.');
      } else {
        window.alert('Failed to review recommendation.');
      }
    }
  };

  const cancel = async (recommendationId: string) => {
    try {
      await axios.delete(`/api/workspace/${workspaceId}/recommendations`, {
        data: {
          id: recommendationId,
        },
      });

      await load();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        window.alert(error.response?.data?.error || 'Failed to cancel recommendation.');
      }
    }
  };

  return (
    <div className='min-h-screen bg-zinc-50 dark:bg-zinc-950'>
      <div className='mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8'>
        <div className='mb-7'>
          <div className='flex items-start justify-between gap-4'>
            <div>
              <h1 className='text-xl font-semibold text-zinc-900 dark:text-white'>
                Promotion Recommendations
              </h1>
              <p className='mt-1 text-sm text-zinc-500 dark:text-zinc-400'>
                Review member promotion recommendations submitted by eligible staff.
              </p>
            </div>

            {canManage && (
              <div className='flex rounded-xl bg-zinc-100 p-1 dark:bg-zinc-900'>
                <button
                  type='button'
                  onClick={() => setStatus('pending')}
                  className={clsx(
                    'rounded-lg px-3 py-1.5 text-xs font-medium transition',
                    status === 'pending'
                      ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-white'
                      : 'text-zinc-500 dark:text-zinc-400',
                  )}
                >
                  Pending
                </button>

                <button
                  type='button'
                  onClick={() => setStatus('all')}
                  className={clsx(
                    'rounded-lg px-3 py-1.5 text-xs font-medium transition',
                    status === 'all'
                      ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-white'
                      : 'text-zinc-500 dark:text-zinc-400',
                  )}
                >
                  All
                </button>
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className='rounded-2xl bg-white p-8 text-center text-sm text-zinc-500 shadow-sm dark:bg-zinc-900 dark:text-zinc-400'>
            Loading recommendations...
          </div>
        ) : recommendations.length === 0 ? (
          <div className='rounded-2xl bg-white p-10 text-center shadow-sm dark:bg-zinc-900'>
            <div className='mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10'>
              <IconArrowUp
                className='text-primary'
                size={20}
              />
            </div>

            <p className='text-sm font-medium text-zinc-900 dark:text-white'>
              No recommendations found
            </p>

            <p className='mt-1 text-xs text-zinc-500 dark:text-zinc-400'>
              {canManage
                ? 'There are currently no recommendations matching this filter.'
                : 'You have not submitted any promotion recommendations yet.'}
            </p>
          </div>
        ) : (
          <div className='space-y-4'>
            {recommendations.map((recommendation) => {
              const isReviewing = reviewing === recommendation.id;

              return (
                <article
                  key={recommendation.id}
                  className='rounded-2xl bg-white p-5 shadow-sm dark:bg-zinc-900'
                >
                  <div className='flex flex-col gap-5 sm:flex-row sm:items-start'>
                    <div className='flex min-w-0 flex-1 gap-3'>
                      <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10'>
                        <IconArrowUp
                          size={19}
                          className='text-primary'
                        />
                      </div>

                      <div className='min-w-0'>
                        <div className='flex flex-wrap items-center gap-2'>
                          <a
                            href={`/workspace/${workspaceId}/profile/${recommendation.target.userid}`}
                            className='text-sm font-semibold text-zinc-900 hover:underline dark:text-white'
                          >
                            {recommendation.target.username || recommendation.target.userid}
                          </a>

                          <span className='text-xs text-zinc-400'>
                            Rank {recommendation.targetRank}
                          </span>

                          <span
                            className={clsx(
                              'rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize',
                              recommendation.status === 'pending' &&
                                'bg-amber-500/10 text-amber-600 dark:text-amber-400',
                              recommendation.status === 'approved' &&
                                'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
                              recommendation.status === 'rejected' &&
                                'bg-red-500/10 text-red-600 dark:text-red-400',
                              recommendation.status === 'cancelled' &&
                                'bg-zinc-500/10 text-zinc-500 dark:text-zinc-400',
                            )}
                          >
                            {recommendation.status}
                          </span>
                        </div>

                        <p className='mt-1 text-xs text-zinc-500 dark:text-zinc-400'>
                          Recommended by{' '}
                          <span className='font-medium text-zinc-700 dark:text-zinc-300'>
                            {recommendation.recommender.username ||
                              recommendation.recommender.userid}
                          </span>{' '}
                          at rank {recommendation.recommenderRank}
                        </p>

                        <p className='mt-4 whitespace-pre-wrap text-sm leading-6 text-zinc-700 dark:text-zinc-300'>
                          {recommendation.reason}
                        </p>

                        <p className='mt-3 text-xs text-zinc-400'>
                          Submitted {new Date(recommendation.createdAt).toLocaleString()}
                        </p>

                        {recommendation.reviewReason && (
                          <div className='mt-4 rounded-xl bg-zinc-50 px-3 py-2.5 dark:bg-zinc-800/70'>
                            <p className='text-[10px] font-semibold uppercase tracking-wide text-zinc-400'>
                              Review
                            </p>
                            <p className='mt-1 whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-300'>
                              {recommendation.reviewReason}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className='flex shrink-0 flex-row gap-2 sm:flex-col'>
                      <a
                        href={`/workspace/${workspaceId}/profile/${recommendation.target.userid}`}
                        className='flex items-center justify-center gap-1.5 rounded-xl bg-zinc-100 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700'
                      >
                        <IconExternalLink size={14} />
                        Profile
                      </a>

                      {canManage && recommendation.status === 'pending' && (
                        <>
                          <button
                            type='button'
                            onClick={() => setReviewing(isReviewing ? null : recommendation.id)}
                            className='rounded-xl bg-primary px-3 py-2 text-xs font-medium text-white hover:opacity-90'
                          >
                            Review
                          </button>
                        </>
                      )}

                      {!canManage && recommendation.status === 'pending' && (
                        <button
                          type='button'
                          onClick={() => cancel(recommendation.id)}
                          className='rounded-xl bg-zinc-100 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700'
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>

                  {isReviewing && (
                    <div className='mt-5 border-t border-zinc-100 pt-5 dark:border-zinc-800'>
                      <label className='block'>
                        <span className='mb-2 block text-xs font-medium text-zinc-700 dark:text-zinc-300'>
                          Review note
                        </span>

                        <textarea
                          value={reviewReason}
                          onChange={(event) => setReviewReason(event.target.value)}
                          maxLength={2000}
                          rows={4}
                          placeholder='Optional note explaining the decision.'
                          className='w-full resize-y rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-primary dark:border-zinc-700 dark:bg-zinc-950 dark:text-white'
                        />
                      </label>

                      <div className='mt-3 flex justify-end gap-2'>
                        <button
                          type='button'
                          onClick={() => review(recommendation.id, 'rejected')}
                          className='flex items-center gap-1.5 rounded-xl bg-red-500/10 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-500/15 dark:text-red-400'
                        >
                          <IconX size={14} />
                          Reject
                        </button>

                        <button
                          type='button'
                          onClick={() => review(recommendation.id, 'approved')}
                          className='flex items-center gap-1.5 rounded-xl bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-600 hover:bg-emerald-500/15 dark:text-emerald-400'
                        >
                          <IconCheck size={14} />
                          Approve
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export const getServerSideProps = withPermissionCheckSsr(
  async ({ req, params }) => {
    const userId = (req as any).auth?.userId as bigint;
    const workspaceGroupId = Number(params?.id);

    const user = await import('@/utils/database').then(({ default: prisma }) =>
      prisma.user.findFirst({
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
      }),
    );

    const isAdmin = user?.workspaceMemberships[0]?.isAdmin === true;

    const canManage =
      isAdmin ||
      user?.roles.some((role) => role.permissions.includes('manage_recommendations')) === true;

    return {
      props: {
        canManage,
      },
    };
  },
  ['recommend_promotions', 'manage_recommendations'],
);

RecommendationsPage.layout = Workspace;

export default RecommendationsPage;
