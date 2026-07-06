import clsx from "clsx";
import React from "react";
import StickyNoteAnnouncement from "@/components/stickyannouncement";
import NewToTeam from "@/components/newmembers";
import Birthdays from "@/components/birthdays";
import RandomMusic from "@/components/home/randommusic";
import Sessions from "@/components/home/sessions";
import Notices from "@/components/home/notices";
import Docs from "@/components/home/docs";
import Wall from "@/components/home/wall";
import FeaturedExperiences from "@/components/home/featuredExperiences";
import { HomePanel } from "@/components/home/shell";
import type { HomeWidgetId } from "@/utils/homeWidgets";

const PANEL_META: Record<
  "wall" | "sessions" | "notices" | "documents",
  { title: string; path: string; linkLabel: string }
> = {
  wall: { title: "Wall", path: "wall", linkLabel: "All posts" },
  sessions: { title: "Sessions", path: "sessions", linkLabel: "Schedule" },
  notices: { title: "Notices", path: "notices", linkLabel: "All notices" },
  documents: { title: "Documents", path: "docs", linkLabel: "Library" },
};

const PANEL_COMPONENTS = {
  wall: Wall,
  sessions: Sessions,
  notices: Notices,
  documents: Docs,
} as const;

type PanelId = keyof typeof PANEL_META;

const MAIN_CANDIDATES = new Set<HomeWidgetId>(["wall", "documents", "sessions"]);
const SIDEBAR_ELIGIBLE = new Set<HomeWidgetId>(["sessions", "notices"]);

function WidgetPanel({
  id,
  workspaceId,
  tall,
}: {
  id: PanelId;
  workspaceId: number;
  tall?: boolean;
}) {
  const meta = PANEL_META[id];
  const Widget = PANEL_COMPONENTS[id];
  return (
    <HomePanel
      title={meta.title}
      href={`/workspace/${workspaceId}/${meta.path}`}
      linkLabel={meta.linkLabel}
      className={tall ? "min-h-[16rem] sm:min-h-[20rem] lg:min-h-[24rem]" : undefined}
    >
      <Widget />
    </HomePanel>
  );
}

function WeekSection({
  workspaceName,
  widgets,
}: {
  workspaceName: string;
  widgets: HomeWidgetId[];
}) {
  const hasBirthdays = widgets.includes("birthdays");
  const hasNewMembers = widgets.includes("new_members");
  if (!hasBirthdays && !hasNewMembers) return null;

  return (
    <section className="space-y-4 sm:space-y-5">
      <h2 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-white sm:text-base">
        This week at {workspaceName}
      </h2>
      {widgets
        .filter((id) => id === "birthdays" || id === "new_members")
        .map((id) =>
          id === "birthdays" ? (
            <div key="birthdays">
              <p className="mb-2.5 text-xs font-medium text-zinc-400 dark:text-zinc-500">Birthdays</p>
              <Birthdays layout="strip" />
            </div>
          ) : (
            <div key="new_members">
              <p className="mb-2.5 text-xs font-medium text-zinc-400 dark:text-zinc-500">New to the team</p>
              <NewToTeam embedded />
            </div>
          )
        )}
    </section>
  );
}

export function HomeDashboard({
  workspaceId,
  workspaceName,
  widgets,
}: {
  workspaceId: number;
  workspaceName: string;
  widgets: HomeWidgetId[];
}) {
  const has = (id: HomeWidgetId) => widgets.includes(id);

  const mainId = (widgets.find((id) => MAIN_CANDIDATES.has(id)) ?? null) as PanelId | null;

  const sidebarPanels = widgets.filter(
    (id): id is PanelId => SIDEBAR_ELIGIBLE.has(id) && id !== mainId
  );

  const showSidebar = sidebarPanels.length > 0 || has("music_quote");
  const showDocumentsBelow = has("documents") && mainId !== null && mainId !== "documents";

  type Bucket = "quick_links" | "week" | "main_block" | "documents_below";

  const getBucket = (id: HomeWidgetId): Bucket | null => {
    if (id === "quick_links") return "quick_links";
    if (id === "birthdays" || id === "new_members") return "week";
    if (id === "documents" && showDocumentsBelow) return null; // handled separately at end
    if (
      MAIN_CANDIDATES.has(id) ||
      SIDEBAR_ELIGIBLE.has(id) ||
      id === "music_quote"
    )
      return "main_block";
    return null;
  };

  const seen = new Set<Bucket>();
  const orderedBuckets: Bucket[] = [];

  for (const id of widgets) {
    const bucket = getBucket(id);
    if (bucket && !seen.has(bucket)) {
      seen.add(bucket);
      orderedBuckets.push(bucket);
    }
  }

  if (!seen.has("quick_links") && has("quick_links")) orderedBuckets.push("quick_links");
  if (!seen.has("week") && (has("birthdays") || has("new_members"))) orderedBuckets.push("week");
  if (!seen.has("main_block") && (mainId || showSidebar)) orderedBuckets.push("main_block");
  if (showDocumentsBelow) orderedBuckets.push("documents_below");

  const renderMainBlock = () => {
    if (!mainId) {
      const fallbackIds = widgets.filter(
        (w): w is PanelId => w === "wall" || w === "sessions" || w === "notices" || w === "documents"
      );
      return (
        <>
          <StickyNoteAnnouncement />
          {fallbackIds.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {fallbackIds.map((id) => (
                <WidgetPanel key={id} id={id} workspaceId={workspaceId} />
              ))}
            </div>
          )}
          {has("music_quote") && <RandomMusic />}
        </>
      );
    }

    return (
      <div
        className={clsx(
          "grid grid-cols-1 gap-3 sm:gap-4 lg:gap-5",
          showSidebar ? "lg:grid-cols-12" : "lg:grid-cols-1"
        )}
      >
        <div
          className={clsx(
            "flex flex-col gap-3 sm:gap-4",
            showSidebar ? "lg:col-span-7 xl:col-span-8" : "lg:col-span-12"
          )}
        >
          <StickyNoteAnnouncement />
          <WidgetPanel id={mainId} workspaceId={workspaceId} tall={mainId === "wall"} />
        </div>

        {showSidebar && (
          <aside className="flex flex-col gap-3 sm:gap-4 lg:col-span-5 xl:col-span-4">
            {sidebarPanels.map((id) => (
              <WidgetPanel key={id} id={id} workspaceId={workspaceId} />
            ))}
            {has("music_quote") && <RandomMusic />}
          </aside>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-5 sm:gap-7">
      {orderedBuckets.map((bucket) => {
        switch (bucket) {
          case "quick_links":
            return <FeaturedExperiences key="quick_links" />;
          case "week":
            return (
              <WeekSection
                key="week"
                workspaceName={workspaceName}
                widgets={widgets}
              />
            );
          case "main_block":
            return (
              <React.Fragment key="main_block">
                {renderMainBlock()}
              </React.Fragment>
            );
          case "documents_below":
            return (
              <WidgetPanel key="documents_below" id="documents" workspaceId={workspaceId} />
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
