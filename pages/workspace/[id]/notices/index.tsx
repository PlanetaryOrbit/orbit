import workspace from "@/layouts/workspace";
import { pageWithLayout } from "@/layoutTypes";
import { loginState, workspacestate } from "@/state";
import axios from "axios";
import { useRouter } from "next/router";
import { useState, useMemo } from "react";
import randomText from "@/utils/randomText";
import { useRecoilState } from "recoil";
import toast, { Toaster } from "react-hot-toast";
import { InferGetServerSidePropsType } from "next";
import { withPermissionCheckSsr } from "@/utils/permissionsManager";
import prisma, { inactivityNotice, user } from "@/utils/database";
import moment from "moment";
import {
  IconCalendarTime,
  IconCheck,
  IconX,
  IconPlus,
  IconUsers,
  IconUserCircle,
  IconBug,
  IconHome,
  IconBook,
  IconChevronDown,
  IconChevronUp,
} from "@tabler/icons-react";

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

type NoticeWithUser = inactivityNotice & {
  user: user & {
    workspaceMemberships?: Array<{
      departmentMembers?: Array<{
        department: {
          id: string;
          name: string;
          color: string | null;
        };
      }>;
    }>;
  };
  reviewComment?: string | null;
};

export const getServerSideProps = withPermissionCheckSsr(
  async ({ params, req }) => {
    const userId = req.session?.userid;
    if (!userId) {
      return {
        props: {
          userNotices: [],
          allNotices: [],
        },
      };
    }

    const workspaceId = parseInt(params?.id as string);
    const userNotices = await prisma.inactivityNotice.findMany({
      where: {
        workspaceGroupId: workspaceId,
        userId: BigInt(userId),
      },
      orderBy: {
        startTime: "desc",
      },
      include: {
        user: true,
      },
    });

    let allNotices: any[] = [];
    const user = await prisma.user.findFirst({
      where: {
        userid: BigInt(userId),
      },
      include: {
        roles: {
          where: {
            workspaceGroupId: workspaceId,
          },
          orderBy: {
            isOwnerRole: "desc",
          },
        },
        workspaceMemberships: {
          where: {
            workspaceGroupId: workspaceId,
          },
        },
      },
    });

    const config = await prisma.config.findFirst({
      where: {
        workspaceGroupId: workspaceId,
        key: "notices",
      },
    });

    let noticesEnabled = false;
    if (config?.value) {
      let val = config.value;
      if (typeof val === "string") {
        try {
          val = JSON.parse(val);
        } catch {
          val = {};
        }
      }
      noticesEnabled =
        typeof val === "object" && val !== null && "enabled" in val
          ? (val as { enabled?: boolean }).enabled ?? false
          : false;
    }

    if (!noticesEnabled) {
      return { notFound: true };
    }

    const membership = user?.workspaceMemberships?.[0];
    const isAdmin = membership?.isAdmin || false;
    const hasApprovePermission = isAdmin || user?.roles.some(
      (role) => role.permissions.includes("approve_notices")
    );
    const hasManagePermission = isAdmin || user?.roles.some(
      (role) => role.permissions.includes("manage_notices")
    );
    const hasCreatePermission = isAdmin || user?.roles.some(
      (role) => role.permissions.includes("create_notices")
    );
    
    allNotices = await prisma.inactivityNotice.findMany({
      where: {
        workspaceGroupId: workspaceId,
      },
      orderBy: {
        startTime: "desc",
      },
      include: {
        user: {
          include: {
            workspaceMemberships: {
              where: {
                workspaceGroupId: workspaceId,
              },
              include: {
                departmentMembers: {
                  include: {
                    department: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return {
      props: {
        userNotices: JSON.parse(
          JSON.stringify(userNotices, (key, value) =>
            typeof value === "bigint" ? value.toString() : value
          )
        ) as NoticeWithUser[],
        allNotices: JSON.parse(
          JSON.stringify(allNotices, (key, value) =>
            typeof value === "bigint" ? value.toString() : value
          )
        ) as NoticeWithUser[],
        canApproveNotices: hasApprovePermission,
        canManageNotices: hasManagePermission,
        canCreateNotices: !!hasCreatePermission,
      },
    };
  },
  undefined
);

type pageProps = InferGetServerSidePropsType<typeof getServerSideProps>;

interface NoticesPageProps {
  userNotices: NoticeWithUser[];
  allNotices: NoticeWithUser[];
  canApproveNotices: boolean;
  canManageNotices: boolean;
  canCreateNotices: boolean;
}

const Notices: pageWithLayout<NoticesPageProps> = ({
  userNotices: initialUserNotices,
  allNotices: initialAllNotices,
  canApproveNotices,
  canManageNotices: canManageNoticesProp,
  canCreateNotices,
}) => {
  const router = useRouter();
  const { id } = router.query;
  const [login] = useRecoilState(loginState);
  const [workspace] = useRecoilState(workspacestate);
  const [userNotices, setUserNotices] = useState<NoticeWithUser[]>(
    initialUserNotices as NoticeWithUser[]
  );
  const [allNotices, setAllNotices] = useState<NoticeWithUser[]>(
    initialAllNotices as NoticeWithUser[]
  );
  const [activeTab, setActiveTab] = useState<"my-notices" | "manage-notices">(
    "my-notices"
  );
  const [isActiveExpanded, setIsActiveExpanded] = useState(false);
  const [isUpcomingExpanded, setIsUpcomingExpanded] = useState(false);

  const text = useMemo(() => randomText(login.displayname), []);
  const hasApproveAccess =
    canApproveNotices ||
    workspace.yourPermission?.includes("approve_notices") ||
    false;
  const hasManageAccess = canManageNoticesProp || workspace.yourPermission?.includes("manage_notices") || false;
  const [reason, setReason] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [selectedType, setSelectedType] = useState<
    "" | "holiday" | "sickness" | "personal" | "school" | "other"
  >("");

  const TYPE_LABELS: Record<string, string> = {
    holiday: "Holiday",
    sickness: "Sickness",
    personal: "Personal",
    school: "School",
    other: "Other",
  };

  const createNotice = async () => {
    if (!reason.trim() || !startTime || !endTime) {
      toast.error("Please fill in all fields");
      return;
    }

    if (new Date(startTime) >= new Date(endTime)) {
      toast.error("End time must be after start time");
      return;
    }

    setIsCreating(true);
    try {
      const start = new Date(startTime);
      const end = new Date(endTime);

      const res = await axios.post(
        `/api/workspace/${id}/activity/notices/create`,
        {
          startTime: start.getTime(),
          endTime: end.getTime(),
          reason: reason.trim(),
        }
      );

      if (res.data.success) {
        toast.success("Notice submitted for review!");
        setReason("");
        setStartTime("");
        setEndTime("");

        const updatedUserNotices = await axios.get(
          `/api/workspace/${id}/activity/notices/${login.userId}`
        );
        setUserNotices(updatedUserNotices.data.notices || []);

        if (hasApproveAccess) {
          window.location.reload();
        }
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to create notice");
    } finally {
      setIsCreating(false);
    }
  };

  const updateNotice = async (
    noticeId: string,
    status: "approve" | "deny" | "cancel"
  ) => {
    if (!id) return;

    try {
      const res = await axios.post(
        `/api/workspace/${id}/activity/notices/update`,
        {
          id: noticeId,
          status,
        }
      );

      if (res.data.success) {
        if (status === "cancel") {
          setAllNotices((prev) => prev.filter((n) => n.id !== noticeId));
        } else {
          window.location.reload();
        }
        toast.success("Notice updated!");
      }
    } catch {
      toast.error("Failed to update notice");
    }
  };

  const now = new Date();
  const myPendingNotices = userNotices.filter((n) => !n.reviewed);
  const myUpcomingNotices = userNotices.filter(
    (n) => n.reviewed && n.approved && new Date(n.startTime) > now
  );
  const myActiveNotices = userNotices.filter(
    (n) =>
      n.approved &&
      n.startTime &&
      n.endTime &&
      new Date(n.startTime) <= now &&
      new Date(n.endTime) >= now
  );
  const pendingNotices = allNotices.filter((n) => !n.reviewed);
  const upcomingNotices = allNotices.filter(
    (n) => n.reviewed && n.approved && new Date(n.startTime) > now
  );
  const activeNotices = allNotices.filter(
    (n) =>
      n.approved &&
      n.startTime &&
      n.endTime &&
      new Date(n.startTime) <= now &&
      new Date(n.endTime) >= now
  );

  return (
    <>
      <Toaster position="bottom-center" />
      <div className="pagePadding">
        <div className="max-w-5xl mx-auto">
          <header className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">
              Notices
            </h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {activeTab === "my-notices"
                ? "Request time off and see your notices"
                : "Review and manage team notices"}
            </p>
          </header>

          {(hasApproveAccess || hasManageAccess) && (
            <nav className="flex p-1 gap-0.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 w-fit mb-8">
              <button
                onClick={() => setActiveTab("my-notices")}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                  activeTab === "my-notices"
                    ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-white"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                }`}
              >
                <IconUserCircle className="w-4 h-4 shrink-0" />
                <span>My Notices</span>
              </button>
              <button
                onClick={() => setActiveTab("manage-notices")}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                  activeTab === "manage-notices"
                    ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-white"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                }`}
              >
                <IconUsers className="w-4 h-4 shrink-0" />
                <span>Manage Notices</span>
                {pendingNotices.length > 0 && (
                  <span className="min-w-[1.25rem] h-5 px-1.5 flex items-center justify-center text-xs font-semibold rounded-full bg-amber-500 text-white">
                    {pendingNotices.length}
                  </span>
                )}
              </button>
            </nav>
          )}
          {(!(hasApproveAccess || hasManageAccess) || activeTab === "my-notices") && (
            <>
              {myActiveNotices.length > 0 && (
                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 p-6 mb-8">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="shrink-0 w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
                      <IconCalendarTime className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-zinc-900 dark:text-white">
                        Active notices
                      </h2>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        Your currently approved time off
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    {myActiveNotices.map((notice) => (
                      <div
                        key={notice.id}
                        className="flex flex-col items-center gap-2 rounded-xl border border-zinc-100 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 p-4"
                      >
                        <div
                          className={`w-14 h-14 rounded-full flex items-center justify-center overflow-hidden ring-2 ring-white dark:ring-zinc-700 ${getRandomBg(
                            notice.user?.userid?.toString() ?? ""
                          )}`}
                        >
                          <img
                            src={notice.user?.picture ?? "/default-avatar.jpg"}
                            alt={notice.user?.username ?? "User"}
                            className="w-14 h-14 object-cover rounded-full"
                          />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium text-zinc-900 dark:text-white">
                            {notice.user?.username}
                          </p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            {moment(notice.startTime!).format("MMM D")} – {moment(notice.endTime!).format("MMM D")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 p-6 mb-8">
                  {canCreateNotices ? (
                <>
                <div className="flex items-center gap-3 mb-5">
                  <div className="shrink-0 w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center">
                    <IconPlus className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-zinc-900 dark:text-white">
                      Request time off
                    </h2>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                      Submit a request for your leadership team to review.
                    </p>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Type
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {(["holiday", "sickness", "personal", "school", "other"] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => {
                          setSelectedType(t);
                          setReason(t === "other" ? "" : TYPE_LABELS[t]);
                        }}
                        className={`px-3 py-2 text-sm font-medium rounded-xl transition-colors flex items-center gap-2 ${
                          selectedType === t
                            ? "bg-zinc-900 dark:bg-zinc-600 text-white"
                            : "bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-600"
                        }`}
                      >
                        {t === "holiday" && <IconCalendarTime className="w-4 h-4" />}
                        {t === "sickness" && <IconBug className="w-4 h-4" />}
                        {t === "personal" && <IconHome className="w-4 h-4" />}
                        {t === "school" && <IconBook className="w-4 h-4" />}
                        {t === "other" && <IconPlus className="w-4 h-4" />}
                        {TYPE_LABELS[t]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                      Start date
                    </label>
                    <input
                      type="date"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full px-3 py-2.5 border border-zinc-200 dark:border-zinc-600 rounded-xl bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      min={moment().format("YYYY-MM-DD")}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                      End date
                    </label>
                    <input
                      type="date"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full px-3 py-2.5 border border-zinc-200 dark:border-zinc-600 rounded-xl bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      min={startTime || moment().format("YYYY-MM-DD")}
                    />
                  </div>
                </div>

                {selectedType !== "" && (
                  <div className="mb-5">
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                      Reason
                    </label>
                    {selectedType !== "other" ? (
                      <div className="w-full px-3 py-2.5 border border-zinc-200 dark:border-zinc-600 rounded-xl bg-zinc-50 dark:bg-zinc-700/50 text-zinc-900 dark:text-white">
                        {TYPE_LABELS[selectedType] ?? reason}
                      </div>
                    ) : (
                      <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="w-full px-3 py-2.5 border border-zinc-200 dark:border-zinc-600 rounded-xl bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white resize-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        rows={3}
                        placeholder="Brief explanation for your requested time off..."
                      />
                    )}
                  </div>
                )}

                <button
                  onClick={createNotice}
                  disabled={
                    isCreating || !reason.trim() || !startTime || !endTime
                  }
                  className="px-4 py-2.5 text-sm font-medium bg-primary text-white rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isCreating ? "Submitting…" : "Submit request"}
                </button>
                </>
                ) : (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    You don't have permission to create notices.
                  </p>
                )}
              </div>

              {userNotices.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-base font-semibold text-zinc-900 dark:text-white mb-4">
                    Your requests
                  </h3>
                  <div className="space-y-4">
                    {userNotices.map((notice) => (
                      <div
                        key={notice.id}
                        className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 p-5"
                      >
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                            <IconCalendarTime className="w-4 h-4 shrink-0" />
                            <span>
                              {moment(notice.startTime!).format("MMM D")} – {moment(notice.endTime!).format("MMM D, YYYY")}
                            </span>
                          </div>
                          <span
                            className={`shrink-0 px-2.5 py-1 text-xs font-medium rounded-lg ${
                              !notice.reviewed
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300"
                                : notice.approved
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300"
                                : "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300"
                            }`}
                          >
                            {!notice.reviewed ? "Pending" : notice.approved ? "Approved" : "Denied"}
                          </span>
                        </div>
                        <p className="text-sm text-zinc-700 dark:text-zinc-300">
                          {notice.reason}
                        </p>
                        {notice.reviewed && !notice.approved && notice.reviewComment && (
                          <div className="mt-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 p-3">
                            <p className="text-sm text-red-700 dark:text-red-300">
                              <span className="font-medium">Review comment:</span> {notice.reviewComment}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
          {(hasApproveAccess || hasManageAccess) && activeTab === "manage-notices" && (
            <>
              {pendingNotices.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-base font-semibold text-zinc-900 dark:text-white mb-4">
                    Pending notices
                  </h2>
                  <div className="space-y-4">
                    {pendingNotices.map((notice) => (
                      <div
                        key={notice.id}
                        className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 p-5"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div
                            className={`w-11 h-11 rounded-xl flex items-center justify-center overflow-hidden shrink-0 ${getRandomBg(
                              notice.user?.userid?.toString() ?? ""
                            )}`}
                          >
                            <img
                              src={notice.user?.picture ?? "/default-avatar.jpg"}
                              alt={notice.user?.username ?? "User"}
                              className="w-11 h-11 object-cover"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-sm font-semibold text-zinc-900 dark:text-white">
                                {notice.user?.username}
                              </h4>
                              {notice.user?.workspaceMemberships?.[0]?.departmentMembers?.map((dm: any) => (
                                <span
                                  key={dm.department.id}
                                  className="px-2 py-0.5 text-xs font-medium rounded-lg text-white/95"
                                  style={{ backgroundColor: dm.department.color || "#71717a" }}
                                >
                                  {dm.department.name}
                                </span>
                              ))}
                            </div>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                              Awaiting review
                            </p>
                          </div>
                        </div>
                        <div className="rounded-xl bg-zinc-50 dark:bg-zinc-700/50 p-3 mb-4">
                          <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 mb-1">
                            <IconCalendarTime className="w-4 h-4 shrink-0" />
                            <span>
                              {moment(notice.startTime!).format("MMM D")} – {moment(notice.endTime!).format("MMM D, YYYY")}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-zinc-900 dark:text-white">
                            {notice.reason}
                          </p>
                        </div>
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={() => updateNotice(notice.id, "approve")}
                            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                          >
                            <IconCheck className="w-4 h-4" />
                            Approve
                          </button>
                          <button
                            onClick={() => updateNotice(notice.id, "deny")}
                            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl bg-red-600 text-white hover:bg-red-700 transition-colors"
                          >
                            <IconX className="w-4 h-4" />
                            Deny
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeNotices.length > 0 && (
                <div className="mb-8">
                  <button
                    onClick={() => setIsActiveExpanded(!isActiveExpanded)}
                    className="flex items-center justify-between w-full text-left py-2 group"
                  >
                    <h3 className="text-base font-semibold text-zinc-900 dark:text-white">
                      Active now ({activeNotices.length})
                    </h3>
                    {isActiveExpanded ? (
                      <IconChevronUp className="w-5 h-5 text-zinc-500 transition-colors" />
                    ) : (
                      <IconChevronDown className="w-5 h-5 text-zinc-500 transition-colors" />
                    )}
                  </button>
                  {isActiveExpanded && (
                    <div className="rounded-2xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-500/5 p-5 mt-2">
                      <div className="space-y-4">
                        {activeNotices.map((notice) => (
                          <div
                            key={notice.id}
                            className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 p-4"
                          >
                            <div className="flex items-center gap-3 mb-3">
                              <div
                                className={`w-10 h-10 rounded-xl overflow-hidden shrink-0 ${getRandomBg(
                                  notice.user?.userid?.toString() ?? ""
                                )}`}
                              >
                                <img
                                  src={notice.user?.picture ?? "/default-avatar.jpg"}
                                  alt={notice.user?.username ?? "User"}
                                  className="w-10 h-10 object-cover"
                                />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="text-sm font-medium text-zinc-900 dark:text-white">
                                    {notice.user?.username}
                                  </h4>
                                  {notice.user?.workspaceMemberships?.[0]?.departmentMembers?.map((dm: any) => (
                                    <span
                                      key={dm.department.id}
                                      className="px-2 py-0.5 text-xs font-medium rounded-lg text-white/95"
                                      style={{ backgroundColor: dm.department.color || "#71717a" }}
                                    >
                                      {dm.department.name}
                                    </span>
                                  ))}
                                </div>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                                  {moment(notice.startTime!).format("MMM D")} – {moment(notice.endTime!).format("MMM D, YYYY")} · {notice.reason}
                                </p>
                              </div>
                              {hasManageAccess && (
                                <button
                                  onClick={() => updateNotice(notice.id, "cancel")}
                                  className="shrink-0 px-3 py-2 text-sm font-medium rounded-xl bg-red-600 text-white hover:bg-red-700 transition-colors"
                                >
                                  Revoke
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {upcomingNotices.length > 0 && (
                <div className="mb-8">
                  <button
                    onClick={() => setIsUpcomingExpanded(!isUpcomingExpanded)}
                    className="flex items-center justify-between w-full text-left py-2 group"
                  >
                    <h3 className="text-base font-semibold text-zinc-900 dark:text-white">
                      Upcoming ({upcomingNotices.length})
                    </h3>
                    {isUpcomingExpanded ? (
                      <IconChevronUp className="w-5 h-5 text-zinc-500 transition-colors" />
                    ) : (
                      <IconChevronDown className="w-5 h-5 text-zinc-500 transition-colors" />
                    )}
                  </button>
                  {isUpcomingExpanded && (
                    <div className="space-y-4 mt-2">
                      {upcomingNotices.map((notice) => (
                        <div
                          key={notice.id}
                          className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 p-4"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-10 h-10 rounded-xl overflow-hidden shrink-0 ${getRandomBg(
                                notice.user?.userid?.toString() ?? ""
                              )}`}
                            >
                              <img
                                src={notice.user?.picture ?? "/default-avatar.jpg"}
                                alt={notice.user?.username ?? "User"}
                                className="w-10 h-10 object-cover"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-sm font-medium text-zinc-900 dark:text-white">
                                  {notice.user?.username}
                                </h4>
                                {notice.user?.workspaceMemberships?.[0]?.departmentMembers?.map((dm: any) => (
                                  <span
                                    key={dm.department.id}
                                    className="px-2 py-0.5 text-xs font-medium rounded-lg text-white/95"
                                    style={{ backgroundColor: dm.department.color || "#71717a" }}
                                  >
                                    {dm.department.name}
                                  </span>
                                ))}
                              </div>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                                {moment(notice.startTime!).format("MMM D")} – {moment(notice.endTime!).format("MMM D, YYYY")} · {notice.reason}
                              </p>
                            </div>
                            {hasManageAccess && (
                              <button
                                onClick={() => updateNotice(notice.id, "cancel")}
                                className="shrink-0 px-3 py-2 text-sm font-medium rounded-xl bg-zinc-100 dark:bg-zinc-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                              >
                                Revoke
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {pendingNotices.length === 0 &&
                upcomingNotices.length === 0 &&
                activeNotices.length === 0 && (
                  <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 p-12 text-center max-w-md mx-auto">
                    <div className="mx-auto w-14 h-14 rounded-2xl bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center mb-4">
                      <IconCalendarTime className="w-7 h-7 text-zinc-500 dark:text-zinc-400" />
                    </div>
                    <h3 className="text-base font-semibold text-zinc-900 dark:text-white mb-1">
                      All caught up
                    </h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      No pending, active, or upcoming notices right now.
                    </p>
                  </div>
                )}
            </>
          )}
        </div>
      </div>
    </>
  );
};

Notices.layout = workspace;
export default Notices;