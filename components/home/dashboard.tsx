import clsx from "clsx";
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

function pickMainPanel(enabled: Set<HomeWidgetId>): PanelId | null {
  if (enabled.has("wall")) return "wall";
  if (enabled.has("documents")) return "documents";
  if (enabled.has("sessions")) return "sessions";
  return null;
}

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
  has,
}: {
  workspaceName: string;
  has: (id: HomeWidgetId) => boolean;
}) {
  const showBirthdays = has("birthdays");
  const showNewMembers = has("new_members");
  if (!showBirthdays && !showNewMembers) return null;

  return (
    <section className="space-y-4 sm:space-y-5">
      <h2 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-white sm:text-base">
        This week at {workspaceName}
      </h2>

      {showBirthdays && (
        <div>
          <p className="mb-2.5 text-xs font-medium text-zinc-400 dark:text-zinc-500">Birthdays</p>
          <Birthdays layout="strip" />
        </div>
      )}

      {showNewMembers && (
        <div>
          <p className="mb-2.5 text-xs font-medium text-zinc-400 dark:text-zinc-500">New to the team</p>
          <NewToTeam embedded />
        </div>
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
  const enabled = new Set(widgets);
  const has = (id: HomeWidgetId) => enabled.has(id);

  const mainId = pickMainPanel(enabled);
  const sidebarPanels: PanelId[] = [];
  if (has("sessions") && mainId !== "sessions") sidebarPanels.push("sessions");
  if (has("notices")) sidebarPanels.push("notices");

  const showSidebar = sidebarPanels.length > 0 || has("music_quote");
  const showDocumentsBelow = has("documents") && mainId !== null && mainId !== "documents";
  const showWeek = has("birthdays") || has("new_members");

  const renderFallbackGrid = () => {
    const ids = widgets.filter(
      (w): w is PanelId =>
        w === "wall" || w === "sessions" || w === "notices" || w === "documents"
    );
    if (ids.length === 0) return null;
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {ids.map((id) => (
          <WidgetPanel key={id} id={id} workspaceId={workspaceId} />
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-5 sm:gap-7">
      {has("quick_links") && <FeaturedExperiences />}

      {showWeek && (
        <WeekSection workspaceName={workspaceName} has={has} />
      )}

      {mainId ? (
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
      ) : (
        <>
          <StickyNoteAnnouncement />
          {renderFallbackGrid()}
          {has("music_quote") && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <RandomMusic />
            </div>
          )}
        </>
      )}

      {(showDocumentsBelow || (has("documents") && mainId === "documents" && !showSidebar)) && (
        <WidgetPanel id="documents" workspaceId={workspaceId} />
      )}
    </div>
  );
}
