import React, { useEffect, useState, Fragment } from "react";
import {
  IconUser,
  IconId,
  IconBriefcase,
  IconUserCheck,
  IconClock,
  IconSun,
  IconMoon,
  IconCalendar,
  IconCheck,
  IconX,
  IconPencil,
  IconChevronDown,
} from "@tabler/icons-react";
import axios from "axios";
import { useRouter } from "next/router";
import { Listbox, Transition } from "@headlessui/react";
import toast from "react-hot-toast";
import moment from "moment-timezone";

const BG_COLORS = [
  "bg-rose-300",
  "bg-lime-300",
  "bg-teal-200",
  "bg-amber-300",
  "bg-rose-200",
  "bg-lime-200",
  "bg-green-100",
  "bg-red-100",
  "bg-yellow-200",
  "bg-amber-200",
  "bg-emerald-300",
  "bg-green-300",
  "bg-red-300",
  "bg-emerald-200",
  "bg-green-200",
  "bg-red-200",
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

type InformationTabProps = {
  user: {
    userid: string;
    username: string;
    displayname: string;
    rank?: string | number;
    registered: boolean;
    birthdayDay?: number | null;
    birthdayMonth?: number | null;
    joinDate?: string | null;
  };
  workspaceMember?: {
    departments?: Array<{
      id: string;
      name: string;
      color: string | null;
    }>;
    lineManagerId?: string | null;
    timezone?: string | null;
    discordId?: string | null;
  };
  lineManager?: {
    userid: string;
    username: string;
    picture: string;
  } | null;
  allMembers?: Array<{
    userid: string;
    username: string;
    picture: string;
  }>;
  availableDepartments?: Array<{
    id: string;
    name: string;
    color: string | null;
  }>;
  isUser?: boolean;
  isAdmin?: boolean;
  canEditMembers?: boolean;
};

const monthNames = [
  "",
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const commonTimezones = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Toronto",
  "America/Vancouver",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Madrid",
  "Europe/Rome",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Australia/Sydney",
  "Pacific/Auckland",
];

export function InformationTab({
  user,
  workspaceMember,
  lineManager: initialLineManager,
  allMembers = [],
  availableDepartments = [],
  isUser,
  isAdmin,
  canEditMembers,
}: InformationTabProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [selectedDepartments, setSelectedDepartments] = useState(workspaceMember?.departments || []);
  const [selectedManager, setSelectedManager] = useState(initialLineManager);
  const [selectedTimezone, setSelectedTimezone] = useState(workspaceMember?.timezone || "");
  const [birthdayDay, setBirthdayDay] = useState(user.birthdayDay || "");
  const [birthdayMonth, setBirthdayMonth] = useState(user.birthdayMonth || "");
  const [discordId, setDiscordId] = useState(workspaceMember?.discordId || "");
  const [loading, setLoading] = useState(false);
  const [localTime, setLocalTime] = useState("");
  const [isNight, setIsNight] = useState(false);

  const workspaceId = router.query.id as string;
  const canEdit = isUser || isAdmin || canEditMembers;

  useEffect(() => {
    const updateTime = () => {
      const tz = workspaceMember?.timezone || "UTC";
      const now = moment().tz(tz);
      setLocalTime(now.format("h:mm A"));
      const hour = now.hour();
      setIsNight(hour < 6 || hour >= 18);
    };

    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, [workspaceMember?.timezone]);

  const handleSave = async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      await axios.patch(
        `/api/workspace/${workspaceId}/profile/${user.userid}/member-info`,
        {
          departmentIds: selectedDepartments.map(d => d.id),
          lineManagerId: selectedManager?.userid || null,
          timezone: selectedTimezone || null,
          birthdayDay: birthdayDay ? parseInt(birthdayDay as string) : null,
          birthdayMonth: birthdayMonth ? parseInt(birthdayMonth as string) : null,
          discordId: discordId || null,
        }
      );
      
      toast.success("Information updated!");
      setEditing(false);
      router.replace(router.asPath);
    } catch (e) {
      toast.error("Failed to update information");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setSelectedDepartments(workspaceMember?.departments || []);
    setSelectedManager(initialLineManager);
    setSelectedTimezone(workspaceMember?.timezone || "");
    setBirthdayDay(user.birthdayDay || "");
    setBirthdayMonth(user.birthdayMonth || "");
    setDiscordId(workspaceMember?.discordId || "");
    setEditing(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
        <h3 className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-white">
          Information
        </h3>
        {canEdit && !editing && (
          <button
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
          >
            <IconPencil className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            Edit
          </button>
        )}
        {editing && (
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={handleCancel}
              className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition flex-1 sm:flex-initial"
            >
              <IconX className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg text-white bg-[#ff0099] hover:bg-[#ff0099]/90 transition flex-1 sm:flex-initial"
            >
              <IconCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Save
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-[#ff0099]/10 rounded-lg">
                <IconUser className="w-5 h-5 text-[#ff0099]" />
              </div>
              <div>
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Username
                </p>
                <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                  {user.username}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <IconId className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  User ID
                </p>
                <p className="text-sm font-semibold text-zinc-900 dark:text-white font-mono">
                  {user.userid}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-indigo-500/10 rounded-lg">
                <IconUser className="w-5 h-5 text-indigo-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                  Discord ID
                </p>
                {editing ? (
                  <input
                    type="text"
                    value={discordId}
                    onChange={(e) => setDiscordId(e.target.value)}
                    placeholder="Enter Discord ID"
                    className="w-full px-2 py-1 text-sm rounded-lg bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-600 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#ff0099]/50"
                  />
                ) : (
                  <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                    {workspaceMember?.discordId || "Not linked"}
                  </p>
                )}
              </div>
            </div>
          </div>
          <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-pink-500/10 rounded-lg">
                <IconCalendar className="w-5 h-5 text-pink-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                  Birthday
                </p>
                {editing ? (
                  <div className="flex gap-2">
                    <select
                      value={birthdayMonth}
                      onChange={(e) => setBirthdayMonth(e.target.value)}
                      className="flex-1 px-2 py-1 text-sm rounded-lg bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-600 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#ff0099]/50"
                    >
                      <option value="">Month</option>
                      {monthNames.slice(1).map((month, idx) => (
                        <option key={idx + 1} value={idx + 1}>
                          {month}
                        </option>
                      ))}
                    </select>
                    <select
                      value={birthdayDay}
                      onChange={(e) => setBirthdayDay(e.target.value)}
                      className="flex-1 px-2 py-1 text-sm rounded-lg bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-600 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#ff0099]/50"
                    >
                      <option value="">Day</option>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                        <option key={day} value={day}>
                          {day}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                    {user.birthdayDay && user.birthdayMonth
                      ? `${monthNames[user.birthdayMonth]} ${user.birthdayDay}`
                      : "Not set"}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="space-y-3">
          <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <IconClock className="w-5 h-5 text-purple-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                  Timezone
                </p>
                {editing ? (
                  <Listbox value={selectedTimezone} onChange={setSelectedTimezone}>
                    <div className="relative">
                      <Listbox.Button className="relative w-full cursor-pointer rounded-lg bg-white dark:bg-zinc-900 py-1 pl-2 pr-8 text-left text-sm border border-zinc-300 dark:border-zinc-600">
                        <span className={`block truncate ${selectedTimezone ? 'text-zinc-900 dark:text-white' : 'text-zinc-400 dark:text-zinc-500'}`}>
                          {selectedTimezone || "Select timezone..."}
                        </span>
                      </Listbox.Button>
                      <Transition
                        as={Fragment}
                        leave="transition ease-in duration-100"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                      >
                        <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white dark:bg-zinc-800 py-1 text-sm shadow-lg border border-zinc-200 dark:border-zinc-700">
                          <Listbox.Option
                            value=""
                            className={({ active }) =>
                              `relative cursor-pointer select-none py-2 px-3 ${
                                active ? "bg-[#ff0099]/10 text-[#ff0099]" : "text-zinc-400 dark:text-zinc-500"
                              }`
                            }
                          >
                            Not set
                          </Listbox.Option>
                          {commonTimezones.map((tz) => (
                            <Listbox.Option
                              key={tz}
                              className={({ active }) =>
                                `relative cursor-pointer select-none py-2 px-3 ${
                                  active ? "bg-[#ff0099]/10 text-[#ff0099]" : "text-zinc-900 dark:text-white"
                                }`
                              }
                              value={tz}
                            >
                              {tz}
                            </Listbox.Option>
                          ))}
                        </Listbox.Options>
                      </Transition>
                    </div>
                  </Listbox>
                ) : (
                  <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                    {workspaceMember?.timezone || "Not set"}
                  </p>
                )}
              </div>
            </div>
          </div>
          <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <IconBriefcase className="w-5 h-5 text-emerald-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                  Department{selectedDepartments.length !== 1 ? 's' : ''}
                </p>
                {editing ? (
                  <div className="space-y-2">
                    {availableDepartments.length > 0 ? (
                      <Listbox value={selectedDepartments} onChange={setSelectedDepartments} multiple by="id">
                        <div className="relative">
                          <Listbox.Button className="relative w-full cursor-pointer rounded-lg bg-white dark:bg-zinc-900 py-2 pl-3 pr-10 text-left border border-zinc-300 dark:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-[#ff0099]/50">
                            <span className="block truncate text-zinc-900 dark:text-white">
                              {selectedDepartments.length === 0
                                ? "Select departments..."
                                : selectedDepartments.length === 1
                                ? selectedDepartments[0].name
                                : `${selectedDepartments.length} departments selected`
                              }
                            </span>
                            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                              <IconChevronDown className="h-5 w-5 text-zinc-400" aria-hidden="true" />
                            </span>
                          </Listbox.Button>
                          <Transition
                            as={Fragment}
                            leave="transition ease-in duration-100"
                            leaveFrom="opacity-100"
                            leaveTo="opacity-0"
                          >
                            <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white dark:bg-zinc-800 py-1 text-sm shadow-lg border border-zinc-200 dark:border-zinc-700 focus:outline-none">
                              {availableDepartments.map((dept) => (
                                <Listbox.Option
                                  key={dept.id}
                                  className={({ active }) =>
                                    `relative cursor-pointer select-none py-2 pl-3 pr-9 ${
                                      active ? "bg-[#ff0099]/10 text-[#ff0099]" : "text-zinc-900 dark:text-white"
                                    }`
                                  }
                                  value={dept}
                                >
                                  {({ selected }) => (
                                    <>
                                      <div className="flex items-center gap-2">
                                        <div 
                                          className="w-3 h-3 rounded-full border border-zinc-300 dark:border-zinc-600 flex-shrink-0" 
                                          style={{ backgroundColor: dept.color || "#6b7280" }}
                                        />
                                        <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                                          {dept.name}
                                        </span>
                                      </div>
                                      {selected && (
                                        <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-[#ff0099]">
                                          <IconCheck className="h-5 w-5" aria-hidden="true" />
                                        </span>
                                      )}
                                    </>
                                  )}
                                </Listbox.Option>
                              ))}
                            </Listbox.Options>
                          </Transition>
                        </div>
                      </Listbox>
                    ) : (
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 italic">
                        No departments available.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {selectedDepartments.length > 0 ? (
                      selectedDepartments.map((dept) => (
                        <div key={dept.id} className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full border border-zinc-300 dark:border-zinc-600" 
                            style={{ backgroundColor: dept.color || "#6b7280" }}
                          />
                          <span className="text-sm font-semibold text-zinc-900 dark:text-white">
                            {dept.name}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                        Not assigned
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-cyan-500/10 rounded-lg">
                <IconUserCheck className="w-5 h-5 text-cyan-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                  Line Manager
                </p>
                {editing ? (
                  <Listbox value={selectedManager} onChange={setSelectedManager}>
                    <div className="relative">
                      <Listbox.Button className="relative w-full cursor-pointer rounded-lg bg-white dark:bg-zinc-900 py-1 pl-2 pr-8 text-left text-sm border border-zinc-300 dark:border-zinc-600">
                        <span className="block truncate text-zinc-900 dark:text-white">
                          {selectedManager?.username || "None"}
                        </span>
                      </Listbox.Button>
                      <Transition
                        as={Fragment}
                        leave="transition ease-in duration-100"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                      >
                        <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white dark:bg-zinc-800 py-1 text-sm shadow-lg border border-zinc-200 dark:border-zinc-700">
                          <Listbox.Option
                            className={({ active }) =>
                              `relative cursor-pointer select-none py-2 px-3 ${
                                active ? "bg-[#ff0099]/10 text-[#ff0099]" : "text-zinc-900 dark:text-white"
                              }`
                            }
                            value={null}
                          >
                            None
                          </Listbox.Option>
                          {allMembers && allMembers.length > 0 ? (
                            allMembers
                              .filter((m) => m.userid !== user.userid)
                              .map((member) => (
                                <Listbox.Option
                                  key={member.userid}
                                  className={({ active }) =>
                                    `relative cursor-pointer select-none py-2 px-3 flex items-center gap-2 ${
                                      active ? "bg-[#ff0099]/10" : ""
                                    }`
                                  }
                                  value={member}
                                >
                                  <img
                                    src={member.picture}
                                    className="w-6 h-6 rounded-full"
                                    alt={member.username}
                                  />
                                  <span className="text-zinc-900 dark:text-white">
                                    {member.username}
                                  </span>
                                </Listbox.Option>
                              ))
                          ) : (
                            <div className="py-2 px-3 text-zinc-500 dark:text-zinc-400 text-sm">
                              No members available
                            </div>
                          )}
                        </Listbox.Options>
                      </Transition>
                    </div>
                  </Listbox>
                ) : selectedManager || initialLineManager ? (
                  <div className="flex items-center gap-2">
                    <div
                      className={`rounded-full w-6 h-6 flex items-center justify-center ${getRandomBg(
                        (selectedManager || initialLineManager)?.userid || "")}`}>
                      <img
                        src={(selectedManager || initialLineManager)?.picture}
                        className="rounded-full w-6 h-6 object-cover border border-white dark:border-zinc-800"
                        alt={(selectedManager || initialLineManager)?.username}
                      />
                    </div>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                      {(selectedManager || initialLineManager)?.username}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                    Not assigned
                  </p>
                )}
              </div>
            </div>
          </div>
          {user.joinDate && (
            <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-emerald-500/10 rounded-lg">
                  <IconCalendar className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    Join Date
                  </p>
                  <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                    {new Date(user.joinDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
