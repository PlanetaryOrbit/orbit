"use client";

import type React from "react";
import type { pageWithLayout } from "@/layoutTypes";
import { loginState, workspacestate } from "@/state";
import Button from "@/components/button";
import Input from "@/components/input";
import { v4 as uuidv4 } from "uuid";
import Workspace from "@/layouts/workspace";
import { useRecoilState } from "recoil";
import { useEffect, useState } from "react";
import { Listbox, Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";
import {
  IconCheck,
  IconChevronDown,
  IconPlus,
  IconTrash,
  IconInfoCircle,
  IconAlertCircle,
  IconCalendarEvent,
  IconUsers,
  IconClipboardList,
  IconUserPlus,
  IconArrowLeft,
  IconDeviceFloppy,
} from "@tabler/icons-react";
import { withPermissionCheckSsr } from "@/utils/permissionsManager";
import * as noblox from "noblox.js";
import { useRouter } from "next/router";
import axios from "axios";
import prisma from "@/utils/database";
import Switchcomponenet from "@/components/switch";
import { useForm, FormProvider } from "react-hook-form";
import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import { canCreateScheduled, canCreateUnscheduled } from "@/utils/sessionPermissions";

export const getServerSideProps: GetServerSideProps = withPermissionCheckSsr(
  async (context) => {
    const { id } = context.query;

    let games: Array<{ name: string; id: number }> = [];
    let fallbackToManual = false;

    try {
      const fetchedGames = await noblox.getGroupGames(Number(id));
      games = fetchedGames
        .filter((game: any) => game.rootPlace?.type === "Place")
        .map((game: any) => ({
          name: game.name,
          id: Number(game.rootPlace.id),
        }))
        .filter((game) => !isNaN(game.id) && game.id > 0);
    } catch (err) {
      console.error("Failed to fetch games from noblox:", err);
      fallbackToManual = true;
    }

    return {
      props: {
        games,
        fallbackToManual,
      },
    };
  },
  [
    "sessions_shift_scheduled", "sessions_shift_unscheduled",
    "sessions_training_scheduled", "sessions_training_unscheduled",
    "sessions_event_scheduled", "sessions_event_unscheduled",
    "sessions_other_scheduled", "sessions_other_unscheduled"
  ]
);

const Home: pageWithLayout<InferGetServerSidePropsType<GetServerSideProps>> = ({
  games,
  fallbackToManual,
}) => {
  const [login, setLogin] = useRecoilState(loginState);
  const [activeTab, setActiveTab] = useState("basic");
  const [enabled, setEnabled] = useState(false);
  const [days, setDays] = useState<string[]>([]);
  const form = useForm({
    mode: "onChange",
  });
  const [workspace, setWorkspace] = useRecoilState(workspacestate);
  const [allowUnscheduled, setAllowUnscheduled] = useState(false);
  const [selectedGame, setSelectedGame] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [frequency, setFrequency] = useState("weekly");
  const [sessionLength, setSessionLength] = useState(30); // Default to 30 minutes
  const [unscheduledDate, setUnscheduledDate] = useState("");
  const [unscheduledTime, setUnscheduledTime] = useState("");
  const [times, setTimes] = useState<string[]>([]);
  const [timeInput, setTimeInput] = useState("");
  const [statues, setStatues] = useState<
    {
      name: string;
      timeAfter: number;
      color: string;
      id: string;
    }[]
  >([
    {
      name: "Starting Soon",
      timeAfter: -15,
      color: "yellow",
      id: uuidv4(),
    },
    {
      name: "In Progress",
      timeAfter: 0,
      color: "green",
      id: uuidv4(),
    },
  ]);
  const [slots, setSlots] = useState<
    {
      name: string;
      slots: number;
      id: string;
    }[]
  >([
    {
      name: "Co-Host",
      slots: 1,
      id: uuidv4(),
    },
  ]);
  const [showOverlapModal, setShowOverlapModal] = useState(false);
  const [overlapMessage, setOverlapMessage] = useState("");
  const [overlapError, setOverlapError] = useState("");
  const [pendingCreation, setPendingCreation] = useState<
    (() => Promise<void>) | null
  >(null);
  const router = useRouter();
  const availableSessionTypes = [
    { value: "shift", label: "Shift" },
    { value: "training", label: "Training" },
    { value: "event", label: "Event" },
    { value: "other", label: "Other" },
  ].filter(type => {
    const hasScheduledPerm = canCreateScheduled(workspace.yourPermission || [], type.value);
    const hasUnscheduledPerm = canCreateUnscheduled(workspace.yourPermission || [], type.value);
    return hasScheduledPerm || hasUnscheduledPerm;
  });
  const canCreateAnyScheduled = availableSessionTypes.some(type => 
    canCreateScheduled(workspace.yourPermission || [], type.value)
  );
  const canCreateAnyUnscheduled = availableSessionTypes.some(type => 
    canCreateUnscheduled(workspace.yourPermission || [], type.value)
  );

  const checkOverlaps = async (sessionDate: Date, duration: number) => {
    try {
      const dateStr = sessionDate.toISOString().split('T')[0];
      const response = await axios.get(
        `/api/workspace/${workspace.groupId}/sessions/all?date=${dateStr}`
      );
      const allSessions = Array.isArray(response.data) ? response.data : [];

      const sessionStart = sessionDate.getTime();
      const sessionEnd = sessionStart + duration * 60 * 1000;

      const overlapping = allSessions.filter((session: any) => {
        const existingStart = new Date(session.date).getTime();
        const existingEnd =
          existingStart + (session.duration || 30) * 60 * 1000;
        return sessionStart < existingEnd && sessionEnd > existingStart;
      });

      return overlapping;
    } catch (error) {
      return [];
    }
  };

  const createSession = async () => {
    setIsSubmitting(true);
    setFormError("");

    try {
      const selectedTimes = times.length > 0 ? times : [form.getValues().time || "00:00"];
      const selectedDays: number[] = days.map((day) => {
        const dayMap = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        return dayMap.indexOf(day);
      });

      // use the first selected time as the representative schedule time when creating the session type
      const [firstHours, firstMinutes] = selectedTimes[0].split(":").map(Number);

      const sessionTypeResponse = await axios.post(
        `/api/workspace/${workspace.groupId}/sessions/manage/new`,
        {
          name: form.getValues().name,
          description: form.getValues().description,
          gameId: fallbackToManual ? form.getValues().gameId : selectedGame,
          schedule: {
            enabled,
            days: selectedDays,
            hours: firstHours,
            minutes: firstMinutes,
            allowUnscheduled,
          },
          slots,
          statues,
        }
      );

      const createdSessionType = sessionTypeResponse.data.session;

      if (enabled && selectedDays.length > 0) {
        const overlapsAggregate: Array<{ time: string; day: number; overlapping: any[] }>
          = [];

        for (const timeValue of selectedTimes) {
          const [localHours, localMinutes] = timeValue.split(":").map(Number);
          for (const dayOfWeek of selectedDays) {
            const today = new Date();
            const currentDay = today.getDay();
            let daysUntilTarget = (dayOfWeek - currentDay + 7) % 7;
            if (daysUntilTarget === 0) {
              const scheduledTime = new Date(today);
              scheduledTime.setHours(localHours, localMinutes, 0, 0);
              if (today.getTime() >= scheduledTime.getTime()) {
                daysUntilTarget = 7;
              }
            }

            const nextOccurrence = new Date(today);
            nextOccurrence.setDate(today.getDate() + daysUntilTarget);
            nextOccurrence.setHours(localHours, localMinutes, 0, 0);

            const overlapping = await checkOverlaps(nextOccurrence, sessionLength);
            if (overlapping.length > 0) {
              overlapsAggregate.push({ time: timeValue, day: dayOfWeek, overlapping });
            }
          }
        }

        if (overlapsAggregate.length > 0) {
          const first = overlapsAggregate[0];
          const dayName = [
            "Sunday",
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
          ][first.day];
          const sampleDate = new Date();
          const [h, m] = first.time.split(":").map(Number);
          sampleDate.setHours(h, m, 0, 0);

          const message = `One or more of the requested scheduled times overlap with existing session(s). Example: scheduled session on ${dayName} at ${sampleDate.toLocaleString()} overlaps with ${first.overlapping.length} existing session(s):\n${first.overlapping
            .map((s: any) => `• ${s.name} (${new Date(s.date).toLocaleString()})`)
            .join("\n")}\n\nDo you want to create all requested recurring sessions anyway?`;

          setPendingCreation(async () => {
            const timesArray = selectedTimes.map(timeValue => {
              const [localHours, localMinutes] = timeValue.split(":").map(Number);
              return { hours: localHours, minutes: localMinutes };
            });
            
            await axios.post(
              `/api/workspace/${workspace.groupId}/sessions/create-scheduled`,
              {
                sessionTypeId: createdSessionType.id,
                name: form.getValues().name,
                type: form.getValues().type,
                schedule: {
                  days: selectedDays,
                  times: timesArray,
                  frequency: frequency,
                },
                duration: sessionLength,
                timezoneOffset: new Date().getTimezoneOffset(),
              }
            );
          });

          setOverlapError("");
          setOverlapMessage(message);
          setShowOverlapModal(true);
          setIsSubmitting(false);
          return;
        }

        const timesArray = selectedTimes.map(timeValue => {
          const [localHours, localMinutes] = timeValue.split(":").map(Number);
          return { hours: localHours, minutes: localMinutes };
        });
        
        await axios.post(`/api/workspace/${workspace.groupId}/sessions/create-scheduled`, {
          sessionTypeId: createdSessionType.id,
          name: form.getValues().name,
          type: form.getValues().type,
          schedule: {
            days: selectedDays,
            times: timesArray,
            frequency: frequency,
          },
          duration: sessionLength,
          timezoneOffset: new Date().getTimezoneOffset(),
        });
      }

      if (allowUnscheduled && unscheduledDate && unscheduledTime) {
        const localDateTime = new Date(
          unscheduledDate + "T" + unscheduledTime + ":00"
        );

        // Prevent creating sessions in the past
        if (localDateTime.getTime() <= Date.now()) {
          setFormError("Cannot create a session in the past. Choose a future date/time.");
          setIsSubmitting(false);
          return;
        }
        const overlapping = await checkOverlaps(localDateTime, sessionLength);

        if (overlapping.length > 0) {
          const message = `This session overlaps with ${
            overlapping.length
          } existing session(s):\n${overlapping
            .map(
              (s: any) => `• ${s.name} (${new Date(s.date).toLocaleString()})`
            )
            .join("\n")}\n\nDo you want to create this session anyway?`;

          setPendingCreation(async () => {
            try {
              await axios.post(
                `/api/workspace/${workspace.groupId}/sessions/create-unscheduled`,
                {
                  sessionTypeId: createdSessionType.id,
                  name: form.getValues().name,
                  type: form.getValues().type,
                  date: unscheduledDate,
                  time: unscheduledTime,
                  duration: sessionLength,
                  timezoneOffset: new Date().getTimezoneOffset(),
                }
              );
            } catch (err: any) {
              console.error("Failed to create unscheduled session:", err);
              throw err;
            }
          });
          setOverlapError("");
          setOverlapMessage(message);
          setShowOverlapModal(true);
          setIsSubmitting(false);
          return;
        }

        await axios.post(
          `/api/workspace/${workspace.groupId}/sessions/create-unscheduled`,
          {
            sessionTypeId: createdSessionType.id,
            name: form.getValues().name,
            type: form.getValues().type,
            date: unscheduledDate,
            time: unscheduledTime,
            duration: sessionLength,
            timezoneOffset: new Date().getTimezoneOffset(),
          }
        );
      }

      router.push(`/workspace/${workspace.groupId}/sessions?refresh=true`).catch((navErr) => {
        console.error("Navigation error (session was created):", navErr);
      });
    } catch (err: any) {
      console.error("Session creation error:", err);
      setFormError(
        err?.response?.data?.error ||
          "Failed to create session. Please try again."
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOverlapConfirm = async () => {
    setOverlapError("");
    setIsSubmitting(true);

    if (pendingCreation) {
      try {
        await pendingCreation();
      } catch (err: any) {
        console.log("Creation completed with note:", err);
      }
      
      setPendingCreation(null);
      setShowOverlapModal(false);
      setTimeout(() => {
        router.push(`/workspace/${workspace.groupId}/sessions?refresh=true`);
      }, 200);
    }
  };

  const handleOverlapCancel = () => {
    setShowOverlapModal(false);
    setOverlapError("");
    setPendingCreation(null);
    setIsSubmitting(false);
  };

  const toggleDay = (day: string) => {
    setDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const newStatus = () => {
    setStatues((prev) => [
      ...prev,
      {
        name: "New status",
        timeAfter: 0,
        color: "green",
        id: uuidv4(),
      },
    ]);
  };

  const deleteStatus = (id: string) => {
    setStatues((prev) => prev.filter((status) => status.id !== id));
  };

  const updateStatus = (
    id: string,
    name: string,
    color: string,
    timeafter: number
  ) => {
    setStatues((prev) =>
      prev.map((status) =>
        status.id === id
          ? { ...status, name, color, timeAfter: timeafter }
          : status
      )
    );
  };

  const newSlot = () => {
    setSlots((prev) => [
      ...prev,
      {
        name: "Co-Host",
        slots: 1,
        id: uuidv4(),
      },
    ]);
  };

  const deleteSlot = (id: string) => {
    setSlots((prev) => prev.filter((slot) => slot.id !== id));
  };

  const updateSlot = (id: string, name: string, slotsAvailble: number) => {
    setSlots((prev) =>
      prev.map((slot) =>
        slot.id === id ? { ...slot, slots: slotsAvailble, name } : slot
      )
    );
  };

  const addTime = () => {
    if (!timeInput) return;
    if (times.includes(timeInput)) {
      setTimeInput("");
      return;
    }
    setTimes((prev) => [...prev, timeInput]);
    setTimeInput("");
  };

  const removeTime = (t: string) => {
    setTimes((prev) => prev.filter((x) => x !== t));
  };

  const tabs = [
    { id: "basic", label: "Basic Info", icon: <IconInfoCircle size={18} /> },
    {
      id: "scheduling",
      label: "Scheduling",
      icon: <IconCalendarEvent size={18} />,
    },
    {
      id: "statuses",
      label: "Statuses",
      icon: <IconClipboardList size={18} />,
    },
    { id: "slots", label: "Slots", icon: <IconUserPlus size={18} /> },
  ];

  const isFormValid = () => {
    if (!form.getValues().name) return false;
    if (!form.getValues().type) return false;
    if (fallbackToManual && !form.getValues().gameId) return false;
    if (!allowUnscheduled && !enabled) return false;
    if (allowUnscheduled && enabled) return false;
    if (enabled && !canCreateScheduled) return false;
    if (allowUnscheduled && !canCreateUnscheduled) return false;
    if (enabled && times.length === 0 && !form.getValues().time) return false;
    if (enabled && days.length === 0) return false;
    if (allowUnscheduled && (!unscheduledDate || !unscheduledTime))
      return false;

    return true;
  };

  const getCompletionStatus = () => {
    let completed = 0;
    const total = 4;

    if (
      form.getValues().name &&
      (selectedGame || (fallbackToManual && form.getValues().gameId))
    ) {
      completed++;
    }
    completed++;
    completed++;
    completed++;

    return Math.round((completed / total) * 100);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 text-zinc-500 dark:text-zinc-300 hover:text-zinc-700 dark:hover:text-white rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
            aria-label="Go back"
          >
            <IconArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold dark:text-white">
              Create New Session
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 mt-1">
              Set up a new session for your group's activities
            </p>
          </div>
        </div>
      </div>

      {/* Error message */}
      {formError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 dark:bg-red-900/20 dark:border-red-800">
          <IconAlertCircle
            className="text-red-500 mt-0.5 flex-shrink-0"
            size={18}
          />
          <div>
            <h3 className="font-medium text-red-800 dark:text-red-400">
              Error
            </h3>
            <p className="text-red-600 dark:text-red-300 text-sm">
              {formError}
            </p>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="mb-6 overflow-x-auto">
        <div className="flex space-x-1 min-w-max border-b border-gray-200 dark:border-zinc-700">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 flex items-center gap-2 text-sm font-medium transition-all border-b-2 -mb-px ${
                activeTab === tab.id
                  ? "border-primary text-primary dark:border-primary dark:text-primary"
                  : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <FormProvider {...form}>
        <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-700 overflow-hidden">
          {/* Basic Info */}
          {activeTab === "basic" && (
            <div className="p-6">
              <div className="flex items-start mb-6">
                <div className="bg-primary/10 p-2 rounded-lg mr-4">
                  <IconInfoCircle className="text-primary" size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-semibold dark:text-white">
                    Basic Information
                  </h2>
                  <p className="text-zinc-500 dark:text-zinc-400 mt-1">
                    Enter the essential details about your session type
                  </p>
                </div>
              </div>

              <div className="space-y-6 max-w-2xl">
                <div>
                  <Input
                    {...form.register("name", {
                      required: {
                        value: true,
                        message: "Session name is required",
                      },
                    })}
                    label="Session Name"
                    placeholder="Weekly Training Session"
                  />
                  {form.formState.errors.name && (
                    <p className="mt-1 text-sm text-red-500">
                      {form.formState.errors.name.message as string}
                    </p>
                  )}
                </div>

                <div>
                  <Input
                    {...form.register("description")}
                    label="Description"
                    textarea
                    placeholder="Describe what this session is about, what will happen, and any special instructions..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Session Type
                  </label>
                  {availableSessionTypes.length > 0 ? (
                    <>
                      <select
                        {...form.register("type", {
                          required: {
                            value: true,
                            message: "Session type is required",
                          },
                        })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-md shadow-sm focus:ring-primary focus:border-primary dark:bg-zinc-700 dark:text-white"
                      >
                        <option value="">Select type...</option>
                        {availableSessionTypes.map(type => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </select>
                      {form.formState.errors.type && (
                        <p className="mt-1 text-sm text-red-500">
                          {form.formState.errors.type.message as string}
                        </p>
                      )}
                    </>
                  ) : (
                    <div className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-md shadow-sm bg-zinc-50 dark:bg-zinc-700/50 text-zinc-500 dark:text-zinc-400">
                      No session types available - you don't have permission to create any session types
                    </div>
                  )}
                </div>

                {games.length > 0 ? (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Game
                    </label>
                    <Listbox as="div" className="relative">
                      <Listbox.Button className="flex items-center justify-between w-full px-4 py-2.5 text-left bg-white dark:bg-zinc-700 border border-gray-300 dark:border-zinc-600 rounded-lg shadow-sm">
                        <span className="block truncate text-zinc-700 dark:text-white">
                          {games?.find(
                            (game: { name: string; id: number }) =>
                              game.id === Number(selectedGame)
                          )?.name || "Select a game"}
                        </span>
                        <IconChevronDown
                          size={18}
                          className="text-zinc-500 dark:text-zinc-400"
                        />
                      </Listbox.Button>
                      <Listbox.Options className="absolute z-10 w-full mt-1 overflow-auto bg-white dark:bg-zinc-800 rounded-lg shadow-lg max-h-60 ring-1 ring-black ring-opacity-5 focus:outline-none">
                        {games.map((game: { name: string; id: number }) => (
                          <Listbox.Option
                            key={game.id}
                            value={game.id}
                            onClick={() => setSelectedGame(game.id.toString())}
                            className={({ active }) =>
                              `${
                                active
                                  ? "bg-primary/10 text-primary"
                                  : "text-zinc-900 dark:text-white"
                              } cursor-pointer select-none relative py-2.5 pl-10 pr-4`
                            }
                          >
                            {({ selected, active }) => (
                              <>
                                <span
                                  className={`${
                                    selected ? "font-medium" : "font-normal"
                                  } block truncate`}
                                >
                                  {game.name}
                                </span>
                                {selectedGame === game.id.toString() && (
                                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-primary">
                                    <IconCheck size={18} aria-hidden="true" />
                                  </span>
                                )}
                              </>
                            )}
                          </Listbox.Option>
                        ))}
                        <div className="h-[1px] rounded-xl w-full px-3 bg-zinc-200 dark:bg-zinc-700" />
                        <Listbox.Option
                          value="None"
                          onClick={() => setSelectedGame("")}
                          className={({ active }) =>
                            `${
                              active
                                ? "bg-primary/10 text-primary"
                                : "text-zinc-900 dark:text-white"
                            } cursor-pointer select-none relative py-2.5 pl-10 pr-4`
                          }
                        >
                          {({ selected, active }) => (
                            <>
                              <span
                                className={`${
                                  selected ? "font-medium" : "font-normal"
                                } block truncate`}
                              >
                                None
                              </span>
                              {selectedGame === "" && (
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-primary">
                                  <IconCheck size={18} aria-hidden="true" />
                                </span>
                              )}
                            </>
                          )}
                        </Listbox.Option>
                      </Listbox.Options>
                    </Listbox>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                      Select the game where this session will take place
                    </p>
                  </div>
                ) : (
                  <div>
                    <Input
                      {...form.register("gameId", {
                        required: {
                          value: true,
                          message:
                            "Universe ID is required when games cannot be fetched",
                        },
                        pattern: {
                          value: /^[0-9]+$/,
                          message: "Invalid Universe ID format",
                        },
                      })}
                      label="Universe ID"
                      placeholder="Enter your universe ID"
                    />
                    {form.formState.errors.gameId && (
                      <p className="mt-1 text-sm text-red-500">
                        {form.formState.errors.gameId.message as string}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-8 flex justify-end">
                <Button
                  onPress={() => setActiveTab("scheduling")}
                  classoverride="bg-primary text-white hover:bg-primary/90 dark:bg-primary dark:text-white dark:hover:bg-primary/90"
                >
                  Continue to Scheduling
                </Button>
              </div>
            </div>
          )}

          {/* Scheduling */}
          {activeTab === "scheduling" && (
            <div className="p-6">
              <div className="flex items-start mb-6">
                <div className="bg-primary/10 p-2 rounded-lg mr-4">
                  <IconCalendarEvent className="text-primary" size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-semibold dark:text-white">
                    Scheduling Options
                  </h2>
                  <p className="text-zinc-500 dark:text-zinc-400 mt-1">
                    Configure when and how often sessions will occur
                  </p>
                </div>
              </div>

              <div className="space-y-6 max-w-2xl">
                <div className="p-4 bg-zinc-50 dark:bg-zinc-700/30 rounded-lg border border-gray-200 dark:border-zinc-700">
                  <div className="flex flex-col space-y-3">
                    <div className={!canCreateAnyUnscheduled ? "opacity-50 cursor-not-allowed" : ""}>
                      <Switchcomponenet
                        label="Unscheduled session"
                        checked={allowUnscheduled}
                        onChange={() => {
                          if (!canCreateAnyUnscheduled) return;
                          if (!allowUnscheduled && enabled) {
                            setEnabled(false);
                          }
                          setAllowUnscheduled(!allowUnscheduled);
                        }}
                      />
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 ml-10">
                        {canCreateAnyUnscheduled 
                          ? "Enable this to set up a one time session"
                          : "You don't have permission to create unscheduled sessions"}
                      </p>
                    </div>

                    <div className={!canCreateAnyScheduled ? "opacity-50 cursor-not-allowed mt-2" : "mt-2"}>
                      <Switchcomponenet
                        label="Scheduled session"
                        checked={enabled}
                        onChange={() => {
                          if (!canCreateAnyScheduled) return;
                          if (!enabled && allowUnscheduled) {
                            setAllowUnscheduled(false);
                          }
                          setEnabled(!enabled);
                        }}
                      />
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 ml-10">
                        {canCreateAnyScheduled
                          ? "Enable this to set up recurring sessions on a schedule"
                          : "You don't have permission to create scheduled sessions"}
                      </p>
                    </div>
                  </div>
                </div>

                {allowUnscheduled && (
                  <div className="p-4 bg-white dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-zinc-700 space-y-4">
                    <h3 className="text-lg font-medium dark:text-white">
                      Unscheduled Session
                    </h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      Set the date and time for your single session
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                          Session Date
                        </label>
                        <input
                          type="date"
                          value={unscheduledDate}
                          onChange={(e) => setUnscheduledDate(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg shadow-sm focus:ring-primary focus:border-primary dark:bg-zinc-700 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                          Session Time
                        </label>
                        <input
                          type="time"
                          value={unscheduledTime}
                          onChange={(e) => setUnscheduledTime(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg shadow-sm focus:ring-primary focus:border-primary dark:bg-zinc-700 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                          Session Length
                        </label>
                        <select
                          value={sessionLength}
                          onChange={(e) =>
                            setSessionLength(Number(e.target.value))
                          }
                          className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg shadow-sm focus:ring-primary focus:border-primary dark:bg-zinc-700 dark:text-white"
                        >
                          <option value={5}>5 minutes</option>
                          <option value={10}>10 minutes</option>
                          <option value={15}>15 minutes</option>
                          <option value={20}>20 minutes</option>
                          <option value={30}>30 minutes</option>
                          <option value={45}>45 minutes</option>
                          <option value={50}>50 minutes</option>
                          <option value={60}>1 hour</option>
                          <option value={90}>1.5 hours</option>
                          <option value={120}>2 hours</option>
                        </select>
                      </div>
                    </div>

                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Enter date and time in your local timezone. This will
                      create a single session at the specified date and time.
                    </p>
                  </div>
                )}

                {enabled && (
                  <div className="p-4 bg-white dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-zinc-700 space-y-6">
                    <div>
                      <h3 className="text-lg font-medium dark:text-white mb-3">
                        Frequency
                      </h3>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-3">
                        Choose how often this session repeats
                      </p>

                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { value: "weekly", label: "Weekly" },
                          { value: "biweekly", label: "Bi-weekly" },
                          { value: "monthly", label: "Monthly" },
                        ].map((freq) => (
                          <button
                            key={freq.value}
                            type="button"
                            onClick={() => setFrequency(freq.value)}
                            className={`py-3 px-4 rounded-lg transition-all text-center ${
                              frequency === freq.value
                                ? "bg-primary text-white"
                                : "bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-600"
                            }`}
                          >
                            {freq.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-medium dark:text-white mb-3">
                        Repeating Days
                      </h3>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-3">
                        Select which days of the week this session will repeat
                      </p>

                      <div className="grid grid-cols-7 gap-2">
                        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
                          (day) => (
                            <button
                              key={day}
                              type="button"
                              onClick={() => toggleDay(day)}
                              className={`py-3 rounded-lg transition-all ${
                                days.includes(day)
                                  ? "bg-primary text-white"
                                  : "bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-600"
                              }`}
                            >
                              {day}
                            </button>
                          )
                        )}
                      </div>

                      {days.length > 0 && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
                          Selected: {days.join(", ")}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                          <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                              Session Times
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="time"
                                value={timeInput}
                                onChange={(e) => setTimeInput(e.target.value)}
                                className="px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white"
                              />
                              <button
                                type="button"
                                onClick={addTime}
                                className="px-3 py-2 bg-primary text-white rounded-md"
                              >
                                Add time
                              </button>
                            </div>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
                              Add one or more times
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {times.length > 0 ? (
                                times.map((t) => (
                                  <span
                                    key={t}
                                    className="flex items-center gap-2 px-3 py-1 rounded-full dark:text-white bg-zinc-100 dark:bg-zinc-700 text-sm"
                                  >
                                    {t}
                                    <button
                                      type="button"
                                      onClick={() => removeTime(t)}
                                      className="text-red-500 ml-1"
                                    >
                                      ✕
                                    </button>
                                  </span>
                                ))
                              ) : form.getValues().time ? (
                                <div className="px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-700">
                                  {form.getValues().time}
                                </div>
                              ) : null}
                            </div>
                          </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                          Session Length
                        </label>
                        <select
                          value={sessionLength}
                          onChange={(e) =>
                            setSessionLength(Number(e.target.value))
                          }
                          className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg shadow-sm focus:ring-primary focus:border-primary dark:bg-zinc-700 dark:text-white"
                        >
                          <option value={5}>5 minutes</option>
                          <option value={10}>10 minutes</option>
                          <option value={15}>15 minutes</option>
                          <option value={20}>20 minutes</option>
                          <option value={30}>30 minutes</option>
                          <option value={45}>45 minutes</option>
                          <option value={50}>50 minutes</option>
                          <option value={60}>1 hour</option>
                          <option value={90}>1.5 hours</option>
                          <option value={120}>2 hours</option>
                        </select>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                          Duration of Session
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-8 flex justify-between w-full">
                <Button
                  onPress={() => setActiveTab("basic")}
                  classoverride="bg-zinc-100 text-zinc-800 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-white dark:hover:bg-zinc-600"
                >
                  Back
                </Button>
                <Button
                  onPress={() => setActiveTab("statuses")}
                  classoverride="bg-primary text-white hover:bg-primary/90 dark:bg-primary dark:text-white dark:hover:bg-primary/90"
                >
                  Continue to Statuses
                </Button>
              </div>
            </div>
          )}

          {/* Statuses */}
          {activeTab === "statuses" && (
            <div className="p-6">
              <div className="flex items-start mb-6">
                <div className="bg-primary/10 p-2 rounded-lg mr-4">
                  <IconClipboardList className="text-primary" size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-semibold dark:text-white">
                    Session Statuses
                  </h2>
                  <p className="text-zinc-500 dark:text-zinc-400 mt-1">
                    Define status updates that occur during a session
                  </p>
                </div>
              </div>

              <div className="max-w-2xl">
                <div className="flex justify-between items-center mb-4">
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Statuses automatically update after the specified time has
                    passed
                  </p>
                  <Button
                    onPress={newStatus}
                    compact
                    classoverride="bg-primary text-white hover:bg-primary/90 dark:bg-primary dark:text-white dark:hover:bg-primary/90 flex items-center gap-1"
                  >
                    <IconPlus size={16} /> Add Status
                  </Button>
                </div>

                {statues.length === 0 ? (
                  <div className="text-center py-10 bg-zinc-50 dark:bg-zinc-700/30 rounded-lg border border-dashed border-gray-300 dark:border-zinc-600">
                    <IconClipboardList
                      className="mx-auto text-zinc-400 dark:text-zinc-500"
                      size={32}
                    />
                    <p className="text-zinc-500 dark:text-zinc-400 mt-2">
                      No statuses added yet
                    </p>
                    <p className="text-sm text-zinc-400 dark:text-zinc-500 mt-1 max-w-xs mx-auto">
                      Add statuses to track session progress (e.g., "Starting
                      Soon", "In Progress", "Completed")
                    </p>
                    <Button
                      onPress={newStatus}
                      classoverride="bg-primary text-white hover:bg-primary/90 dark:bg-primary dark:text-white dark:hover:bg-primary/90 mt-4 flex items-center gap-1 mx-auto"
                    >
                      <IconPlus size={16} /> Add Your First Status
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {statues.map((status, index) => (
                      <div
                        key={status.id}
                        className="border border-gray-200 dark:border-zinc-700 rounded-lg p-4 bg-white dark:bg-zinc-800 shadow-sm"
                      >
                        <Status
                          updateStatus={(value, mins, color) =>
                            updateStatus(status.id, value, color, mins)
                          }
                          deleteStatus={() => deleteStatus(status.id)}
                          data={status}
                          index={index + 1}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-8 flex justify-between w-full">
                <Button
                  onPress={() => setActiveTab("scheduling")}
                  classoverride="bg-zinc-100 text-zinc-800 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-white dark:hover:bg-zinc-600"
                >
                  Back
                </Button>
                <Button
                  onPress={() => setActiveTab("slots")}
                  classoverride="bg-primary text-white hover:bg-primary/90 dark:bg-primary dark:text-white dark:hover:bg-primary/90"
                >
                  Continue to Slots
                </Button>
              </div>
            </div>
          )}

          {/* Slots */}
          {activeTab === "slots" && (
            <div className="p-6">
              <div className="flex items-start mb-6">
                <div className="bg-primary/10 p-2 rounded-lg mr-4">
                  <IconUserPlus className="text-primary" size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-semibold dark:text-white">
                    Session Slots
                  </h2>
                  <p className="text-zinc-500 dark:text-zinc-400 mt-1">
                    Define roles and how many people can claim each role
                  </p>
                </div>
              </div>

              <div className="max-w-2xl">
                <div className="flex justify-between items-center mb-4">
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Each session has one Host by default. Add additional roles
                    below.
                  </p>
                  <Button
                    onPress={newSlot}
                    compact
                    classoverride="bg-primary text-white hover:bg-primary/90 dark:bg-primary dark:text-white dark:hover:bg-primary/90 flex items-center gap-1"
                  >
                    <IconPlus size={16} /> Add Slot
                  </Button>
                </div>

                <div className="space-y-4">
                  <div className="border-2 border-primary/20 rounded-lg p-4 bg-primary/5 dark:bg-primary/10">
                    <Slot
                      updateStatus={() => {}}
                      isPrimary
                      deleteStatus={() => {}}
                      data={{
                        name: "Host",
                        slots: 1,
                      }}
                    />
                  </div>

                  {slots.map((slot, index) => (
                    <div
                      key={slot.id}
                      className="border border-gray-200 dark:border-zinc-700 rounded-lg p-4 bg-white dark:bg-zinc-800 shadow-sm"
                    >
                      <Slot
                        updateStatus={(name, openSlots) =>
                          updateSlot(slot.id, name, openSlots)
                        }
                        deleteStatus={() => deleteSlot(slot.id)}
                        data={slot}
                        index={index + 1}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8 flex justify-between w-full">
                <Button
                  onPress={() => setActiveTab("statuses")}
                  classoverride="bg-zinc-100 text-zinc-800 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-white dark:hover:bg-zinc-600"
                >
                  Back
                </Button>
                <Button
                  onPress={form.handleSubmit(createSession)}
                  disabled={isSubmitting || !isFormValid()}
                  classoverride={`flex items-center gap-1 ${
                    isFormValid()
                      ? "bg-primary text-white hover:bg-primary/90 dark:bg-primary dark:text-white dark:hover:bg-primary/90"
                      : "bg-zinc-300 text-zinc-500 cursor-not-allowed dark:bg-zinc-700 dark:text-zinc-400"
                  }`}
                >
                  <IconDeviceFloppy size={16} />{" "}
                  {isSubmitting ? "Creating..." : "Create Session"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </FormProvider>

      <Transition appear show={showOverlapModal} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50"
          onClose={handleOverlapCancel}
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
            <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
          </Transition.Child>

          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="mx-auto max-w-md rounded-lg bg-white dark:bg-zinc-800 p-6 shadow-xl">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <IconAlertCircle
                      className="h-6 w-6 text-orange-400"
                      aria-hidden="true"
                    />
                  </div>
                  <div className="ml-3 w-0 flex-1">
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-medium text-zinc-900 dark:text-white"
                    >
                      Session Overlap Detected
                    </Dialog.Title>
                    <div className="mt-2">
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 whitespace-pre-line">
                        {overlapMessage}
                      </p>
                    </div>
                    {overlapError && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/20 dark:border-red-800">
                        <p className="text-sm text-red-600 dark:text-red-300">
                          {overlapError}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-6 flex gap-3">
                  <button
                    type="button"
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleOverlapCancel}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleOverlapConfirm}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Creating..." : "Create Anyway"}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
};

Home.layout = Workspace;

const Status: React.FC<{
  data: any;
  updateStatus: (value: string, minutes: number, color: string) => void;
  deleteStatus: () => void;
  index?: number;
}> = ({ updateStatus, deleteStatus, data, index }) => {
  const methods = useForm<{
    minutes: number;
    value: string;
  }>({
    defaultValues: {
      value: data.name,
      minutes: data.timeAfter,
    },
  });
  const { register, watch } = methods;

  useEffect(() => {
    const subscription = methods.watch((value) => {
      updateStatus(
        methods.getValues().value,
        Number(methods.getValues().minutes),
        "green"
      );
    });
    return () => subscription.unsubscribe();
  }, [methods, updateStatus]);

  return (
    <FormProvider {...methods}>
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center">
          {index !== undefined && (
            <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium mr-2">
              {index}
            </span>
          )}
          <h3 className="font-medium dark:text-white">
            {watch("value") || "New Status"}
          </h3>
        </div>
        <Button
          onPress={deleteStatus}
          compact
          classoverride="bg-red-500 text-white hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 flex items-center gap-1"
        >
          <IconTrash size={16} /> Delete
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          {...register("value")}
          label="Status Name"
          placeholder="In Progress"
        />
        <Input
          {...register("minutes")}
          label="Time After (minutes)"
          type="number"
          placeholder="15"
        />
        <p className="text-xs text-zinc-500 dark:text-zinc-400 md:col-span-2">
          Status will activate {watch("minutes") || 0} minutes after session
          starts
        </p>
      </div>
    </FormProvider>
  );
};

const Slot: React.FC<{
  data: any;
  updateStatus: (value: string, slots: number) => void;
  deleteStatus: () => void;
  isPrimary?: boolean;
  index?: number;
}> = ({ updateStatus, deleteStatus, isPrimary, data, index }) => {
  const methods = useForm<{
    slots: number;
    value: string;
  }>({
    defaultValues: {
      value: data.name,
      slots: data.slots,
    },
  });
  const { register, watch } = methods;

  useEffect(() => {
    const subscription = methods.watch((value) => {
      updateStatus(
        methods.getValues().value,
        Number(methods.getValues().slots)
      );
    });
    return () => subscription.unsubscribe();
  }, [methods, updateStatus]);

  return (
    <FormProvider {...methods}>
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center">
          {index !== undefined && !isPrimary && (
            <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium mr-2">
              {index}
            </span>
          )}
          <h3 className="font-medium dark:text-white">
            {isPrimary ? "Host (Primary)" : watch("value") || "New Slot"}
          </h3>
        </div>
        {!isPrimary && (
          <Button
            onPress={deleteStatus}
            compact
            classoverride="bg-red-500 text-white hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 flex items-center gap-1"
          >
            <IconTrash size={16} /> Delete
          </Button>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          {...register("value")}
          disabled={isPrimary}
          label="Role Name"
          placeholder="Co-Host"
        />
        <Input
          {...register("slots")}
          disabled={isPrimary}
          label="Available Slots"
          type="number"
          placeholder="2"
        />
        <p className="text-xs text-zinc-500 dark:text-zinc-400 md:col-span-2">
          {isPrimary
            ? "Primary host role cannot be changed"
            : `Number of people who can claim this role: ${
                watch("slots") || 0
              }`}
        </p>
      </div>
    </FormProvider>
  );
};

export default Home;
