import type { pageWithLayout } from "@/layoutTypes";
import { loginState, workspacestate } from "@/state";
import Button from "@/components/button";
import toast, { Toaster } from "react-hot-toast";
import Input from "@/components/input";
import Workspace from "@/layouts/workspace";
import { v4 as uuidv4 } from "uuid";
import { useRecoilState } from "recoil";
import { useEffect, useState } from "react";
import { Listbox } from "@headlessui/react";
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

import { useForm, FormProvider } from "react-hook-form";
import { GetServerSideProps, InferGetServerSidePropsType } from "next";

export const getServerSideProps: GetServerSideProps = withPermissionCheckSsr(
  async (context) => {
    const { id, sid } = context.query;
    let games: { name: string; id: number }[] = [];
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
    const session = await prisma.sessionType.findUnique({
      where: {
        id: sid as string,
      },
      include: {
        hostingRoles: true,
      },
    });
    if (!session) {
      return {
        notFound: true,
      };
    }

    const roles = await prisma.role.findMany({
      where: {
        workspaceGroupId: Number(id),
      },
      orderBy: {
        isOwnerRole: "desc",
      },
    });

    return {
      props: {
        games,
        roles,
        session: JSON.parse(
          JSON.stringify(session, (key, value) =>
            typeof value === "bigint" ? value.toString() : value
          )
        ),
        fallbackToManual,
      },
    };
  },
  [
    "sessions_shift_manage",
    "sessions_training_manage",
    "sessions_event_manage",
    "sessions_other_manage"
  ]
);

type StatusType = {
  id: string;
  name: string;
  timeAfter: number;
  color: string;
};

type SlotType = {
  id: string;
  name: string;
  slots: number;
};

