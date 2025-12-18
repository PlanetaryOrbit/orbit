import axios from "axios";
import React, { useState, useEffect } from "react";
import type toast from "react-hot-toast";
import { useRecoilState } from "recoil";
import SwitchComponenet from "@/components/switch";
import { workspacestate } from "@/state";
import { FC } from "@/types/settingsComponent";
import { IconTrophy, IconList, IconPodium } from "@tabler/icons-react";

type props = {
  triggerToast: typeof toast;
};

const Leaderboard: FC<props> = (props) => {
  const triggerToast = props.triggerToast;
  const [workspace, setWorkspace] = useRecoilState(workspacestate);
  const [leaderboardStyle, setLeaderboardStyle] = useState<"list" | "podium">(
    "list"
  );

  useEffect(() => {
    async function fetchLeaderboardStyle() {
      try {
        const res = await axios.get(
          `/api/workspace/${workspace.groupId}/settings/general/leaderboard`
        );
        if (res.data?.value?.style) {
          setLeaderboardStyle(res.data.value.style);
        }
      } catch (error) {
        console.error("Failed to fetch leaderboard style:", error);
      }
    }
    if (workspace.groupId) {
      fetchLeaderboardStyle();
    }
  }, [workspace.groupId]);

  const updateLeaderboard = async (enabled?: boolean, style?: string) => {
    const res = await axios.patch(
      `/api/workspace/${workspace.groupId}/settings/general/leaderboard`,
      {
        enabled:
          enabled !== undefined
            ? enabled
            : workspace.settings.leaderboardEnabled,
        style: style || leaderboardStyle,
      }
    );
    if (res.status === 200) {
      const obj = JSON.parse(JSON.stringify(workspace), (key, value) =>
        typeof value === "bigint" ? value.toString() : value
      );
      if (enabled !== undefined) {
        obj.settings.leaderboardEnabled = enabled;
      }
      if (style) {
        setLeaderboardStyle(style as "list" | "podium");
      }
      setWorkspace(obj);
      triggerToast.success("Updated leaderboard!");
    } else {
      triggerToast.error("Failed to update leaderboard.");
    }
  };

  const handleStyleChange = (style: string) => {
    updateLeaderboard(undefined, style);
  };

  return (
    <div>
      <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg mb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <IconTrophy size={20} className="text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-900 dark:text-white">
              Leaderboard
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              View top performers on your workspace
            </p>
          </div>
        </div>
        <SwitchComponenet
          checked={workspace.settings?.leaderboardEnabled}
          onChange={() =>
            updateLeaderboard(!workspace.settings.leaderboardEnabled)
          }
          label=""
          classoverride="mt-0"
        />
      </div>
    </div>
  );
};

export const LeaderboardStyleSelector: FC<props> = (props) => {
  const triggerToast = props.triggerToast;
  const [workspace] = useRecoilState(workspacestate);
  const [leaderboardStyle, setLeaderboardStyle] = useState<"list" | "podium">(
    "list"
  );

  useEffect(() => {
    async function fetchLeaderboardStyle() {
      try {
        const res = await axios.get(
          `/api/workspace/${workspace.groupId}/settings/general/leaderboard`
        );
        if (res.data?.value?.style) {
          setLeaderboardStyle(res.data.value.style);
        }
      } catch (error) {
        console.error("Failed to fetch leaderboard style:", error);
      }
    }
    if (workspace.groupId) {
      fetchLeaderboardStyle();
    }
  }, [workspace.groupId]);

  const handleStyleChange = async (style: "list" | "podium") => {
    try {
      const res = await axios.patch(
        `/api/workspace/${workspace.groupId}/settings/general/leaderboard`,
        {
          enabled: workspace.settings.leaderboardEnabled,
          style: style,
        }
      );
      if (res.status === 200) {
        setLeaderboardStyle(style);
        triggerToast.success("Updated leaderboard style!");
      } else {
        triggerToast.error("Failed to update leaderboard style.");
      }
    } catch (error) {
      triggerToast.error("Failed to update leaderboard style.");
    }
  };

  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
        Leaderboard Style
      </label>
      <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
        Choose how the leaderboard is displayed
      </p>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => handleStyleChange("list")}
          className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
            leaderboardStyle === "list"
              ? "border-primary bg-primary/10"
              : "border-zinc-300 dark:border-zinc-600 hover:border-primary/50"
          }`}
        >
          <IconList
            size={24}
            className={
              leaderboardStyle === "list"
                ? "text-primary"
                : "text-zinc-600 dark:text-zinc-400"
            }
          />
          <span className="text-sm font-medium text-zinc-900 dark:text-white">
            List
          </span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400 text-center">
            Compact ranked list
          </span>
        </button>
        <button
          onClick={() => handleStyleChange("podium")}
          className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
            leaderboardStyle === "podium"
              ? "border-primary bg-primary/10"
              : "border-zinc-300 dark:border-zinc-600 hover:border-primary/50"
          }`}
        >
          <IconPodium
            size={24}
            className={
              leaderboardStyle === "podium"
                ? "text-primary"
                : "text-zinc-600 dark:text-zinc-400"
            }
          />
          <span className="text-sm font-medium text-zinc-900 dark:text-white">
            Podium
          </span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400 text-center">
            Visual podium display
          </span>
        </button>
      </div>
    </div>
  );
};

LeaderboardStyleSelector.title = "Leaderboard Style";

Leaderboard.title = "Leaderboard";

export default Leaderboard;
