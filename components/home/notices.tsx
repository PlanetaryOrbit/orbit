import axios from "axios";
import React from "react";
import { useRouter } from "next/router";
import { HomeEmpty, HomeList, HomeListItem } from "@/components/home/shell";

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
  const workspaceId = router.query.id as string;
  const [inactiveUsers, setInactiveUsers] = React.useState<InactiveUser[]>([]);

  React.useEffect(() => {
    if (!workspaceId) return;
    axios
      .get(`/api/workspace/${workspaceId}/activity/users`)
      .then((res) => {
        const data = res.data?.message || {};
        setInactiveUsers(
          (data.inactiveUsers || []).map((u: InactiveUser) => ({
            ...u,
            from: typeof u.from === "string" ? u.from : new Date(u.from).toISOString(),
            to: typeof u.to === "string" ? u.to : new Date(u.to).toISOString(),
          }))
        );
      })
      .catch((err) => {
        if (!axios.isAxiosError(err) || err.response?.status !== 403) {
          console.error("Error fetching inactive users:", err);
        }
        setInactiveUsers([]);
      });
  }, [workspaceId]);

  if (!inactiveUsers.length) {
    return (
      <HomeEmpty
        action={{
          label: "View notices",
          onClick: () => router.push(`/workspace/${workspaceId}/notices`),
        }}
      >
        No one is on notice right now.
      </HomeEmpty>
    );
  }

  return (
    <HomeList>
      {inactiveUsers.slice(0, 5).map((u) => {
        const fromDate = new Date(u.from);
        const toDate = new Date(u.to);
        return (
          <HomeListItem key={`${u.userId}-${u.from}`}>
            <div className="flex items-start gap-3">
              <img
                src={u.picture || "/default-avatar.jpg"}
                alt=""
                className="h-9 w-9 shrink-0 rounded-md object-cover bg-zinc-100 dark:bg-zinc-700"
                onError={(e) => {
                  e.currentTarget.src = "/default-avatar.jpg";
                }}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                  {u.username || "Unknown"}
                </p>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400 truncate">
                  {u.reason || "No reason given"}
                </p>
                <p className="text-[11px] text-zinc-400 dark:text-zinc-500 tabular-nums">
                  {fromDate.toLocaleDateString()} – {toDate.toLocaleDateString()}
                </p>
              </div>
            </div>
          </HomeListItem>
        );
      })}
    </HomeList>
  );
};

export default NoticesWidget;
