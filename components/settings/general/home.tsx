import axios from "axios";
import React, { useEffect, useRef, useState } from "react";
import type toast from "react-hot-toast";
import { useRecoilState } from "recoil";
import { workspacestate } from "@/state";
import { FC } from "@/types/settingsComponent";
import { IconCheck } from "@tabler/icons-react";
import clsx from "clsx";
import { fetchworkspace } from "@/utils/configEngine";

type props = {
  triggerToast: typeof toast;
  isSidebarExpanded?: boolean;
  hasResetActivityOnly?: boolean;
};

const home: FC<props> = (props) => {
  const triggerToast = props.triggerToast;
  const [workspace, setWorkspace] = useRecoilState(workspacestate);
  const [customName, setCustomName] = useState("");
  const [banner, setBanner] = useState<string | null>(null);
  const [bannerUploading, setBannerUploading] = useState(false);
  const bannerFileInputRef = useRef<HTMLInputElement>(null);

  const updateHome = async () => {
    const res = await axios.patch(
      `/api/workspace/${workspace.groupId}/settings/general/home`,
      {
        widgets: workspace.settings.widgets,
        name: customName
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
    "Quick Links": "quick_links",
    "New Team Members": "new_members",
    "Music Quote": "music_quote"
  };

  useEffect(() => {
    async function fetchWorkspace() {
      try {
        const res = await axios.get(`/api/workspace/${workspace.groupId}`)
        setCustomName(res.data.workspace.customName)
      } catch {}
    }

    async function fetchBanner() {
      try {
        const res = await axios.get(`/api/workspace/${workspace.groupId}/settings/general/banner`)
        if (res.data.banner) setBanner(res.data.banner)
      } catch {}
    }

    fetchWorkspace()
    fetchBanner()
  }, [workspace.groupId])

  const uploadBanner = async (file: File) => {
    setBannerUploading(true);
    try {
      const formData = new FormData();
      formData.append('banner', file);
      const res = await axios.post(
        `/api/workspace/${workspace.groupId}/settings/general/banner`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      setBanner(res.data.url);
      triggerToast.success('Banner updated!');
    } catch {
      triggerToast.error('Failed to upload banner.');
    } finally {
      setBannerUploading(false);
    }
  };

  const removeBanner = async () => {
    setBannerUploading(true);
    try {
      await axios.delete(`/api/workspace/${workspace.groupId}/settings/general/banner`);
      setBanner(null);
      triggerToast.success('Banner removed.');
    } catch {
      triggerToast.error('Failed to remove banner.');
    } finally {
      setBannerUploading(false);
    }
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
        Customise your workspace&apos;s name.
      </p>
      <input
        type="text"
        value={customName}
        placeholder={workspace.groupName ? workspace.groupName : "Unknown Workspace"}
        onChange={(e) => setCustomName(e.target.value)}
        className="w-full px-3 py-2.5 border rounded-xl text-sm bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-600 text-zinc-900 dark:text-white focus:ring-2 focus:ring-[color:rgb(var(--group-theme)/0.25)] focus:border-[color:rgb(var(--group-theme))] transition-colors mb-6"
      />

      <p className="text-lg font-medium text-zinc-900 dark:text-white mb-1">Workspace Banner</p>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-3">
        A custom banner image shown at the top of the workspace home page.
      </p>
      {banner ? (
        <div className="relative mb-3 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 h-36 bg-zinc-100 dark:bg-zinc-800">
          <img src={banner} alt="Workspace banner" className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="mb-3 rounded-xl border-2 border-dashed border-zinc-200 dark:border-zinc-700 h-36 flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-500 bg-zinc-50 dark:bg-zinc-800/50">
          <svg className="w-8 h-8 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 20.25h18M3.75 3.75h16.5A.75.75 0 0121 4.5v13.5a.75.75 0 01-.75.75H3.75A.75.75 0 013 18V4.5a.75.75 0 01.75-.75z" />
          </svg>
          <span className="text-xs">No banner set</span>
        </div>
      )}
      <input
        ref={bannerFileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) uploadBanner(file);
          e.target.value = '';
        }}
      />
      <div className="flex gap-2 mb-1">
        <button
          type="button"
          disabled={bannerUploading}
          onClick={() => bannerFileInputRef.current?.click()}
          className="flex-1 px-3 py-2 rounded-lg text-sm font-medium border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {bannerUploading ? 'Uploading…' : banner ? 'Replace Banner' : 'Upload Banner'}
        </button>
        {banner && (
          <button
            type="button"
            disabled={bannerUploading}
            onClick={removeBanner}
            className="px-3 py-2 rounded-lg text-sm font-medium border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Remove
          </button>
        )}
      </div>
      <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6">
        Max 8 MB (JPEG, PNG, WebP, GIF). Recommended aspect ratio: 4:1 or wider.
      </p>
      <p className="text-lg font-medium text-zinc-900 dark:text-white mb-2">Widgets</p>
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

home.title = "Workspace Customization";

export default home;
