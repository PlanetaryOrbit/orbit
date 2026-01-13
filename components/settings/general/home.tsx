import axios from "axios";
import React, { useState } from "react";
import type toast from "react-hot-toast";
import { useRecoilState } from "recoil";
import { workspacestate } from "@/state";
import { FC } from "@/types/settingsComponent";
import { IconCheck } from "@tabler/icons-react";
import clsx from "clsx";

type props = {
  triggerToast: typeof toast;
  isSidebarExpanded?: boolean;
  hasResetActivityOnly?: boolean;
};

const Color: FC<props> = (props) => {
  const triggerToast = props.triggerToast;
  const [workspace, setWorkspace] = useRecoilState(workspacestate);

  const updateHome = async () => {
    const res = await axios.patch(
      `/api/workspace/${workspace.groupId}/settings/general/home`,
      {
        widgets: workspace.settings.widgets,
      }
    );
    if (res.status === 200) {
      triggerToast.success("Updated home");
    } else {
      triggerToast.error("Failed to update home");
    }
  };

  const toggleAble: {
    [key: string]: string;
  } = {
    "Ongoing sessions": "sessions",
    "Latest wall messages": "wall",
    "Latest documents": "documents",
    "Inactivity Notices": "notices",
    "Upcoming Birthdays": "birthdays",
    "New Team Members": "new_members",
  };

  const toggle = (name: string) => {
    if (workspace.settings.widgets.includes(toggleAble[name])) {
      setWorkspace({
        ...workspace,
        settings: {
          ...workspace.settings,
          widgets: workspace.settings.widgets.filter(
            (widget) => widget !== toggleAble[name]
          ),
        },
      });
    } else {
      setWorkspace({
        ...workspace,
        settings: {
          ...workspace.settings,
          widgets: [...workspace.settings.widgets, toggleAble[name]],
        },
      });
    }
  };

  return (
    <div>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
        Customize what appears on your workspace home page. Tiles will only be
        shown to users with the corresponding permissions.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Object.keys(toggleAble).map((key, i) => (
          <button
            key={i}
            onClick={() => toggle(key)}
            className={clsx(
              "flex items-center justify-between p-3 rounded-lg border transition-colors",
              workspace.settings.widgets.includes(toggleAble[key])
                ? "border-primary bg-primary/5 text-primary dark:text-white"
                : "border-gray-200 dark:border-zinc-700 dark:text-white hover:border-gray-300 dark:hover:border-gray-600"
            )}
          >
            <span className="text-sm font-medium">{key}</span>
            {workspace.settings.widgets.includes(toggleAble[key]) && (
              <IconCheck size={16} className="flex-shrink-0" />
            )}
          </button>
        ))}
      </div>
      <div className="mt-4">
        <button
          onClick={updateHome}
          className={clsx(
            "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
            workspace.groupTheme === "bg-orbit"
              ? "bg-orbit text-white hover:bg-orbit/90"
              : workspace.groupTheme === "bg-blue-500"
              ? "bg-blue-500 text-white hover:bg-blue-600"
              : workspace.groupTheme === "bg-red-500"
              ? "bg-red-500 text-white hover:bg-red-600"
              : workspace.groupTheme === "bg-red-700"
              ? "bg-red-700 text-white hover:bg-red-800"
              : workspace.groupTheme === "bg-green-500"
              ? "bg-green-500 text-white hover:bg-green-600"
              : workspace.groupTheme === "bg-green-600"
              ? "bg-green-600 text-white hover:bg-green-700"
              : workspace.groupTheme === "bg-yellow-500"
              ? "bg-yellow-500 text-white hover:bg-yellow-600"
              : workspace.groupTheme === "bg-orange-500"
              ? "bg-orange-500 text-white hover:bg-orange-600"
              : workspace.groupTheme === "bg-purple-500"
              ? "bg-purple-500 text-white hover:bg-purple-600"
              : workspace.groupTheme === "bg-pink-500"
              ? "bg-pink-500 text-white hover:bg-pink-600"
              : workspace.groupTheme === "bg-black"
              ? "bg-black text-white hover:bg-zinc-900"
              : "bg-zinc-500 text-white hover:bg-zinc-600"
          )}
        >
          Save Changes
        </button>
      </div>
    </div>
  );
};

Color.title = "Home";

export default Color;
