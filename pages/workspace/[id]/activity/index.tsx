import workspace from "@/layouts/workspace";
import { pageWithLayout } from "@/layoutTypes";
import { loginState, workspacestate } from "@/state";
import axios from "axios";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { useRecoilState } from "recoil";
import moment from "moment";
import {
  IconUsers,
  IconClock,
  IconUserCircle,
  IconMessageCircle2,
  IconCalendarTime,
  IconClipboardList,
  IconChartBar,
  IconPlayerPlay,
  IconMoon,
} from "@tabler/icons-react";
import Tooltip from "@/components/tooltip";
import toast from "react-hot-toast";
import { ActivitySessionDetailsDialog } from "@/components/activity/ActivitySessionDetailsDialog";
import {
  PodiumBadge,
  type PodiumPlace,
} from "@/components/activity/PodiumBadge";

const Activity: pageWithLayout = () => {
  const router = useRouter();
  const { id } = router.query;
  const [login] = useRecoilState(loginState);
  const [myData, setMyData] = useState<any>(null);
  const [myQuotas, setMyQuotas] = useState<any[]>([]);
  const [myAssignments, setMyAssignments] = useState<any[]>([]);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [sessionDetails, setSessionDetails] = useState<any>({});
  const [concurrentUsers, setConcurrentUsers] = useState<any[]>([]);
  const [loadingSession, setLoadingSession] = useState(false);
  const [topStaff, setTopStaff] = useState<any[]>([]);
  const [activeUsers, setActiveUsers] = useState<any[]>([]);
  const [inactiveUsers, setInactiveUsers] = useState<any[]>([]);
  const [leaderboardEnabled, setLeaderboardEnabled] = useState(false);
  const [leaderboardStyle, setLeaderboardStyle] = useState<"list" | "podium">(
    "list",
  );
  const [idleTimeEnabled, setIdleTimeEnabled] = useState(true);
  const [accessApiKey, setaccessApiKey] = useState("");

  const goToProfile = (userId: string) => {
    if (!id || Array.isArray(id)) return;
    router.push(`/workspace/${id}/profile/${userId}`);
  };

  useEffect(() => {
    async function fetchUserData() {
      try {
        const profileRes = await axios.get(
          `/api/workspace/${id}/profile/${login.userId}`,
        );
        const profileData = profileRes.data.data;

        const configRes = await axios.get(
          `/api/workspace/${id}/settings/activity/getConfig`,
        );
        const idleTracking = configRes.data.idleTimeEnabled ?? true;
        setIdleTimeEnabled(idleTracking);
        if (configRes.data.apiKey) setaccessApiKey(configRes.data.apiKey);

        let totalMinutes = 0;
        let totalMessages = 0;
        let totalIdleTime = 0;

        (profileData.sessions || []).forEach((session: any) => {
          if (session.endTime) {
            totalMinutes += Math.round(
              (new Date(session.endTime).getTime() -
                new Date(session.startTime).getTime()) /
                60000,
            );
          }
          totalMessages += session.messages || 0;
          totalIdleTime += Number(session.idleTime) || 0;
        });

        totalMinutes += (profileData.adjustments || []).reduce(
          (sum: number, adj: any) => sum + adj.minutes,
          0,
        );

        const totalIdleMinutes = Math.round(totalIdleTime);
        const activeMinutes = idleTracking
          ? Math.max(0, totalMinutes - totalIdleMinutes)
          : totalMinutes;
        const sessionsHosted = profileData.roleBasedSessionsHosted || 0;
        const sessionsAttended = profileData.roleBasedSessionsAttended || 0;
        const totalPlaySessions = (profileData.sessions || []).length;

        setMyData({
          minutes: activeMinutes,
          totalMinutes,
          messages: totalMessages,
          idleTime: totalIdleMinutes,
          sessionsHosted,
          sessionsAttended,
          totalPlaySessions,
          picture: profileData.avatar,
          username: login.displayname,
        });

        if (profileData.quotas) {
          setMyQuotas(
            profileData.quotas.map((quota: any) => {
              let currentValue = 0;
              let percentage = 0;
              switch (quota.type) {
                case "mins":
                  currentValue = activeMinutes;
                  percentage = (activeMinutes / quota.value) * 100;
                  break;
                case "sessions_hosted":
                  const hostedCount =
                    quota.sessionType && quota.sessionType !== "all"
                      ? profileData.sessionsLogged?.byType[quota.sessionType] ||
                        0
                      : sessionsHosted;
                  currentValue = hostedCount;
                  percentage = (hostedCount / quota.value) * 100;
                  break;
                case "sessions_attended":
                  currentValue = sessionsAttended;
                  percentage = (sessionsAttended / quota.value) * 100;
                  break;
                case "sessions_logged":
                  let loggedCount = 0;
                  if (quota.sessionRole === "host")
                    loggedCount = profileData.sessionsLogged?.byRole.host || 0;
                  else if (quota.sessionRole === "cohost")
                    loggedCount =
                      profileData.sessionsLogged?.byRole.cohost || 0;
                  else loggedCount = profileData.sessionsLogged?.all || 0;
                  if (quota.sessionType && quota.sessionType !== "all") {
                    loggedCount =
                      profileData.sessionsLogged?.byType[quota.sessionType] ||
                      0;
                  }
                  currentValue = loggedCount;
                  percentage = (loggedCount / quota.value) * 100;
                  break;
                case "alliance_visits":
                  currentValue = profileData.allianceVisitsCount || 0;
                  percentage =
                    ((profileData.allianceVisitsCount || 0) / quota.value) *
                    100;
                  break;
              }
              return {
                ...quota,
                currentValue,
                percentage: Math.min(percentage, 100),
              };
            }),
          );
        }

        if (profileData.assignments) setMyAssignments(profileData.assignments);

        const timelineData: any[] = [];
        if (profileData.sessions)
          timelineData.push(
            ...profileData.sessions.map((s: any) => ({
              ...s,
              __type: "session",
            })),
          );
        if (profileData.adjustments)
          timelineData.push(
            ...profileData.adjustments.map((a: any) => ({
              ...a,
              __type: "adjustment",
            })),
          );
        if (profileData.notices) {
          timelineData.push(
            ...profileData.notices
              .filter((n: any) => n.approved === true)
              .map((n: any) => ({ ...n, __type: "notice" })),
          );
        }
        timelineData.sort((a, b) => {
          const aDate =
            a.__type === "adjustment"
              ? new Date(a.createdAt).getTime()
              : new Date(a.startTime || a.createdAt).getTime();
          const bDate =
            b.__type === "adjustment"
              ? new Date(b.createdAt).getTime()
              : new Date(b.startTime || b.createdAt).getTime();
          return bDate - aDate;
        });
        setTimeline(timelineData);
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    }

    if (id && login.userId) {
      fetchUserData();
      const interval = setInterval(fetchUserData, 30000);
      return () => clearInterval(interval);
    }
  }, [id, login.userId]);

  useEffect(() => {
    async function fetchLeaderboardData() {
      try {
        const configRes = await axios.get(
          `/api/workspace/${id}/settings/general/leaderboard`,
        );
        const isEnabled = configRes.data?.value?.enabled || false;
        const style = configRes.data?.value?.style || "list";
        setLeaderboardStyle(style);
        if (isEnabled) {
          const usersRes = await axios.get(
            `/api/workspace/${id}/activity/users`,
          );
          setLeaderboardEnabled(true);
          setTopStaff(usersRes.data.message.topStaff || []);
          setActiveUsers(usersRes.data.message.activeUsers || []);
          setInactiveUsers(usersRes.data.message.inactiveUsers || []);
        } else {
          setLeaderboardEnabled(false);
        }
      } catch (error) {
        console.error("Error fetching leaderboard data:", error);
      }
    }
    if (id) {
      fetchLeaderboardData();
      const interval = setInterval(fetchLeaderboardData, 60000);
      return () => clearInterval(interval);
    }
  }, [id]);

  const fetchSessionDetails = async (sessionId: string) => {
    setLoadingSession(true);
    setIsSessionModalOpen(true);
    setConcurrentUsers([]);
    try {
      const sessionResponse = await axios.get(
        `/api/workspace/${id}/activity/${sessionId}`,
        {
          headers: { authorization: accessApiKey },
        },
      );
      if (sessionResponse.status !== 200) {
        toast.error("Could not fetch session details.");
        setIsSessionModalOpen(false);
        return;
      }
      const sessionData = sessionResponse.data;
      setSessionDetails(sessionData);
      if (sessionData.message?.startTime && sessionData.message?.endTime) {
        try {
          const concurrentResponse = await axios.get(
            `/api/workspace/${id}/activity/concurrent?sessionId=${sessionId}&startTime=${sessionData.message.startTime}&endTime=${sessionData.message.endTime}`,
          );
          if (concurrentResponse.status === 200)
            setConcurrentUsers(concurrentResponse.data.users || []);
        } catch (error) {
          console.error("Failed to fetch concurrent users:", error);
        }
      }
    } catch (error) {
      toast.error("Could not fetch session details.");
      setIsSessionModalOpen(false);
    } finally {
      setLoadingSession(false);
    }
  };

  const getQuotaTypeLabel = (type: string) => {
    switch (type) {
      case "mins":
        return "minutes";
      case "sessions_hosted":
        return "sessions hosted";
      case "sessions_attended":
        return "sessions attended";
      case "sessions_logged":
        return "sessions logged";
      case "alliance_visits":
        return "alliance visits";
      default:
        return type;
    }
  };

  const endSession = (sid: string, wid: string) => {
    toast.loading("Ending session...", { id: `session-${sid}` });
    axios
      .post("/api/activity/force-end", { sessionId: sid, workspaceId: wid })
      .then(() => {
        toast.success("Session ended", { id: `session-${sid}` });
        setTimeline((prev) =>
          prev.map((item) =>
            item.__type === "session" && item.id === sid
              ? { ...item, active: false, endTime: new Date().toISOString() }
              : item,
          ),
        );
      })
      .catch(() => {
        toast.error("Failed to end session", { id: `session-${sid}` });
      });
  };

  const blockHeights: Record<number, string> = { 1: "h-24 sm:h-28", 2: "h-16 sm:h-20", 3: "h-12 sm:h-14" };
  const blockColors: Record<number, string> = {
    1: "bg-gradient-to-b from-amber-400 to-amber-500",
    2: "bg-gradient-to-b from-zinc-400 to-zinc-500",
    3: "bg-gradient-to-b from-amber-600 to-amber-700",
  };
  const labelColors: Record<number, string> = { 1: "text-amber-500", 2: "text-zinc-400", 3: "text-amber-600" };
  const avatarBorders: Record<number, string> = { 1: "border-amber-400", 2: "border-zinc-400", 3: "border-amber-600" };

  const statCards = [
    { label: "Active Time", icon: IconClock, value: formatMinutes(myData?.minutes ?? 0), desc: "Time in-game" },
    ...(idleTimeEnabled ? [{ label: "Idle Time", icon: IconMoon, value: formatMinutes(myData?.idleTime ?? 0), desc: "Away from keyboard" }] : []),
    { label: "Messages", icon: IconMessageCircle2, value: (myData?.messages ?? 0).toLocaleString(), desc: "Chat messages sent" },
    { label: "Play Sessions", icon: IconPlayerPlay, value: myData?.totalPlaySessions ?? 0, desc: "Total play sessions" },
  ];

  return (
    <div className="pagePadding">
      <div className="mx-auto max-w-7xl space-y-8">

        <div className="flex items-center gap-4">
          {myData?.picture && (
            <img
              src={myData.picture}
              alt={myData.username}
              className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-primary/20"
            />
          )}
          <div>
            <h1 className="text-xl font-semibold text-zinc-900 dark:text-white">
              Activity Dashboard
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {myData ? `Welcome back, ${myData.username}` : "Monitor your performance and track activity"}
            </p>
          </div>
        </div>

        {leaderboardEnabled && (
          <div className="rounded-2xl bg-zinc-100 p-5 dark:bg-zinc-800/60">
            <div className="mb-5 flex items-center gap-2">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Leaderboard</h2>
              <span className="text-xs text-zinc-400 dark:text-zinc-500">Top performers this period</span>
            </div>

            {topStaff.length === 0 ? (
              <p className="py-4 text-center text-sm text-zinc-400 dark:text-zinc-500">
                No staff members to display yet.
              </p>
            ) : (
              <>
                <div className="flex items-end justify-center gap-2 sm:gap-6">
                  {[topStaff[1], topStaff[0], topStaff[2]].filter(Boolean).map((user: any, i: number) => {
                    const pos = topStaff[1] ? ([2, 1, 3][i] as number) : ([1, 3][i] as number);
                    const minutes = Math.floor(user.ms / 1000 / 60);
                    const isFirst = pos === 1;
                    const avatarSize = isFirst ? "w-16 h-16 sm:w-20 sm:h-20" : "w-12 h-12 sm:w-16 sm:h-16";
                    return (
                      <div key={user.userId} className="flex flex-1 min-w-0 max-w-[110px] flex-col items-center sm:max-w-[140px]">
                        <div className="relative mb-1">
                          <button
                            type="button"
                            onClick={() => goToProfile(user.userId)}
                            className={`${avatarSize} rounded-full cursor-pointer overflow-hidden ${getRandomBg(String(user.userId), user.username)}`}
                          >
                            <img src={user.picture} alt={user.username} className={`${avatarSize} rounded-full object-cover border-[3px] ${avatarBorders[pos]}`} />
                          </button>
                          <div className="absolute -top-1.5 left-1/2 -translate-x-1/2">
                            <PodiumBadge place={pos as PodiumPlace} />
                          </div>
                        </div>
                        <p className={`mt-2 w-full truncate px-1 text-center text-xs font-bold text-zinc-900 dark:text-white sm:text-sm ${isFirst ? "sm:text-base" : ""}`}>
                          {user.username}
                        </p>
                        <p className={`text-xs font-semibold ${labelColors[pos]}`}>{formatMinutes(minutes)}</p>
                        <div className={`mt-2 w-full rounded-t-xl ${blockHeights[pos]} ${blockColors[pos]} flex items-center justify-center`}>
                          <span className="text-xl font-black text-white opacity-60 sm:text-2xl">{pos}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {topStaff.length > 3 && (
                  <div className="mt-5 divide-y divide-zinc-200 dark:divide-zinc-700/40">
                    {topStaff.slice(3).map((user: any, index: number) => {
                      const minutes = Math.floor(user.ms / 1000 / 60);
                      return (
                        <div key={user.userId} className="flex items-center gap-3 py-2.5">
                          <span className="w-5 shrink-0 text-right text-xs font-bold text-zinc-400 dark:text-zinc-500">{index + 4}</span>
                          <button
                            type="button"
                            onClick={() => goToProfile(user.userId)}
                            className={`h-7 w-7 shrink-0 overflow-hidden rounded-full ${getRandomBg(String(user.userId), user.username)}`}
                          >
                            <img src={user.picture} alt={user.username} className="h-7 w-7 rounded-full object-cover" />
                          </button>
                          <span className="flex-1 truncate text-sm font-medium text-zinc-900 dark:text-white">{user.username}</span>
                          <span className="shrink-0 text-xs tabular-nums font-semibold text-zinc-500 dark:text-zinc-400">{formatMinutes(minutes)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <div className={`grid gap-3 ${idleTimeEnabled ? "grid-cols-2 xl:grid-cols-4" : "grid-cols-2 xl:grid-cols-3"}`}>
          {statCards.map(({ label, icon: Icon, value, desc }) => (
            <div key={label} className="rounded-xl bg-zinc-100 p-4 dark:bg-zinc-800/60">
              <div className="mb-4 flex items-center gap-2">
                <div className="shrink-0 rounded-lg bg-primary/10 p-1.5">
                  <Icon className="h-4 w-4 text-primary" stroke={1.75} />
                </div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">{label}</p>
              </div>
              <div className="text-3xl font-bold tabular-nums text-zinc-900 dark:text-white">{value}</div>
              <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">{desc}</p>
            </div>
          ))}
        </div>

        {myData && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 p-5 text-white">
              <div className="absolute -bottom-4 -right-4 h-24 w-24 rounded-full bg-white/10" />
              <div className="absolute -bottom-8 -right-1 h-16 w-16 rounded-full bg-white/10" />
              <div className="relative mb-4 flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-100">Sessions Hosted</p>
                <div className="rounded-lg bg-white/20 p-1.5">
                  <IconUsers className="h-4 w-4 text-white" stroke={1.75} />
                </div>
              </div>
              <div className="relative text-4xl font-bold tabular-nums">{myData.sessionsHosted}</div>
              <p className="relative mt-0.5 text-sm text-blue-100">Sessions you led</p>
            </div>

            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-5 text-white">
              <div className="absolute -bottom-4 -right-4 h-24 w-24 rounded-full bg-white/10" />
              <div className="absolute -bottom-8 -right-1 h-16 w-16 rounded-full bg-white/10" />
              <div className="relative mb-4 flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-100">Sessions Attended</p>
                <div className="rounded-lg bg-white/20 p-1.5">
                  <IconChartBar className="h-4 w-4 text-white" stroke={1.75} />
                </div>
              </div>
              <div className="relative text-4xl font-bold tabular-nums">{myData.sessionsAttended}</div>
              <p className="relative mt-0.5 text-sm text-emerald-100">Sessions you participated in</p>
            </div>
          </div>
        )}

        {myQuotas.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Quotas</h3>
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                {myQuotas.length}
              </span>
            </div>
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {myQuotas.map((quota: any) => (
                <div key={quota.id} className="py-3.5">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-medium text-zinc-900 dark:text-white">{quota.name}</span>
                      {quota.percentage >= 100 && (
                        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          Complete
                        </span>
                      )}
                    </div>
                    <span className="shrink-0 text-sm font-bold tabular-nums text-zinc-900 dark:text-white">
                      {quota.currentValue}
                      <span className="text-xs font-normal text-zinc-400"> / {quota.value}</span>
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${quota.percentage >= 100 ? "bg-emerald-500" : "bg-primary"}`}
                      style={{ width: `${Math.min(quota.percentage, 100)}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-zinc-400 dark:text-zinc-500">
                    {Math.round(quota.percentage)}% · {quota.currentValue} {getQuotaTypeLabel(quota.type)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {myAssignments.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Assignments</h3>
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                {myAssignments.length}
              </span>
            </div>
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {myAssignments.map((assignment: any) => (
                <div key={assignment.id} className="py-3.5">
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-zinc-900 dark:text-white">{assignment.name}</p>
                      <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
                        {assignment.description || `${assignment.value} ${getQuotaTypeLabel(assignment.type)} required`}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-bold tabular-nums text-zinc-900 dark:text-white">
                      {Math.round(assignment.progress || 0)}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{ width: `${Math.min(assignment.progress || 0, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {leaderboardEnabled && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {[
              { title: "In-game Staff", users: activeUsers, emptyText: "No staff are currently in-game" },
              { title: "Inactive Staff", users: inactiveUsers, emptyText: "No staff are currently inactive" },
            ].map(({ title, users, emptyText }) => (
              <div key={title} className="space-y-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">{title}</h3>
                  {users.length > 0 && (
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                      {users.length}
                    </span>
                  )}
                </div>
                {users.length === 0 ? (
                  <p className="text-sm italic text-zinc-400 dark:text-zinc-500">{emptyText}</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {users.map((user: any) => (
                      <Tooltip
                        key={user.userId}
                        tooltipText={
                          user.reason
                            ? `${user.username} | ${moment(user.from).format("DD MMM")} – ${moment(user.to).format("DD MMM")}`
                            : user.username
                        }
                        orientation="top"
                      >
                        <button
                          type="button"
                          onClick={() => goToProfile(user.userId)}
                          className={`h-9 w-9 overflow-hidden rounded-full ring-2 ring-primary/10 transition hover:ring-primary/30 ${getRandomBg(user.userId)}`}
                        >
                          <img src={user.picture} alt={user.username} className="h-9 w-9 rounded-full object-cover" />
                        </button>
                      </Tooltip>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Activity Timeline</h3>
          {timeline.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800/60">
                <IconClipboardList className="h-5 w-5 text-zinc-400" stroke={1.75} />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">No activity yet</p>
                <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">Sessions and adjustments will appear here</p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {timeline.map((item: any) => {
                if (item.__type === "session") {
                  const isLive = item.active && !item.endTime;
                  const sessionDuration = isLive
                    ? Math.floor((new Date().getTime() - new Date(item.startTime).getTime()) / (1000 * 60))
                    : Math.floor((new Date(item.endTime || new Date()).getTime() - new Date(item.startTime).getTime()) / (1000 * 60));

                  return (
                    <div
                      key={`session-${item.id}`}
                      onClick={() => !isLive && fetchSessionDetails(item.id)}
                      className={`flex items-start justify-between gap-3 py-3.5 ${!isLive ? "cursor-pointer" : ""}`}
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="mt-0.5 shrink-0">
                          {isLive ? (
                            <span className="relative flex h-5 w-5 items-center justify-center">
                              <span className="absolute h-5 w-5 animate-ping rounded-full bg-emerald-500 opacity-30" />
                              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                            </span>
                          ) : (
                            <img
                              src={item.user?.picture || login.thumbnail}
                              alt="avatar"
                              className="h-5 w-5 rounded-full object-cover"
                            />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="mb-0.5 flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium text-zinc-900 dark:text-white">Activity Session</span>
                            {isLive && (
                              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                Live
                              </span>
                            )}
                          </div>
                          {isLive ? (
                            <p className="text-xs text-emerald-600 dark:text-emerald-400">
                              Currently active · {sessionDuration}m
                            </p>
                          ) : (
                            <p className="text-xs tabular-nums text-zinc-400 dark:text-zinc-500">
                              {moment(item.startTime).format("HH:mm")}–{moment(item.endTime).format("HH:mm")} ·{" "}
                              {moment(item.startTime).format("D MMM")} · {sessionDuration}m
                            </p>
                          )}
                        </div>
                      </div>
                      {isLive && (
                        <button
                          onClick={(e) => { e.stopPropagation(); endSession(item.id, id as string); }}
                          className="shrink-0 rounded-lg bg-zinc-100 px-2.5 py-1.5 text-xs text-zinc-500 transition hover:bg-zinc-200 hover:text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                        >
                          Not in game?
                        </button>
                      )}
                    </div>
                  );
                }

                if (item.__type === "notice") {
                  return (
                    <div key={`notice-${item.id}`} className="flex items-start gap-3 py-3.5">
                      <div className="mt-0.5 shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/10">
                        <IconCalendarTime className="h-3 w-3 text-amber-500" />
                      </div>
                      <div className="min-w-0">
                        <div className="mb-0.5 flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium text-zinc-900 dark:text-white">Inactivity Notice</span>
                          <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                            Approved
                          </span>
                        </div>
                        <p className="text-xs tabular-nums text-zinc-400 dark:text-zinc-500">
                          {moment(item.startTime).format("D MMM")} – {moment(item.endTime).format("D MMM YYYY")}
                        </p>
                        <p className="mt-0.5 text-sm text-zinc-700 dark:text-zinc-300">{item.reason}</p>
                      </div>
                    </div>
                  );
                }

                if (item.__type === "adjustment") {
                  const positive = item.minutes > 0;
                  return (
                    <div key={`adjust-${item.id}`} className="flex items-start justify-between gap-3 py-3.5">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className={`mt-0.5 shrink-0 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white ${positive ? "bg-emerald-500" : "bg-red-500"}`}>
                          {positive ? "+" : "−"}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-zinc-900 dark:text-white">Manual Adjustment</p>
                          <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
                            <span className={positive ? "font-medium text-emerald-600 dark:text-emerald-400" : "font-medium text-red-600 dark:text-red-400"}>
                              {positive ? "+" : "−"}{Math.abs(item.minutes)} min
                            </span>
                            {" "}by {item.actor?.username || "Unknown"}
                            {item.reason && <> · {item.reason}</>}
                          </p>
                        </div>
                      </div>
                      <time className="shrink-0 text-xs tabular-nums text-zinc-400 dark:text-zinc-500">
                        {moment(item.createdAt).format("D MMM, HH:mm")}
                      </time>
                    </div>
                  );
                }
              })}
            </div>
          )}
        </div>

      </div>

      <ActivitySessionDetailsDialog
        open={isSessionModalOpen}
        loading={loadingSession}
        onClose={() => setIsSessionModalOpen(false)}
        session={sessionDetails?.message ?? null}
        universe={sessionDetails?.universe}
        concurrentUsers={concurrentUsers}
        idleTimeEnabled={idleTimeEnabled}
      />
    </div>
  );
};

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

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function getRandomBg(userid: string, username?: string) {
  const key = `${userid ?? ""}:${username ?? ""}`;
  let hash = 5381;
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) - hash) ^ key.charCodeAt(i);
  }
  return BG_COLORS[(hash >>> 0) % BG_COLORS.length];
}

Activity.layout = workspace;
export default Activity;
