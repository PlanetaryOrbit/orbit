import axios from "axios";
import React from "react";
import { useRouter } from "next/router";
import { IconAlertTriangle, IconChevronRight } from "@tabler/icons-react";

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

interface InactiveUser {
  userId: number;
  username: string;
  reason: string;
  from: string | Date;
  to: string | Date;
  picture: string;
}

const NoticesWidget: React.FC = () => {
  const router = useRouter();
  const [inactiveUsers, setInactiveUsers] = React.useState<InactiveUser[]>([]);

  React.useEffect(() => {
    if (!router.query.id) return;
    axios
      .get(`/api/workspace/${router.query.id}/activity/users`)
      .then((res) => {
        const data = res.data?.message || {};
        setInactiveUsers((data.inactiveUsers || []).map((u: any) => ({
          ...u,
          from: typeof u.from === "string" ? u.from : new Date(u.from).toISOString(),
          to: typeof u.to === "string" ? u.to : new Date(u.to).toISOString(),
        })));
      })
      .catch((err) => {
        if (axios.isAxiosError(err) && err.response?.status === 403) {
          setInactiveUsers([]);
        } else {
          console.error("Error fetching inactive users:", err);
        }
      });
  }, [router.query.id]);

  const goToNotices = () => {
    router.push(`/workspace/${router.query.id}/notices`);
  };

  if (!inactiveUsers.length) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <IconAlertTriangle className="w-8 h-8 text-primary" />
        </div>
        <p className="text-lg font-medium text-zinc-900 dark:text-white mb-1">No active notices</p>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">No staff currently on notice</p>
        <button
          onClick={goToNotices}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          View Notices
          <IconChevronRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {inactiveUsers.slice(0, 5).map((u) => {
        const fromDate = new Date(u.from);
        const toDate = new Date(u.to);
        const duration = `${fromDate.toLocaleDateString()} → ${toDate.toLocaleDateString()}`;
        return (
          <div
            key={`${u.userId}-${u.from}`}
            className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden border border-zinc-200 dark:border-zinc-700"
          >
            <div className="p-4">
              <div className="flex items-start gap-3">
                <div
                  className={`rounded-lg h-10 w-10 flex items-center justify-center ${getRandomBg(
                    String(u.userId)
                  )}`}
                >
                  <img
                    src={u.picture || "/default-avatar.jpg"}
                    alt={`${u.username || "User"}'s avatar`}
                    className="rounded-lg h-10 w-10 object-cover border-2 border-white dark:border-zinc-800"
                    onError={(e) => {
                      e.currentTarget.src = "/default-avatar.jpg";
                    }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-base font-medium text-zinc-900 dark:text-white truncate">
                      {u.username || "Unknown"}
                    </p>
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200`}>On Notice</span>
                  </div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 truncate">Reason: {u.reason || "N/A"}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">{duration}</p>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default NoticesWidget;
