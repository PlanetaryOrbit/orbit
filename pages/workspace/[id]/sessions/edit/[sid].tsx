import type React from "react";
import type { pageWithLayout } from "@/layoutTypes";
import { loginState, workspacestate } from "@/state";
import Button from "@/components/button";
import Input from "@/components/input";
import Workspace from "@/layouts/workspace";
import { useRecoilState } from "recoil";
import { useEffect, useState } from "react";
import {
  IconArrowLeft,
  IconDeviceFloppy,
  IconTrash,
  IconPlus,
  IconAlertCircle,
  IconUserPlus,
  IconInfoCircle,
  IconCalendarEvent,
  IconClipboardList,
} from "@tabler/icons-react";
import { withPermissionCheckSsr } from "@/utils/permissionsManager";
import { useRouter } from "next/router";
import axios from "axios";
import prisma from "@/utils/database";
import { useForm, FormProvider } from "react-hook-form";
import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import toast, { Toaster } from "react-hot-toast";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";

const BG_COLORS = [
  "bg-red-200",
  "bg-green-200",
  "bg-emerald-200",
  "bg-red-300",
  "bg-green-300",
  "bg-emerald-300",
  "bg-amber-200",
  "bg-yellow-200",
  "bg-red-100",
  "bg-green-100",
  "bg-lime-200",
  "bg-rose-200",
  "bg-amber-300",
  "bg-teal-200",
  "bg-lime-300",
  "bg-rose-300",
];

function getRandomBg(userid: string, username?: string) {
  const key = `${userid ?? ""}:${username ?? ""}`;
  let hash = 5381;
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) - hash) ^ key.charCodeAt(i);
  }
  const index = (hash >>> 0) % BG_COLORS.length;
  return BG_COLORS[index];
}


export const getServerSideProps: GetServerSideProps = withPermissionCheckSsr(
  async (context) => {
    const { id, sid } = context.query;

    try {
      const session = await prisma.session.findUnique({
        where: {
          id: sid as string,
        },
        include: {
          sessionType: {
            include: {
              hostingRoles: true,
            },
          },
          owner: true,
          users: {
            include: {
              user: true,
            },
          },
        },
      });

      if (!session) {
        return {
          notFound: true,
        };
      }

      if (session.sessionType.workspaceGroupId !== Number(id)) {
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
          session: JSON.parse(
            JSON.stringify(session, (key, value) =>
              typeof value === "bigint" ? value.toString() : value
            )
          ),
          roles: JSON.parse(
            JSON.stringify(roles, (key, value) =>
              typeof value === "bigint" ? value.toString() : value
            )
          ),
        },
      };
    } catch (error) {
      console.error("Error fetching session:", error);
      return {
        notFound: true,
      };
    }
  },
  "manage_sessions"
);

const EditSession: pageWithLayout<
  InferGetServerSidePropsType<GetServerSideProps>
