import { Dialog, Transition } from '@headlessui/react';
import { IconClock, IconMessageCircle2 } from '@tabler/icons-react';
import moment from 'moment';
import { Fragment } from 'react';

import { normalizeChatLogLines } from '@/utils/activitySessionChat';

const BG_COLORS = [
  'bg-rose-300',
  'bg-lime-300',
  'bg-teal-200',
  'bg-amber-300',
  'bg-rose-200',
  'bg-lime-200',
  'bg-green-100',
  'bg-red-100',
  'bg-yellow-200',
  'bg-amber-200',
  'bg-emerald-300',
  'bg-green-300',
  'bg-red-300',
  'bg-emerald-200',
  'bg-green-200',
  'bg-red-200',
];

function avatarRingBg(userid: string, username?: string) {
  const key = `${userid ?? ''}:${username ?? ''}`;
  let hash = 5381;
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) - hash) ^ key.charCodeAt(i);
  }
  const index = (hash >>> 0) % BG_COLORS.length;
  return BG_COLORS[index];
}

export type ActivitySessionDetailSession = Record<string, any> | null;

export type ActivitySessionDetailsDialogProps = {
  open: boolean;
  loading: boolean;
  onClose: () => void;
  session: ActivitySessionDetailSession;
  universe?: { name?: string; thumbnail?: string | null } | null;
  concurrentUsers: Array<{ userId: unknown; username?: string; picture?: string | null }>;
  idleTimeEnabled: boolean;
};

