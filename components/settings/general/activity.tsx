import axios from "axios";
import React, { useEffect, useState, Fragment } from "react";
import type toast from "react-hot-toast";
import { useRecoilState } from "recoil";
import SwitchComponenet from "@/components/switch";
import { workspacestate } from "@/state";
import { Dialog, Listbox, Transition } from "@headlessui/react";
import {
  IconCheck,
  IconChevronDown,
  IconAlertTriangle,
  IconCalendarTime,
  IconList,
  IconPodium,
  IconDownload,
  IconHistory,
} from "@tabler/icons-react";
import { useRouter } from "next/router";
import moment from "moment";
import clsx from "clsx";
import { FC } from "@/types/settingsComponent";

const listboxButtonClass = "w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-left text-sm font-medium text-zinc-900 dark:text-white hover:border-[color:rgb(var(--group-theme)/0.4)] focus:outline-none focus:ring-2 focus:ring-[color:rgb(var(--group-theme)/0.3)]";
// z-50 so an open menu stacks above later listbox buttons in the same card (avoid “List” showing through rank menu)
const listboxOptionsClass =
  "absolute left-0 z-50 mt-2 w-full min-w-[12rem] rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-600 shadow-lg py-1 overflow-auto max-h-60";
const listboxOptionClass = (active: boolean) => clsx("flex items-center justify-between gap-2 px-4 py-2.5 cursor-pointer text-sm", active ? "bg-[color:rgb(var(--group-theme)/0.1)] text-[color:rgb(var(--group-theme))]" : "text-zinc-700 dark:text-zinc-300");

const layoutOptionClass = (active: boolean) =>
  clsx(
    "flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm leading-snug cursor-pointer transition-colors",
    active ? "bg-[color:rgb(var(--group-theme)/0.1)]" : "text-zinc-700 dark:text-zinc-300"
  );

