import axios from "axios";
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import React, { useEffect, useMemo, useRef, useState } from "react";
import type toast from "react-hot-toast";
import { useRecoilState } from "recoil";
import { workspacestate } from "@/state";
import { FC } from "@/types/settingsComponent";
import { IconRefresh, IconGripVertical, IconPlus } from "@tabler/icons-react";
import clsx from "clsx";
import {
  HOME_WIDGET_IDS,
  HOME_WIDGET_LABELS,
  normalizeHomeWidgetOrder,
  isHomeWidgetId,
  type HomeWidgetId,
} from "@/utils/homeWidgets";

type WidgetSortRowProps = {
  id: HomeWidgetId;
  label: string;
  onRemove: () => void;
};

function WidgetSortRow({ id, label, onRemove }: WidgetSortRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={clsx(
        "flex items-center gap-3 p-3 rounded-lg border bg-white dark:bg-zinc-900/40 transition-opacity",
        isDragging
          ? "opacity-80 border-primary/50 shadow-lg z-10"
          : "border-zinc-200 dark:border-zinc-700",
      )}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        className={clsx(
          "shrink-0 p-1 rounded-md cursor-grab active:cursor-grabbing text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 touch-manipulation",
          isDragging && "cursor-grabbing",
        )}
        style={{ touchAction: "none" }}
        aria-label={`Drag to reorder ${label}`}
        {...attributes}
        {...listeners}
      >
        <IconGripVertical className="w-5 h-5 pointer-events-none" aria-hidden />
      </button>
      <span className="flex-1 text-sm font-medium text-zinc-900 dark:text-white">
        {label}
      </span>
      <button
        type="button"
        onClick={onRemove}
        className="text-xs font-medium text-zinc-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400 px-2 py-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
      >
        Remove
      </button>
    </div>
  );
}

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
  const [iconRefreshing, setIconRefreshing] = useState(false);
  const bannerFileInputRef = useRef<HTMLInputElement>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const enabledOrdered = useMemo(
    () => normalizeHomeWidgetOrder(workspace.settings.widgets),
    [workspace.settings.widgets],
  );

  const disabledIds = useMemo(
    () => HOME_WIDGET_IDS.filter((id) => !enabledOrdered.includes(id)),
    [enabledOrdered],
  );

  const handleWidgetDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    if (!isHomeWidgetId(activeId) || !isHomeWidgetId(overId)) return;
    const normalized = normalizeHomeWidgetOrder(workspace.settings.widgets);
    const oldIndex = normalized.indexOf(activeId);
    const newIndex = normalized.indexOf(overId);
    if (oldIndex === -1 || newIndex === -1) return;
    const next = arrayMove(normalized, oldIndex, newIndex);
    setWorkspace({
      ...workspace,
      settings: {
        ...workspace.settings,
        widgets: next,
      },
    });
  };

  const addWidget = (id: HomeWidgetId) => {
    if (workspace.settings.widgets.includes(id)) return;
    setWorkspace({
      ...workspace,
      settings: {
        ...workspace.settings,
        widgets: [...workspace.settings.widgets, id],
      },
    });
  };

  const removeWidget = (id: HomeWidgetId) => {
    setWorkspace({
      ...workspace,
      settings: {
        ...workspace.settings,
        widgets: workspace.settings.widgets.filter((w) => w !== id),
      },
    });
  };

  const updateHome = async () => {
    const res = await axios.patch(
      `/api/workspace/${workspace.groupId}/settings/general/home`,
      {
        widgets: normalizeHomeWidgetOrder(workspace.settings.widgets),
        name: customName
      }
    );
    if (res.status === 200) {
      triggerToast.success("Updated home");
    } else {
      triggerToast.error("Failed to update home");
    }
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

      <p className="text-lg font-medium text-zinc-900 dark:text-white mb-1">Workspace icon</p>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-3">
        Shown in the sidebar, browser tab, and workspace switcher. Orbit stores a copy from when the workspace was created; refresh it if your Roblox group emblem changed.
      </p>
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        <div className="w-20 h-20 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 overflow-hidden shrink-0">
          <img
            src={workspace.groupThumbnail || "/favicon.png"}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex-1 min-w-0">
          <button
            type="button"
            disabled={iconRefreshing}
            onClick={async () => {
              setIconRefreshing(true);
              try {
                const res = await axios.post(
                  `/api/workspace/${workspace.groupId}/settings/general/refresh-icon`
                );
                if (res.data.success && res.data.groupThumbnail) {
                  setWorkspace({
                    ...workspace,
                    groupThumbnail: res.data.groupThumbnail,
                  });
                  triggerToast.success("Workspace icon updated from Roblox.");
                } else {
                  triggerToast.error("Could not refresh workspace icon.");
                }
              } catch (err: unknown) {
                const msg =
                  axios.isAxiosError(err) && err.response?.data && typeof err.response.data === "object" && "error" in err.response.data
                    ? String((err.response.data as { error?: string }).error)
                    : null;
                triggerToast.error(msg || "Failed to refresh workspace icon.");
              } finally {
                setIconRefreshing(false);
              }
            }}
            className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors w-full sm:w-auto"
          >
            <IconRefresh className={`w-4 h-4 shrink-0 ${iconRefreshing ? "animate-spin" : ""}`} />
            {iconRefreshing ? "Fetching…" : "Refresh from Roblox"}
          </button>
        </div>
      </div>

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
        accept="image/jpeg,image/png"
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
        Max 8 MB (JPEG, PNG). Recommended aspect ratio: 4:1 or wider.
      </p>
      <p className="text-lg font-medium text-zinc-900 dark:text-white mb-2">Widgets</p>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-2">
        Customize what appears on your workspace home page. Tiles will only be
        shown to users with the corresponding permissions.
      </p>
      <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
        Drag rows to change the order on the dashboard. Wall, sessions, documents, and notices share a two-column layout when they appear next to each other.
      </p>

      {enabledOrdered.length > 0 ? (
        <div className="space-y-2 mb-5">
          <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 uppercase tracking-wide">
            Enabled — drag to reorder
          </p>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleWidgetDragEnd}
          >
            <SortableContext items={enabledOrdered} strategy={verticalListSortingStrategy}>
              {enabledOrdered.map((id) => (
                <WidgetSortRow
                  key={id}
                  id={id}
                  label={HOME_WIDGET_LABELS[id]}
                  onRemove={() => removeWidget(id)}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      ) : (
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
          No widgets enabled yet. Add some below.
        </p>
      )}

      <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 uppercase tracking-wide mb-2">
        Add widgets
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        {disabledIds.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => addWidget(id)}
            className="flex items-center justify-between gap-2 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900/40 text-zinc-900 dark:text-white hover:border-primary/40 hover:bg-primary/5 transition-colors text-left"
          >
            <span className="text-sm font-medium">{HOME_WIDGET_LABELS[id]}</span>
            <IconPlus className="w-4 h-4 text-primary shrink-0" aria-hidden />
          </button>
        ))}
      </div>
      {disabledIds.length === 0 && enabledOrdered.length > 0 ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">All widgets are enabled.</p>
      ) : null}
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
