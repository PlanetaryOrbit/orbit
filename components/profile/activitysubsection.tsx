import React, { Fragment } from "react";
import { Tab } from "@headlessui/react";
import {
  IconChartBar,
  IconCalendarEvent,
  IconTarget,
} from "@tabler/icons-react";
import type { ActivitySession, Quota, inactivityNotice } from "@prisma/client";

type Props = {
  timeSpent: number;
  timesPlayed: number;
  data: any;
  quotas: (Quota & { currentValue?: number; percentage?: number })[];
  sessionsHosted: number;
  sessionsAttended: number;
  avatar: string;
  sessions: (ActivitySession & {
    user: {
      picture: string | null;
    };
  })[];
  notices: inactivityNotice[];
  adjustments?: any[];
  isHistorical?: boolean;
  historicalPeriod?: {
    start: string;
    end: string;
  } | null;
  loadingHistory?: boolean;
  messages?: number;
  idleTime?: number;
  selectedWeek?: number;
  availableHistory?: any[];
  getCurrentWeekLabel?: () => string;
  canGoBack?: boolean;
  canGoForward?: boolean;
  goToPreviousWeek?: () => void;
  goToNextWeek?: () => void;
};

export function ActivityTabs(props: Props) {
  return (
    <div>
      <Tab.Group>
        <Tab.List className="flex p-1 gap-1 bg-zinc-50 dark:bg-zinc-700/50 border border-zinc-200 dark:border-zinc-600 rounded-lg mb-6">
          <Tab
            className={({ selected }) =>
              `flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors flex-1 justify-center ${
                selected
                  ? "bg-white dark:bg-zinc-800 text-[#ff0099] shadow-sm"
                  : "text-zinc-600 dark:text-zinc-300 hover:bg-white/50 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-white"
              }`
            }
          >
            <IconChartBar className="w-4 h-4" />
            Activity
          </Tab>
          <Tab
            className={({ selected }) =>
              `flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors flex-1 justify-center ${
                selected
                  ? "bg-white dark:bg-zinc-800 text-[#ff0099] shadow-sm"
                  : "text-zinc-600 dark:text-zinc-300 hover:bg-white/50 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-white"
              }`
            }
          >
            <IconCalendarEvent className="w-4 h-4" />
            Sessions
          </Tab>
          <Tab
            className={({ selected }) =>
              `flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors flex-1 justify-center ${
                selected
                  ? "bg-white dark:bg-zinc-800 text-[#ff0099] shadow-sm"
                  : "text-zinc-600 dark:text-zinc-300 hover:bg-white/50 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-white"
              }`
            }
          >
            <IconTarget className="w-4 h-4" />
            Quotas
          </Tab>
        </Tab.List>
        <Tab.Panels>
          <Tab.Panel>
            <div className="text-zinc-600 dark:text-zinc-400">
              Activity Overview - Chart, metrics, and timeline will be here
            </div>
          </Tab.Panel>
          <Tab.Panel>
            <div className="text-zinc-600 dark:text-zinc-400">
              Sessions History - Basic metrics
            </div>
          </Tab.Panel>
          <Tab.Panel>
            <div className="text-zinc-600 dark:text-zinc-400">
              Quotas Progress - Quota cards and progress tracking
            </div>
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>
    </div>
  );
}
