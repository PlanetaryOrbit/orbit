import React, { Fragment, useEffect, useState, useMemo } from "react";
import { useRecoilState, useRecoilValue } from "recoil";
import { workspacestate } from "@/state";
import { themeState } from "@/state/theme";
import { FC } from "@/types/settingsComponent";
import { Chart, ChartData, ScatterDataPoint } from "chart.js";
import { Line } from "react-chartjs-2";
import type { ActivitySession, Quota, inactivityNotice } from "@prisma/client";
import Tooltip from "@/components/tooltip";
import moment from "moment";
import { Dialog, Transition, Tab } from "@headlessui/react";
import Button from "../button";
import {
  IconMessages,
  IconMoon,
  IconPlayerPlay,
  IconWalk,
  IconCalendarTime,
  IconChartBar,
  IconUsers,
  IconClipboardList,
  IconAdjustments,
  IconChevronLeft,
  IconChevronRight,
  IconCalendar,
  IconClock,
  IconCalendarEvent,
  IconTarget,
} from "@tabler/icons-react";
import axios from "axios";
import { Toaster, toast } from "react-hot-toast";
import { useRouter } from "next/router";
import { ActivityOverview } from "@/components/profile/activityoverview";
import { SessionsHistory } from "@/components/profile/sessions";
import { QuotasProgress } from "@/components/profile/quotas";

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

  // Update displayMinutes when timeSpent prop changes (e.g., when switching between weeks)
  useEffect(() => {
    setDisplayMinutes(timeSpent);
  }, [timeSpent]);

  useEffect(() => {
    const fetchConfig = async () => {
      if (id) {
        try {
          const res = await axios.get(`/api/workspace/${id}/settings/activity/getConfig`);
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
        }
      );
      if (!data.success) throw new Error("Failed");
      setDisplayMinutes(
        (prev) => prev + (adjustType === "remove" ? -val : val)
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
      <Toaster position="bottom-center" />
      
      <Tab.Group>
        <Tab.List className="flex gap-8 px-1 border-b border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800">
          <Tab
            className={({ selected }) =>
              `flex items-center gap-2 px-1 py-4 text-sm font-medium transition-colors relative ${
                selected
                  ? "text-primary"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              } ${
                selected
                  ? "after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary"
                  : ""
              }`
            }
          >
            <IconChartBar className="w-4 h-4" />
            Activity
          </Tab>
          <Tab
            className={({ selected }) =>
              `flex items-center gap-2 px-1 py-4 text-sm font-medium transition-colors relative ${
                selected
                  ? "text-primary"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              } ${
                selected
                  ? "after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary"
                  : ""
              }`
            }
          >
            <IconCalendarEvent className="w-4 h-4" />
            Sessions
          </Tab>
          <Tab
            className={({ selected }) =>
              `flex items-center gap-2 px-1 py-4 text-sm font-medium transition-colors relative ${
                selected
                  ? "text-primary"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              } ${
                selected
                  ? "after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary"
                  : ""
              }`
            }
          >
            <IconTarget className="w-4 h-4" />
            Quotas
          </Tab>
        </Tab.List>

        {getCurrentWeekLabel && (
          <div className="flex justify-center mb-6">
            <div className="flex items-center gap-3 bg-white dark:bg-zinc-700 rounded-full px-4 py-3 shadow-sm border border-zinc-200 dark:border-zinc-600">
            <button
              onClick={goToPreviousWeek}
              disabled={!canGoBack || loadingHistory}
              className="p-1.5 rounded-full text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <IconChevronLeft className="w-4 h-4" />
            </button>
            <div className="text-center px-3">
              <p className="text-sm font-medium text-zinc-900 dark:text-white whitespace-nowrap">
                {selectedWeek > 0 && availableHistory[selectedWeek - 1] ? (
                  <>
                    {moment(
                      availableHistory[selectedWeek - 1].period.start
                    ).format("MMM DD")}{" "}
                    -{" "}
                    {moment(
                      availableHistory[selectedWeek - 1].period.end
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
              className="p-1.5 rounded-full text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <IconChevronRight className="w-4 h-4" />
            </button>
            </div>
          </div>
        )}

        {loadingHistory ? (
          <div className="flex items-center justify-center py-12">
            <div className="bg-white dark:bg-zinc-700 rounded-xl p-8 max-w-md mx-auto text-center">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 animate-pulse">
                <IconChartBar className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-1">
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
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-amber-100 dark:bg-amber-900 p-2 rounded-lg">
                  <IconCalendarTime className="w-5 h-5 text-amber-600 dark:text-amber-400" />
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
                {!isHistorical &&
                  workspace.yourPermission?.includes("manage_activity") && (
                    <div className="flex justify-end mb-4">
                      <button
                        onClick={() => setAdjustModal(true)}
                        className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition"
                      >
                        <IconAdjustments className="w-4 h-4" />
                        Manual Adjustment
                      </button>
                    </div>
                  )}
                <ActivityOverview
                  data={data}
                  displayMinutes={displayMinutes}
                  messages={messages}
                  idleTime={idleMins}
                  sessionsHosted={sessionsHosted}
                  sessionsAttended={sessionsAttended}
                  idleTimeEnabled={idleTimeEnabled}
                  notices={notices}
                  adjustments={adjustments}
                  sessions={sessions}
                  avatar={avatar}
                />
              </Tab.Panel>
              <Tab.Panel>
                <SessionsHistory
                  sessions={sessions}
                  notices={notices}
                  adjustments={adjustments}
                  avatar={avatar}
                  idleTimeEnabled={idleTimeEnabled}
                  sessionsHosted={sessionsHosted}
                  sessionsAttended={sessionsAttended}
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
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-xl bg-white dark:bg-zinc-800 p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium text-zinc-900 dark:text-white mb-4"
                  >
                    Manual Adjustment
                  </Dialog.Title>
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setAdjustType("award")}
                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border ${
                          adjustType === "award"
                            ? "bg-green-500 text-white border-green-500"
                            : "bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 border-transparent"
                        }`}
                      >
                        Award
                      </button>
                      <button
                        onClick={() => setAdjustType("remove")}
                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border ${
                          adjustType === "remove"
                            ? "bg-red-500 text-white border-red-500"
                            : "bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 border-transparent"
                        }`}
                      >
                        Remove
                      </button>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1 text-zinc-600 dark:text-zinc-300">
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
                              Math.max(0, parseInt(e.target.value, 10) || 0)
                            )
                          )
                        }
                        className="w-full px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-white text-sm outline-none"
                        placeholder="e.g. 10"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1 text-zinc-600 dark:text-zinc-300">
                        Reason (optional)
                      </label>
                      <textarea
                        value={adjustReason}
                        onChange={(e) => setAdjustReason(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-white text-sm outline-none resize-none"
                        placeholder="Recognition for outstanding support"
                      />
                    </div>
                  </div>
                  <div className="mt-6 flex gap-2">
                    <button
                      onClick={() => setAdjustModal(false)}
                      className="flex-1 px-4 py-2 rounded-lg bg-zinc-200 dark:bg-zinc-700 text-sm font-medium text-zinc-800 dark:text-zinc-200 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition"
                    >
                      Cancel
                    </button>
                    <button
                      disabled={submittingAdjust}
                      onClick={submitAdjustment}
                      className="flex-1 px-4 py-2 rounded-lg bg-primary text-sm font-medium text-white disabled:opacity-60 disabled:cursor-not-allowed hover:bg-primary/90 transition"
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
