import React, { useEffect, useState, Fragment } from "react";
import {
  profileFieldPanelClass,
  profileInputClass,
  profileSecondaryButtonClass,
} from "@/components/profile/shell";
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
  IconBrandDiscord,
  IconShield,
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
    DiscordUser?: {
      username: string,
      avatar: string,
      discordUserId: string
    }
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
  canEditMembers?: boolean; // Level 2: can edit everything
  canEditBasicInfo?: boolean; // Level 1: can only edit birthday, discord, timezone
};

const Field = ({
  icon: Icon,
  label,
  children,
  requiresLevel2 = false,
  currentEditLevel = 0,
}: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
  requiresLevel2?: boolean;
  currentEditLevel?: number;
}) => {
  const isDisabled = requiresLevel2 && currentEditLevel < 2;
  
  return (
    <div className={`flex items-start gap-3 py-4 ${isDisabled ? 'opacity-60' : ''}`}>
      <div className="p-1.5 bg-primary/10 rounded-lg flex-shrink-0 mt-0.5">
        <Icon className="w-3.5 h-3.5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wide mb-0.5">
          {label}
          {isDisabled && <span className="ml-2 text-[10px] text-zinc-400">(Requires higher permissions)</span>}
        </p>
        {children}
      </div>
    </div>
  );
};

