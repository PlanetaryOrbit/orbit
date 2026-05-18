"use client";

import axios from "axios";
import type toast from "react-hot-toast";
import { useRecoilState } from "recoil";
import { workspacestate } from "@/state";
import type { FC } from "@/types/settingsComponent";
import {
  IconCheck,
  IconClock,
  IconConfetti,
  IconDots,
  IconMoon,
  IconPalette,
  IconRepeat,
  IconSchool,
  IconSun,
} from "@tabler/icons-react";
import clsx from "clsx";
import { useCallback, useEffect, useRef, useState } from "react";
import { getRGBFromTailwindColor, getHexFromTheme } from "@/utils/themeColor";

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
  const [selectedDarkColor, setSelectedDarkColor] = useState<string>(
    (workspace as any)?.groupDarkTheme || ""
  );
  const [sessionColors, setSessionColors] = useState<SessionColors>({
    recurring: "bg-blue-500",
    shift: "bg-green-500",
    training: "bg-yellow-500",
    event: "bg-purple-500",
    other: "bg-zinc-500",
  });
  const [isLoadingSessionColors, setIsLoadingSessionColors] = useState(false);
  const [customHex, setCustomHex] = useState<string>(
    workspace?.groupTheme ? getHexFromTheme(workspace.groupTheme) : "#ec4899"
  );
  const [customDarkHex, setCustomDarkHex] = useState<string>(
    (workspace as any)?.groupDarkTheme ? getHexFromTheme((workspace as any).groupDarkTheme) : "#ec4899"
  );
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveDarkTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (workspace?.groupTheme) {
      setSelectedColor(String(workspace.groupTheme));
      setCustomHex(getHexFromTheme(workspace.groupTheme));
    }
    const darkTheme = (workspace as any)?.groupDarkTheme;
    if (darkTheme) {
      setSelectedDarkColor(String(darkTheme));
      setCustomDarkHex(getHexFromTheme(darkTheme));
    }
  }, [workspace?.groupTheme, (workspace as any)?.groupDarkTheme]);

  useEffect(() => {
    loadSessionColors();
  }, [workspace?.groupId]);

  const applyColorLocally = useCallback((color: string) => {
    setSelectedColor(color);
    setWorkspace((prev) => {
      if (!prev) return prev;
      return { ...prev, groupTheme: color };
    });
    if (document.documentElement.classList.contains('light') || !document.documentElement.classList.contains('dark')) {
      document.documentElement.style.setProperty("--group-theme", getRGBFromTailwindColor(color));
    }
  }, [setWorkspace]);

  const applyDarkColorLocally = useCallback((color: string) => {
    setSelectedDarkColor(color);
    setWorkspace((prev) => {
      if (!prev) return prev;
      return { ...prev, groupDarkTheme: color } as any;
    });
    if (document.documentElement.classList.contains('dark')) {
      document.documentElement.style.setProperty("--group-theme", getRGBFromTailwindColor(color));
    }
  }, [setWorkspace]);

  const saveColorToServer = useCallback(
    async (color: string) => {
      if (!workspace?.groupId) return;
      try {
        const res = await axios.patch(
          `/api/workspace/${workspace.groupId}/settings/general/color`,
          { color }
        );
        if (res.status === 200) {
          triggerToast.success("Workspace color updated successfully!");
        } else {
          triggerToast.error("Failed to update color.");
        }
      } catch (error) {
        triggerToast.error("Something went wrong.");
      }
    },
    [workspace?.groupId, triggerToast]
  );

  const saveDarkColorToServer = useCallback(
    async (darkColor: string) => {
      if (!workspace?.groupId) return;
      try {
        const res = await axios.patch(
          `/api/workspace/${workspace.groupId}/settings/general/color`,
          { darkColor }
        );
        if (res.status === 200) {
          triggerToast.success("Dark mode color updated!");
        } else {
          triggerToast.error("Failed to update dark mode color.");
        }
      } catch (error) {
        triggerToast.error("Something went wrong.");
      }
    },
    [workspace?.groupId, triggerToast]
  );

  const handleRevert = () => {
    const previousColor = workspace?.groupTheme || "bg-pink-500";
    setSelectedColor(previousColor);
    setWorkspace((prev) => ({ ...prev, groupTheme: previousColor }));
  };

  const handleCustomColorChange = useCallback(
    (hex: string) => {
      setCustomHex(hex);
      applyColorLocally(hex);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        saveTimeoutRef.current = null;
        saveColorToServer(hex);
      }, 600);
    },
    [applyColorLocally, saveColorToServer]
  );

  const handleCustomDarkColorChange = useCallback(
    (hex: string) => {
      setCustomDarkHex(hex);
      applyDarkColorLocally(hex);
      if (saveDarkTimeoutRef.current) clearTimeout(saveDarkTimeoutRef.current);
      saveDarkTimeoutRef.current = setTimeout(() => {
        saveDarkTimeoutRef.current = null;
        saveDarkColorToServer(hex);
      }, 600);
    },
    [applyDarkColorLocally, saveDarkColorToServer]
  );

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (saveDarkTimeoutRef.current) clearTimeout(saveDarkTimeoutRef.current);
    };
  }, []);

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

  const updateColor = (color: string) => {
    applyColorLocally(color);
    saveColorToServer(color);
  };

  const updateDarkColor = (color: string) => {
    applyDarkColorLocally(color);
    saveDarkColorToServer(color);
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

  const sessionColorTypes: {
    key: keyof SessionColors;
    label: string;
    description: string;
    shortTag: string;
    Icon: typeof IconRepeat;
  }[] = [
    {
      key: "recurring",
      label: "Recurring Sessions",
      description: "Badge and highlights for recurring schedules",
      shortTag: "Recurring",
      Icon: IconRepeat,
    },
    {
      key: "shift",
      label: "Shift Sessions",
      description: "Shift blocks on the calendar and lists",
      shortTag: "Shift",
      Icon: IconClock,
    },
    {
      key: "training",
      label: "Training Sessions",
      description: "Training session type styling",
      shortTag: "Training",
      Icon: IconSchool,
    },
    {
      key: "event",
      label: "Event Sessions",
      description: "One-off events and special sessions",
      shortTag: "Event",
      Icon: IconConfetti,
    },
    {
      key: "other",
      label: "Other Sessions",
      description: "Fallback for uncategorized sessions",
      shortTag: "Other",
      Icon: IconDots,
    },
  ];

  return (
    <div className="space-y-7">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <IconSun size={14} className="text-primary" strokeWidth={2} />
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Workspace Theme</p>
        </div>
        <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-4">
          Choose a color theme for your workspace (light mode)
        </p>

        <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 px-4 py-3.5 mb-4">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Pick</span>
            <input
              type="color"
              value={String(selectedColor).startsWith("#") ? selectedColor : customHex}
              onChange={(e) => handleCustomColorChange(e.target.value)}
              className="h-8 w-11 rounded-lg cursor-pointer border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-0.5"
            />
            {String(selectedColor).startsWith("#") && (
              <span className="text-xs font-medium text-primary">Active</span>
            )}
          </label>
          <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-700" />
          <label className="flex items-center gap-2">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Hex</span>
            <input
              type="text"
              value={String(selectedColor).startsWith("#") ? selectedColor : customHex}
              onChange={(e) => setCustomHex(e.target.value)}
              onBlur={() => {
                const raw = customHex.trim();
                const hex = raw.startsWith("#") ? raw : `#${raw}`;
                if (/^#[0-9A-Fa-f]{3}$/.test(hex) || /^#[0-9A-Fa-f]{6}$/.test(hex)) {
                  const fullHex =
                    hex.length === 4
                      ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
                      : hex;
                  setCustomHex(fullHex);
                  applyColorLocally(fullHex);
                  if (saveTimeoutRef.current) {
                    clearTimeout(saveTimeoutRef.current);
                    saveTimeoutRef.current = null;
                  }
                  saveColorToServer(fullHex);
                }
              }}
              placeholder="#ec4899"
              className="w-24 px-3 py-1.5 rounded-xl text-sm bg-white dark:bg-zinc-700/60 ring-1 ring-zinc-200 dark:ring-zinc-700 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/25 border-0"
            />
          </label>
        </div>

        <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-2.5">Or pick a preset</p>
        <div className="grid grid-cols-10 gap-2">
          {colors.map((color, i) => (
            <button
              key={i}
              onClick={() => updateColor(color)}
              className={clsx("relative aspect-square rounded-xl transition-transform hover:scale-105", color)}
            >
              {selectedColor === color && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/25 rounded-xl">
                  <IconCheck size={14} className="text-white" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-zinc-100 dark:border-zinc-800 pt-6">
        <div className="flex items-center gap-2 mb-1">
          <IconMoon size={14} className="text-primary" strokeWidth={2} />
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Dark Mode Theme</p>
        </div>
        <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-4">
          Optionally set a different accent for dark mode. If not set, the light mode color is used.
        </p>

        <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 px-4 py-3.5 mb-4">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Pick</span>
            <input
              type="color"
              value={String(selectedDarkColor).startsWith("#") ? selectedDarkColor : customDarkHex}
              onChange={(e) => handleCustomDarkColorChange(e.target.value)}
              className="h-8 w-11 rounded-lg cursor-pointer border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-0.5"
            />
            {String(selectedDarkColor).startsWith("#") && (
              <span className="text-xs font-medium text-primary">Active</span>
            )}
          </label>
          <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-700" />
          <label className="flex items-center gap-2">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Hex</span>
            <input
              type="text"
              value={String(selectedDarkColor).startsWith("#") ? selectedDarkColor : customDarkHex}
              onChange={(e) => setCustomDarkHex(e.target.value)}
              onBlur={() => {
                const raw = customDarkHex.trim();
                const hex = raw.startsWith("#") ? raw : `#${raw}`;
                if (/^#[0-9A-Fa-f]{3}$/.test(hex) || /^#[0-9A-Fa-f]{6}$/.test(hex)) {
                  const fullHex =
                    hex.length === 4
                      ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
                      : hex;
                  setCustomDarkHex(fullHex);
                  applyDarkColorLocally(fullHex);
                  if (saveDarkTimeoutRef.current) {
                    clearTimeout(saveDarkTimeoutRef.current);
                    saveDarkTimeoutRef.current = null;
                  }
                  saveDarkColorToServer(fullHex);
                }
              }}
              placeholder="#ec4899"
              className="w-24 px-3 py-1.5 rounded-xl text-sm bg-white dark:bg-zinc-700/60 ring-1 ring-zinc-200 dark:ring-zinc-700 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/25 border-0"
            />
          </label>
          {selectedDarkColor && (
            <button
              onClick={() => {
                setSelectedDarkColor('');
                setCustomDarkHex('#ec4899');
                setWorkspace((prev) => ({ ...prev, groupDarkTheme: '' } as any));
                saveDarkColorToServer('');
              }}
              className="ml-auto text-xs text-zinc-400 hover:text-red-500 transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-2.5">Or pick a preset</p>
        <div className="grid grid-cols-10 gap-2">
          {colors.map((color, i) => (
            <button
              key={i}
              onClick={() => updateDarkColor(color)}
              className={clsx("relative aspect-square rounded-xl transition-transform hover:scale-105", color)}
            >
              {selectedDarkColor === color && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/25 rounded-xl">
                  <IconCheck size={14} className="text-white" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-zinc-100 dark:border-zinc-800 pt-6">
        <div className="flex items-center gap-2 mb-1">
          <IconPalette size={14} className="text-primary" strokeWidth={2} />
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Session Colors</p>
        </div>
        <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-5">
          Pick accent colors for each session category. They appear on badges, cards, and the calendar.
        </p>

        {isLoadingSessionColors ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-7 w-7 border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {sessionColorTypes.map((colorType) => {
              const Icon = colorType.Icon;
              const current = sessionColors[colorType.key];
              return (
                <div
                  key={colorType.key}
                  className="rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 p-4"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className={clsx("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white", current)}>
                      <Icon size={18} stroke={1.75} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{colorType.label}</p>
                        <span className={clsx("rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white", current)}>
                          {colorType.shortTag}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">{colorType.description}</p>
                    </div>
                  </div>

                  <p className="text-xs font-medium text-zinc-400 dark:text-zinc-500 mb-2.5">Color</p>
                  <div className="flex flex-wrap gap-2">
                    {sessionColorOptions.map((color) => {
                      const selected = current === color;
                      return (
                        <button
                          key={color}
                          type="button"
                          title={getColorDisplayName(color)}
                          onClick={() => updateSessionColor(colorType.key, color)}
                          className={clsx(
                            "relative h-8 w-8 rounded-full transition-all focus:outline-none",
                            color,
                            selected
                              ? "ring-2 ring-offset-2 ring-zinc-800 dark:ring-white ring-offset-white dark:ring-offset-zinc-800 scale-110"
                              : "opacity-80 hover:opacity-100 hover:scale-105"
                          )}
                        >
                          {selected && (
                            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/20">
                              <IconCheck size={13} className="text-white" />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-2.5 text-xs text-zinc-400 dark:text-zinc-500">
                    Current: <span className="font-medium text-zinc-600 dark:text-zinc-300">{getColorDisplayName(current)}</span>
                  </p>
                </div>
              );
            })}
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

Color.title = "Customize";

export default Color;