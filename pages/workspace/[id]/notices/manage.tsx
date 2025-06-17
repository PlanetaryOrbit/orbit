import workspace from "@/layouts/workspace";
import { pageWithLayout } from "@/layoutTypes";
import { loginState } from "@/state";
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
  IconArrowLeft,
} from "@tabler/icons";

type NoticeWithUser = inactivityNotice & { user: user };

export const getServerSideProps = withPermissionCheckSsr(
  async ({ params }) => {
    const notices = await prisma.inactivityNotice.findMany({
      where: {
        workspaceGroupId: parseInt(params?.id as string),
      },
      orderBy: {
        startTime: "desc",
      },
      include: {
        user: true,
      },
    });

    return {
      props: {
        initialNotices: JSON.parse(
          JSON.stringify(notices, (key, value) =>
            typeof value === "bigint" ? value.toString() : value
          )
        ) as NoticeWithUser[],
      },
    };
  },
  "manage_activity"
);

type pageProps = InferGetServerSidePropsType<typeof getServerSideProps>;

const Notices: pageWithLayout<pageProps> = ({ initialNotices }) => {
	const router = useRouter();
	const { id } = router.query;
	const [login] = useRecoilState(loginState);
	const [notices, setNotices] = useState<NoticeWithUser[]>(initialNotices as NoticeWithUser[]);

	const text = useMemo(() => randomText(login.displayname), []);

	const updateNotice = async (
		noticeId: string,
		status: "approve" | "deny" | "cancel"
	) => {
		if (!id) return;

	try {
		const res = await axios.post(`/api/workspace/${id}/activity/notices/update`, {
			id: noticeId,
			status,
		});

		if (res.data.success) {
			setNotices((prev) => prev.filter((n) => n.id !== noticeId));
			toast.success("Notice updated!");
		}
	} catch {
    toast.error("Failed to update notice");
  }
};


  const now = new Date();

  const pendingNotices = notices.filter((n) => !n.reviewed);
  const upcomingNotices = notices.filter(
    (n) => n.reviewed && n.approved && new Date(n.startTime) > now
  );
  const activeNotices = notices.filter(
    (n) =>
      n.approved &&
	n.startTime &&
	n.endTime &&
	new Date(n.startTime) <= now &&
	new Date(n.endTime) >= now

  );

  const renderSection = (
    title: string,
    list: NoticeWithUser[],
    showCancel: boolean
  ) => (
    <div className="mb-10">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        {title}
      </h2>
      {list.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 text-center text-gray-500 dark:text-gray-400">
          No {title.toLowerCase()}
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {list.map((notice) => (
            <div
              key={notice.id}
              className="bg-white dark:bg-gray-700 rounded-xl p-5 shadow-sm hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-3 mb-3">
                <img
                  src={notice.user?.picture ?? "/default-avatar.png"}
                  alt={notice.user?.username ?? "User"}
                  className="w-10 h-10 rounded-full ring-2 ring-primary/10"
                />
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                    {notice.user?.username}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {title} period
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-600 rounded-lg p-3 mb-3">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 mb-1">
                  <IconCalendarTime className="w-4 h-4" />
                  <span>
                    {moment(notice.startTime!).format("MMM Do")} -{" "}
                    {moment(notice.endTime!).format("MMM Do YYYY")}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300">
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
                      <IconCheck className="w-4 h-4 inline-block mr-1" />
                      Approve
                    </button>
                    <button
                      onClick={() => updateNotice(notice.id, "deny")}
                      className="flex-1 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 text-sm font-medium"
                    >
                      <IconX className="w-4 h-4 inline-block mr-1" />
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
            <button
              onClick={() => router.back()}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <IconArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-medium text-gray-900 dark:text-white">
                Notices
              </h1>
            </div>
          </div>

          {renderSection("Pending Notices", pendingNotices, false)}
          {renderSection("Upcoming Notices", upcomingNotices, true)}
          {renderSection("Active Notices", activeNotices, true)}
        </div>
      </div>
    </>
  );
};

Notices.layout = workspace;
export default Notices;
