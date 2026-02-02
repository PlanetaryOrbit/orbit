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
} from "@tabler/icons-react";
import { useRouter } from "next/router";
import moment from "moment";
import clsx from "clsx";
import { FC } from "@/types/settingsComponent";

const listboxButtonClass = "w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-left text-sm font-medium text-zinc-900 dark:text-white hover:border-[color:rgb(var(--group-theme)/0.4)] focus:outline-none focus:ring-2 focus:ring-[color:rgb(var(--group-theme)/0.3)]";
const listboxOptionsClass = "absolute left-0 z-20 mt-2 w-full min-w-[12rem] rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-600 shadow-lg py-1 overflow-auto max-h-60";
const listboxOptionClass = (active: boolean) => clsx("flex items-center justify-between gap-2 px-4 py-2.5 cursor-pointer text-sm", active ? "bg-[color:rgb(var(--group-theme)/0.1)] text-[color:rgb(var(--group-theme))]" : "text-zinc-700 dark:text-zinc-300");

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
  const [isCloudUser, setIsCloudUser] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsCloudUser(window.location.hostname.endsWith(".planetaryapp.cloud"));
    }
  }, []);

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

  return (
    <div className="relative z-15 space-y-8">
      {!hasResetActivityOnly && (
        <>
          <section className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/30 overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-zinc-200 dark:border-zinc-700">
              <IconCalendarTime className="w-5 h-5 text-[color:rgb(var(--group-theme))]" />
              <h3 className="text-base font-semibold text-zinc-900 dark:text-white">Activity</h3>
            </div>
            <div className="p-5 space-y-6">
              <p className="text-sm text-zinc-500 dark:text-zinc-400 -mt-1">
                Configure activity tracking settings for your workspace
              </p>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Activity Role</label>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">Set the minimum rank to be tracked for activity</p>
                <Listbox value={selectedRole} onChange={(value: number) => updateRole(value)} as="div" className="relative">
                  <Listbox.Button className={listboxButtonClass}>
                    <span>{(roles.find((r: any) => r.rank === selectedRole) as any)?.name || "Select a role"}</span>
                    <IconChevronDown className="w-4 h-4 text-zinc-400 flex-shrink-0" />
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
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Idle Time Tracking</label>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">Track time when users are away from keyboard</p>
                <div className="flex items-center gap-3">
                  <SwitchComponenet
                    checked={idleTimeEnabled}
                    onChange={() => updateIdleTimeEnabled(!idleTimeEnabled)}
                    label=""
                  />
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">{idleTimeEnabled ? "Enabled" : "Disabled"}</span>
                </div>
              </div>
              <div>
                <button
                  onClick={downloadLoader}
                  className={clsx(
                    "inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors",
                    "bg-[color:rgb(var(--group-theme))] text-white hover:opacity-90"
                  )}
                >
                  <IconDownload className="w-4 h-4" />
                  Download loader
                </button>
              </div>
            </div>
          </section>

          {leaderboardEnabled && (
          <section className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/30 overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-zinc-200 dark:border-zinc-700">
              <IconPodium className="w-5 h-5 text-[color:rgb(var(--group-theme))]" />
              <h3 className="text-base font-semibold text-zinc-900 dark:text-white">Leaderboard</h3>
            </div>
            <div className="p-5 space-y-6">
              <p className="text-sm text-zinc-500 dark:text-zinc-400 -mt-1">
                Configure leaderboard display and ranking settings
              </p>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Leaderboard Rank</label>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">Set the minimum rank that will appear on the leaderboard</p>
                <Listbox value={selectedLRole} onChange={(value: number | undefined) => updateLRole(value)} as="div" className="relative">
                  <Listbox.Button className={listboxButtonClass}>
                    <span>
                      {selectedLRole ? (roles.find((r: any) => r.rank === selectedLRole) as any)?.name || "Guest" : "All ranks"}
                    </span>
                    <IconChevronDown className="w-4 h-4 text-zinc-400 flex-shrink-0" />
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
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Leaderboard Style</label>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">Choose how the leaderboard is displayed</p>
                <Listbox value={leaderboardStyle} onChange={(value: "list" | "podium") => updateLeaderboardStyle(value)} as="div" className="relative">
                  <Listbox.Button className={listboxButtonClass}>
                    <span className="flex items-center gap-2">
                      {leaderboardStyle === "list" ? <IconList className="w-4 h-4" /> : <IconPodium className="w-4 h-4" />}
                      {leaderboardStyle === "list" ? "List" : "Podium"}
                    </span>
                    <IconChevronDown className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                  </Listbox.Button>
                  <Listbox.Options className={listboxOptionsClass}>
                    <Listbox.Option value="list" className={({ active }) => listboxOptionClass(active)}>
                      {({ selected }) => (
                        <>
                          <span className="flex items-center gap-2">
                            <IconList className="w-4 h-4" />
                            <span className={selected ? "font-semibold" : ""}>List</span>
                            <span className="text-zinc-500 dark:text-zinc-400 text-xs">Compact vertical list</span>
                          </span>
                          {selected && <IconCheck className="w-4 h-4 text-[color:rgb(var(--group-theme))]" />}
                        </>
                      )}
                    </Listbox.Option>
                    <Listbox.Option value="podium" className={({ active }) => listboxOptionClass(active)}>
                      {({ selected }) => (
                        <>
                          <span className="flex items-center gap-2">
                            <IconPodium className="w-4 h-4" />
                            <span className={selected ? "font-semibold" : ""}>Podium</span>
                            <span className="text-zinc-500 dark:text-zinc-400 text-xs">Visual display with medals</span>
                          </span>
                          {selected && <IconCheck className="w-4 h-4 text-[color:rgb(var(--group-theme))]" />}
                        </>
                      )}
                    </Listbox.Option>
                  </Listbox.Options>
                </Listbox>
              </div>
            </div>
          </section>
          )}
        </>
      )}

      <div className="border-t border-zinc-200 dark:border-zinc-700 pt-6">
        <div className="flex items-center gap-3 mb-4">
          <div>
            <h3 className="text-lg font-medium text-zinc-900 dark:text-white">
              Activity Period
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Start a new activity timeframe
            </p>
          </div>
        </div>

        {lastReset && (
          <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Last Reset
                </span>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {moment(lastReset.resetAt).format(
                    "MMMM Do, YYYY [at] h:mm A"
                  )}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">
                  by {lastReset.resetBy?.username || (lastReset.resetById === null ? "Automation" : "Unknown User")}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <IconAlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-red-800 dark:text-red-300 mb-1">
                Warning: This action cannot be undone
              </h4>
            </div>
          </div>
        </div>

        <div className={`mb-6 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700 relative ${isCloudUser ? "opacity-50 pointer-events-none" : ""}`}>
          {isCloudUser && (
            <div className="absolute inset-0 flex items-center justify-center z-10 bg-zinc-50/50 dark:bg-zinc-800/50 rounded-xl">
              <div className="bg-white dark:bg-zinc-700 px-4 py-2 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-600">
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  🚢 Shipping soon!
                </p>
              </div>
            </div>
          )}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Automatic Reset
              </label>
              <SwitchComponenet
                checked={scheduleEnabled}
                onChange={() => !isCloudUser && setScheduleEnabled(!scheduleEnabled)}
                label=""
              />
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Automatically schedule an activity reset
            </p>
          </div>

          {scheduleEnabled && (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Reset Day
                </label>
                <Listbox
                  value={scheduleDay}
                  onChange={setScheduleDay}
                  as="div"
                  className="relative inline-block w-full text-left"
                >
                  <Listbox.Button className="z-10 h-auto w-full flex flex-row rounded-xl py-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 dark:focus-visible:bg-zinc-800 px-2 transition cursor-pointer outline-1 outline-gray-300 outline mb-1 focus-visible:bg-zinc-200">
                    <p className="z-10 my-auto text-lg pl-2 dark:text-white capitalize">
                      {scheduleDay}
                    </p>
                    <IconChevronDown
                      size={18}
                      color="#AAAAAA"
                      className="my-auto ml-auto"
                    />
                  </Listbox.Button>
                  <Listbox.Options className="absolute left-0 z-20 mt-2 w-full origin-top-left rounded-xl bg-white dark:text-white dark:bg-zinc-800 shadow-lg ring-1 ring-gray-300 focus-visible:outline-none overflow-clip">
                    {["monday", "sunday"].map((day) => (
                      <Listbox.Option
                        className={({ active }) =>
                          `${
                            active
                              ? "text-white bg-primary"
                              : "text-zinc-900 dark:text-white"
                          } relative cursor-pointer select-none py-2 pl-3 pr-9`
                        }
                        key={day}
                        value={day}
                      >
                        {({ selected, active }) => (
                          <>
                            <span
                              className={`${
                                selected ? "font-semibold" : "font-normal"
                              } block truncate text-lg capitalize`}
                            >
                              {day}
                            </span>
                            {selected && (
                              <span
                                className={`${
                                  active ? "text-white" : "text-primary"
                                } absolute inset-y-0 right-0 flex items-center pr-4`}
                              >
                                <IconCheck
                                  className="h-5 w-5"
                                  aria-hidden="true"
                                />
                              </span>
                            )}
                          </>
                        )}
                      </Listbox.Option>
                    ))}
                  </Listbox.Options>
                </Listbox>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Frequency
                </label>
                <Listbox
                  value={scheduleFrequency}
                  onChange={setScheduleFrequency}
                  as="div"
                  className="relative inline-block w-full text-left"
                >
                  <Listbox.Button className="z-10 h-auto w-full flex flex-row rounded-xl py-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 dark:focus-visible:bg-zinc-800 px-2 transition cursor-pointer outline-1 outline-gray-300 outline mb-1 focus-visible:bg-zinc-200">
                    <p className="z-10 my-auto text-lg pl-2 dark:text-white capitalize">
                      {scheduleFrequency}
                    </p>
                    <IconChevronDown
                      size={18}
                      color="#AAAAAA"
                      className="my-auto ml-auto"
                    />
                  </Listbox.Button>
                  <Listbox.Options className="absolute left-0 z-20 mt-2 w-full origin-top-left rounded-xl bg-white dark:text-white dark:bg-zinc-800 shadow-lg ring-1 ring-gray-300 focus-visible:outline-none overflow-clip">
                    {[
                      { value: "weekly", label: "Weekly" },
                      { value: "biweekly", label: "Bi-weekly" },
                      { value: "monthly", label: "Monthly" },
                    ].map((freq) => (
                      <Listbox.Option
                        className={({ active }) =>
                          `${
                            active
                              ? "text-white bg-primary"
                              : "text-zinc-900 dark:text-white"
                          } relative cursor-pointer select-none py-2 pl-3 pr-9`
                        }
                        key={freq.value}
                        value={freq.value}
                      >
                        {({ selected, active }) => (
                          <>
                            <span
                              className={`${
                                selected ? "font-semibold" : "font-normal"
                              } block truncate text-lg`}
                            >
                              {freq.label}
                            </span>
                            {selected && (
                              <span
                                className={`${
                                  active ? "text-white" : "text-primary"
                                } absolute inset-y-0 right-0 flex items-center pr-4`}
                              >
                                <IconCheck
                                  className="h-5 w-5"
                                  aria-hidden="true"
                                />
                              </span>
                            )}
                          </>
                        )}
                      </Listbox.Option>
                    ))}
                  </Listbox.Options>
                </Listbox>
              </div>

              <button
                onClick={saveSchedule}
                className="w-full px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors"
              >
                Save Schedule
              </button>
            </>
          )}
        </div>

        <button
          onClick={() => setIsResetDialogOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
        >
          Reset Activity Period
        </button>
      </div>

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
