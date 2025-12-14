"use client";

import axios from "axios";
import type toast from "react-hot-toast";
import { useRecoilState } from "recoil";
import { workspacestate } from "@/state";
import type { FC } from "@/types/settingsComponent";
import { IconCheck, IconPalette } from "@tabler/icons-react";
import clsx from "clsx";
import { useEffect, useState } from "react";

type SessionColors = {
  recurring: string;
  shift: string;
  training: string;
  event: string;
  other: string;
};

type props = {
  triggerToast: typeof toast;
  isSidebarExpanded: boolean;
};

const Color: FC<props> = ({ triggerToast, isSidebarExpanded }) => {
  const [workspace, setWorkspace] = useRecoilState(workspacestate);
  const [selectedColor, setSelectedColor] = useState<string>(
    workspace?.groupTheme || ""
  );
  const [sessionColors, setSessionColors] = useState<SessionColors>({
    recurring: "bg-blue-500",
    shift: "bg-green-500",
    training: "bg-yellow-500",
    event: "bg-purple-500",
    other: "bg-zinc-500",
  });
  const [isLoadingSessionColors, setIsLoadingSessionColors] = useState(false);

  useEffect(() => {
    if (workspace?.groupTheme) {
      setSelectedColor(workspace.groupTheme);
    }
  }, [workspace?.groupTheme]);

  useEffect(() => {
    loadSessionColors();
  }, [workspace?.groupId]);

  const loadSessionColors = async () => {
    if (!workspace?.groupId) return;

    try {
      setIsLoadingSessionColors(true);
      const response = await axios.get(
        `/api/workspace/${workspace.groupId}/settings/general/session-colors`
      );
      if (response.data.success && response.data.colors) {
        setSessionColors(response.data.colors);
      }
    } catch (error) {
      console.error("Failed to load session colors:", error);
    } finally {
      setIsLoadingSessionColors(false);
    }
  };

  const updateColor = async (color: string) => {
    try {
      setSelectedColor(color);
      setWorkspace((prev) => ({
        ...prev,
        groupTheme: color,
      }));

      const rgbValue = getRGBFromTailwindColor(color);
      document.documentElement.style.setProperty("--group-theme", rgbValue);

      const res = await axios.patch(
        `/api/workspace/${workspace.groupId}/settings/general/color`,
        { color }
      );

      if (res.status === 200) {
        triggerToast.success("Workspace color updated successfully!");
      } else {
        triggerToast.error("Failed to update color.");
        handleRevert();
      }
    } catch (error) {
      triggerToast.error("Something went wrong.");
      handleRevert();
    }
  };

  const updateSessionColor = async (
    colorType: keyof SessionColors,
    color: string
  ) => {
    try {
      const newColors = { ...sessionColors, [colorType]: color };
      setSessionColors(newColors);

      const res = await axios.patch(
        `/api/workspace/${workspace.groupId}/settings/general/session-colors`,
        { colors: newColors }
      );

      if (res.status === 200) {
        triggerToast.success("Session colors updated successfully!");
      } else {
        triggerToast.error("Failed to update session colors.");
        setSessionColors(sessionColors);
      }
    } catch (error) {
      triggerToast.error("Something went wrong.");
      setSessionColors(sessionColors);
    }
  };

  const handleRevert = () => {
    const previousColor = workspace?.groupTheme || "bg-pink-500";
    setSelectedColor(previousColor);
    setWorkspace((prev) => ({
      ...prev,
      groupTheme: previousColor,
    }));
    const rgbValue = getRGBFromTailwindColor(previousColor);
    document.documentElement.style.setProperty("--group-theme", rgbValue);
  };

  const colors = [
    "bg-pink-100",
    "bg-rose-100",
    "bg-orange-100",
    "bg-amber-100",
    "bg-lime-100",
    "bg-emerald-100",
    "bg-cyan-100",
    "bg-sky-100",
    "bg-indigo-100",
    "bg-purple-100",
    "bg-pink-400",
    "bg-rose-400",
    "bg-orange-400",
    "bg-amber-400",
    "bg-lime-400",
    "bg-emerald-400",
    "bg-cyan-400",
    "bg-sky-400",
    "bg-indigo-400",
    "bg-violet-400",
    "bg-orbit",
    "bg-rose-600",
    "bg-orange-600",
    "bg-amber-600",
    "bg-lime-600",
    "bg-emerald-600",
    "bg-cyan-600",
    "bg-sky-600",
    "bg-indigo-600",
    "bg-violet-600",
  ];

  const sessionColorOptions = [
    "bg-blue-500",
    "bg-red-500",
    "bg-red-700",
    "bg-green-500",
    "bg-green-600",
    "bg-yellow-500",
    "bg-orange-500",
    "bg-purple-500",
    "bg-pink-500",
    "bg-zinc-500",
    "bg-orbit",
  ];

  const sessionColorTypes = [
    {
      key: "recurring" as keyof SessionColors,
      label: "Recurring Sessions",
      description: 'Color for "Recurring" tag',
    },
    {
      key: "shift" as keyof SessionColors,
      label: "Shift Sessions",
      description: 'Color for "Shift" sessions',
    },
    {
      key: "training" as keyof SessionColors,
      label: "Training Sessions",
      description: 'Color for "Training" sessions',
    },
    {
      key: "event" as keyof SessionColors,
      label: "Event Sessions",
      description: 'Color for "Event" sessions',
    },
    {
      key: "other" as keyof SessionColors,
      label: "Other Sessions",
      description: 'Color for "Other" sessions',
    },
  ];

  return (
    <div className="ml-0 space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <IconPalette size={20} className="text-primary" />
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
            Workspace Theme
          </h3>
        </div>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4 text-left">
          Choose a color theme for your workspace
        </p>
        <div className="grid grid-cols-10 gap-3">
          {colors.map((color, i) => (
            <button
              key={i}
              onClick={() => updateColor(color)}
              className={clsx(
                "relative aspect-square rounded-lg transition-transform hover:scale-105 z-0",
                color
              )}
            >
              {selectedColor === color && (
                <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/30 rounded-lg">
                  <IconCheck size={16} className="text-white" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="flex items-center gap-2 mb-2">
          <IconPalette size={20} className="text-primary" />
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
            Session Colors
          </h3>
        </div>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4 text-left">
          Customize colors for different session types and tags
        </p>

        {isLoadingSessionColors ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
              Loading session colors...
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {sessionColorTypes.map((colorType) => (
              <div
                key={colorType.key}
                className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-3"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1">
                    <h4 className="font-medium text-zinc-900 dark:text-white text-sm">
                      {colorType.label}
                    </h4>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {colorType.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={clsx(
                        "px-2 py-1 rounded text-xs text-white font-medium",
                        sessionColors[colorType.key]
                      )}
                    >
                      {colorType.key === "recurring"
                        ? "Recurring"
                        : colorType.label.split(" ")[0]}
                    </span>
                  </div>
                </div>
                <select
                  value={sessionColors[colorType.key]}
                  onChange={(e) =>
                    updateSessionColor(colorType.key, e.target.value)
                  }
                  className="w-full px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  {sessionColorOptions.map((color) => (
                    <option key={color} value={color}>
                      {getColorDisplayName(color)}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

function getColorDisplayName(color: string): string {
  const colorDisplayMap: Record<string, string> = {
    "bg-orbit": "Orbit",
    "bg-blue-500": "Blue",
    "bg-red-500": "Red",
    "bg-red-700": "Dark Red",
    "bg-green-500": "Green",
    "bg-green-600": "Dark Green",
    "bg-yellow-500": "Yellow",
    "bg-orange-500": "Orange",
    "bg-purple-500": "Purple",
    "bg-pink-500": "Pink",
    "bg-zinc-500": "Gray",
  };

  return colorDisplayMap[color] || color.replace("bg-", "").replace("-", " ");
}

function getRGBFromTailwindColor(tw: any): string {
  const fallback = "236, 72, 153";
  if (!tw || typeof tw !== "string") {
    if (tw !== null && tw !== undefined) {
      console.warn("Invalid color value:", tw);
    }
    return fallback;
  }
  const colorName = tw.replace("bg-", "");

  if (colorName === "orbit") {
    return "0, 112, 240";
  }

  const colorMap: Record<string, string> = {
    "blue-500": "59, 130, 246",
    "red-500": "239, 68, 68",
    "red-700": "185, 28, 28",
    "green-500": "34, 197, 94",
    "green-600": "22, 163, 74",
    "yellow-500": "234, 179, 8",
    "orange-500": "249, 115, 22",
    "purple-500": "168, 85, 247",
    "pink-500": "236, 72, 153",
    "gray-500": "107, 114, 128",
  };

  return colorMap[colorName] || fallback;
}

Color.title = "Customize";

export default Color;
