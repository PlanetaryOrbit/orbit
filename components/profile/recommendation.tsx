import { Dialog, Transition } from '@headlessui/react';
import { IconArrowUp, IconSend, IconX } from '@tabler/icons-react';
import axios from 'axios';
import { useRouter } from 'next/router';
import React, { Fragment, useEffect, useState } from 'react';
import toast from 'react-hot-toast';

type Props = {
  targetId: string | number;
  targetName: string;
};

type Eligibility = {
  enabled: boolean;
  hasPermission: boolean;
  recommenderRank: number;
  targetRank: number;
  canRecommend: boolean;
  reason: string | null;
};

const Recommendation = ({ targetId, targetName }: Props) => {
  const router = useRouter();

  const [eligibility, setEligibility] = useState<Eligibility | null>(null);
  const [loadingEligibility, setLoadingEligibility] = useState(true);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!router.query.id || !targetId) return;

    let cancelled = false;

    const load = async () => {
      setLoadingEligibility(true);

      try {
        const response = await axios.get(
          `/api/workspace/${router.query.id}/recommendations/eligibility`,
          {
            params: {
              target: targetId,
            },
          },
        );

        if (!cancelled && response.data.success) {
          setEligibility(response.data.eligibility);
        }
      } catch {
        if (!cancelled) {
          setEligibility(null);
        }
      } finally {
        if (!cancelled) {
          setLoadingEligibility(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [router.query.id, targetId]);

  const submit = async () => {
    const trimmed = reason.trim();

    if (trimmed.length < 10) {
      toast.error('Please provide at least 10 characters explaining the recommendation.');
      return;
    }

    if (trimmed.length > 2000) {
      toast.error('Your reason cannot exceed 2000 characters.');
      return;
    }

    setSubmitting(true);

    try {
      const response = await axios.post(`/api/workspace/${router.query.id}/recommendations`, {
        targetId,
        reason: trimmed,
      });

      if (response.status !== 201 || !response.data.success) {
        throw new Error(response.data.error || 'Failed to submit recommendation.');
      }

      toast.success('Promotion recommendation submitted.');
      setReason('');
      setOpen(false);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.error || 'Failed to submit recommendation.');
      } else {
        toast.error('Failed to submit recommendation.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingEligibility || !eligibility?.canRecommend) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
      >
        <IconArrowUp size={16} stroke={1.8} />
        Recommend for promotion
      </button>

      <Transition appear show={open} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-[100000]"
          onClose={() => {
            if (!submitting) setOpen(false);
          }}
        >
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-200"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-150"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <Dialog.Title className="text-base font-semibold text-zinc-900 dark:text-white">
                        Recommend {targetName}
                      </Dialog.Title>
                      <Dialog.Description className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        Explain why you believe this member should be considered for promotion.
                      </Dialog.Description>
                    </div>

                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => setOpen(false)}
                      className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                      aria-label="Close"
                    >
                      <IconX size={18} />
                    </button>
                  </div>

                  <div className="mt-5 rounded-xl bg-zinc-50 px-4 py-3 text-xs text-zinc-500 dark:bg-zinc-800/70 dark:text-zinc-400">
                    Your current Roblox rank is {eligibility.recommenderRank}. The member's current
                    rank is {eligibility.targetRank}.
                  </div>

                  <label className="mt-5 block">
                    <span className="mb-2 block text-sm font-medium text-zinc-900 dark:text-white">
                      Recommendation reason
                    </span>

                    <textarea
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      maxLength={2000}
                      rows={6}
                      placeholder="Explain their performance, contributions, leadership, or other reasons for recommending them."
                      className="w-full resize-y rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-primary dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                    />

                    <span className="mt-1 block text-right text-xs text-zinc-400">
                      {reason.length}/2000
                    </span>
                  </label>

                  <div className="mt-5 flex justify-end gap-2">
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => setOpen(false)}
                      className="rounded-xl px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      disabled={submitting}
                      onClick={submit}
                      className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <IconSend size={16} />
                      {submitting ? 'Submitting...' : 'Submit recommendation'}
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
};

export default Recommendation;
