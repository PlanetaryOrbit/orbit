import workspace from "@/layouts/workspace";
import { pageWithLayout } from "@/layoutTypes";
import { loginState } from "@/state";
import axios from "axios";
import { useRouter } from "next/router";
import { useEffect, useState, useMemo } from "react";
import { useRecoilState } from "recoil";
import { GetServerSideProps } from "next";
import { withPermissionCheckSsr } from "@/utils/permissionsManager";
import prisma from "@/utils/database";
import {
  IconTrophy,
  IconUsers,
  IconMedal,
  IconCrown,
  IconAward,
  IconUserCircle,
  IconLaurelWreath1,
} from "@tabler/icons-react";
import randomText from "@/utils/randomText";
import Tooltip from "@/components/tooltip";
import moment from "moment";

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
    const userid = context.req.session.userid;

    if (!userid) {
      return {
        redirect: {
          destination: "/login",
        },
      };
    }

    if (!id) {
      return {
        notFound: true,
      };
    }

    const user = await prisma.user.findFirst({
      where: {
        userid: userid,
      },
      include: {
        roles: {
          where: {
            workspaceGroupId: parseInt(id as string),
          },
        },
      },
    });

    if (!user) {
      return {
        redirect: {
          destination: "/login",
        },
      };
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
        try {
          val = JSON.parse(val);
        } catch {
          val = {};
        }
      }
      leaderboardEnabled =
        typeof val === "object" && val !== null && "enabled" in val
          ? (val as { enabled?: boolean }).enabled ?? false
          : false;
    }

    if (!leaderboardEnabled) {
      return { notFound: true };
    }

    return {
      props: {},
    };
  },
);

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

        setTopStaff(usersRes.data.message.topStaff);
        setActiveUsers(usersRes.data.message.activeUsers);
        setInactiveUsers(usersRes.data.message.inactiveUsers);
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
    switch (position) {
      case 0:
        return <IconCrown className="w-8 h-8 text-yellow-500" />;
      case 1:
        return <IconMedal className="w-7 h-7 text-gray-400" />;
      case 2:
        return <IconAward className="w-6 h-6 text-amber-600" />;
      default:
        return null;
    }
  };

  const getPodiumHeight = (position: number) => {
    switch (position) {
      case 0:
        return "h-32";
      case 1:
        return "h-24";
      case 2:
        return "h-20";
      default:
        return "h-16";
    }
  };

  const getPodiumColors = (position: number) => {
    switch (position) {
      case 0:
        return "bg-gradient-to-t from-yellow-400 to-yellow-300 border-yellow-500";
      case 1:
        return "bg-gradient-to-t from-gray-400 to-gray-300 border-gray-500";
      case 2:
        return "bg-gradient-to-t from-amber-600 to-amber-500 border-amber-700";
      default:
        return "bg-gradient-to-t from-zinc-300 to-zinc-200 border-zinc-400";
    }
  };

  if (loading) {
    return (
      <div className="pagePadding">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pagePadding">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-primary/10 p-3 rounded-xl">
            <IconTrophy className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
              Leaderboard
            </h1>
            <p className="text-lg text-zinc-500 dark:text-zinc-400 mt-1">
              Top performers and workspace statistics
            </p>
          </div>
        </div>
        {topStaff.length > 0 && (
          <div className="mb-12">
            <div className="flex items-end justify-center gap-4 sm:gap-6 mb-8">
              {topStaff[1] && (
                <div className="flex flex-col items-center flex-1 max-w-[120px]">
                  <div className="relative mb-4">
                    <button
                      type="button"
                      onClick={() => goToProfile(topStaff[1].userId)}
                      aria-label={`Open ${topStaff[1].username}'s profile`}
                      className={`w-20 h-20 rounded-full flex items-center justify-center ${getRandomBg(
                        topStaff[1].userId
                      )} cursor-pointer`}
                    >
                      <img
                        src={topStaff[1].picture}
                        alt={topStaff[1].username}
                        className="w-20 h-20 rounded-full border-4 border-gray-400 shadow-lg object-cover"
                        style={{ background: "transparent" }}
                      />
                    </button>
                    <div className="absolute -top-2 -right-2 bg-white dark:bg-zinc-800 rounded-full p-1">
                      {getPodiumIcon(1)}
                    </div>
                  </div>
                  <div
                    className={`${getPodiumHeight(1)} ${getPodiumColors(
                      1
                    )} border-2 rounded-t-lg w-24 flex flex-col items-center justify-center shadow-lg`}
                  >
                    <span className="text-white font-bold text-lg">2</span>
                  </div>
                  <div className="mt-4 text-center">
                    <p className="font-semibold text-zinc-900 dark:text-white">
                      {topStaff[1].username}
                    </p>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      {(() => {
                        const minutes = Math.floor(topStaff[1].ms / 1000 / 60);
                        return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
                      })()}
                    </p>
                  </div>
                </div>
              )}
              <div className="flex flex-col items-center flex-1 max-w-[140px]">
                <div className="relative mb-4">
                  <button
                    type="button"
                    onClick={() => goToProfile(topStaff[0].userId)}
                    aria-label={`Open ${topStaff[0].username}'s profile`}
                    className={`w-24 h-24 rounded-full flex items-center justify-center ${getRandomBg(
                      topStaff[0].userId
                    )} cursor-pointer`}
                  >
                    <img
                      src={topStaff[0].picture}
                      alt={topStaff[0].username}
                      className="w-24 h-24 rounded-full border-4 border-yellow-400 shadow-xl object-cover"
                      style={{ background: "transparent" }}
                    />
                  </button>
                  <div className="absolute -top-3 -right-3 bg-white dark:bg-zinc-800 rounded-full p-2">
                    {getPodiumIcon(0)}
                  </div>
                </div>
                <div
                  className={`${getPodiumHeight(0)} ${getPodiumColors(
                    0
                  )} border-2 rounded-t-lg w-28 flex flex-col items-center justify-center shadow-xl relative`}
                >
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div className="bg-yellow-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                      CHAMPION
                    </div>
                  </div>
                  <span className="text-white font-bold text-xl">1</span>
                </div>
                <div className="mt-4 text-center">
                  <p className="font-bold text-lg text-zinc-900 dark:text-white">
                    {topStaff[0].username}
                  </p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    {(() => {
                      const minutes = Math.floor(topStaff[0].ms / 1000 / 60);
                      return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
                    })()}
                  </p>
                </div>
              </div>
              {topStaff[2] && (
                <div className="flex flex-col items-center flex-1 max-w-[120px]">
                  <div className="relative mb-4">
                    <button
                      type="button"
                      onClick={() => goToProfile(topStaff[2].userId)}
                      aria-label={`Open ${topStaff[2].username}'s profile`}
                      className={`w-20 h-20 rounded-full flex items-center justify-center ${getRandomBg(
                        topStaff[2].userId
                      )} cursor-pointer`}
                    >
                      <img
                        src={topStaff[2].picture}
                        alt={topStaff[2].username}
                        className="w-20 h-20 rounded-full border-4 border-amber-600 shadow-lg object-cover"
                        style={{ background: "transparent" }}
                      />
                    </button>
                    <div className="absolute -top-2 -right-2 bg-white dark:bg-zinc-800 rounded-full p-1">
                      {getPodiumIcon(2)}
                    </div>
                  </div>
                  <div
                    className={`${getPodiumHeight(2)} ${getPodiumColors(
                      2
                    )} border-2 rounded-t-lg w-20 flex flex-col items-center justify-center shadow-lg`}
                  >
                    <span className="text-white font-bold text-base">3</span>
                  </div>
                  <div className="mt-4 text-center">
                    <p className="font-semibold text-zinc-900 dark:text-white">
                      {topStaff[2].username}
                    </p>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      {(() => {
                        const minutes = Math.floor(topStaff[2].ms / 1000 / 60);
                        return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
                      })()}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        <div className="bg-white dark:bg-zinc-800 border border-white/10 rounded-xl p-6 shadow-sm mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-primary/10 p-2 rounded-lg">
              <IconLaurelWreath1 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-zinc-900 dark:text-white">
                Runners Up
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Close behind the top 5
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {topStaff.length > 3 ? (
              topStaff.slice(3, 8).map((user: any, index: number) => {
                const actualPosition = index + 4;
                return (
                  <div
                    key={user.userId}
                    className="flex items-center justify-between p-3 sm:p-4 rounded-lg bg-zinc-50 dark:bg-zinc-700 transition-all gap-2"
                  >
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                      <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full font-bold bg-zinc-300 dark:bg-zinc-600 text-zinc-700 dark:text-zinc-300 text-sm sm:text-base flex-shrink-0">
                        {actualPosition}
                      </div>
                      <button
                        type="button"
                        onClick={() => goToProfile(user.userId)}
                        aria-label={`Open ${user.username}'s profile`}
                        className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center flex-shrink-0 ${getRandomBg(
                          user.userId
                        )} cursor-pointer`}
                      >
                        <img
                          src={user.picture}
                          alt={user.username}
                          className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-white dark:border-zinc-700 shadow-sm object-cover"
                          style={{ background: "transparent" }}
                        />
                      </button>
                      <div className="min-w-0 flex-1">
                        <span className="font-semibold text-sm sm:text-base text-zinc-900 dark:text-white truncate block">
                          {user.username}
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-sm sm:text-lg text-zinc-900 dark:text-white whitespace-nowrap">
                        {(() => {
                          const minutes = Math.floor(user.ms / 1000 / 60);
                          return `${minutes}m`;
                        })()}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-center text-zinc-500 dark:text-zinc-400 italic py-8">
                Not enough staff for runners up
              </p>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
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
              className="bg-white dark:bg-zinc-800 rounded-xl p-6 shadow-sm"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-base font-medium text-zinc-900 dark:text-white">
                    {title}
                  </h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {subtitle}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {users.map((user: any) => (
                  <Tooltip
                    key={user.userId}
                    tooltipText={
                      user.reason
                        ? `${user.username} | ${moment(user.from).format(
                            "DD MMM"
                          )} - ${moment(user.to).format("DD MMM")}`
                        : `${user.username}`
                    }
                    orientation="top"
                  >
                    <button
                      type="button"
                      onClick={() => goToProfile(user.userId)}
                      aria-label={`Open ${user.username}'s profile`}
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${getRandomBg(
                        user.userId
                      )} ring-2 ring-primary/10 hover:ring-primary/30 transition-all cursor-pointer`}
                    >
                      <img
                        src={user.picture}
                        alt={user.username}
                        className="w-10 h-10 rounded-full object-cover border-2 border-white"
                        style={{ background: "transparent" }}
                      />
                    </button>
                  </Tooltip>
                ))}
                {users.length === 0 && (
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


Leaderboard.layout = workspace;
export default Leaderboard;