const Home: pageWithLayout<InferGetServerSidePropsType<GetServerSideProps>> = ({
  games,
  roles,
  session,
  fallbackToManual,
}) => {
  const [login, setLogin] = useRecoilState(loginState);
  const [activeTab, setActiveTab] = useState("basic");
  const [enabled, setEnabled] = useState(session.schedule?.enabled ?? false);
  const [days, setDays] = useState<string[]>(session.schedule?.days || []);
  const [statues, setStatues] = useState(
    session.statues?.length ? session.statues : []
  );
  const [slots, setSlots] = useState(
    session.slots?.length
      ? session.slots
      : [
          {
            name: "Co-Host",
            slots: 1,
            id: uuidv4(),
          },
        ]
  );
  const form = useForm({
    defaultValues: {
      name: session.name,
      gameId: session.gameId ?? "",
      time: session.schedule?.time || "",
    },
  });
  const [workspace] = useRecoilState(workspacestate);
  const [allowUnscheduled, setAllowUnscheduled] = useState(
    session.allowUnscheduled ?? false
  );
  const [selectedGame, setSelectedGame] = useState(
    session.gameId?.toString() ?? ""
  );
  const [selectedRoles, setSelectedRoles] = useState<string[]>(
    session.hostingRoles.map((role: any) => role.id)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const router = useRouter();

  // Tab navigation
  const tabs = [
    { id: "basic", label: "Basic Info", icon: <IconInfoCircle size={18} /> },
    { id: "permissions", label: "Permissions", icon: <IconUsers size={18} /> },
    {
      id: "statuses",
      label: "Statuses",
      icon: <IconClipboardList size={18} />,
    },
    { id: "slots", label: "Slots", icon: <IconUserPlus size={18} /> },
  ];

  // Role toggle
  const toggleRole = (role: string) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  // Day toggle
  const toggleDay = (day: string) => {
    setDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  // Statuses
  const newStatus = () => {
    setStatues((prev: StatusType[]) => [
      ...prev,
      {
        name: "New status",
        timeAfter: 0,
        color: "green",
        id: uuidv4(),
      } as StatusType,
    ]);
  };
  const deleteStatus = (id: string) => {
    setStatues((prev: StatusType[]) =>
      prev.filter((status: StatusType) => status.id !== id)
    );
  };
  const updateStatus = (
    id: string,
    name: string,
    color: string,
    timeafter: number
  ) => {
    setStatues((prev: StatusType[]) =>
      prev.map((status: StatusType) =>
        status.id === id
          ? { ...status, name, color, timeAfter: timeafter }
          : status
      )
    );
  };

  // Slots
  const newSlot = () => {
    setSlots((prev: SlotType[]) => [
      ...prev,
      {
        name: "Co-Host",
        slots: 1,
        id: uuidv4(),
      } as SlotType,
    ]);
  };
  const deleteSlot = (id: string) => {
    setSlots((prev: SlotType[]) =>
      prev.filter((slot: SlotType) => slot.id !== id)
    );
  };
  const updateSlot = (id: string, name: string, slotsAvailble: number) => {
    setSlots((prev: SlotType[]) =>
      prev.map((slot: SlotType) =>
        slot.id === id ? { ...slot, slots: slotsAvailble, name } : slot
      )
    );
  };

  // Form validation
  const isFormValid = () => {
    if (!form.getValues().name) return false;
    if (fallbackToManual && !form.getValues().gameId) return false;
    if (enabled && !form.getValues().time) return false;
    return true;
  };

  // Update session
  const updateSession = async () => {
    setIsSubmitting(true);
    setFormError("");
    try {
      const time24 = form.getValues().time || "00:00";
      await axios.post(
        `/api/workspace/${workspace.groupId}/sessions/manage/${session.id}/edit`,
        {
          name: form.getValues().name,
          gameId: fallbackToManual ? form.getValues().gameId : selectedGame,
          schedule: {
            enabled,
            days,
            time: time24,
            allowUnscheduled,
          },
          slots,
          statues,
          permissions: selectedRoles,
        }
      );
      toast.success("Session updated");
      router.push(`/workspace/${workspace.groupId}/sessions/schedules`);
    } catch (err: any) {
      setFormError(
        err?.response?.data?.error ||
          "Failed to update session. Please try again."
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteSession = async () => {
    setIsSubmitting(true);
    try {
      const isRecurring =
        session.schedule?.enabled && session.schedule?.days?.length > 0;

      if (isRecurring) {
        await axios.delete(
          `/api/workspace/${workspace.groupId}/sessions/${session.id}/delete?deleteAll=true`
        );
        toast.success("All sessions in series deleted successfully");
      } else {
        await axios.delete(
          `/api/workspace/${workspace.groupId}/sessions/${session.id}/delete`
        );
        toast.success("Session deleted successfully");
      }

      router.push(`/workspace/${workspace.groupId}/sessions`);
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error ||
          "Failed to delete session. Please try again."
      );
    } finally {
      setIsSubmitting(false);
      setShowDeleteModal(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold dark:text-white">
            Edit Session Type
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">
            Update your session type settings
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onPress={() => router.back()}
            classoverride="bg-zinc-100 text-zinc-800 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-white dark:hover:bg-zinc-600 flex items-center gap-1"
          >
            <IconArrowLeft size={16} /> Back
          </Button>
          <Button
            onPress={() => setShowDeleteModal(true)}
            classoverride="bg-red-500 text-white hover:bg-red-600 flex items-center gap-1"
          >
            <IconTrash size={16} /> Delete
          </Button>
          <Button
            onPress={form.handleSubmit(updateSession)}
            disabled={isSubmitting || !isFormValid()}
            classoverride={`flex items-center gap-1 ${
              isFormValid()
                ? "bg-primary text-white hover:bg-primary/90 dark:bg-primary dark:text-white dark:hover:bg-primary/90"
                : "bg-zinc-300 text-zinc-500 cursor-not-allowed dark:bg-zinc-700 dark:text-zinc-400"
            }`}
          >
            <IconDeviceFloppy size={16} />{" "}
            {isSubmitting ? "Updating..." : "Update Session"}
          </Button>
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
                    Edit the essential details about your session type
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
                    label="Session Type Name"
                    placeholder="Weekly Session"
                  />
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    Choose a descriptive name for your session type
                  </p>
                  {form.formState.errors.name && (
                    <p className="mt-1 text-sm text-red-500">
                      {form.formState.errors.name.message as string}
                    </p>
                  )}
                </div>
                {games.length > 0 && !fallbackToManual ? (
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
                      Select the game where this session will repeat
                    </p>
                  </div>
                ) : (
                  <div>
                    <Input
                      {...form.register("gameId", {
                        required: {
                          value: true,
                          message:
                            "Game ID is required when games cannot be fetched",
                        },
                        pattern: {
                          value: /^[0-9]+$/,
                          message: "Invalid Game ID format",
                        },
                      })}
                      label="Universe ID"
                      placeholder="Enter your universe ID"
                    />
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                      Enter the Roblox universe ID where this session will take
                      place
                    </p>
                    {form.formState.errors.gameId && (
                      <p className="mt-1 text-sm text-red-500">
                        {form.formState.errors.gameId.message as string}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Permissions */}
          {activeTab === "permissions" && (
            <div className="p-6">
              <div className="flex items-start mb-6">
                <div className="bg-primary/10 p-2 rounded-lg mr-4">
                  <IconUsers className="text-primary" size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-semibold dark:text-white">
                    Permissions
                  </h2>
                  <p className="text-zinc-500 dark:text-zinc-400 mt-1">
                    Control which roles can host and claim these sessions
                  </p>
                </div>
              </div>
              <div className="max-w-2xl">
                <div className="p-4 bg-white dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-zinc-700">
                  <h3 className="text-md font-medium dark:text-white mb-3">
                    Roles that can host/claim sessions
                  </h3>
                  {roles.length > 0 ? (
                    <div className="space-y-2 max-h-60 overflow-y-auto p-2">
                      {roles.map((role: any) => (
                        <div
                          key={role.id}
                          className={`flex items-center p-2 rounded-md ${
                            selectedRoles.includes(role.id)
                              ? "bg-primary/10 border border-primary/30"
                              : "hover:bg-zinc-50 dark:hover:bg-zinc-700"
                          }`}
                        >
                          <input
                            id={`role-${role.id}`}
                            type="checkbox"
                            checked={selectedRoles.includes(role.id)}
                            onChange={() => toggleRole(role.id)}
                            className="w-4 h-4 text-primary bg-zinc-100 rounded border-gray-300 focus:ring-primary dark:focus:ring-primary dark:ring-offset-gray-800 focus:ring-2 dark:bg-zinc-700 dark:border-zinc-600"
                          />
                          <label
                            htmlFor={`role-${role.id}`}
                            className="ml-2 text-sm font-medium text-zinc-900 dark:text-zinc-300 cursor-pointer w-full"
                          >
                            {role.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-zinc-50 dark:bg-zinc-700/30 rounded-lg">
                      <p className="text-zinc-500 dark:text-zinc-400">
                        No roles available
                      </p>
                      <p className="text-sm text-zinc-400 dark:text-zinc-500 mt-1">
                        Create roles in your workspace settings first
                      </p>
                    </div>
                  )}
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-3">
                    {selectedRoles.length === 0
                      ? "No roles selected. Only workspace owners will be able to host sessions."
                      : `${selectedRoles.length} role(s) selected`}
                  </p>
                </div>
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
                    {statues.map((status: StatusType, index: number) => (
                      <div
                        key={status.id}
                        className="border border-gray-200 dark:border-zinc-700 rounded-lg p-4 bg-white dark:bg-zinc-800 shadow-sm"
                      >
                        <Status
                          updateStatus={(
                            value: string,
                            mins: number,
                            color: string
                          ) => updateStatus(status.id, value, color, mins)}
                          deleteStatus={() => deleteStatus(status.id)}
                          data={status}
                          index={index + 1}
                        />
                      </div>
                    ))}
                  </div>
                )}
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
                  {slots.map((slot: SlotType, index: number) => (
                    <div
                      key={slot.id}
                      className="border border-gray-200 dark:border-zinc-700 rounded-lg p-4 bg-white dark:bg-zinc-800 shadow-sm"
                    >
                      <Slot
                        updateStatus={(name: string, openSlots: number) =>
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
            </div>
          )}
        </div>
      </FormProvider>
      <Toaster />

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-xl p-6 w-full max-w-sm text-center">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
              Confirm Deletion
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-300 mb-6">
              {session.schedule?.enabled && session.schedule?.days?.length > 0
                ? "Are you sure you want to delete all sessions in this recurring series? This action cannot be undone."
                : "Are you sure you want to delete this session? This action cannot be undone."}
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-md bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-600 text-zinc-800 dark:text-white disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={deleteSession}
                disabled={isSubmitting}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
              >
                {isSubmitting
                  ? "Deleting..."
                  : session.schedule?.enabled &&
                    session.schedule?.days?.length > 0
                  ? "Delete All"
                  : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
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
  }, [methods.watch]);

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
  }, [methods.watch]);

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
