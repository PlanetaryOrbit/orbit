import { Fragment, useEffect, useState } from "react";
import { useRecoilState } from "recoil";
import { workspacestate } from "@/state";
import { FC } from "@/types/settingsComponent";
import type { ActivitySession, Quota, inactivityNotice } from "@prisma/client";
import moment from "moment";
import { Dialog, Transition, Tab } from "@headlessui/react";
import {
  IconCalendarTime,
  IconChartBar,
  IconAdjustments,
  IconChevronLeft,
  IconChevronRight,
  IconCalendarEvent,
  IconTarget,
} from "@tabler/icons-react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { useRouter } from "next/router";
import { ActivityOverview } from "@/components/profile/activityoverview";
import { SessionsHistory } from "@/components/profile/sessions";
import { QuotasProgress } from "@/components/profile/quotas";
import {
  profileTabClass,
  profileTabListClass,
  profileInputClass,
  profilePanelShadow,
  profilePrimaryButtonClass,
  profileSecondaryButtonClass,
} from "@/components/profile/shell";

type Props = {
  timeSpent: number;
  timesPlayed: number;
  data: any;
  quotas: (Quota & { currentValue?: number; percentage?: number })[];
  sessionsHosted: number;
  sessionsAttended: number;
  allianceVisits: number;
  avatar: string;
  sessions: (ActivitySession & {
    user: {
      picture: string | null;
    };
  })[];
  notices: inactivityNotice[];
  adjustments?: any[];
  isHistorical?: boolean;
  historicalPeriod?: {
    start: string;
    end: string;
  } | null;
  loadingHistory?: boolean;
  messages?: number;
  idleTime?: number;
  selectedWeek?: number;
  availableHistory?: any[];
  getCurrentWeekLabel?: () => string;
  canGoBack?: boolean;
  canGoForward?: boolean;
  goToPreviousWeek?: () => void;
  goToNextWeek?: () => void;
  canAdjustActivity?: boolean;
};

type TimelineItem =
  | (ActivitySession & {
      __type: "session";
      user: { picture: string | null };
      active: boolean;
    })
  | (inactivityNotice & { __type: "notice" })
  | {
      __type: "adjustment";
      id: string;
      minutes: number;
      actor?: { username?: string };
      createdAt: string;
      reason?: string;
    };