const NullValue = ({ label }: { label: string }) => (
  <span className="text-sm text-zinc-400 dark:text-zinc-500 italic">{label}</span>
);

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
  canEditMembers = false, // Level 2: full edit permissions
  canEditBasicInfo = false, // Level 1: basic info only
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
  const [deptOpen, setDeptOpen] = useState(false);
  const deptDropdownRef = React.useRef<HTMLDivElement>(null);

  const workspaceId = router.query.id as string;
  
  // Determine edit level:
  // Level 2: Admin OR canEditMembers (full permissions)
  // Level 1: isUser OR canEditBasicInfo (basic info only)
  // Level 0: No edit permissions
  const editLevel = (isAdmin || canEditMembers) ? 2 : (isUser || canEditBasicInfo) ? 1 : 0;
  const canEdit = editLevel > 0;
  const canEditEverything = editLevel >= 2;

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
      const updateData: any = {};
      
      if (editLevel >= 2) {
        // Level 2 can edit everything
        updateData.departmentIds = selectedDepartments.map(d => d.id);
        updateData.lineManagerId = selectedManager?.userid || null;
      }
      
      // Level 1 and Level 2 can edit basic info
      if (editLevel >= 1) {
        updateData.timezone = selectedTimezone || null;
        updateData.birthdayDay = birthdayDay ? parseInt(birthdayDay as string) : null;
        updateData.birthdayMonth = birthdayMonth ? parseInt(birthdayMonth as string) : null;
        updateData.discordId = discordId || null;
      }

      await axios.patch(
        `/api/workspace/${workspaceId}/profile/${user.userid}/member-info`,
        updateData
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

  const getEditLevelBadge = () => {
    if (editLevel === 2) return <span className="ml-2 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">Full Access</span>;
    if (editLevel === 1) return <span className="ml-2 rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] font-medium text-sky-600 dark:text-sky-400">Limited Access</span>;
    return null;
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-zinc-900 dark:text-white">
            Information
          </h3>
          {getEditLevelBadge()}
        </div>
        {canEdit && !editing && (
          <button
            onClick={() => setEditing(true)}
            className={profileSecondaryButtonClass}
          >
            <IconPencil className="w-3.5 h-3.5" />
            Edit {editLevel === 1 ? "Basic Info" : "All Info"}
          </button>
        )}
        {editing && (
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={handleCancel}
              className={`${profileSecondaryButtonClass} flex-1 sm:flex-initial`}
            >
              <IconX className="w-3.5 h-3.5" />
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl text-white bg-primary hover:bg-primary/90 transition flex-1 sm:flex-initial disabled:opacity-60"
            >
              <IconCheck className="w-3.5 h-3.5" />
              Save
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={profileFieldPanelClass}>
          <Field icon={IconUser} label="Username" requiresLevel2={false} currentEditLevel={editLevel}>
            <p className="text-sm font-semibold text-zinc-900 dark:text-white">
              @{user.username}
            </p>
          </Field>

          <Field icon={IconId} label="User ID" requiresLevel2={false} currentEditLevel={editLevel}>
            <p className="text-sm font-semibold text-zinc-900 dark:text-white font-mono">
              {user.userid}
            </p>
          </Field>

          <Field icon={IconBrandDiscord} label="Discord" requiresLevel2={false} currentEditLevel={editLevel}>
            {editing && editLevel >= 1 ? (
              <input
                type="text"
                value={discordId}
                onChange={(e) => setDiscordId(e.target.value)}
                placeholder="Enter Discord ID"
                className={profileInputClass}
              />
            ) : user.DiscordUser ? (
              <div className="inline-flex items-center gap-2 bg-black/10 dark:bg-white/10 hover:bg-[#5865F2]/10 border border-black/20 dark:border-white/20 hover:border-[#5865F2]/30 rounded-full pl-1 pr-3 py-1 transition-colors cursor-default group">
                {user.DiscordUser.avatar ? (
                  <img
                    src={`https://cdn.discordapp.com/avatars/${user.DiscordUser.discordUserId}/${user.DiscordUser.avatar}.png`}
                    alt={user.DiscordUser.username}
                    className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-[#5865F2] flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-medium text-white">
                      {user.DiscordUser.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 group-hover:text-[#5865F2] transition-colors">
                  {user.DiscordUser.username}
                </span>
              </div>
            ) : workspaceMember?.discordId ? (
              <p className="text-sm font-semibold text-zinc-900 dark:text-white font-mono">
                {workspaceMember.discordId}
              </p>
            ) : (
              <NullValue label="Not linked" />
            )}
          </Field>

          <Field icon={IconCalendar} label="Birthday" requiresLevel2={false} currentEditLevel={editLevel}>
            {editing && editLevel >= 1 ? (
              <div className="flex gap-2">
                <select
                  value={birthdayMonth}
                  onChange={(e) => setBirthdayMonth(e.target.value)}
                  className={`flex-1 ${profileInputClass}`}
                >
                  <option value="">Month</option>
                  {monthNames.slice(1).map((month, idx) => (
                    <option key={idx + 1} value={idx + 1}>{month}</option>
                  ))}
                </select>
                <select
                  value={birthdayDay}
                  onChange={(e) => setBirthdayDay(e.target.value)}
                  className={`flex-1 ${profileInputClass}`}
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

        <div className={`${profileFieldPanelClass} overflow-visible`}>
          <Field icon={IconClock} label="Timezone" requiresLevel2={false} currentEditLevel={editLevel}>
            {editing && editLevel >= 1 ? (
              <Listbox value={selectedTimezone} onChange={setSelectedTimezone}>
                <div className="relative">
                  <Listbox.Button className={`relative w-full cursor-pointer text-left ${profileInputClass} pr-8`}>
                    <span className={`block truncate ${selectedTimezone ? 'text-zinc-900 dark:text-white' : 'text-zinc-400'}`}>
                      {selectedTimezone || "Select timezone..."}
                    </span>
                  </Listbox.Button>
                  <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
                    <Listbox.Options className="absolute z-[200] mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white dark:bg-zinc-800 py-1 text-sm shadow-lg border border-zinc-200 dark:border-zinc-700">
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

          <Field icon={IconBriefcase} label={`Department${selectedDepartments.length !== 1 ? "s" : ""}`} requiresLevel2={true} currentEditLevel={editLevel}>
            {editing && editLevel >= 2 ? (
              availableDepartments.length > 0 ? (
                <div className="relative" ref={deptDropdownRef}>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setDeptOpen((o) => !o);
                    }}
                    className={`relative w-full cursor-pointer text-left ${profileInputClass} pr-8`}
                  >
                    {selectedDepartments.length === 0
                      ? "Select departments..."
                      : selectedDepartments.length === 1
                        ? selectedDepartments[0].name
                        : `${selectedDepartments.length} selected`}
                    <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                      <IconChevronDown className="h-4 w-4 text-zinc-400" />
                    </span>
                  </button>

                  {deptOpen && (
                    <div className="absolute z-[200] mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white dark:bg-zinc-800 py-1 text-sm shadow-lg border border-zinc-200 dark:border-zinc-700">
                      {availableDepartments.map((dept) => {
                        const isSelected = selectedDepartments.some((d) => d.id === dept.id);
                        return (
                          <div
                            key={dept.id}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setSelectedDepartments((prev) =>
                                isSelected
                                  ? prev.filter((d) => d.id !== dept.id)
                                  : [...prev, dept]
                              );
                            }}
                            className="relative cursor-pointer select-none py-2 pl-3 pr-9 flex items-center gap-2 hover:bg-primary/10 hover:text-primary text-zinc-900 dark:text-white"
                          >
                            <div
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: dept.color || "#6b7280" }}
                            />
                            <span className={isSelected ? "font-medium" : ""}>{dept.name}</span>
                            {isSelected && (
                              <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-primary">
                                <IconCheck className="h-4 w-4" />
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
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

          <Field icon={IconUserCheck} label="Line Manager" requiresLevel2={true} currentEditLevel={editLevel}>
            {editing && editLevel >= 2 ? (
              <Combobox value={selectedManager} onChange={setSelectedManager}>
                <div className="relative">
                  <Combobox.Input
                    className={profileInputClass}
                    displayValue={(manager: any) => manager?.username || ""}
                    onChange={(e) => setManagerQuery(e.target.value)}
                    placeholder="Search manager..."
                  />
                  <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0" afterLeave={() => setManagerQuery("")}>
                    <Combobox.Options className="absolute z-[200] mt-1 w-full overflow-auto rounded-lg bg-white dark:bg-zinc-800 py-1 text-sm shadow-xl border border-zinc-200 dark:border-zinc-700">
                      <Combobox.Option value={null} className={({ active }) => `cursor-pointer select-none py-2 px-3 ${active ? "bg-primary/10 text-primary" : "text-zinc-900 dark:text-white"}`}>
                        {({ selected }) => <span className={selected ? "font-semibold" : ""}>None</span>}
                      </Combobox.Option>
                      {filteredManagers.length === 0 && managerQuery !== "" ? (
                        <div className="py-2 px-3 text-zinc-500 text-sm">No members found.</div>
                      ) : filteredManagers.map((member) => (
                        <Combobox.Option key={member.userid} value={member} className={({ active }) => `cursor-pointer select-none py-2 px-3 flex items-center gap-2 ${active ? "bg-primary/10" : ""}`}>
                          {({ selected }) => (
                            <>
                              <img src={`/api/user/${member.userid}/avatar`} className="w-5 h-5 rounded-full object-cover" alt={member.username} />
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
                  <img src={`/api/user/${(selectedManager || initialLineManager)?.userid}/avatar`} className="w-6 h-6 rounded-full object-cover" alt={(selectedManager || initialLineManager)?.username} />
                </div>
                <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                  {(selectedManager || initialLineManager)?.username}
                </p>
              </div>
            ) : (
              <NullValue label="Not assigned" />
            )}
          </Field>

          <Field icon={IconCalendar} label="Join Date" requiresLevel2={false} currentEditLevel={editLevel}>
            {user.joinDate ? (
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                  {new Date(user.joinDate).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                </p>
                {joinTenure && (
                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
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