function SettingField({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{label}</p>
        {hint ? <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">{hint}</p> : null}
      </div>
      {children}
    </div>
  )
}

type props = {
  triggerToast: typeof toast;
  hasResetActivityOnly?: boolean;
};

const Activity: FC<props> = (props) => {
  const triggerToast = props.triggerToast;
  const hasResetActivityOnly = props.hasResetActivityOnly ?? false;
  const [workspace, setWorkspace] = useRecoilState(workspacestate);
  const [roles, setRoles] = React.useState([]);
  const [selectedRole, setSelectedRole] = React.useState<number>();
  const [selectedLRole, setSelectedLRole] = React.useState<number>();
  const [lastReset, setLastReset] = useState<any>(null);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [leaderboardEnabled, setLeaderboardEnabled] = useState(false);
  const [idleTimeEnabled, setIdleTimeEnabled] = useState(true);
  const [leaderboardStyle, setLeaderboardStyle] = useState<"list" | "podium">(
    "list"
  );
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleDay, setScheduleDay] = useState<string>("monday");
  const [scheduleFrequency, setScheduleFrequency] = useState<string>("weekly");
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const res = await axios.get(
        `/api/workspace/${router.query.id}/settings/activity/getConfig`
      );
      if (res.status === 200) {
        setRoles(res.data.roles);
        setSelectedRole(res.data.currentRole);
        setSelectedLRole(res.data.leaderboardRole);
        setIdleTimeEnabled(res.data.idleTimeEnabled ?? true);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(
          `/api/workspace/${router.query.id}/activity/lastreset`
        );
        if (res.status === 200 && res.data.success) {
          setLastReset(res.data.lastReset);
        }
      } catch (error) {
        console.error("Error fetching last reset:", error);
      }
    })();
  }, [router.query.id]);

  useEffect(() => {
    if (router.query.id) {
      fetch(`/api/workspace/${router.query.id}/settings/general/leaderboard`)
        .then((res) => res.json())
        .then((data) => {
          let enabled = false;
          let style = "list";
          let val = data.value ?? data;
          if (typeof val === "string") {
            try {
              val = JSON.parse(val);
            } catch {
              val = {};
            }
          }
          enabled =
            typeof val === "object" && val !== null && "enabled" in val
              ? (val as { enabled?: boolean }).enabled ?? false
              : false;
          style =
            typeof val === "object" && val !== null && "style" in val
              ? (val as { style?: string }).style ?? "list"
              : "list";
          setLeaderboardEnabled(enabled);
          setLeaderboardStyle(style as "list" | "podium");
        })
        .catch(() => {
          setLeaderboardEnabled(false);
          setLeaderboardStyle("list");
        });
    }
  }, [router.query.id]);

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(
          `/api/workspace/${router.query.id}/settings/activity/schedule`
        );
        if (res.status === 200 && res.data.success) {
          const schedule = res.data.schedule;
          if (schedule) {
            setScheduleEnabled(schedule.enabled || false);
            setScheduleDay(schedule.day || "monday");
            setScheduleFrequency(schedule.frequency || "weekly");
          }
        }
      } catch (error) {
        console.error("Error fetching schedule:", error);
      }
    })();
  }, [router.query.id]);

  const downloadLoader = async () => {
    window.open(`/api/workspace/${router.query.id}/settings/activity/download`);
  };

  const updateRole = async (id: number) => {
    const req = await axios.post(
      `/api/workspace/${workspace.groupId}/settings/activity/setRole`,
      { role: id }
    );
    if (req.status === 200) {
      setSelectedRole(
        (roles.find((role: any) => role.rank === id) as any).rank
      );

      if (selectedLRole && id > selectedLRole) {
        const availableRoles = (roles as any[]).filter(
          (role: any) => role.rank >= id
        );
        if (availableRoles.length > 0) {
          const lowestAvailableRole = availableRoles.sort(
            (a: any, b: any) => a.rank - b.rank
          )[0];
          await updateLRole(lowestAvailableRole.rank);
        }
      }
      triggerToast.success("Updated activity role!");
    }
  };

  const updateLRole = async (id: number | undefined) => {
    try {
      const req = await axios.post(
        `/api/workspace/${workspace.groupId}/settings/activity/setLRole`,
        { role: id }
      );
      if (req.status === 200) {
        setSelectedLRole(id);
        triggerToast.success("Updated leaderboard rank!");
      }
    } catch (error: any) {
      triggerToast.error(
        error?.response?.data?.error || "Failed to update leaderboard rank."
      );
    }
  };

  const updateIdleTimeEnabled = async (enabled: boolean) => {
    try {
      const req = await axios.post(
        `/api/workspace/${workspace.groupId}/settings/activity/setIdleTime`,
        { enabled: enabled }
      );
      if (req.status === 200) {
        setIdleTimeEnabled(enabled);
        triggerToast.success("Updated idle time tracking!");
      }
    } catch (error: any) {
      triggerToast.error("Failed to update idle time tracking.");
    }
  };

  const updateLeaderboardStyle = async (style: "list" | "podium") => {
    try {
      const res = await axios.patch(
        `/api/workspace/${workspace.groupId}/settings/general/leaderboard`,
        {
          enabled: leaderboardEnabled,
          style: style,
        }
      );
      if (res.status === 200) {
        setLeaderboardStyle(style);
        triggerToast.success("Updated leaderboard style!");
      }
    } catch (error: any) {
      triggerToast.error("Failed to update leaderboard style.");
    }
  };

  const resetActivity = async () => {
    setIsResetting(true);
    try {
      const res = await axios.post(
        `/api/workspace/${router.query.id}/activity/reset`
      );
      if (res.status === 200) {
        triggerToast.success("Activity has been reset!");
        setIsResetDialogOpen(false);
        const resetRes = await axios.get(
          `/api/workspace/${router.query.id}/activity/lastreset`
        );
        if (resetRes.status === 200 && resetRes.data.success) {
          setLastReset(resetRes.data.lastReset);
        }
      }
    } catch (error) {
      triggerToast.error("Failed to reset activity.");
    } finally {
      setIsResetting(false);
    }
  };

  const saveSchedule = async () => {
    try {
      const res = await axios.post(
        `/api/workspace/${router.query.id}/settings/activity/schedule`,
        {
          enabled: scheduleEnabled,
          day: scheduleDay,
          frequency: scheduleFrequency,
        }
      );
      if (res.status === 200) {
        triggerToast.success("Schedule saved successfully!");
      }
    } catch (error) {
      triggerToast.error("Failed to save schedule.");
    }
  };

  // overflow-visible so Listbox popovers are not clipped (clipping + focus can scroll the page / “jump up”)
  const cardClass =
    "rounded-2xl border border-zinc-200/90 dark:border-zinc-700/80 bg-white dark:bg-zinc-900/30 shadow-sm overflow-visible"
  const cardHeaderClass = "px-5 py-4 border-b border-zinc-100 dark:border-zinc-800/80"

  return (
    <div className="relative z-15 mx-auto max-w-3xl space-y-6">
      {!hasResetActivityOnly && (
        <>
          <section className={cardClass}>
            <div className={clsx(cardHeaderClass, "bg-zinc-50/80 dark:bg-zinc-800/20")}>
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color:rgb(var(--group-theme)/0.12)] text-[color:rgb(var(--group-theme))]">
                  <IconCalendarTime className="h-5 w-5" stroke={1.5} />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-zinc-900 dark:text-white">Activity</h2>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                    Who is tracked, idle detection, and the desktop loader for in-game time.
                  </p>
                </div>
              </div>
            </div>
            <div className="p-5 space-y-0 divide-y divide-zinc-100 dark:divide-zinc-800/80">
              <div className="pb-5">
                <SettingField
                  label="Activity role"
                  hint="Only members at or above this rank are included in activity stats."
                >
                  <Listbox value={selectedRole} onChange={(value: number) => updateRole(value)} as="div" className="relative">
                    <Listbox.Button className={listboxButtonClass}>
                      <span className="truncate">{(roles.find((r: any) => r.rank === selectedRole) as any)?.name || "Select a role"}</span>
                      <IconChevronDown className="w-4 h-4 text-zinc-400 shrink-0" />
                    </Listbox.Button>
                    <Listbox.Options className={listboxOptionsClass}>
                      {roles.filter((role: any) => role.rank > 0).map((role: any, index) => (
                        <Listbox.Option key={index} value={role.rank} className={({ active }) => listboxOptionClass(active)}>
                          {({ selected }) => (
                            <>
                              <span className={selected ? "font-semibold" : ""}>{role.name}</span>
                              {selected && <IconCheck className="w-4 h-4 text-[color:rgb(var(--group-theme))]" />}
                            </>
                          )}
                        </Listbox.Option>
                      ))}
                    </Listbox.Options>
                  </Listbox>
                </SettingField>
              </div>
              <div className="pt-5 pb-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Idle time tracking</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Count time when staff are away from keyboard.</p>
                  </div>
                  <div className="flex items-center justify-end gap-2 shrink-0">
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums w-12 text-right">{idleTimeEnabled ? "On" : "Off"}</span>
                    <SwitchComponenet checked={idleTimeEnabled} onChange={() => updateIdleTimeEnabled(!idleTimeEnabled)} label="" />
                  </div>
                </div>
              </div>
              <div className="pt-5">
                <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Activity loader</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 mb-3">Install this on your machine to report session time to the workspace.</p>
                <button
                  type="button"
                  onClick={downloadLoader}
                  className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-[color:rgb(var(--group-theme))] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:opacity-90"
                >
                  <IconDownload className="h-4 w-4" stroke={1.5} />
                  Download loader
                </button>
              </div>
            </div>
          </section>

          {leaderboardEnabled && (
            <section className={cardClass}>
              <div className={clsx(cardHeaderClass, "bg-zinc-50/80 dark:bg-zinc-800/20")}>
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color:rgb(var(--group-theme)/0.12)] text-[color:rgb(var(--group-theme))]">
                    <IconPodium className="h-5 w-5" stroke={1.5} />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-zinc-900 dark:text-white">Leaderboard</h2>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">How rankings appear on the public leaderboard page.</p>
                  </div>
                </div>
              </div>
              <div className="p-5 space-y-0 divide-y divide-zinc-100 dark:divide-zinc-800/80">
                <div className="pb-5">
                  <SettingField
                    label="Minimum rank on leaderboard"
                    hint="Ranks below this are hidden from the leaderboard (unless you allow all ranks)."
                  >
                    <Listbox value={selectedLRole} onChange={(value: number | undefined) => updateLRole(value)} as="div" className="relative">
                      <Listbox.Button className={listboxButtonClass}>
                        <span className="truncate">
                          {selectedLRole ? (roles.find((r: any) => r.rank === selectedLRole) as any)?.name || "Guest" : "All ranks"}
                        </span>
                        <IconChevronDown className="w-4 h-4 text-zinc-400 shrink-0" />
                      </Listbox.Button>
                      <Listbox.Options className={listboxOptionsClass}>
                        <Listbox.Option value={undefined} className={({ active }) => listboxOptionClass(active)}>
                          {({ selected }) => (
                            <>
                              <span className={selected ? "font-semibold" : ""}>All ranks</span>
                              {selected && <IconCheck className="w-4 h-4 text-[color:rgb(var(--group-theme))]" />}
                            </>
                          )}
                        </Listbox.Option>
                        {roles.filter((role: any) => !selectedRole || role.rank >= selectedRole).map((role: any, index) => (
                          <Listbox.Option key={index} value={role.rank} className={({ active }) => listboxOptionClass(active)}>
                            {({ selected }) => (
                              <>
                                <span className={selected ? "font-semibold" : ""}>{role.name}</span>
                                {selected && <IconCheck className="w-4 h-4 text-[color:rgb(var(--group-theme))]" />}
                              </>
                            )}
                          </Listbox.Option>
                        ))}
                      </Listbox.Options>
                    </Listbox>
                  </SettingField>
                </div>
                <div className="pt-5">
                  <SettingField label="Layout" hint="List is compact; podium highlights top three.">
                    <Listbox value={leaderboardStyle} onChange={(value: "list" | "podium") => updateLeaderboardStyle(value)} as="div" className="relative">
                      <Listbox.Button
                        className={listboxButtonClass}
                        onMouseDown={(e) => e.preventDefault()}
                      >
                        <span className="flex min-w-0 items-center gap-2.5 text-left">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-300">
                            {leaderboardStyle === "list" ? <IconList className="h-4 w-4" stroke={1.5} /> : <IconPodium className="h-4 w-4" stroke={1.5} />}
                          </span>
                          <span className="truncate font-medium">{leaderboardStyle === "list" ? "List" : "Podium"}</span>
                        </span>
                        <IconChevronDown className="h-4 w-4 shrink-0 text-zinc-400" />
                      </Listbox.Button>
                      <Listbox.Options className={listboxOptionsClass}>
                        <Listbox.Option value="list" className={({ active }) => layoutOptionClass(active)}>
                          {({ selected }) => (
                            <>
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center self-center rounded-lg bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-300">
                                <IconList className="h-4 w-4" stroke={1.5} />
                              </span>
                              <div className="min-w-0 flex-1 py-0.5 self-center">
                                <p
                                  className={clsx(
                                    "text-sm",
                                    selected ? "font-semibold text-zinc-900 dark:text-white" : "font-medium text-zinc-800 dark:text-zinc-200"
                                  )}
                                >
                                  List
                                </p>
                                <p className="mt-0.5 text-xs leading-normal text-zinc-500 dark:text-zinc-400">Single column, all ranks in order</p>
                              </div>
                              {selected ? <IconCheck className="h-4 w-4 shrink-0 self-center text-[color:rgb(var(--group-theme))]" stroke={2} /> : <span className="h-4 w-4 shrink-0" aria-hidden />}
                            </>
                          )}
                        </Listbox.Option>
                        <Listbox.Option value="podium" className={({ active }) => layoutOptionClass(active)}>
                          {({ selected }) => (
                            <>
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center self-center rounded-lg bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-300">
                                <IconPodium className="h-4 w-4" stroke={1.5} />
                              </span>
                              <div className="min-w-0 flex-1 py-0.5 self-center">
                                <p
                                  className={clsx(
                                    "text-sm",
                                    selected ? "font-semibold text-zinc-900 dark:text-white" : "font-medium text-zinc-800 dark:text-zinc-200"
                                  )}
                                >
                                  Podium
                                </p>
                                <p className="mt-0.5 text-xs leading-normal text-zinc-500 dark:text-zinc-400">Medals and raised blocks for 1st–3rd</p>
                              </div>
                              {selected ? <IconCheck className="h-4 w-4 shrink-0 self-center text-[color:rgb(var(--group-theme))]" stroke={2} /> : <span className="h-4 w-4 shrink-0" aria-hidden />}
                            </>
                          )}
                        </Listbox.Option>
                      </Listbox.Options>
                    </Listbox>
                  </SettingField>
                </div>
              </div>
            </section>
          )}
        </>
      )}

      <section className={cardClass}>
        <div className={clsx(cardHeaderClass, "bg-zinc-50/80 dark:bg-zinc-800/20")}>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100/90 dark:bg-red-950/40 text-red-600 dark:text-red-400">
              <IconHistory className="h-5 w-5" stroke={1.5} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-white">Activity period & resets</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">Manual reset clears current metrics. Scheduled resets can run automatically.</p>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {lastReset && (
            <div className="flex gap-3 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 bg-zinc-50/60 dark:bg-zinc-800/40 px-4 py-3">
              <div className="mt-0.5 text-zinc-400">
                <IconHistory className="h-4 w-4" stroke={1.5} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Last period reset</p>
                <p className="text-sm text-zinc-800 dark:text-zinc-200 mt-0.5">
                  {moment(lastReset.resetAt).format("MMMM Do, YYYY [at] h:mm A")}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">
                  {lastReset.resetBy?.username
                    ? `By ${lastReset.resetBy.username}`
                    : lastReset.resetById === null
                      ? "By automation"
                      : "By unknown user"}
                </p>
              </div>
            </div>
          )}

          <div className="space-y-4 rounded-xl border border-zinc-200/80 p-4 dark:border-zinc-700/80">
            <div className="flex flex-col gap-3 sm:min-h-[2.5rem] sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <div className="min-w-0 pr-0 sm:pr-2">
                <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Automatic reset</p>
                <p className="mt-0.5 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">Run a reset on a recurring schedule (saved separately from manual reset).</p>
              </div>
              <div className="flex shrink-0 items-center justify-end gap-2 sm:pt-0">
                <span className="w-8 text-right text-xs text-zinc-500 tabular-nums">{scheduleEnabled ? "On" : "Off"}</span>
                <SwitchComponenet
                  checked={scheduleEnabled}
                  onChange={() => setScheduleEnabled(!scheduleEnabled)}
                  label=""
                />
              </div>
            </div>

            {scheduleEnabled && (
              <div className="space-y-4 border-t border-zinc-100 dark:border-zinc-800/80 pt-4">
                <SettingField label="Day" hint="The weekday the job runs.">
                  <Listbox value={scheduleDay} onChange={setScheduleDay} as="div" className="relative w-full text-left">
                    <Listbox.Button className={listboxButtonClass}>
                      <span className="capitalize">{(scheduleDay as string) || "monday"}</span>
                      <IconChevronDown className="w-4 h-4 text-zinc-400 shrink-0" />
                    </Listbox.Button>
                    <Listbox.Options className={listboxOptionsClass}>
                      {["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"].map((day) => (
                        <Listbox.Option key={day} value={day} className={({ active }) => listboxOptionClass(active)}>
                          {({ selected }) => (
                            <>
                              <span className="capitalize">{day}</span>
                              {selected && <IconCheck className="w-4 h-4 text-[color:rgb(var(--group-theme))]" />}
                            </>
                          )}
                        </Listbox.Option>
                      ))}
                    </Listbox.Options>
                  </Listbox>
                </SettingField>
                <SettingField label="Frequency" hint="How often the reset should occur.">
                  <Listbox value={scheduleFrequency} onChange={setScheduleFrequency} as="div" className="relative w-full text-left">
                    <Listbox.Button className={listboxButtonClass}>
                      <span>
                        {scheduleFrequency === "weekly"
                          ? "Weekly"
                          : scheduleFrequency === "biweekly"
                            ? "Bi-weekly"
                            : "Monthly"}
                      </span>
                      <IconChevronDown className="w-4 h-4 text-zinc-400 shrink-0" />
                    </Listbox.Button>
                    <Listbox.Options className={listboxOptionsClass}>
                      {[
                        { value: "weekly", label: "Weekly" },
                        { value: "biweekly", label: "Bi-weekly" },
                        { value: "monthly", label: "Monthly" },
                      ].map((freq) => (
                        <Listbox.Option key={freq.value} value={freq.value} className={({ active }) => listboxOptionClass(active)}>
                          {({ selected }) => (
                            <>
                              <span className={selected ? "font-semibold" : ""}>{freq.label}</span>
                              {selected && <IconCheck className="w-4 h-4 text-[color:rgb(var(--group-theme))]" />}
                            </>
                          )}
                        </Listbox.Option>
                      ))}
                    </Listbox.Options>
                  </Listbox>
                </SettingField>
                <button
                  type="button"
                  onClick={saveSchedule}
                  className="w-full sm:w-auto rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-95"
                >
                  Save schedule
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 rounded-xl border border-red-200/80 bg-red-50/50 p-4 dark:border-red-900/50 dark:bg-red-950/20 sm:flex-row sm:items-center sm:gap-4">
            <div className="flex min-w-0 flex-1 items-start gap-2.5 sm:items-center">
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center sm:mt-0" aria-hidden>
                <IconAlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" stroke={1.5} />
              </span>
              <p className="min-w-0 flex-1 text-sm leading-snug text-red-900 dark:text-red-200/95">
                Manual reset saves history, clears current stats, and cannot be undone.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsResetDialogOpen(true)}
              className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-700 sm:ml-0 sm:w-auto sm:py-2"
            >
              Reset activity period
            </button>
          </div>
        </div>
      </section>

      <Transition appear show={isResetDialogOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50"
          onClose={() => !isResetting && setIsResetDialogOpen(false)}
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
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-xl bg-white dark:bg-zinc-800 p-6 text-left shadow-xl transition-all">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-red-100 dark:bg-red-900 p-2 rounded-lg">
                      <IconAlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                    </div>
                    <Dialog.Title className="text-lg font-medium text-zinc-900 dark:text-white">
                      Confirm Activity Reset
                    </Dialog.Title>
                  </div>

                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
                    Are you sure you want to reset the activity period? This
                    will:
                  </p>

                  <ul className="text-sm text-zinc-600 dark:text-zinc-400 mb-6 space-y-1 ml-4">
                    <li>• Save all current activity data to history</li>
                    <li>• Clear all current activity metrics</li>
                    <li>• Start a fresh activity period</li>
                  </ul>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setIsResetDialogOpen(false)}
                      disabled={isResetting}
                      className="flex-1 rounded-lg border border-gray-300 bg-white dark:bg-zinc-700 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-white hover:bg-zinc-50 dark:hover:bg-zinc-600 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={resetActivity}
                      disabled={isResetting}
                      className="flex-1 rounded-lg bg-red-500 hover:bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                    >
                      {isResetting ? "Resetting..." : "Reset Activity"}
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
};

Activity.title = "Activity";
Activity.isAboveOthers = true;

export default Activity;
