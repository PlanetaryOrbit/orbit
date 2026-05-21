import workspace from "@/layouts/workspace";
import { pageWithLayout } from "@/layoutTypes";
import { loginState } from "@/state";
import axios from "axios";
import { useRouter } from "next/router";
import { useEffect, useState, useMemo } from "react";
import { useRecoilState } from "recoil";
import { withPermissionCheckSsr } from "@/utils/permissionsManager";
import prisma from "@/utils/database";
import {
  IconTrophy,
  IconUsers,
  IconUserCircle,
  IconLaurelWreath1,
} from "@tabler/icons-react";
import randomText from "@/utils/randomText";
import Tooltip from "@/components/tooltip";
import moment from "moment";
import { PodiumBadge, podiumPlaceFromIndex } from "@/components/activity/PodiumBadge";

interface StaffMember {
  userId: string;
  username: string;
  picture: string;
  ms: number;
  messages?: number;
}

export const getServerSideProps = withPermissionCheckSsr(
  async (context: any) => {
    const { id } = context.query;
    const userid = context.req.auth.userId;

    if (!userid) {
      return { redirect: { destination: "/login" } };
    }

    if (!id) {
      return { notFound: true };
    }

    const user = await prisma.user.findFirst({
      where: { userid },
      include: {
        roles: {
          where: { workspaceGroupId: parseInt(id as string) },
        },
      },
    });

    if (!user) {
      return { redirect: { destination: "/login" } };
    }

    const config = await prisma.config.findFirst({
      where: {
        workspaceGroupId: parseInt(id as string),
        key: "leaderboard",
      },
    });

    let leaderboardEnabled = false;
    if (config?.value) {
      let val = config.value;
      if (typeof val === "string") {
        try { val = JSON.parse(val) } catch { val = {} }
      }
      leaderboardEnabled =
        typeof val === "object" && val !== null && "enabled" in val
          ? (val as { enabled?: boolean }).enabled ?? false
          : false;
    }

    if (!leaderboardEnabled) {
      return { notFound: true };
    }

    return { props: {} };
  }
);

function formatMinutes(ms: number) {
  const minutes = Math.floor(ms / 1000 / 60);
  return `${minutes}m`;
}