const Activity: FC<Props> = ({
  timeSpent,
  timesPlayed,
  data,
  quotas,
  sessionsAttended,
  sessionsHosted,
  allianceVisits,
  avatar,
  sessions,
  notices,
  adjustments = [],
  isHistorical = false,
  historicalPeriod = null,
  loadingHistory = false,
  messages: propMessages,
  idleTime: propIdleTime,
  selectedWeek = 0,
  availableHistory = [],
  getCurrentWeekLabel,
  canGoBack = false,
  canGoForward = false,
  goToPreviousWeek,
  goToNextWeek,
  canAdjustActivity = false,
}) => {
  const router = useRouter();
  const { id } = router.query;

  const [workspace, setWorkspace] = useRecoilState(workspacestate);
  const [displayMinutes, setDisplayMinutes] = useState<number>(timeSpent);
  const [idleTimeEnabled, setIdleTimeEnabled] = useState(true);
  const [adjustModal, setAdjustModal] = useState(false);
  const [adjustMinutes, setAdjustMinutes] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState("");
  const [adjustType, setAdjustType] = useState<"award" | "remove">("award");
  const [submittingAdjust, setSubmittingAdjust] = useState(false);
  const [localSessions, setLocalSessions] = useState(sessions);

  // keep in sync if prop changes (e.g. week switch)
  useEffect(() => {
    setLocalSessions(sessions);
  }, [sessions]);

  // Update displayMinutes when timeSpent prop changes (e.g., when switching between weeks)
  useEffect(() => {
    setDisplayMinutes(timeSpent);
  }, [timeSpent]);

  useEffect(() => {
    const fetchConfig = async () => {
      if (id) {
        try {
          const res = await axios.get(
            `/api/workspace/${id}/settings/activity/getConfig`,
          );
          setIdleTimeEnabled(res.data.idleTimeEnabled ?? true);
        } catch (error) {
          console.error("Failed to fetch activity config:", error);
        }
      }
    };
    fetchConfig();
  }, [id]);

  const idleMins =
    propIdleTime !== undefined
      ? propIdleTime
      : sessions.reduce((acc, session) => {
          return acc + Number(session.idleTime);
        }, 0);
  const messages =
    propMessages !== undefined
      ? propMessages
      : sessions.reduce((acc, session) => {
          return acc + Number(session.messages);
        }, 0);

  const types: {
    [key: string]: string;
  } = {
    mins: "minutes",
    sessions_hosted: "sessions hosted",
    sessions_attended: "sessions attended",
  };

  const submitAdjustment = async () => {
    const val = Math.min(Math.max(adjustMinutes, 0), 1000);
    if (!val || val <= 0) return toast.error("Enter minutes > 0");
    if (val !== adjustMinutes) setAdjustMinutes(val);
    setSubmittingAdjust(true);
    try {
      const { data } = await axios.post(
        `/api/workspace/${id}/activity/adjustment`,
        {
          userId: router.query.uid,
          minutes: val,
          action: adjustType,
          reason: adjustReason,
        },
      );
      if (!data.success) throw new Error("Failed");
      setDisplayMinutes(
        (prev) => prev + (adjustType === "remove" ? -val : val),
      );
      toast.success("Adjustment saved!");
      setAdjustModal(false);
      setAdjustMinutes(0);
      setAdjustReason("");
    } catch (e) {
      toast.error("Could not save adjustment.");
    } finally {
      setSubmittingAdjust(false);
    }
  };

  return (
    <>
      <Tab.Group>
        <Tab.List className={profileTabListClass}>
          <Tab className={({ selected }) => profileTabClass(selected)}>
            <IconChartBar className="w-3.5 h-3.5 sm:w-4 sm:h-4" stroke={1.75} />
            Activity
          </Tab>
          <Tab className={({ selected }) => profileTabClass(selected)}>
            <IconCalendarEvent
              className="w-3.5 h-3.5 sm:w-4 sm:h-4"
              stroke={1.75}
            />
            Sessions
          </Tab>
          <Tab className={({ selected }) => profileTabClass(selected)}>
            <IconTarget className="w-3.5 h-3.5 sm:w-4 sm:h-4" stroke={1.75} />
            Quotas
          </Tab>
        </Tab.List>

        {getCurrentWeekLabel && (
          <div className="flex justify-center mt-4 mb-6 px-2">
            <div className="inline-flex max-w-full items-center gap-1.5 rounded-xl bg-zinc-100 px-2 sm:px-3 py-1.5 dark:bg-zinc-800/80">
              <button
                onClick={goToPreviousWeek}
                disabled={!canGoBack || loadingHistory}
                className="p-1 sm:p-1.5 rounded-full text-zinc-500 dark:text-zinc-300 hover:bg-zinc-200/70 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
              >
                <IconChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
              <div className="px-1 sm:px-2 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-zinc-800 dark:text-zinc-50 whitespace-nowrap truncate">
                  {selectedWeek > 0 && availableHistory[selectedWeek - 1] ? (
                    <>
                      {moment(
                        availableHistory[selectedWeek - 1].period.start,
                      ).format("MMM DD")}{" "}
                      -{" "}
                      {moment(
                        availableHistory[selectedWeek - 1].period.end,
                      ).format("MMM DD, YYYY")}
                    </>
                  ) : (
                    getCurrentWeekLabel()
                  )}
                </p>
              </div>
              <button
                onClick={goToNextWeek}
                disabled={!canGoForward || loadingHistory}
                className="p-1 sm:p-1.5 rounded-full text-zinc-500 dark:text-zinc-300 hover:bg-zinc-200/70 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
              >
                <IconChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>
          </div>
        )}

        {loadingHistory ? (
          <div className="flex items-center justify-center py-12">
            <div className="mx-auto max-w-md rounded-xl bg-zinc-50/80 p-8 text-center dark:bg-zinc-800/40">
              <div className="mx-auto mb-4 flex h-14 w-14 animate-pulse items-center justify-center rounded-2xl bg-primary/10">
                <IconChartBar className="h-7 w-7 text-primary" stroke={1.75} />
              </div>
              <h3 className="mb-1 text-base font-medium text-zinc-900 dark:text-white">
                Loading Historical Data
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Please wait while we fetch the activity data...
              </p>
            </div>
          </div>
        ) : (
          <div>
            {isHistorical && historicalPeriod && (
              <div className="mb-6 rounded-xl bg-amber-500/10 p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-amber-500/15 p-2">
                    <IconCalendarTime
                      className="h-5 w-5 text-amber-600 dark:text-amber-400"
                      stroke={1.75}
                    />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-amber-900 dark:text-amber-200">
                      Historical Activity Data
                    </h3>
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      Showing activity from{" "}
                      {moment(historicalPeriod.start).format("MMM DD")} -{" "}
                      {moment(historicalPeriod.end).format("MMM DD, YYYY")}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <Tab.Panels className="min-h-[400px]">
              <Tab.Panel>
                {!isHistorical && canAdjustActivity && (
                  <div className="mb-4 flex justify-end">
                    <button
                      onClick={() => setAdjustModal(true)}
                      className={profilePrimaryButtonClass}
                    >
                      <IconAdjustments className="h-4 w-4" stroke={1.75} />
                      Manual Adjustment
                    </button>
                  </div>
                )}
                <ActivityOverview
                  onEndSession={(sid, wid) => {
                    toast.loading("Ending session...", {
                      id: `session-${sid}`,
                    });
                    axios
                      .post("/api/activity/force-end", {
                        sessionId: sid,
                        workspaceId: wid,
                      })
                      .then(() => {
                        toast.success("Session ended", {
                          id: `session-${sid}`,
                        });
                        setLocalSessions((prev) =>
                          prev.map((s) =>
                            s.id === sid
                              ? { ...s, active: false, endTime: new Date() }
                              : s,
                          ),
                        );
                      })
                      .catch(() => {
                        toast.error("Failed to end session", {
                          id: `session-${sid}`,
                        });
                      });
                  }}
                  data={data}
                  displayMinutes={displayMinutes}
                  messages={messages}
                  idleTime={idleMins}
                  sessionsHosted={sessionsHosted}
                  sessionsAttended={sessionsAttended}
                  idleTimeEnabled={idleTimeEnabled}
                  notices={notices}
                  adjustments={adjustments}
                  sessions={localSessions}
                  avatar={avatar}
                />
              </Tab.Panel>
              <Tab.Panel>
                <SessionsHistory
                  sessions={localSessions}
                  notices={notices}
                  adjustments={adjustments}
                  avatar={avatar}
                  idleTimeEnabled={idleTimeEnabled}
                  sessionsHosted={sessionsHosted}
                  sessionsAttended={sessionsAttended}
                  isHistorical={isHistorical}
                  historicalPeriod={historicalPeriod}
                />
              </Tab.Panel>
              <Tab.Panel>
                <QuotasProgress
                  quotas={quotas}
                  displayMinutes={displayMinutes}
                  sessionsHosted={sessionsHosted}
                  sessionsAttended={sessionsAttended}
                  allianceVisits={allianceVisits}
                />
              </Tab.Panel>
            </Tab.Panels>
          </div>
        )}
      </Tab.Group>

      <Transition appear show={adjustModal} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-10"
          onClose={() => setAdjustModal(false)}
        >
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
          </Transition.Child>
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel
                  className={`w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle transition-all dark:bg-zinc-900 ${profilePanelShadow}`}
                >
                  <Dialog.Title
                    as="h3"
                    className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white"
                  >
                    Manual Adjustment
                  </Dialog.Title>
                  <div className="space-y-4">
                    <div className={profileTabListClass}>
                      <button
                        type="button"
                        onClick={() => setAdjustType("award")}
                        className={`flex-1 ${profileTabClass(adjustType === "award")}`}
                      >
                        Award
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdjustType("remove")}
                        className={`flex-1 ${profileTabClass(adjustType === "remove")} ${
                          adjustType === "remove"
                            ? "!bg-red-600 !text-white dark:!bg-red-600"
                            : ""
                        }`}
                      >
                        Remove
                      </button>
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-zinc-400">
                        Minutes
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={1000}
                        value={adjustMinutes}
                        onChange={(e) =>
                          setAdjustMinutes(
                            Math.min(
                              1000,
                              Math.max(0, parseInt(e.target.value, 10) || 0),
                            ),
                          )
                        }
                        className={profileInputClass}
                        placeholder="e.g. 10"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-zinc-400">
                        Reason (optional)
                      </label>
                      <textarea
                        value={adjustReason}
                        onChange={(e) => setAdjustReason(e.target.value)}
                        rows={3}
                        className={`${profileInputClass} resize-none`}
                        placeholder="Recognition for outstanding support"
                      />
                    </div>
                  </div>
                  <div className="mt-6 flex gap-2">
                    <button
                      onClick={() => setAdjustModal(false)}
                      className={`flex-1 justify-center px-4 py-2 text-sm ${profileSecondaryButtonClass}`}
                    >
                      Cancel
                    </button>
                    <button
                      disabled={submittingAdjust}
                      onClick={submitAdjustment}
                      className={`flex-1 justify-center px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60 ${
                        adjustType === "remove"
                          ? "inline-flex items-center gap-1.5 rounded-xl bg-red-600 text-sm font-medium text-white transition hover:bg-red-700"
                          : profilePrimaryButtonClass
                      }`}
                    >
                      {submittingAdjust
                        ? "Saving..."
                        : adjustType === "award"
                          ? "Award Minutes"
                          : "Remove Minutes"}
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

export default Activity;
