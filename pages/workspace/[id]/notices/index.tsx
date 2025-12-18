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
} from "@tabler/icons-react";

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

type NoticeWithUser = inactivityNotice & {
  user: user;
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

    const hasManagePermission = user?.roles.some(
      (role) => role.isOwnerRole || role.permissions.includes("manage_activity")
    );
    if (hasManagePermission) {
      allNotices = await prisma.inactivityNotice.findMany({
        where: {
          workspaceGroupId: workspaceId,
        },
        orderBy: {
          startTime: "desc",
        },
        include: {
          user: true,
        },
      });
    }

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
        canManageNotices: hasManagePermission,
      },
    };
  }
);

type pageProps = InferGetServerSidePropsType<typeof getServerSideProps>;

interface NoticesPageProps {
  userNotices: NoticeWithUser[];
  allNotices: NoticeWithUser[];
  canManageNotices: boolean;
}

const Notices: pageWithLayout<NoticesPageProps> = ({
  userNotices: initialUserNotices,
  allNotices: initialAllNotices,
  canManageNotices: canManageNoticesProp,
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

  const text = useMemo(() => randomText(login.displayname), []);
  const canManageNotices: boolean = canManageNoticesProp || false;
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

        if (canManageNotices) {
          window.location.reload();
        }
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to create notice");
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

  const renderManageNoticeSection = (
    title: string,
    list: NoticeWithUser[],
    showCancel: boolean
  ) => (
    <div className="mb-10">
      <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-4">
        {title}
      </h3>
      {list.length === 0 ? (
        <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm p-6 text-center text-zinc-500 dark:text-zinc-400">
          No {title.toLowerCase()}
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {list.map((notice) => (
            <div
              key={notice.id}
              className="bg-white dark:bg-zinc-700 rounded-xl p-5 shadow-sm hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${getRandomBg(
                    notice.user?.userid?.toString() ?? ""
                  )} ring-2 ring-transparent hover:ring-primary transition overflow-hidden`}
                >
                  <img
                    src={notice.user?.picture ?? "/default-avatar.jpg"}
                    alt={notice.user?.username ?? "User"}
                    className="w-10 h-10 object-cover rounded-full border-2 border-white"
                  />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-zinc-900 dark:text-white">
                    {notice.user?.username}
                  </h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {title.split(" ")[0]} period
                  </p>
                </div>
              </div>

              <div className="bg-zinc-50 dark:bg-zinc-600 rounded-lg p-3 mb-3">
                <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300 mb-1">
                  <IconCalendarTime className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
                  <span>
                    {moment(notice.startTime!).format("MMM Do")} -{" "}
                    {moment(notice.endTime!).format("MMM Do YYYY")}
                  </span>
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-300">
                  {notice.reason}
                </p>
              </div>

              <div className="flex gap-2">
                {showCancel ? (
                  <button
                    onClick={() => updateNotice(notice.id, "cancel")}
                    className="flex-1 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 text-sm font-medium"
                  >
                    Revoke
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => updateNotice(notice.id, "approve")}
                      className="flex-1 px-3 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 text-sm font-medium"
                    >
                      <IconCheck className="w-4 h-4 inline-block mr-1 text-primary" />
                      Approve
                    </button>
                    <button
                      onClick={() => updateNotice(notice.id, "deny")}
                      className="flex-1 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 text-sm font-medium"
                    >
                      <IconX className="w-4 h-4 inline-block mr-1 text-red-600" />
                      Deny
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <>
      <Toaster position="bottom-center" />
      <div className="pagePadding">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <div>
              <h1 className="text-2xl font-medium text-zinc-900 dark:text-white">
                Notices
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                {activeTab === "my-notices" ? "Manage your inactivity notices" : "Review and manage team notices"}
              </p>
            </div>
          </div>
          {canManageNotices && (
            <div className="flex p-1 gap-1 bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700 rounded-lg mb-6">
              <button
                onClick={() => setActiveTab("my-notices")}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === "my-notices"
                    ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-white"
                    : "text-zinc-600 dark:text-zinc-300 hover:bg-white/70 dark:hover:bg-zinc-800/80"
                }`}
              >
                <IconUserCircle className="w-4 h-4" />
                <span>My Notices</span>
              </button>
              <button
                onClick={() => setActiveTab("manage-notices")}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === "manage-notices"
                    ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-white"
                    : "text-zinc-600 dark:text-zinc-300 hover:bg-white/70 dark:hover:bg-zinc-800/80"
                }`}
              >
                <IconUsers className="w-4 h-4" />
                <span>Manage Notices</span>
              </button>
            </div>
          )}
          {(!canManageNotices || activeTab === "my-notices") && (
            <>
              {myActiveNotices.length > 0 && (
                <div className="bg-white dark:bg-zinc-800 border border-white/10 rounded-xl p-6 shadow-sm mb-8">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-primary/10 p-2 rounded-lg">
                      <IconCalendarTime className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                        Active Notices
                      </h2>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        Currently approved inactivity periods.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    {myActiveNotices.map((notice) => (
                      <div
                        key={notice.id}
                        className="flex flex-col items-center gap-2 bg-zinc-50 dark:bg-zinc-800/60 rounded-lg p-4 shadow-sm"
                      >
                        <div
                          className={`w-16 h-16 rounded-full flex items-center justify-center ${getRandomBg(
                            notice.user?.userid?.toString() ?? ""
                          )} ring-2 ring-white dark:ring-zinc-700 overflow-hidden`}
                        >
                          <img
                            src={notice.user?.picture ?? "/default-avatar.jpg"}
                            alt={notice.user?.username ?? "User"}
                            className="w-16 h-16 object-cover rounded-full"
                          />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium text-zinc-900 dark:text-white">
                            {notice.user?.username}
                          </p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            {moment(notice.startTime!).format("MMM Do")} -{" "}
                            {moment(notice.endTime!).format("MMM Do")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-white dark:bg-zinc-800 border border-white/10 rounded-xl p-6 shadow-sm mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-primary/10 p-2 rounded-lg">
                    <IconPlus className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                      Request Inactivity Notice
                    </h2>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      Submit a time-off request for review by your leadership team.
                    </p>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Type
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => {
                        setSelectedType("holiday");
                        setReason("Holiday");
                      }}
                      className={`px-3 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
                        selectedType === "holiday"
                          ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm"
                          : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                      }`}
                    >
                      <IconCalendarTime className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                      Holiday
                    </button>

                    <button
                      onClick={() => {
                        setSelectedType("sickness");
                        setReason("Sickness");
                      }}
                      className={`px-3 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
                        selectedType === "sickness"
                          ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm"
                          : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                      }`}
                    >
                      <IconBug className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                      Sickness
                    </button>

                    <button
                      onClick={() => {
                        setSelectedType("personal");
                        setReason("Personal");
                      }}
                      className={`px-3 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
                        selectedType === "personal"
                          ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm"
                          : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                      }`}
                    >
                      <IconHome className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                      Personal
                    </button>

                    <button
                      onClick={() => {
                        setSelectedType("school");
                        setReason("School");
                      }}
                      className={`px-3 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
                        selectedType === "school"
                          ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm"
                          : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                      }`}
                    >
                      <IconBook className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                      School
                    </button>

                    <button
                      onClick={() => {
                        setSelectedType("other");
                        setReason("");
                      }}
                      className={`px-3 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
                        selectedType === "other"
                          ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm"
                          : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                      }`}
                    >
                      <IconPlus className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                      Other
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white"
                      min={moment().format("YYYY-MM-DD")}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white"
                      min={startTime || moment().format("YYYY-MM-DD")}
                    />
                  </div>
                </div>

                {selectedType !== "" && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                      Reason for Inactivity
                    </label>
                    {selectedType !== "other" ? (
                      <div className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white">
                        {TYPE_LABELS[selectedType] ?? reason}
                      </div>
                    ) : (
                      <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white resize-none"
                        rows={3}
                        placeholder="Please provide a brief explanation for your requested inactivity period..."
                      />
                    )}
                  </div>
                )}

                <button
                  onClick={createNotice}
                  disabled={
                    isCreating || !reason.trim() || !startTime || !endTime
                  }
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreating ? "Submitting..." : "Submit Notice"}
                </button>
              </div>

              {userNotices.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
                    My Submitted Notices
                  </h3>
                  <div className="grid gap-4">
                    {userNotices.map((notice) => (
                      <div
                        key={notice.id}
                        className="bg-white dark:bg-zinc-700 rounded-xl p-5 shadow-sm"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
                            <IconCalendarTime className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
                            <span>
                              {moment(notice.startTime!).format("MMM Do")} -{" "}
                              {moment(notice.endTime!).format("MMM Do YYYY")}
                            </span>
                          </div>
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${
                              !notice.reviewed
                                ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
                                : notice.approved
                                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                                : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                            }`}
                          >
                            {!notice.reviewed
                              ? "Pending"
                              : notice.approved
                              ? "Approved"
                              : "Denied"}
                          </span>
                        </div>
                        <p className="text-sm text-zinc-700 dark:text-zinc-300 mb-3">
                          {notice.reason}
                        </p>
                        {notice.reviewed &&
                          !notice.approved &&
                          notice.reviewComment && (
                            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-3">
                              <p className="text-sm text-red-700 dark:text-red-300">
                                <strong>Review comment:</strong>{" "}
                                {notice.reviewComment}
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
          {canManageNotices && activeTab === "manage-notices" && (
            <>
              {activeNotices.length > 0 && (
                <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 dark:from-emerald-500/20 dark:to-emerald-500/10 border border-emerald-500/20 rounded-xl p-6 shadow-sm mb-8">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-emerald-500/20 p-2 rounded-lg">
                      <IconCalendarTime className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <h2 className="text-lg font-medium text-zinc-900 dark:text-white">
                      Currently Active Notices
                    </h2>
                  </div>
                  <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                    {activeNotices.map((notice) => (
                      <div
                        key={notice.id}
                        className="bg-white dark:bg-zinc-700 rounded-xl p-5 shadow-sm hover:shadow-md transition-all"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center ${getRandomBg(
                              notice.user?.userid?.toString() ?? ""
                            )} ring-2 ring-transparent hover:ring-primary transition overflow-hidden`}
                          >
                            <img
                              src={notice.user?.picture ?? "/default-avatar.jpg"}
                              alt={notice.user?.username ?? "User"}
                              className="w-10 h-10 object-cover rounded-full border-2 border-white"
                            />
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-zinc-900 dark:text-white">
                              {notice.user?.username}
                            </h4>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                              Active period
                            </p>
                          </div>
                        </div>

                        <div className="bg-zinc-50 dark:bg-zinc-600 rounded-lg p-3 mb-3">
                          <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300 mb-1">
                            <IconCalendarTime className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
                            <span>
                              {moment(notice.startTime!).format("MMM Do")} -{" "}
                              {moment(notice.endTime!).format("MMM Do YYYY")}
                            </span>
                          </div>
                          <p className="text-sm text-zinc-600 dark:text-zinc-300">
                            {notice.reason}
                          </p>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => updateNotice(notice.id, "cancel")}
                            className="flex-1 px-3 py-2 text-sm font-medium rounded-md bg-red-600 text-white hover:bg-red-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500/60"
                          >
                            Revoke
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {pendingNotices.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-4">
                    Pending Notices
                  </h3>
                  <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                    {pendingNotices.map((notice) => (
                      <div
                        key={notice.id}
                        className="bg-white dark:bg-zinc-700 rounded-xl p-5 shadow-sm hover:shadow-md transition-all"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center ${getRandomBg(
                              notice.user?.userid?.toString() ?? ""
                            )} ring-2 ring-transparent hover:ring-primary transition overflow-hidden`}
                          >
                            <img
                              src={notice.user?.picture ?? "/default-avatar.jpg"}
                              alt={notice.user?.username ?? "User"}
                              className="w-10 h-10 object-cover rounded-full border-2 border-white"
                            />
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-zinc-900 dark:text-white">
                              {notice.user?.username}
                            </h4>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                              Pending period
                            </p>
                          </div>
                        </div>

                        <div className="bg-zinc-50 dark:bg-zinc-600 rounded-lg p-3 mb-3">
                          <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300 mb-1">
                            <IconCalendarTime className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
                            <span>
                              {moment(notice.startTime!).format("MMM Do")} -{" "}
                              {moment(notice.endTime!).format("MMM Do YYYY")}
                            </span>
                          </div>
                          <p className="text-sm text-zinc-600 dark:text-zinc-300">
                            {notice.reason}
                          </p>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => updateNotice(notice.id, "approve")}
                            className="flex-1 px-3 py-2 text-sm font-medium rounded-md bg-primary/10 text-primary hover:bg-primary/20"
                          >
                            <IconCheck className="w-4 h-4 inline-block mr-1 text-primary" />
                            Approve
                          </button>
                          <button
                            onClick={() => updateNotice(notice.id, "deny")}
                            className="flex-1 px-3 py-2 text-sm font-medium rounded-md bg-red-600 text-white hover:bg-red-700 shadow-sm"
                          >
                            <IconX className="w-4 h-4 inline-block mr-1 text-white" />
                            Deny
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {upcomingNotices.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-4">
                    Upcoming Notices
                  </h3>
                  <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                    {upcomingNotices.map((notice) => (
                      <div
                        key={notice.id}
                        className="bg-white dark:bg-zinc-700 rounded-xl p-5 shadow-sm hover:shadow-md transition-all"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center ${getRandomBg(
                              notice.user?.userid?.toString() ?? ""
                            )} ring-2 ring-transparent hover:ring-primary transition overflow-hidden`}
                          >
                            <img
                              src={notice.user?.picture ?? "/default-avatar.jpg"}
                              alt={notice.user?.username ?? "User"}
                              className="w-10 h-10 object-cover rounded-full border-2 border-white"
                            />
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-zinc-900 dark:text-white">
                              {notice.user?.username}
                            </h4>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                              Upcoming period
                            </p>
                          </div>
                        </div>

                        <div className="bg-zinc-50 dark:bg-zinc-600 rounded-lg p-3 mb-3">
                          <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300 mb-1">
                            <IconCalendarTime className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
                            <span>
                              {moment(notice.startTime!).format("MMM Do")} -{" "}
                              {moment(notice.endTime!).format("MMM Do YYYY")}
                            </span>
                          </div>
                          <p className="text-sm text-zinc-600 dark:text-zinc-300">
                            {notice.reason}
                          </p>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => updateNotice(notice.id, "cancel")}
                            className="flex-1 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 text-sm font-medium"
                          >
                            Revoke
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {pendingNotices.length === 0 &&
                upcomingNotices.length === 0 &&
                activeNotices.length === 0 && (
                  <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm p-12 text-center">
                    <div className="mx-auto w-16 h-16 bg-zinc-100 dark:bg-zinc-700 rounded-full flex items-center justify-center mb-4">
                      <IconCalendarTime className="w-8 h-8 text-zinc-400" />
                    </div>
                    <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-2">
                      No Notices to Manage
                    </h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      There are no pending, active, or upcoming notices at this time
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