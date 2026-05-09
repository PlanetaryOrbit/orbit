import React, { useMemo } from "react";
import Link from "next/link";

export type OrgChartNode = {
  userId: string;
  username: string | null;
  picture: string;
  rankName: string;
};

export type OrgChartEdge = { subordinateId: string; managerId: string };

type Props = {
  workspaceId: string;
  nodes: OrgChartNode[];
  edges: OrgChartEdge[];
  hasViewMemberProfiles: boolean;
};

const MAX_DEPTH = 48;

function OrgSubtree({
  userId,
  nodesById,
  childrenByManager,
  workspaceId,
  hasViewMemberProfiles,
  depth,
}: {
  userId: string;
  nodesById: Map<string, OrgChartNode>;
  childrenByManager: Map<string, string[]>;
  workspaceId: string;
  hasViewMemberProfiles: boolean;
  depth: number;
}) {
  if (depth > MAX_DEPTH) return null;
  const node = nodesById.get(userId);
  if (!node) return null;

  const rawKids = childrenByManager.get(userId) || [];
  const kids = [...rawKids].sort((a, b) => {
    const na = nodesById.get(a)?.username || "";
    const nb = nodesById.get(b)?.username || "";
    return na.localeCompare(nb);
  });

  const card = (
    <div className="flex min-w-[118px] max-w-[min(100vw-4rem,200px)] flex-col items-center sm:min-w-[140px] sm:max-w-[200px]">
      {hasViewMemberProfiles ? (
        <Link
          href={`/workspace/${workspaceId}/profile/${node.userId}`}
          className="flex min-h-[44px] touch-manipulation flex-col items-center justify-center rounded-xl border border-zinc-200 bg-white p-2.5 shadow-sm transition active:scale-[0.98] hover:border-[color:rgb(var(--group-theme)/0.45)] hover:shadow-md dark:border-zinc-600 dark:bg-zinc-800/80 dark:hover:border-zinc-500 sm:p-3"
        >
          <img
            src={node.picture}
            alt=""
            className="h-10 w-10 rounded-full object-cover ring-2 ring-zinc-100 dark:ring-zinc-700 sm:h-12 sm:w-12"
          />
          <span className="mt-1.5 w-full truncate text-center text-[13px] font-semibold leading-tight text-zinc-900 dark:text-white sm:mt-2 sm:text-sm">
            {node.username || "Unknown"}
          </span>
          <span className="mt-0.5 w-full truncate text-center text-[11px] text-zinc-500 dark:text-zinc-400 sm:text-xs">
            {node.rankName}
          </span>
        </Link>
      ) : (
        <div className="flex min-h-[44px] flex-col items-center justify-center rounded-xl border border-zinc-200 bg-white p-2.5 shadow-sm dark:border-zinc-600 dark:bg-zinc-800/80 sm:p-3">
          <img
            src={node.picture}
            alt=""
            className="h-10 w-10 rounded-full object-cover ring-2 ring-zinc-100 dark:ring-zinc-700 sm:h-12 sm:w-12"
          />
          <span className="mt-1.5 w-full truncate text-center text-[13px] font-semibold leading-tight text-zinc-900 dark:text-white sm:mt-2 sm:text-sm">
            {node.username || "Unknown"}
          </span>
          <span className="mt-0.5 w-full truncate text-center text-[11px] text-zinc-500 dark:text-zinc-400 sm:text-xs">
            {node.rankName}
          </span>
        </div>
      )}
    </div>
  );

  if (kids.length === 0) {
    return card;
  }

  return (
    <div className="flex flex-col items-center">
      {card}
      <div className="flex h-4 w-px flex-shrink-0 bg-zinc-300 dark:bg-zinc-600" aria-hidden />
      <div className="relative flex max-w-[100vw] flex-wrap justify-center gap-x-3 gap-y-6 pt-1 sm:max-w-none sm:gap-x-6 sm:gap-y-8">
        {kids.length > 1 && (
          <div
            className="pointer-events-none absolute left-[5%] right-[5%] top-0 h-px bg-zinc-300 sm:left-[12.5%] sm:right-[12.5%] dark:bg-zinc-600"
            aria-hidden
          />
        )}
        {kids.map((childId) => (
          <div key={childId} className="flex flex-col items-center">
            <div className="h-4 w-px flex-shrink-0 bg-zinc-300 dark:bg-zinc-600" aria-hidden />
            <OrgSubtree
              userId={childId}
              nodesById={nodesById}
              childrenByManager={childrenByManager}
              workspaceId={workspaceId}
              hasViewMemberProfiles={hasViewMemberProfiles}
              depth={depth + 1}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

const StaffOrgChart: React.FC<Props> = ({
  workspaceId,
  nodes,
  edges,
  hasViewMemberProfiles,
}) => {
  const { nodesById, childrenByManager, roots } = useMemo(() => {
    const nodesById = new Map(nodes.map((n) => [n.userId, n]));
    const childrenByManager = new Map<string, string[]>();
    const hasParentInChart = new Set<string>();

    for (const e of edges) {
      if (!nodesById.has(e.subordinateId) || !nodesById.has(e.managerId)) continue;
      hasParentInChart.add(e.subordinateId);
      if (!childrenByManager.has(e.managerId)) {
        childrenByManager.set(e.managerId, []);
      }
      const list = childrenByManager.get(e.managerId)!;
      if (!list.includes(e.subordinateId)) {
        list.push(e.subordinateId);
      }
    }

    const roots = nodes
      .map((n) => n.userId)
      .filter((id) => !hasParentInChart.has(id))
      .sort((a, b) => {
        const na = nodesById.get(a)?.username || "";
        const nb = nodesById.get(b)?.username || "";
        return na.localeCompare(nb);
      });

    return { nodesById, childrenByManager, roots };
  }, [nodes, edges]);

  if (nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 py-16 text-center dark:border-zinc-700 dark:bg-zinc-900/40">
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          No reporting hierarchy to show
        </p>
        <p className="mt-1 max-w-md px-4 text-xs text-zinc-500 dark:text-zinc-400">
          Only members who report to someone or have someone reporting to them appear here.
          Assign line managers on member profiles to build an org chart.
        </p>
      </div>
    );
  }

  return (
    <div className="max-sm:-mx-3 sm:mx-0">
      <p className="mb-3 px-3 text-[11px] leading-snug text-zinc-500 sm:mb-4 sm:px-0 sm:text-xs dark:text-zinc-400">
        Reporting lines from workspace line manager settings. Manager above, direct reports
        below.{" "}
        <span className="whitespace-nowrap sm:whitespace-normal">Swipe sideways to pan wide charts.</span>
      </p>
      <div
        className="overflow-x-auto overscroll-x-contain pb-3 touch-pan-x sm:pb-4"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <div className="flex min-w-min flex-wrap justify-center gap-8 px-3 sm:gap-12 sm:px-2">
          {roots.map((rootId) => (
            <OrgSubtree
              key={rootId}
              userId={rootId}
              nodesById={nodesById}
              childrenByManager={childrenByManager}
              workspaceId={workspaceId}
              hasViewMemberProfiles={hasViewMemberProfiles}
              depth={0}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default StaffOrgChart;