> = ({ session, roles }) => {
  const [login, setLogin] = useRecoilState(loginState);
  const [workspace, setWorkspace] = useRecoilState(workspacestate);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteAll, setDeleteAll] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateAll, setUpdateAll] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");

  const tabs = [
    { id: "basic", label: "Basic", icon: <IconInfoCircle size={18} /> },
    { id: "scheduling", label: "Scheduling", icon: <IconCalendarEvent size={18} /> },
    { id: "statuses", label: "Statuses", icon: <IconClipboardList size={18} /> },
    { id: "slots", label: "Slots", icon: <IconUserPlus size={18} /> },
  ];

  const goToSection = (id: string) => {
    setActiveTab(id);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const form = useForm({
    mode: "onChange",
    defaultValues: (() => {
      const utcDate = new Date(session.date);
      const localDate = new Date(utcDate.getTime());
      const year = localDate.getFullYear();
      const month = String(localDate.getMonth() + 1).padStart(2, "0");
      const day = String(localDate.getDate()).padStart(2, "0");
      const hours = String(localDate.getHours()).padStart(2, "0");
      const minutes = String(localDate.getMinutes()).padStart(2, "0");
      const dateOnly = `${year}-${month}-${day}`;
      const timeOnly = `${hours}:${minutes}`;

      return {
        name: session.name || session.sessionType?.name || "",
        description: session.sessionType?.description || "",
        date: dateOnly,
        time: timeOnly,
        duration: session.duration || 30,
        gameId: (session as any).gameId || session.sessionType?.gameId || "",
      };
    })(),
  });

  const [statues, setStatues] = useState<{
    name: string;
    timeAfter: number;
    color: string;
    id: string;
  }[]>(() => (session.sessionType?.statues ? session.sessionType.statues : []));

  const newStatus = () => {
    setStatues((prev) => [
      ...prev,
      {
        name: "New status",
        timeAfter: 0,
        color: "green",
        id: `${Date.now()}-${Math.random()}`,
      },
    ]);
  };

  const deleteStatus = (id: string) => {
    setStatues((prev) => prev.filter((status) => status.id !== id));
  };

  const updateStatus = (id: string, name: string, color: string, timeafter: number) => {
    setStatues((prev) => prev.map((status) => (status.id === id ? { ...status, name, color, timeAfter: timeafter } : status)));
  };

  const router = useRouter();
  const { scope } = router.query; // Get the scope from query params (single, future, all)

  const capitalize = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

  const sessionTypeLabel = (() => {
    if (typeof session.type === "string" && !/^[0-9]+$/.test(session.type)) return capitalize(session.type);
  })();

  useEffect(() => {
    const loadWorkspaceUsers = async () => {
      try {
        const response = await axios.get(
          `/api/workspace/${router.query.id}/users`
        );
        setAvailableUsers(response.data);
      } catch (error) {
        console.error("Failed to load workspace users:", error);
      }
    };
    loadWorkspaceUsers();
  }, [router.query.id]);

  const updateSession = async (applyToAll = false) => {
    setIsSubmitting(true);
    setFormError("");

    try {
      const formData = form.getValues();
      const datePart = formData.date;
      const timePart = formData.time || "00:00";
      const localDateTime = `${datePart}T${timePart}`;
      const newDate = new Date(localDateTime);

      // Prevent updating a session to a past date/time
      if (newDate.getTime() <= Date.now()) {
        setFormError("Cannot set session date/time in the past. Choose a future date/time.");
        setIsSubmitting(false);
        setShowUpdateModal(false);
        setUpdateAll(false);
        return;
      }

      const [dateStr, timeStr] = localDateTime.split("T");

      // If we have a scope from the pattern dialog, use the pattern update API
      if (scope && session.scheduleId) {
        await axios.post(
          `/api/workspace/${workspace.groupId}/sessions/${session.id}/update-pattern`,
          {
            updateScope: scope, // "single", "future", or "all"
            newDate: dateStr,
            newTime: timeStr,
            newDuration: formData.duration,
            newName: formData.name,
          }
        );
        
        toast.success(
          scope === "single" 
            ? "Session updated successfully"
            : scope === "future"
            ? "This and future sessions updated successfully"
            : "All sessions in pattern updated successfully"
        );
      } else {
        // Use the original update API for non-pattern sessions
        await axios.put(
          `/api/workspace/${workspace.groupId}/sessions/manage/${session.id}/manage`,
          {
            name: formData.name,
            gameId: formData.gameId,
            date: dateStr,
            time: timeStr,
            description: formData.description,
            duration: formData.duration,
            statues: statues,
            updateAll: applyToAll,
            timezoneOffset: new Date().getTimezoneOffset(),
          }
        );

        toast.success("Session updated successfully");
      }
      
      router.push(`/workspace/${workspace.groupId}/sessions`);
    } catch (err: any) {
      setFormError(
        err?.response?.data?.error ||
          err?.message ||
          "Failed to update session. Please try again."
      );
    } finally {
      setIsSubmitting(false);
      setShowUpdateModal(false);
      setUpdateAll(false);
    }
  };

  const handleSaveClick = () => {
    // If scope is already provided from the pattern dialog, just save directly
    if (scope) {
      updateSession(false);
    } else {
      // Check if this is a series session and show the modal
      const isSeriesSession = session.scheduleId !== null;
      if (isSeriesSession) {
        setShowUpdateModal(true);
      } else {
        updateSession(false);
      }
    }
  };

  const deleteSession = async () => {
    setIsSubmitting(true);
    try {
      // If we have a scope from the pattern dialog, use it instead of asking again
      const deleteScope = scope || (deleteAll ? "all" : "single");
      
      await axios.delete(
        `/api/workspace/${workspace.groupId}/sessions/${session.id}/delete`,
        {
          data: { 
            deleteAll: deleteScope === "all",
            deleteScope: deleteScope, // Pass the scope for future/single distinction
          },
        }
      );
      
      const successMessage = deleteScope === "single" 
        ? "Session deleted successfully"
        : deleteScope === "future"
        ? "This and future sessions deleted successfully"
        : "All sessions in series deleted successfully";
      
      toast.success(successMessage);
      router.push(`/workspace/${workspace.groupId}/sessions`);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to delete session");
    } finally {
      setIsSubmitting(false);
      setShowDeleteModal(false);
      setDeleteAll(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <Toaster position="bottom-center" />
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
              Edit Session
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 mt-1">
              Modify session details and participant assignments
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onPress={() => {
              // If scope is already set from pattern dialog, delete directly without asking
              if (scope) {
                deleteSession();
              } else {
                setShowDeleteModal(true);
              }
            }}
            disabled={isSubmitting}
            classoverride="bg-red-500 text-white hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 flex items-center gap-1"
          >
            <IconTrash size={16} /> Delete
          </Button>

          <Button
            onPress={form.handleSubmit(handleSaveClick)}
            disabled={isSubmitting}
            classoverride="bg-primary text-white hover:bg-primary/90 dark:bg-primary dark:text-white dark:hover:bg-primary/90 flex items-center gap-1"
          >
            <IconDeviceFloppy size={16} />{" "}
            {isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

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

      {scope && session.scheduleId && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3 dark:bg-blue-900/20 dark:border-blue-800">
          <IconInfoCircle
            className="text-blue-500 mt-0.5 flex-shrink-0"
            size={18}
          />
          <div>
            <h3 className="font-medium text-blue-800 dark:text-blue-400">
              Pattern Edit Mode
            </h3>
            <p className="text-blue-600 dark:text-blue-300 text-sm">
              {scope === "single" && "Changes will only affect this session."}
              {scope === "future" && "Changes will affect this and all future sessions on the same day of the week."}
              {scope === "all" && "Changes will affect all sessions in this recurring pattern."}
            </p>
          </div>
        </div>
      )}

      <div className="mb-6 overflow-x-auto">
        <div className="flex space-x-1 min-w-max border-b border-gray-200 dark:border-zinc-700">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => goToSection(tab.id)}
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
          {activeTab === "basic" && (
            <div className="p-6" id="basic">
              <div className="space-y-6 max-w-2xl">
                <div>
                  <Input
                    {...form.register("name", {
                      required: { value: true, message: "Session name is required" },
                    })}
                    label="Session Name"
                    placeholder="Weekly Training Session"
                  />
                  {form.formState.errors.name && (
                    <p className="mt-1 text-sm text-red-500">{form.formState.errors.name.message as string}</p>
                  )}
                </div>
                <div>
                  <Input {...form.register("description")} label="Description" textarea placeholder="Describe what this session is about..." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Session Type</label>
                  <div className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-md shadow-sm bg-white dark:bg-zinc-700 text-zinc-700 dark:text-white">
                    {sessionTypeLabel}
                  </div>
                </div>
                <div>
                  <Input {...form.register("gameId")} label="Game ID" placeholder="Optional game ID" />
                </div>
                <div className="mt-8 flex justify-end">
                  <Button onPress={() => setActiveTab("scheduling")} classoverride="bg-primary text-white hover:bg-primary/90 dark:bg-primary dark:text-white dark:hover:bg-primary/90">Continue to Scheduling</Button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "scheduling" && (
            <div className="p-6" id="scheduling">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Session Date</label>
                  <input
                    type="date"
                    {...form.register("date", { required: { value: true, message: "Session date is required" } })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg shadow-sm focus:ring-primary focus:border-primary dark:bg-zinc-700 dark:text-white"
                  />
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Enter date in your local timezone.</p>
                  {form.formState.errors.date && <p className="mt-1 text-sm text-red-500">{form.formState.errors.date.message as string}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Session Time</label>
                  <input
                    type="time"
                    {...form.register("time", { required: { value: true, message: "Session time is required" } })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg shadow-sm focus:ring-primary focus:border-primary dark:bg-zinc-700 dark:text-white"
                  />
                  {form.formState.errors.time && <p className="mt-1 text-sm text-red-500">{form.formState.errors.time.message as string}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Session Length</label>
                  <select {...form.register("duration", { required: { value: true, message: "Duration is required" }, valueAsNumber: true })} className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg shadow-sm focus:ring-primary focus:border-primary dark:bg-zinc-700 dark:text-white">
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
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Length of session</p>
                  {form.formState.errors.duration && <p className="mt-1 text-sm text-red-500">{form.formState.errors.duration.message as string}</p>}
                </div>
              </div>

              <div className="mt-8 flex justify-between w-full">
                <Button onPress={() => setActiveTab("basic")} classoverride="bg-zinc-100 text-zinc-800 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-white dark:hover:bg-zinc-600">Back</Button>
                <Button onPress={() => setActiveTab("statuses")} classoverride="bg-primary text-white hover:bg-primary/90 dark:bg-primary dark:text-white dark:hover:bg-primary/90">Continue to Statuses</Button>
              </div>
            </div>
          )}

          {activeTab === "statuses" && (
            <div className="p-6" id="statuses">
              <div className="flex items-start mb-6">
                <div className="bg-primary/10 p-2 rounded-lg mr-4">
                  <IconClipboardList className="text-primary" size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-semibold dark:text-white">Session Statuses</h2>
                  <p className="text-zinc-500 dark:text-zinc-400 mt-1">Define status updates that occur during a session</p>
                </div>
              </div>

              <div className="max-w-2xl">
                <div className="flex justify-between items-center mb-4">
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">Statuses automatically update after the specified time has passed</p>
                  <Button onPress={newStatus} compact classoverride="bg-primary text-white hover:bg-primary/90 dark:bg-primary dark:text-white dark:hover:bg-primary/90 flex items-center gap-1"><IconPlus size={16} /> Add Status</Button>
                </div>

                {statues.length === 0 ? (
                  <div className="text-center py-10 bg-zinc-50 dark:bg-zinc-700/30 rounded-lg border border-dashed border-gray-300 dark:border-zinc-600">
                    <IconClipboardList className="mx-auto text-zinc-400 dark:text-zinc-500" size={32} />
                    <p className="text-zinc-500 dark:text-zinc-400 mt-2">No statuses added yet</p>
                    <p className="text-sm text-zinc-400 dark:text-zinc-500 mt-1 max-w-xs mx-auto">Add statuses to track session progress (e.g., "Starting Soon", "In Progress", "Completed")</p>
                    <Button onPress={newStatus} classoverride="bg-primary text-white hover:bg-primary/90 dark:bg-primary dark:text-white dark:hover:bg-primary/90 mt-4 flex items-center gap-1 mx-auto"><IconPlus size={16} /> Add Your First Status</Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {statues.map((status, index) => (
                      <div key={status.id} className="border border-gray-200 dark:border-zinc-700 rounded-lg p-4 bg-white dark:bg-zinc-800 shadow-sm">
                        <Status updateStatus={(value, mins, color) => updateStatus(status.id, value, color, mins)} deleteStatus={() => deleteStatus(status.id)} data={status} index={index + 1} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-8 flex justify-between w-full">
                <Button onPress={() => setActiveTab("scheduling")} classoverride="bg-zinc-100 text-zinc-800 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-white dark:hover:bg-zinc-600">Back</Button>
                <Button onPress={() => setActiveTab("slots")} classoverride="bg-primary text-white hover:bg-primary/90 dark:bg-primary dark:text-white dark:hover:bg-primary/90">Continue to Slots</Button>
              </div>
            </div>
          )}

          {activeTab === "slots" && (
            <div className="p-6" id="slots">
              <h2 className="text-xl font-semibold dark:text-white mb-4">Session Slots (Read-Only)</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">Define roles and how many people can claim each role</p>

              <div className="bg-zinc-50 dark:bg-zinc-700/30 rounded-lg p-4 mb-4">
                <h4 className="text-sm font-medium text-zinc-900 dark:text-white mb-3">Host</h4>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-zinc-600 dark:text-zinc-400 w-16">Slot 1:</span>
                  <div className="flex-1 px-3 py-2 text-sm bg-white dark:bg-zinc-700 border border-gray-300 dark:border-zinc-600 rounded-md flex items-center gap-2">
                    {session.owner?.username ? (
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${getRandomBg(session.owner.userid?.toString(), session.owner.username)}`}>
                        <img src={session.owner.picture || "/default-avatar.jpg"} alt={session.owner.username} className="w-6 h-6 rounded-full object-cover border border-white" onError={(e) => { e.currentTarget.src = "/default-avatar.jpg"; }} />
                      </div>
                    ) : null}
                    <span className="text-zinc-700 dark:text-white">{session.owner?.username || "Unclaimed"}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4 max-w-2xl">
                {session.sessionType.slots && Array.isArray(session.sessionType.slots) && session.sessionType.slots.length > 0 ? (
                  session.sessionType.slots.map((slot: any, slotIndex: number) => {
                    if (typeof slot !== "object") return null;
                    const slotData = JSON.parse(JSON.stringify(slot));
                    return (
                      <div key={slotIndex} className="bg-zinc-50 dark:bg-zinc-700/30 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-zinc-900 dark:text-white mb-3">{slotData.name}</h4>
                        <div className="space-y-2">
                          {Array.from(Array(slotData.slots)).map((_, i) => {
                            const assignedUser = session.users?.find((u: any) => u.roleID === slotData.id && u.slot === i);
                            const username = assignedUser ? availableUsers.find((user: any) => user.userid === assignedUser.userid.toString())?.username : null;
                            const userPicture = assignedUser ? availableUsers.find((user: any) => user.userid === assignedUser.userid.toString())?.picture : null;
                            return (
                              <div key={i} className="flex items-center gap-2">
                                <span className="text-sm text-zinc-600 dark:text-zinc-400 w-16">Slot {i + 1}:</span>
                                <div className="flex-1 px-3 py-2 text-sm bg-white dark:bg-zinc-700 border border-gray-300 dark:border-zinc-600 rounded-md flex items-center gap-2">
                                  {username ? (
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${getRandomBg(assignedUser.userid.toString(), username)}`}>
                                      <img src={userPicture || "/default-avatar.jpg"} alt={username} className="w-6 h-6 rounded-full object-cover border border-white" onError={(e) => { e.currentTarget.src = "/default-avatar.jpg"; }} />
                                    </div>
                                  ) : null}
                                  <span className="text-zinc-700 dark:text-white">{username || "Unclaimed"}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-sm text-zinc-500 dark:text-zinc-400">No slots defined for this session type</div>
                )}
              </div>
              <div className="mt-8 flex justify-between w-full">
                <Button onPress={() => setActiveTab("statuses")} classoverride="bg-zinc-100 text-zinc-800 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-white dark:hover:bg-zinc-600">Back</Button>
                <Button onPress={form.handleSubmit(handleSaveClick)} classoverride="bg-primary text-white hover:bg-primary/90 dark:bg-primary dark:text-white dark:hover:bg-primary/90">{isSubmitting ? "Saving..." : "Save Changes"}</Button>
              </div>
            </div>
          )}
        </div>
      </FormProvider>

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4 text-center">
              Confirm Deletion
            </h2>

            {session.scheduleId ? (
              <div className="space-y-4">
                <p className="text-sm text-zinc-600 dark:text-zinc-300 text-center">
                  This is part of a recurring session series. What would you
                  like to delete?
                </p>

                <div className="space-y-3">
                  <label className="flex items-start gap-3 p-3 border border-gray-200 dark:border-zinc-600 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700/30 cursor-pointer">
                    <input
                      type="radio"
                      name="deleteOption"
                      checked={!deleteAll}
                      onChange={() => setDeleteAll(false)}
                      className="mt-0.5 text-primary focus:ring-primary"
                    />
                    <div>
                      <div className="font-medium text-zinc-900 dark:text-white">
                        Delete only this session
                      </div>
                      <div className="text-sm text-zinc-500 dark:text-zinc-400">
                        Remove just this single occurrence on{" "}
                        {new Date(session.date).toLocaleDateString()}
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 border border-gray-200 dark:border-zinc-600 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700/30 cursor-pointer">
                    <input
                      type="radio"
                      name="deleteOption"
                      checked={deleteAll}
                      onChange={() => setDeleteAll(true)}
                      className="mt-0.5 text-primary focus:ring-primary"
                    />
                    <div>
                      <div className="font-medium text-zinc-900 dark:text-white">
                        Delete entire series
                      </div>
                      <div className="text-sm text-zinc-500 dark:text-zinc-400">
                        Remove all sessions in this recurring series
                      </div>
                    </div>
                  </label>
                </div>

                <div className="flex justify-center gap-4 pt-4">
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setDeleteAll(false);
                    }}
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-600 text-zinc-800 dark:text-white disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={deleteSession}
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 min-w-[100px]"
                  >
                    {isSubmitting
                      ? "Deleting..."
                      : deleteAll
                      ? "Delete Series"
                      : "Delete Session"}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm text-zinc-600 dark:text-zinc-300 mb-6 text-center">
                  Are you sure you want to delete this session? This action
                  cannot be undone.
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
                    {isSubmitting ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showUpdateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4 text-center">
              Update Session Series
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-300 mb-6 text-center">
              This session is part of a recurring series. How would you like to
              apply these changes?
            </p>

            <div className="space-y-4 mb-6">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="updateScope"
                  checked={!updateAll}
                  onChange={() => setUpdateAll(false)}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium text-zinc-900 dark:text-white">
                    This session only
                  </div>
                  <div className="text-sm text-zinc-500 dark:text-zinc-400">
                    Apply changes to this specific session instance
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="updateScope"
                  checked={updateAll}
                  onChange={() => setUpdateAll(true)}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium text-zinc-900 dark:text-white">
                    All sessions in series
                  </div>
                  <div className="text-sm text-zinc-500 dark:text-zinc-400">
                    Apply changes to all sessions in this recurring series
                  </div>
                </div>
              </label>
            </div>

            <div className="flex justify-center gap-4">
              <button
                onClick={() => {
                  setShowUpdateModal(false);
                  setUpdateAll(false);
                }}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-600 text-zinc-800 dark:text-white disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => updateSession(updateAll)}
                disabled={isSubmitting}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 min-w-[100px]"
              >
                {isSubmitting ? "Updating..." : "Update"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

EditSession.layout = Workspace;

export default EditSession;

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
      updateStatus(methods.getValues().value, Number(methods.getValues().minutes), "green");
    });
    return () => subscription.unsubscribe();
  }, [methods, updateStatus]);

  return (
    <FormProvider {...methods}>
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center">
          {index !== undefined && (
            <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium mr-2">{index}</span>
          )}
          <h3 className="font-medium dark:text-white">{watch("value") || "New Status"}</h3>
        </div>
        <Button onPress={deleteStatus} compact classoverride="bg-red-500 text-white hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 flex items-center gap-1"><IconTrash size={16} /> Delete</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input {...register("value")} label="Status Name" placeholder="In Progress" />
        <Input {...register("minutes")} label="Time After (minutes)" type="number" placeholder="15" />
        <p className="text-xs text-zinc-500 dark:text-zinc-400 md:col-span-2">Status will activate {watch("minutes") || 0} minutes after session starts</p>
      </div>
    </FormProvider>
  );
};