export function ActivitySessionDetailsDialog({
  open,
  loading,
  onClose,
  session,
  universe,
  concurrentUsers,
  idleTimeEnabled,
}: ActivitySessionDetailsDialogProps) {
  const title = session?.sessionMessage || universe?.name || 'Unknown experience';
  const chatLines = normalizeChatLogLines(session?.chatLog);
  const messageCountFallback =
    typeof session?.messages === 'number' ? session.messages : Number(session?.messages) || 0;

  let durationLabel = '—';
  let durationSub = 'Duration';
  if (session?.endTime && session?.startTime) {
    const minutes = Math.floor(
      moment.duration(moment(session.endTime).diff(moment(session.startTime))).asMinutes(),
    );
    durationLabel = `${minutes}`;
    durationSub = `${minutes === 1 ? 'minute' : 'minutes'} total`;
  } else if (session?.startTime && !session?.endTime) {
    durationLabel = 'Live';
    durationSub = 'Session ongoing';
  }

  const idleVal =
    typeof session?.idleTime === 'bigint'
      ? Number(session.idleTime)
      : Number(session?.idleTime ?? 0);

  const hasTranscript = chatLines.length > 0;

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" aria-hidden />
        </Transition.Child>
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95 translate-y-1"
              enterTo="opacity-100 scale-100 translate-y-0"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100 translate-y-0"
              leaveTo="opacity-0 scale-95 translate-y-1"
            >
              <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl border border-zinc-200/90 bg-white text-left align-middle shadow-2xl transition-all dark:border-zinc-700/80 dark:bg-zinc-900">
                {universe?.thumbnail ? (
                  <div className="relative h-36 overflow-hidden bg-zinc-900">
                    <div
                      className="h-full w-full bg-cover bg-center opacity-95"
                      style={{ backgroundImage: `url(${universe.thumbnail})` }}
                      role="img"
                      aria-hidden
                    />
                    <div
                      className="absolute inset-0 opacity-85"
                      style={{
                        background:
                          'linear-gradient(135deg, rgb(var(--group-theme) / 0.65) 0%, transparent 55%, rgba(0,0,0,0.5) 100%)',
                      }}
                    />
                  </div>
                ) : (
                  <div
                    className="h-28 w-full"
                    style={{
                      background:
                        'linear-gradient(135deg, rgb(var(--group-theme)) 0%, rgb(var(--group-theme) / 0.4) 100%)',
                    }}
                  />
                )}

                <div className="border-b border-zinc-200/80 px-5 pb-4 pt-4 dark:border-zinc-800">
                  <div className="flex gap-4">
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-zinc-200/80 bg-zinc-50 shadow-sm dark:border-zinc-700 dark:bg-zinc-800"
                      aria-hidden
                    >
                      <IconClock className="h-5 w-5 text-primary" stroke={1.75} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <Dialog.Title
                        as="h3"
                        className="text-lg font-semibold leading-snug tracking-tight text-zinc-900 dark:text-zinc-50"
                      >
                        {title}
                      </Dialog.Title>
                      <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                        Activity session
                      </p>
                    </div>
                  </div>

                  {concurrentUsers.length > 0 && (
                    <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-zinc-50 px-3 py-2 dark:bg-zinc-800/70">
                      <span className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        With
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {concurrentUsers.map((user) => (
                          <div
                            key={String(user.userId)}
                            className={`h-8 w-8 shrink-0 overflow-hidden rounded-full bg-cover bg-center ring-2 ring-white dark:ring-zinc-900 ${avatarRingBg(
                              String(user.userId),
                              user.username,
                            )}`}
                            style={{
                              backgroundImage: `url(${user.picture || '/default-avatar.jpg'})`,
                            }}
                            title={user.username}
                            role="img"
                            aria-label={user.username || 'User'}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="px-5 py-5">
                  {loading ? (
                    <div className="flex h-32 items-center justify-center">
                      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/80 p-4 dark:border-zinc-700/80 dark:bg-zinc-800/40">
                          <p className="text-2xl font-semibold tabular-nums text-zinc-900 dark:text-white">
                            {durationLabel}
                          </p>
                          <p className="mt-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                            {durationSub}
                          </p>
                        </div>
                        {idleTimeEnabled ? (
                          <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/80 p-4 dark:border-zinc-700/80 dark:bg-zinc-800/40">
                            <p className="text-2xl font-semibold tabular-nums text-zinc-900 dark:text-white">
                              {idleVal}
                            </p>
                            <p className="mt-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                              Idle {idleVal === 1 ? 'minute' : 'minutes'}
                            </p>
                          </div>
                        ) : (
                          <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/80 p-4 dark:border-zinc-700/80 dark:bg-zinc-800/40">
                            <p className="text-2xl font-semibold tabular-nums text-zinc-900 dark:text-white">
                              {hasTranscript ? chatLines.length : messageCountFallback}
                            </p>
                            <p className="mt-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                              {hasTranscript ? 'Lines in chat transcript' : 'Messages (total)'}
                            </p>
                          </div>
                        )}
                      </div>

                      {idleTimeEnabled && (
                        <div className="mt-3 rounded-xl border border-dashed border-zinc-200 bg-white/60 px-3 py-2 text-center dark:border-zinc-700 dark:bg-zinc-800/30">
                          <span className="text-xs font-medium tabular-nums text-zinc-600 dark:text-zinc-300">
                            <span className="text-zinc-400 dark:text-zinc-500">
                              Messages logged:{' '}
                            </span>
                            {messageCountFallback}
                          </span>
                        </div>
                      )}

                      <div className="mt-4">
                        <div className="mb-2 flex items-center gap-2">
                          <IconMessageCircle2 className="h-4 w-4 text-primary" stroke={1.75} />
                          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                            Chat
                          </span>
                        </div>
                        {hasTranscript ? (
                          <ul className="max-h-[min(42vh,340px)] space-y-2 overflow-y-auto rounded-xl border border-zinc-200/90 bg-white p-2 dark:border-zinc-700 dark:bg-zinc-950/40">
                            {chatLines.map((line, i) => (
                              <li
                                key={`${i}-${line.slice(0, 24)}`}
                                className="rounded-lg border border-zinc-100 bg-zinc-50/90 px-3 py-2 text-sm leading-relaxed text-zinc-800 dark:border-zinc-700/70 dark:bg-zinc-800/60 dark:text-zinc-100"
                              >
                                {line}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/50 px-3 py-4 text-center dark:border-zinc-700 dark:bg-zinc-800/35">
                            <p className="text-sm text-zinc-600 dark:text-zinc-400">
                              {messageCountFallback > 0
                                ? 'Only a total message count was stored for this session. When your game sends a chat transcript on session end, lines appear here.'
                                : 'No chat was recorded for this session.'}
                            </p>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  <button
                    type="button"
                    className="mt-6 w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-primary/90"
                    onClick={onClose}
                  >
                    Close
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
