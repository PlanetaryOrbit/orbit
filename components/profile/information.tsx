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
import { Listbox, Transition, Combobox } from "@headlessui/react";
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
  const [managerQuery, setManagerQuery] = useState("");

  const workspaceId = router.query.id as string;
  const canEdit = isUser || isAdmin || canEditMembers;

  const filteredManagers = managerQuery === ""
    ? allMembers.filter((m) => m.userid !== user.userid).slice(0, 5)
    : allMembers
        .filter((m) => 
          m.userid !== user.userid &&
          m.username.toLowerCase().includes(managerQuery.toLowerCase())
        )
        .slice(0, 5);

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

  const joinTenure = user.joinDate
    ? (() => {
        const days = Math.floor((Date.now() - new Date(user.joinDate).getTime()) / 86400000);
        if (days < 30) return `${days}d`;
        if (days < 365) return `${Math.floor(days / 30)}mo`;
        const y = Math.floor(days / 365);
        const m = Math.floor((days % 365) / 30);
        return m > 0 ? `${y}y ${m}mo` : `${y}y`;
      })()
    : null;

  const Field = ({
    icon: Icon,
    label,
    children,
  }: {
    icon: React.ElementType;
    label: string;
    children: React.ReactNode;
  }) => (
    <div className="flex items-start gap-3 py-4">
      <div className="p-1.5 bg-primary/10 rounded-lg flex-shrink-0 mt-0.5">
        <Icon className="w-3.5 h-3.5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wide mb-0.5">
          {label}
        </p>
        {children}
      </div>
    </div>
  );

  const NullValue = ({ label }: { label: string }) => (
    <span className="text-sm text-zinc-400 dark:text-zinc-500 italic">{label}</span>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
        <h3 className="text-base font-semibold text-zinc-900 dark:text-white">
          Information
        </h3>
        {canEdit && !editing && (
          <button
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
          >
            <IconPencil className="w-3.5 h-3.5" />
            Edit
          </button>
        )}
        {editing && (
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={handleCancel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition flex-1 sm:flex-initial"
            >
              <IconX className="w-3.5 h-3.5" />
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-white bg-primary hover:bg-primary/90 transition flex-1 sm:flex-initial disabled:opacity-60"
            >
              <IconCheck className="w-3.5 h-3.5" />
              Save
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-700/60 rounded-xl px-5 divide-y divide-zinc-100 dark:divide-zinc-700/50">
          <Field icon={IconUser} label="Username">
            <p className="text-sm font-semibold text-zinc-900 dark:text-white">
              @{user.username}
            </p>
          </Field>

          <Field icon={IconId} label="User ID">
            <p className="text-sm font-semibold text-zinc-900 dark:text-white font-mono">
              {user.userid}
            </p>
          </Field>

          <Field icon={IconUser} label="Discord ID">
            {editing ? (
              <input
                type="text"
                value={discordId}
                onChange={(e) => setDiscordId(e.target.value)}
                placeholder="Enter Discord ID"
                className="w-full px-2 py-1 text-sm rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-600 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            ) : workspaceMember?.discordId ? (
              <p className="text-sm font-semibold text-zinc-900 dark:text-white font-mono">
                {workspaceMember.discordId}
              </p>
            ) : (
              <NullValue label="Not linked" />
            )}
          </Field>

          <Field icon={IconCalendar} label="Birthday">
            {editing ? (
              <div className="flex gap-2">
                <select
                  value={birthdayMonth}
                  onChange={(e) => setBirthdayMonth(e.target.value)}
                  className="flex-1 px-2 py-1 text-sm rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-600 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">Month</option>
                  {monthNames.slice(1).map((month, idx) => (
                    <option key={idx + 1} value={idx + 1}>{month}</option>
                  ))}
                </select>
                <select
                  value={birthdayDay}
                  onChange={(e) => setBirthdayDay(e.target.value)}
                  className="flex-1 px-2 py-1 text-sm rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-600 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">Day</option>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
              </div>
            ) : user.birthdayDay && user.birthdayMonth ? (
              <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                {monthNames[user.birthdayMonth]} {user.birthdayDay}
              </p>
            ) : (
              <NullValue label="Not set" />
            )}
          </Field>
        </div>

        <div className="bg-white dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-700/60 rounded-xl px-5 divide-y divide-zinc-100 dark:divide-zinc-700/50">
          <Field icon={IconClock} label="Timezone">
            {editing ? (
              <Listbox value={selectedTimezone} onChange={setSelectedTimezone}>
                <div className="relative">
                  <Listbox.Button className="relative w-full cursor-pointer rounded-lg bg-zinc-50 dark:bg-zinc-900 py-1 pl-2 pr-8 text-left text-sm border border-zinc-200 dark:border-zinc-600">
                    <span className={`block truncate ${selectedTimezone ? 'text-zinc-900 dark:text-white' : 'text-zinc-400'}`}>
                      {selectedTimezone || "Select timezone..."}
                    </span>
                  </Listbox.Button>
                  <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
                    <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white dark:bg-zinc-800 py-1 text-sm shadow-lg border border-zinc-200 dark:border-zinc-700">
                      <Listbox.Option value="" className={({ active }) => `cursor-pointer select-none py-2 px-3 ${active ? "bg-primary/10 text-primary" : "text-zinc-400"}`}>Not set</Listbox.Option>
                      {commonTimezones.map((tz) => (
                        <Listbox.Option key={tz} value={tz} className={({ active }) => `cursor-pointer select-none py-2 px-3 ${active ? "bg-primary/10 text-primary" : "text-zinc-900 dark:text-white"}`}>{tz}</Listbox.Option>
                      ))}
                    </Listbox.Options>
                  </Transition>
                </div>
              </Listbox>
            ) : workspaceMember?.timezone ? (
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                  {workspaceMember.timezone}
                </p>
                {localTime && (
                  <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400">
                    {isNight ? <IconMoon className="w-3 h-3" /> : <IconSun className="w-3 h-3" />}
                    {localTime}
                  </span>
                )}
              </div>
            ) : (
              <NullValue label="Not set" />
            )}
          </Field>

          <Field icon={IconBriefcase} label={`Department${selectedDepartments.length !== 1 ? "s" : ""}`}>
            {editing ? (
              availableDepartments.length > 0 ? (
                <Listbox value={selectedDepartments} onChange={setSelectedDepartments} multiple by="id">
                  <div className="relative z-40">
                    <Listbox.Button className="relative w-full cursor-pointer rounded-lg bg-zinc-50 dark:bg-zinc-900 py-2 pl-3 pr-10 text-left border border-zinc-200 dark:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary/50">
                      <span className="block truncate text-sm text-zinc-900 dark:text-white">
                        {selectedDepartments.length === 0 ? "Select departments..." : selectedDepartments.length === 1 ? selectedDepartments[0].name : `${selectedDepartments.length} selected`}
                      </span>
                      <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                        <IconChevronDown className="h-4 w-4 text-zinc-400" />
                      </span>
                    </Listbox.Button>
                    <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
                      <Listbox.Options className="absolute z-[100] mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white dark:bg-zinc-800 py-1 text-sm shadow-lg border border-zinc-200 dark:border-zinc-700 focus:outline-none">
                        {availableDepartments.map((dept) => (
                          <Listbox.Option key={dept.id} value={dept} className={({ active }) => `relative cursor-pointer select-none py-2 pl-3 pr-9 ${active ? "bg-primary/10 text-primary" : "text-zinc-900 dark:text-white"}`}>
                            {({ selected }) => (
                              <>
                                <div className="flex items-center gap-2">
                                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: dept.color || "#6b7280" }} />
                                  <span className={selected ? "font-medium" : ""}>{dept.name}</span>
                                </div>
                                {selected && <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-primary"><IconCheck className="h-4 w-4" /></span>}
                              </>
                            )}
                          </Listbox.Option>
                        ))}
                      </Listbox.Options>
                    </Transition>
                  </div>
                </Listbox>
              ) : (
                <NullValue label="No departments available" />
              )
            ) : selectedDepartments.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {selectedDepartments.map((dept) => (
                  <span
                    key={dept.id}
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium text-white"
                    style={{ backgroundColor: dept.color || "#6b7280" }}
                  >
                    {dept.name}
                  </span>
                ))}
              </div>
            ) : (
              <NullValue label="Not assigned" />
            )}
          </Field>

          <Field icon={IconUserCheck} label="Line Manager">
            {editing ? (
              <Combobox value={selectedManager} onChange={setSelectedManager}>
                <div className="relative z-10">
                  <Combobox.Input
                    className="w-full rounded-lg bg-zinc-50 dark:bg-zinc-900 py-1 pl-2 pr-8 text-sm border border-zinc-200 dark:border-zinc-600 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                    displayValue={(manager: any) => manager?.username || ""}
                    onChange={(e) => setManagerQuery(e.target.value)}
                    placeholder="Search manager..."
                  />
                  <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0" afterLeave={() => setManagerQuery("")}>
                    <Combobox.Options className="absolute z-50 mt-1 w-full overflow-auto rounded-lg bg-white dark:bg-zinc-800 py-1 text-sm shadow-xl border border-zinc-200 dark:border-zinc-700">
                      <Combobox.Option value={null} className={({ active }) => `cursor-pointer select-none py-2 px-3 ${active ? "bg-primary/10 text-primary" : "text-zinc-900 dark:text-white"}`}>
                        {({ selected }) => <span className={selected ? "font-semibold" : ""}>None</span>}
                      </Combobox.Option>
                      {filteredManagers.length === 0 && managerQuery !== "" ? (
                        <div className="py-2 px-3 text-zinc-500 text-sm">No members found.</div>
                      ) : filteredManagers.map((member) => (
                        <Combobox.Option key={member.userid} value={member} className={({ active }) => `cursor-pointer select-none py-2 px-3 flex items-center gap-2 ${active ? "bg-primary/10" : ""}`}>
                          {({ selected }) => (
                            <>
                              <img src={member.picture} className="w-5 h-5 rounded-full" alt={member.username} />
                              <span className={`text-zinc-900 dark:text-white ${selected ? "font-semibold" : ""}`}>{member.username}</span>
                            </>
                          )}
                        </Combobox.Option>
                      ))}
                    </Combobox.Options>
                  </Transition>
                </div>
              </Combobox>
            ) : (selectedManager || initialLineManager) ? (
              <div className="flex items-center gap-2">
                <div className={`rounded-full w-6 h-6 flex-shrink-0 flex items-center justify-center overflow-hidden ${getRandomBg((selectedManager || initialLineManager)?.userid || "")}`}>
                  <img src={(selectedManager || initialLineManager)?.picture} className="w-6 h-6 rounded-full object-cover" alt={(selectedManager || initialLineManager)?.username} />
                </div>
                <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                  {(selectedManager || initialLineManager)?.username}
                </p>
              </div>
            ) : (
              <NullValue label="Not assigned" />
            )}
          </Field>

          <Field icon={IconCalendar} label="Join Date">
            {user.joinDate ? (
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                  {new Date(user.joinDate).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                </p>
                {joinTenure && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                    {joinTenure}
                  </span>
                )}
              </div>
            ) : (
              <NullValue label="Unknown" />
            )}
          </Field>
        </div>
      </div>
    </div>
  );
}
