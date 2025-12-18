import React from "react";
import type { ActivitySession, inactivityNotice } from "@prisma/client";
import {
  IconUsers,
  IconUserCheck,
} from "@tabler/icons-react";

type Props = {
  sessions: (ActivitySession & {
    user: {
      picture: string | null;
    };
  })[];
  notices: inactivityNotice[];
  adjustments: any[];
  avatar: string;
  idleTimeEnabled: boolean;
  sessionsHosted: number;
  sessionsAttended: number;
};

export function SessionsHistory({
  sessions,
  notices,
  adjustments,
  avatar,
  idleTimeEnabled,
  sessionsHosted,
  sessionsAttended,
}: Props) {



  return (
    <>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <IconUsers className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Hosting
              </p>
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
                Sessions Hosted
              </h2>
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-1">
              {sessionsHosted}
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              sessions hosted this period
            </p>
          </div>
        </div>

        <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <IconUserCheck className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Attendance
              </p>
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
                Sessions Attended
              </h2>
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-1">
              {sessionsAttended}
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              sessions attended this period
            </p>
          </div>
        </div>
      </div>


    </>
  );
}
