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
        <div className="bg-white dark:bg-zinc-700 rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 p-4 border-b border-zinc-200 dark:border-zinc-600">
            <div className="bg-primary/10 p-2 rounded-lg">
              <IconUsers className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-lg font-medium text-zinc-900 dark:text-white">
              Sessions Hosted
            </h2>
          </div>
          <div className="p-6 text-center">
            <div className="text-4xl font-bold text-zinc-900 dark:text-white mb-2">
              {sessionsHosted}
            </div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400">
              Sessions hosted during this period
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-700 rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 p-4 border-b border-zinc-200 dark:border-zinc-600">
            <div className="bg-primary/10 p-2 rounded-lg">
              <IconUserCheck className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-lg font-medium text-zinc-900 dark:text-white">
              Sessions Attended
            </h2>
          </div>
          <div className="p-6 text-center">
            <div className="text-4xl font-bold text-zinc-900 dark:text-white mb-2">
              {sessionsAttended}
            </div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400">
              Sessions attended during this period
            </div>
          </div>
        </div>
      </div>


    </>
  );
}