const Leaderboard: pageWithLayout = () => {
  const router = useRouter();
  const { id } = router.query;
  const [login] = useRecoilState(loginState);
  const text = useMemo(() => randomText(login.displayname), []);
  const [topStaff, setTopStaff] = useState<StaffMember[]>([]);
  const [activeUsers, setActiveUsers] = useState([]);
  const [inactiveUsers, setInactiveUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const goToProfile = (userId: string) => {
    if (!id || Array.isArray(id)) return;
    router.push(`/workspace/${id}/profile/${userId}`);
  };

  useEffect(() => {
    async function fetchLeaderboardData() {
      try {
        setLoading(true);
        const usersRes = await axios.get(`/api/workspace/${id}/activity/users`);
        const { topStaff: ts, activeUsers: au, inactiveUsers: iu } = usersRes.data.message;
        setTopStaff(ts ?? []);
        setActiveUsers(au ?? []);
        setInactiveUsers(iu ?? []);
      } catch (error) {
        console.error("Error fetching leaderboard data:", error);
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      fetchLeaderboardData();
      const interval = setInterval(fetchLeaderboardData, 60000);
      return () => clearInterval(interval);
    }
  }, [id]);

  const getPodiumIcon = (position: number) => {
    if (position < 0 || position > 2) return null;
    return (
      <PodiumBadge
        place={podiumPlaceFromIndex(position)}
        size="lg"
      />
    );
  };

  const getPodiumHeight = (position: number) => {
    switch (position) {
      case 0: return "h-24 sm:h-32";
      case 1: return "h-16 sm:h-24";
      case 2: return "h-12 sm:h-20";
      default: return "h-10 sm:h-16";
    }
  };

  const getPodiumColors = (position: number) => {
    switch (position) {
      case 0: return "bg-gradient-to-t from-yellow-400 to-yellow-300 border-yellow-500";
      case 1: return "bg-gradient-to-t from-gray-400 to-gray-300 border-gray-500";
      case 2: return "bg-gradient-to-t from-amber-600 to-amber-500 border-amber-700";
      default: return "bg-gradient-to-t from-zinc-300 to-zinc-200 border-zinc-400";
    }
  };

  if (loading) {
    return (
      <div className="pagePadding">
        <div className="max-w-7xl mx-auto flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  const podiumOrder = [topStaff[1], topStaff[0], topStaff[2]].filter(Boolean);
  const podiumPositions = [1, 0, 2];

  return (
    <div className="pagePadding">
      <div className="max-w-7xl mx-auto">

        <div className="flex items-center gap-3 mb-6 sm:mb-8">
          <div className="bg-primary/10 p-2.5 sm:p-3 rounded-xl shrink-0">
            <IconTrophy className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white">
              Leaderboard
            </h1>
            <p className="text-sm sm:text-base text-zinc-500 dark:text-zinc-400 mt-0.5">
              Top performers and workspace statistics
            </p>
          </div>
        </div>

        {topStaff.length > 0 && (
          <div className="mb-10 sm:mb-12">
            <div className="flex items-end justify-center gap-2 sm:gap-6 mb-6 sm:mb-8 px-2">
              {podiumOrder.map((user, i) => {
                const position = podiumPositions[i];
                const isFirst = position === 0;
                const avatarSize = isFirst
                  ? "w-16 h-16 sm:w-24 sm:h-24"
                  : "w-14 h-14 sm:w-20 sm:h-20";
                const borderColor = position === 0
                  ? "border-yellow-400"
                  : position === 1
                  ? "border-gray-400"
                  : "border-amber-600";
                const podiumWidth = isFirst
                  ? "w-20 sm:w-28"
                  : "w-16 sm:w-24";

                return (
                  <div
                    key={user.userId}
                    className="flex flex-col items-center flex-1 min-w-0 max-w-[100px] sm:max-w-[140px]"
                  >
                    <div className="relative mb-3 sm:mb-4">
                      <button
                        type="button"
                        onClick={() => goToProfile(user.userId)}
                        aria-label={`Open ${user.username}'s profile`}
                        className={`${avatarSize} rounded-full flex items-center justify-center ${getRandomBg(user.userId)} cursor-pointer`}
                      >
                        <img
                          src={user.picture}
                          alt={user.username}
                          className={`${avatarSize} rounded-full border-4 ${borderColor} shadow-lg object-cover`}
                          style={{ background: "transparent" }}
                        />
                      </button>
                      <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 sm:-top-2">
                        {getPodiumIcon(position)}
                      </div>
                    </div>

                    <div
                      className={`${getPodiumHeight(position)} ${getPodiumColors(position)} ${podiumWidth} border-2 rounded-t-lg flex flex-col items-center justify-center shadow-lg relative`}
                    >
                      {isFirst && (
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                          <div className="bg-yellow-500 text-white text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                            CHAMPION
                          </div>
                        </div>
                      )}
                      <span className={`text-white font-bold ${isFirst ? "text-lg sm:text-xl" : "text-base sm:text-lg"}`}>
                        {position + 1}
                      </span>
                    </div>

                    <div className="mt-2 sm:mt-4 text-center w-full px-1">
                      <p className={`font-semibold text-zinc-900 dark:text-white truncate text-xs sm:text-sm ${isFirst ? "sm:text-base sm:font-bold" : ""}`}>
                        {user.username}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {formatMinutes(user.ms)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-zinc-800 border border-white/10 rounded-xl p-4 sm:p-6 shadow-sm mb-6 sm:mb-8">
          <div className="flex items-center gap-3 mb-4 sm:mb-6">
            <div className="bg-primary/10 p-2 rounded-lg shrink-0">
              <IconLaurelWreath1 className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            </div>
            <div>
              <h3 className="text-base sm:text-xl font-semibold text-zinc-900 dark:text-white">
                Runners Up
              </h3>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                Close behind the top 5
              </p>
            </div>
          </div>

          <div className="space-y-2 sm:space-y-4">
            {topStaff.length > 3 ? (
              topStaff.slice(3, 8).map((user: any, index: number) => {
                const actualPosition = index + 4;
                return (
                  <div
                    key={user.userId}
                    className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 dark:bg-zinc-700 gap-2"
                  >
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                      <div className="flex items-center justify-center w-7 h-7 sm:w-10 sm:h-10 rounded-full font-bold bg-zinc-300 dark:bg-zinc-600 text-zinc-700 dark:text-zinc-300 text-xs sm:text-sm shrink-0">
                        {actualPosition}
                      </div>
                      <button
                        type="button"
                        onClick={() => goToProfile(user.userId)}
                        aria-label={`Open ${user.username}'s profile`}
                        className={`w-8 h-8 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shrink-0 ${getRandomBg(user.userId)} cursor-pointer`}
                      >
                        <img
                          src={user.picture}
                          alt={user.username}
                          className="w-8 h-8 sm:w-12 sm:h-12 rounded-full border-2 border-white dark:border-zinc-700 shadow-sm object-cover"
                          style={{ background: "transparent" }}
                        />
                      </button>
                      <span className="font-semibold text-sm text-zinc-900 dark:text-white truncate">
                        {user.username}
                      </span>
                    </div>
                    <p className="font-bold text-sm sm:text-base text-zinc-900 dark:text-white whitespace-nowrap shrink-0">
                      {formatMinutes(user.ms)}
                    </p>
                  </div>
                );
              })
            ) : (
              <p className="text-center text-zinc-500 dark:text-zinc-400 italic py-8 text-sm">
                Not enough staff for runners up
              </p>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mt-6 sm:mt-8">
          {[
            {
              title: "In-game Staff",
              subtitle: "Currently active members",
              users: activeUsers,
              emptyText: "No staff are currently in-game",
              icon: IconUsers,
            },
            {
              title: "Inactive Staff",
              subtitle: "Staff on inactivity notice",
              users: inactiveUsers,
              emptyText: "No staff are currently inactive",
              icon: IconUserCircle,
            },
          ].map(({ title, subtitle, users, emptyText, icon: Icon }) => (
            <div
              key={title}
              className="bg-white dark:bg-zinc-800 rounded-xl p-4 sm:p-6 shadow-sm"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-primary/10 p-2 rounded-lg shrink-0">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-medium text-zinc-900 dark:text-white">
                    {title}
                  </h3>
                  <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                    {subtitle}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {users.length > 0 ? (
                  users.map((user: any) => (
                    <Tooltip
                      key={user.userId}
                      tooltipText={
                        user.reason
                          ? `${user.username} | ${moment(user.from).format("DD MMM")} - ${moment(user.to).format("DD MMM")}`
                          : user.username
                      }
                      orientation="top"
                    >
                      <button
                        type="button"
                        onClick={() => goToProfile(user.userId)}
                        aria-label={`Open ${user.username}'s profile`}
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${getRandomBg(user.userId)} ring-2 ring-primary/10 hover:ring-primary/30 transition-all cursor-pointer`}
                      >
                        <img
                          src={user.picture}
                          alt={user.username}
                          className="w-10 h-10 rounded-full object-cover border-2 border-white"
                          style={{ background: "transparent" }}
                        />
                      </button>
                    </Tooltip>
                  ))
                ) : (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 italic">
                    {emptyText}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const BG_COLORS = [
  "bg-rose-300", "bg-lime-300", "bg-teal-200", "bg-amber-300",
  "bg-rose-200", "bg-lime-200", "bg-green-100", "bg-red-100",
  "bg-yellow-200", "bg-amber-200", "bg-emerald-300", "bg-green-300",
  "bg-red-300", "bg-emerald-200", "bg-green-200", "bg-red-200",
];

function getRandomBg(userid: string, username?: string) {
  const key = `${userid ?? ""}:${username ?? ""}`;
  let hash = 5381;
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) - hash) ^ key.charCodeAt(i);
  }
  return BG_COLORS[(hash >>> 0) % BG_COLORS.length];
}

Leaderboard.layout = workspace;
export default Leaderboard;